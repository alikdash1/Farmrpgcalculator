// Farm RPG Field Planner — pure calculation engine.
// Loads in a browser as window.Engine and in Node through module.exports.
(function (root) {
  function buildIndex(data) {
    const itemsById = new Map();
    const idByName = new Map();
    for (const it of data.items.items) {
      itemsById.set(it.id, it);
      idByName.set(it.name.toLowerCase(), it.id);
    }

    const craftByItem = new Map();
    for (const row of data.recipes.craft) {
      if (!craftByItem.has(row.itemId)) craftByItem.set(row.itemId, []);
      craftByItem.get(row.itemId).push(row);
    }

    const cookByItem = new Map();
    for (const row of data.recipes.cook) {
      if (!cookByItem.has(row.itemId)) cookByItem.set(row.itemId, []);
      cookByItem.get(row.itemId).push({ reqId: row.reqId, reqName: row.reqName, amt: row.amt });
    }

    const locsByItem = new Map();
    const locationsByName = new Map();
    for (const loc of data.sources.locations) {
      locationsByName.set(loc.name, loc);
      // Fishing snapshots carry a generic outcome table and a dedicated fish
      // table. Indexing both double-counts every fishing route.
      const drops = loc.mode === "fishes" ? {} : (loc.drops || {});
      for (const [itemName, info] of Object.entries(drops)) {
        if (info.denom == null && info.src !== "override") continue;
        const key = itemName.toLowerCase();
        if (!locsByItem.has(key)) locsByItem.set(key, []);
        locsByItem.get(key).push({
          loc: loc.name,
          mode: loc.mode === "harvests" ? "harvests" : loc.mode,
          denom: info.denom,
          src: info.src,
        });
      }
      for (const [itemName, info] of Object.entries(loc.fish || {})) {
        const key = itemName.toLowerCase();
        if (!locsByItem.has(key)) locsByItem.set(key, []);
        locsByItem.get(key).push({
          loc: loc.name,
          mode: "fishes",
          denom: info.denom,
          src: info.src,
        });
      }
    }

    const marketByName = new Map(
      Object.entries((data.market && data.market.items) || {}).map(([name, value]) => [name.trim().toLowerCase(), value])
    );
    return { itemsById, idByName, craftByItem, cookByItem, locsByItem, locationsByName, marketByName };
  }

  function computeMods(effects, consts) {
    effects = effects || [];
    consts = consts || {};
    const sum = (type) => effects.filter((e) => e.type === type).reduce((a, e) => a + Number(e.value || 0), 0);
    const c = (key, fallback) => consts[key] && consts[key].v != null ? Number(consts[key].v) : fallback;
    const craftCostOff = Math.min(sum("craft_cost_off"), c("craft_cost_cap", 0.75));
    return {
      craftCostOff,
      craftYield: 1 + sum("craft_yield"),
      cookSaveMult: sum("cook_save") || 1,
      saleMult: 1 + sum("sale_bonus"),
      cropReduction: {
        qfIs: c("crop_qf_is_reduction", 0.8),
        dodBaseCut: c("crop_dod_base_cut", 0.1),
      },
      nets: {
        fnCatch: c("net_fn_base_catch", 10) + sum("fn_bonus"),
        lnCatch: c("net_ln_base_catch", 250) + sum("ln_bonus"),
      },
      drinks: {
        ciderRolls: c("cider_base_rolls", 1000) * (1 + sum("cider_eff")),
        lemonadeItems: c("lemonade_base_items", 10) + sum("lemonade_items_bonus"),
        apItems: c("ap_base_items", 200) + sum("ap_items_bonus"),
      },
      exploreStaminaPer: c("explore_base_stamina", 1) * (1 - sum("stamina_save")),
      ironDepot: sum("iron_depot") > 0,
      rateAdjust: c("rate_adjust_global", 1) || 1,
    };
  }

  function growthMinutes(baseMin, mods) {
    if (!baseMin) return 0;
    return Math.max(0, baseMin * (1 - mods.cropReduction.qfIs) - baseMin * mods.cropReduction.dodBaseCut);
  }

  function inputsFor(index, itemId) {
    const craft = index.craftByItem.get(itemId);
    if (craft && craft.length) {
      return {
        kind: "craft",
        rows: craft.map((row) => ({ id: row.reqId, amt: row.amt })),
        silverPerCraft: (index.itemsById.get(itemId) || {}).craftPrice || 0,
      };
    }
    const cook = index.cookByItem.get(itemId);
    if (cook && cook.length) {
      return {
        kind: "cook",
        rows: cook.map((row) => ({
          id: row.reqId != null ? row.reqId : index.idByName.get(String(row.reqName || "").toLowerCase()) || null,
          amt: row.amt,
          reqName: row.reqName,
        })),
        silverPerCraft: 0,
      };
    }
    return null;
  }

  function resolveTree(index, itemId, qtyOut, mods, depth, seen, consts, stopIds) {
    depth = depth || 0;
    seen = seen || [];
    consts = consts || {};
    const item = index.itemsById.get(itemId);
    if (!item) throw new Error("Unknown item id " + itemId);
    if (seen.indexOf(itemId) !== -1) {
      return { id: itemId, name: item.name, qtyOut, cyclic: true, children: [] };
    }
    if (depth > 24) throw new Error("Recipe tree too deep at " + item.name);
    const stopped = stopIds && (stopIds.has ? stopIds.has(itemId) : stopIds[itemId]);
    if (stopped) return { id: itemId, name: item.name, qtyOut, children: [], leaf: true, stopped: true };

    const input = inputsFor(index, itemId);
    if (!input) return { id: itemId, name: item.name, qtyOut, children: [], leaf: true };
    const tools = new Set(((consts.cooking_tools_not_consumed || {}).v || []));
    const craftsNeeded = input.kind === "craft" ? Math.ceil(qtyOut / mods.craftYield) : Math.ceil(qtyOut);
    const children = [];
    for (const row of input.rows) {
      const rowName = (index.itemsById.get(row.id) || {}).name || row.reqName || "";
      if (input.kind === "cook" && tools.has(rowName)) continue;
      let need = row.amt * craftsNeeded;
      if (input.kind === "cook") need = Math.max(1, Math.floor(row.amt * mods.cookSaveMult)) * qtyOut;
      if (row.id == null) {
        children.push({ id: null, name: "? (" + (row.reqName || "unknown") + ")", qtyOut: need, unresolved: true, children: [] });
      } else {
        children.push(resolveTree(index, row.id, need, mods, depth + 1, seen.concat([itemId]), consts, stopIds));
      }
    }
    return {
      id: itemId,
      name: item.name,
      qtyOut,
      kind: input.kind,
      craftsNeeded,
      silverPerCraft: input.silverPerCraft,
      children,
    };
  }

  function flattenLeaves(node, acc) {
    acc = acc || new Map();
    if (node.cyclic || !node.children.length) {
      const key = node.id == null ? "unresolved:" + node.name : node.id;
      const prev = acc.get(key);
      acc.set(key, prev
        ? Object.assign({}, prev, { total: prev.total + node.qtyOut })
        : { id: node.id, name: node.name, total: node.qtyOut, cyclic: node.cyclic, stopped: node.stopped, unresolved: node.unresolved });
      return acc;
    }
    for (const child of node.children) flattenLeaves(child, acc);
    return acc;
  }

  function collectNodes(node, acc, depth) {
    acc = acc || new Map();
    depth = depth || 0;
    const prev = acc.get(node.id);
    if (prev) {
      prev.qtyOut += node.qtyOut;
      if (node.craftsNeeded) prev.craftsNeeded += node.craftsNeeded;
    } else {
      acc.set(node.id, Object.assign({}, node, { depth, children: node.children }));
    }
    for (const child of node.children || []) collectNodes(child, acc, depth + 1);
    return acc;
  }

  function sourcesFor(index, itemId, needTotal, mods, consts) {
    consts = consts || {};
    const item = index.itemsById.get(itemId);
    const out = { crop: null, fish: [], drops: [], vendor: null, market: null };
    if (!item) return out;
    if (item.growMin > 0) {
      out.crop = {
        minutesEach: growthMinutes(item.growMin, mods),
        plants: Math.ceil(needTotal / (((consts.plot_yield_default || {}).v) || 1)),
      };
    }
    const srcs = index.locsByItem.get(item.name.toLowerCase()) || [];
    for (const source of srcs) {
      if (source.mode === "fishes") {
        out.fish.push({
          location: source.loc,
          denom: source.denom,
          catches: source.denom != null ? Math.ceil(needTotal * source.denom / mods.rateAdjust) : null,
          src: source.src,
        });
      } else if (source.mode === "harvests") {
        out.drops.push({ location: source.loc, actions: null, src: source.src, note: "harvest" });
      } else {
        const denom = source.denom != null ? source.denom / mods.rateAdjust : null;
        out.drops.push({
          location: source.loc,
          denom,
          explores: denom != null ? Math.ceil(needTotal * denom) : null,
          stamina: denom != null ? Math.ceil(needTotal * denom) * mods.exploreStaminaPer : null,
          src: source.src,
        });
      }
    }
    if (item.buy != null && item.buy > 0) out.vendor = { priceEach: item.buy };
    const market = index.marketByName.get(item.name.toLowerCase());
    if (market && (market.gold || market.ap || market.oj)) out.market = market;
    return out;
  }

  function sourceConfidence(source) {
    if (source === "override") return { label: "Verified override", level: 3 };
    if (source === "logged") return { label: "Community sample", level: 2 };
    return { label: "Rate unknown", level: 0 };
  }

  function coDropsFor(index, locationName, actions, targetName, progression, limit) {
    const location = index.locationsByName.get(locationName);
    const itemFacts = (progression && progression.items) || {};
    if (!location || !(actions > 0)) return [];
    const rows = [];
    for (const [name, drop] of Object.entries(location.drops || {})) {
      if (name === targetName || !(drop.denom > 0)) continue;
      const expected = actions / drop.denom;
      const fact = itemFacts[name] || {};
      const special = name === "Ancient Coin" || /Chest/.test(name) || /Runestone/.test(name);
      const relevance = Number(fact.relevance || 0);
      const score = relevance + (special ? 2 : 0) + Math.min(3, Math.log10(expected + 1));
      if (score < 1.5 && expected < 10) continue;
      rows.push({
        name,
        expected,
        denom: drop.denom,
        source: drop.src,
        confidence: sourceConfidence(drop.src),
        score,
        questSteps: Number(fact.questSteps || 0),
        questTotal: Number(fact.questTotal || 0),
        usedInCrafts: Number(fact.usedInCrafts || 0),
        towerRequirement: fact.mastery && fact.mastery.towerRequirement || null,
        hoard: !!fact.hoard,
      });
    }
    return rows.sort((a, b) => b.score - a.score || b.expected - a.expected).slice(0, limit || 6);
  }
  function pricePer(raw) {
    const text = String(raw || "");
    if (/\/k\b/i.test(text)) return 1000;
    const pack = text.match(/\[(\d+)\]/);
    return pack ? Number(pack[1]) : 1;
  }

  function currencyGoldEach(index, currency) {
    if (currency === "gold") return 1;
    const itemName = currency === "ap" ? "arnold palmer" : "orange juice";
    const market = index.marketByName.get(itemName);
    if (!market || !market.gold) return null;
    return market.gold.mid / pricePer((market.raw || {}).gold);
  }

  function marketQuote(index, itemOrName, quantity) {
    const itemName = typeof itemOrName === "string"
      ? itemOrName
      : ((index.itemsById.get(itemOrName) || {}).name || "");
    const market = index.marketByName.get(itemName.toLowerCase());
    if (!market) return null;
    const options = [];
    for (const currency of ["gold", "ap", "oj"]) {
      const range = market[currency];
      if (!range) continue;
      const raw = (market.raw || {})[currency] || "";
      const per = pricePer(raw);
      const amount = range.mid * quantity / per;
      const goldEach = currencyGoldEach(index, currency);
      options.push({
        currency,
        amount,
        per,
        rate: range.mid,
        lo: range.lo,
        hi: range.hi,
        raw,
        goldEq: goldEach == null ? null : amount * goldEach,
        updated: market.updated,
      });
    }
    if (!options.length) return null;
    const comparable = options.filter((o) => o.goldEq != null).sort((a, b) => a.goldEq - b.goldEq);
    return { itemName, options, best: comparable[0] || options[0] };
  }

  function translateCosts(leaves, index, mods, consts, owned) {
    owned = owned || {};
    consts = consts || {};
    let vendorSilver = 0;
    let marketGold = 0, marketAp = 0, marketOj = 0;
    let explores = 0, stamina = 0, fishCatches = 0, plants = 0;
    for (const [, leaf] of leaves) {
      const missing = Math.max(0, leaf.total - (owned[leaf.id] || 0));
      if (missing <= 0 || leaf.id == null) continue;
      const sources = sourcesFor(index, leaf.id, missing, mods, consts);
      const bestDrop = sources.drops.filter((d) => d.explores != null).sort((a, b) => a.explores - b.explores)[0];
      if (bestDrop) {
        explores += bestDrop.explores;
        stamina += bestDrop.stamina;
      }
      const bestFish = sources.fish.filter((f) => f.catches != null).sort((a, b) => a.catches - b.catches)[0];
      if (bestFish) fishCatches += bestFish.catches;
      if (sources.crop) plants += sources.crop.plants;
      if (sources.vendor) vendorSilver += sources.vendor.priceEach * missing;
      const quote = marketQuote(index, leaf.id, missing);
      if (quote) {
        if (quote.best.currency === "gold") marketGold += quote.best.amount;
        if (quote.best.currency === "ap") marketAp += quote.best.amount;
        if (quote.best.currency === "oj") marketOj += quote.best.amount;
      }
    }
    return {
      vendorSilver,
      market: { gold: marketGold, ap: marketAp, oj: marketOj },
      effort: {
        explores,
        stamina,
        ciders: mods.drinks.ciderRolls > 0 ? explores / mods.drinks.ciderRolls : 0,
        fishCatches,
        largeNets: mods.nets.lnCatch > 0 ? fishCatches / mods.nets.lnCatch : 0,
        fishingNets: mods.nets.fnCatch > 0 ? fishCatches / mods.nets.fnCatch : 0,
        lemonades: mods.drinks.lemonadeItems > 0 ? explores / mods.drinks.lemonadeItems : 0,
        palmers: mods.drinks.apItems > 0 ? explores / mods.drinks.apItems : 0,
        plants,
      },
    };
  }

  function treeCraftSilver(node, mods, acc) {
    acc = acc || { silver: 0 };
    if (node.kind === "craft" && node.silverPerCraft) {
      acc.silver += node.silverPerCraft * Math.max(1, node.craftsNeeded != null ? node.craftsNeeded : node.qtyOut) * (1 - mods.craftCostOff);
    }
    for (const child of node.children || []) treeCraftSilver(child, mods, acc);
    return acc.silver;
  }

  const api = {
    buildIndex,
    computeMods,
    growthMinutes,
    inputsFor,
    resolveTree,
    flattenLeaves,
    collectNodes,
    sourcesFor,
    sourceConfidence,
    coDropsFor,
    pricePer,
    currencyGoldEach,
    marketQuote,
    translateCosts,
    treeCraftSilver,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);

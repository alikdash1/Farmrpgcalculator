(function () {
  // A whole questline, broken down to what you actually go and get: every
  // material rolled through its recipes, netted against what you hold, and
  // then filed under the place it comes from — this location, that building,
  // that crop. The Calculate page answers one item; this answers a campaign.
  const root = document.getElementById("plan");
  if (!root) return;
  const pick = document.getElementById("planLine");
  const summary = document.getElementById("planSummary");
  const body = document.getElementById("planBody");
  const useFarm = document.getElementById("planFarm");
  const useStock = document.getElementById("planStock");
  const compare = document.getElementById("planCompare");

  const D = window.FRPG_DATA || {};
  const QUESTS = ((window.FRPG_MAIN_QUESTS || {}).quests) || [];
  const DONE = new Set((((window.FRPG_PERSONAL_QUESTS || {}).completed) || []).map((t) => String(t).toLowerCase()));
  const RATES = (window.FRPG_WORKBOOK_RATES || {});
  const ART = window.FRPG_ITEM_ART_HELPER;
  const GATHER = window.FRPG_GATHER;
  // Crafting duplicates. Resource Saver I and II and the Headdress of Luna
  // together return about 1.45 for every one you would expect.
  const YIELD = 1.45;

  // Items you get some other way the plan cannot see — a daily from the
  // Wishing Well, a trade, a friend. The roll-up stops dead at these: it still
  // records what they were for, but asks for nothing underneath them.
  const COVERED_KEY = "frpg_plan_covered_v1";
  const readCovered = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(COVERED_KEY) || "null");
      if (Array.isArray(saved)) return new Set(saved.map((name) => String(name).toLowerCase()));
    } catch (error) { /* a broken entry is the same as none */ }
    // Magna Core is the one everybody meets first: 30 Compass into the
    // Wishing Well comes back as 60, so nobody crafts them.
    return new Set(["magna core"]);
  };
  let covered = readCovered();
  const saveCovered = () => { try { localStorage.setItem(COVERED_KEY, JSON.stringify([...covered])); } catch (error) { /* private mode */ } };

  const items = ((D.items || {}).items) || [];
  const byName = new Map(items.map((item) => [String(item.name).toLowerCase(), item]));
  const byId = new Map(items.map((item) => [item.id, item]));
  const craftRows = new Map();
  for (const row of ((D.recipes || {}).craft || [])) {
    if (!craftRows.has(row.itemId)) craftRows.set(row.itemId, []);
    craftRows.get(row.itemId).push(row);
  }
  const cookIds = new Set(((D.recipes || {}).cook || []).map((row) => row.itemId));

  // What each building makes in a day, from your own Setup numbers. A
  // collection over the inventory cap is lost, so an hourly building is capped
  // per collection and a 10-minute one rarely is.
  function production() {
    const infra = JSON.parse(localStorage.getItem("frpg_infra_v2") || "{}");
    // Setup fills itself from a My Farm capture, but if it has not yet, read
    // the capture directly rather than showing no production at all.
    const snapshot = JSON.parse(localStorage.getItem("frpg_account_snapshot_v1") || "null");
    const captured = (snapshot && snapshot.infrastructure) || {};
    const at = (building, key) => { const raw = ((captured[building] || {})[key]); const value = raw && typeof raw === "object" ? raw.value : raw; const n = Number(value); return Number.isFinite(n) ? n : 0; };
    if (!Number(infra.woodHour)) infra.woodHour = at("sawmill", "wood");
    if (!Number(infra.boardHour)) infra.boardHour = at("sawmill", "boards");
    if (!Number(infra.strawTen)) infra.strawTen = at("hayField", "straw");
    if (!Number(infra.stoneTen)) infra.stoneTen = at("quarry", "stone");
    if (!Number(infra.coalHour)) infra.coalHour = at("quarry", "coalHourly");
    if (!Number(infra.steelHour)) infra.steelHour = at("steelworks", "steel");
    if (!Number(infra.wireHour)) infra.wireHour = at("steelworks", "wire");
    const cap = Number(infra.inventoryCap) || 0;
    const perDay = (perCollection, collectionsPerDay) => (cap > 0 ? Math.min(perCollection, cap) : perCollection) * collectionsPerDay;
    const hourly = (perHour) => perDay(perHour, 24);
    const out = {};
    if (Number(infra.woodHour)) out.Wood = { perDay: hourly(Number(infra.woodHour)), from: "Sawmill" };
    if (Number(infra.boardHour)) out.Board = { perDay: hourly(Number(infra.boardHour)), from: "Sawmill" };
    if (Number(infra.strawTen)) out.Straw = { perDay: perDay(Number(infra.strawTen), 144), from: "Hay Field" };
    if (Number(infra.stoneTen)) out.Stone = { perDay: perDay(Number(infra.stoneTen), 144), from: "Quarry" };
    if (Number(infra.coalHour)) out.Coal = { perDay: hourly(Number(infra.coalHour)), from: "Quarry" };
    if (Number(infra.steelHour)) out.Steel = { perDay: hourly(Number(infra.steelHour)), from: "Steelworks" };
    if (Number(infra.wireHour)) out["Steel Wire"] = { perDay: hourly(Number(infra.wireHour)), from: "Steelworks" };
    // Buildings a My Farm capture knows about but Setup has no field for.
    const add = (name, perDay, from) => { if (perDay > 0 && !out[name]) out[name] = { perDay, from }; };
    add("Grapes", at("vineyard", "grapes"), "Vineyard");
    add("Apple", at("orchard", "apples"), "Orchard");
    add("Orange", at("orchard", "oranges"), "Orchard");
    add("Lemon", at("orchard", "lemons"), "Orchard");
    add("Trout", at("troutFarm", "trout"), "Trout Farm");
    add("Grubs", at("troutFarm", "grubs"), "Trout Farm");
    add("Minnows", at("troutFarm", "minnows"), "Trout Farm");
    add("Worms", at("wormHabitat", "worms") * 24, "Worm Habitat");
    add("Mealworms", at("wormHabitat", "mealworms") * 24, "Worm Habitat");
    out.Iron = { perDay: null, from: "Iron Depot" };
    out.Nails = { perDay: null, from: "Iron Depot" };
    return out;
  }

  function held() {
    if (!useStock.checked || !GATHER || typeof GATHER.inventoryRows !== "function") return new Map();
    return new Map(GATHER.inventoryRows().map((row) => [String(row.name).toLowerCase(), Number(row.quantity) || 0]));
  }

  // Drops per AP, from the owner's workbook: the best place for each item.
  const bestPlace = (() => {
    const best = new Map();
    for (const [place, drops] of Object.entries(RATES.exploring || {})) {
      for (const [item, rate] of Object.entries(drops)) {
        const key = String(item).toLowerCase();
        if (!best.has(key) || best.get(key).rate < rate) best.set(key, { place, rate, kind: "explore" });
      }
    }
    for (const [place, drops] of Object.entries(RATES.fishing || {})) {
      for (const [item, rate] of Object.entries(drops)) {
        const key = String(item).toLowerCase();
        if (!best.has(key)) best.set(key, { place, rate, kind: "fish" });
      }
    }
    return best;
  })();

  // What one of a thing costs if you go and get it, weighed against what it
  // costs to make it out of things you also have to go and get. Farm
  // buildings and crops cost days rather than AP, so they count as nothing
  // here and the summary counts those days on their own. Anything already
  // riding along on a trip you are making anyway is free too, which is the
  // point of going to Cane Pole Ridge once and coming home with everything
  // on the table.
  function costModel(farm, freeKeys) {
    const memo = new Map();
    const walk = (key, depth, seen) => {
      if (memo.has(key)) return memo.get(key);
      if (seen.has(key) || depth > 12) return { ap: Infinity, nets: Infinity, how: "loop", go: null, make: null };
      const item = byName.get(key);
      const name = item ? item.name : key;
      const spot = bestPlace.get(key);
      const fishing = spot && spot.kind === "fish";
      const go = spot ? { ap: fishing ? 0 : 1 / spot.rate, nets: fishing ? 1 / spot.rate : 0, how: fishing ? "fish" : "explore", spot } : null;
      let make = null;
      const recipe = item && craftRows.get(item.id);
      if (recipe && recipe.length && !cookIds.has(item.id)) {
        seen.add(key);
        let ap = 0;
        let nets = 0;
        let ok = true;
        for (const row of recipe) {
          const part = (byId.get(row.reqId) || {}).name;
          if (!part) continue;
          const sub = walk(String(part).toLowerCase(), depth + 1, seen);
          if (!Number.isFinite(sub.ap) || !Number.isFinite(sub.nets)) { ok = false; break; }
          ap += sub.ap * row.amt;
          nets += sub.nets * row.amt;
        }
        seen.delete(key);
        if (ok) make = { ap: ap / YIELD, nets: nets / YIELD, how: "craft" };
      }
      // Going only wins when it is no worse on both counts. AP and Large Nets
      // are different jobs and there is no honest rate between them, so a
      // recipe that saves AP by spending nets is left alone.
      let best;
      if (covered.has(key)) best = { ap: 0, nets: 0, how: "covered", free: false };
      else if (farm[name] || (item && item.growMin > 0)) best = { ap: 0, nets: 0, how: "farm", free: false };
      else if (freeKeys.has(key) && go) best = { ap: 0, nets: 0, how: go.how, free: true };
      else if (go && make) best = (go.ap <= make.ap && go.nets <= make.nets) ? Object.assign({}, go, { free: false }) : Object.assign({}, make, { free: false });
      else best = Object.assign({ ap: 0, nets: 0, how: "unknown" }, go || make || {}, { free: false });
      const out = { ap: best.ap, nets: best.nets, how: best.how, free: best.free, go, make };
      memo.set(key, out);
      return out;
    };
    return (name) => walk(String(name).toLowerCase(), 0, new Set());
  }

  // Exploring costs two different things and the page only ever said one of
  // them. An Arnold Palmer is an item you buy; a cider is stamina out of your
  // own bar. The workbook measures drops per AP, data.js measures explores per
  // drop, and Setup already resolves what an explore and a cider cost you.
  const denomBy = new Map();
  for (const loc of ((D.sources || {}).locations) || []) {
    if (loc.mode === "fishes") continue;
    for (const [item, info] of Object.entries(loc.drops || {})) {
      if (info.denom == null) continue;
      denomBy.set(`${String(loc.name).toLowerCase()}|${String(item).toLowerCase()}`, info.denom);
    }
  }
  function spend() {
    const m = (typeof window.FRPG_MODS === "function" && window.FRPG_MODS()) || {};
    const neighOn = window.FRPG_MEALS && typeof window.FRPG_MEALS.get === "function" ? window.FRPG_MEALS.get("neigh") : false;
    return {
      perExplore: Number(m.exploreStaminaPer) > 0 ? Number(m.exploreStaminaPer) : 1.25,
      ciderRolls: Number(m.drinks && m.drinks.ciderRolls) > 0 ? Number(m.drinks.ciderRolls) : 1000,
      neigh: neighOn ? 0.8 : 1,
      neighOn: !!neighOn,
    };
  }

  const lines = [...new Set(QUESTS.map((quest) => quest.line))].sort();

  function stepsOf(line) {
    return QUESTS.filter((quest) => quest.line === line).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  function plan(line, freeKeys) {
    const farm = useFarm.checked ? production() : {};
    const stock = held();
    const cost = compare && compare.checked ? costModel(farm, freeKeys) : null;
    const instead = new Map();
    // Every item remembers what asked for it: which recipe it disappeared
    // into, and which step at the top of the tree was ultimately paying.
    const trace = new Map();
    const note = (name, qty, step, path, parentQty) => {
      const key = String(name).toLowerCase();
      let row = trace.get(key);
      if (!row) { row = { name, steps: new Map(), via: new Map() }; trace.set(key, row); }
      row.steps.set(step, (row.steps.get(step) || 0) + qty);
      const label = path.length ? path.join(" → ") : "handed in as it is";
      let via = row.via.get(label);
      if (!via) {
        via = { label, parent: path.length ? path[path.length - 1] : null, parentQty: 0, qty: 0 };
        row.via.set(label, via);
      }
      via.qty += qty;
      via.parentQty += parentQty || 0;
    };
    // The tree as a player reads it: the thing you hand in at the top, its
    // recipe underneath, all the way down to what you pick up off the ground.
    const roots = [];
    const mergeNode = (list, node) => {
      let found = list.find((row) => row.name === node.name);
      if (!found) { found = { name: node.name, qty: 0, crafts: 0, kind: node.kind, children: [] }; list.push(found); }
      found.qty += node.qty;
      found.crafts += node.crafts;
      found.kind = node.kind;
      for (const child of node.children) mergeNode(found.children, child);
    };
    const deepSort = (list) => { list.sort((a, b) => b.qty - a.qty); for (const row of list) deepSort(row.children); };
    const base = new Map();
    const crafts = new Map();
    const steps = stepsOf(line);
    const open = steps.filter((step) => !DONE.has(String(step.title).toLowerCase()));
    const spent = new Map();

    // Take what you hold off the top, once, then roll the rest through its
    // recipe. Anything the farm makes stops here — it is time, not a trip.
    const need = (name, qty, depth, step, path, parentQty) => {
      const key = String(name).toLowerCase();
      if (qty <= 0) return null;
      const have = Math.max(0, (stock.get(key) || 0) - (spent.get(key) || 0));
      if (have > 0) {
        const used = Math.min(have, qty);
        spent.set(key, (spent.get(key) || 0) + used);
        qty -= used;
        if (qty <= 0) return null;
      }
      note(name, qty, step, path, parentQty);
      const node = { name, qty, crafts: 0, kind: "base", children: [] };
      if (covered.has(key)) { node.kind = "covered"; return node; }
      const item = byName.get(key);
      const recipe = item && craftRows.get(item.id);
      if (!item || farm[item.name] || !recipe || !recipe.length || depth > 12 || cookIds.has(item.id)) {
        base.set(name, (base.get(name) || 0) + qty);
        return node;
      }
      if (cost) {
        const verdict = cost(name);
        if (verdict.how !== "craft" && verdict.go) {
          if (verdict.make && Number.isFinite(verdict.make.ap) && Number.isFinite(verdict.make.nets)) {
            const seen = instead.get(name) || { name, qty: 0, place: verdict.go.spot.place, goAp: 0, goNets: 0, makeAp: 0, makeNets: 0, rides: false };
            seen.rides = seen.rides || !!verdict.free;
            seen.qty += qty;
            seen.goAp += qty * verdict.go.ap;
            seen.goNets += qty * verdict.go.nets;
            seen.makeAp += qty * verdict.make.ap;
            seen.makeNets += qty * verdict.make.nets;
            instead.set(name, seen);
          }
          base.set(name, (base.get(name) || 0) + qty);
          return node;
        }
      }
      const made = qty / YIELD;
      node.kind = "craft";
      node.crafts = made;
      crafts.set(name, (crafts.get(name) || 0) + made);
      const deeper = path.concat(item.name);
      for (const row of recipe) {
        const part = (byId.get(row.reqId) || {}).name;
        if (!part) continue;
        const child = need(part, made * row.amt, depth + 1, step, deeper, qty);
        if (child) node.children.push(child);
      }
      return node;
    };

    let pieces = 0;
    for (const step of open) for (const row of step.requirements || []) {
      pieces += row.quantity;
      const node = need(row.item, row.quantity, 0, step.title, [], 0);
      if (node) mergeNode(roots, node);
    }

    const places = new Map();
    const fromFarm = [];
    const grow = [];
    const unknown = [];
    for (const [name, qty] of base) {
      const item = byName.get(String(name).toLowerCase());
      if (farm[name]) { fromFarm.push({ name, qty, ...farm[name] }); continue; }
      // A crop is grown, even though the fishing tables list Corn and
      // Sunflower at a fraction of an item per net.
      if (item && item.growMin > 0) { grow.push({ name, qty, growMin: item.growMin }); continue; }
      const place = bestPlace.get(String(name).toLowerCase());
      if (place) {
        if (!places.has(place.place)) places.set(place.place, { place: place.place, kind: place.kind, rows: [], ap: 0 });
        const entry = places.get(place.place);
        const ap = qty / place.rate;
        entry.rows.push({ name, qty, rate: place.rate, ap });
        entry.ap = Math.max(entry.ap, ap);
        continue;
      }
      unknown.push({ name, qty });
    }
    // One trip covers every line on the table, so whatever is not the reason
    // you went is riding along — and that is what makes the next pass cheaper.
    const rides = new Set();
    for (const entry of places.values()) {
      for (const row of entry.rows) {
        const denom = entry.kind === "explore" ? denomBy.get(`${entry.place.toLowerCase()}|${String(row.name).toLowerCase()}`) : null;
        row.explores = denom > 0 ? row.qty * denom : null;
        if (row.explores != null) entry.explores = Math.max(entry.explores || 0, row.explores);
        else if (entry.kind === "explore") entry.someUnmeasured = true;
      }
      entry.rows.sort((a, b) => b.ap - a.ap);
      entry.rows.forEach((row, index) => {
        row.rides = index > 0;
        if (index > 0) rides.add(String(row.name).toLowerCase());
      });
    }
    // One row per item the line touches, at every depth — the raw drops, the
    // parts those become, the parts those become, all the way up.
    const where = new Map();
    const mark = (name, label, kind) => where.set(String(name).toLowerCase(), { label, kind });
    for (const [name] of crafts) mark(name, "Craft it", "craft");
    for (const row of fromFarm) mark(row.name, row.from, "farm");
    for (const row of grow) mark(row.name, "Grow it", "grow");
    for (const entry of places.values()) for (const row of entry.rows) mark(row.name, entry.place, entry.kind);
    for (const row of unknown) mark(row.name, "No source in the data", "none");
    for (const key of covered) { const item = byName.get(key); if (item) mark(item.name, "You get it another way", "covered"); }
    const everything = [...trace.values()].map((row) => {
      const key = String(row.name).toLowerCase();
      const item = byName.get(key);
      const recipe = item && craftRows.get(item.id);
      const madeHere = crafts.get(row.name) || 0;
      return {
        name: row.name,
        qty: [...row.steps.values()].reduce((sum, n) => sum + n, 0),
        where: where.get(key) || { label: "Nothing needs it", kind: "none" },
        crafts: madeHere,
        recipe: recipe && recipe.length ? recipe.map((line) => ({ part: (byId.get(line.reqId) || {}).name, amt: line.amt })).filter((line) => line.part) : null,
      };
    }).sort((a, b) => b.qty - a.qty);
    return {
      steps, open, pieces, base, crafts, rides, trace, everything, where,
      tree: (deepSort(roots), roots),
      instead: [...instead.values()].sort((a, b) => (b.makeAp + b.makeNets) - (a.makeAp + a.makeNets)),
      fromFarm: fromFarm.sort((a, b) => b.qty - a.qty),
      places: [...places.values()].sort((a, b) => b.ap - a.ap),
      grow: grow.sort((a, b) => b.qty - a.qty), unknown: unknown.sort((a, b) => b.qty - a.qty),
    };
  }

  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const short = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "bn"
    : n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "m"
    : n >= 1000 ? Math.round(n / 1000) + "k"
    : String(Math.round(n)));
  const esc = (text) => String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function art(name, size) {
    const px = size || 26;
    const url = ART && ART.urlFor ? ART.urlFor(name) : "";
    return url ? `<img src="${esc(url)}" alt="" width="${px}" height="${px}" loading="lazy">` : `<span class="plan-noart" style="width:${px}px;height:${px}px"></span>`;
  }
  const hours = (days) => (days >= 1 ? fmt(days) + (days === 1 ? " day" : " days") : Math.round(days * 24) + " hours");

  function render() {
    const line = pick.value;
    // Settle it: the first pass decides routes blind, then each pass knows
    // which items were already riding along and can reconsider.
    let result = plan(line, new Set());
    if (compare && compare.checked) {
      for (let pass = 0; pass < 2; pass += 1) {
        const next = plan(line, result.rides);
        const settled = next.rides.size === result.rides.size && [...next.rides].every((key) => result.rides.has(key));
        result = next;
        if (settled) break;
      }
    }
    const craftTotal = [...result.crafts.values()].reduce((sum, n) => sum + n, 0);
    const apTotal = result.places.filter((entry) => entry.kind === "explore").reduce((sum, entry) => sum + entry.ap, 0);
    const cost = spend();
    const exploreTotal = result.places.filter((entry) => entry.kind === "explore").reduce((sum, entry) => sum + (entry.explores || 0), 0);
    const staminaTotal = exploreTotal * cost.perExplore * cost.neigh;
    const ciderTotal = exploreTotal / cost.ciderRolls;
    // Cider and Arnold Palmers are not the same job. An AP finds items on its
    // own; a cider spends your stamina bar. Both are shown per item so the
    // choice is yours, and neither is totalled across the line, because one
    // brutally rare drop would swallow the sum and tell you nothing.
    const drinkNote = (explores) => {
      if (!(explores > 0)) return "";
      return `${short(explores / cost.ciderRolls)} cider, ${short(explores * cost.perExplore * cost.neigh)} stamina`;
    };
    const netTotal = result.places.filter((entry) => entry.kind === "fish").reduce((sum, entry) => sum + entry.ap, 0);
    const farmDays = result.fromFarm.reduce((most, row) => Math.max(most, row.perDay ? row.qty / row.perDay : 0), 0);

    summary.innerHTML = [
      ["Steps left", fmt(result.open.length), `of ${result.steps.length} in this line`],
      ["To turn in", short(result.pieces), "pieces, after what you hold"],
      ["Crafting actions", short(craftTotal), `at ${YIELD}× duplicates`],
      ["Exploring", short(apTotal) + " AP", "the longest job at each place covers the rest"],
      ["Fishing", short(netTotal) + " nets", "Large Nets, same rule"],
      ["Your farm", hours(farmDays), "of production, running alongside"],
    ].map(([label, value, note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join("");

    // Every row opens. A number on its own does not tell you whether it is
    // one recipe eating everything or thirteen steps each wanting a little.
    const top = (map, limit) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    const entryList = (pairs) => pairs.map(([label, qty]) => `<li><span>${esc(label)}</span><b>${fmt(qty)}</b></li>`).join("");
    // A line that names another item shows that item's picture and jumps to
    // its own row, so a chain can be walked a link at a time.
    const link = (item, label) => (item && result.trace.has(String(item).toLowerCase())
      ? `<button type="button" class="plan-jump" data-goto="${esc(String(item).toLowerCase())}">${art(item, 20)}<span>${esc(label)}</span></button>`
      : `<span class="plan-flat">${art(item || label, 20)}<span>${esc(label)}</span></span>`);
    const chainList = (vias) => vias.map((via) => `<li>${link(via.parent, via.label)}<b>${via.parent ? `<i>${fmt(via.parentQty)}</i> ${fmt(via.qty)}` : fmt(via.qty)}</b></li>`).join("");
    const partList = (lines, crafts) => lines.map((line) => `<li>${link(line.part, line.part)}<b><i>${fmt(line.amt)} each</i> ${fmt(crafts * line.amt)}</b></li>`).join("");
    const madeOf = new Map(result.everything.map((row) => [String(row.name).toLowerCase(), row]));
    const whyHtml = (name) => {
      const key = String(name).toLowerCase();
      const row = result.trace.get(key);
      if (!row) return `<tr class="plan-detail" hidden><td colspan="3"><p class="plan-why-none">Nothing in this line asks for it directly.</p></td></tr>`;
      const via = [...row.via.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
      const steps = top(row.steps, 12);
      const more = row.steps.size > steps.length ? `<li class="plan-why-more"><span>and ${fmt(row.steps.size - steps.length)} more steps</span><b></b></li>` : "";
      // The other half of the answer: what this one is built out of, in the
      // amounts this plan actually calls for.
      const self = madeOf.get(key);
      const making = self && self.crafts > 0 && self.recipe;
      const parts = making
        ? `<section><h4>Made from — ${fmt(self.crafts)} crafts at ${YIELD}×</h4><ul>${partList(self.recipe, self.crafts)}</ul></section>`
        : (self && self.recipe ? `<section><h4>Could be made from</h4><ul>${partList(self.recipe, 0)}</ul><p class="plan-why-none">Going for it beats making it, so the plan does not craft any.</p></section>` : "");
      const isCovered = covered.has(key);
      const switchHtml = `<p class="plan-cover"><button type="button" class="plan-cover-btn${isCovered ? " is-on" : ""}" data-cover="${esc(key)}">${isCovered ? "Count it again — I do make these" : "Leave it out — I get these another way"}</button>${isCovered ? `<small>Nothing underneath it is being asked for.</small>` : ""}</p>`;
      return `<tr class="plan-detail" hidden><td colspan="3"><div class="plan-why${parts && !isCovered ? " has-three" : ""}">
        ${isCovered ? "" : parts}
        <section><h4>What it goes into</h4><ul>${chainList(via)}${row.via.size > via.length ? `<li class="plan-why-more"><span>and ${fmt(row.via.size - via.length)} more recipes</span><b></b></li>` : ""}</ul></section>
        <section><h4>Which steps are paying</h4><ul>${entryList(steps)}${more}</ul></section>
        ${switchHtml}
      </div></td></tr>`;
    };
    const rowsHtml = (rows, right) => rows.map((row) => `<tr data-name="${esc(String(row.name).toLowerCase())}"><td><button type="button" class="plan-open" aria-expanded="false">${art(row.name)}<b>${esc(row.name)}</b></button></td><td>${fmt(row.qty)}</td><td>${right(row)}</td></tr>${whyHtml(row.name)}`).join("");

    // Top of the tree first: the thing you hand in, then what it is made of,
    // one layer at a time. Reading it the other way round asks you to hold a
    // recipe in your head backwards.
    // A gathered item says what the trip costs, not just where it is.
    const placeNote = new Map();
    for (const entry of result.places) {
      for (const row of entry.rows) {
        const trip = row.rides
          ? "rides along"
          : `${fmt(row.ap)} ${entry.kind === "fish" ? "nets" : "AP"}${row.explores ? ` or ${drinkNote(row.explores)}` : ""}`;
        placeNote.set(String(row.name).toLowerCase(), `${entry.place} · ${trip}`);
      }
    }
    for (const row of result.fromFarm) placeNote.set(String(row.name).toLowerCase(), `${row.from} · ${row.perDay ? hours(row.qty / row.perDay) : "buy it"}`);
    for (const row of result.grow) placeNote.set(String(row.name).toLowerCase(), `Grow it · ${fmt(row.growMin)} min a harvest`);
    const whereLabel = (name) => {
      const key = String(name).toLowerCase();
      if (placeNote.has(key)) return placeNote.get(key);
      const spot = result.where.get(key);
      return spot ? spot.label : "No source in the data";
    };
    // The same tree, cut back to the branches that end at one place. Amber
    // stops being a number on its own and becomes "Amber Cane, and this is
    // the Amber it takes".
    const pruneTo = (nodes, wanted) => nodes.map((node) => {
      const kids = pruneTo(node.children, wanted);
      if (!kids.length && !wanted.has(String(node.name).toLowerCase())) return null;
      return { name: node.name, qty: node.qty, crafts: node.crafts, kind: node.kind, children: kids };
    }).filter(Boolean);
    let nodeCount = 0;
    const nodeHtml = (node, depth) => {
      nodeCount += 1;
      const kids = node.children.length;
      const note = node.kind === "craft" ? `${fmt(node.crafts)} crafts at ${YIELD}×`
        : node.kind === "covered" ? "you get these another way"
        : whereLabel(node.name);
      const row = `<div class="plan-node-row${kids ? " has-kids" : ""}" style="--depth:${depth}"${kids ? ` role="button" tabindex="0" aria-expanded="false"` : ""}>
          <span class="plan-node-mark"></span>${art(node.name, depth ? 22 : 28)}
          <span class="plan-node-name"><b>${esc(node.name)}</b><small>${esc(note)}</small></span>
          <em>${fmt(node.qty)}</em>
        </div>`;
      return `<li class="plan-node">${row}${kids ? `<ul class="plan-kids" hidden>${node.children.map((child) => nodeHtml(child, depth + 1)).join("")}</ul>` : ""}</li>`;
    };

    const parts = [];
    if (result.tree.length) {
      const treeHtml = result.tree.map((node) => nodeHtml(node, 0)).join("");
      parts.push(`<section class="plan-place plan-tree"><header><h3>Everything this questline wants</h3><em>${fmt(result.tree.length)} items</em><small>what you still owe across every step left. Open a row to see how it is made, and keep going down until a row names a place — that is where you actually go. Every amount is after ${YIELD}× duplicates.</small></header>
        <ul class="plan-roots">${treeHtml}</ul></section>`);
    }
    const leftOut = [...covered].map((key) => (byName.get(key) || {}).name).filter(Boolean).sort();
    if (leftOut.length) {
      parts.push(`<section class="plan-place plan-left-out"><header><h3>Left out on purpose</h3><em>${fmt(leftOut.length)}</em><small>you get these another way, so nothing underneath them is counted</small></header>
        <p class="plan-chips">${leftOut.map((name) => `<button type="button" class="plan-chip" data-cover="${esc(name.toLowerCase())}">${art(name, 20)}<span>${esc(name)}</span><i aria-hidden="true">×</i></button>`).join("")}</p></section>`);
    }
    for (const entry of result.places) {
      const wanted = new Set(entry.rows.map((row) => String(row.name).toLowerCase()));
      const branches = pruneTo(result.tree, wanted);
      const driver = entry.rows[0];
      parts.push(`<section class="plan-place plan-tree">
        <header><h3>${esc(entry.place)}</h3><em>${short(entry.ap)} ${entry.kind === "fish" ? "Large Nets" : "AP"}</em><small>${driver ? `set by ${esc(driver.name)} — one trip clears the whole table, so everything else here comes along with it` : "one trip clears the whole table"}</small></header>
        <ul class="plan-roots">${branches.map((node) => nodeHtml(node, 0)).join("")}</ul></section>`);
    }
    const branchSection = (rows, title, figure, blurb) => {
      if (!rows.length) return;
      const wanted = new Set(rows.map((row) => String(row.name).toLowerCase()));
      const branches = pruneTo(result.tree, wanted);
      parts.push(`<section class="plan-place plan-tree"><header><h3>${esc(title)}</h3><em>${esc(figure)}</em><small>${esc(blurb)}</small></header>
        <ul class="plan-roots">${branches.map((node) => nodeHtml(node, 0)).join("")}</ul></section>`);
    };
    branchSection(result.fromFarm, "Your farm", hours(farmDays), "production, not a trip. An hourly building drops everything above your inventory cap in one go — Hickory's six collections an hour keep most of it.");
    branchSection(result.grow, "Grow", `${result.grow.length} crops`, "plant, water, harvest");
    const craftList = [...result.crafts.entries()].sort((a, b) => b[1] - a[1]).map(([name, qty]) => ({ name, qty }));
    if (craftList.length) {
      parts.push(`<section class="plan-place"><header><h3>Craft</h3><em>${short(craftTotal)} actions</em><small>biggest jobs first</small></header>
        <table><thead><tr><th>Item</th><th>Crafts</th><th>Makes</th></tr></thead><tbody>
        ${rowsHtml(craftList, (row) => `${fmt(row.qty * YIELD)} items`)}</tbody></table></section>`);
    }
    if (result.instead && result.instead.length) {
      parts.push(`<section class="plan-place"><header><h3>Go and get it, do not make it</h3><em>${result.instead.length} items</em><small>you can craft all of these — going is the cheaper job, or the trip is one you are making anyway</small></header>
        <table><thead><tr><th>Item</th><th>Needed</th><th>Where it comes from · what making it would cost instead</th></tr></thead><tbody>
        ${rowsHtml(result.instead, (row) => `${esc(row.place)}, ${row.rides ? "already on the table there" : `${short(row.goAp || row.goNets)} ${row.goNets > row.goAp ? "nets" : "AP"}`} · crafting ${short(row.makeAp)} AP${row.makeNets > 0 ? ` and ${short(row.makeNets)} nets` : ""}`)}</tbody></table></section>`);
    }
    if (result.everything.length) {
      parts.push(`<section class="plan-place plan-all"><header><h3>Every item in this line</h3><em>${fmt(result.everything.length)} items</em><small>raw drops, the parts they become, and the parts those become — open any one to see what it is made of and what it feeds</small></header>
        <div class="plan-find"><label><span>Find an item</span><input id="planFind" type="search" autocomplete="off" placeholder="Moonstone, Control Box, Engine…"></label><strong id="planFindCount"></strong></div>
        <table><thead><tr><th>Item</th><th>Needed</th><th>Where it comes from</th></tr></thead><tbody id="planAllRows">
        ${rowsHtml(result.everything, (row) => esc(row.where.label))}</tbody></table></section>`);
    }
    branchSection(result.unknown, "No source in the data", String(result.unknown.length), "buy them, open them from a bag, or take them as a quest reward");
    body.innerHTML = parts.join("");
    wireFinder();
  }

  pick.innerHTML = lines.map((line) => `<option value="${esc(line)}"${line === "Distant Illusions" ? " selected" : ""}>${esc(line)}</option>`).join("");
  // The whole-line table is long on purpose, so it gets a finder. Filtering
  // in place keeps every open row open and costs nothing to redraw.
  function wireFinder() {
    const find = document.getElementById("planFind");
    const count = document.getElementById("planFindCount");
    const rows = document.getElementById("planAllRows");
    if (!find || !rows) return;
    const apply = () => {
      const query = find.value.trim().toLowerCase();
      let shown = 0;
      for (const row of [...rows.children]) {
        if (row.classList.contains("plan-detail")) continue;
        const match = !query || (row.getAttribute("data-name") || "").includes(query);
        row.hidden = !match;
        if (match) shown += 1;
        const detail = row.nextElementSibling;
        if (detail && detail.classList.contains("plan-detail") && !match) {
          detail.hidden = true;
          const button = row.querySelector(".plan-open");
          if (button) button.setAttribute("aria-expanded", "false");
        }
      }
      if (count) count.textContent = query ? `${fmt(shown)} match${shown === 1 ? "" : "es"}` : "";
    };
    find.addEventListener("input", apply);
    apply();
  }

  // The whole row opens, not a three-pixel arrow.
  function openBranch(row) {
    const kids = row.parentElement.querySelector(":scope > .plan-kids");
    if (!kids) return;
    const opening = kids.hasAttribute("hidden");
    if (opening) kids.removeAttribute("hidden"); else kids.setAttribute("hidden", "");
    row.setAttribute("aria-expanded", opening ? "true" : "false");
  }
  body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".plan-node-row.has-kids");
    if (!row) return;
    event.preventDefault();
    openBranch(row);
  });
  body.addEventListener("click", (event) => {
    const cover = event.target.closest("[data-cover]");
    if (cover) {
      const key = cover.getAttribute("data-cover");
      if (covered.has(key)) covered.delete(key); else covered.add(key);
      saveCovered();
      render();
      return;
    }
    // Clicking a part or a parent walks you to its own row in the full list.
    const jump = event.target.closest(".plan-jump");
    if (jump) {
      const rows = document.getElementById("planAllRows");
      const find = document.getElementById("planFind");
      if (find && find.value) { find.value = ""; find.dispatchEvent(new Event("input")); }
      const target = rows && [...rows.children].find((tr) => tr.getAttribute("data-name") === jump.getAttribute("data-goto"));
      if (!target) return;
      const detail = target.nextElementSibling;
      if (detail && detail.classList.contains("plan-detail") && detail.hasAttribute("hidden")) {
        detail.removeAttribute("hidden");
        const opener = target.querySelector(".plan-open");
        if (opener) opener.setAttribute("aria-expanded", "true");
      }
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.classList.add("plan-flash");
      setTimeout(() => target.classList.remove("plan-flash"), 1400);
      return;
    }
    const branch = event.target.closest(".plan-node-row.has-kids");
    if (branch) { openBranch(branch); return; }
    const button = event.target.closest(".plan-open");
    if (!button) return;
    const detail = button.closest("tr").nextElementSibling;
    if (!detail || !detail.classList.contains("plan-detail")) return;
    const opening = detail.hasAttribute("hidden");
    if (opening) detail.removeAttribute("hidden"); else detail.setAttribute("hidden", "");
    button.setAttribute("aria-expanded", opening ? "true" : "false");
  });
  pick.addEventListener("change", render);
  useFarm.addEventListener("change", render);
  useStock.addEventListener("change", render);
  window.addEventListener("load", render);
  window.FRPG_renderPlan = render;
  render();
})();

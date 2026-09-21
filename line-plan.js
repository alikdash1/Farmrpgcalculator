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
      if (farm[name] || (item && item.growMin > 0)) best = { ap: 0, nets: 0, how: "farm", free: false };
      else if (freeKeys.has(key) && go) best = { ap: 0, nets: 0, how: go.how, free: true };
      else if (go && make) best = (go.ap <= make.ap && go.nets <= make.nets) ? Object.assign({}, go, { free: false }) : Object.assign({}, make, { free: false });
      else best = Object.assign({ ap: 0, nets: 0, how: "unknown" }, go || make || {}, { free: false });
      const out = { ap: best.ap, nets: best.nets, how: best.how, free: best.free, go, make };
      memo.set(key, out);
      return out;
    };
    return (name) => walk(String(name).toLowerCase(), 0, new Set());
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
    const base = new Map();
    const crafts = new Map();
    const steps = stepsOf(line);
    const open = steps.filter((step) => !DONE.has(String(step.title).toLowerCase()));
    const spent = new Map();

    // Take what you hold off the top, once, then roll the rest through its
    // recipe. Anything the farm makes stops here — it is time, not a trip.
    const need = (name, qty, depth) => {
      const key = String(name).toLowerCase();
      if (qty <= 0) return;
      const have = Math.max(0, (stock.get(key) || 0) - (spent.get(key) || 0));
      if (have > 0) {
        const used = Math.min(have, qty);
        spent.set(key, (spent.get(key) || 0) + used);
        qty -= used;
        if (qty <= 0) return;
      }
      const item = byName.get(key);
      const recipe = item && craftRows.get(item.id);
      if (!item || farm[item.name] || !recipe || !recipe.length || depth > 12 || cookIds.has(item.id)) {
        base.set(name, (base.get(name) || 0) + qty);
        return;
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
          return;
        }
      }
      const made = qty / YIELD;
      crafts.set(name, (crafts.get(name) || 0) + made);
      for (const row of recipe) {
        const part = (byId.get(row.reqId) || {}).name;
        if (part) need(part, made * row.amt, depth + 1);
      }
    };

    let pieces = 0;
    for (const step of open) for (const row of step.requirements || []) { pieces += row.quantity; need(row.item, row.quantity, 0); }

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
      entry.rows.sort((a, b) => b.ap - a.ap);
      entry.rows.forEach((row, index) => {
        row.rides = index > 0;
        if (index > 0) rides.add(String(row.name).toLowerCase());
      });
    }
    return {
      steps, open, pieces, base, crafts, rides,
      instead: [...instead.values()].sort((a, b) => (b.makeAp + b.makeNets) - (a.makeAp + a.makeNets)),
      fromFarm: fromFarm.sort((a, b) => b.qty - a.qty),
      places: [...places.values()].sort((a, b) => b.ap - a.ap),
      grow: grow.sort((a, b) => b.qty - a.qty), unknown: unknown.sort((a, b) => b.qty - a.qty),
    };
  }

  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "m" : n >= 1000 ? Math.round(n / 1000) + "k" : String(Math.round(n)));
  const esc = (text) => String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function art(name) {
    const url = ART && ART.urlFor ? ART.urlFor(name) : "";
    return url ? `<img src="${esc(url)}" alt="" width="26" height="26" loading="lazy">` : `<span class="plan-noart"></span>`;
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

    const rowsHtml = (rows, right) => rows.map((row) => `<tr><td>${art(row.name)}<b>${esc(row.name)}</b></td><td>${fmt(row.qty)}</td><td>${right(row)}</td></tr>`).join("");

    const parts = [];
    for (const entry of result.places) {
      parts.push(`<section class="plan-place">
        <header><h3>${esc(entry.place)}</h3><em>${short(entry.ap)} ${entry.kind === "fish" ? "Large Nets" : "AP"}</em><small>${entry.kind === "fish" ? "casting" : "pouring"} for the longest one here covers the rest</small></header>
        <table><thead><tr><th>Item</th><th>Needed</th><th>${entry.kind === "fish" ? "Per net · nets" : "Per AP · AP"}</th></tr></thead><tbody>
        ${rowsHtml(entry.rows, (row) => `${row.rate.toFixed(row.rate < 1 ? 3 : 1)} · ${row.rides ? "rides along" : fmt(row.ap)}`)}</tbody></table></section>`);
    }
    if (result.fromFarm.length) {
      parts.push(`<section class="plan-place"><header><h3>Your farm</h3><em>${hours(farmDays)}</em><small>production, not a trip. An hourly building drops everything above your inventory cap in one go — Hickory's six collections an hour keep most of it.</small></header>
        <table><thead><tr><th>Item</th><th>Needed</th><th>Where · how long</th></tr></thead><tbody>
        ${rowsHtml(result.fromFarm, (row) => `${esc(row.from)} · ${row.perDay ? hours(row.qty / row.perDay) : "silver"}`)}</tbody></table></section>`);
    }
    if (result.grow.length) {
      parts.push(`<section class="plan-place"><header><h3>Grow</h3><em>${result.grow.length} crops</em><small>plant, water, harvest</small></header>
        <table><thead><tr><th>Crop</th><th>Needed</th><th>Grows in</th></tr></thead><tbody>
        ${rowsHtml(result.grow, (row) => `${fmt(row.growMin)} min`)}</tbody></table></section>`);
    }
    const craftList = [...result.crafts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, qty]) => ({ name, qty }));
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
    if (result.unknown.length) {
      parts.push(`<section class="plan-place"><header><h3>No source in the data</h3><em>${result.unknown.length}</em><small>buy, open from a bag, or a quest reward</small></header>
        <table><thead><tr><th>Item</th><th>Needed</th><th></th></tr></thead><tbody>
        ${rowsHtml(result.unknown, () => "")}</tbody></table></section>`);
    }
    body.innerHTML = parts.join("");
  }

  pick.innerHTML = lines.map((line) => `<option value="${esc(line)}"${line === "Distant Illusions" ? " selected" : ""}>${esc(line)}</option>`).join("");
  pick.addEventListener("change", render);
  useFarm.addEventListener("change", render);
  useStock.addEventListener("change", render);
  window.addEventListener("load", render);
  window.FRPG_renderPlan = render;
  render();
})();

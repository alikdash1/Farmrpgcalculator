// Craft versus go, decided per item - the one costing model every tool shares.
//
//   import { makeCoster } from "./costing.mjs";
//   const coster = makeCoster(W);            // after prepare(W)
//   const { base, crafts } = coster.roll("Salt", 409830);
//
// Every ad-hoc script this project wrote made the same mistake: expanding every
// recipe down to raw, which routes Glass Orb through Shimmer Stone and out into
// Sandstone when Glass Orb simply drops at Ember Lagoon at 113 per AP. This
// compares going against making at every level and keeps the cheaper one, with
// AP and Large Nets kept apart (there is no honest exchange rate between them)
// and farm output costing neither.

export const YIELD = 1.45;

export function makeCoster(W, { alwaysCraft = false } = {}) {
  const D = W.FRPG_DATA;
  const items = D.items.items;
  const byName = new Map(items.map((i) => [i.name.toLowerCase(), i]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const craft = new Map();
  for (const r of D.recipes.craft || []) {
    if (!craft.has(r.itemId)) craft.set(r.itemId, []);
    craft.get(r.itemId).push(r);
  }
  const cook = new Set((D.recipes.cook || []).map((r) => r.itemId));
  const farm = new Set(((W.FRPG_PLAYER_FACTS || {}).farmMakes || []).map((s) => s.toLowerCase()));
  const noMail = new Set(((W.FRPG_TRADEABLE || {}).cannotMail || []).map((s) => s.toLowerCase()));
  const E = (W.FRPG_WORKBOOK_RATES || {}).exploring || {};
  const F = (W.FRPG_WORKBOOK_RATES || {}).fishing || {};

  // Best place per item: exploring by rate, fishing only where nothing explores.
  const spot = new Map();
  for (const [p, t] of Object.entries(E)) for (const [i, r] of Object.entries(t)) {
    const k = i.toLowerCase();
    if (!spot.has(k) || spot.get(k).rate < r) spot.set(k, { place: p, rate: r, kind: "explore" });
  }
  for (const [p, t] of Object.entries(F)) for (const [i, r] of Object.entries(t)) {
    const k = i.toLowerCase();
    if (!spot.has(k)) spot.set(k, { place: p, rate: r, kind: "fish" });
  }

  const memo = new Map();
  function unit(name, depth = 0, seen = new Set()) {
    const key = name.toLowerCase();
    if (memo.has(key)) return memo.get(key);
    if (seen.has(key) || depth > 12) return { ap: Infinity, nets: Infinity, how: "loop" };
    const item = byName.get(key);
    const s = spot.get(key);
    const go = s ? { ap: s.kind === "fish" ? 0 : 1 / s.rate, nets: s.kind === "fish" ? 1 / s.rate : 0, how: "go", spot: s } : null;
    let make = null;
    const rec = item && craft.get(item.id);
    if (rec && rec.length && !cook.has(item.id)) {
      seen.add(key);
      let ap = 0; let nets = 0; let ok = true;
      for (const r of rec) {
        const part = (byId.get(r.reqId) || {}).name;
        if (!part) continue;
        const sub = unit(part, depth + 1, seen);
        if (!Number.isFinite(sub.ap) || !Number.isFinite(sub.nets)) { ok = false; break; }
        ap += sub.ap * r.amt; nets += sub.nets * r.amt;
      }
      seen.delete(key);
      if (ok) make = { ap: ap / YIELD, nets: nets / YIELD, how: "craft" };
    }
    let best;
    if (farm.has(key)) best = { ap: 0, nets: 0, how: "farm" };
    // A crop costs field time, which the data cannot price without the plot
    // count - never "no source".
    else if (item && item.type === "crop") best = { ap: 0, nets: 0, how: "crop", growMin: item.growMin };
    else if (go && make && !alwaysCraft) best = (go.ap <= make.ap && go.nets <= make.nets) ? go : make;
    else best = make || go || { ap: 0, nets: 0, how: "unknown" };
    const out = { ...best, go, make };
    memo.set(key, out);
    return out;
  }

  // Roll a goal down to what you actually go and get. Returns the base items,
  // the crafts made on the way (every one of which also counts for mastery),
  // and the items gathered because going beat making.
  function roll(name, qty, into = { base: new Map(), crafts: new Map(), chose: [] }) {
    const step = (n, q, depth) => {
      if (q <= 0) return;
      const key = n.toLowerCase();
      const item = byName.get(key);
      const decision = unit(n);
      if (farm.has(key) || decision.how !== "craft" || !item || depth > 12) {
        into.base.set(n, (into.base.get(n) || 0) + q);
        if (decision.how === "go" && decision.make && Number.isFinite(decision.make.ap)) {
          into.chose.push({ name: n, qty: q, go: decision.go, make: decision.make });
        }
        return;
      }
      const c = q / YIELD;
      into.crafts.set(n, (into.crafts.get(n) || 0) + c);
      for (const r of craft.get(item.id)) {
        const part = (byId.get(r.reqId) || {}).name;
        if (part) step(part, c * r.amt, depth + 1);
      }
    };
    step(name, qty, 0);
    return into;
  }

  // AP and Large Nets to gather a base list, each line farmed on its own.
  function price(base) {
    let ap = 0; let nets = 0;
    const lines = [];
    for (const [n, q] of base) {
      const k = n.toLowerCase();
      if (farm.has(k)) { lines.push({ name: n, qty: q, farm: true }); continue; }
      const it = byName.get(k);
      if (it && it.type === "crop") { lines.push({ name: n, qty: q, crop: true, growMin: it.growMin }); continue; }
      const s = spot.get(k);
      if (!s) { lines.push({ name: n, qty: q, unknown: true, noMail: noMail.has(k) }); continue; }
      const cost = q / s.rate;
      if (s.kind === "fish") nets += cost; else ap += cost;
      lines.push({ name: n, qty: q, spot: s, cost, unit: s.kind === "fish" ? "nets" : "AP", noMail: noMail.has(k) });
    }
    return { ap, nets, lines };
  }

  return { unit, roll, price, spot, farm, noMail, byName, byId, craft, cook, E, F };
}

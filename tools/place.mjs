// What a place is actually worth to YOU: every drop, against everything you owe.
//
// The mistake this exists to stop: checking only whether the DROPPED item has a
// mastery. Whispering Creek looks empty that way - no mastery sits on Oak or on
// Slimestone. But Oak becomes Fancy Drum and Red Trunk, Slimestone becomes
// Barbed Wire, and those masteries are wide open. A place earns its trip
// through what its drops BECOME, not through what they are.
//
// Demand is rolled with craft-versus-go decided per item (see tools/cost.mjs)
// and with pass-through masteries removed (see tools/goals.mjs).
//
//   node tools/place.mjs "Whispering Creek"
//   node tools/place.mjs "Mount Banon" "Whispering Creek" --floor 350
//   node tools/place.mjs "Whispering Creek" --no-quests

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { towerFloors } from "./tower.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ["data/data.js", "data/extra-items.js", "data/main-quests.js",
  "data/personal-quests.js", "data/personal-tower.js", "data/tower-floors.js",
  "data/workbook-rates.js", "data/player-facts.js", "data/tradeable.js"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f });
}
const W = ctx.window;
const D = W.FRPG_DATA;
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const topFloor = Number(flag("--floor", (W.FRPG_PLAYER_FACTS || {}).goalFloor || 350));
const noQuests = argv.includes("--no-quests");
const places = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--floor");

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
const E = W.FRPG_WORKBOOK_RATES.exploring;
const F = W.FRPG_WORKBOOK_RATES.fishing || {};
const YIELD = 1.45;

const spot = new Map();
for (const [p, t] of Object.entries(E)) for (const [i, r] of Object.entries(t)) {
  const k = i.toLowerCase();
  if (!spot.has(k) || spot.get(k).rate < r) spot.set(k, { place: p, rate: r, kind: "explore" });
}
for (const [p, t] of Object.entries(F)) for (const [i, r] of Object.entries(t)) {
  const k = i.toLowerCase();
  if (!spot.has(k)) spot.set(k, { place: p, rate: r, kind: "fish" });
}

// Per-unit cost, craft versus go, exactly as tools/cost.mjs decides it.
const memo = new Map();
function unit(name, depth, seen) {
  const key = name.toLowerCase();
  if (memo.has(key)) return memo.get(key);
  if (seen.has(key) || depth > 12) return { ap: Infinity, nets: Infinity, how: "loop" };
  const item = byName.get(key);
  const s = spot.get(key);
  const go = s ? { ap: s.kind === "fish" ? 0 : 1 / s.rate, nets: s.kind === "fish" ? 1 / s.rate : 0, how: "go" } : null;
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
  else if (go && make) best = (go.ap <= make.ap && go.nets <= make.nets) ? go : make;
  else best = make || go || { ap: 0, nets: 0, how: "unknown" };
  memo.set(key, best);
  return best;
}

// Roll one goal down to the things you actually go and get.
function baseOf(name, qty, into) {
  const step = (n, q, depth) => {
    if (q <= 0) return;
    const key = n.toLowerCase();
    const item = byName.get(key);
    const dec = unit(n, 0, new Set());
    if (farm.has(key) || dec.how !== "craft" || !item || depth > 12) {
      into.set(n, (into.get(n) || 0) + q);
      return;
    }
    const c = q / YIELD;
    for (const r of craft.get(item.id)) {
      const part = (byId.get(r.reqId) || {}).name;
      if (part) step(part, c * r.amt, depth + 1);
    }
  };
  step(name, qty, 0);
}

// Everything still open: quests, plus the masteries that do NOT arrive as
// exhaust. Same fixed point as tools/goals.mjs, so the two agree.
const DONE = new Set((((W.FRPG_PERSONAL_QUESTS || {}).completed) || []).map((t) => String(t).toLowerCase()));
const questSteps = noQuests ? [] : (W.FRPG_MAIN_QUESTS.quests || []).filter((s) => !DONE.has(String(s.title).toLowerCase()));
const held = W.FRPG_PERSONAL_TOWER.masteries || {};
const masteries = new Map();
for (const row of towerFloors(W)) {
  if (row.floor > topFloor) continue;
  for (const [tier, list, g] of [["GM", row.gms || [], 100000], ["MM", row.mms || [], 1000000]]) {
    for (const e of list) {
      if (masteries.has(e.name)) continue;
      const cur = Number(held[e.name]) || 0;
      if (cur >= g) continue;
      masteries.set(e.name, { name: e.name, left: g - cur, cur, tier, floor: row.floor });
    }
  }
}

// Mastery counts items MADE, so expand every recipe for the pass-through test.
function made(activeSet) {
  const count = new Map();
  const roll = (n, q, depth) => {
    if (q <= 0) return;
    count.set(n, (count.get(n) || 0) + q);
    const item = byName.get(n.toLowerCase());
    const rec = item && craft.get(item.id);
    if (!item || !rec || !rec.length || depth > 12 || cook.has(item.id)) return;
    const c = q / YIELD;
    for (const r of rec) {
      const part = (byId.get(r.reqId) || {}).name;
      if (part) roll(part, c * r.amt, depth + 1);
    }
  };
  for (const s of questSteps) for (const r of s.requirements || []) roll(r.item, r.quantity, 0);
  for (const n of activeSet) roll(n, masteries.get(n).left, 0);
  return count;
}

let active = new Set(masteries.keys());
for (let pass = 0; pass < 25; pass += 1) {
  const next = new Set();
  for (const [name, m] of masteries) {
    const without = new Set([...active].filter((n) => n !== name));
    if ((made(without).get(name) || 0) < m.left) next.add(name);
  }
  const same = next.size === active.size && [...next].every((n) => active.has(n));
  active = next;
  if (same) break;
}

// Attribute demand back to the goal that asked for it.
const goals = [];
for (const s of questSteps) for (const r of s.requirements || []) goals.push({ label: "quest", name: r.item, qty: r.quantity });
for (const n of active) goals.push({ label: masteries.get(n).tier + " T" + masteries.get(n).floor, name: n, qty: masteries.get(n).left });

const demand = new Map();
const drivers = new Map();
for (const g of goals) {
  const one = new Map();
  baseOf(g.name, g.qty, one);
  for (const [n, q] of one) {
    demand.set(n, (demand.get(n) || 0) + q);
    if (!drivers.has(n)) drivers.set(n, new Map());
    const d = drivers.get(n);
    const label = g.name + " (" + g.label + ")";
    d.set(label, (d.get(label) || 0) + q);
  }
}

// What one AP finds at the workbook places: the median of each table's total.
const ITEMS_PER_AP = (() => {
  const totals = Object.values(E).map((t) => Object.values(t).reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
  return totals[Math.floor(totals.length / 2)] || 500;
})();

const fmt = (n) => Math.round(n).toLocaleString("en-US");
if (!places.length) {
  console.log('Give a place, e.g.  node tools/place.mjs "Whispering Creek"');
  process.exit(1);
}

for (const want of places) {
  let key = Object.keys(E).find((p) => p.toLowerCase() === want.toLowerCase())
    || Object.keys(E).find((p) => p.toLowerCase().includes(want.toLowerCase()));
  let table = key && E[key];
  let converted = false;
  if (!key) {
    // Event places (Haunted House, Santa's Workshop) are not in the workbook,
    // only in the logged drop data as EXPLORES per drop. An Arnold Palmer
    // finds a fixed number of ITEMS, not explores - so convert through each
    // item's share of what the place finds, scaled to what an AP finds at the
    // workbook places. Never divide AP by an explore count directly.
    const loc = (D.sources.locations || []).find((l) => l.type === "explore" && l.name.toLowerCase().includes(want.toLowerCase()));
    if (!loc) { console.log('No place matching "' + want + '".'); continue; }
    const per = Object.entries(loc.drops || {}).filter(([, d]) => d.denom > 0);
    const found = per.reduce((sum, [, d]) => sum + 1 / d.denom, 0);
    key = loc.name;
    table = Object.fromEntries(per.map(([item, d]) => [item, ITEMS_PER_AP * (1 / d.denom) / found]));
    converted = true;
  }
  const rows = Object.entries(table).map(([item, rate]) => {
    const need = demand.get(item) || 0;
    const best = spot.get(item.toLowerCase());
    // An event place's converted rate can beat every workbook place, so compare
    // rates, not just names. No workbook place at all means it drops only here.
    const hereIsBest = !best || best.place === key || rate >= best.rate;
    return { item, rate, need, ap: need / rate, hereIsBest, onlyHere: !best, best };
  }).sort((a, b) => b.ap - a.ap);

  const wanted = rows.filter((r) => r.need > 0);
  const trip = wanted.length ? wanted[0].ap : 0;
  console.log("\n=== " + key);
  if (converted) console.log("Not in the workbook. Rates converted from the logged drop data at " + Math.round(ITEMS_PER_AP) + " items per AP - treat rare drops as rough.");
  console.log(wanted.length + " of " + rows.length + " drops are things you still owe.");
  console.log("One trip that clears the whole table: " + fmt(trip) + " AP" + (wanted.length ? "  (set by " + wanted[0].item + ")" : ""));
  if (wanted.length > 1 && wanted[0].ap > wanted[1].ap * 3) {
    console.log("  " + wanted[0].item + " is the hog - more than 3x the next. Without it: " + fmt(wanted[1].ap) + " AP");
  }
  console.log("");
  console.log("item".padEnd(26) + "per AP".padStart(8) + "you need".padStart(14) + "alone".padStart(13) + "   best place");
  for (const r of rows) {
    const here = r.onlyHere ? "only here" : r.hereIsBest ? "here" : r.best.place + " is better (" + r.best.rate.toFixed(1) + "/AP)";
    const needTxt = r.need > 0 ? fmt(r.need) : "-";
    const apTxt = r.need > 0 ? fmt(r.ap) + " AP" : "-";
    console.log("  " + r.item.padEnd(26) + (r.rate < 1 ? r.rate.toFixed(3) : r.rate.toFixed(2)).padStart(8) + needTxt.padStart(14) + apTxt.padStart(13) + "   " + here);
  }
  for (const r of wanted.slice(0, 5)) {
    const d = [...drivers.get(r.item).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (r === wanted[0]) console.log("\nwhy you need them:");
    console.log("  " + r.item + ":");
    for (const [g, q] of d) console.log("      " + fmt(q).padStart(12) + "  " + g);
  }
}

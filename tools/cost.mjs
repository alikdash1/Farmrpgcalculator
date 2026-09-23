// What one goal actually costs, with craft-versus-go decided per item.
//
// This exists because every ad-hoc script written in this project has made the
// same mistake: expanding every recipe all the way down. That routes Glass Orb
// through Shimmer Stone, Unpolished Shimmer Stone and finally Sandstone, when
// Glass Orb simply drops at Ember Lagoon at 113 per AP and the whole chain is
// pointless. The plan page gets this right; the scripts did not. Use this.
//
//   node tools/cost.mjs "Silk" 50000
//   node tools/cost.mjs "Purple Butterfly" --mastery
//   node tools/cost.mjs "Silk" 50000 "Purple Butterfly" --mastery "Yellow Butterfly" --mastery
//   node tools/cost.mjs "Silk" 50000 --always-craft      (the old, wrong way, for comparison)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const file of ["data/data.js", "data/extra-items.js", "data/personal-tower.js",
  "data/tower-floors.js", "data/workbook-rates.js", "data/player-facts.js", "data/tradeable.js"]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: file });
}
const W = ctx.window;
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
const E = W.FRPG_WORKBOOK_RATES.exploring;
const F = W.FRPG_WORKBOOK_RATES.fishing;
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

const argv = process.argv.slice(2);
const alwaysCraft = argv.includes("--always-craft");

// Per-unit cost, in AP and Large Nets kept apart. Farm output costs neither.
const memo = new Map();
function unit(name, depth, seen) {
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
  else if (go && make && !alwaysCraft) best = (go.ap <= make.ap && go.nets <= make.nets) ? go : make;
  else best = make || go || { ap: 0, nets: 0, how: "unknown" };
  const out = { ...best, go, make };
  memo.set(key, out);
  return out;
}

const base = new Map();
const crafts = new Map();
const chose = [];
function need(name, qty, depth) {
  if (qty <= 0) return;
  const key = name.toLowerCase();
  const item = byName.get(key);
  const decision = unit(name, 0, new Set());
  if (farm.has(key) || decision.how !== "craft" || !item || depth > 12) {
    base.set(name, (base.get(name) || 0) + qty);
    if (decision.how === "go" && decision.make && Number.isFinite(decision.make.ap)) {
      chose.push({ name, qty, go: decision.go, make: decision.make });
    }
    return;
  }
  const c = qty / YIELD;
  crafts.set(name, (crafts.get(name) || 0) + c);
  for (const r of craft.get(item.id)) {
    const part = (byId.get(r.reqId) || {}).name;
    if (part) need(part, c * r.amt, depth + 1);
  }
}

const held = (W.FRPG_PERSONAL_TOWER || {}).masteries || {};
const goalFloors = new Map();
for (const row of W.FRPG_TOWER_FLOORS.floors || []) {
  for (const [tier, list, goal] of [["GM", row.gms || [], 100000], ["MM", row.mms || [], 1000000]]) {
    for (const e of list) if (!goalFloors.has(e.name)) goalFloors.set(e.name, { tier, goal, floor: row.floor });
  }
}
const goals = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a.startsWith("--")) continue;
  if (argv[i + 1] === "--mastery") {
    const m = goalFloors.get(a);
    if (!m) { console.log(`No mastery known for "${a}".`); process.exit(1); }
    goals.push({ name: a, qty: m.goal - (Number(held[a]) || 0), why: `${m.tier} T${m.floor}` });
    i += 1;
  } else if (argv[i + 1] && !Number.isNaN(Number(argv[i + 1]))) {
    goals.push({ name: a, qty: Number(argv[i + 1]), why: "asked for" });
    i += 1;
  }
}
if (!goals.length) { console.log("Give a goal, e.g.  node tools/cost.mjs \"Silk\" 50000"); process.exit(1); }

const fmt = (n) => Math.round(n).toLocaleString("en-US");
for (const g of goals) { console.log(`${g.name}: ${fmt(g.qty)}  (${g.why})`); need(g.name, g.qty, 0); }
console.log(alwaysCraft ? "\n[--always-craft: expanding every recipe, which is the WRONG way]\n" : "\n[craft versus go decided per item]\n");

let ap = 0; let nets = 0;
const rows = [...base.entries()].sort((a, b) => b[1] - a[1]);
console.log("item".padEnd(20) + "needed".padStart(12) + "   where                cost");
for (const [n, q] of rows) {
  const k = n.toLowerCase();
  const tag = noMail.has(k) ? "  [no trade]" : "";
  if (farm.has(k)) { console.log("  " + n.padEnd(20) + fmt(q).padStart(12) + "   your farm - days, not AP"); continue; }
  const s = spot.get(k);
  if (!s) { console.log("  " + n.padEnd(20) + fmt(q).padStart(12) + "   no source in the data" + tag); continue; }
  const c = q / s.rate;
  if (s.kind === "fish") nets += c; else ap += c;
  console.log("  " + n.padEnd(20) + fmt(q).padStart(12) + "   " + s.place.padEnd(19) + fmt(c) + (s.kind === "fish" ? " nets" : " AP") + tag);
}
console.log(`\n  ${fmt(ap)} AP and ${fmt(nets)} Large Nets if each line were farmed on its own.`);
if (chose.length) {
  console.log("\nGathered rather than crafted, because going is cheaper:");
  for (const c of chose.sort((a, b) => b.qty - a.qty).slice(0, 10)) {
    console.log(`  ${c.name.padEnd(20)} ${fmt(c.qty).padStart(10)}   ${fmt(c.qty * c.go.ap)} AP at ${c.go.spot.place}, against ${fmt(c.qty * c.make.ap)} AP to craft`);
  }
}
const cl = [...crafts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
if (cl.length) {
  console.log("\nCrafts:");
  for (const [n, c] of cl) console.log(`  ${n.padEnd(20)} ${fmt(c).padStart(11)} crafts  ->  ${fmt(c * YIELD)} made`);
}

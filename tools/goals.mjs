// Every open goal, with the ones that finish by themselves taken out.
//
// The mistake this exists to stop: adding a mastery's full remainder to demand
// when the item is already made in bulk on the way to something else. Steel
// Plate needs 852,250 more, and 1.86m get made building Engines and Machine
// Presses - so it contributes nothing and must not inflate Small Bolt.
//
// So: roll quests plus every open mastery, see which masteries are covered by
// that pass-through, drop those from the demand, and roll again. Repeat until
// the set stops moving. Dropping one lowers demand and can uncover another, so
// an uncovered mastery is put back, and the loop runs to a fixed point.
//
//   node tools/goals.mjs                    what you actually have to make
//   node tools/goals.mjs --floor 340
//   node tools/goals.mjs --item "Small Bolt"

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const file of ["data/data.js", "data/extra-items.js", "data/main-quests.js",
  "data/personal-quests.js", "data/personal-tower.js", "data/tower-floors.js",
  "data/workbook-rates.js", "data/player-facts.js"]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: file });
}
const W = ctx.window;
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const topFloor = Number(flag("--floor", (W.FRPG_PLAYER_FACTS || {}).goalFloor || 350));
const only = flag("--item", null);

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
const YIELD = 1.45;

const DONE = new Set((((W.FRPG_PERSONAL_QUESTS || {}).completed) || []).map((t) => String(t).toLowerCase()));
const questSteps = (W.FRPG_MAIN_QUESTS.quests || []).filter((s) => !DONE.has(String(s.title).toLowerCase()));

const held = W.FRPG_PERSONAL_TOWER.masteries || {};
const masteries = new Map();
for (const row of W.FRPG_TOWER_FLOORS.floors || []) {
  if (row.floor > topFloor) continue;
  for (const [tier, list, goal] of [["GM", row.gms || [], 100000], ["MM", row.mms || [], 1000000]]) {
    for (const e of list) {
      if (masteries.has(e.name)) continue;
      const cur = Number(held[e.name]) || 0;
      if (cur >= goal) continue;
      masteries.set(e.name, { name: e.name, left: goal - cur, cur, tier, floor: row.floor });
    }
  }
}

// Roll a set of goals down to every item, counting how many of each get MADE.
function made(activeNames) {
  const count = new Map();
  const add = (n, q) => count.set(n, (count.get(n) || 0) + q);
  const roll = (n, q, depth) => {
    if (q <= 0) return;
    add(n, q);
    const item = byName.get(n.toLowerCase());
    const rec = item && craft.get(item.id);
    if (!item || !rec || !rec.length || depth > 12 || cook.has(item.id)) return;
    const crafts = q / YIELD;
    for (const r of rec) {
      const part = (byId.get(r.reqId) || {}).name;
      if (part) roll(part, crafts * r.amt, depth + 1);
    }
  };
  for (const step of questSteps) for (const r of step.requirements || []) roll(r.item, r.quantity, 0);
  for (const name of activeNames) roll(name, masteries.get(name).left, 0);
  return count;
}

// Fixed point: a mastery that the rest of the plan already builds is not work.
let active = new Set(masteries.keys());
let count = made(active);
for (let pass = 0; pass < 25; pass += 1) {
  const next = new Set();
  for (const [name, m] of masteries) {
    const without = new Set([...active].filter((n) => n !== name));
    const passThrough = made(without).get(name) || 0;
    if (passThrough < m.left) next.add(name);
  }
  const same = next.size === active.size && [...next].every((n) => active.has(n));
  active = next;
  count = made(active);
  if (same) break;
}

const fmt = (n) => Math.round(n).toLocaleString("en-US");
const free = [...masteries.values()].filter((m) => !active.has(m.name));

if (only) {
  const n = items.find((i) => i.name.toLowerCase() === only.toLowerCase());
  const name = n ? n.name : only;
  console.log(`${name}: ${fmt(count.get(name) || 0)} get made across everything still open.`);
  const m = masteries.get(name);
  if (m) console.log(`  its ${m.tier} needs ${fmt(m.left)} more - ${active.has(name) ? "you must craft for it" : "covered on the way to other things"}`);
  process.exit(0);
}

console.log(`${questSteps.length} open quest steps, ${masteries.size} masteries owed to T${topFloor}.`);
console.log(`${free.length} of those masteries finish on their own. ${active.size} need work.\n`);
console.log("Finish by themselves - never craft for these:");
for (const m of free.sort((a, b) => b.left - a.left).slice(0, 18)) {
  console.log(`  ${m.name.padEnd(22)} ${m.tier} T${m.floor}  needs ${fmt(m.left)}, but ${fmt(count.get(m.name) || 0)} get made anyway`);
}
console.log(`\nReal work - these do NOT arrive on their own:`);
for (const m of [...active].map((n) => masteries.get(n)).sort((a, b) => b.left - a.left).slice(0, 22)) {
  console.log(`  ${m.name.padEnd(22)} ${m.tier} T${m.floor}  ${fmt(m.cur)} held, ${fmt(m.left)} left`);
}

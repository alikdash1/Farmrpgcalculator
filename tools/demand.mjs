// One demand graph for the whole account.
//
// Rolls every unfinished quest step AND every outstanding Tower mastery down
// to base items at the 1.45 craft yield, merges them, and files the result by
// place. A place costs its longest job across ALL goals at once, which is the
// whole point: the overlap is where the time is saved.
//
//   node tools/demand.mjs                 every open quest + masteries to T300
//   node tools/demand.mjs --floor 320     masteries up to a different floor
//   node tools/demand.mjs --line "Distant Illusions"   one line, still merged
//                                                      with mastery demand
//   node tools/demand.mjs --no-mastery    quests only
//   node tools/demand.mjs --json          machine-readable

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const file of [
  "data/data.js", "data/extra-items.js", "data/main-quests.js",
  "data/personal-quests.js", "data/personal-tower.js", "data/tower-floors.js",
  "data/workbook-rates.js", "data/tradeable.js",
]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: file });
}
const W = ctx.window;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] && !argv[at + 1].startsWith("--") ? argv[at + 1] : fallback;
};
const has = (name) => argv.includes(name);

const YIELD = 1.45;
const GM_GOAL = 100000;
const MM_GOAL = 1000000;
const topFloor = Number(flag("--floor", 300)) || 300;
const onlyLine = flag("--line", null);
const wantMastery = !has("--no-mastery");

const D = W.FRPG_DATA || {};
const items = ((D.items || {}).items) || [];
const byName = new Map(items.map((item) => [String(item.name).toLowerCase(), item]));
const byId = new Map(items.map((item) => [item.id, item]));
const craftRows = new Map();
for (const row of ((D.recipes || {}).craft || [])) {
  if (!craftRows.has(row.itemId)) craftRows.set(row.itemId, []);
  craftRows.get(row.itemId).push(row);
}
const cookIds = new Set(((D.recipes || {}).cook || []).map((row) => row.itemId));
const RATES = W.FRPG_WORKBOOK_RATES || {};
const NO_TRADE = new Set((((W.FRPG_TRADEABLE || {}).cannotMail) || []).map((n) => String(n).toLowerCase()));

// Best place per item, exploring preferred over fishing when both list it.
const bestPlace = new Map();
for (const [place, drops] of Object.entries(RATES.exploring || {})) {
  for (const [item, rate] of Object.entries(drops)) {
    const key = String(item).toLowerCase();
    if (!bestPlace.has(key) || bestPlace.get(key).rate < rate) bestPlace.set(key, { place, rate, kind: "explore" });
  }
}
for (const [place, drops] of Object.entries(RATES.fishing || {})) {
  for (const [item, rate] of Object.entries(drops)) {
    const key = String(item).toLowerCase();
    if (!bestPlace.has(key)) bestPlace.set(key, { place, rate, kind: "fish" });
  }
}

// ---- goals ---------------------------------------------------------------
const QUESTS = ((W.FRPG_MAIN_QUESTS || {}).quests) || [];
const DONE = new Set((((W.FRPG_PERSONAL_QUESTS || {}).completed) || []).map((t) => String(t).toLowerCase()));
const openSteps = QUESTS
  .filter((step) => !DONE.has(String(step.title).toLowerCase()))
  .filter((step) => !onlyLine || step.line === onlyLine);

const P = W.FRPG_PERSONAL_TOWER || {};
const held = P.masteries || {};
const masteryGoals = [];
if (wantMastery) {
  for (const row of ((W.FRPG_TOWER_FLOORS || {}).floors) || []) {
    if (row.floor > topFloor) continue;
    for (const [tier, list] of [["gm", row.gms || []], ["mm", row.mms || []]]) {
      for (const entry of list) {
        const goal = tier === "gm" ? GM_GOAL : MM_GOAL;
        const current = Number(held[entry.name]) || 0;
        if (current >= goal) continue;
        masteryGoals.push({ name: entry.name, floor: row.floor, tier, remaining: goal - current });
      }
    }
  }
}

// ---- roll-up -------------------------------------------------------------
const base = new Map();   // item -> { qty, goals:Set }
const note = (name, qty, goal) => {
  const key = String(name).toLowerCase();
  let row = base.get(key);
  if (!row) { row = { name, qty: 0, goals: new Set() }; base.set(key, row); }
  row.qty += qty;
  row.goals.add(goal);
};
const need = (name, qty, depth, goal) => {
  if (qty <= 0) return;
  const key = String(name).toLowerCase();
  const item = byName.get(key);
  const recipe = item && craftRows.get(item.id);
  if (!item || !recipe || !recipe.length || depth > 12 || cookIds.has(item.id)) {
    note(name, qty, goal);
    return;
  }
  const made = qty / YIELD;
  for (const row of recipe) {
    const part = (byId.get(row.reqId) || {}).name;
    if (part) need(part, made * row.amt, depth + 1, goal);
  }
};

for (const step of openSteps) {
  for (const row of step.requirements || []) need(row.item, row.quantity, 0, step.title);
}
// A mastery is a demand for the item itself, not for its recipe: crafting it
// is one route, gathering it is another, and costing.md picks between them.
for (const row of masteryGoals) note(row.name, row.remaining, `${row.tier.toUpperCase()} ${row.name} (T${row.floor})`);

// ---- file by place -------------------------------------------------------
const places = new Map();
const noSource = [];
for (const row of base.values()) {
  const spot = bestPlace.get(String(row.name).toLowerCase());
  if (!spot) { noSource.push(row); continue; }
  if (!places.has(spot.place)) places.set(spot.place, { place: spot.place, kind: spot.kind, rows: [], cost: 0 });
  const entry = places.get(spot.place);
  const cost = row.qty / spot.rate;
  entry.rows.push({ ...row, rate: spot.rate, cost });
  entry.cost = Math.max(entry.cost, cost);
}
for (const entry of places.values()) {
  entry.rows.sort((a, b) => b.cost - a.cost);
  entry.goals = new Set();
  for (const row of entry.rows) for (const goal of row.goals) entry.goals.add(goal);
  entry.perGoal = entry.cost / Math.max(1, entry.goals.size);
  const [first, second] = entry.rows;
  entry.hog = first && second && first.cost > second.cost * 3 ? { name: first.name, without: second.cost } : null;
}

const ranked = [...places.values()].sort((a, b) => a.perGoal - b.perGoal);
const fmt = (n) => Math.round(n).toLocaleString("en-US");

if (has("--json")) {
  console.log(JSON.stringify({
    openSteps: openSteps.length, masteryGoals: masteryGoals.length,
    places: ranked.map((entry) => ({
      place: entry.place, kind: entry.kind, cost: entry.cost,
      goals: entry.goals.size, perGoal: entry.perGoal, hog: entry.hog,
      rows: entry.rows.map((row) => ({ name: row.name, qty: row.qty, rate: row.rate, cost: row.cost, goals: [...row.goals], farmOnly: NO_TRADE.has(row.name.toLowerCase()) })),
    })),
    noSource: noSource.map((row) => ({ name: row.name, qty: row.qty })),
  }, null, 2));
} else {
  console.log(`${openSteps.length} open quest steps${onlyLine ? ` in ${onlyLine}` : ""}, ${masteryGoals.length} masteries owed up to T${topFloor}`);
  console.log(`${base.size} base items, ${ranked.length} places\n`);
  console.log("Places, cheapest per goal advanced first:\n");
  for (const entry of ranked) {
    const unit = entry.kind === "fish" ? "Large Nets" : "AP";
    console.log(`${entry.place}  ${fmt(entry.cost)} ${unit}  ·  ${entry.goals.size} goals  ·  ${fmt(entry.perGoal)} ${unit} per goal`);
    if (entry.hog) console.log(`   all of it ${entry.hog.name} — without it the trip is ${fmt(entry.hog.without)} ${unit}`);
    for (const row of entry.rows.slice(0, 6)) {
      const tag = NO_TRADE.has(row.name.toLowerCase()) ? " [farm only]" : "";
      console.log(`   ${row.name.padEnd(26)} ${fmt(row.qty).padStart(12)}  ${row === entry.rows[0] ? `${fmt(row.cost)} ${unit}` : "rides along"}${tag}  ${row.goals.size} goal${row.goals.size === 1 ? "" : "s"}`);
    }
    if (entry.rows.length > 6) console.log(`   … and ${entry.rows.length - 6} more here`);
    console.log("");
  }
  if (noSource.length) {
    console.log(`No place in the data (${noSource.length}): ` + noSource.sort((a, b) => b.qty - a.qty).slice(0, 20).map((row) => `${row.name} ${fmt(row.qty)}`).join(", "));
  }
}

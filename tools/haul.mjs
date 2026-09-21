// What a trip to one place actually brings home, and what to do with it.
//
// Every drop at that place, at the AP the trip costs, sorted into:
//   KEEP   - a quest still wants it
//   MASTER - an outstanding Grand or Mega Mastery wants it
//   CRAFT  - it feeds something a quest or mastery wants
//   SELL   - none of the above, with the silver it is worth
//
//   node tools/haul.mjs "Black Rock Canyon"
//   node tools/haul.mjs "Black Rock Canyon" --floor 350
//   node tools/haul.mjs --list

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
  "data/workbook-rates.js", "data/tradeable.js", "data/wishing-well.js",
  "data/player-facts.js",
]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: file });
}
const W = ctx.window;
const argv = process.argv.slice(2);
const has = (n) => argv.includes(n);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const place = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--floor");

const RATES = W.FRPG_WORKBOOK_RATES || {};
if (has("--list") || !place) {
  console.log("Places:", Object.keys(RATES.exploring || {}).join(", "));
  console.log("Fishing:", Object.keys(RATES.fishing || {}).join(", "));
  process.exit(0);
}

// What is already yours: the newest inventory capture, plus the contents of
// any container held in bulk, because a chest costs only a key to open.
const stock = new Map();
(() => {
  const dir = path.join(root, "raw", "account-captures");
  if (fs.existsSync(dir)) {
    const newest = fs.readdirSync(dir).filter((n) => /inventory.*\.json$/i.test(n)).sort().pop();
    if (newest) {
      try {
        const list = ((JSON.parse(fs.readFileSync(path.join(dir, newest), "utf8")).fields || {}).inventory) || [];
        for (const row of list) {
          const q = row && row.quantity && typeof row.quantity === "object" ? row.quantity.value : row && row.quantity;
          if (row && row.name && Number(q) > 0) stock.set(String(row.name).toLowerCase(), Number(q));
        }
      } catch (error) { /* a broken capture is the same as none */ }
    }
  }
  const held = ((W.FRPG_PLAYER_FACTS || {}).containersHeld) || {};
  const boxes = ((W.FRPG_CONTAINERS || {}).byName) || {};
  for (const [name, count] of Object.entries(held)) {
    for (const row of (boxes[name] || {}).payout || []) {
      if (!Number.isFinite(Number(row.min))) continue;
      const key = String(row.item).toLowerCase();
      stock.set(key, (stock.get(key) || 0) + Number(row.min) * count);
    }
  }
})();
const spare = (key) => stock.get(key) || 0;

const YIELD = 1.45;
const topFloor = Number(flag("--floor", (W.FRPG_PLAYER_FACTS || {}).goalFloor || 350));
const D = W.FRPG_DATA || {};
const items = ((D.items || {}).items) || [];
const byName = new Map(items.map((i) => [String(i.name).toLowerCase(), i]));
const byId = new Map(items.map((i) => [i.id, i]));
const craftRows = new Map();
for (const r of ((D.recipes || {}).craft || [])) {
  if (!craftRows.has(r.itemId)) craftRows.set(r.itemId, []);
  craftRows.get(r.itemId).push(r);
}
const cookIds = new Set(((D.recipes || {}).cook || []).map((r) => r.itemId));

// ---- what every open goal needs, rolled to base items -------------------
const QUESTS = ((W.FRPG_MAIN_QUESTS || {}).quests) || [];
const DONE = new Set((((W.FRPG_PERSONAL_QUESTS || {}).completed) || []).map((t) => String(t).toLowerCase()));
const questNeed = new Map();
const spent = new Map();
const feeds = new Map();          // base item -> Set of things it ends up in
const need = (name, qty, depth, top) => {
  if (qty <= 0) return;
  const key = String(name).toLowerCase();
  const item = byName.get(key);
  const recipe = item && craftRows.get(item.id);
  if (!item || !recipe || !recipe.length || depth > 12 || cookIds.has(item.id)) {
    const have = Math.max(0, spare(key) - (spent.get(key) || 0));
    if (have > 0) {
      const used = Math.min(have, qty);
      spent.set(key, (spent.get(key) || 0) + used);
      qty -= used;
      if (qty <= 0) return;
    }
    questNeed.set(key, (questNeed.get(key) || 0) + qty);
    if (depth > 0) (feeds.get(key) || feeds.set(key, new Set()).get(key)).add(top);
    return;
  }
  const made = qty / YIELD;
  for (const row of recipe) {
    const part = (byId.get(row.reqId) || {}).name;
    if (part) need(part, made * row.amt, depth + 1, depth === 0 ? item.name : top);
  }
};
for (const step of QUESTS) {
  if (DONE.has(String(step.title).toLowerCase())) continue;
  for (const row of step.requirements || []) need(row.item, row.quantity, 0, row.item);
}

// ---- outstanding masteries up to the goal floor -------------------------
const heldMast = ((W.FRPG_PERSONAL_TOWER || {}).masteries) || {};
const masteryLeft = new Map();
for (const row of ((W.FRPG_TOWER_FLOORS || {}).floors) || []) {
  if (row.floor > topFloor) continue;
  for (const [tier, list] of [["gm", row.gms || []], ["mm", row.mms || []]]) {
    const goal = tier === "gm" ? 100000 : 1000000;
    for (const entry of list) {
      const cur = Number(heldMast[entry.name]) || 0;
      if (cur >= goal) continue;
      const key = String(entry.name).toLowerCase();
      const left = Math.max(0, goal - cur - spare(key));
      if (left <= 0) continue;
      if (!masteryLeft.has(key) || masteryLeft.get(key).left < left) masteryLeft.set(key, { left, floor: row.floor, tier });
    }
  }
}

// ---- the trip -----------------------------------------------------------
const fishing = !!(RATES.fishing || {})[place] && !(RATES.exploring || {})[place];
const table = ((fishing ? RATES.fishing : RATES.exploring) || {})[place];
if (!table) { console.log(`No drop table for "${place}". Try --list.`); process.exit(1); }

// The trip is as long as the longest thing you still need here.
let trip = 0;
let driver = null;
for (const [item, rate] of Object.entries(table)) {
  const key = String(item).toLowerCase();
  const want = Math.max(questNeed.get(key) || 0, (masteryLeft.get(key) || {}).left || 0);
  if (want <= 0) continue;
  const cost = want / rate;
  if (cost > trip) { trip = cost; driver = { item, want, cost }; }
}
const unit = fishing ? "Large Nets" : "AP";
const fmt = (n) => Math.round(n).toLocaleString("en-US");

console.log(`\n${place} - ${fmt(trip)} ${unit}`);
if (driver) console.log(`set by ${driver.item}: ${fmt(driver.want)} at ${table[driver.item]} per ${fishing ? "net" : "AP"}\n`);

const rows = Object.entries(table).map(([item, rate]) => {
  const key = String(item).toLowerCase();
  const got = rate * trip;
  const quest = questNeed.get(key) || 0;
  const mast = (masteryLeft.get(key) || {}).left || 0;
  const info = byName.get(key) || {};
  return { item, got, quest, mast, mastFloor: (masteryLeft.get(key) || {}).floor, sell: info.sell || 0, into: [...(feeds.get(key) || [])].slice(0, 3) };
}).filter((r) => r.got >= 1).sort((a, b) => b.got - a.got);

const bucket = (r) => (r.quest > 0 ? "KEEP" : r.mast > 0 ? "MASTER" : r.into.length ? "CRAFT" : "SELL");
const pad = (s, n) => String(s).padEnd(n);
let sellTotal = 0;
for (const label of ["KEEP", "MASTER", "CRAFT", "SELL"]) {
  const list = rows.filter((r) => bucket(r) === label);
  if (!list.length) continue;
  const head = { KEEP: "KEEP - a quest still wants these", MASTER: "MASTER - an outstanding mastery wants these", CRAFT: "CRAFT - these feed something you need", SELL: "SELL or let it void - nothing needs these" }[label];
  console.log(`\n${head}`);
  for (const r of list.slice(0, 22)) {
    const got = fmt(r.got).padStart(12);
    let note = "";
    if (label === "KEEP") note = `quests want ${fmt(r.quest)}${r.got >= r.quest ? "  <- one trip covers it" : `  <- ${fmt(r.quest - r.got)} short`}`;
    else if (label === "MASTER") note = `${fmt(r.mast)} left on its T${r.mastFloor} mastery${r.got >= r.mast ? "  <- one trip finishes it" : ""}`;
    else if (label === "CRAFT") note = `goes into ${r.into.join(", ")}`;
    else { sellTotal += r.got * r.sell; note = r.sell ? `${fmt(r.sell)} silver each = ${fmt(r.got * r.sell)}` : "worth nothing"; }
    console.log(`  ${pad(r.item, 24)}${got}  ${note}`);
  }
  if (list.length > 22) console.log(`  ... and ${list.length - 22} more`);
}
if (sellTotal > 0) console.log(`\nSelling everything in that last group: ${fmt(sellTotal)} silver.`);

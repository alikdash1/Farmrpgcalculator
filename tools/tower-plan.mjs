// What stands between you and a Tower floor - the question asked most.
//
//   node tools/tower-plan.mjs --to 300
//   node tools/tower-plan.mjs --to 300 --pj plan          the owner's Pumpkin Juice plan (player-facts)
//   node tools/tower-plan.mjs --to 300 --pj "Salt=2,Water Lily=2,Red Trunk=1"
//   node tools/tower-plan.mjs --to 300 --include-free      also plan Hammer/Axe/Shovel
//   node tools/tower-plan.mjs --to 300 --json
//
// For every unfinished mastery from the floor you stand on to --to, in floor
// order: what is left (after Pumpkin Juice), what it costs on its own in AP or
// Large Nets, and the Steel and Steel Wire it eats. Then the part a person
// misses: the same places serve several masteries, so it merges every goal's
// gathering into shared trips and moves each item to whichever trip carries
// it most cheaply - which is how Salt Rock ends up riding along on the
// Whispering Creek feather trip instead of costing a second 250k AP trip.
//
// Reads live numbers through tools/prepare.mjs and floors through
// tools/tower.mjs. Mastery counts items made, so crafts made on the way to one
// goal count toward another; masteries that finish that way are flagged.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { towerFloors, currentFloor } from "./tower.mjs";
import { prepare } from "./prepare.mjs";
import { makeCoster, YIELD } from "./costing.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ["data/data.js", "data/extra-items.js", "data/personal-tower.js", "data/tower-floors.js",
  "data/workbook-rates.js", "data/player-facts.js", "data/tradeable.js"]) {
  const full = path.join(root, f);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: f });
}
const W = ctx.window;
const prep = prepare(W);
const facts = W.FRPG_PLAYER_FACTS || {};
const coster = makeCoster(W);

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log("node tools/tower-plan.mjs --to <floor> [--pj plan | --pj \"Salt=2,Water Lily=1\"] [--include-free] [--json]");
  process.exit(0);
}
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const to = Number(flag("--to", facts.goalFloor || 300));
const asJson = argv.includes("--json");
const includeFree = argv.includes("--include-free");
const fmt = (n) => Math.round(n).toLocaleString("en-US");

// Pumpkin Juice per mastery.
let pj = {};
const pjArg = flag("--pj", null);
if (pjArg === "plan") pj = { ...(facts.pumpkinJuicePlan || {}) };
else if (pjArg) for (const part of pjArg.split(",")) { const [k, v] = part.split("="); if (k && v) pj[k.trim()] = Number(v); }
const PJ_STEP = (facts.pumpkinJuice || {}).perJuice || 0.1;
const finishAt = (goal, n) => (n > 0 ? Math.ceil(goal / (1 + PJ_STEP * n)) : goal);

// ---- what is owed ----------------------------------------------------------
const held = W.FRPG_PERSONAL_TOWER.masteries || {};
const free = new Set(includeFree ? [] : (facts.treatAsFree || []));
const from = currentFloor(W);
const owed = [];
const skipped = [];
const seen = new Set();
for (const row of towerFloors(W, from)) {
  if (row.floor > to) continue;
  for (const [tier, list, goal] of [["GM", row.gms || [], 100000], ["MM", row.mms || [], 1000000]]) {
    for (const e of list) {
      if (seen.has(e.name)) continue;
      seen.add(e.name);
      const cur = Number(held[e.name]) || 0;
      const juice = tier === "MM" ? (pj[e.name] || 0) : 0;
      const target = finishAt(goal, juice);
      const left = Math.max(0, target - cur);
      if (left <= 0) continue;
      const m = { name: e.name, floor: row.floor, tier, goal, cur, juice, target, left };
      if (free.has(e.name)) skipped.push(m); else owed.push(m);
    }
  }
}

// ---- masteries that finish on the way to others ----------------------------
// A craft made for Red Trunk is a Red Dye made, so Red Dye's mastery moves.
function madeBy(list) {
  const count = new Map();
  for (const m of list) {
    const r = coster.roll(m.name, m.left);
    for (const [n, c] of r.crafts) if (n !== m.name) count.set(n, (count.get(n) || 0) + c * YIELD);
    for (const [n, q] of r.base) if (n !== m.name) count.set(n, (count.get(n) || 0) + q);
  }
  return count;
}
let active = owed.slice();
for (let pass = 0; pass < 10; pass += 1) {
  const next = active.filter((m) => (madeBy(active.filter((x) => x !== m)).get(m.name) || 0) < m.left);
  if (next.length === active.length) break;
  active = next;
}
const passThrough = owed.filter((m) => !active.includes(m));

// ---- each mastery on its own -----------------------------------------------
const steelRate = ((facts.buildings || {}).steelworks || {}).steelPerHour || null;
const wireRate = ((facts.buildings || {}).steelworks || {}).steelWirePerHour || null;
const demand = new Map();     // merged base items across every active goal
const servedBy = new Map();   // base item -> goals that want it
for (const m of active) {
  const r = coster.roll(m.name, m.left);
  const priced = coster.price(r.base);
  m.ap = priced.ap; m.nets = priced.nets;
  m.steel = r.base.get("Steel") || 0;
  m.wire = r.base.get("Steel Wire") || 0;
  const top = priced.lines.filter((l) => l.cost).sort((a, b) => b.cost - a.cost)[0];
  const crop = priced.lines.find((l) => l.crop);
  m.driver = top ? `${top.name} at ${top.spot.place}`
    : crop ? `a crop - ${fmt(crop.qty)} ${crop.name} from your ${Number(facts.farming?.cropPlots) || "known"}-plot field (grow-time schedule not modelled)`
    : (m.ap === 0 && m.nets === 0 ? "farm buildings and crafting only" : "-");
  m.unknown = priced.lines.filter((l) => l.unknown).map((l) => l.name);
  for (const [n, q] of r.base) {
    demand.set(n, (demand.get(n) || 0) + q);
    if (!servedBy.has(n)) servedBy.set(n, new Set());
    servedBy.get(n).add(m.name);
  }
}

// ---- shared trips ----------------------------------------------------------
// Each explored item goes to one place. A place costs its longest job; the
// rest of its table rides along. Start every item at its best rate, then move
// items to whichever place carries them more cheaply until nothing improves.
const E = coster.E;
function shareTrips(dem) {
  const want = [...dem].filter(([n]) => !coster.farm.has(n.toLowerCase()) && (coster.spot.get(n.toLowerCase()) || {}).kind === "explore");
  const placesFor = new Map(want.map(([n]) => [n, Object.keys(E).filter((p) => E[p][n] > 0)]));
  const assign = new Map(want.map(([n]) => [n, coster.spot.get(n.toLowerCase()).place]));
  const tripOf = (p, a) => Math.max(0, ...want.filter(([n]) => a.get(n) === p).map(([n, q]) => q / E[p][n]));
  const total = (a) => Object.keys(E).reduce((sum, p) => sum + tripOf(p, a), 0);
  let best = total(assign);
  for (let round = 0; round < 30; round += 1) {
    let moved = false;
    for (const [n] of want) {
      for (const p of placesFor.get(n)) {
        if (p === assign.get(n)) continue;
        const trial = new Map(assign); trial.set(n, p);
        const t = total(trial);
        if (t < best - 1) { assign.clear(); for (const [k, v] of trial) assign.set(k, v); best = t; moved = true; }
      }
    }
    if (!moved) break;
  }
  return { want, assign, tripOf, best };
}
function demandOf(list) {
  const dem = new Map();
  for (const m of list) for (const [n, q] of coster.roll(m.name, m.left).base) dem.set(n, (dem.get(n) || 0) + q);
  return dem;
}
const { want, assign, tripOf } = shareTrips(demand);
const trips = Object.keys(E).map((p) => {
  const items = want.filter(([n]) => assign.get(n) === p);
  if (!items.length) return null;
  const ap = tripOf(p, assign);
  const driver = items.map(([n, q]) => ({ n, ap: q / E[p][n] })).sort((a, b) => b.ap - a.ap)[0];
  const goals = new Set(items.flatMap(([n]) => [...(servedBy.get(n) || [])]));
  const riders = items.filter(([n]) => n !== driver.n).map(([n]) => n);
  return { place: p, ap, driver: driver.n, riders, goals: [...goals] };
}).filter(Boolean).sort((a, b) => b.ap - a.ap);
const fishNeeds = [...demand].filter(([n]) => (coster.spot.get(n.toLowerCase()) || {}).kind === "fish");

const rateFacts = facts.perHour || {};
const sawmillHickory = ((facts.buildings || {}).sawmill || {}).hickoryAlmostAlwaysOn;
function buildingHours(dem) {
  const out = new Map();
  for (const [item, r] of Object.entries(rateFacts)) {
    const qty = dem.get(item) || 0;
    if (qty) out.set(item, qty / (r.rate * (r.hickory && sawmillHickory ? 2.2 : 1)));
  }
  return out;
}

// ---- Steel and Steel Wire --------------------------------------------------
const steel = active.reduce((s, m) => s + m.steel, 0);
const wire = active.reduce((s, m) => s + m.wire, 0);
const carbonAPk = ((facts.apPerThousand || {})["Carbon Sphere"] || {}).buy || null;
const glass = coster.spot.get("glass orb");
const craftSteel = (qty) => {
  const crafts = qty / YIELD;
  return { carbon: crafts, glassOrb: crafts, ap: (carbonAPk ? crafts * carbonAPk / 1000 : 0) + (glass ? crafts / glass.rate : 0) };
};
const craftWire = (qty) => {
  const crafts = qty / YIELD;
  return { carbon: crafts, ap: carbonAPk ? crafts * carbonAPk / 1000 : 0 };
};

// ---- Pumpkin Juice value ---------------------------------------------------
// Rerun the whole shared plan with one more juice on each mastery. Judging a
// juice by its own mastery's AP overstates it whenever the item rides on a
// trip that something else already sets - a third juice on Salt "saved" 27k
// that way and really saved about 6k, because the feather trip is as long.
// Building time is counted too: a juice on Fancy Guitar saves little AP but
// over a week of Steelworks.
const baseShared = shareTrips(demand).best;
const baseHours = buildingHours(demand);
const pjValue = active.filter((m) => m.tier === "MM" && m.left > 0).map((m) => {
  const nextLeft = Math.max(0, finishAt(m.goal, m.juice + 1) - m.cur);
  const trial = active.map((x) => (x === m ? { ...x, left: nextLeft } : x));
  const dem = demandOf(trial);
  const hours = buildingHours(dem);
  let hoursSaved = 0; let hoursItem = null;
  for (const [item, h] of baseHours) {
    const d = h - (hours.get(item) || 0);
    if (d > hoursSaved) { hoursSaved = d; hoursItem = item; }
  }
  return { name: m.name, juice: m.juice, saves: baseShared - shareTrips(dem).best, hoursSaved, hoursItem };
}).sort((a, b) => (b.saves + b.hoursSaved * 100) - (a.saves + a.hoursSaved * 100));
// The same plan with no juice at all, for "what is the juice worth".
const noJuice = Object.keys(pj).length
  ? shareTrips(demandOf(active.map((m) => ({ ...m, left: Math.max(0, m.goal - m.cur) })))).best
  : null;

if (asJson) {
  console.log(JSON.stringify({ account: prep.source, from, to, pj, owed: active, passThrough, skipped, trips, steel, wire }, null, 1));
  process.exit(0);
}

// ---- report ----------------------------------------------------------------
console.log(`T${from} -> T${to}: ${active.length} masteries to work, ${passThrough.length} finish on the way, ${skipped.length} left out as free.`);
if (Object.keys(pj).length) console.log(`Pumpkin Juice: ${Object.entries(pj).map(([k, v]) => `${k} x${v}`).join(", ")}` +
  ((facts.pumpkinJuice || {}).stackingConfirmed ? "" : "  (two or more stacking is ASSUMED, not confirmed)"));
console.log("");
console.log("floor  mastery              left        AP alone   Steel      Steel Wire   sets the cost");
let last = null;
for (const m of active.slice().sort((a, b) => a.floor - b.floor || b.left - a.left)) {
  const fl = m.floor === last ? "     " : `T${m.floor} `;
  last = m.floor;
  const apTxt = m.nets ? `${fmt(m.ap)} +${fmt(m.nets)} LN` : fmt(m.ap);
  console.log(`${fl}  ${(m.name + (m.juice ? ` (${m.juice} PJ)` : "")).padEnd(20)} ${fmt(m.left).padStart(9)}  ${apTxt.padStart(12)}   ${(m.steel ? fmt(m.steel) : "-").padStart(9)}  ${(m.wire ? fmt(m.wire) : "-").padStart(10)}   ${m.driver}${m.unknown.length ? `  [no source: ${m.unknown.join(", ")}]` : ""}`);
}
if (passThrough.length) console.log(`\nFinish on the way, do not plan: ${passThrough.map((m) => `${m.name} (T${m.floor})`).join(", ")}`);
if (skipped.length) console.log(`Left out as free (owner): ${skipped.map((m) => `${m.name} ${fmt(m.left)}`).join(", ")}`);

const alone = active.reduce((s, m) => s + (m.ap || 0), 0);
const shared = trips.reduce((s, t) => s + t.ap, 0);
console.log(`\nAP if each mastery were farmed on its own: ${fmt(alone)}`);
console.log(`AP with shared trips:                      ${fmt(shared)}`);
if (noJuice != null) console.log(`  (without the Pumpkin Juice it would be ${fmt(noJuice)} - the juice saves ${fmt(noJuice - shared)})`);
for (const t of trips.slice(0, 8)) {
  console.log(`  ${t.place.padEnd(18)} ${fmt(t.ap).padStart(9)} AP   set by ${t.driver}${t.riders.length ? `; brings ${t.riders.slice(0, 5).join(", ")}${t.riders.length > 5 ? "..." : ""}` : ""}`);
}
if (fishNeeds.length) console.log(`  fishing: ${fishNeeds.map(([n, q]) => `${n} ${fmt(q)}`).join(", ")} - priced in Large Nets above, not in AP`);

// Everything a building makes is time, not AP. Report it in hours so the
// wall shows up - Steel Wire at 2,000 an hour is a month on its own.
const rates = facts.perHour || {};
const hickory = ((facts.buildings || {}).sawmill || {}).hickoryAlmostAlwaysOn;
const fromBuildings = Object.entries(rates).map(([item, r]) => {
  const qty = demand.get(item) || 0;
  const perHour = r.rate * (r.hickory && hickory ? 2.2 : 1);
  return qty ? { item, qty, building: r.building, perHour, hours: qty / perHour } : null;
}).filter(Boolean).sort((a, b) => b.hours - a.hours);
if (fromBuildings.length) {
  console.log("\nFrom your buildings (time, not AP):");
  for (const b of fromBuildings) {
    const flagWall = b.hours > 24 * 7 ? "   <- a wall" : "";
    console.log(`  ${b.item.padEnd(11)} ${fmt(b.qty).padStart(11)}   ${b.building} ${fmt(b.perHour)}/h = ${fmt(b.hours)} h (${(b.hours / 24).toFixed(1)} days non-stop)${flagWall}`);
  }
  const oak = fromBuildings.find((b) => b.item === "Oak");
  if (oak) console.log("  Oak is also on the Whispering Creek trip above, so the Sawmill only has to cover what that trip does not.");
}
void steelRate; void wireRate;
const cs = craftSteel(steel); const cw = craftWire(wire);
if (carbonAPk) console.log(`  Craft it all instead: ${fmt(cs.carbon + cw.carbon)} Carbon Sphere (${carbonAPk} AP/k) + ${fmt(cs.glassOrb)} Glass Orb${glass ? ` (${glass.place})` : ""} = about ${fmt(cs.ap + cw.ap)} AP. Iron and Stone are farm-made.`);

if (pjValue.length) {
  const pjHeld = ((W.FRPG_LIVE_ACCOUNT || {}).inventory || {})["Pumpkin Juice"];
  console.log(`\nOne more Pumpkin Juice would save${pjHeld != null ? ` (you hold ${fmt(pjHeld)})` : ""}:`);
  for (const p of pjValue.slice(0, 6)) {
    const days = p.hoursSaved >= 12 ? ` and ${(p.hoursSaved / 24).toFixed(1)} days of ${p.hoursItem}` : "";
    console.log(`  ${p.name.padEnd(20)} ${fmt(p.saves).padStart(8)} AP${days}${p.juice ? `  (already ${p.juice})` : ""}`);
  }
  console.log("  (measured on the whole shared plan, not the mastery alone)");
}
const ap = (facts.schedule || {}).apPerDay;
console.log(ap ? `\nAt ${fmt(ap)} AP a day the shared plan is ${fmt(shared / ap)} days.` : "\nAP per day is unknown - ask before saying this fits in a month.");
console.log(`\nInventory cap ${fmt(((facts.inventoryCap || {}).approx) || 0)}: nothing above is bankable. Gather and craft at the same time, and fill every stack before sleeping.`);

// Brings in every Farm RPG item and location that data/data.js is missing.
//
// data.js was built from a 2023-era item export, so it predates Sinking Swamp,
// the dye/twine/scarf chains, the mining release and the newer events. That is
// why ~420 items could not be found in the Calculate search. Buddy's Almanac
// (buddy.farm) publishes the game's item records as static JSON, so this pulls
// them, and `build` turns them into data/extra-items.js.
//
//   node tools/import-buddy.mjs fetch   # downloads into raw/buddy-<date>/
//   node tools/import-buddy.mjs build   # writes data/extra-items.js
//
// Drop rates: the owner's shared workbook (data/workbook-rates.js) is the
// authority for drops per Arnold Palmer and per Large Net, and app.js already
// reads it by location name. Buddy supplies only what the workbook cannot:
// explores per drop (what an Apple Cider buys) and catches per drop, in the
// same unit as data.js's logged rates (Salt Rock at Whispering Creek is 36.75
// on Buddy against 36.44 in data.js).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUDDY = "https://buddy.farm";
const stamp = process.env.BUDDY_DATE || new Date().toISOString().slice(0, 10);
// One file per page while downloading (gitignored, so a rerun resumes), then
// combined into raw/buddy-items-<date>.json and raw/buddy-locations-<date>.json.
const outDir = path.join(root, "raw", ".buddy-cache-" + stamp);
const combined = (kind) => path.join(root, "raw", `buddy-${kind}-${stamp}.json`);

function loadGlobals(files) {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
  return ctx;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "LanternLedger-importer (static planner; one-off import)" } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (error) {
      if (attempt === 3) throw new Error(url + ": " + error.message);
      await sleep(1000 * attempt);
    }
  }
}

async function fetchAll() {
  const { FRPG_DATA } = loadGlobals(["data/data.js"]);
  const haveItems = new Set(FRPG_DATA.items.items.map((item) => item.name.toLowerCase()));
  const haveLocations = new Set(FRPG_DATA.sources.locations.map((loc) => loc.name.toLowerCase()));
  fs.mkdirSync(path.join(outDir, "items"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "locations"), { recursive: true });

  const search = await getJson(BUDDY + "/search.json");
  fs.writeFileSync(path.join(outDir, "search.json"), JSON.stringify(search));
  const items = search.filter((entry) => /^\/i\//.test(entry.href || "") && !haveItems.has(String(entry.name).toLowerCase()));
  // Buddy names the exploring side of the swamp "Sinking Swamp Exploring";
  // the game and the workbook call both sides "Sinking Swamp".
  const locations = search.filter((entry) => /^\/l\//.test(entry.href || "")
    && !haveLocations.has(String(entry.name).replace(/ Exploring$/, "").toLowerCase()));
  console.log(`missing: ${items.length} items, ${locations.length} locations`);

  const jobs = [
    ...items.map((entry) => ["items", entry]),
    ...locations.map((entry) => ["locations", entry]),
  ];
  let done = 0;
  const failures = [];
  async function worker() {
    while (jobs.length) {
      const [kind, entry] = jobs.shift();
      const slug = entry.href.split("/").filter(Boolean).pop();
      const file = path.join(outDir, kind, slug + ".json");
      if (!fs.existsSync(file)) {
        try {
          const data = await getJson(`${BUDDY}/page-data${entry.href}page-data.json`);
          if (data) fs.writeFileSync(file, JSON.stringify(data));
          else failures.push(entry.name + " (404)");
        } catch (error) {
          failures.push(entry.name + " (" + error.message + ")");
        }
        await sleep(120);
      }
      if (++done % 50 === 0) console.log(`  ${done} fetched`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`done: ${done}, failures: ${failures.length}`);
  if (failures.length) console.log(failures.join("\n"));
  for (const kind of ["items", "locations"]) {
    const dir = path.join(outDir, kind);
    const pages = Object.fromEntries(fs.readdirSync(dir).sort().map((file) =>
      [file.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).result.data.farmrpg]));
    fs.writeFileSync(combined(kind), JSON.stringify({ source: BUDDY, fetched: stamp, pages }));
    console.log(`wrote ${path.relative(root, combined(kind))} (${Object.keys(pages).length} pages)`);
  }
}

// Buddy lists every rate four ways (Iron Depot on/off, Runecube on/off) and
// fishing twice more (nets or by hand). data.js's logged rates are the plain
// ones, so those are what come across: no Iron Depot, no Runecube. For fishing,
// data.js keeps net rates in `drops` and hand-cast rates in `fish` (Farm Pond
// Catfish: 39.5 and 44.8 there, 40.6 and 41.6 on Buddy).
const plainExplore = (variants) => (variants || []).find((v) => !v.ironDepot && !v.runecube);
const plainFishing = (variants, byHand) => (variants || []).find((v) => v.manualFishing === byHand && !v.runecube);
const locationName = (name) => String(name).replace(/ Exploring$/, "");

function latest(kind) {
  const files = fs.readdirSync(path.join(root, "raw")).filter((file) => new RegExp(`^buddy-${kind}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(file)).sort();
  if (!files.length) throw new Error(`no raw/buddy-${kind}-<date>.json; run fetch first`);
  return JSON.parse(fs.readFileSync(path.join(root, "raw", files.pop()), "utf8"));
}

function build() {
  const { FRPG_DATA } = loadGlobals(["data/data.js"]);
  const idByName = new Map(FRPG_DATA.items.items.map((item) => [item.name.toLowerCase(), item.id]));
  const takenIds = new Set(FRPG_DATA.items.items.map((item) => item.id));
  const itemsRaw = latest("items");
  const locationsRaw = latest("locations");
  const records = Object.values(itemsRaw.pages).map((page) => (page.items || [])[0]).filter(Boolean)
    .sort((a, b) => a.id - b.id);

  const items = [], craft = [], cook = [], renamed = [];
  for (const r of records) {
    if (idByName.has(r.name.toLowerCase())) continue;
    if (takenIds.has(r.id)) {
      // The game renamed these (Spring Basket -> Spring Basket 01); data.js
      // already has them under the old name and id.
      renamed.push(`${r.name} (data.js: ${FRPG_DATA.items.items.find((item) => item.id === r.id).name})`);
      continue;
    }
    items.push({
      id: r.id, name: r.name, sell: null, buy: r.canBuy && r.buyPrice > 0 ? r.buyPrice : null,
      craftPrice: null, craftLevel: r.craftingLevel || null, cookLevel: r.cookingLevel || null,
      growMin: r.baseYieldMinutes || 0, farmLevel: null, xp: null, img: r.image, type: r.type,
      event: false, active: true,
    });
    idByName.set(r.name.toLowerCase(), r.id);
  }
  const addedIds = new Set(items.map((item) => item.id));
  for (const r of records) {
    if (!addedIds.has(r.id)) continue;
    for (const part of r.recipeItems || []) {
      const reqId = idByName.get(part.item.name.toLowerCase()) ?? part.item.id;
      if (r.canCook && !r.canCraft) {
        cook.push({ itemId: r.id, itemName: r.name, level: r.cookingLevel || null, timeSec: null, reqName: part.item.name, reqId, amt: part.quantity });
      } else {
        craft.push({ itemId: r.id, reqId, amt: part.quantity });
      }
    }
  }

  const locations = new Map();
  const locationFor = (name, type) => {
    const key = type + ":" + locationName(name);
    if (!locations.has(key)) {
      locations.set(key, { name: locationName(name), type, mode: type === "fishing" ? "fishes" : "explores", drops: {}, fish: {} });
    }
    return locations.get(key);
  };
  const put = (table, itemName, rate) => {
    if (rate > 0 && !table[itemName]) table[itemName] = { denom: Number(rate.toFixed(4)), src: "logged" };
  };
  // Whole tables for the places data.js never had.
  for (const page of Object.values(locationsRaw.pages)) {
    const loc = (page.locations || [])[0];
    if (!loc || !["explore", "fishing"].includes(loc.type)) continue;
    if (loc.type === "explore") {
      const plain = plainExplore(loc.dropRates);
      if (!plain) continue;
      const target = locationFor(loc.name, "explore");
      for (const row of plain.items) put(target.drops, row.item.name, row.rate);
    } else {
      const nets = plainFishing(loc.dropRates, false), hand = plainFishing(loc.dropRates, true);
      if (!nets && !hand) continue;
      const target = locationFor(loc.name, "fishing");
      for (const row of (nets || {}).items || []) put(target.drops, row.item.name, row.rate);
      for (const row of (hand || {}).items || []) put(target.fish, row.item.name, row.rate);
    }
  }
  // New items that also drop at places data.js already has (Pink Jelly at
  // Vast Ocean, Apple Ant at Highland Hills). The merge only fills gaps.
  for (const r of records) {
    if (!addedIds.has(r.id)) continue;
    const seen = new Map();
    for (const drop of r.dropRatesItems || []) {
      const loc = drop.dropRates.location;
      if (!loc || !["explore", "fishing"].includes(loc.type)) continue;
      const key = loc.type + ":" + locationName(loc.name);
      if (!seen.has(key)) seen.set(key, { loc, variants: [] });
      seen.get(key).variants.push(Object.assign({ items: [{ rate: drop.rate, item: r }] }, drop.dropRates));
    }
    for (const { loc, variants } of seen.values()) {
      const target = locationFor(loc.name, loc.type);
      if (loc.type === "explore") {
        const plain = plainExplore(variants);
        if (plain) put(target.drops, r.name, plain.items[0].rate);
      } else {
        const nets = plainFishing(variants, false), hand = plainFishing(variants, true);
        if (nets) put(target.drops, r.name, nets.items[0].rate);
        if (hand) put(target.fish, r.name, hand.items[0].rate);
      }
    }
  }

  const meta = {
    source: "Buddy's Almanac (buddy.farm)", fetched: itemsRaw.fetched, items: items.length,
    craftRows: craft.length, cookRows: cook.length, locations: locations.size, renamedInGame: renamed,
    rates: "Plain logged rates: no Iron Depot, no Runecube. Drops per Arnold Palmer and per Large Net still come from data/workbook-rates.js.",
  };
  const lines = (rows) => "[\n" + rows.map((row) => "    " + JSON.stringify(row)).join(",\n") + "\n  ]";
  const out = `// Generated by tools/import-buddy.mjs build on ${stamp}. Do not edit by hand; rerun the tool.
//
// Every item and location Farm RPG has that data/data.js is missing — Sinking
// Swamp, Gary's Crushroom, the dye and twine chains, the mining release and the
// newer events — from Buddy's Almanac. It merges itself into FRPG_DATA, so it
// must load straight after data/data.js. It only ever adds: an item, recipe or
// rate that data.js already has is left exactly as it was.
window.FRPG_EXTRA_DATA = {
  meta: ${JSON.stringify(meta)},
  items: ${lines(items)},
  craft: ${lines(craft)},
  cook: ${lines(cook)},
  locations: ${lines([...locations.values()])}
};
(function () {
  const D = window.FRPG_DATA, X = window.FRPG_EXTRA_DATA;
  if (!D || !X) return;
  const names = new Set(D.items.items.map((item) => item.name.toLowerCase()));
  const ids = new Set(D.items.items.map((item) => item.id));
  const added = new Set();
  for (const item of X.items) {
    if (names.has(item.name.toLowerCase()) || ids.has(item.id)) continue;
    D.items.items.push(item);
    names.add(item.name.toLowerCase());
    ids.add(item.id);
    added.add(item.id);
  }
  for (const row of X.craft) if (added.has(row.itemId)) D.recipes.craft.push(row);
  for (const row of X.cook) if (added.has(row.itemId)) D.recipes.cook.push(row);
  for (const loc of X.locations) {
    const existing = D.sources.locations.find((other) => other.name === loc.name && other.type === loc.type);
    if (!existing) { D.sources.locations.push(loc); continue; }
    for (const table of ["drops", "fish"]) {
      existing[table] = existing[table] || {};
      for (const [name, rate] of Object.entries(loc[table] || {})) if (!existing[table][name]) existing[table][name] = rate;
    }
  }
  D.meta = Object.assign({}, D.meta, { extra: X.meta });
})();
`;
  fs.writeFileSync(path.join(root, "data", "extra-items.js"), out);
  console.log(`data/extra-items.js: ${items.length} items, ${craft.length} craft rows, ${cook.length} cook rows, ${locations.size} location tables`);
  for (const loc of locations.values()) console.log(`  ${loc.type} ${loc.name}: ${Object.keys(loc.drops).length} drops, ${Object.keys(loc.fish).length} by hand`);
  if (renamed.length) console.log("left under their data.js names:", renamed.join("; "));
}

const command = process.argv[2];
if (command === "fetch") await fetchAll();
else if (command === "build") build();
else {
  console.log("usage: node tools/import-buddy.mjs fetch|build");
  process.exitCode = 1;
}

// Where do the items Calculate cannot route actually come from?
//
//   node tools/build-item-sources.mjs fetch   # buddy.farm pages for every unrouted item
//   node tools/build-item-sources.mjs build   # writes data/item-sources.js
//
// Calculate costs an item from drop tables, recipes, shops and trade prices.
// Hundreds of items have none of those - pet items, mining drops, chest
// contents, quest and event rewards - and Calculate used to say only "No
// reliable way to get this one is recorded yet". Buddy's Almanac publishes the
// game's own record of every way to get an item, so this keeps a short list of
// those ways for each unrouted item, and Calculate shows it.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUDDY = "https://buddy.farm";
const stamp = process.env.BUDDY_DATE || new Date().toISOString().slice(0, 10);
const cacheDir = path.join(root, "raw", ".buddy-cache-" + stamp, "items");
const combinedFile = path.join(root, "raw", `buddy-sources-${stamp}.json`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Every item the planner cannot cost today, computed the way Calculate does.
function unrouted() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="((?:data|js)\/[^"?]+)/g)].map((m) => m[1])
    .filter((src) => (src.startsWith("data/") && src !== "data/item-sources.js") || src === "js/containers.js" || src === "js/engine.js");
  const ctx = { console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, location: { search: "", href: "" } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const src of scripts) {
    try { vm.runInContext(fs.readFileSync(path.join(root, src), "utf8"), ctx, { filename: src }); } catch { /* optional data */ }
  }
  const D = ctx.FRPG_DATA, E = ctx.Engine, I = E.buildIndex(D), mods = E.computeMods([], ctx.FRPG_CONSTANTS);
  return D.items.items.filter((item) => {
    if (!item.active) return false;
    const s = E.sourcesFor(I, item.id, 1, mods, {});
    return !(s.crop || s.fish.length || s.drops.length || s.vendor || s.market || I.craftByItem.has(item.id) || I.cookByItem.has(item.id));
  }).map((item) => item.name);
}

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function fetchPages() {
  fs.mkdirSync(cacheDir, { recursive: true });
  const names = unrouted();
  const search = await getJson(BUDDY + "/search.json");
  const hrefByName = new Map(search.filter((e) => /^\/i\//.test(e.href || "")).map((e) => [String(e.name).toLowerCase(), e.href]));
  const jobs = names.map((name) => [name, hrefByName.get(name.toLowerCase())]);
  const missing = jobs.filter(([, href]) => !href).map(([name]) => name);
  const queue = jobs.filter(([, href]) => href);
  console.log(`${names.length} unrouted items; ${queue.length} on buddy.farm, ${missing.length} not listed there`);
  let done = 0;
  const failures = [];
  async function worker() {
    while (queue.length) {
      const [name, href] = queue.shift();
      const file = path.join(cacheDir, href.split("/").filter(Boolean).pop() + ".json");
      if (!fs.existsSync(file)) {
        try {
          const data = await getJson(`${BUDDY}/page-data${href}page-data.json`);
          if (data) fs.writeFileSync(file, JSON.stringify(data.result.data.farmrpg));
          else failures.push(name + " (404)");
        } catch (error) { failures.push(name + " (" + error.message + ")"); }
        await sleep(120);
      }
      if (++done % 100 === 0) console.log(`  ${done} fetched`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (failures.length) console.log("failures:\n" + failures.join("\n"));
  const pages = {};
  for (const [name, href] of jobs) {
    if (!href) continue;
    const file = path.join(cacheDir, href.split("/").filter(Boolean).pop() + ".json");
    if (fs.existsSync(file)) pages[name] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  fs.writeFileSync(combinedFile, JSON.stringify({ source: BUDDY, fetched: stamp, notOnBuddy: missing, pages }));
  console.log(`wrote ${path.relative(root, combinedFile)} (${Object.keys(pages).length} pages)`);
}

const command = process.argv[2];
if (command === "fetch") await fetchPages();
else if (command === "build") await (await import("./item-sources-build.mjs")).build(root);
else { console.log("usage: node tools/build-item-sources.mjs fetch|build"); process.exit(1); }

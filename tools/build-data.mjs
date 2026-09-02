import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "..".repeat(1) ? dirname(dirname(fileURLToPath(import.meta.url))) : ".";
const raw = (f) => JSON.parse(readFileSync(join(ROOT, "raw", f), "utf8").replace(/^\uFEFF/, ""));
const out = (f, obj) => {
  writeFileSync(join(ROOT, "data", f), JSON.stringify(obj));
  console.log(`wrote data/${f} (${(JSON.stringify(obj).length / 1024).toFixed(0)} KB)`);
};

// ---------- items + craft recipes (etl2 primary) ----------
const etl = raw("items-etl2.json");
const etlItems = etl.items;
const etlRecipes = etl.recipes;

const items = [];
const nameToId = new Map();
for (const it of etlItems) {
  const rec = {
    id: it.id,
    name: it.name,
    sell: it.can_sell ? Number(it.sell_price) || 0 : null,
    buy: it.can_buy ? Number(it.buy_price) || 0 : null,
    craftPrice: it.craftable ? Number(it.craft_price) || 0 : null,
    craftLevel: it.craftable ? Number(it.crafting_level) || 0 : null,
    cookLevel: it.can_cook ? Number(it.cooking_level) || 0 : null,
    growMin: Number(it.yield_minutes) || 0,
    farmLevel: Number(it.farming_level) || 0,
    xp: Number(it.xp_value) || 0,
    img: it.img || "",
    type: it.type || "",
    event: !!it.event,
    active: it.active !== 0,
  };
  items.push(rec);
  nameToId.set(rec.name.toLowerCase(), rec.id);
}

const craftRecipes = []; // {itemId, reqId, amt}
for (const r of etlRecipes) {
  craftRecipes.push({ itemId: r.item_id, reqId: r.req_id, amt: r.req_amt });
}

// ---------- cooking (ext, name-based -> ids) ----------
const cookingMeta = raw("cooking_recipes.json").value ?? raw("cooking_recipes.json");
const cookRows = raw("cooking_recipe_items.json");
const cookInputsByRecipe = new Map();
for (const row of cookRows) {
  if (!cookInputsByRecipe.has(row.recipe_name)) cookInputsByRecipe.set(row.recipe_name, []);
  cookInputsByRecipe.get(row.recipe_name).push({ name: row.input_name, amt: row.quantity });
}
const cookRecipes = []; // {itemId, reqName, reqId|null, amt}
for (const meta of cookingMeta) {
  const resultId = nameToId.get(meta.item_name.toLowerCase());
  const inputs = cookInputsByRecipe.get(meta.item_name) ?? [];
  for (const inp of inputs) {
    cookRecipes.push({
      itemId: resultId ?? null,
      itemName: meta.item_name,
      level: meta.level,
      timeSec: meta.time,
      reqName: inp.name,
      reqId: nameToId.get(inp.name.toLowerCase()) ?? null,
      amt: inp.amt,
    });
  }
}

// ---------- locations + drop rates ----------
const locations = raw("locations.json");
const dropRates = raw("drop_rates.json"); // [{location, mode, drop_rates{item: 1-in-N}, iron_depot_rates, manual_fish_rates}]
const rateByKey = new Map();
for (const d of dropRates) rateByKey.set(d.location, d);

let overrides = {};
if (existsSync(join(ROOT, "data", "drop_overrides.json"))) {
  overrides = JSON.parse(readFileSync(join(ROOT, "data", "drop_overrides.json"), "utf8").replace(String.fromCharCode(0xFEFF), ""));
}

const locsOut = [];
for (const loc of locations) {
  const dr = rateByKey.get(loc.name);
  const drops = {};
  const addRate = (itemName, denom, src) => {
    if (!Number.isFinite(denom) || denom <= 0) return;
    const ov = overrides?.[loc.name]?.[itemName];
    drops[itemName] =
      ov != null
        ? { denom: ov, src: "override" }
        : { denom, src };
  };
  for (const [k, v] of Object.entries(dr?.drop_rates ?? {})) addRate(k, v, "logged");
  for (const itemName of loc.items ?? []) {
    if (!drops[itemName]) {
      const ov = overrides?.[loc.name]?.[itemName];
      if (ov != null) addRate(itemName, ov, "override");
      else drops[itemName] = { denom: null, src: "unknown" };
    }
  }
  const fishRates = dr?.manual_fish_rates ?? {};
  const fish = {};
  for (const [k, v] of Object.entries(fishRates)) {
    const ov = overrides?.[loc.name]?.[k];
    fish[k] = ov != null ? { denom: ov, src: "override" } : { denom: v, src: "logged" };
  }
  if ((loc.type === "explore" && Object.keys(drops).length) || (loc.items ?? []).length) {
    locsOut.push({
      name: loc.name,
      type: loc.type,
      mode: dr?.mode ?? (loc.type === "fish" ? "fishes" : "explores"),
      drops,
      fish,
    });
  }
}

// ---------- market (pricecheck site) ----------
const mk = raw("market-pricecheck.json");
const parseRange = (s) => {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/([\d.]+)(?:\s*-\s*([\d.]+))?/);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  return { lo, hi, mid: (lo + hi) / 2 };
};
const market = {
  config: mk.configuration ?? {},
  items: {},
};
for (const it of mk.items ?? []) {
  market.items[it.name] = {
    gold: parseRange(it.gold),
    ap: parseRange(it.ap),
    oj: parseRange(it.oj),
    updated: it.last_updated ?? null,
    raw: { gold: it.gold ?? "", ap: it.ap ?? "", oj: it.oj ?? "" },
  };
}

out("items.json", { _meta: { source: "farmrpg-etl2", fetched: new Date().toISOString() }, items });
out("recipes.json", {
  _meta: { craftSource: "farmrpg-etl2", cookSource: "farmrpg-ext (partial, 2023)" },
  craft: craftRecipes,
  cook: cookRecipes,
});
out("sources.json", { _meta: { logged: "farmrpg-ext drop_rates (2023)", note: "src: override|logged|unknown" }, locations: locsOut });
out("market.json", { _meta: { source: "farmrpg-pricecheck.free.nf/prices2.json" }, ...market });

// ---------- single-file browser bundle (works from file:// and any static host) ----------
const effects = JSON.parse(readFileSync(join(ROOT, "data", "effects.json"), "utf8"));
const constants = JSON.parse(readFileSync(join(ROOT, "data", "constants.json"), "utf8"));
const progression = existsSync(join(ROOT, "data", "progression.json"))
  ? JSON.parse(readFileSync(join(ROOT, "data", "progression.json"), "utf8").replace(/^\uFEFF/, ""))
  : { _meta: {}, items: {}, routeRules: {}, locationNotes: {} };
let overridesJs = {};
if (existsSync(join(ROOT, "data", "drop_overrides.json"))) {
  overridesJs = JSON.parse(
    readFileSync(join(ROOT, "data", "drop_overrides.json"), "utf8").replace(/^\uFEFF/, "")
  );
}
const bundle = [
  "// AUTO-GENERATED by tools/build-data.mjs - do not edit",
  "window.FRPG_DATA = " + JSON.stringify({
    items: { items },
    recipes: { craft: craftRecipes, cook: cookRecipes },
    sources: { locations: locsOut },
    market,
    meta: {
      itemsSource: "farmrpg-etl2 (2026-07)",
      loggedRates: "farmrpg-ext logs (2023)",
      marketSource: "farmrpg-pricecheck.free.nf",
      generatedAt: new Date().toISOString(),
    },
  }) + ";",
  "window.FRPG_EFFECTS = " + JSON.stringify(effects) + ";",
  "window.FRPG_CONSTANTS = " + JSON.stringify(constants) + ";",
  "window.FRPG_PROGRESSION = " + JSON.stringify(progression) + ";",
  "window.FRPG_OVERRIDES = " + JSON.stringify(overridesJs) + ";",
].join("\n");
writeFileSync(join(ROOT, "data", "data.js"), bundle);
console.log(`wrote data/data.js (${(bundle.length / 1024).toFixed(0)} KB)`);



// Second half of tools/build-item-sources.mjs: turns the downloaded buddy.farm
// pages into data/item-sources.js - a few short lines per item saying every way
// the game hands it out, and whether any of them can be repeated.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const range = (values) => {
  const v = values.filter((x) => Number.isFinite(x)).map((x) => Math.round(x));
  if (!v.length) return "";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
};
const list = (names, max = 4) => names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max} more`;
const uniq = (a) => [...new Set(a)];

export async function build(root, unrouted) {
  const files = fs.readdirSync(path.join(root, "raw")).filter((f) => /^buddy-sources-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error("no raw/buddy-sources-<date>.json; run fetch first");
  const raw = JSON.parse(fs.readFileSync(path.join(root, "raw", files.at(-1)), "utf8"));

  // The owner's shared workbook has per-AP and per-Large-Net rates for a few
  // items no drop log covers (Honey, Small Gear...). Same units as Places.
  const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "data/workbook-rates.js"), "utf8"), ctx);
  const wb = ctx.FRPG_WORKBOOK_RATES;
  const workbook = new Map();
  for (const [section, unit] of [["exploring", "Arnold Palmer"], ["fishing", "Large Net"]]) {
    for (const [place, items] of Object.entries(wb[section] || {})) {
      for (const [name, rate] of Object.entries(items)) {
        if (!(rate > 0)) continue;
        if (!workbook.has(name)) workbook.set(name, []);
        workbook.get(name).push(`${place}: about ${rate >= 1 ? rate.toFixed(1) : rate.toPrecision(2)} per ${unit}`);
      }
    }
  }

  const out = {};
  const also = {};
  for (const [name, page] of Object.entries(raw.pages)) {
    const it = (page.items || [])[0];
    if (!it) continue;
    const lines = [];
    // Lines Calculate already turns into a route (a drop rate at a place) are
    // kept apart, so an item it can cost only lists the OTHER ways.
    const routed = [];
    let repeat = false;

    // Gathering: mining, fishing, exploring, and harvest drops from seeds.
    const byPlace = new Map();
    const bySeed = new Map();
    let frozenOnly = true;
    for (const d of it.dropRatesItems || []) {
      const r = d.dropRates || {};
      if (r.location) {
        const key = `${r.location.type || "place"}|${r.location.name}`;
        if (!byPlace.has(key)) byPlace.set(key, []);
        if (!r.runecube && !r.manualFishing && !r.ironDepot) byPlace.get(key).push({ rate: d.rate, frozen: !!r.frozen });
        if (!r.frozen) frozenOnly = false;
      } else if (r.seed) {
        if (!bySeed.has(r.seed.name)) bySeed.set(r.seed.name, []);
        bySeed.get(r.seed.name).push(d.rate);
      }
    }
    const isFrozenItem = /^Frozen /.test(name);
    for (const [key, rows] of byPlace) {
      const [type, place] = key.split("|");
      if (type === "mining") {
        lines.push(`Mining at ${place}`);
      } else if (isFrozenItem) {
        lines.push(`Fishing at ${place} while the lakes are frozen (winter event)`);
      } else {
        const unit = type === "fishing" ? "catches" : "explores";
        const rates = range(rows.filter((x) => !x.frozen).map((x) => x.rate));
        const line = `${type === "fishing" ? "Fishing" : "Exploring"} at ${place}${rates ? `: about 1 per ${rates} ${unit}` : ""}`;
        lines.push(line);
        routed.push(line);
      }
      repeat = repeat || !isFrozenItem;
    }
    for (const [seed, rates] of bySeed) {
      // About one per harvest is just growing it (Mushroom from Mushroom Spores).
      lines.push(Math.max(...rates) < 1.5 ? `Grows from ${seed}` : `Harvest drop from ${seed.replace(/ Seeds$/, "")}: about 1 per ${range(rates)} harvests`);
      repeat = true;
    }
    for (const row of workbook.get(name) || []) { lines.push(row); routed.push(row); repeat = true; }

    for (const p of it.manualProductions || []) {
      lines.push(`${p.lineOne}${p.lineTwo && p.lineTwo !== "Building" ? ` (${p.lineTwo})` : ""}${p.value ? `, ${String(p.value).toLowerCase()}` : ""}`);
      repeat = true;
    }
    if ((it.petItems || []).length) {
      lines.push("Pets: " + list(uniq(it.petItems.map((p) => `${p.pet.name} (level ${p.level})`))));
      repeat = true;
    }
    if ((it.wishingWellOutputItems || []).length) {
      lines.push("Wishing Well: throw in " + list(uniq(it.wishingWellOutputItems.map((w) => w.inputItem.name))));
      repeat = true;
    }
    if ((it.exchangeCenterOutputs || []).length) {
      lines.push("Exchange Center: " + list(uniq(it.exchangeCenterOutputs.map((e) => `${fmt(e.inputQuantity)} ${e.inputItem.name} for ${fmt(e.outputQuantity)}`)), 2) + " (when it is offered)");
      repeat = true;
    }
    if ((it.templeRewardItems || []).length) {
      lines.push("Temple: " + list(uniq(it.templeRewardItems.map((t) => `${fmt(t.templeReward.inputQuantity)} ${t.templeReward.inputItem.name}`)), 2));
      repeat = true;
    }
    if ((it.locksmithOutputItems || []).length) {
      lines.push("Inside " + list(uniq(it.locksmithOutputItems.map((c) => c.item.name))));
    }
    if ((it.cardsTrades || []).length) lines.push("Card trades at the Locksmith");
    if (it.canBuy && it.buyPrice > 0) { lines.push(`Shop: ${fmt(it.buyPrice)} silver`); repeat = true; }

    // One-time sources.
    const once = [];
    const quests = (it.rewardForQuests || []).length;
    if (quests) once.push(`${quests} quest reward${quests === 1 ? "" : "s"}`);
    const tower = (it.towerRewards || []).length;
    if (tower) once.push(`Tower floor${tower === 1 ? "" : "s"} ${list(uniq(it.towerRewards.map((t) => String(t.level))), 3)}`);
    if ((it.npcRewards || []).length) once.push("friendship rewards from " + list(uniq(it.npcRewards.map((n) => n.npc.name)), 3));
    if ((it.communityCenterOutputs || []).length) once.push("Community Center goals");
    if ((it.skillLevelRewards || []).length) once.push("skill level rewards");
    if ((it.quizRewards || []).length) once.push("quizzes");
    if ((it.passwordItems || []).length) once.push("passwords");
    if (once.length) lines.push("Once only: " + once.join(", "));

    if (unrouted && !unrouted.has(name)) {
      const other = lines.filter((line) => !routed.includes(line));
      if (other.length) also[name] = other;
      continue;
    }
    if (!lines.length) lines.push("No way to get it is listed - an old event or retired item");
    out[name] = { repeat, lines };
  }
  for (const name of raw.notOnBuddy || []) out[name] = { repeat: false, lines: ["Not listed anywhere we read - an old event or retired item"] };

  const body = `// Every way the game hands out an item Calculate cannot cost from drop tables,
// recipes, shops or trade prices. Generated by tools/build-item-sources.mjs from
// buddy.farm (${raw.fetched}) and data/workbook-rates.js - do not hand-edit.
// \`repeat\` is false when every source is one-time (quests, Tower, events).
// \`also\` is for items Calculate can cost: the other ways the game hands them out.
window.FRPG_ITEM_SOURCES = ${JSON.stringify({ source: "buddy.farm", fetched: raw.fetched, items: out, also })};
`;
  fs.writeFileSync(path.join(root, "data/item-sources.js"), body);
  const repeatable = Object.values(out).filter((v) => v.repeat).length;
  console.log(`wrote data/item-sources.js: ${Object.keys(out).length} unrouted items (${repeatable} repeatable), ${Object.keys(also).length} with other ways`);
}

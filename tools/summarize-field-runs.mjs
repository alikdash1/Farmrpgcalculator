import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
const output = process.argv[3];
if (!input) {
  console.error("Usage: node tools/summarize-field-runs.mjs <field-runs.json> [field-rates.json]");
  process.exit(1);
}

const source = JSON.parse(readFileSync(input, "utf8").replace(/^\uFEFF/, ""));
const groups = new Map();
for (const run of source.runs || []) {
  const actions = Number(run.actions || 0);
  const used = Number(run.consumablesUsed || 0);
  if (!(actions > 0) || !(used > 0)) continue;
  const meals = [...(run.meals || [])].sort().join(" + ") || "none";
  for (const [item, rawQty] of Object.entries(run.drops || {})) {
    const qty = Number(rawQty || 0);
    if (qty < 0) continue;
    const key = [run.mode, run.location, run.method, meals, run.profile || "unspecified", item].join("|");
    if (!groups.has(key)) groups.set(key, {
      mode: run.mode,
      location: run.location,
      method: run.method,
      meals,
      profile: run.profile || "unspecified",
      item,
      runs: 0,
      actions: 0,
      consumablesUsed: 0,
      quantity: 0,
    });
    const group = groups.get(key);
    group.runs += 1;
    group.actions += actions;
    group.consumablesUsed += used;
    group.quantity += qty;
  }
}

const rates = [...groups.values()].map((group) => {
  const dropsPerAction = group.quantity / group.actions;
  const dropsPerConsumable = group.quantity / group.consumablesUsed;
  const actionsPerDrop = group.quantity > 0 ? group.actions / group.quantity : null;
  const relative95 = group.quantity > 0 ? 1.96 / Math.sqrt(group.quantity) : null;
  return {
    ...group,
    dropsPerAction,
    dropsPerConsumable,
    actionsPerDrop,
    approximate95Range: relative95 == null ? null : {
      lowDropsPerAction: Math.max(0, dropsPerAction * (1 - relative95)),
      highDropsPerAction: dropsPerAction * (1 + relative95),
    },
  };
}).sort((a, b) => a.location.localeCompare(b.location) || a.item.localeCompare(b.item));

const result = {
  schema: "farmrpg-field-rates-v1",
  generatedAt: new Date().toISOString(),
  warning: "The 95% range is a quick Poisson approximation, not a guarantee. Keep distinct perks and meals in separate groups.",
  rates,
};
const json = JSON.stringify(result, null, 2);
if (output) {
  writeFileSync(output, json);
  console.log(`wrote ${output} (${rates.length} measured item rates)`);
} else {
  console.log(json);
}

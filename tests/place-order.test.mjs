// Every place the app knows about must have a real in-game position. A place
// that falls through to the "unrecognised" bucket still shows up, but at the
// bottom - which is exactly the alphabetical-order mistake this list fixed.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data/data.js", "data/workbook-rates.js", "data/place-order.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const W = ctx.window;
const ORDER = W.FRPG_PLACE_ORDER;

test("every place the app lists has an in-game position", () => {
  const missing = [];
  for (const loc of W.FRPG_DATA.sources.locations) {
    if (loc.type !== "explore" && loc.type !== "fishing") continue;
    if (ORDER.rank(loc.type, loc.name) >= 2000) missing.push(loc.type + ": " + loc.name);
  }
  for (const [mode, table] of [["explore", W.FRPG_WORKBOOK_RATES.exploring], ["fishing", W.FRPG_WORKBOOK_RATES.fishing]]) {
    for (const name of Object.keys(table || {})) {
      if (ORDER.rank(mode, name) >= 2000) missing.push(mode + ": " + name);
    }
  }
  assert.deepEqual(missing, [], "add these to data/place-order.js in their in-game position");
});

test("the game's order, not the alphabet", () => {
  const r = (mode, name) => ORDER.rank(mode, name);
  assert.ok(r("explore", "Small Cave") < r("explore", "Black Rock Canyon"));
  assert.ok(r("explore", "Jundland Desert") < r("explore", "Sinking Swamp"));
  assert.ok(r("fishing", "Small Pond") < r("fishing", "Glacier Lake"));
  assert.ok(r("explore", "Sinking Swamp") < r("explore", "Haunted House"), "event places follow the permanent ones");
});

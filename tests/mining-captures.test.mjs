import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({ window: {} });
for (const file of ["data/new-items.js", "data/location-intel.js", "data/mining-capture-items.js"]) {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, "utf8"), context, { filename: file });
}

test("current Mining captures map every visible drop to a standalone card", () => {
  const { FRPG_NEW_ITEMS: catalog, FRPG_LOCATION_INTEL: intel } = context.window;
  const cards = new Set(catalog.items.map(item => item.name));
  const captured = intel.mining.mines.slice(0, 5).flatMap(mine => mine.items);
  assert.equal(captured.filter(name => !cards.has(name)).length, 0);
  for (const name of captured) {
    assert.ok(intel.itemSources[name].some(source => source.type === "mining"));
  }
  assert.equal(intel.mining.mines.find(mine => mine.name === "Spring Cave").unknownSlots, 0);
});

test("corrected mine assignments do not regress to the old community map", () => {
  const sources = context.window.FRPG_LOCATION_INTEL.itemSources;
  const mines = name => sources[name].filter(source => source.type === "mining").map(source => source.location).join("|");
  assert.equal(mines("Bone Fragments"), "Spring Cave");
  assert.equal(mines("Lapis Lazuli"), "Highland Hollow");
  assert.equal(mines("Pyredrop"), "Sol Grotto");
  assert.ok(mines("Runestone 27").includes("Ember Caverns"));
  assert.ok(mines("Fenrir's Coin").includes("Fenrir's Den"));
});



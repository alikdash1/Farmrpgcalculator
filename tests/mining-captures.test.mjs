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



test("one mine reads in about a screen, not four", () => {
  const source = fs.readFileSync(new URL("../mining-page.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../mining.css", import.meta.url), "utf8");
  // Each drop nested its crafts, and those nested theirs, so the same recipe
  // appeared several times and Spring Cave ran to 3.44 screens. Drops are a
  // chip grid at the top; the crafts they reach are one de-duplicated grid.
  assert.match(source, /const crafts = \[\];/);
  assert.match(source, /if \(!name \|\| drops\.has\(name\) \|\| seen\.has\(name\)\) return;/);
  assert.match(source, /What it drops/);
  assert.match(source, /What those drops make/);
  assert.match(css, /\.mine-crafts \{[\s\S]*?grid-template-columns: repeat\(auto-fill/);
  // The nested "goes into" block is what made it long; it is gone.
  assert.doesNotMatch(source, /mine-onward/);
});

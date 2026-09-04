import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

function helper() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of [
    "data/data.js",
    "data/location-intel.js",
    "data/tower-floors.js",
    "data/new-items.js",
    "data/item-art.js",
    "item-art.js",
  ]) vm.runInContext(read(file), context);
  return { art: context.window.FRPG_ITEM_ART_HELPER, W: context.window };
}

// Several data files ship their own artwork. When the shared lookup only read
// data/items.js those pictures were dropped and the tile showed a bare letter,
// even though a working URL sat in the same file. That happened twice — once
// for the Tower's T300-T340 requirements, once for the whole mining catalogue.
test("every picture the player can see resolves to a URL", () => {
  const { art, W } = helper();

  const towerItems = W.FRPG_TOWER_FLOORS.floors
    .flatMap((floor) => [...floor.gms, ...floor.mms])
    .map((row) => row.name);
  assert.deepEqual([...new Set(towerItems)].filter((name) => !art.urlFor(name)), []);

  const mineItems = W.FRPG_LOCATION_INTEL.mining.mines.flatMap((mine) => mine.items);
  assert.deepEqual([...new Set(mineItems)].filter((name) => !art.urlFor(name)), []);

  const catalog = W.FRPG_NEW_ITEMS;
  const connected = Array.isArray(catalog.connected) ? catalog.connected : Object.values(catalog.connected || {});
  const catalogNames = [...catalog.items, ...connected].map((row) => row.name);
  assert.deepEqual([...new Set(catalogNames)].filter((name) => !art.urlFor(name)), []);
});

test("the lookup prefers the canonical dataset and never draws currency", () => {
  const { art, W } = helper();
  const peppers = W.FRPG_DATA.items.items.find((item) => item.name === "Peppers");
  assert.equal(art.urlFor("Peppers"), `https://farmrpg.com${peppers.img}`);
  assert.equal(art.urlFor("Refined Esperium"), "https://farmrpg.com/img/items/esperiumore.png");
  assert.equal(art.urlFor("Yellow Bag"), "https://farmrpg.com/img/items/yellowbag.png");

  // Silver is the game's currency; it gets no picture on any page.
  assert.equal(art.urlFor("Silver"), "");
  assert.equal(art.isCurrency("silver"), true);

  // Names are matched case- and whitespace-insensitively, and a path that is
  // already absolute is left alone rather than being prefixed twice.
  assert.equal(art.urlFor("  yellow bag "), art.urlFor("Yellow Bag"));
  assert.ok(!art.urlFor("Refined Esperium").includes("farmrpg.comhttps"));
  assert.equal(art.urlFor("Not A Real Item"), "");
});

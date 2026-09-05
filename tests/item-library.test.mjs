import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

function load() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of [
    "data/data.js", "data/item-art.js", "data/item-library.js",
    "data/new-items.js", "data/tower-floors.js", "data/location-intel.js", "item-art.js",
  ]) vm.runInContext(read(file), context);
  return context.window;
}

// The planner kept discovering missing pictures one item at a time. The whole
// item list is loaded now, so that stops being a recurring bug.
test("the complete item library is loaded and every path points at real art", () => {
  const W = load();
  const library = W.FRPG_ITEM_LIBRARY;
  assert.ok(library.count >= 1400, "the library holds the full item list");
  assert.equal(Object.keys(library.art).length, library.count);
  for (const [name, path] of Object.entries(library.art)) {
    assert.match(path, /^\/img\/items\/[A-Za-z0-9_.-]+$/, `${name} has a clean image path`);
  }
  assert.match(read("index.html"), /<script src="data\/item-library\.js/);
});

test("the items that were showing as blanks now resolve", () => {
  const art = load().FRPG_ITEM_ART_HELPER;
  for (const name of [
    "Amber Mire Bloom", "Ant Apple", "Apple Ant", "Apple Ant Buddy Doll",
    "Apple Buddy Doll", "Apple Slice", "Amethyst Necklace", "Ancient Rune",
  ]) assert.match(art.urlFor(name), /^https:\/\/farmrpg\.com\/img\/items\//, name);

  // Silver is currency and still gets nothing.
  assert.equal(art.urlFor("Silver"), "");
});

test("a complete item list is what tells an item from a line of prose", () => {
  const art = load().FRPG_ITEM_ART_HELPER;
  for (const name of ["Amber Mire Bloom", "Apple Slice", "3-leaf Clover"]) {
    assert.equal(art.isKnownItem(name), true, `${name} is a real item`);
  }
  for (const name of ["Almost transparent", "and it gets everywhere", "A chill fish", "A fastener"]) {
    assert.equal(art.isKnownItem(name), false, `${name} is description text`);
  }
});

test("an item's own name decides its artwork; fallbackName only fills a gap", () => {
  const app = read("app.js");
  // Read the other way round, a Setup card looked up its building ("Iron
  // Depot") instead of the item it produces ("Iron"), and drew a letter.
  assert.match(app, /const name = \(item && item\.name\) \|\| fallbackName \|\| "";/);
  // And every call that can pass a null item now passes the name with it.
  assert.match(app, /itemImg\(dropItem, "drop-art", drop\.name\)/);
  assert.match(app, /itemImg\(item, "drop-art", entry\.itemName\)/);
  assert.match(app, /itemImg\(item, "drop-art", reward\.name\)/);
  assert.match(app, /itemImg\(item, "drop-art", effect\.name\)/);
});

test("capture text that is not an item never renders as one", () => {
  const app = read("app.js");
  // gather-model.js filtered the gather lists; the Account tab rendered the
  // same description rows as masteries, consumables and active effects.
  assert.match(app, /const isRealItem = \(name\)/);
  assert.match(app, /ART\.isKnownItem\(text\)/);
  for (const list of ["snapshot.inventory", "snapshot.masteries", "snapshot.activeEffects"]) {
    assert.ok(app.includes(list) && app.includes("isRealItem"), `${list} is filtered`);
  }
  // And a description cannot reach the working inventory either.
  assert.match(app, /if \(!isRealItem\(entry\.name\)\) continue;/);
});

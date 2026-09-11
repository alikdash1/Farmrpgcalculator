import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Engine = require("../engine.js");
const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

function load(files) {
  const context = {};
  context.window = context;
  vm.createContext(context);
  for (const file of files) vm.runInContext(read(file), context, { filename: file });
  return context;
}

const W = load(["data/data.js", "data/extra-items.js", "data/tower-floors.js", "data/workbook-rates.js"]);
const base = load(["data/data.js"]).FRPG_DATA;
const D = W.FRPG_DATA;
const index = Engine.buildIndex(D);
const idOf = (name) => index.idByName.get(name.toLowerCase());
const bare = Engine.computeMods([], {});

test("every Tower requirement can be found in the Calculate search", () => {
  const missing = [];
  for (const floor of W.FRPG_TOWER_FLOORS.floors) {
    for (const row of [...floor.gms, ...floor.mms]) if (idOf(row.name) == null) missing.push(`T${floor.floor} ${row.name}`);
  }
  assert.deepEqual(missing, []);
});

test("the merge adds items without duplicating a name or an id", () => {
  const names = D.items.items.map((item) => item.name.toLowerCase());
  const ids = D.items.items.map((item) => item.id);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(D.items.items.length > base.items.items.length + 400);
});

test("new crafts carry their recipes", () => {
  const recipe = (name) => Object.fromEntries((index.craftByItem.get(idOf(name)) || [])
    .map((row) => [index.itemsById.get(row.reqId).name, row.amt]));
  assert.deepEqual(recipe("Acid Extract"), { "Glass Bottle": 1, "Horned Beetle": 3, "Pestle and Mortar": 1 });
  assert.deepEqual(recipe("Pinecone Bird Feeder"), { "Corn Seeds": 2, "Twine": 4, "Pine Cone": 4, "Sunflower Seeds": 2, "Acorn Butter": 1 });
  assert.deepEqual(recipe("Crown of Clover"), { "3-leaf Clover": 20, "4-leaf Clover": 2, "Steel Wire": 1 });
});

test("Sinking Swamp is an exploring and a fishing location under one name", () => {
  // Joined to a string: arrays built inside the vm context fail a strict
  // deepEqual against this realm's arrays even when identical.
  const sides = D.sources.locations.filter((loc) => loc.name === "Sinking Swamp").map((loc) => loc.type).sort().join(",");
  assert.equal(sides, "explore,fishing");
  // Co-drops read this map, and only exploring routes ask it.
  assert.equal(index.locationsByName.get("Sinking Swamp").type, "explore");
  const bamboo = Engine.sourcesFor(index, idOf("Bamboo"), 1000, bare, {});
  assert.ok(bamboo.drops.some((drop) => drop.location === "Sinking Swamp" && drop.explores > 0));
  const goldRing = Engine.sourcesFor(index, idOf("Gold Ring"), 1000, bare, {});
  assert.ok(goldRing.fish.some((fish) => fish.location === "Sinking Swamp" && fish.catches > 0));
});

test("the sheet's Sinking Swamp rates are found under the imported item names", () => {
  // app.js reads drops per Arnold Palmer / Large Net by exact item name.
  const exploring = W.FRPG_WORKBOOK_RATES.exploring["Sinking Swamp"];
  const fishing = W.FRPG_WORKBOOK_RATES.fishing["Sinking Swamp"];
  for (const name of ["Bamboo", "Swamp Thistle", "Scrap Cloth", "Mudcap", "Glowshroom", "Mist Lily", "Shadow Bloom", "Amber Mire Bloom"]) {
    assert.ok(idOf(name) != null, name);
    assert.ok(exploring[name] > 0, name + " per AP");
  }
  for (const name of ["Gold Ring", "Tin Can", "Slimeback", "Blubberfish"]) {
    assert.ok(idOf(name) != null, name);
    assert.ok(fishing[name] > 0, name + " per Large Net");
  }
});

test("the merge never overwrites anything data.js already had", () => {
  for (const loc of base.sources.locations) {
    const merged = D.sources.locations.find((other) => other.name === loc.name && other.type === loc.type);
    for (const table of ["drops", "fish"]) {
      for (const [name, rate] of Object.entries(loc[table] || {})) assert.equal(JSON.stringify(merged[table][name]), JSON.stringify(rate), `${loc.name} ${name}`);
    }
  }
  assert.equal(D.recipes.craft.length - base.recipes.craft.length, W.FRPG_EXTRA_DATA.craft.length);
});

test("a swamp craft resolves all the way down to swamp drops", () => {
  const tree = Engine.resolveTree(index, idOf("Bamboo Chair"), 1000, bare, 0, [], {});
  const leaves = [...Engine.flattenLeaves(tree).values()].map((leaf) => leaf.name);
  assert.ok(leaves.includes("Bamboo"));
  assert.ok(leaves.includes("Scrap Cloth"), "Basic Pillow -> Cloth -> Scrap Cloth");
  assert.ok(!leaves.some((name) => name.startsWith("?")), "no unresolved ingredients");
});

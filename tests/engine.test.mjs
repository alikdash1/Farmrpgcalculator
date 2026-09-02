import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Engine = require("../engine.js");
const load = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const data = { items: load("items.json"), recipes: load("recipes.json"), sources: load("sources.json"), market: load("market.json") };
const effects = load("effects.json").effects;
const consts = load("constants.json");
const index = Engine.buildIndex(data);
const mods = Engine.computeMods(effects, consts);
const RED_TRUNK = 760;

test("Red Trunk item facts remain available", () => {
  const item = index.itemsById.get(RED_TRUNK);
  assert.equal(item.name, "Red Trunk");
  assert.equal(item.craftPrice, 7500);
  assert.equal(item.sell, 200000);
});

test("endgame permanent profile uses real drink and net units", () => {
  assert.ok(Math.abs(mods.craftCostOff - 0.7) < 1e-9);
  assert.ok(Math.abs(mods.craftYield - 1.45) < 1e-9);
  assert.ok(Math.abs(mods.saleMult - 1.4) < 1e-9);
  assert.equal(mods.nets.fnCatch, 15);
  assert.equal(mods.nets.lnCatch, 500);
  assert.equal(mods.drinks.ciderRolls, 1250);
  assert.equal(mods.drinks.lemonadeItems, 20);
  assert.equal(mods.drinks.apItems, 500);
  assert.ok(Math.abs(mods.exploreStaminaPer - 0.8) < 1e-9);
  assert.equal(mods.ironDepot, true);
});

test("480 minute crop becomes 48 minutes", () => {
  assert.ok(Math.abs(Engine.growthMinutes(480, mods) - 48) < 1e-6);
});

test("Red Trunk resource saver reduces root crafts", () => {
  const tree = Engine.resolveTree(index, RED_TRUNK, 1450, mods, 0, [], consts);
  assert.equal(tree.craftsNeeded, 1000);
});

test("make-or-buy stop keeps Leather as an acquired intermediate", () => {
  const tree = Engine.resolveTree(index, RED_TRUNK, 1000, mods, 0, [], consts, new Set([110]));
  const leaves = Engine.flattenLeaves(tree);
  assert.ok(leaves.has(110));
  assert.equal(leaves.get(110).name, "Leather");
  assert.equal(leaves.get(110).stopped, true);
  assert.equal(leaves.has(109), false);
});

test("Leather 5 AP/k is five AP per thousand, not per item", () => {
  const quote = Engine.marketQuote(index, "Leather", 1000);
  assert.equal(quote.best.currency, "ap");
  assert.equal(quote.best.amount, 5);
  assert.ok(Math.abs(quote.best.goldEq - 0.225) < 1e-9);
});

test("market translation also honors /k units", () => {
  const leaves = new Map([[110, { id: 110, name: "Leather", total: 1000 }]]);
  const translated = Engine.translateCosts(leaves, index, mods, consts);
  assert.equal(translated.market.ap, 5);
});

test("fishing denominators produce catches and are not indexed twice", () => {
  const id = index.idByName.get("blue catfish");
  const sources = Engine.sourcesFor(index, id, 100, mods, consts).fish;
  const crystal = sources.filter((source) => source.location === "Crystal River");
  assert.equal(crystal.length, 1);
  assert.equal(crystal[0].catches, Math.ceil(100 * crystal[0].denom));
});

test("craft silver applies the active discount", () => {
  const tree = Engine.resolveTree(index, RED_TRUNK, 1000, mods, 0, [], consts);
  const silver = Engine.treeCraftSilver(tree, mods);
  const rootMinimum = 7500 * Math.ceil(1000 / 1.45) * 0.3;
  assert.ok(silver >= rootMinimum * 0.999999);
});

test("cycle detection does not hang", () => {
  const custom = Engine.buildIndex(data);
  custom.itemsById.set(999999, { id: 999999, name: "Loop A" });
  custom.itemsById.set(999998, { id: 999998, name: "Loop B" });
  custom.craftByItem.set(999999, [{ itemId: 999999, reqId: 999998, amt: 1 }]);
  custom.craftByItem.set(999998, [{ itemId: 999998, reqId: 999999, amt: 1 }]);
  const tree = Engine.resolveTree(custom, 999999, 1, mods, 0, [], consts);
  assert.ok([...Engine.flattenLeaves(tree).values()].some((leaf) => leaf.cyclic));
});

// Regression: the Route decisions cards were sized from the fully-expanded
// tree, so a shared ingredient was overstated once one of its parents was
// bought instead of crafted. Glass Orb showed 12m beside a shopping list
// asking for 8m: 8m through Steel, plus 4m through Red Dye -> Glass Bottle,
// but Red Dye is bought, so that second branch never happens.
test("a shared ingredient is sized from the plan, not the unstopped tree", () => {
  const idOf = (name) => index.idByName.get(name.toLowerCase());
  const glassOrb = idOf("glass orb");
  // No perks, so the numbers are the plain recipe maths the user reported.
  const bare = Engine.computeMods([], consts);
  const qtyIn = (tree) => Engine.collectNodes(tree).get(glassOrb)?.qtyOut ?? 0;

  const unstopped = Engine.resolveTree(index, RED_TRUNK, 1000000, bare, 0, [], consts);
  // Red Dye bought rather than crafted is what the planner actually chooses.
  const stopped = Engine.resolveTree(index, RED_TRUNK, 1000000, bare, 0, [], consts, new Set([idOf("red dye")]));

  assert.equal(qtyIn(unstopped), 12000000, "8m through Steel plus 4m through Red Dye");
  assert.equal(qtyIn(stopped), 8000000, "buying Red Dye leaves only the Steel branch");

  // And it still holds with the endgame perk profile applied.
  const perked = Engine.resolveTree(index, RED_TRUNK, 1000000, mods, 0, [], consts, new Set([idOf("red dye")]));
  assert.ok(qtyIn(perked) < qtyIn(Engine.resolveTree(index, RED_TRUNK, 1000000, mods, 0, [], consts)));
});

// Regression: Red Dye reaching Glass Orb through Glass Bottle is the exact
// path that made the number above diverge. If the recipe data changes so this
// no longer holds, the test above stops proving anything.
test("Red Dye still reaches Glass Orb through Glass Bottle", () => {
  const idOf = (name) => index.idByName.get(name.toLowerCase());
  const tree = Engine.resolveTree(index, idOf("red dye"), 1000, mods, 0, [], consts);
  assert.ok(Engine.collectNodes(tree).has(idOf("glass bottle")));
  assert.ok(Engine.collectNodes(tree).has(idOf("glass orb")));
});

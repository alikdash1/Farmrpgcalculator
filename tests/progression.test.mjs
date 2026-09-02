import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Engine = require("../engine.js");
const load = (file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
const data = { items: load("items.json"), recipes: load("recipes.json"), sources: load("sources.json"), market: load("market.json") };
const progression = load("progression.json");
const effects = load("effects.json").effects;
const consts = load("constants.json");
const index = Engine.buildIndex(data);
const mods = Engine.computeMods(effects, consts);

test("Glass Orb has a direct Ember Lagoon route", () => {
  const id = index.idByName.get("glass orb");
  const routes = Engine.sourcesFor(index, id, 1000, mods, consts).drops;
  const ember = routes.find((route) => route.location === "Ember Lagoon");
  assert.ok(ember);
  assert.ok(ember.denom > 20 && ember.denom < 22);
  assert.equal(ember.explores, Math.ceil(1000 * ember.denom));
});

test("Ember Lagoon route exposes progression-rich co-drops", () => {
  const coDrops = Engine.coDropsFor(index, "Ember Lagoon", 21000, "Glass Orb", progression, 10);
  const names = new Set(coDrops.map((drop) => drop.name));
  assert.ok(names.has("Emberstone"));
  assert.ok(names.has("Ancient Coin"));
  assert.ok(names.has("Large Chest 01"));
  assert.ok(coDrops.find((drop) => drop.name === "Emberstone").hoard);
});

test("a chosen acquisition route can stop the root recipe", () => {
  const id = index.idByName.get("glass orb");
  const tree = Engine.resolveTree(index, id, 1000, mods, 0, [], consts, new Set([id]));
  assert.equal(tree.stopped, true);
  assert.equal(tree.children.length, 0);
});

test("bundle quotes such as meal stacks use the bracketed pack size", () => {
  assert.equal(Engine.pricePer("30-40g [100]"), 100);
  const quote = Engine.marketQuote(index, "Lemon Cream Pie", 100);
  assert.ok(quote);
  const goldOption = quote.options.find((option) => option.currency === "gold");
  assert.equal(goldOption.amount, 35);
});

test("Glass Orb strategy rule preserves the experienced-player route", () => {
  const rule = progression.routeRules["Glass Orb"];
  assert.equal(rule.action, "farm");
  assert.equal(rule.location, "Ember Lagoon");
  assert.match(rule.why, /Emberstone/);
});

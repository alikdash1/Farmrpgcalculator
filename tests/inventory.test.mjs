import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

function modelContext() {
  const context = { window: {}, localStorage: { getItem: () => null } };
  vm.createContext(context);
  for (const file of ["data/main-quests.js", "data/personal-quests.js", "data/quest-sagas.js", "quest-model.js"]) {
    vm.runInContext(read(file), context);
  }
  return context;
}

test("the shared quest model owns saga order and exact title normalization", () => {
  const model = modelContext().window.FRPG_QUEST_MODEL;
  assert.equal(model.normalizeTitle("Problems Start Arising III"), "problemsstartarisingiii");
  assert.equal(model.normalizeTitle("ProblemsStartArising III!"), "problemsstartarisingiii");
  assert.equal(model.personalCount, 1952);
  const known = new Set(model.quests.map((quest) => model.normalizeTitle(quest.title)));
  assert.equal([...model.completedSet(null)].filter((title) => known.has(title)).length, 1952);
  assert.equal(model.quests.filter((quest) => quest.line === "Problems Start Arising").length, 33);
  assert.doesNotMatch(read("quests-page.js"), /function applySagas/);
});

test("the player's pirate saga case stays readable as a very large remaining list", () => {
  const model = modelContext().window.FRPG_QUEST_MODEL;
  const completed = model.completedSet(null);
  const remaining = model.quests.filter((quest) => quest.line === "Problems Start Arising" && !completed.has(model.normalizeTitle(quest.title)));
  const names = new Set(remaining.flatMap((quest) => (quest.requirements || []).map((row) => row.item)));
  assert.equal(remaining[0].title, "Problems Start Arising III");
  assert.equal(remaining.length, 31);
  assert.equal(names.size, 189);
  assert.equal(remaining.at(-1).pending, true);
});

test("the shared art helper uses base art first, then verified supplemental art, but never art for Silver", () => {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of ["data/data.js", "data/location-intel.js", "data/item-art.js", "item-art.js"]) vm.runInContext(read(file), context);
  const helper = context.window.FRPG_ITEM_ART_HELPER;
  assert.equal(Object.keys(context.window.FRPG_ITEM_ART.art).length, 119);
  assert.match(helper.urlFor("Peppers"), /^https:\/\/farmrpg\.com\/img\/items\//);
  assert.equal(helper.urlFor("Reinforced Helmet"), "https://farmrpg.com/img/items/9096.png");
  assert.equal(helper.urlFor("Silver"), "");
  assert.equal(Object.hasOwn(context.window.FRPG_ITEM_ART.art, "Silver"), false);
  const mineItems = [...new Set(context.window.FRPG_LOCATION_INTEL.mining.mines.flatMap((mine) => mine.items))];
  assert.equal(mineItems.filter((name) => !helper.urlFor(name)).length, 0);
});

test("Inventory is a separate responsive page with both live refresh paths and tracking controls", () => {
  const html = read("index.html");
  const source = read("inventory-page.js");
  const css = read("inventory.css");
  assert.match(html, /data-tab="inventory"/);
  assert.match(html, /id="inventoryNext"/);
  assert.match(html, /id="inventoryWhole"/);
  assert.match(source, /frpg_owned/);
  assert.match(source, /frpg_tracked_line/);
  assert.match(source, /window\.addEventListener\("storage", render\)/);
  assert.match(source, /source === "farmrpg-account-sync"/);
  assert.match(read("quests-page.js"), /data-track-line/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.inventory-panels \{ grid-template-columns: 1fr; \}/);
});

test("every local script and link in index.html is cache-busted and model scripts load before pages", () => {
  const html = read("index.html");
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)) {
    const path = match[1];
    if (/^https?:/.test(path)) continue;
    assert.match(path, /\?v=\d{8}-\d+$/, `${path} has a version query`);
  }
  assert.ok(html.indexOf("quest-model.js") < html.indexOf("quests-page.js"));
  assert.ok(html.indexOf("quest-model.js") < html.indexOf("inventory-page.js"));
  assert.ok(html.indexOf("item-art.js?v=20260904-1") < html.indexOf("app.js"));
});

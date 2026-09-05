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
  for (const file of ["data/data.js", "data/location-intel.js", "data/tower-floors.js", "data/item-art.js", "item-art.js"]) vm.runInContext(read(file), context);
  const helper = context.window.FRPG_ITEM_ART_HELPER;
  // Pinning an exact entry count only says the file did not change. What has
  // to hold is that nothing the player looks at falls back to a bare initial.
  assert.ok(Object.keys(context.window.FRPG_ITEM_ART.art).length >= 119);
  assert.match(helper.urlFor("Peppers"), /^https:\/\/farmrpg\.com\/img\/items\//);
  assert.equal(helper.urlFor("Reinforced Helmet"), "https://farmrpg.com/img/items/9096.png");
  assert.equal(helper.urlFor("Silver"), "");
  assert.equal(Object.hasOwn(context.window.FRPG_ITEM_ART.art, "Silver"), false);
  const mineItems = [...new Set(context.window.FRPG_LOCATION_INTEL.mining.mines.flatMap((mine) => mine.items))];
  assert.deepEqual(mineItems.filter((name) => !helper.urlFor(name)), []);

  // Tower T300-T340 arrived with its own artwork in data/tower-floors.js, so
  // for a while only the Tower page could draw it. Every page resolves it now.
  const towerItems = [...new Set(context.window.FRPG_TOWER_FLOORS.floors
    .flatMap((floor) => [...floor.gms, ...floor.mms])
    .map((row) => row.name))];
  assert.deepEqual(towerItems.filter((name) => !helper.urlFor(name)), []);
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

test("a freshly captured inventory shows without pressing Apply", () => {
  // The arithmetic lives in gather-model.js so the Inventory tab and the
  // floating tracker cannot disagree about what is left.
  const source = read("gather-model.js");
  // frpg_owned exists as {} from the app's first save, so a truthiness check
  // alone made a captured inventory look empty until Apply was pressed.
  assert.match(source, /Object\.keys\(saved\)\.length/);
  const owned = source.indexOf('readJson("frpg_owned")');
  const snapshot = source.indexOf('readJson("frpg_account_snapshot_v1")');
  assert.ok(owned > 0 && snapshot > owned, "it still prefers hand-entered amounts when there are any");
});

test("description rows in an already-saved snapshot are filtered at the point of use", () => {
  const gather = read("gather-model.js");
  // Fixing this only in the collector left every snapshot already sitting in
  // a browser still full of prose, so the site filters them as well.
  assert.match(gather, /function isDescription\(name\)/);
  // A row is only prose if nothing can identify it, so a genuinely new item —
  // one the data files have never seen but the capture found artwork for —
  // is never dropped.
  assert.match(gather, /ART\.isKnownItem/);
  assert.match(gather, /function ignoredCount\(\)/);
  // And the count is shown rather than the total silently shrinking.
  assert.match(read("inventory-page.js"), /rows ignored — Farm RPG description text/);
});

test("a half-cached mix of files degrades instead of blanking the page", () => {
  const page = read("inventory-page.js");
  // One missing helper threw and took the whole tab with it, which looks
  // exactly like "tracking does not work".
  assert.match(page, /typeof GATHER\.hasStoredChoice === "function"/);
  assert.match(page, /typeof GATHER\.ignoredCount === "function"/);
  // And the page says what it computed, so an empty panel is explainable.
  assert.match(page, /in your inventory/);
  assert.match(read("app.js"), /const FRPG_BUILD = "/);
  assert.match(read("app.js"), /build-stamp/);
});

test("the Inventory tab is only what you hold", () => {
  const html = read("index.html");
  const source = read("inventory-page.js");
  assert.match(html, /data-tab="inventory"/);
  assert.match(html, /id="inventoryOwned"/);
  // The gather lists live in the floating tracker; having both meant reading
  // the same two lists twice on one page.
  for (const gone of ["inventoryNext", "inventoryWhole", "inventoryDouble", "inventoryOverlay"]) {
    assert.doesNotMatch(html, new RegExp(`id="${gone}"`), `${gone} is gone`);
    assert.doesNotMatch(source, new RegExp(gone), `${gone} is not referenced`);
  }
  // It still refreshes from every live path.
  assert.match(source, /window\.addEventListener\("storage", render\)/);
  assert.match(source, /source === "farmrpg-account-sync"/);
  assert.match(read("quests-page.js"), /data-track-line/);
});

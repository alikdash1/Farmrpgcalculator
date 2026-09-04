import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("the tracker is on every tab, not only the Inventory page", () => {
  const html = read("index.html");
  const js = read("tracker.js");
  // It appends itself to the body rather than living inside one view, which is
  // what makes it survive a tab change.
  assert.match(js, /document\.body\.append\(panel\)/);
  assert.doesNotMatch(js, /getElementById\("inventory"\)/);
  assert.match(html, /<script src="tracker\.js/);
  assert.match(html, /<link rel="stylesheet" href="tracker\.css/);
  // It can be collapsed and dismissed, and the choice is remembered.
  for (const key of ["frpg_tracker_collapsed", "frpg_tracker_hidden", "frpg_tracker_big"]) {
    assert.ok(js.includes(key), `${key} is remembered`);
  }
});

test("the tracker and the Inventory tab share one calculation", () => {
  const gather = read("gather-model.js");
  const tracker = read("tracker.js");
  const page = read("inventory-page.js");
  assert.match(gather, /window\.FRPG_GATHER = \{/);
  for (const source of [tracker, page]) {
    assert.match(source, /window\.FRPG_GATHER/);
    // Neither may keep its own copy of the arithmetic.
    assert.doesNotMatch(source, /function ownedMap\(/);
    assert.doesNotMatch(source, /function busiestLine\(/);
  }
  // Load order: the shared model has to be defined before either reads it.
  const html = read("index.html");
  assert.ok(html.indexOf("gather-model.js") < html.indexOf("inventory-page.js"));
  assert.ok(html.indexOf("gather-model.js") < html.indexOf("tracker.js"));
});

test("a capture teaches the planner artwork it does not have", () => {
  const capture = read("collectors/account-sync-extension/capture-page.js");
  const schema = read("collectors/account-sync-extension/shared/schema.js");
  const merge = read("collectors/account-sync-extension/shared/merge.js");
  const helper = read("item-art.js");

  assert.match(capture, /function harvestItemArt\(\)/);
  assert.match(capture, /itemArt: harvestItemArt\(\)/);
  // Only same-origin item paths survive: this becomes an <img src> on the site.
  assert.match(schema, /function sanitizeItemArt/);
  assert.ok(schema.includes("/img/items/") && schema.includes("sanitizeItemArt(parsed.itemArt)"));
  assert.match(merge, /snapshot\.itemArt\[name\]/);
  assert.match(helper, /function learnFromCapture/);
});

test("small shows this quest; big spreads the whole line across the page", () => {
  const js = read("tracker.js");
  const css = read("tracker.css");
  // Small is the step you are on; big is everything the line still needs.
  assert.match(js, /const rows = big \? wholeRows : nextRows/);
  // Read across in columns rather than scrolled down.
  assert.match(css, /\.quest-tracker\.is-big \.tracker-list \{[\s\S]*?grid-auto-flow: column/);
  assert.match(css, /\.quest-tracker\.is-big \{[\s\S]*?z-index: 90/);
  // This step's items stay findable in a list of two hundred.
  assert.match(js, /is-now/);
  // A width transition cannot interpolate to a min() value and leaves the
  // panel stuck at whichever size it started at.
  assert.doesNotMatch(css, /^\s*transition:[^;]*width/m);
});

test("Track toggles off, and an explicit none is not auto-filled again", () => {
  const quests = read("quests-page.js");
  const gather = read("gather-model.js");
  // Pressing Track on the line already being tracked used to re-set the same
  // value, so there was no way to stop.
  assert.match(quests, /trackedLine\(\) === tracker\.dataset\.trackLine \? "" :/);
  assert.match(quests, /Tracking ✕/);
  // And clearing it auto-picked the very same questline straight back, which
  // is what made untracking look broken.
  assert.match(gather, /function hasStoredChoice\(\)/);
  assert.match(gather, /clearedOnPurpose/);
});

test("the inventory filter trusts the item list instead of guessing at prose", () => {
  const gather = read("gather-model.js");
  // "Adds 100 Stamina" is Title Case with no lowercase word, so every
  // shape-based heuristic let it through. The complete library answers it.
  assert.match(gather, /ART\.isKnownItem\(text\)/);
  assert.doesNotMatch(gather, /looksLikeProse/);
  assert.doesNotMatch(gather, /joiners/);
});

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
  // Two docked panels, not one corner holding both.
  assert.match(js, /id: "questTrackerNext"/);
  assert.match(js, /id: "questTrackerWhole"/);
  assert.doesNotMatch(js, /getElementById\("inventory"\)/);
  assert.match(html, /<script src="tracker\.js/);
  assert.match(html, /<link rel="stylesheet" href="tracker\.css/);
  // It can be collapsed and dismissed, and the choice is remembered.
  for (const key of ["frpg_tracker_next_collapsed", "frpg_tracker_whole_collapsed", "frpg_tracker_hidden", "frpg_tracker_big"]) {
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

test("this quest docks bottom-left, the whole line bottom-right", () => {
  const js = read("tracker.js");
  const css = read("tracker.css");
  // The player asked for this layout from the first message; both lists lived
  // in one corner on the right for far too long.
  assert.match(css, /\.quest-tracker\.is-next \{ left: 14px; \}/);
  assert.match(css, /\.quest-tracker\.is-whole \{ right: 14px; \}/);
  assert.match(js, /draw\("next", \{/);
  assert.match(js, /draw\("whole", \{/);
  // Only the whole-line panel opens across the page.
  assert.match(js, /canExpand: false/);
  assert.match(css, /\.quest-tracker\.is-big \.tracker-list \{[\s\S]*?grid-auto-flow: column/);
  assert.match(css, /\.quest-tracker\.is-big \{[\s\S]*?z-index: 90/);
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

test("dismissing the tracker is never a dead end", () => {
  const quests = read("quests-page.js");
  const page = read("inventory-page.js");
  // ✕ set a flag with no way back, so a later Track press showed nothing
  // anywhere and looked like tracking was broken.
  assert.match(quests, /localStorage\.setItem\("frpg_tracker_hidden", "0"\)/);
  assert.match(page, /data-show-tracker/);
  assert.match(page, /FRPG_showTracker/);
});

test("tracker rows open the item, and Escape closes the expanded list", () => {
  const js = read("tracker.js");
  // Every other list in the app opens an item on click; this one did not.
  assert.match(js, /data-open-item="\$\{esc\(row\.name\)\}"/);
  assert.match(js, /const openable = !row\.currency && ART\.itemFor\(row\.name\)/);
  assert.match(js, /event\.key === "Escape"/);
  // Keyboard users get the same row action as mouse users.
  assert.match(js, /event\.key === "Enter" \|\| event\.key === " "/);
});

test("the whole-line list can be copied into a spreadsheet", () => {
  const js = read("tracker.js");
  // The player keeps a sheet for this questline, so tab-separated rows paste
  // straight in. navigator.clipboard needs a secure context and this app opens
  // from disk, so the textarea path is the one that actually runs.
  assert.ok(js.includes('"Item\\tNeeded\\tYou have\\tStill short"'));
  assert.match(js, /document\.execCommand\("copy"\)/);
  assert.match(js, /navigator\.clipboard/);
  // Only on the whole-line panel; copying one step's list has little use.
  assert.match(js, /canExpand \? `<button type="button" data-copy/);
});

test("the expanded list is dense and filterable", () => {
  const js = read("tracker.js");
  const css = read("tracker.css");
  // 189 rows at panel size reads as a wall; smaller rows and a filter make it
  // something you can take in.
  assert.match(css, /\.quest-tracker\.is-big \.tracker-list \{[\s\S]*?font-size: 11px/);
  assert.match(css, /\.quest-tracker\.is-big \.tracker-list img \{ width: 16px/);
  assert.match(js, /data-filter/);
  assert.match(js, /matching/);
  // The filter belongs to the expanded view only.
  assert.match(js, /\$\{big \? `<div class="tracker-filter">/);
});

test("gather lists say where an item comes from", () => {
  const gather = read("gather-model.js");
  const page = read("inventory-page.js");
  assert.match(gather, /function whereFor\(name\)/);
  // For a meal, growMin is the cooking time. Labelling meals "Grow" would be
  // an invented mechanic, so the meal test has to come first.
  assert.match(gather, /if \(item\.type === "meal" \|\| item\.cookLevel != null\) bits\.push\("Cook"\);/);
  assert.match(gather, /else if \(item\.growMin > 0\) bits\.push\("Grow"\);/);
  // Built on the index app.js already made, not a second copy.
  assert.match(read("app.js"), /window\.FRPG_INDEX = index;/);
  assert.match(page, /function sourceHint\(name\)/);
});

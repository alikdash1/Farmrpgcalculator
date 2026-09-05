import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

// Endgame players are spending the same hours on quests and on Tower
// masteries, and nothing in the app put the two lists next to each other.
test("the gather model can name items that also finish a Tower mastery", () => {
  const gather = read("gather-model.js");
  const app = read("app.js");
  assert.match(gather, /function towerOverlap\(rows\)/);
  // Finished masteries are not an opportunity, and currency cannot be mastered.
  assert.match(gather, /if \(need\.complete\) continue;/);
  assert.match(gather, /!row\.currency && unfinished\.has/);
  // The lowest unfinished floor is the one it helps you reach next.
  assert.match(gather, /if \(!seen \|\| need\.floor < seen\.floor\)/);
  // The Tower tab may never be opened, so the count cannot depend on it.
  assert.match(app, /window\.FRPG_TOWER_NEEDS = towerRequirements\(\);/);
  // It is surfaced on the home page; the Inventory tab is only what you hold.
  assert.match(app, /Counts twice<\/span>/);
  assert.doesNotMatch(read("index.html"), /id="inventoryDouble"/);
});
test("the home page says where you stand", () => {
  const app = read("app.js");
  const html = read("index.html");
  assert.match(html, /id="homeStanding"/);
  assert.match(app, /function renderStanding\(\)/);
  // Next floor, current quest step, and how much of it does double duty.
  assert.match(app, /Next floor<\/span>/);
  assert.match(app, /Current step<\/span>/);
  assert.match(app, /Counts twice<\/span>/);
  // gather-model.js loads after app.js, so the first render cannot see it.
  assert.match(app, /window\.addEventListener\("load", renderStanding\)/);
  // Hidden rather than showing an empty strip when there is nothing to say.
  assert.match(app, /host\.hidden = bits\.length === 0;/);
});

test("finished Tower rows stop competing with the ones still ahead", () => {
  const css = read("tower.css");
  // Green marked both "done" and "in progress", so it distinguished nothing.
  assert.match(css, /\.tower-mm\.complete \.tower-progress i \{ background: var\(--line\); \}/);
  assert.match(css, /\.tower-mm\.working \.tower-progress i \{ background: var\(--green\); \}/);
});

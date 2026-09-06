import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const workbook = () => {
  const source = read("data/owner-workbook.js");
  return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
};

test("the owner's workbook is loaded, and generated rather than hand-typed", () => {
  const html = read("index.html");
  assert.match(html, /<script src="data\/owner-workbook\.js\?v=\d{8}-\d+"><\/script>/);
  assert.match(read("data/owner-workbook.js"), /window\.FRPG_OWNER_WORKBOOK = \{/);
  // Re-runnable, and it says which tabs it skipped and why, so the next session
  // does not re-read the whole spreadsheet to find out.
  const tool = read("tools/build-owner-workbook.py");
  assert.match(tool, /Tabs deliberately skipped, and why/);
  assert.match(tool, /Acorn pie leather\s+empty/);
});

test("every masterable item is rated, as a floor or as a reason not to", () => {
  const w = workbook();
  const rated = Object.entries(w.masteryFeasibility);
  assert.ok(rated.length > 400, `${rated.length} items rated`);
  // Each row is one or the other, never both and never neither.
  for (const [name, row] of rated) {
    const hasFloor = Number.isInteger(row.tower);
    const hasNote = typeof row.note === "string" && row.note.length > 0;
    assert.ok(hasFloor !== hasNote, `${name}: ${JSON.stringify(row)}`);
  }
  const notes = new Set(rated.map(([, row]) => row.note).filter(Boolean));
  for (const expected of ["not possible", "too expensive", "too long / pet", "6 extremely hard"]) {
    assert.ok(notes.has(expected), `"${expected}" is one of the ratings`);
  }
});

test("the Tower rail shows the rating instead of only admitting ignorance", () => {
  const app = read("app.js");
  // It used to say "No route data for this one yet" and stop there.
  assert.match(app, /const MASTERY_RATING = /);
  assert.match(app, /function masteryRating\(name\)/);
  assert.match(app, /\$\{noPlan\}\$\{ratingTag\}/);
  // Names are matched case-insensitively, because the workbook types them by
  // hand ("water lily", "acorn pie") and the game data does not.
  assert.match(app, /key\.toLowerCase\(\) === String\(name\)\.toLowerCase\(\)/);
  assert.match(read("tower.css"), /\.tower-rating\.is-blocked/);
});

test("the workbook agrees with the fishing rate the site already used", () => {
  // Its own Water Lily row wants 68,301 items for 33,930 Large Nets, which is
  // 2.013 per net — the Tower MM Calculator's 1.83 with Sea Pincher's 10% on
  // top. Two independent parts of two different sheets landing on the same
  // number is the best check available that the net maths is right.
  const w = workbook();
  const lily = w.towerMasteryCost["Water Lily"];
  assert.ok(lily, "Water Lily has a Tower cost row");
  const perNet = lily.ingredients[0].amount / lily.ingredients[0].apOrLn;
  const source = read("data/workbook-rates.js");
  const rates = JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
  const base = rates.fishing["Forest Pond"]["Water Lily"];
  assert.ok(Math.abs(perNet - base * 1.1) < 0.005, `${perNet} vs ${base} x 1.1`);
});

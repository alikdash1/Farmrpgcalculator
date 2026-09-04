import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);

test("generated knowledge export is healthy and repaired", () => {
  const source = readFileSync(new URL("data/knowledge.js", root), "utf8");
  const context = { window: {} };
  runInNewContext(source, context);
  const knowledge = context.window.FRPG_KNOWLEDGE;
  assert.equal(knowledge.meta.integrity, "ok");
  assert.equal(knowledge.meta.counts.unmatched_names, 0);
  assert.equal(knowledge.meta.counts.conflicts, 2);
  assert.equal(knowledge.rules.length, 17);
  assert.ok(knowledge.meals.length >= 20);
  assert.ok(knowledge.meta.counts.evidence_sources > 14000);
});

test("Phase 2 exposes focused top-level work areas", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  for (const id of ["home", "planner", "setup", "fieldlab", "library"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data\/knowledge\.js/);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML ids must stay unique");
});

test("fresh profiles do not assume ownership or active meals", () => {
  const app = readFileSync(new URL("app.js", root), "utf8");
  assert.match(app, /new Set\(read\("frpg_effects_v2", \[\]\)\)/);
  assert.match(app, /MEALS\.map\(\(meal\) => \[meal\.id, false\]\)/);
  assert.match(app, /sawmillWood: false/);
  assert.match(app, /quarryStone: false/);
});

test("the Back button moves between tabs instead of leaving the site", () => {
  const source = readFileSync(new URL("app.js", root), "utf8");
  // Every tab change used replaceState, so the browser kept no history at all.
  assert.match(source, /history\.pushState\(null, "", target\)/);
  assert.match(source, /addEventListener\("popstate"/);
  assert.match(source, /addEventListener\("hashchange"/);
  // Going Back must not push another entry, or Back could never escape.
  assert.match(source, /if \(fromHistory\) history\.replaceState/);
});

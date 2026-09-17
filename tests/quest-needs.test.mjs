import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

const context = {};
context.window = context;
vm.createContext(context);
for (const file of ["data/main-quests.js", "data/quest-sagas.js", "data/personal-quests.js", "quest-model.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}
const model = context.FRPG_QUEST_MODEL;

test("every quest requirement names an item and an amount", () => {
  let rows = 0;
  for (const quest of model.quests) {
    for (const row of quest.requirements || []) {
      assert.equal(typeof row.item, "string");
      assert.ok(row.item.trim().length > 0, quest.title);
      assert.ok(Number(row.quantity) >= 0, `${quest.title} ${row.item}`);
      rows += 1;
    }
  }
  assert.ok(rows > 1000, "the questline data is loaded");
});

test("items can be looked up by the quests that want them", () => {
  const index = new Map();
  for (const quest of model.quests) {
    for (const row of quest.requirements || []) {
      const key = row.item.trim().toLowerCase();
      index.set(key, (index.get(key) || 0) + 1);
    }
  }
  assert.ok(index.size > 500, "hundreds of items are asked for by name");
  assert.ok(index.get("steel wire") > 1);
});

test("the model answers which quests still want an item", () => {
  const needs = model.needsByItem("Steel Wire", null);
  assert.ok(needs, "Steel Wire is asked for by at least one unfinished quest");
  assert.ok(needs.total > 0 && needs.steps === needs.rows.length);
  for (const row of needs.rows) {
    assert.ok(row.quantity > 0);
    assert.notEqual(row.status, "completed", "finished quests are left out");
    // An event that has closed cannot still want anything.
    if (row.end) assert.ok(Date.parse(row.end) >= Date.now(), row.title);
  }
  assert.equal(model.needsByItem("Not A Real Item", null), null);
});

test("both pages ask the model, and the item panel has somewhere to put it", () => {
  const app = read("app.js");
  // The old line said "6.15k across 11 steps" and never which quest wanted what.
  assert.match(app, /QUEST_MODEL\.needsByItem\(name, state\.account\)/);
  assert.match(app, /Still needed for quests/);
  assert.match(app, /\$\("goalQuests"\)\.innerHTML = questNeedsHtml\(goal\.name\)/);
  assert.match(app, /const questNeeds = questNeedsHtml\(item\.name\)/);
  assert.match(read("index.html"), /id="goalQuests"/);
  assert.match(read("items-page.js"), /QUESTS\.needsByItem\(name, account\)/);
});

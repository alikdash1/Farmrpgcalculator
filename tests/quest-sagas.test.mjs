import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

// Load the real data files and the real applySagas out of quests-page.js, so
// this exercises what ships rather than a copy of it.
function load() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read("data/main-quests.js"), context);
  vm.runInContext(read("data/quest-sagas.js"), context);

  const source = read("quests-page.js");
  const start = source.indexOf("  function applySagas");
  const end = source.indexOf("\n  const DATA = applySagas");
  assert.ok(start > 0 && end > start, "applySagas still lives in quests-page.js");
  vm.runInContext(source.slice(start, end) + "\nglobalThis.applySagas = applySagas;", context);

  return {
    raw: context.window.FRPG_MAIN_QUESTS,
    config: context.window.FRPG_QUEST_SAGAS,
    applySagas: context.applySagas,
  };
}

test("the pirate saga is stitched into one questline in prerequisite order", () => {
  const { raw, config, applySagas } = load();
  const saga = config.sagas.find((row) => row.name === "Problems Start Arising");
  assert.ok(saga, "the pirate saga is declared");

  const data = applySagas(raw, config);
  const line = data.lines.filter((row) => row.name === saga.name);
  assert.equal(line.length, 1, "one line, not eleven");
  assert.equal(line[0].count, 33, "32 real steps plus the sheet-only step XXIX");

  // None of the renamed halves may survive as their own questline.
  for (const member of saga.lines) {
    if (member === saga.name) continue;
    assert.equal(data.lines.filter((row) => row.name === member).length, 0, `${member} was absorbed`);
  }

  const steps = data.quests.filter((quest) => quest.line === saga.name);
  assert.equal(steps.length, 33);
  assert.deepEqual(steps.slice(0, 32).map((quest) => quest.title), saga.order);
  assert.equal(steps[32].title, "Step XXIX");
  assert.equal(steps[32].pending, true);

  // The chain claim has to hold: each step names the one before it.
  const position = new Map(saga.order.map((title, index) => [title, index]));
  for (const quest of steps.slice(1, 32)) {
    const before = saga.order[position.get(quest.title) - 1];
    const key = before.replace(/\s+[IVX]+$/, "").toLowerCase();
    assert.ok(
      String(quest.prerequisite || "").replace(/<br\/?>/g, " ").toLowerCase().includes(key),
      `${quest.title} follows ${before}`,
    );
  }
});

test("stitching leaves every other questline and quest untouched", () => {
  const { raw, config, applySagas } = load();
  const data = applySagas(raw, config);
  assert.equal(data.quests.filter((quest) => !quest.pending).length, raw.quests.length);
  assert.equal(data.lines.length, raw.lines.length - 10);
});

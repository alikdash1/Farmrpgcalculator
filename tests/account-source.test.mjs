// The author's account files must never be blended into a visitor's numbers.
// Before js/account-source.js, a visitor on floor 150 was shown floor 289, kept
// the author's mastery counts for anything they had not captured, and was
// credited the author's 13,000 chests.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "js/account-source.js"), "utf8");

function load(storage) {
  const store = new Map(Object.entries(storage));
  const window = {
    FRPG_PERSONAL_TOWER: { masteries: { "Fancy Guitar": 183909 }, towerAtCapture: 289, startFloor: 289, goalFloor: 340, authoritativeMasteries: true, capturedAt: "2026-09-19T01:01:00Z" },
    FRPG_PERSONAL_QUESTS: { completed: ["Distant Illusions I"] },
    FRPG_PLAYER_FACTS: { containersHeld: { "Large Chest 02": 13000 }, inventoryCap: { approx: 17274 }, wishingWell: { tossesPerDay: 30 } },
  };
  const ctx = {
    window,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    document: { readyState: "complete", getElementById: () => null, querySelector: () => null, body: null, addEventListener() {} },
    location: { reload() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return window;
}

test("a first visit shows the author's farm, labelled as an example", () => {
  const w = load({});
  assert.equal(w.FRPG_ACCOUNT_MODE, "example");
  assert.equal(w.FRPG_PERSONAL_TOWER.masteries["Fancy Guitar"], 183909);
});

test("a visitor with their own account gets none of the author's numbers", () => {
  const w = load({ frpg_account_snapshot_v1: "{}" });
  assert.equal(w.FRPG_ACCOUNT_MODE, "visitor");
  assert.deepEqual({ ...w.FRPG_PERSONAL_TOWER.masteries }, {});
  assert.equal(w.FRPG_PERSONAL_TOWER.towerAtCapture, 0, "the Tower floor must come from their capture");
  assert.equal(w.FRPG_PERSONAL_TOWER.authoritativeMasteries, false, "every mastery row they capture applies");
  assert.deepEqual([...w.FRPG_PERSONAL_QUESTS.completed], []);
  assert.deepEqual({ ...w.FRPG_PLAYER_FACTS.containersHeld }, {});
  assert.equal(w.FRPG_PLAYER_FACTS.inventoryCap, null);
  assert.equal(w.FRPG_PLAYER_FACTS.wishingWell.tossesPerDay, 30, "game rules are kept");
});

test("the author's own browser keeps the bundled account", () => {
  const w = load({ frpg_account_snapshot_v1: "{}", frpg_bundled_account_v1: "mine" });
  assert.equal(w.FRPG_ACCOUNT_MODE, "owner");
  assert.equal(w.FRPG_PERSONAL_TOWER.towerAtCapture, 289);
  assert.equal(w.FRPG_PLAYER_FACTS.containersHeld["Large Chest 02"], 13000);
});

test("it runs before the app reads those globals", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const at = (s) => html.indexOf(s);
  assert.ok(at('src="js/account-source.js') > at('src="data/player-facts.js'));
  assert.ok(at('src="js/account-source.js') > at('src="data/personal-tower.js'));
  const firstPage = Math.min(...[...html.matchAll(/<script src="js\/(?!account-source)[^"]+"/g)].map((m) => m.index));
  assert.ok(at('src="js/account-source.js') < firstPage);
});

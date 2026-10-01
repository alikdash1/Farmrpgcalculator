// The planning tools the farmrpg-progression skill relies on. Each test pins
// a mistake that reached the owner at least once.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Never let a capture on this machine (raw/account-captures, Downloads) leak
// into a test: point the live-account search at a file that does not exist.
process.env.FRPG_SNAPSHOT = path.join(os.tmpdir(), "frpg-no-such-snapshot.json");

const { towerFloors } = await import("../tools/tower.mjs");
const { prepare, containerYield, isContainer } = await import("../tools/prepare.mjs");
const { makeCoster } = await import("../tools/costing.mjs");

function load(files = ["data/data.js", "data/extra-items.js", "data/personal-tower.js", "data/tower-floors.js",
  "data/workbook-rates.js", "data/player-facts.js", "data/tradeable.js"]) {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  return ctx.window;
}

test("floors below T300 exist to the tools (Fancy Guitar is T295)", () => {
  const W = load();
  const rows = towerFloors(W, 289);
  const at = (name) => rows.find((r) => [...(r.mms || []), ...(r.gms || [])].some((e) => e.name === name));
  assert.equal((at("Fancy Guitar") || {}).floor, 295);
  assert.equal((at("Red Trunk") || {}).floor, 299);
  assert.ok(rows.every((r) => r.floor >= 289), "cleared floors are dropped");
  assert.ok(!rows.some((r) => r.floor === 0), "a towerRequirement of 0 is no floor");
});

test("container contents are not recipes", () => {
  const W = load();
  prepare(W, { quiet: true });
  const D = W.FRPG_DATA;
  const byId = new Map(D.items.items.map((i) => [i.id, i]));
  const made = new Set(D.recipes.craft.map((r) => byId.get(r.itemId).name));
  for (const box of ["Grab Bag 01", "Large Chest 02", "Christmas Present 04", "Spring Basket", "Tackle Box", "Green Backpack"]) {
    assert.ok(!made.has(box), `${box} is a container, not a craft`);
  }
  for (const real of ["Hammer", "Salt", "Red Trunk", "Fancy Guitar", "Wooden Box", "Sturdy Box", "Christmas Tree", "Red Berry Pie", "Crown of Clover"]) {
    assert.ok(made.has(real), `${real} is a real recipe`);
  }
  const byName = new Map(D.items.items.map((i) => [i.name, i]));
  assert.ok(isContainer(W, byName.get("Grab Bag 01")));
  assert.ok(!isContainer(W, byName.get("Wooden Box")));
});

test("a 'one of' bag hands over one line, not all of them", () => {
  const W = load();
  prepare(W, { quiet: true });
  const out = containerYield(W, "Grab Bag 01", 700);
  // Seven lines, 10-50 each: about 30 x 700 / 7 = 3,000 of each, not 21,000.
  assert.ok(Math.abs(out.get("Bone") - 3000) < 1, `Bone ${out.get("Bone")}`);
  const chest = containerYield(W, "Large Chest 02", 100);
  assert.equal(chest.get("Small Screw"), 800, "a chest gives every line");
});

test("a newer live capture replaces the stale mastery file", () => {
  const file = path.join(os.tmpdir(), `frpg-live-test-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify({
    schema: "frpg-live-account-v1", capturedAt: "2099-01-01T00:00:00Z", masteriesAt: "2099-01-01T00:00:00Z",
    inventoryAt: "2099-01-01T00:00:00Z", towerFloor: 295,
    masteries: { "Fancy Guitar": 999000 },
    inventory: { "Wood": 20000, "Stone": 20000, "Coal": 20000, "Board": 20000, "Straw": 20000, "Silver": 1e12, "Large Chest 02": 5 },
  }));
  const before = process.env.FRPG_SNAPSHOT;
  process.env.FRPG_SNAPSHOT = file;
  try {
    const W = load();
    prepare(W, { quiet: true });
    assert.equal(W.FRPG_PERSONAL_TOWER.masteries["Fancy Guitar"], 999000);
    assert.equal(W.FRPG_PERSONAL_TOWER.towerAtCapture, 295);
    assert.equal(W.FRPG_PLAYER_FACTS.inventoryCap.approx, 20000, "the cap is read off the fullest stacks, never from Silver");
    assert.deepEqual({ ...W.FRPG_PLAYER_FACTS.containersHeld }, { "Large Chest 02": 5 });
  } finally {
    process.env.FRPG_SNAPSHOT = before;
    fs.rmSync(file, { force: true });
  }
});

test("craft versus go: Glass Orb is gathered, never crafted through Sandstone", () => {
  const W = load();
  prepare(W, { quiet: true });
  const coster = makeCoster(W);
  assert.equal(coster.unit("Glass Orb").how, "go");
  const r = coster.roll("Hourglass", 100000);
  assert.ok(!r.base.has("Sandstone"), "Sandstone in a base list means craft-versus-go was skipped");
  assert.equal(coster.unit("Beet").how, "crop", "a crop is field time, not a missing source");
});

test("tower-plan merges trips and never sums a place's items", () => {
  const out = execFileSync(process.execPath, [path.join(root, "tools/tower-plan.mjs"), "--to", "300", "--json"], {
    env: { ...process.env }, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  });
  const plan = JSON.parse(out);
  assert.ok(plan.owed.some((m) => m.name === "Fancy Guitar"), "Fancy Guitar is owed for T295");
  const alone = plan.owed.reduce((s, m) => s + (m.ap || 0), 0);
  const shared = plan.trips.reduce((s, t) => s + t.ap, 0);
  assert.ok(shared < alone, `shared trips (${Math.round(shared)}) beat farming each mastery alone (${Math.round(alone)})`);
  for (const t of plan.trips) assert.ok(Number.isFinite(t.ap) && t.ap >= 0);
});

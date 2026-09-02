import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const app = readFileSync(new URL("app.js", root), "utf8");
const css = readFileSync(new URL("v3.css", root), "utf8");

test("the removed workshop economics card stays removed", () => {
  assert.doesNotMatch(html, /id=["']craftRoute["']/);
  assert.doesNotMatch(app, /Workshop economics/);
});

test("calculator exposes per-item locations and opt-in seasonal areas", () => {
  assert.match(html, /id=["']includeEvents["']/);
  assert.match(app, /frpg_farm_locations_v1/);
  assert.match(app, /data-location-id/);
  assert.match(app, /EVENT_LOCATIONS = new Set\(\["Haunted House", "Santa's Workshop"\]\)/);
  assert.match(app, /state\.includeEvents \|\| !EVENT_LOCATIONS\.has/);
});

test("expected co-drops use item artwork", () => {
  assert.match(app, /class="drop-chip"/);
  assert.match(app, /itemImg\(dropItem, "drop-art"\)/);
  assert.match(css, /\.drop-chips/);
});

test("Account tab validates and reviews local snapshots", () => {
  for (const id of ["account", "accountFile", "accountSummary", "accountTower", "accountQuests", "accountMasteries", "applyAccount"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /farmrpg-account-snapshot-v1/);
  assert.match(app, /validateCapture/);
  assert.match(app, /mergeCaptures/);
  assert.match(app, /enrichProfileCapture/);
  assert.match(app, /enrichInventoryCapture/);
  assert.match(app, /enrichTowerCapture/);
  assert.match(app, /enrichMasteryCapture/);
  assert.match(app, /enrichQuestCapture/);
  assert.match(app, /enrichPerkCapture/);
  assert.match(app, /enrichFarmSupplyCapture/);
  assert.match(app, /parseProfilePage/);
  assert.match(app, /parseInventoryPage/);
  assert.match(app, /parseTowerPage/);
  assert.match(app, /parseMasteryPage/);
  assert.match(app, /parseQuestDashboard/);
  assert.match(app, /parseCompletedQuestPage/);
  assert.match(app, /parsePerkPage/);
  assert.match(app, /parseFarmSupplyOverview/);
  assert.match(app, /entry\.owned === true/);
  assert.match(app, /infrastructure\.ironDepot === true/);
  assert.match(app, /Nothing leaves this device|file\.text\(\)/);
});

test("collector recognizes the live supply.php route and records Supply DOM controls", () => {
  const collector = readFileSync(new URL("collectors/account-importer/capture-current-page.js", root), "utf8");
  assert.match(collector, /supply\\\.php/);
  assert.match(collector, /extractFarmSupplyRows/);
  assert.match(collector, /goldCost/);
  assert.match(collector, /rawTitle\.split/);
});

test("collector records ordered Craftworks items and their current blockers", () => {
  const collector = readFileSync(new URL("collectors/account-importer/capture-current-page.js", root), "utf8");
  assert.match(collector, /"craftworks", "Craftworks"/);
  assert.match(collector, /function extractCraftworksRows/);
  assert.match(collector, /blockedBy/);
  assert.match(collector, /inventoryQuantity/);
});

test("collector prioritizes pets.php over Town navigation and records pet card identity", () => {
  const collector = readFileSync(new URL("collectors/account-importer/capture-current-page.js", root), "utf8");
  assert.match(collector, /pets\?\\\.php/);
  assert.match(collector, /function extractPetRows/);
  assert.match(collector, /imageAlt/);
  assert.match(collector, /petKey/);
  assert.match(collector, /node\.children\.length === 0/);
  assert.match(collector, /if \(pageType === "profile"\)/);
  assert.match(collector, /"Tiger Shark"/);
  assert.match(app, /function enrichPetCapture/);
  assert.match(app, /wolfOnlyAvailable/);
});

test("Friendship captures repair npclevels.php and remove navigation quests", () => {
  const collector = readFileSync(new URL("collectors/account-importer/capture-current-page.js", root), "utf8");
  assert.match(collector, /npclevels/);
  assert.match(collector, /function parseFriendshipPage/);
  assert.match(app, /function enrichFriendshipCapture/);
  assert.match(app, /delete capture\.fields\.quests/);
  assert.match(collector, /\^Next Rewards at\$/);
});

test("Kitchen captures repair kitchen.php and preserve ovens and Fruit Punch", () => {
  const collector = readFileSync(new URL("collectors/account-importer/capture-current-page.js", root), "utf8");
  assert.match(collector, /"kitchen", "My Kitchen"/);
  assert.match(collector, /function parseKitchenPage/);
  assert.match(app, /function enrichKitchenCapture/);
  assert.match(app, /fruitPunchLeft/);
});

test("Iron and Nails use Store automatically unless Iron Depot covers them", () => {
  assert.match(app, /const isDepotItem = item\.name === "Iron" \|\| item\.name === "Nails"/);
  assert.match(app, /isDepotItem && vendor/);
  assert.match(app, /normal supply route when Iron Depot is not enabled/);
});

/* Farm RPG account importer — local tests. No dependencies: run with
 *   node tests/run-tests.js
 * All account data used here is invented (fake fixtures). */
"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const numbers = require("../shared/numbers.js");
const sanitize = require("../shared/sanitize.js");
const schema = require("../shared/schema.js");
const merge = require("../shared/merge.js");

const FIXTURE_DIR = path.join(__dirname, "fixtures");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("PASS  " + name);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log("FAIL  " + name + "\n      " + (err && err.message ? err.message : err));
  }
}

function loadFixture(file) {
  const text = fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8");
  return { text, parsed: JSON.parse(text) };
}

function importFixture(file) {
  const { text, parsed } = loadFixture(file);
  const result = schema.validateCapture(parsed, text.length);
  assert.strictEqual(result.ok, true, file + " should validate: " + result.errors.join("; "));
  result.capture._fileName = file;
  return result;
}

/* ---------- 1. compact number parsing ---------- */
test("compact numbers: 1,234 / 1.2K / 1.25M / 2.4B / 3T", () => {
  assert.strictEqual(numbers.parseQuantity("1,234").value, 1234);
  assert.strictEqual(numbers.parseQuantity("1.2K").value, 1200);
  assert.strictEqual(numbers.parseQuantity("1.25M").value, 1250000);
  assert.strictEqual(numbers.parseQuantity("2.4B").value, 2400000000);
  assert.strictEqual(numbers.parseQuantity("3T").value, 3000000000000);
  assert.strictEqual(numbers.parseQuantity("950").value, 950);
  assert.strictEqual(numbers.parseQuantity("-5").value, -5);
});

test("compact numbers: non-quantities are rejected, never guessed", () => {
  assert.strictEqual(numbers.parseQuantity("hello"), null);
  assert.strictEqual(numbers.parseQuantity(""), null);
  assert.strictEqual(numbers.parseQuantity(null), null);
  assert.strictEqual(numbers.parseQuantity("1.2.3K"), null);
  assert.strictEqual(numbers.parseQuantity("Level 12"), null);
});

/* ---------- 2. large-number safety ---------- */
test("large numbers beyond MAX_SAFE_INTEGER stay exact strings", () => {
  const big = numbers.parseQuantity("9,007,199,254,740,993"); // MAX_SAFE_INTEGER + 2
  assert.strictEqual(typeof big.value, "string");
  assert.strictEqual(big.value, "9007199254740993");
  const huge = numbers.parseQuantity("100000T");
  assert.strictEqual(typeof huge.value, "string");
  assert.strictEqual(huge.value, "100000000000000000");
  const atLimit = numbers.parseQuantity("9,007,199,254,740,991"); // MAX_SAFE_INTEGER
  assert.strictEqual(typeof atLimit.value, "number");
  assert.strictEqual(atLimit.value, Number.MAX_SAFE_INTEGER);
});

test("formatCompact / formatExact round-trip huge values without loss", () => {
  assert.strictEqual(numbers.formatCompact(15500), "15.5K");
  assert.strictEqual(numbers.formatCompact(1250000), "1.2M");
  assert.strictEqual(numbers.formatCompact("100000000000000000000"), "1e20");
  assert.strictEqual(numbers.formatExact("100000000000000000000"), "100,000,000,000,000,000,000");
  assert.strictEqual(numbers.formatExact(12400), "12,400");
});

/* ---------- 3. newest-capture-wins ---------- */
test("newest capture wins for scalar fields", () => {
  const older = importFixture("fake-01-profile.capture.json").capture;
  const newer = JSON.parse(JSON.stringify(older));
  newer.capturedAt = "2026-08-25T10:00:00.000Z";
  newer.fields.levels.tower = { value: 205, raw: "205", confidence: "visible-label" };
  const snapshot = merge.mergeCaptures([older, newer], { now: "2026-08-26T00:00:00.000Z" });
  assert.strictEqual(snapshot.levels.tower, 205);
  assert.strictEqual(snapshot.provenance["levels.tower"].capturedAt, "2026-08-25T10:00:00.000Z");
});

test("null never overwrites a known value", () => {
  const older = importFixture("fake-01-profile.capture.json").capture;
  const newer = JSON.parse(JSON.stringify(older));
  newer.capturedAt = "2026-08-25T10:00:00.000Z";
  delete newer.fields.levels; // newer capture simply lacks levels
  const snapshot = merge.mergeCaptures([older, newer], { now: "2026-08-26T00:00:00.000Z" });
  assert.strictEqual(snapshot.levels.tower, 201);
  assert.strictEqual(snapshot.levels.farming, 55);
});

test("same-timestamp scalar conflicts are kept as warnings", () => {
  const a = importFixture("fake-01-profile.capture.json").capture;
  const b = JSON.parse(JSON.stringify(a));
  b.fields.levels.tower = { value: 999, raw: "999", confidence: "visible-label" };
  const snapshot = merge.mergeCaptures([a, b], { now: "2026-08-26T00:00:00.000Z" });
  assert.ok(
    snapshot.warnings.some((w) => w.includes("levels.tower")),
    "expected a conflict warning for levels.tower"
  );
});

/* ---------- 4. inventory duplicate merging ---------- */
test("inventory merges by normalized exact name; newer wins; nulls kept", () => {
  const older = importFixture("fake-02-inventory-older.capture.json").capture;
  const newer = importFixture("fake-03-inventory-newer.capture.json").capture;
  const snapshot = merge.mergeCaptures([older, newer], { now: "2026-08-26T00:00:00.000Z" });
  const byName = new Map(snapshot.inventory.map((i) => [sanitize.normalizeName(i.name), i]));

  assert.strictEqual(byName.get("wood").quantity, 15500, "newer Wood quantity wins");
  assert.ok(byName.has("wooden plank"), "Wooden Plank must NOT merge into Wood");
  assert.strictEqual(byName.get("wooden plank").quantity, 40);
  assert.strictEqual(byName.get("board").quantity, 5000, "null quantity in newer capture must not erase 5,000");
  assert.strictEqual(byName.get("iron").locked, true);
  assert.strictEqual(byName.get("iron").itemId, 990011);
  // The trailing-space "wood  " entry (same normalized name) must not create a second row.
  assert.strictEqual(snapshot.inventory.filter((i) => sanitize.normalizeName(i.name) === "wood").length, 1);
});

test("inventory huge quantities stay exact strings through the merge", () => {
  const newer = importFixture("fake-03-inventory-newer.capture.json").capture;
  const snapshot = merge.mergeCaptures([newer], { now: "2026-08-26T00:00:00.000Z" });
  const orb = snapshot.inventory.find((i) => i.name === "Glass Orb");
  assert.strictEqual(orb.quantity, "100000000000000000000");
  // And the export must survive a JSON round-trip unchanged.
  const roundTripped = JSON.parse(JSON.stringify(snapshot));
  assert.strictEqual(roundTripped.inventory.find((i) => i.name === "Glass Orb").quantity, "100000000000000000000");
});

/* ---------- 5. quest status separation ---------- */
test("quest buckets follow explicit statuses; disappearance never completes", () => {
  const available = importFixture("fake-04-quests-available.capture.json").capture;
  const completed = importFixture("fake-05-quests-completed.capture.json").capture;
  const snapshot = merge.mergeCaptures([available, completed], { now: "2026-08-26T00:00:00.000Z" });

  assert.strictEqual(snapshot.quests.completed.length, 2);
  assert.ok(snapshot.quests.completed.some((q) => q.title === "Low On Coal"));
  assert.ok(snapshot.quests.completed.some((q) => q.title === "Befriending Buddy"));
  assert.ok(
    snapshot.quests.available.some((q) => q.title === "A Towering Investment"),
    "quest still only seen as available must stay available"
  );
  assert.ok(
    !snapshot.quests.active.some((q) => q.title === "Low On Coal") &&
      !snapshot.quests.available.some((q) => q.title === "Low On Coal"),
    "completed quest must appear only in the completed bucket"
  );
  const coal = snapshot.quests.completed.find((q) => q.title === "Low On Coal");
  assert.strictEqual(coal.requiredItems[0].need, 200, "requirement details survive the status change");
  assert.ok(coal.history.length >= 2, "quest keeps its status history");
});

/* ---------- 6. unknown values stay null ---------- */
test("unseen fields remain null and are listed as missing", () => {
  const questsOnly = importFixture("fake-04-quests-available.capture.json").capture;
  const snapshot = merge.mergeCaptures([questsOnly], { now: "2026-08-26T00:00:00.000Z" });
  assert.strictEqual(snapshot.levels.tower, null);
  assert.strictEqual(snapshot.balances.silver, null);
  assert.strictEqual(snapshot.capacity.inventoryMaximum, null);
  assert.ok(snapshot.unknownFields.includes("levels.tower"));
  assert.ok(snapshot.unknownFields.includes("balances.silver"));
  assert.ok(snapshot.unknownFields.includes("inventory (no items captured)"));
});

/* ---------- 7. malformed capture rejection ---------- */
test("malformed captures are rejected with clear errors", () => {
  assert.strictEqual(schema.validateCapture(null, 10).ok, false);
  assert.strictEqual(schema.validateCapture([], 10).ok, false);
  assert.strictEqual(
    schema.validateCapture({ schema: "something-else", capturedAt: "2026-08-21T10:00:00.000Z" }, 10).ok,
    false
  );
  assert.strictEqual(
    schema.validateCapture({ schema: "farmrpg-page-capture-v1" }, 10).ok,
    false,
    "missing capturedAt must fail"
  );
  assert.strictEqual(
    schema.validateCapture(
      { schema: "farmrpg-page-capture-v1", capturedAt: "2026-08-21T10:00:00.000Z", fields: [1, 2] },
      10
    ).ok,
    false,
    "fields as array must fail"
  );
  assert.strictEqual(
    schema.validateCapture(
      { schema: "farmrpg-page-capture-v1", capturedAt: "2026-08-21T10:00:00.000Z" },
      6 * 1024 * 1024
    ).ok,
    false,
    "oversized files must fail"
  );
  assert.strictEqual(
    schema.validateCapture({
      schema: "farmrpg-page-capture-v1",
      capturedAt: "2026-08-21T10:00:00.000Z",
      fields: { inventory: ["not-an-object"] },
    }, 100).ok,
    false,
    "malformed nested inventory entries must fail"
  );
  assert.strictEqual(
    schema.validateCapture({
      schema: "farmrpg-page-capture-v1",
      capturedAt: "2026-08-21T10:00:00.000Z",
      fields: { levels: { tower: 200 } },
    }, 100).ok,
    false,
    "scalar fields require evidence objects"
  );
});

test("legacy bridge exports only explicitly owned bonuses", () => {
  const snapshot = schema.emptySnapshot();
  snapshot.generatedAt = "2026-08-26T00:00:00.000Z";
  snapshot.perks = [
    { name: "Definitely Owned", owned: true },
    { name: "Unknown Ownership", owned: null },
    { name: "Definitely Not Owned", owned: false },
  ];
  const legacy = merge.buildLegacyV1(snapshot);
  assert.deepStrictEqual(legacy.perks, ["Definitely Owned"]);
});

/* ---------- 8. URL parameter removal ---------- */
test("capture URLs are stripped of query strings and sensitive fragments", () => {
  assert.strictEqual(
    sanitize.sanitizeUrl("https://farmrpg.com/inventory.php?token=abc123&sid=42"),
    "https://farmrpg.com/inventory.php"
  );
  assert.strictEqual(
    sanitize.sanitizeUrl("https://farmrpg.com/index.php#!/inventory"),
    "https://farmrpg.com/index.php#!/inventory",
    "plain client-side route fragments may stay"
  );
  assert.strictEqual(
    sanitize.sanitizeUrl("https://farmrpg.com/index.php#token=abc123"),
    "https://farmrpg.com/index.php",
    "fragments carrying key=value data are dropped"
  );
  assert.strictEqual(
    sanitize.sanitizeUrl("https://farmrpg.com/index.php#!/inventory%3Ftoken%3Dabc123"),
    "https://farmrpg.com/index.php",
    "percent-encoded secret data in a route fragment is dropped"
  );
  assert.strictEqual(sanitize.sanitizeUrl("not a url"), "unknown");
  assert.strictEqual(sanitize.sanitizeUrl("javascript:alert(1)"), "unknown");

  // The legacy fixture carries ?token=... — validation must strip it.
  const legacy = schema.validateCapture(
    loadFixture("fake-07-legacy-visible-page.capture.json").parsed,
    100
  );
  assert.strictEqual(legacy.ok, true);
  assert.strictEqual(legacy.capture.url, "https://farmrpg.com/somepage.php");
  assert.strictEqual(legacy.capture.pageType, "unknown");
  assert.ok(legacy.warnings.some((w) => w.includes("Legacy raw-text export")));
});

/* ---------- 9. fallback text sanitization ---------- */
test("visible text is redacted, whitespace-collapsed and capped", () => {
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
  const dirty = "Hello   " + jwt + "   world\n\n\n\ntoken=supersecretvalue123\nsession_id: abcdef123456\n" + "A".repeat(60);
  const clean = sanitize.sanitizeVisibleText(dirty, 40000);
  assert.ok(!clean.includes("eyJhbGci"), "JWT must be redacted");
  assert.ok(!clean.includes("supersecretvalue123"), "token= value must be redacted");
  assert.ok(!clean.includes("abcdef123456"), "session_id value must be redacted");
  assert.ok(!clean.includes("A".repeat(60)), "long opaque blob must be redacted");
  assert.ok(!/\n{3,}/.test(clean), "blank runs are collapsed");
  assert.ok(!/ {2,}/.test(clean), "space runs are collapsed");
  const capped = sanitize.sanitizeVisibleText("lorem ipsum dolor sit amet ".repeat(2000), 1000);
  assert.ok(capped.length <= 1015 && capped.includes("[…truncated]"), "length cap applies");
});

/* ---------- 10. end-to-end fixture merge ---------- */
test("all fake fixtures merge into one consistent snapshot", () => {
  const files = [
    "fake-01-profile.capture.json",
    "fake-02-inventory-older.capture.json",
    "fake-03-inventory-newer.capture.json",
    "fake-04-quests-available.capture.json",
    "fake-05-quests-completed.capture.json",
    "fake-06-masteries-perks-infra.capture.json",
    "fake-07-legacy-visible-page.capture.json",
  ];
  const captures = files.map((f) => importFixture(f).capture);
  const snapshot = merge.mergeCaptures(captures, { now: "2026-08-26T00:00:00.000Z" });

  assert.strictEqual(snapshot.schemaVersion, "farmrpg-account-snapshot-v1");
  assert.strictEqual(snapshot.player.name, "FixtureFarmer");
  assert.strictEqual(snapshot.levels.tower, 201);
  assert.strictEqual(snapshot.balances.silver, 1250000);
  assert.strictEqual(snapshot.capacity.inventoryMaximum, 5000);
  assert.strictEqual(Object.keys(snapshot.consumables).length, 7);
  assert.strictEqual(snapshot.consumables["Large Net"].quantity, 140);
  assert.strictEqual(snapshot.inventory.length, 5);
  assert.strictEqual(snapshot.masteries.length, 2);
  assert.strictEqual(snapshot.perks.length, 2);
  assert.strictEqual(snapshot.farmSupply.length, 1);
  assert.strictEqual(snapshot.artifacts.length, 1);
  assert.strictEqual(snapshot.infrastructure.ironDepot, true);
  assert.strictEqual(snapshot.infrastructure.sawmill.level, 12);
  assert.strictEqual(snapshot.infrastructure.quarry.coalPerHour, 45);
  assert.strictEqual(snapshot.infrastructure.storehouse.level, 8);
  assert.strictEqual(snapshot.captures.length, 7);
  assert.strictEqual(snapshot.provenance["levels.tower"].sourcePage, "profile");
  assert.strictEqual(snapshot.provenance["levels.tower"].confidence, "visible-label");

  // Export must be valid JSON (this is what the Export button writes).
  snapshot.legacyV1 = merge.buildLegacyV1(snapshot);
  const exported = JSON.stringify(snapshot, null, 2);
  const reparsed = JSON.parse(exported);
  assert.strictEqual(reparsed.schemaVersion, "farmrpg-account-snapshot-v1");
  assert.strictEqual(reparsed.legacyV1.schema, "farmrpg-account-v1");
  assert.strictEqual(reparsed.legacyV1.towerLevel, 201);
  assert.strictEqual(reparsed.legacyV1.skills.farming, 55);
  assert.strictEqual(reparsed.legacyV1.inventoryCapacity, 5000);
  assert.strictEqual(reparsed.legacyV1.inventory.Wood, 15500);
  assert.strictEqual(reparsed.legacyV1.masteries.Board, 12345);
  assert.deepStrictEqual(reparsed.legacyV1.completedQuestTitles.sort(), ["Befriending Buddy", "Low On Coal"]);
  assert.strictEqual(reparsed.legacyV1.dailyIncome["Apple Cider"], 12);
});

/* ---------- 11. inventory-page layout parser (fake sample, real layout) ---------- */
test("inventory-page layout: craftable list, meals, items, capacity, level", () => {
  const textparse = require("../shared/textparse.js");
  // Entirely fake sample that mirrors the real "My Inventory" page layout.
  const fakeText = [
    "My Inventory",
    "Items that you can craft are below. Your Crafting Level is",
    "12",
    ".",
    "Favorite Items",
    "heart_fill",
    "Fake Plank",
    "(7)",
    "900 /",
    "3",
    "Fake Wood",
    "heart_fill",
    "Fake Hammer",
    "(0)",
    "2 / 5 Fake Nail",
    "heart_fill",
    "Fake Hay",
    "A fake description line sits here",
    "(900)",
    "0 / 2 Fake Straw",
    "Currently, you cannot have more than",
    "900",
    "of any single thing.",
    "Sort Options:",
    "Item Name",
    ",",
    "Meals",
    "chevron_down",
    "Fake Soup",
    "Tastes completely imaginary",
    "42",
    "Fake Pie",
    "A pretend dessert",
    "Mastered",
    "18",
    "Items",
    "chevron_down",
    "Fake Wood",
    "Pretend timber",
    "MAX ON HAND",
    "Mega Mastered",
    "900",
    "Fake Gem",
    "Shiny but fake",
    "13",
    "3-leaf Clover",
    "A fake snack for hoofed animals",
    "MAX ON HAND",
    "Mega Mastered",
    "900",
    "Fake Countless",
    "Description but no count anywhere",
    "Inventory Stats",
    "Your inventory contains",
    "7",
    "unique items and",
    "1,234",
    "items in total.",
  ].join("\n");
  const lines = fakeText.split("\n");
  assert.ok(textparse.looksLikeInventoryPage(lines, fakeText));
  const r = textparse.parseInventoryPage(lines, fakeText);
  assert.strictEqual(r.capacityMax, "900");
  assert.strictEqual(r.craftingLevel, "12");
  assert.strictEqual(r.inventoryStats.uniqueItems, "7");
  assert.strictEqual(r.inventoryStats.totalItems, "1,234");

  const inv = new Map(r.inventory.map((i) => [i.name, i]));
  assert.strictEqual(inv.get("Fake Plank").quantity, "7", "craftable (qty) read");
  assert.strictEqual(inv.get("Fake Hammer").quantity, "0", "explicit zero is kept");
  assert.strictEqual(inv.get("Fake Wood").quantity, "900", "split have/need line read");
  assert.strictEqual(inv.get("Fake Nail").quantity, "2", "inline have/need line read");
  assert.strictEqual(inv.get("Fake Gem").quantity, "13");
  assert.strictEqual(inv.get("Fake Hay").quantity, "900", "name found above a description line");
  assert.strictEqual(inv.get("3-leaf Clover").quantity, "900", "digit-leading item names are captured");
  assert.ok(!inv.has("A fake snack for hoofed animals"), "descriptions never become items");
  assert.ok(!inv.has("A fake description line sits here"), "descriptions never become items");
  assert.ok(!inv.has("Fake Countless"), "entry without a visible count is skipped, never invented");
  assert.ok(!inv.has("heart_fill"), "icon ligatures are ignored");
  assert.strictEqual(textparse.isPlausibleName("Piñata"), true, "Unicode item names are supported");
  assert.strictEqual(textparse.isPlausibleName("R.O.A.S."), true, "period-delimited item names are supported");
  assert.strictEqual(textparse.isPlausibleName("Roomba’s Locket"), true, "curly apostrophes are supported");

  const meals = new Map(r.consumables.map((c) => [c.name, c]));
  assert.strictEqual(meals.get("Fake Soup").quantity, "42");
  assert.strictEqual(meals.get("Fake Pie").quantity, "18");
  assert.strictEqual(meals.get("Fake Pie").kind, "meal");

  const mast = new Map(r.masteries.map((m) => [m.itemName, m.status]));
  assert.strictEqual(mast.get("Fake Pie"), "Mastered");
  assert.strictEqual(mast.get("Fake Wood"), "Mega Mastered");
});

/* ---------- 12. profile-page layout parser (sanitized real shape) ---------- */
test("profile-page layout: identity, start date, farm name and active effects", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "Player Profile",
    "Active Effects (",
    "4 / 5",
    ")",
    "Acorn Pie",
    "A description that must not become an item",
    "115 uses left",
    "Hickory Omelette",
    "Produces more from a building",
    "44 min, 27 sec",
    "Mushroom Stew",
    "+10% Mastery",
    "42 sec",
    "Neigh",
    "Cider uses less stamina",
    "5 min",
    "Completed",
    "Farm Name: Fixture Acres",
    "Current server time: 10:16 AM - Wednesday, August 26",
    "FixtureFarmer",
    "Fixture Acres",
    "Master Farmer",
    "Jun 8, 2022",
    "Started",
    "Journey",
    "8",
    "JUN 2022",
    "Joined Farm RPG",
  ];
  const parsed = textparse.parseProfilePage(lines, lines.join("\n"));
  assert.strictEqual(parsed.player.name, "FixtureFarmer");
  assert.strictEqual(parsed.player.farmName, "Fixture Acres");
  assert.strictEqual(parsed.player.accountCreated, "Jun 8, 2022");
  assert.strictEqual(parsed.activeEffects.length, 4);
  assert.strictEqual(parsed.activeEffects.find((x) => x.name === "Acorn Pie").uses, "115");
  assert.strictEqual(parsed.activeEffects.find((x) => x.name === "Hickory Omelette").remaining, "44 min, 27 sec");
  assert.strictEqual(parsed.activeEffects.find((x) => x.name === "Mushroom Stew").remaining, "42 sec");
  assert.strictEqual(parsed.activeEffects.find((x) => x.name === "Neigh").remaining, "5 min");
  assert.notStrictEqual(parsed.player.accountCreated, "Farm RPG");
});

/* ---------- 13. Tower layout parser (sanitized real shape) ---------- */
test("Tower layout: costs, next rewards and claimed-floor history", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "About the Tower",
    "You currently have", "3,171", "Ascension Knowledge",
    "Currently, you are at", "1,375,000,000", "Silver generated daily.",
    "Tower Progress",
    "Level", "276", "Cost: 100 AK", "82.80", "B", "Silver", "Mega Masteries:",
    "Level Rewards:", "Inferno Sphere", "(x2760)", "Lava Sphere", "(x2760)", "Lemon Seltzer", "(x2)",
    "Level", "275", "18 Jun 2026", "You are here with other players...", "You got:",
    "Green Cloak", "(x2750)", "Cabbage", "(x2750)", "Borgen Bag 01", "(x27)",
    "Level", "274", "10 May 2026", "You got:",
    "Small Chest 01", "(x2740)", "Treasure Key", "(x2740)", "Orange Juice", "(x2740)",
    "Ground Floor",
  ];
  const parsed = textparse.parseTowerPage(lines, lines.join("\n"));
  assert.strictEqual(parsed.currentLevel, "275");
  assert.strictEqual(parsed.ascensionKnowledge, "3,171");
  assert.strictEqual(parsed.dailySilver, "1,375,000,000");
  assert.strictEqual(parsed.nextLevel, "276");
  assert.strictEqual(parsed.nextAkCost, "100");
  assert.strictEqual(parsed.nextSilverCost, "82.80B");
  assert.strictEqual(parsed.nextMegaMasteries, null, "blank requirement remains unknown");
  assert.deepStrictEqual(parsed.nextRewards.map((reward) => reward.name), ["Inferno Sphere", "Lava Sphere", "Lemon Seltzer"]);
  assert.strictEqual(parsed.history.length, 2);
  assert.strictEqual(parsed.history[0].current, true);
  assert.strictEqual(parsed.history[0].rewards[2].quantity, "27");
});

test("Tower fields merge into an account snapshot without losing reward detail", () => {
  const capture = {
    capturedAt: "2026-08-26T13:17:37.000Z",
    pageType: "tower", pageLabel: "Tower", url: "https://farmrpg.com/index.php#!/tower", title: "Tower", warnings: [],
    fields: {
      towerProgress: {
        currentLevel: { value: 275, raw: "275", confidence: "visible-label" },
        ascensionKnowledge: { value: 3171, raw: "3,171", confidence: "visible-label" },
        dailySilver: { value: 1375000000, raw: "1,375,000,000", confidence: "visible-label" },
        nextLevel: { value: 276, raw: "276", confidence: "visible-label" },
        nextAkCost: { value: 100, raw: "100", confidence: "visible-label" },
        nextSilverCost: { value: 82800000000, raw: "82.80B", confidence: "visible-label" },
        nextRewards: [{ name: "Lemon Seltzer", quantity: { value: 2, raw: "2", confidence: "visible-label" } }],
        history: [{ level: { value: 275, raw: "275", confidence: "visible-label" }, date: "18 Jun 2026", current: true, rewards: [] }],
      },
    },
  };
  const snapshot = merge.mergeCaptures([capture], { now: "2026-08-26T14:00:00.000Z" });
  assert.strictEqual(snapshot.towerProgress.currentLevel, 275);
  assert.strictEqual(snapshot.towerProgress.nextSilverCost, 82800000000);
  assert.strictEqual(snapshot.towerProgress.nextRewards[0].name, "Lemon Seltzer");
  assert.strictEqual(snapshot.towerProgress.history[0].date, "18 Jun 2026");
});

/* ---------- 14. Mastery layout parser (sanitized real shape) ---------- */
test("Mastery layout: cumulative totals, tiers and exact next thresholds", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "So far, you have", "3", "items Mastered,", "2", "items Grand Mastered and", "1", "items Mega Mastered",
    "Mastery In-Progress", "Stop Tracking All",
    "Tier V (MM)", "chevron_down", "Fake Lobster", "997,655 / 1,000,000 Progress", "99.7655%",
    "Tier IV (GM)", "chevron_down", "Fake Tea", "90,869 / 100,000 Progress", "90.869%",
    "Tier III (M)", "chevron_down", "Fake Monitor", "9,415 / 10,000 Progress", "94.15%",
    "Mega Mastered", "Fake Board", "3,000,040 / ∞ Progress",
  ];
  const parsed = textparse.parseMasteryPage(lines, lines.join("\n"));
  assert.deepStrictEqual(parsed.stats, { mastered: "3", grandMastered: "2", megaMastered: "1" });
  assert.strictEqual(parsed.masteries.length, 4);
  assert.strictEqual(parsed.masteries[0].itemName, "Fake Lobster");
  assert.strictEqual(parsed.masteries[0].progressTarget, "1,000,000");
  assert.strictEqual(parsed.masteries[0].megaMastery, false);
  assert.strictEqual(parsed.masteries[1].grandMastery, false);
  assert.strictEqual(parsed.masteries[2].mastered, false);
  assert.strictEqual(parsed.masteries[3].megaMastery, true);
  assert.strictEqual(parsed.masteries[3].progressTarget, null);
});

test("effect parser prefers the live countdown over descriptive duration text", () => {
  const textparse = require("../shared/textparse.js");
  const lines = ["Active Effects (", "1 / 5", ")", "Neigh", "Cider uses less stamina", "for 5 minutes", "2 min, 52 sec", "Completed"];
  const parsed = textparse.parseProfilePage(lines, lines.join("\n"));
  assert.strictEqual(parsed.activeEffects[0].remaining, "2 min, 52 sec");
});

/* ---------- 15. Help Requests dashboard parser ---------- */
test("request dashboard separates available and active quests from navigation", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "Special Requests (2)",
    "Fake Mystery I", "Available", "Aug 17 - Aug 31",
    "Tomato Infestation!", "Available", "Jun 1 - Aug 31", "9%",
    "Active Requests (2)", "Sort:", "Comp%", ",", "NPC", ",", "Title", ",", "Default",
    "Distant Fiction I", "Request from Buddy", "54.03%",
    "Book of Fake Mastery III", "Request from Lorn -", "Side Request",
    "Personal Requests (0)",
    "Requests Completed", "1,947", "Personal Completed", "1,111",
  ];
  const parsed = textparse.parseQuestDashboard(lines, lines.join("\n"));
  assert.deepStrictEqual(parsed.stats, {
    specialAvailable: "2", active: "2", personalAvailable: "0",
    requestsCompleted: "1,947", personalCompleted: "1,111",
  });
  assert.strictEqual(parsed.quests.length, 4);
  assert.strictEqual(parsed.quests.filter((quest) => quest.status === "available").length, 2);
  assert.strictEqual(parsed.quests.find((quest) => quest.title === "Tomato Infestation!").progressPercent, "9");
  assert.strictEqual(parsed.quests.find((quest) => quest.title === "Distant Fiction I").giver, "Buddy");
  assert.strictEqual(parsed.quests.find((quest) => quest.title === "Book of Fake Mastery III").chain, "Side Request");
  assert.ok(!parsed.quests.some((quest) => quest.title === "Default"));
});

/* ---------- 16. completed Quest Diary parser ---------- */
test("completed diary captures real titles, wrapped titles, quest type and truncation", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "Completed Requests (3)",
    "Simple Fake Quest", "Request from Mariya", "Completed on 2026-08-24 15:09:41", "1,028 players (0.09%) have completed", "check",
    "Pleasantly Long Fake", "Quest Name II", "Request from Borgen", "Completed on 2026-08-23 12:00:00", "4,000 players (0.4%) have completed", "check",
    "Fake Main Chain I", "Request from Lorn -", "Main Quest", "Completed on 2026-08-22 11:00:00", "5,000 players (0.5%) have completed", "check",
    "Fake Story I", "Request from Buddy -", "Listen", "Completed on 2026-08-21 10:00:00", "6,000 players (0.6%) have completed", "check",
    "[…truncated]",
  ];
  const parsed = textparse.parseCompletedQuestPage(lines, lines.join("\n"));
  assert.strictEqual(parsed.stats.completedListed, "3");
  assert.strictEqual(parsed.stats.completedCaptured, 4);
  assert.strictEqual(parsed.stats.completedHistoryTruncated, true);
  assert.strictEqual(parsed.quests[1].title, "Pleasantly Long Fake Quest Name II");
  assert.strictEqual(parsed.quests[2].giver, "Lorn");
  assert.strictEqual(parsed.quests[2].chain, "Main Quest");
  assert.strictEqual(parsed.quests[3].chain, "Listen");
  assert.strictEqual(parsed.quests[0].completionDate, "2026-08-24 15:09:41");
  assert.strictEqual(parsed.quests[0].communityCompletions, "1,028");
});

/* ---------- 17. Perks page parser ---------- */
test("Perks page captures canonical names, multiline effects, stats and artifact requirements", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "My Perk Sets", "123", "Fishing",
    "51", "Points Left", "815", "Points Used", "10", "Perks Avail", "58", "Times Reset",
    "Farming Perks", "Quicker Farming I", "Crops grow 5% faster",
    "Crafting Perks", "Resource Saver I", "10% chance item is duplicated", "during crafting or resources", "are returned if max inventory",
    "Artifact Perks", "Bonus Crops", "Harvesting crops yields bonus crops", "of equal or lesser value", "Requires Tower Level 250",
    "450,000,000,000", "Mastery Progress",
  ];
  const parsed = textparse.parsePerkPage(lines, lines.join("\n"));
  assert.deepStrictEqual(parsed.stats, {
    pointsLeft: "51", pointsUsed: "815", perksAvailable: "10", timesReset: "58",
    activeSetId: "123", activeSetName: "Fishing",
  });
  assert.strictEqual(parsed.perks.length, 3);
  assert.strictEqual(parsed.perks.find((perk) => perk.name === "Resource Saver I").description, "10% chance item is duplicated during crafting or resources are returned if max inventory");
  assert.strictEqual(parsed.perks.find((perk) => perk.name === "Bonus Crops").towerRequirement, "250");
  assert.strictEqual(parsed.perks.find((perk) => perk.name === "Bonus Crops").description, "Harvesting crops yields bonus crops of equal or lesser value");
  assert.ok(parsed.perks.every((perk) => perk.owned === null), "styling-only ownership must remain unknown");
  assert.strictEqual(textparse.inferPerkOwnership(JSON.stringify({ controls: ["Unlocked"] })), true);
  assert.strictEqual(textparse.inferPerkOwnership(JSON.stringify({ controls: ["50 Points"] })), false);
  assert.strictEqual(textparse.inferPerkOwnership(JSON.stringify({ controls: [] })), null);
});

/* ---------- 18. Farm Supply overview parser ---------- */
test("Farm Supply overview captures capacities and passive production rates", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "Storehouse", "Work to increase max inventory", "18 Inventory", "Increase Per Day",
    "Farmhouse", "Rest to increase max stamina", "2 Stamina", "Increase Per Day",
    "Orchard", "Plant trees to produce fruit daily", "9,174 Apples", "9,168 Oranges", "9,183 Lemons",
    "Vineyard", "Grow grapes for wine making", "9,062 Grapes", "Every Day",
    "Sawmill", "Produces Boards/Wood hourly", "60,000 Boards", "48,000 Wood", "4,000 Oak",
    "Ironworks", "Produces Iron/Nails every 3 mins", "1 Iron", "3 Nails",
    "Quarry", "Stone/Gems every 10 mins", "8,000 Stone", "48,000 Stone Hourly", "5,000 Coal Hourly",
    "+50 Inventory Cap", "Current Cap is 15,870",
    "+25 Max Stamina", "Current Max is 83,334",
    "+15 Max Mailbox", "Current Max is 450",
    "+1 Active Meal Effect", "Current Max is 5",
  ];
  const parsed = textparse.parseFarmSupplyOverview(lines, lines.join("\n"));
  assert.strictEqual(parsed.capacityMax, "15,870");
  assert.strictEqual(parsed.staminaMax, "83,334");
  assert.deepStrictEqual(parsed.supplyStats, { maxMailbox: "450", activeMealEffects: "5" });
  assert.deepStrictEqual(parsed.infrastructure.sawmill, { boardsPerHour: "60,000", woodPerHour: "48,000", oakPerHour: "4,000" });
  assert.deepStrictEqual(parsed.infrastructure.quarry, { stonePer10Minutes: "8,000", stonePerHour: "48,000", coalPerHour: "5,000" });
  assert.deepStrictEqual(parsed.infrastructure.ironworks, { ironPer3Minutes: "1", nailsPer3Minutes: "3" });
});

/* ---------- 19. Friendship page parser ---------- */
test("Friendship page captures people without treating reward labels as townsfolk", () => {
  const textparse = require("../shared/textparse.js");
  const lines = [
    "Current Levels", "Thomas", "is the Townsfolk of the Day! Any items you give to", "Thomas", "today will be 2x Friendship XP.",
    "Sort Options:", "Rosalie", "Level 57", "Next Rewards at", "Level 60",
    "Thomas", "Level 43", "George", "Level 99", "Drink Baba Cola",
  ];
  const parsed = textparse.parseFriendshipPage(lines, lines.join("\n"));
  assert.strictEqual(parsed.townsfolkOfDay, "Thomas");
  assert.strictEqual(parsed.friendships.length, 3);
  assert.deepStrictEqual(parsed.friendships.map((person) => person.name), ["Rosalie", "Thomas", "George"]);
  assert.strictEqual(parsed.friendships[0].nextRewardLevel, "60");
  assert.strictEqual(parsed.friendships[1].townsfolkOfDay, true);
});

/* ---------- 20. Kitchen page parser ---------- */
test("Kitchen page captures cooking level, ovens and Fruit Punch", () => {
  const textparse = require("../shared/textparse.js");
  const lines = ["My Kitchen", "Empty", "Oven #1", "Empty", "Oven #2", "Drink Fruit Punch (2,364 left)", "Your Cooking Skill Level is", "75", "Max ovens currently:", "8", "Add an Oven", "Cooking Level 90 Required", "LOCKED"];
  const parsed = textparse.parseKitchenPage(lines, lines.join("\n"));
  assert.deepStrictEqual(parsed, {
    cookingLevel: "75", ovensOwned: "2", emptyOvens: "2",
    maximumOvensAvailable: "8", nextOvenCookingLevel: "90", fruitPunchLeft: "2,364",
  });
});

/* ---------- summary ---------- */
console.log("\n" + passed + " passed, " + failed + " failed");
if (failed) {
  process.exitCode = 1;
}

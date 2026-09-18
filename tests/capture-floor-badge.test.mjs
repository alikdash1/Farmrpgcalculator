import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The extension's page readers, pulled out of capture-page.js so they can be
// run on the lines a real Farm RPG page produces.
const src = readFileSync(new URL("../collectors/account-sync-extension/capture-page.js", import.meta.url), "utf8");
function grab(name) {
  const i = src.indexOf("  function " + name + "(");
  let depth = 0;
  for (let k = src.indexOf("{", i); k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}" && --depth === 0) return src.slice(i, k + 1);
  }
  throw new Error("missing " + name);
}
const grabConst = (name) => { const i = src.indexOf("  const " + name + " "); return src.slice(i, src.indexOf(";\n", i) + 1); };
const T = eval("(() => {" + ["SUFFIX_EXP", "MAX_SAFE_BIG", "NOISE_LINES", "ICON_WORDS", "NAME_RE", "FARM_BUILDINGS", "FARM_HEADINGS"].map(grabConst).join("\n") +
  ["scalar", "qtyScalar", "extractBalances", "detectPageType", "parseFarmPage", "stripFloor", "parseQty", "isNoise", "isPlainQty", "isPlausibleName", "parseMasteryPage", "parseInventoryPage", "parseQuestDashboard"].map(grab).join("\n") +
  "\nreturn { parseMasteryPage, parseInventoryPage, parseQuestDashboard, extractBalances, detectPageType, isNoise, parseFarmPage }; })()");

test("the Tower floor badge is never read as text", () => {
  // Read as text it became the quantity: Rope = 206 when 9,242 were held.
  assert.match(src, /classList\.contains\("tw-badge"\)\) return NodeFilter\.FILTER_REJECT/);
});

test("mastery rows keep their Tower items, floor or not", () => {
  const lines = ["Mastery In-Progress", "Tier V (MM) chevron_down", "Glass Jar 287", "802,612 / 1,000,000 Progress", "80.26%", "Stop",
    "Runestone 02", "5,000 / 1,000,000 Progress", "0.5%", "Track"];
  const rows = T.parseMasteryPage(lines, lines.join("\n")).masteries;
  assert.deepEqual(rows.map((row) => row.itemName), ["Glass Jar", "Runestone 02"]);
  assert.equal(rows[0].masteryLevel, "Tier V (MM)");
});

test("an inventory name with a floor on it keeps its real count", () => {
  const lines = ["Currently, you cannot have more than 17,004 of any single thing", "Meals", "Items",
    "Wood", "It's better than bad, it's good", "9,242", "Rope 206", "Can tie things together", "Mega Mastered", "9,242", "Inventory Stats"];
  const parsed = T.parseInventoryPage(lines, lines.join("\n"));
  const held = Object.fromEntries(parsed.inventory.map((row) => [row.name, row.quantity]));
  assert.equal(held.Rope, "9,242");
  assert.equal(held["Can tie things together"], undefined);
  assert.deepEqual(parsed.masteries.map((row) => row.itemName), ["Rope"]);
});

test("personal help requests are read", () => {
  const lines = ["Special Requests (1)", "The Hardest Apples To Reach I", "Available", "Sep 17 - Sep 30", "Active Requests (1)",
    "Distant Illusions I", "Request from Buddy", "58.22%", "Personal Requests (1)", "Items Wanted", "Request from Rosalie", "93.58%", "Use a PHR Voucher"];
  const quests = T.parseQuestDashboard(lines, lines.join("\n")).quests;
  assert.deepEqual(quests.map((q) => q.title).sort(), ["Distant Illusions I", "Items Wanted", "The Hardest Apples To Reach I"]);
  assert.equal(quests.find((q) => q.title === "Items Wanted").chain, "Personal Request");
});

test("stamina is read both ways Farm RPG prints it", () => {
  const blank = () => ({ balances: {}, capacity: {} });
  let fields = blank();
  T.extractBalances(["Hire an Expedition to explore for you", "Stamina (80,219,537 / 87,206)"], fields);
  assert.equal(fields.balances.staminaCurrent.value, 80219537);
  assert.equal(fields.balances.staminaMaximum.value, 87206);
  fields = blank();
  T.extractBalances(["Continue...", "80,219,537", "/ 87,206 Stamina", "Eat an Apple"], fields);
  assert.equal(fields.balances.staminaCurrent.value, 80219537);
  assert.equal(fields.balances.staminaMaximum.value, 87206);
});

test("the home card's 'Help Needed' does not make a page the quests page", () => {
  const text = (lines) => lines.join(String.fromCharCode(10));
  assert.notEqual(T.detectPageType(text(["Help Needed", "Special Requests Available!", "11 Left", "The Tower", "My Inventory"]), [])[0], "quests");
  assert.equal(T.detectPageType(text(["Active Requests (8)", "Distant Illusions I"]), [])[0], "quests");
  assert.equal(T.detectPageType(text(["You enter into the forest...", "80,219,537", "/ 87,206 Stamina"]), [])[0], "exploring");
});

test("the item Star is not the star icon", () => {
  assert.equal(T.isNoise("star"), true);
  assert.equal(T.isNoise("Star"), false);
});

test("the farmhouse page is recognised and read", () => {
  const text = ["Rest Bonus: Right now, your stamina cap will increase by", "2", "when you rest. You have", "80,219,537",
    "current stamina and your stamina cap is", "87,206"].join(String.fromCharCode(10));
  assert.equal(T.detectPageType(text, [])[0], "farmhouse");
  assert.ok(src.includes("stamina" + String.fromCharCode(92) + "s*instantly"), "reads what resting gives");
});

test("new items get their picture from their own row, not alt text", () => {
  assert.match(src, /querySelectorAll\("img\.itemimg"\)/);
  assert.match(src, /closest\("\.item-content, li"\)/);
});

test("the farm page gives every building's output", () => {
  const lines = ["Farmhouse", "Rest to increase max stamina", "2 Stamina", "Increase Per Day", "Raptor Pen", "Raise Raptors to hunt daily", "194,810 Antlers",
    "Sawmill", "Produces Boards/Wood hourly", "60,000 Boards", "48,000 Wood", "4,000 Oak", "Ironworks", "Produces Iron/Nails every 3 mins", "1 Iron", "3 Nails",
    "Steelworks", "Produces Steel/Wire hourly", "6,000 Steel", "2,000 Wire", "Hay Field", "Produces Straw every 10 mins", "9,000 Straw", "54,000 Hourly",
    "Quarry", "Stone/Gems every 10 mins", "8,000 Stone", "48,000 Stone Hourly", "5,000 Coal Hourly", "Flour Mill", "Produces Flour from Wheat", "INV FULL"];
  const farm = T.parseFarmPage(lines);
  assert.deepEqual(farm.sawmill, { boards: "60,000", wood: "48,000", oak: "4,000" });
  assert.deepEqual(farm.steelworks, { steel: "6,000", wire: "2,000" });
  assert.deepEqual(farm.hayField, { straw: "9,000", hourly: "54,000" });
  assert.deepEqual(farm.quarry, { stone: "8,000", stoneHourly: "48,000", coalHourly: "5,000" });
  assert.equal(farm.raptorPen, undefined, "a building Setup does not track is left out, not merged into the one above");
  assert.equal(T.detectPageType(lines.join(String.fromCharCode(10)), [])[0], "farm");
});

test("farm and farmhouse captures keep their own type", () => {
  // Unknown types were all stored as "unknown", one slot, so the farm capture
  // overwrote the farmhouse one.
  const schema = readFileSync(new URL("../collectors/account-sync-extension/shared/schema.js", import.meta.url), "utf8");
  assert.match(schema, /"farm",\s*\n\s*"farmhouse",/);
});

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
const T = eval("(() => {" + ["SUFFIX_EXP", "MAX_SAFE_BIG", "NOISE_LINES", "NAME_RE"].map(grabConst).join("\n") +
  ["stripFloor", "parseQty", "isNoise", "isPlainQty", "isPlausibleName", "parseMasteryPage", "parseInventoryPage", "parseQuestDashboard"].map(grab).join("\n") +
  "\nreturn { parseMasteryPage, parseInventoryPage, parseQuestDashboard }; })()");

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

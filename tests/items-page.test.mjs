import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");

const context = {};
context.window = context;
vm.createContext(context);
for (const file of ["data/data.js", "data/extra-items.js", "data/item-info.js"]) {
  vm.runInContext(read(file), context, { filename: file });
}
const items = context.FRPG_DATA.items.items;
const info = context.FRPG_ITEM_INFO.items;

test("every item has a page entry, and nearly all say what they are", () => {
  const missing = items.filter((item) => !info[item.name]).map((item) => item.name);
  assert.equal(missing.join(", "), "");
  const described = items.filter((item) => (info[item.name].desc || "").length > 0);
  assert.ok(described.length >= items.length - 5, `${described.length} of ${items.length} described`);
});

test("Buddy links use Buddy's own spelling, not a guessed one", () => {
  assert.equal(info["Re'taw Pail"].slug, "re-taw-pail");
  assert.equal(info["Ancient Pickaxe"].slug, "ancient-pickaxe");
  for (const item of items) assert.match(info[item.name].slug, /^[a-z0-9-]+$/, item.name);
});

test("descriptions are plain text, with no markup left in them", () => {
  for (const item of items) {
    const desc = info[item.name].desc || "";
    // "<3 Borgen" on the VIP Card is a heart, not a tag; real tags are the worry.
    assert.ok(!/<\/?[a-z][^>]*>/i.test(desc), `${item.name}: ${desc}`);
  }
});

test("the page is wired into the app", () => {
  const html = read("index.html");
  assert.match(html, /data-tab="items"/);
  assert.match(html, /<section id="items" class="view">/);
  assert.match(html, /id="itemsSearch"/);
  assert.match(html, /id="itemsResults"/);
  assert.match(html, /id="itemsDetail"/);
  assert.match(html, /<script src="items-page\.js\?v=/);
  assert.match(html, /<script src="data\/item-info\.js\?v=/);
  assert.match(html, /<link rel="stylesheet" href="items\.css\?v=/);
  // A view may carry the item in the hash: #items/steel-wire.
  assert.match(read("app.js"), /location\.hash\.replace\(\/\^#\/, ""\)\.split\("\/"\)\[0\]/);
});

test("the item page reads rates and holdings from data already loaded", () => {
  const page = read("items-page.js");
  assert.match(page, /FRPG_WORKBOOK_RATES/);
  assert.match(page, /frpg_account_snapshot_v1/);
  assert.doesNotMatch(page, /fetch\(|XMLHttpRequest/);
});

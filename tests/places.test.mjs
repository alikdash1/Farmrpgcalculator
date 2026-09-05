import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const dataGlobal = (name) => {
  const source = read("data/data.js");
  const start = source.indexOf(`window.${name} = `) + `window.${name} = `.length;
  const end = source.indexOf("\nwindow.", start);
  return JSON.parse(source.slice(start, end < 0 ? source.length : end).trim().replace(/;$/, ""));
};

test("the Places tab is wired into the page", () => {
  const html = read("index.html");
  assert.match(html, /<button class="tab" data-tab="places">Places<\/button>/);
  assert.match(html, /<section id="places" class="view">/);
  assert.match(html, /id="placesBody"/);
  assert.match(html, /<script src="locations-page\.js\?v=\d{8}-\d+"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="locations\.css\?v=\d{8}-\d+">/);
  assert.match(html, /<script src="data\/location-rates\.js\?v=\d{8}-\d+"><\/script>/);
  // Its numbers depend on Setup, the tracked questline and the Tower, so it
  // has to be redrawn when the tab is opened rather than only at load.
  assert.match(read("app.js"), /if \(id === "places" && window\.FRPG_renderPlaces\) window\.FRPG_renderPlaces\(\);/);
});

test("Places reads Setup's perks instead of keeping its own copy", () => {
  const app = read("app.js");
  const page = read("locations-page.js");
  assert.match(app, /window\.FRPG_MODS = mods;/);
  assert.match(page, /window\.FRPG_MODS/);
  // Every currency turns into actions through the engine's own numbers.
  for (const field of ["apItems", "lemonadeItems", "ciderRolls", "lnCatch", "fnCatch"]) {
    assert.ok(page.includes(field), `${field} comes from the shared mods`);
  }
  assert.match(page, /constant\("oj_stamina", 100\)/);
});

test("what you spend decides which rate table can answer", () => {
  const page = read("locations-page.js");
  // KNOWN_MISTAKES.md, "Arnold Palmer is not exploring": an AP finds items and
  // spends no stamina, so it is a different activity from exploring. Pricing
  // one as the other was a tenfold error once. It must not be a chip the
  // reader can set wrong.
  assert.match(page, /const FINDS = new Set\(\["ap", "lemonade", "cider", "largenet", "fishingnet"\]\);/);
  assert.match(page, /if \(FINDS\.has\(prefs\.kind\)\)/);
  assert.doesNotMatch(page, /data-basis/);
  assert.doesNotMatch(page, /prefs\.basis/);
  // Drinks convert to each other by how many finds they make, never to explores.
  assert.match(page, /case "lemonade": return m\.drinks\.apItems > 0 \? amount \* m\.drinks\.lemonadeItems \/ m\.drinks\.apItems : 0;/);
  assert.match(page, /case "cider": return m\.drinks\.apItems > 0 \? amount \* m\.drinks\.ciderRolls \/ m\.drinks\.apItems : 0;/);
  // Only stamina and Orange Juice turn into explores, and only per location.
  assert.match(page, /function actionsFor\(place\)/);
  assert.doesNotMatch(page, /case "ap": return amount \* m\.drinks\.apItems;/);
});

test("the workbook is scaled to this account, in its own unit", () => {
  const page = read("locations-page.js");
  // Verified in KNOWN_MISTAKES.md: exploring rates sum to 550 per AP (500
  // finds x 1.1 Quandary Chowder), fishing to exactly 500 per Large Net. That
  // is what makes scaling by the player's own find count legitimate — it is
  // fewer finds of the same kind, not a conversion between activities.
  assert.match(page, /const WORKBOOK_FINDS = 500;/);
  assert.match(page, /function setupScale\(place\)/);
  assert.match(page, /Quandary Chowder/);
  // And the workbook really does sum to those totals, per location.
  const source = read("data/workbook-rates.js");
  const wb = JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
  const sum = (row) => Object.values(row).reduce((a, b) => a + Number(b || 0), 0);
  // Nine of thirteen fishing locations land on 500.00 and eight of thirteen
  // exploring ones on 550.00. The rest only ever come out HIGH — Ember Lagoon
  // 606, Sinking Swamp 605 — which is what rare chests and runestones landing
  // on top of the ordinary find looks like. A number BELOW the floor would
  // mean the unit had changed, so the floor is what gets pinned.
  for (const [name, row] of Object.entries(wb.fishing)) {
    const total = sum(row);
    assert.ok(total >= 499 && total <= 550, `${name} fishing sums to ${total}`);
  }
  for (const [name, row] of Object.entries(wb.exploring)) {
    const total = sum(row);
    assert.ok(total >= 549 && total <= 620, `${name} exploring sums to ${total}`);
  }
});

test("a fishing pour reads the table that matches how you fish", () => {
  const page = read("locations-page.js");
  // data.js keeps two logs per fishing spot: drop_rates for nets and
  // manual_fish_rates for the rod. Using one for both double-counts.
  assert.match(page, /const byRod = \(\) => prefs\.kind === "casts" \|\| prefs\.kind === "stamina";/);
  assert.match(page, /byRod\(\) && Object\.keys\(place\.fish\)\.length \? place\.fish : place\.drops/);
});

test("Iron Depot has its own drop denominators, and they are real", () => {
  const rates = read("data/location-rates.js");
  assert.match(rates, /window\.FRPG_LOCATION_RATES = \{/);
  const parsed = JSON.parse(rates.slice(rates.indexOf("{"), rates.lastIndexOf("}") + 1));
  assert.equal(parsed.unit, "explores per drop");
  const iron = parsed.ironDepot;
  assert.ok(Object.keys(iron).length >= 13, "every explore location has a set");

  // Iron Depot keeps Iron and Nails topped up, so they stop taking drop slots
  // and everything else lands more often. If the two tables were ever swapped,
  // the whole set would flip direction, so the direction is what gets pinned.
  // 158 of the 159 comparable pairs get better; the one that does not is
  // Mount Banon's Dragon Skull at 1-in-55,000, where the sample is far too
  // thin to mean anything.
  const base = new Map(dataGlobal("FRPG_DATA").sources.locations.map((loc) => [loc.name, loc.drops || {}]));
  let compared = 0;
  const rarer = [];
  for (const [name, table] of Object.entries(iron)) {
    const plain = base.get(name) || {};
    for (const [item, denom] of Object.entries(table)) {
      const before = plain[item] && plain[item].denom;
      if (!(before > 0)) continue;
      compared += 1;
      if (denom > before * 1.001) rarer.push(`${name} / ${item}`);
    }
  }
  assert.ok(compared > 100, `compared ${compared} pairs`);
  assert.deepEqual(rarer, ["Mount Banon / Dragon Skull"]);

  // And the page only reaches for them when Setup says the player owns it.
  assert.match(read("locations-page.js"), /if \(mods\(\)\.ironDepot && place\.ironDepot\) return place\.ironDepot;/);
});

test("how much stamina an explore costs is asked for, never guessed", () => {
  const page = read("locations-page.js");
  // Farm RPG prints it per location under Exploring Effectiveness, and Protein
  // Bars and perks move it, so there is no right value to default to.
  assert.match(page, /Exploring Effectiveness/);
  assert.match(page, /frpg_location_effort_v1/);
  // With no number entered, the stamina and Orange Juice options must refuse
  // to answer rather than fall back to an invented cost.
  assert.match(page, /case "oj": return per > 0 \?/);
  assert.match(page, /case "stamina": return per > 0 \?/);
  assert.match(page, /Nothing to work out until that number is in\./);
});

test("the yield table survives the site-wide table min-width", () => {
  const css = read("locations.css");
  // style.css sets a bare `table { min-width: 1050px }` for the Calculate
  // page. It applies to every table on the site and pushed this one three
  // times past its card on a phone.
  assert.match(read("style.css"), /table\{width:100%;border-collapse:collapse;min-width:1050px/);
  assert.match(css, /\.places-table \{[\s\S]*?min-width: 0;/);
  assert.match(css, /\.places-scroll \{ overflow-x: auto; \}/);
  // On a phone the columns need stated widths: a nowrap tag and an unbreakable
  // item name will not shrink on their own.
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.places-table \{ table-layout: fixed; \}/);
});

test("Places says what the workbook assumes that your account may not", () => {
  const page = read("locations-page.js");
  // "Every perk on" is a number Setup already knows, so the gap is stated
  // rather than left for the player to discover in-game.
  assert.match(page, /function sourceNote\(\)/);
  assert.match(page, /scaled to " \+ count\(100 \* mine \/ WORKBOOK_FINDS\)/);
  assert.match(page, /Shown as measured, which is/);
});

test("a pour is scored against what you still need", () => {
  const page = read("locations-page.js");
  assert.match(page, /window\.FRPG_GATHER/);
  assert.match(page, /window\.FRPG_TOWER_NEEDS/);
  assert.match(page, /Only what I still need/);
  // gather-model.js loads after this file, so the first pass cannot know the
  // questline. Without the redraw the tags never appear.
  assert.match(page, /window\.addEventListener\("load", render\);/);
});

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
  // Farm RPG's own item text is the authority, and it splits these apart:
  //   Arnold Palmer "Quicker than regular Lemonade"  -> finds, no stamina
  //   Lemonade      "Finds items while exploring"    -> finds, no stamina
  //   Apple Cider   "1000+ Stamina Use | Does not give Stamina" -> stamina
  //   Orange Juice  "Adds 100 Stamina"               -> buys stamina
  // So Cider belongs with exploring, not with the drinks that find items.
  assert.match(page, /const FINDS = new Set\(\["ap", "lemonade", "largenet", "fishingnet"\]\);/);
  // The owner's own stamina calculator settles the cider: its stamina is
  // 1250 + 12.5 x effectiveness and its exploring is (1 + effectiveness/100)
  // times base, a flat 1.25 stamina an explore at any effectiveness.
  assert.match(page, /const ciderExplores = \(place\) => mods\(\)\.drinks\.ciderRolls \* \(1 \+ effPct\(place\) \/ 100\);/);
  assert.match(page, /constant\("cider_stamina_base", 1250\) \+ constant\("cider_stamina_per_eff", 12\.5\) \* effPct\(place\)/);
  assert.match(page, /case "cider": return amount \* ciderExplores\(place\);/);
  // perkFactor, not staminaFactor: the sheet's cider figure is already in
  // stamina, so the full 1.25-per-explore cost would count that twice.
  assert.match(page, /case "cider": return amount \* ciderStaminaEach\(place\) \* neighFactor\(\) \* perkFactor\(\);/);
  assert.match(page, /const perkFactor = \(\) => \{/);
  assert.match(page, /case "oj": return amount \* constant\("oj_stamina", 100\);/);
  // And it is never a chip the reader can set wrong.
  assert.doesNotMatch(page, /data-basis/);
  assert.doesNotMatch(page, /prefs\.basis/);
});

test("fishing costs bait, so it is never offered a stamina option", () => {
  const page = read("locations-page.js");
  // Worms are type "bait" and say "Use this to catch fish". Stamina buys
  // nothing when fishing, and Exploring Effectiveness is an exploring
  // mechanic, so neither belongs on a fishing card.
  const from = page.indexOf("fishing: [");
  const fishing = page.slice(from, page.indexOf("],", from));
  assert.doesNotMatch(fishing, /stamina/);
  assert.match(page, /if \(place\.mode !== "explore"\) return "";/);
  assert.match(page, /const byRod = \(\) => prefs\.kind === "casts";/);
});

test("the workbook is scaled to this account, in its own unit", () => {
  const page = read("locations-page.js");
  assert.match(page, /const WORKBOOK_FINDS = 500;/);
  assert.match(page, /function setupScale\(place\)/);
});

test("a chest is not a drop, and the table is un-expanded before it is shown", () => {
  const page = read("locations-page.js");
  // The workbook lists a chest AND everything inside it, as if the contents
  // were drops of the place. Detected by arithmetic, never by name.
  assert.match(page, /function containersIn\(table\)/);
  assert.match(page, /rows: rows\.filter\(\(row\) => !row\.inside\)/);
  assert.match(page, /function chestMarkup\(result, quests, tower\)/);

  // The proof: pull the detected contents back out and the affected
  // locations land on exactly the totals KNOWN_MISTAKES.md documents.
  const data = dataGlobal("FRPG_DATA");
  const nameById = new Map(data.items.items.map((item) => [item.id, item.name]));
  const parts = new Map();
  for (const row of data.recipes.craft) {
    const made = nameById.get(row.itemId);
    const part = nameById.get(row.reqId);
    if (!made || !part) continue;
    if (!parts.has(made)) parts.set(made, []);
    parts.get(made).push({ name: part, amt: row.amt });
  }
  const source = read("data/workbook-rates.js");
  const wb = JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
  const strip = (table) => {
    const held = new Set();
    for (const [made, rate] of Object.entries(table)) {
      const recipe = parts.get(made) || [];
      if (recipe.length < 2 || !(rate > 0)) continue;
      const all = recipe.every((part) => {
        const listed = table[part.name];
        return listed > 0 && Math.abs(listed - rate * part.amt) <= 0.01 * listed + 1e-4;
      });
      if (all) recipe.forEach((part) => held.add(part.name));
    }
    return Object.entries(table).filter(([name]) => !held.has(name))
      .reduce((sum, entry) => sum + entry[1], 0);
  };
  // Black Rock Canyon is the one the player caught: Medium Chest 02 drops
  // 0.08987 per AP and holds 5 Aquamarine Rings, and the workbook duly lists
  // Aquamarine Ring at 0.4493.
  // Fishing lands on exactly 500 per Large Net once the chests come back out:
  // Pirate's Cove is 501.7 before and 500.0 after.
  assert.ok(Math.abs(strip(wb.fishing["Pirate's Cove"]) - 500) < 0.05);
  for (const [name, row] of Object.entries(wb.fishing)) {
    assert.ok(strip(row) >= 499.9, `${name} fishing strips to ${strip(row)}`);
  }
  // Exploring no longer sits on a flat 550: the owner's own workbook replaced
  // 45 of these rates on 2026-09-06 and measures a little richer. The floor is
  // what matters, since a total BELOW 550 would mean the unit had changed.
  for (const [name, row] of Object.entries(wb.exploring)) {
    const total = strip(row);
    assert.ok(total >= 549.9 && total <= 600, `${name} exploring strips to ${total}`);
  }
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

test("effectiveness decides clicks, and the stamina perks are applied", () => {
  const page = read("locations-page.js");
  // Farm RPG prints effectiveness per location, and Protein Bars, Jill and
  // Sprint Shoes all raise it, so it is typed in rather than defaulted.
  assert.match(page, /Exploring Effectiveness/);
  assert.match(page, /frpg_location_effort_v1/);
  // But it is stamina per CLICK, not per explore. One explore is one stamina,
  // so it changes how much clicking a pour takes and nothing else. It must
  // therefore never gate a card, and never multiply a bill.
  assert.match(page, /it is your ciders it stretches, not your stamina/);
  assert.doesNotMatch(page, /Nothing to work out until that number is in/);
  // Wanderer IV is a 13% chance an explore is free, so stamina goes further.
  // Places was not applying it at all.
  assert.match(page, /const staminaFactor = \(\) => \{/);
  assert.match(page, /mods\(\)\.exploreStaminaPer/);
  assert.match(page, /case "stamina": return amount \/ staminaFactor\(\);/);
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
  assert.match(page, /count\(100 \* mine \/ WORKBOOK_FINDS\)/);
  // The long version explained the workbook's internals and the player could
  // not tell what it was for. Keep it to one line.
  assert.doesNotMatch(page, /which is what makes scaling them sound/);
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

test("the stamina facts match what the game actually says", () => {
  const effects = JSON.parse(read("data/effects.json")).effects;
  const wanderer = effects.find((row) => row.id === "wanderer");
  // The game lists Wanderer as a SKIP CHANCE per tier — I 4%, II 7%, III 9%,
  // IV 13% "chance exploring won't use Stamina" — not a flat 20% discount,
  // and the tiers replace each other rather than adding up.
  // The four tiers ADD UP -- 4+7+9+13 = 33 -- which is why the owner's stamina
  // calculator multiplies by exactly 0.67 at every effectiveness step.
  assert.equal(wanderer.value, 0.33);
  assert.doesNotMatch(wanderer.plain, /20% less/);
  assert.match(wanderer.plain, /33%/);
  // data/data.js carries a baked copy, and the two must not drift apart.
  const baked = dataGlobal("FRPG_EFFECTS").effects.find((row) => row.id === "wanderer");
  assert.deepEqual(baked, wanderer);

  // The Places page is the only thing that models a cider, and the reference
  // for all of this has to stay where the next session will find it.
  const doc = read("docs/STAMINA_AND_EFFECTIVENESS.md");
  assert.match(doc, /1000\+ Stamina Use/);
  assert.match(doc, /depends on your \*\*exploring effectiveness in each explore location\*\*/);
  assert.match(doc, /Nothing lowers it/);
  assert.match(doc, /What effectiveness actually does/);
  // The bill must never be shown as scaling with effectiveness again.
  // The two wrong readings must not creep back in.
  assert.doesNotMatch(doc, /costs `1,000 × your effectiveness`/);
  assert.match(doc, /1250 \+ 12\.5/);
});

test("the meals that change a pour are on the page, sharing Setup's store", () => {
  const page = read("locations-page.js");
  const app = read("app.js");
  // Writing to localStorage directly would leave app.js's in-memory
  // state.meals stale until a reload, so both pages go through one bridge.
  assert.match(app, /window\.FRPG_MEALS = \{/);
  assert.match(page, /window\.FRPG_MEALS\.set\(id, on\)/);
  assert.doesNotMatch(page, /frpg_meals_v2/);

  // Exploring gets the three that touch exploring; fishing gets the net one.
  assert.match(page, /\["quandary", "Quandary Chowder"/);
  assert.match(page, /\["neigh", "Neigh"/);
  assert.match(page, /\["seapincher", "Sea Pincher Special"/);
  const fishing = page.slice(page.indexOf("fishing: [", page.indexOf("MEALS_FOR")));
  assert.doesNotMatch(fishing.slice(0, fishing.indexOf("],")), /quandary|neigh/);
});

test("each meal is applied where the workbook does not already include it", () => {
  const page = read("locations-page.js");
  // Exploring rates sum to 550 = 500 finds x 1.1, so Quandary Chowder is
  // already IN them and comes back out when the meal is off. Fishing sums to
  // exactly 500, which is perks only, so Sea Pincher goes ON TOP. Getting
  // these the same way round would double-count one and drop the other.
  assert.match(page, /if \(meal\("seapincher"\)\) scale \*= 1 \+ constant\("sea_pincher_bonus", 0\.1\);/);
  assert.match(page, /\} else if \(!meal\("quandary"\)\) \{[\s\S]*?scale \/= 1 \+ constant\("quandary_bonus", 0\.1\);/);
  // Neigh moves the stamina a cider costs, never the exploring it does.
  assert.match(page, /meal\("neigh"\) \? 1 - constant\("neigh_stamina_save", 0\.2\) : 1/);
  assert.doesNotMatch(page, /case "cider": return amount \* ciderExplores\(\) \* \(meal/);
  // Mushroom Stew gives no extra items: each one just counts 1.1x toward a
  // mastery, so it only moves how many finish a Tower row.
  assert.match(page, /const masteryMult = \(\) => meal\("mushroom"\)/);
  assert.match(page, /whole\(need\.remaining \/ mult\)/);
});

test("what a pour costs in stamina is stated, not left to be worked out", () => {
  const page = read("locations-page.js");
  // A cider's stamina moves with effectiveness, so the total for THIS pour is
  // the number worth showing, next to the field that changes it.
  assert.match(page, /Your ' \+ whole\(prefs\.amount\) \+ " " \+ esc\(kindLabel\(\)\)/);
  assert.match(page, /costing <b>" \+ whole\(spent\) \+ "<\/b> stamina"/);
  // And it names which savings are already in that figure.
  assert.match(page, /neighFactor\(\) < 1 \? "Neigh" : null, staminaFactor\(\) < 1 \? "Wanderer" : null/);
});

test("chest contents keep the flags that followed them out of the table", () => {
  const page = read("locations-page.js");
  // They count toward quests and masteries exactly like a drop does; moving
  // them out of the drop table must not lose that.
  assert.match(page, /function chestMarkup\(result, quests, tower\)/);
  assert.match(page, /places-inchest-need/);
  assert.match(page, /whole\(need\.remaining \/ masteryMult\(\)\)/);
});

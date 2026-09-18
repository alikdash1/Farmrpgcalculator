# Changelog

Dated log of real work sessions on this project. Keep entries short — what
changed and why, not a diff. See git log for the actual diffs (this project
started tracking git history 2026-09-02; everything before that is
reconstructed from the Codex chat transcript only).

## 2026-09-19 (5) — Setup fills itself from the farm page

- **Account Sync 1.12 reads My Farm** (`xfarm.php`): every building and what it
  makes, e.g. Sawmill 60,000 Boards / 48,000 Wood / 4,000 Oak per hour,
  Steelworks 6,000 Steel / 2,000 Wire, Hay Field 9,000 Straw per 10 min, Quarry
  8,000 Stone per 10 min and 5,000 Coal an hour. Stored under the snapshot's
  existing building keys.
- **Setup fills in from it.** A new farm capture fills any production number
  still at 0, once; numbers you typed are left alone. "Use my farm's numbers"
  on Setup replaces them all. Setup lists what the capture says above the cards.
- A page Farm RPG identifies by its address keeps that type. The "looks like the
  inventory" guess used to override it, which is how the Farmhouse capture was
  relabelled and thrown away.
- **Checked on the owner's capture:** every building came through (Sawmill,
  Steelworks, Hay Field, Quarry, Orchard, Trout Farm, Vineyard, Worm Habitat,
  Ironworks), Mega Trout / Buddy Elf on a Shelf / Forcepath's Book are in the
  inventory. But the extension's list of known page types had no "farm" or
  "farmhouse", so both were stored as "unknown" — one slot, so the farm capture
  replaced the farmhouse one — and Setup, waiting for a capture called "farm",
  never filled in. Both types are known now (1.12.1), and Setup fills when the
  farm numbers change, whatever capture brought them.

## 2026-09-19 (4) — Farmhouse, stamina and new items' pictures

Checked the owner's third recapture in their Brave: **quests are right again**
(8 active, 2 personal, 1 special available), **stamina 80,219,537 / 87,206**,
Star = 10,281.

- **The Farmhouse page was not recognised** (saved as "other"). It is now read:
  current stamina and cap, what the next rest gives (436,030) and how much it
  raises the cap. Home shows "resting gives +436k" on the stamina tile.
- **Two real items were skipped as prose** for being five words long —
  Forcepath's Book of Quest Requirements, Buddy Elf on a Shelf. Only a lower-case
  sentence opening ("a ...", "The fish ...") counts as prose now.
- **New items had no picture, so the site hid them.** Inventory pictures carry no
  alt text (1 of 1,165 did), so pictures are now paired with the name in their own
  row: 1,143 of 1,144 items on the live page, Mega Trout included. That picture is
  what tells the site Mega Trout is a real item.
- Account Sync 1.11.2.

Noticed, not built: the farm page (`xfarm.php`) lists every building's output —
Sawmill, Hay Field, Quarry, Steelworks, Worm Habitat — which could fill Setup's
production numbers from a capture.

## 2026-09-19 (3) — The recapture, checked

The owner recaptured Mastery, Inventory and an explore location with 1.11.

- **Mastery: 524 of 524**, 515 identical to the 1:01 AM export, 9 higher (newer),
  none lower. **Inventory: Rope 9,242, Stingray 17,004, Puffer 16,358** — right.
  No fake mastery rows. The badge fix works on the real account.
- **The item Star was read as the star icon**, so its description "Festoon the
  fir" was stored in its place. Icon names only count as noise written in lower
  case, exactly as the icon prints them.
- **The explore capture was filed as quests** and replaced the real quests
  capture: 8 active quests became none, plus one called "Help". The detector
  matched the word "quest" in the "Help Needed" card that is on every page. Quest
  pages are now recognised only by their own headings ("Active Requests (8)",
  "Completed Requests (1,984)"), and location pages (`area.php`) are exploring.
- **Stamina was never read.** Farm RPG prints it as "Stamina (80,219,537 /
  87,206)" on the Explore list and as "80,219,537" / "/ 87,206 Stamina" on a
  location; the extension only knew "Stamina: X / Y". Both forms are read now.
- Silver and gold on Home say "as of" the newest capture, not the snapshot's
  generatedAt, which lagged half an hour.

## 2026-09-19 (2) — Every capture checked against the real pages

Checked in the owner's own Brave, against Farm RPG's live pages and their
1:01 AM mastery export.

- **The Tower floor badge was read as a quantity.** Farm RPG draws a Tower
  item's floor in a `tw-badge` right after its name, and the extension read it
  as text: the capture said Rope = 206, Stingray = 226, Puffer = 237 (the real
  counts are 9,242 / 17,004 / 16,358). The real count went to the description
  under it, so 97 descriptions ("Can tie things together = 9,242") were stored
  as items and 177 of them as fake Mega Masteries. On the mastery page the
  badge stood where the name should be, so **every Tower item was dropped**:
  300 of 524 masteries came back, missing Wizard Hat, Glass Jar, Wooden Spear.
  The badge is now skipped everywhere. Run on the live pages: 524 of 524
  masteries, Rope 9,242, Glass Jar 8,219, no description rows.
- The mastery page is read folded tiers and all, from the page that actually
  holds the list (its heading is really "Mastery In-Progress"). A capture that
  reads fewer rows than the page holds now says so.
- **Personal help requests** (Items Wanted, Special Gift) are now captured;
  they were never read. There is no separate "available quests" page on Farm
  RPG — the one available Special Request was already captured.
- **Inventory tab showed one item.** A single amount typed in Calculate (Straw
  34,485) hid the whole 1,213-item capture. The capture now shows, with typed
  amounts laid on top.
- The Tower strips a floor off an older capture's names, and a bare "Grand
  Mastered" label from the inventory page can no longer pull a mastery down to
  100,000.
- Build stamp was stuck on 2026-09-11. Extension is 1.11.0.
- **Silver, gold and stamina on Home**, in their own row under "where you
  stand", from the last capture. The extension already read silver and gold off
  Farm RPG's top bar and stamina off pages that print it; the site just never
  showed them. Stamina says what to capture when it has only the max.
- "N rows ignored" on Inventory is about the capture, not the site: it counts
  descriptions an older capture stored as items, and goes away on recapture.

What the capture got right: all 300 masteries it did read matched the export
exactly; 1,984 completed quests; profile, levels and Tower progress.

## 2026-09-19 — Hay Field, and crafts counted the way mastery counts them

- **Hay Field** in Setup, next to the Quarry: Straw every 10 minutes, capped per
  tick like the others. Under it, a tick for each item you make from your own
  Straw — Broom, Quench, Red Brick, Rope, Snow Shoes, Twine, Yarn, Yule Goat,
  worked out from the recipes. Ticked items get crafted down to Straw instead
  of bought; unticked ones get picked as usual, so "I buy Rope but make Yarn"
  works. Ticking Rope or Yarn ticks Twine too, since you can't make them without
  it. Checked: Rope x 1m with Rope ticked → 689.66k Rope crafts, 1.43m Twine
  crafts, 2.85m Straw "your farm covers it".
- **Calculate says how many crafts**, not only how many items: "689.66k crafts
  give you 1m — your 1.45x duplicate chance makes the other 310.34k". If your
  mastery is known it adds what's left to the next Grand/Mega Mastery in crafts,
  and a **Plan just the N left** button sets the quantity to it (Glass Jar:
  702.53k → 297.47k left → 205.15k crafts). With the duplicate perks off, it
  tells you which ones to turn on.
- **"I have it / free" on every ingredient in Calculate**, on the ingredient
  table and on the make/buy rows. The item then costs nothing and the tree stops
  there — for a stack in storage, a reward, a gift, or anything you just don't
  want costed. It shows under "covered", so "Show covered" brings it back.
- Imported the 2026-09-19 1:01 AM mastery export: 43 moved. **Magicite
  finished its Mega Mastery**; Wooden Spear 274,057 → 463,142, Glass Jar
  702,529 → 794,393, Mystic Ring 864,842 → 917,764, Linked Lantern past Grand
  Mastery (106,720).

## 2026-09-17 (6) — It is called Farm RPG Calculator now, and the Red Trunk is the logo

The owner is about to send the link to a friend in the game, and "Lantern
Ledger" meant nothing to anyone who had not built it. The site is now **Farm
RPG Calculator**, with the Red Trunk as its mark — their own million-mastery
project, and the item the planner has always opened on.

- Renamed in the masthead, the tab title, the web manifest, the footer and the
  Account Sync extension (including the two download filenames, which now read
  `farm-rpg-calculator-account-snapshot.json` and
  `farm-rpg-calculator-account-sync-setup.html`). The strapline is now *"What an
  item really costs"* instead of *"Farm RPG planning desk"* — saying "Farm RPG"
  twice in the same breath read as filler.
- `assets/red-trunk-mark.png` (Farm RPG's own art, saved locally so the logo and
  the favicon still appear with no network) replaces
  `assets/lantern-ledger-mark.svg`, which is deleted. The mark is square now, so
  `.brand-logo` is 44x44 and no longer stretched to 48; `image-rendering` went
  back to `auto` because a 256px render downscaled with `pixelated` looked torn.
- Imported the 2026-09-17 11:16 PM mastery export: 524 items, 164 moved, 5 new
  (Flarite Ring, Quench, Fairy Ring, Horn Powder, Pinecone Bird Feeder).
  **Horn Canteen finished its Mega Mastery**, Glass Jar went 122,665 to 702,529,
  Mystic Ring 603,970 to 864,842, Wooden Spear 105,084 to 274,057.

## 2026-09-17 (5) — The item index reads like the Tower

The owner, pointing at the Items list: *"add the GM MM stuff just like tower,
and rank them on closest tower to the farthest, not by letter, and show in a bar
how much mastery i have ... and if i have finished the tower requirement don't
show it"*.

- **Every row a Tower floor wants** now carries its tier badge, the floor, a
  mastery bar and what is left: "Wooden Spear · MM · T286 · 895k left".
- **The Tower mastery filter ranks by floor**, nearest first, instead of
  alphabetically, and says so: "128 items · nearest floor first". It starts at
  T286 Wooden Spear and runs up the Tower.
- **Finished masteries are out of that filter.** A mastery you have completed is
  not a job; the item's own page still shows it, marked done.

## 2026-09-17 (4) — Quest badges count what you still owe

The owner: *"does it change depending on how much is left for me or is it a
fixed number? it should be flexible ... and the Tower mastery on the Items page,
do it in there too"*.

- **The Tower's quest badge is now what you still owe**: what the quests ask
  for, less what the last capture says is in the barn. Wooden Spear with 9,000
  held reads "Quest 7k" instead of "Quest 16k", and "Quest met" once you hold
  enough. Without a capture it stays the full ask.
- **The Items page measures a Tower mastery properly.** It was scoring every
  item against 1,000,000, so a Grand Mastery looked a tenth done: Cotton at
  237k now reads "Floor T301 · GM · done · 237k / 100k", not 24% of a million.
  Each floor that wants the item gets its own row, with the tier badge, the bar
  and the amount left, the same as the Tower page.

## 2026-09-17 (3) — Tower rows ranked, badged and measured

The owner: *"if i have finished the thing move it down the slot and rank the
items i still need first ... add how much mastery left on the right, a bar like
the Farm RPG masteries bar, and whether it's a GM or MM, and if it's needed for
a quest"*.

- **A floor's rows are ranked**: what is still owed first, closest to finished
  at the top, and anything already done drops to the bottom of its floor.
- **GM / MM badge** on every row, so the tier is readable without parsing the
  sentence under the name. The method line stops repeating it.
- **A quest badge** when a quest is still asking for the same item, with the
  amount — Wooden Spear reads "MM · Quest 16k · craft".
- **The bar says what is left** beside it, like the game's own mastery bar:
  "894.92k left", with "105.08k / 1m · 10%" underneath.

## 2026-09-17 (2) — An Items page for the whole game

The owner, aiming to hand the site to friends: *"add a new page for items, every
item in the game and the description it has on buddy ... if i place the item it
shows its drop rate in the areas it has ... and on the bottom show what's needed
for quests you actually have"*.

- **New Items tab.** All 1,555 items, searchable, with filters for wanted by a
  quest, craftable, found somewhere, Tower mastery, and in your inventory. The
  list line under each name says what it is at a glance: "grow · 178k for
  quests · 9,000 held".
- **One page per item**: the game's own description, what it sells and trades
  for, crafting and cooking level, growth time and XP; how you get it (recipe
  chips you can click through, every place it drops, the mine it comes from, or
  the Country Store); what it makes; its Tower mastery progress; and the quests
  that still want it.
- **Drop rates in both units side by side** — "1 in 872.84 explores" and "6.23
  per Arnold Palmer" — with a bar showing how the places compare, so the best
  one is obvious without reading numbers.
- **Quests are measured against what you hold**: "Quests want 178,000 · you hold
  9,000 · 169,000 short", and each quest line says covered or how far short.
  Finished quests and closed events are left out.
- **`data/item-info.js`** (new, from `tools/build-item-info.mjs`) carries each
  item's in-game description and its Buddy's Almanac address: 1,555 of 1,556.
- Deep links: `#items/ancient-pickaxe` opens straight to an item, and the view
  keeps it in the address bar. The quest lookup moved into `quest-model.js` so
  this page and Calculate answer from one index. 128 tests pass.

## 2026-09-17 — Which quests still want this item

The owner: *"an item still needed for a quest ... when I press it, it expands
and shows me the quests, all of them one by one, and how many"*. The item panel
only said "quests in the guide ask for 6.15k total across 11 steps", which never
said which quest wanted what, and counted quests already finished.

- **"Still needed for quests"** now sits under the item on the Calculate page
  and under every ingredient row, folded shut. Open it for one line per quest:
  the amount, the quest, its questline, and whether it is ready, in progress or
  available. Quests already finished are left out, and so are events whose end
  date has passed. The 2,480 questlines are indexed by item once per load.
- The old "Save for later" sentence is gone; the Tower note it carried stays.

## 2026-09-12 — Mastery History export, 12:18 AM

`data/personal-tower.js` re-imported from "Farm RPG Mastery History (4).csv"
(column 9/12/2026 12:18:23 AM): 72 rows moved since the 5:05 PM export, 49 of
them below the 1m cap. Tower rows that moved: Glass Jar 97,190 → 122,665,
Hammer 503,054 → 521,028, Potato 831,336 → 960,250, Wooden Bow 516,399 →
609,027, Salt 362,330 → 363,810, Horn Canteen 239,276 → 274,670, Mystic Ring
593,212 → 603,970, Hourglass 148,673 → 148,853, Wizard Hat 949,604 → 973,876,
Water Lily 223,384 → 246,584. Floor unchanged at T286.

## 2026-09-11 (6) — A new mastery capture now moves the Tower page

The owner captured masteries and the site did not change. Two faults:

- **"Newer than the Mastery History file" was judged on the wrong clock.** It
  compared the file against the snapshot's `generatedAt`, which the extension
  resets every time it rebuilds — on a capture of *any* page. So a weeks-old
  mastery read could overwrite a fresh file, and the decision had nothing to do
  with when masteries were actually read. It now goes row by row, on each row's
  own `capturedAt`.
- **"Last updated" always showed the file's date** while the file was
  authoritative, and only the date — so a capture that did land still read
  "Sep 11". It now shows the newest applied capture, with the time.
- Checked with a synthetic snapshot: a capture read now moved Water Lily from
  223.38k to 300k and the label to 10:58 PM; one read on Aug 26 changed nothing.
- **The live Tower sat on T277.** `save()` stored the start floor on every save,
  so the default from the owner's first visit to the website outlived every
  later export (which says 286). Only a floor the player types is honoured now;
  otherwise the page starts at the floor they are on — the higher of the
  export's floor and a captured profile/Tower level — and every floor below it
  counts as cleared, whatever its mastery number says.
- "Last updated" now says where the numbers came from: "from your mastery
  capture (312 items)", "the extension has not reached this page", or that the
  capture is older than the export — so "extension or website?" has an answer
  on the page. Checked with 277 stored the way the live site had it: the page
  opened on T286, and a capture at T287 moved it to T287.

## 2026-09-11 (5) — Captures reach the website, privately

The owner asked for their captures on the site and for the extension to push
after every capture. The repo and GitHub Pages site are **public**, so pushing
captures would publish an inventory, profile and masteries to anyone; asked,
the owner chose private sync instead.

- **Account Sync 1.10** adds exactly one hosted address,
  `https://alikdash1.github.io/Farmrpgcalculator/*`, to the calculator bridge.
  The live site now updates on every capture the same way the local copy did —
  inside the owner's own browser, with nothing uploaded or committed. Not all of
  github.io: a test pins the exact address and that the bridge makes no network
  calls.
- The popup opens the website by default and accepts its address; the README
  and the on-page setup guide list the sixth site and say plainly that it stays
  private.
- Worth knowing: `data/personal-tower.js` and `data/personal-quests.js` are
  already public on the site (BRIEFING rule 3 says they should not be). Left
  as they are; the owner has been told.

## 2026-09-11 (4) — Every Farm RPG item in the Calculate search

The owner: *"some of the new items arent showing in the calculate craft menu …
like acid … and pine bird feeder"*, then *"almost all the new mining items are
missing"*. It was far more than a few. `data/data.js` came from a 2023-era item
export, so **420 of the game's 1,556 items** could not be searched — 63 Tower
requirements from T301 to T350 among them.

- **`tools/import-buddy.mjs`** pulls every missing item and location from
  Buddy's Almanac (its static page JSON) and builds **`data/extra-items.js`**:
  418 items, 450 craft and 8 cook recipe rows, Sinking Swamp exploring and
  fishing, Gary's Crushroom, and new drops at Highland Hills and Vast Ocean. It
  merges itself into `FRPG_DATA` after data.js and never overwrites anything.
- **The sheet's word on rates**, as the owner asked. Arnold Palmer counts at
  the new places read `data/workbook-rates.js` as every other place does, and
  **fishing routes now take their Large Net and Fishing Net counts from the
  sheet's per-net rates** too (scaled to the account's nets, Sea Pincher on top)
  instead of converting logged catches. Buddy supplies only explores and
  catches per drop — the same unit as data.js (Salt Rock at Whispering Creek:
  36.75 there, 36.44 here) — using its plain rates, no Iron Depot or Runecube.
- **Exploring no longer beats fishing by default.** Once Sinking Swamp gave
  Water Lily an exploring route, the planner switched it off Forest Pond nets.
  With both on offer the cheaper route now leads.
- Mined items say where they come from ("Found in Spring Cave with the Cid's
  Spare Pickaxe") instead of "Not known yet". There are still no mine rates.
- `engine.js`: Sinking Swamp is two locations with one name; the co-drop lookup
  now keeps the exploring side.
- Checked on a fresh load: 1,556 items, Acid Extract / Bamboo Trellis / Tie Dye
  Scarf / Gold Ring / Esperium all open with routes, no Tower row left without
  route data, Places shows Sinking Swamp's per-AP rates, no console errors.
  `tests/extra-items.test.mjs` adds 7 tests (118 pass).

## 2026-09-11 (3) — The new Tower floors, T341 to T350

Farm RPG released ten more Tower floors. Their requirements are only on the
wiki's Spoilers page, which needs a login, and buddy.farm's Tower page still
stops at T340 — so the owner read them off the in-game table one floor at a
time. Each item was matched against the game's own item list (for its
picture) or buddy.farm's item page, and against the owner's mastery export.

- `data/tower-floors.js` now holds **T341–T350: 17 Grand and 13 Mega Mastery
  requirements**. Buddy's first picture on crop and seed pages is not the
  item's own, which put the wrong art on Gold Carrot; every entry the planner
  knows now uses the game's picture.
- **The Tower page stopped hardcoding T340.** The goal floor, the Start-at-floor
  limit and the "climb to" copy follow the highest floor in the data, so the
  next block of floors is a data change alone.
- Verified on a fresh load: "The climb to T350", all ten floors drawn with the
  right tier and the owner's progress, no console errors.

Not yet costable: 16 of the 30 items are unknown to the calculator and show "No
route data". Five need only their own recipe; the other eleven also need 13
ingredients the planner does not have (Gold Ring, Bamboo, Yellow Dye, …).

## 2026-09-11 (2) — Production pass, the half that was missing

Asked afterwards whether the brief had all been done, the honest answer was no:
spacing had not been normalised, tablet widths had never been tested, the empty
and loading states had not been looked at, and heading order had not been
audited. This entry is that remaining work.

- **Spacing now follows the scale.** 85 distinct padding, margin and gap values
  became 35; everything from 4 to 36px is on 4/8/12/16/24/32. Hairlines under
  4px and larger layout values were left alone on purpose — the Tower rail's
  72px padding is locked to the position of its timeline dots.
- **Tablet.** Between about 1,001 and 1,036px the nav no longer fitted beside
  the brand and Export button and scrolled out of sight with no cue. Measured at
  1024px it needs 24 + 200 + 12 + 663 + 12 + 86 + 24px plus a scrollbar, so the
  second-row layout now starts at 1,080px. Group separators stay until phone
  widths.
- **Page titles step between sizes on the scale** (32px, then 40px from 1,200px;
  the result title 24px, then 32px from 1,100px) instead of sliding through
  every value between them with the window.
- **Heading order.** Places jumped from the page title straight to an h4 and
  Mining to an h3; both are h2 now, restyled so nothing looks different.
- **Each view names itself** in the browser tab and history ("Tower — Lantern
  Ledger").
- **The empty Calculate screen was unreachable, and is now the first-visit
  screen.** On startup Calculate reopened the last item, and with none saved it
  opened Red Trunk for everyone — nothing ever cleared the item, so the empty
  state could never show. It now starts empty on a first visit and offers the
  player's own next unfinished Tower masteries as buttons (verified: six picks
  from T286–T289, and clicking Aquamarine Ring opens it at 675,832). Anyone
  with a saved item still lands on it, exactly as before.

**Audited on fresh loads at 375, 768, 1024, 1100, 1200 and 1366px, all eleven
views:** no horizontal overflow, no rendered text off the type scale, no
targets under 24px (44px on touch), no heading skips, exactly one h1 per view,
no unlabelled controls, no images without alt text, no nameless buttons or
links, no duplicate ids. Item art below the fold was already lazy-loaded — the
hundreds of "pending" images on Calculate are that working, not a bug.

## 2026-09-11 — Production pass: one designed site, measured

The owner asked for the site to look intentionally designed and ready for
production, "without random cosmetic changes". The after-dusk design system in
`DESIGN_PLAN.md` was sound; what was left was execution. The goal was set up
front as things that can be measured rather than judged:

- nothing floating over the page on a first visit
- every rendered font size on one scale: 12, 13, 14, 16, 20, 24, 32, 40px
- no colour left over from the old light theme
- one focus ring, one card idiom, one toggle idiom (water when on)
- no horizontal overflow at 375px or 1366px
- targets at least 24px, and 40–44px on touch screens
- text contrast at least 4.5:1, control edges at least 3:1
- Back/Forward, the skip link and the current-tab marker all working

**Before:** 22 distinct rendered font sizes, text down to 10.2px; over 50
light-theme colour literals still in the stylesheets; four competing focus
rules; error red at 4.34:1 and input edges at 1.77:1; both quest trackers open
over the content on every tab; the Quests "Track" button spilling out of its
card; the footer only inside the hidden Library view; the skip link sending you
to Home from any tab; Home's sixth card orphaned on its own row.

**After, measured on a fresh load across all eleven views:** zero horizontal
overflow at 1366px and 375px; zero targets under 24px on desktop; every
rendered size on the scale; zero leftover colours; red 5.04:1, control edges
3.21:1 on slate; Back, Forward and the skip link verified by script. 111 tests
pass, `handoff.mjs check` clean.

What changed:

- **Type and colour were fixed at the source, not overridden.** A script snapped
  every declared size in the nine stylesheets to the scale and swapped each
  light-theme literal for its token, with comments protected from the rewrite.
- **Navigation is grouped** — Home | Calculate, Places, Mining | Tower, Quests,
  Inventory | Setup, Account — and the Home cards follow that order in three
  columns.
- **Quest trackers start folded** to their title bars. The player's own
  open/closed choice still wins once made.
- **A footer on every page**, with the non-affiliation line and links to the two
  views that were only reachable from Home.
- **One toggle idiom.** Places chips were pills that turned amber or green when
  on; they are square and water now, like every other setting. Lantern is back
  to meaning primary action and focus only.
- **Accessibility:** `aria-current` replaces an invalid `aria-selected` on the
  nav buttons; the per-ingredient route pickers have names; the skip link
  focuses the content without touching the hash router; unsized `<small>` no
  longer shrinks below 12px; touch screens get 44px targets; the current tab
  scrolls into view in the phone's sideways nav strip.
- **Copy that no longer matched its page:** "T300 to T340" (the Tower starts
  where you stand), "Main quests" (it lists every questline), and the Places
  card (it runs backwards too now).
- The build stamp in the footer moved to `2026-09-11.dusk1`.

Left alone on purpose: the tracker docks still sit over the bottom corners — the
owner asked for exactly that layout. `inventory.css` still styles a full-screen
list that no script creates any more; deleting dead CSS was not a visual fix.

## 2026-09-06 (last, 3) — Places runs backwards, and the craft multipliers

**Places can be asked the question the owner keeps asking.** "Start from what I
need" swaps the control row: name an item and a quantity, and every place is
priced in the drink, net or stamina you chose, cheapest first. The page is
linear in the amount, so one probe at a single unit gives the rate; `spend()`
now stands in for the typed amount everywhere so no half of a card answers the
forward question while the other half answers the backward one.

**The mastery arithmetic in hand-written plans was wrong twice.** Resource
Saver I+II+III duplicate a crafted item 45% of the time and the duplicate
carries mastery, so crafts are `remaining / 1.45` — `engine.js` always did
this, the plans did not. And Mushroom Stew's +10% lasts five minutes, so per
the owner it counts on fishing, Grab Bags and harvests but never on a craft
grind. The Calculate page already had this right: its stew line only renders
for gathered goals.

**Verified on the running site**, not by reading it: 27,308 Arnold Palmers and
27,522 Apple Ciders both land on 673k Shimmer Quartz at Black Rock Canyon —
two independent rate tables agreeing to within 1%.

See `docs/T300_PLAN.md` for the per-floor costings this came out of.

## 2026-09-06 (last, 2) — The inventory cap, and how the owner actually plays

A run of plans here were arithmetically right and practically useless — costing
items one at a time that the owner does simultaneously, and spending scarce
Pumpkin Juice to save things that are free.

- **`docs/HOW_THE_OWNER_PLAYS.md`**: the decision rules, their production rates,
  and the order to quote a job in. `CLAUDE.md` and `AGENTS.md` point at it.
  The short version: they are not short of gold, stone, wood or straw — they
  are short of time, inventory space, and things that cannot be bought.
- **The inventory cap is now modelled.** Production is collected in ticks and
  anything over the cap at that moment is gone. At the owner's 15,870 cap the
  Sawmill loses **36,780 Board and 10,380 Wood an hour**, so Wood and Board both
  deliver exactly 95,220/hr however far apart their nominal rates are. A new
  Setup field takes the cap, and the covered-by lines say what is being lost.
- That also explains **why Hickory Omelette is worth more than its 2.2x**: six
  collections an hour each fit under the cap where one hourly drop would
  overflow. The Sawmill branch now counts ticks, not just the multiplier.
- **All 8 grab bags imported** from the workbook's Bags tab, which I had
  skipped as "a calculator this app does not model". It is the backbone of the
  owner's main loop: one Grab Bag 01 gives 4.285 each of Bone, Mushroom,
  Potato, Aquamarine, Golden Cucumber and 3-leaf Clover at once.
- 109 tests pass.

## 2026-09-06 (last) — Real mastery numbers, Steel works, effectiveness in one go

- **`tools/build-personal-tower.py`** imports a Mastery History export. Names
  carry the floor ("Salt 294", "Leather Belt 304/335") and those are three
  digits, while a real part of a name is two ("Runestone 02", "Bone 03") —
  which is what tells them apart. Re-imported from the 2026-09-06 export: 519
  masteries, 129 moved, 5 new, nothing lost. Tower start floor 277 -> 286.
- **The export cross-checks the site.** Its names embed the floor, so all 224
  can be compared against what the app believes: **222 agree**, and the two
  that differ are the dual-floor items (Leather Belt 304/335, Tin Scraps
  309/325) where the app holds the higher floor. No errors found.
- The Tower test no longer pins a frozen snapshot — it broke on every fresh
  import. It now checks the invariants: values capped at 1m, floors stripped
  from names, two-digit suffixes kept, startFloor matching towerAtCapture.
- **Steel works** added to Setup, covering Steel and Steel Wire. Entering a
  Steel rate fills Wire at a third of it, which is the owner's own measurement
  (1,500/hr against 4,500); both stay editable because that ratio is one
  player's observation, not a stated rule.
- **"Use N everywhere"** on the Places effectiveness field, since most players
  sit at one number and typing it into fourteen cards is busywork.
- 109 tests pass.

## 2026-09-06 (later) — The rest of the owner's workbook

*"do everything, the sheets are a reliable source ... if there's something we
are using in the website and you dont know the rate, take the sheets for it."*
All 20 tabs read; four had something the app was missing.

- **`data/owner-workbook.js`** + `tools/build-owner-workbook.py`, holding what
  did not belong in the rate or constant files.
- **405 masterable items, each rated** — a Tower floor where it is a Tower
  requirement, otherwise *1 easy* through *6 extremely hard*, or **not possible**
  (62), **too long / pet** (38), **too expensive** (10), **event** (53). The
  Tower rail used to say only "No route data for this one yet"; 40 rows in the
  owner's range now say what they actually are — Energy Coil *not possible*,
  Crab Claw *too expensive*, Silk *6 extremely hard*.
- **Nine Mega Mastery cost rows** with their ingredient breakdown, and the
  owner's own price list: 25 meals in gold each, 28 items per 1,000 in AP and
  gold, and the conversion rates (70 fishing nets to a Large Net, 3 oranges to
  an OJ, 30 lemons to an AP).
- **The workbook checks itself.** Its Water Lily row wants 68,301 items for
  33,930 Large Nets, which is 2.013 per net — the Tower MM Calculator's 1.83
  with Sea Pincher's 10% on top. Two independent sheets landing on the same
  number, now pinned by a test.
- Tabs skipped and **why** are written into the generator: `Acorn pie leather`
  is empty, `Items recipe` is already complete in the game export, the quest
  tabs duplicate `data/main-quests.js`, and the rest are calculators for things
  this app does not model.
- 109 tests pass.

## 2026-09-06 — The owner's own workbook replaces buddy

*"take the sheets rates or anything over buddy's any time and change
everything about them."* Done, from `Untitled spreadsheet.xlsx`.

- **45 exploring rates replaced, 5 items added.** From the workbook's **Item
  drops** tab, which is a live calculator — the rate is items ÷ the AP input.
  Biggest moves: every critter roughly doubles (Fire Ant 5.42 → 10.82, Giant
  Centipede 5.12 → 10.25, Caterpillar 3.10 → 6.23), Ember Lagoon Ancient Coin
  25.86 → 9.75, and all of Sinking Swamp. Its "Junklands" is our "Jundland
  Desert" — identical item list, so it is a rename, not a new place. Items the
  tab does not list were kept rather than dropped.
- **The stamina calculator tab settles what the item text never could.** Its
  28 rows from effectiveness 0 to 108 are exact:
  `stamina = 1250 + 12.5 × effectiveness`, `× 0.67` for perks, `× 0.8` for
  Neigh, and a cider does `(1 + effectiveness/100)` times base exploring.
  Divide the first by the last and effectiveness cancels: **one explore costs
  1.25 stamina, always.** `explore_base_stamina` was 1 and unverified; it is
  1.25 and verified. The app now reproduces the sheet exactly at every step.
- **Wanderer's four tiers ADD UP.** The sheet's perk column is ×0.67 at every
  row, and 4+7+9+13 = 33. `effects.json` has been 0.2, then 0.13, now **0.33**.
  `exploreStaminaPer` moves 0.87 → 0.8375.
- Effectiveness is a **percentage**, not a stamina price. Raising it gives a
  cider proportionally more explores for proportionally more stamina, so it
  stretches ciders, not stamina.
- Caught while verifying: the cider figure from the sheet is already in stamina,
  so multiplying it by the full per-explore cost counted the 1.25 twice
  (3,188 instead of 2,550). Split out `perkFactor()`.
- 105 tests pass.

## 2026-09-05 (last, 4) — The cider bill was 100x too high

The owner: *"i am pretty sure 10k apple ciders doesnt consume 832million
stamina ... i have use over 15k in some places and it doesnt even use up to
10m"*. Correct. 832m stamina is about ten thousand full stamina bars.

- **Places was multiplying the cider bill by effectiveness.** It is not a
  price per explore — it is stamina per *click*. One explore is one stamina,
  and a cider is about 1,000 explores for about 1,000 stamina. 10,000 ciders is
  10m stamina, not 832m.
- The rest of the app always had this right (`stamina = explores *
  exploreStaminaPer * neigh`, `ciderUses = explores / ciderRolls` in app.js).
  Places was the only page that disagreed with it.
- **Wanderer was not being applied at all** on Places — the answer to "is this
  considering the amount of stamina getting saved?" was no. It now reads
  `mods().exploreStaminaPer`, and the bill names which savings are in it:
  "8,700,000 stamina (after Wanderer)", "6,960,000 (after Neigh and Wanderer)".
- Effectiveness no longer gates anything, since it does not enter the
  arithmetic. It says how much clicking a pour takes: "One click does 104
  explores here for 104 stamina, so a whole Apple Cider is about 9.6 clicks."
- `docs/STAMINA_AND_EFFECTIVENESS.md` now records that the item text alone is
  ambiguous, that reading it twice gave two wrong answers, and that what
  settled it was the owner checking against their own play.
- 105 tests pass.

## 2026-09-05 (last, 3) — Meal switches on Places, and the cider bill

- **Meals toggle on the Places tab**, showing only the ones that change that
  mode: Quandary Chowder, Neigh and Mushroom Stew for exploring; Sea Pincher
  Special and Mushroom Stew for fishing. They read and write **Setup's own
  store** through a new `window.FRPG_MEALS` bridge — writing to localStorage
  directly would have left `state.meals` in app.js stale until a reload.
- Each is applied where the workbook does **not** already account for it, which
  is not the same answer for all of them:
  - **Quandary Chowder** is already inside the exploring rates (550 per AP =
    500 finds x 1.1), so turning it off divides it back out.
  - **Sea Pincher Special** is not in the fishing rates (exactly 500 per Large
    Net is perks alone), so turning it on multiplies up.
  - **Neigh** moves the stamina a cider costs, never the exploring it does.
  - **Mushroom Stew** gives no extra items at all — each one counts 1.1x toward
    a mastery, so it only changes how many finish a Tower row (Aquamarine Ring
    at T286 goes from 782,829 items to 711,663).
- **The pour's stamina bill is stated next to the field that changes it**:
  "Your 260 Apple Ciders here: 8,840,000 stamina." A cider's stamina moves with
  effectiveness, so the per-cider figure alone was not the number being asked
  for.
- Chest contents keep their quest and Tower flags now that they sit outside the
  drop table — they count toward both exactly like a drop does.
- 105 tests pass.

## 2026-09-05 (last, 2) — Everything the game says about stamina

The owner: *"protien bars just increase effectivness"*, then *"please check
everything about stamina and effectivness farm rpg has to offer"*. They were
right, and the check turned up two data errors older than this session.

- **Wanderer is a skip chance, not a discount.** The game lists it per tier:
  "4% / 7% / 9% / **13%** chance exploring won't use Stamina", and the tiers
  replace each other. `data/effects.json` said "Uses about 20% less stamina
  while exploring", value `0.2` — the wrong number *and* the wrong mechanic.
  Now `0.13`. This moves `exploreStaminaPer` from 0.80 to 0.87 everywhere.
- **An Apple Cider's stamina is not fixed; its exploring is.** The item page:
  "The amount of stamina used by this item depends on your exploring
  effectiveness in each explore location." So a cider is 1,000 explores
  (1,250 with Cinnamon Sticks) costing 1,000 x effectiveness stamina — at 104,
  that is 104,000, not 1,000. This reverses the "fix" made earlier today,
  which had read "1000+ Stamina Use" without the item page beside it.
- **Effectiveness only ever goes up.** Protein Bars, Jill and Sprint Shoes all
  raise it ("Doubles Stamina Effectiveness — Stamina is used faster"). The page
  said Protein Bars and Jill lowered it. It now says what raising it is for:
  stamina comes back on its own and ciders do not.
- **`docs/STAMINA_AND_EFFECTIVENESS.md`** collects all of it in the game's own
  words — what uses stamina, what gives it, what saves it, what never touches
  it, and the single inference the app leans on, flagged as an inference with
  the in-game check that would confirm it.
- 101 tests pass.

## 2026-09-05 (last) — Places corrections, all from the owner playing the game

Four reports, every one a real modelling error rather than a display bug.

- **"it doesnt calculate how much stamina i am using with cider."** Right, and
  worse than that: Apple Cider was on the wrong side of the model entirely. The
  game says **"1000+ Stamina Use | Does not give Stamina | Works with Wanderer
  Perks | Need at least 1000 Stamina to use"** — a cider is a fixed spend of
  1,000 stamina, so what it buys depends on the location. It now goes through
  the stamina path and states the spend: 1,000 ciders is 1,000,000 stamina, or
  9,615 explores at 104 each. `cider_base_rolls` was described as "item-roll
  equivalent"; it is stamina, and is now labelled so.
- **"why is stamina in fishing ... take away stamina."** Right — fishing costs
  bait, not stamina (Worms are type `bait`, "Use this to catch fish"). The
  option is gone, and Effectiveness no longer shows on fishing cards, since it
  is an exploring mechanic.
- **"the whole rings drop are from the chest not in here."** Right, and the
  data proves it: Medium Chest 02 drops 0.08987 per AP at Black Rock Canyon and
  holds 5 Aquamarine Rings; the workbook lists Aquamarine Ring at 0.4493. The
  workbook expands a chest into its contents and lists them as drops. Now
  detected by arithmetic — if every ingredient of a craftable item appears at
  exactly its rate times its amount, the table has expanded it — and shown
  under the drops as "And inside those chests". Confirmation the detection is
  right: pulling the contents back out lands Highland Hills, Black Rock Canyon
  and Mount Banon on exactly 550.0 and Pirate's Cove on 500.0.
- **"i dont understand this what is this for just take it out."** The rates
  note explained the workbook's internals. It was written for me, not for a
  player. Now one line.
- Effectiveness is the field's name, as the game calls it, and it says what it
  buys: "At 104 stamina an explore, one Orange Juice (100 stamina) is 0.96
  explores here, and one Apple Cider (1,000 stamina) is 9.6."
- A place with logged rates but no per-AP rates now says which spend would
  work instead of "nothing recorded".
- Queued as TASKS #3: `engine.js` has the same cider error on the Calculate
  page. Not fixed here because Calculate has no location, so it has no stamina
  cost to divide by — the options are written up in `handoff/TASKS.md`.
- 100 tests pass; verified in a browser with no console errors.

## 2026-09-05 (later) — Places: what a pour actually returns

The user: *"add the locations where i can explore and fish ... add Exploring
Effectiveness ... to each one of them so everyone can edit them to their own
effectiveness ... if i want to pour 1k arnold palmer there what do i get in
return"*, then *"or 2k 3k ... even for the fishing"*.

- New **Places** tab. Every explore and fishing location, with what it drops
  and what a stated pour returns: Arnold Palmers, Lemonades, Apple Ciders,
  Orange Juices, raw stamina or plain explores; Large Nets, Fishing Nets,
  rod casts or stamina for fishing. Each currency converts to actions through
  Setup's own numbers, so ticking Lemon Squeezer changes the answer here too
  (`window.FRPG_MODS`, exposed from app.js).
- **Exploring Effectiveness is typed in, per location.** Farm RPG prints it
  on the location page and Protein Bars and perks move it, so there is no
  right value to default to. Without it, the stamina and Orange Juice options
  refuse to answer rather than invent a cost. Stored per location in
  `frpg_location_effort_v1`.
- **Both rate sets are shown side by side, never averaged.** The shared Tower
  MM workbook is *drops per Arnold Palmer*; `data/data.js` is *explores per
  drop* from community logs. They disagree by roughly 12x on exploring. But
  not randomly: multiply one by the other and every item at a location lands
  near the same figure (~1,700-2,400), which the page states as "one Arnold
  Palmer does the work of about N explores here" and labels as measured off
  the two tables rather than stated by the game. On fishing the gap is about
  2x and is explained: the workbook assumes a 500-catch Large Net and Setup
  may have yours at 250. The page now says so.
- Fishing reads the table that matches how you fish — `manual_fish_rates` for
  the rod, `drop_rates` for nets. Using one for both double-counts.
- New `data/location-rates.js` (+ `tools/build-location-rates.py`): the
  `iron_depot_rates` that `build-data.mjs` was discarding. Used only when
  Setup says the player owns Iron Depot. 158 of 159 comparable pairs get
  better, as they should.
- Every row is scored against what you still need: the tracked questline's
  shortfall and the lowest unfinished Tower floor, with an "Only what I still
  need" filter and an item search that re-ranks the locations. "Where do I
  pour 1k AP for Ancient Coin" answers Ember Lagoon, 26k.
- 98 tests pass; `handoff.mjs check` clean; verified in a real browser at
  1180px and 375px with no console errors.

## 2026-09-04 — Inventory questline planner and shared item art

- Added a dedicated Inventory tab with a searchable owned-item list, questline
  picker, next-quest requirements, and a scrollable full-line total. Shortages
  sort first, completed quest steps are excluded, pending saga steps remain
  visible, and the two planning panels stack below 900px.
- Added Track controls to every questline. Quests and Inventory now share one
  saga-aware quest model and one completed-title normalizer, including the
  personal list plus imported account captures.
- Added a single shared art lookup used by the calculator, Tower, Quests,
  Mining, and Inventory. Added 106 verified missing quest-item pictures plus
  13 existing Mining pictures to `data/item-art.js`; all 119 URLs returned HTTP
  200. Silver stays art-free and is labelled as currency.
- Added Inventory/model/art regression coverage. All 52 tests pass, every
  edited script passes `node --check`, and the self-contained preview bundle
  was checked at desktop and mobile widths with no browser-console errors.

## 2026-09-02 (later) — Player-facing correctness pass

The user: *"continue with this build there's still too many wrong things in
the website"*, then two specific reports — fish being presented as crafts,
and doubt about the Cider-vs-AP "whichever is cheaper" choice because Cider
spends stamina. Everything below was found or verified by driving the real
app in a browser, not by reading source.

**Real calculation bug.** The Route decisions cards were sized against the
fully-expanded recipe tree rather than the plan actually being shown. Glass
Orb displayed "× 12m" (with a gold estimate to match) next to a shopping list
asking for 8m, because Red Dye was being bought instead of crafted through
Glass Bottle. Decisions and the tree are now settled together to a fixed
point.

**52 dead buttons.** Tower mastery and floor-cost entries rendered with
`role="button"` and "Open X in the Craft planner", but `FRPG_openItem`
returns false for items the planner has no data for, so the click silently
did nothing. Those entries are no longer buttons and say "No route data for
this one yet"; the working ones now have a hover/cursor affordance. Their
missing art rendered as a bare `?` (52 tiles) and now shows the item's
initial.

**Fishing.** Every leaf in the plan tree rendered bare under a heading that
said "Chosen craft tree", so Pearl, Catfish and every other fished ingredient
read as something you craft. Each leaf now states how you actually get it
(fish for it / explore for it / grow it / buy in trade / buy at the Country
Store), and a goal with no recipe says "Not a craft — you get this one
directly" instead of showing a crafting-yield chip.

**Cider vs AP.** "Auto — whichever is cheaper" asserted a winner without
showing that Cider's advantage is spent on stamina. The planner now prints
both sides and the gap, and warns when Lemon Squeezer, Cinnamon Sticks or
Wanderer are off — those three swing it hard (perks off: Cider looked 2.6x
cheaper; endgame set on: 5.5k vs 7.17k gold). Added a "Stamina you really
spend" percentage next to the drink picker, because the perk list only models
Wanderer and overstates stamina for an endgame account. **Not resolved:** the
user believes they spend about 50% of normal stamina but was not sure, and no
source was found for the full stacking rule — the control is there so they can
set it, but the real figure is still unverified.

**Copy.** `fmt() + "g"` rendered gold as "152.46kg". "1 inputs". "recipe
stopped at the chosen acquisition route", "direct acquisition stop", "Handled
quietly", "Extension not connected", "Calculator assumptions remain manual",
"Strategy export is unavailable. Rebuild data/knowledge.js.", and a Tower
summary claiming T330 under a heading promising T340.

**Strategy library / Field lab** (the two pages NEXT_PHASE flagged as
undecided — the user said to use judgement). Kept both, stripped the build
diagnostics. The library is now "Why routes get picked"; the integrity /
unresolved-names / parse-coverage panel and the ETL evidence strings are
gone. All 17 route notes were rewritten from calculator instructions into
player advice, and the needs-measurement badge was wrong on 7 of them — it is
now "Needs your own numbers" on only the four that genuinely need the
player's own measurement. **The rewrites were also applied to
`knowledge-pack/farmrpg.db`**, since `data/knowledge.js` is generated by
`tools/export-knowledge.py` and would otherwise lose them. The Field lab's
editable constants had raw storage keys as titles ("crop qf is reduction")
and now have readable names.

Housekeeping: added `?v=` cache-busting to the `data/data.js` and
`data/knowledge.js` script tags, removed a stray 0-byte `({id` file, ignored
`.claude/`, and replaced a test that asserted UI copy ("Manual backup") with
one that asserts the control it was standing in for. 38 tests pass.

## 2026-09-02 — Claude takes over the project

The user's Codex usage ran out mid-session; they shared the read-only Codex
chat transcript and asked Claude to continue, then to take over the project
entirely.

- Found and fixed a `SyntaxError` in `app.js` (corrupted template literal,
  stray `'` characters) left by the previous session's last, unfinished edit
  — this had made the entire calculator fail to load.
- Verified the Tower T301–T340 floor data (40 floors) and the 202-quest /
  19-questline main-quest data were actually complete and correctly wired
  in underneath that syntax error.
- Fixed 3 test files that hardcoded an absolute Windows path instead of
  resolving relative to the test file (broke portability; see
  KNOWN_MISTAKES.md).
- Updated one stale test assertion (Tower goal floor 300 → 340) to match the
  intended T340 extension.
- All 38 `calculator/tests/*.mjs` tests pass; `knowledge-pack` self-test
  passes; every top-level and `data/*.js` file passes `node --check`.
- **Created the first git commit this project has ever had**
  (`f959945`, "Checkpoint: Lantern Ledger calculator, Tower T301-T340 + main
  quests") — the project had zero version-control history despite months of
  work across many AI sessions. Set a local (not global) git identity since
  none existed on this machine.
- Wrote `PROJECT_STATE.md`, `KNOWN_MISTAKES.md`, `NEXT_PHASE.md`, and this
  file, consolidating the ~120-turn Codex chat transcript so future sessions
  don't need to re-read it. (`knowledge-pack/PLAYER_KNOWLEDGE.md`,
  `AI_READ_FIRST.md`, and `docs/FARM_RPG_PLAYER_SKILL_BLUEPRINT.md` already
  existed and are the canonical game-knowledge memory — these new files are
  a project-status layer on top, not a duplicate.)
- Fixed 5 **undefined CSS custom properties** (`--panel`, `--panel-2`,
  `--accent`, `--bg`, `--bg-soft`) used across ~18 rules in `quests.css`,
  which silently rendered quest filters, quest lines/steps, `.quest-item`,
  `.tower-cost-card` and `.route-evidence` with no background, border or
  accent colour. Remapped to the real design tokens. Same fix applied to
  `publish/quests.css`. A full CSS audit now reports zero undefined custom
  properties anywhere in the tree.
- Added `window.FRPG_openItem(name, qty)` as a cross-page bridge, and wired
  quest requirement chips, Tower mastery rows and Tower cost-grid items to
  it — clicking anything you still need now opens it in the Craft planner
  instead of leaving you to search for it by hand.
- Added missing accessible names to the owned-quantity input and the
  per-item route selector.
- **Found the likely root cause of "the site feels like it's for you and not
  the player":** there are two divergent front-ends. `publish/` is a
  player-facing trim (no Field lab, no Strategy library, home shortcuts
  pointing at Tower T340 / main quests / mining) that a previous session
  built and never merged back. The root copy — the one actually opened — is
  still the developer-facing version. See NEXT_PHASE.md; needs a user
  decision before merging.
- Archived the original Codex transcript to `docs/history/` so no future
  session ever re-fetches the ChatGPT share link.
- Added an **Exploring drink** control (Auto / Apple Cider / Arnold Palmer).
  The engine had been auto-picking whichever was cheaper in gold, so an AP
  player could never see their own numbers, and the volatile AP price made
  the pick flip between runs. Persisted as `frpg_drink_path_v1`.
- **Acorn Pie is now a visible cost.** The pie count shows as a line item
  next to Explores/stamina and Cider/AP, and the note spells out uses →
  action charges → pies, including the ÷5 when Cabbage Stew or Lemon Cream
  Pie is active. Verified: Hide ×100k on a 100-uses→250-Hide sample gives
  40k uses = 40k charges = 267 pies; with Cabbage Stew, 8k charges = 54 pies.
- Turning Acorn Pie on with no saved samples used to change nothing and say
  nothing, because `acornPlan()` bails without a measured sample. It now
  explains that and links to the Field lab.
- Route labels no longer leak internal type names ("acorn" → "Acorn Pie
  overlay"; also explore/fish/crop/vendor/inventory).
- Added `build/bundle.py`, which inlines the whole site into one file so it
  can be rendered and driven headlessly. Both bugs above were found this way,
  not by reading source.

## 2026-09-03 — Player-chosen routes, Mining page, and a real visual identity

Everything below was driven by the user watching the live site and reacting.

### The calculator stopped deciding for the player
- Removed the "cheapest route" verdict. Every ingredient row now shows the
  paths side by side and the player picks: buy it (at **their own** typed rate
  per 1k, in AP / AC / OJ / gold), explore with Apple Cider (with the stamina
  it burns, Wanderer/Neigh applied), or use Arnold Palmer (with Quandary
  Chowder applied). Stamina is never priced as gold — an endgame farm makes
  roughly a million of it, so quoting it in Orange Juice was meaningless.
- **Arnold Palmer is not exploring.** Exploring spends stamina; AP is its own
  action with its own drop rate. AP counts now come from the shared workbook's
  drops-per-AP table instead of being derived from explore counts, which had
  been off by roughly 10×.
- Items that cannot be mailed say so instead of offering a trade route.
- Route rules gained `never`, so "nobody fishes Crystal River for Glass
  Bottle" is a data statement rather than a special case in the UI.

### Fishing is fishing, not crafting
- Fish get their own plan: by hand / Fishing Nets / Large Nets, with the net
  perks and Sea Pincher Special named in the note. No production tree, no buy
  price — fish cannot be bought.
- Mushroom Stew now reports two separate figures: items that land in your
  inventory, and mastery earned. It never changed the item count.

### Mining page
- Replaced the "New items" page. The six mines stack vertically; opening one
  shows its drops inline with art, each craft's full ingredient list with art
  and where each ingredient comes from, and what the craft itself feeds into.
  Inverting the release catalogue's own recipes lifted craft links from 9/59
  to 38/59 items.

### Art sizing
- `itemImg` had been emitting `width="48" height="48"` for every tile size, so
  small tiles rendered a 48px image inside a 30px box. Each variant now
  declares its own box (`ART_PX`). Same bug fixed in the Mining page.
- `.item-art.small` was the one variant painting a cream tile behind the
  sprite; Farm RPG art is drawn for dark grounds, so pale items washed out.

### Visual identity (`system.css`)
- Gold had been doing six jobs — labels, links, hover, focus, state and data —
  which is why nothing read as important. One job per colour now: figures take
  the accent, state is a 2px rule down the left edge, labels are muted, links
  underline on hover.
- **New palette, taken from the game's own materials** rather than the generic
  dark-mode gold: indigo rock ground, copper for figures, malachite for state,
  amethyst for trade, iron blue for fish, quartz-bone paper panels.
- **New typefaces, three distinct voices:** Bricolage Grotesque for anything
  you scan (headings, tabs, buttons), Newsreader for anything you read (prose,
  item names, notes), Spline Sans Mono for anything you count.
- Deliberate unevenness instead of a uniform grid: section eyebrows hang in a
  ruled left margin like a ledger annotation, the home hero is the one
  oversized headline on the site, the goal column of the summary strip is
  wider than the ones supporting it, and padding follows a card's role.

### Data
- `data/tradeable.js` — 201 mailable / 586 not, from the knowledge pack.
- `data/workbook-rates.js` — 337 rates in the workbook's own units, labelled
  as such because they are not the same denominator as `data/data.js`.
- Tower floors annotated `itemsAre: "rewards"`; the 2× silver discrepancy at
  T276 is recorded, not applied — one data point does not justify rewriting 40
  rows if the multiplier turns out to be band-dependent.

## 2026-09-03 (later) — Threw out the dark theme; built the almanac

The indigo/copper dark theme still read as an AI dark-mode template — the user
rejected both it and the fonts outright ("looks soooo vibe coded even the
fonts"). Rather than guess a fourth palette, I put three real directions on one
style board (graph-paper worksheet / phosphor terminal / printed almanac) and,
when asked to decide, committed to the **almanac**: the one that reads as
actually being about farming instead of another dark app.

- **Light, warm-paper theme.** The whole app was dark-first; the tokens in
  `style.css :root` now define a printed-almanac palette — warm paper ground,
  ink text, rust figures (`--gold` #a63a20), forest-green state. A stray second
  `:root` in `v3.css` was still redefining the palette dark and overriding the
  theme; removed it. All the dark panel and hairline tints across the five
  stylesheets were remapped to kraft, and the white-on-dark hover washes to
  ink-on-paper.
- **Item tiles stay dark on purpose.** Farm RPG sprites are drawn for dark
  grounds, so the tiles became dark "specimen wells" pressed into the paper —
  the sprites read, and it suits the almanac.
- **New type, one job each:** Bevan (woodtype) for the big headings only,
  Bitter (serif) for reading and for the chrome, Courier Prime (typewriter) for
  every figure and label. The woodtype is a feature, not the body face.
- **Corrections live in `system.css`** in one clearly-commented block so the
  five underlying stylesheets stay dark-authored and the theme stays in one
  place — masthead kraft band, dark stamp panels (goal ticket, data cards) with
  cream inputs so typed values stay readable, notice slip, focus ring.
- Verified on Home, Calculate (Giant Squid ×1m), Mining (Highland Hollow
  opened), Setup and mobile: no console errors, no horizontal overflow, tests
  40/40.

## 2026-09-03 (later still) — Matched buddy.farm's plainness

The almanac and every earlier theme still read as "designed at" the page. The
user pointed at buddy.farm as the one that looks like everything is "in its
place" and asked what the difference was. Studied it directly: buddy uses the
plain **system font**, pure white, and — the key thing — shows item pictures
**directly on the surface with no tile box behind them**, small and inline with
their labels, rows separated by hairlines, one accent colour.

Rebuilt the theme to that discipline:
- **System font everywhere** (`--ui`, the native system-ui stack). Dropped the
  Google Fonts import entirely — no web fonts load now.
- **Item pictures have no tile.** `.item-art`/`.mine-art` are transparent, the
  sprite sits on the card the way buddy shows them. Only the single large goal
  picture keeps a soft plate to anchor the header.
- **Near-white ground, white cards, one green accent** (#2f7d55) for the primary
  figure, the active state and the primary button; every other figure is dark
  ink. Route/category colours desaturated to quiet tags.
- Calmer type scale (h1 ~40px, weight 700, not an oversized woodtype hero) and
  quieter eyebrows.
- Removed the leftover kraft tints and a stray dark `:root` in v3.css that had
  been fighting the theme.

Verified on Home, Calculate and Mining: system font active, item art
transparent and loading (naturalWidth 256), no console errors, tests 40/40.

## 2026-09-03 (eye-comfort pass) — Understood buddy, applied it

The point was never buddy's exact colours or font — it was that buddy is a
reference document (content in aligned rows, almost no boxes, generous white)
while this had been dressed as a marketed app (a grey field of bordered,
shadowed boxes, shouty UPPERCASE eyebrows over every block, tiny low-contrast
text on a very wide measure). That is what made it "hard for the eye."

Applied the principle rather than copying the site:
- **Pure white ground**, not grey with cards floating on it.
- **Borders mean "interactive."** Reading blocks lost their border and shadow
  entirely; only inputs, grouped toggles and small chips keep one light hairline.
  A single hairline under each section heading gives the page its spine.
- **Bigger, higher-contrast text** (16px base, darker `--muted`) in a
  **narrower, comfortable column** (max 1120px, was 1480).
- **Eyebrows calmed** to normal-case, small, muted — labels, not stamps.
- Removed the last decorative leftovers: the copper offset drop-shadows and page
  tilts, the dark masthead, the cream inputs.
- Home shortcuts are now a clean hairline grid (muted code, dark title, green
  link, green rule on the featured one).

No horizontal overflow, tests 40/40.

## 2026-09-03 (dark + mining) — Dark theme, and mining recipes go sideways

- **Dark theme, keeping the calm rules.** Flipped the tokens to a near-black
  ground (#151619) with light text, soft hairlines and the same single green
  accent — not a return to the old busy dark. The hard-coded whites (masthead,
  inputs, cards) became variables (`--field`, `--ink2`) so the whole app actually
  goes dark. Item pictures are still transparent, which now reads even better —
  Farm RPG sprites are drawn for dark grounds.
- **Mining recipes flow sideways.** Each ingredient was a full-width row with a
  source sub-line, so a craft like Stained Glass Art (17 parts) became an endless
  column, made worse by every drop also showing what its craft "goes into" with
  its full recipe. Ingredients are now compact chips (icon · qty×name · source)
  that wrap horizontally, and each drop is a full-width band so the chips have
  room to flow. The drop itself is marked with a green chip.

Tests 40/40, no console errors.

## 2026-09-03 (tower colours) — Tower page brought onto the theme

The Tower page had never been migrated: purple/indigo panels, a copper "next
floor" stamp with a tilt and drop-shadow, orange progress bars — and, worse, its
big numbers used `var(--paper)`, which is dark in the dark theme, so several
figures were dark-on-dark and invisible. Rebuilt tower.css on the shared tokens:
neutral dark cards, green for the next floor / active state / progress fill,
`var(--text)` for figures, muted for the "X left" amounts and labels. Dropped the
tilt and offset shadows and calmed the oversized "Your Road to T340" heading to
the site's scale. Quests was already on-theme.

## 2026-09-03 (tower requirements) — Real floor requirements from the wiki

The Tower cost section used to show each floor's reward items and a silver price
(buddy figures we already suspected were 2x off), which the user had said were
rewards, not requirements. Replaced it with the actual requirements from the
official Tower MM wiki (farmrpg.com/#!/wiki.php?page=Tower+MM): for T300–T340,
the Grand Masteries and Mega Masteries you must already hold, each with its
picture pulled straight from the wiki so it shows regardless of local data.
Silver is gone. The wiki's table ends at T340, so there is no T341–T350 to show.
`data/tower-floors.js` is now `[floor, gms[], mms[]]`; the render groups the two
and drops the silver/AK/reward lines; headings updated ("Every Floor, and What
It Needs").

## 2026-09-03 (cohesion pass) — One accent across every screen

Audited Home, Calculate, Setup, Tower, Quests and Mining together and pulled the
last of the rainbow onto the single-accent system. The three route cards no
longer each carry a different-coloured spine — green marks the recommended card,
the others a neutral hairline. Route-type tags collapse from violet/amber/blue/
gold to muted, with green for "you've got it" and red kept only for an unknown
route. Trail figures are plain ink with one green lead; the trail connector is
muted. The "your farm covers this" strip flattened from a green gradient box to a
quiet green-marked note. Compact headings inside cards no longer draw a section
rule. Green now means exactly one thing everywhere: recommended, or handled.

## 2026-09-04 — Mastery import, and floors 300–340 folded into the rail

- **Imported the 2026-09-04 mastery export.** `data/personal-tower.js` regenerated
  from the newest column of the player's Mastery History CSV (514 items, up from
  439). Names keep the same base-name rule: a trailing three-digit floor tag is
  stripped ("Looking Glass 278" → "Looking Glass") while two-digit name numbers
  ("Bone 02", "Runestone 04") are left alone. Values are clamped at 1m, the cap.
  Next blocker moved T278 → T282 because Looking Glass finished.
- **T300–T340 now live in the main rail**, in floor order after 299, instead of a
  separate section underneath. The separate grid and its listeners are gone.
- **Fixed a real overstatement:** the rail scored every requirement against 1m,
  but the wiki shows many floors only need a **Grand Mastery** (100,000). Rows now
  carry their tier and are measured against the right goal — Cotton at 237k is
  done for T301 rather than "762k left". Legend and summary updated; Pumpkin Juice
  hint only applies to Mega Masteries now.
- Requirement rows use the planner's own art where it has the item and the wiki
  picture otherwise, so every row shows a picture.

## 2026-09-04 (home panels) — Give the two home cards room

The cohesion pass had zeroed the side padding on `.readiness-card` and
`.rule-card` along with the other "reading blocks", but those two keep a visible
background, so text sat on the card edge and the surface stopped on the final
word. Restored padding (24/26/34, deeper at the bottom) so the background carries
past the last line, and set `.desk-lower` to `align-items: start` so each panel is
its own height rather than being stretched to match its neighbour.

## 2026-09-04 (quests) — Every questline in the game

Replaced the 202-quest main-story file with the full set from the community Quest
Tracker (farm-rpg-quest-tracker.pages.dev, its `questlines.json`, data of
2026-09-02): **2,479 quests across 569 questlines**. Verified the 202 story quests
survived unchanged — same titles, same requirements, same order — before swapping.

Sequels stay together, which was the point: each quest keeps its `line` and
`sequence`, and the list is pre-sorted so a line reads first step to last
("99 Bottles" runs I→XCIX in order). The tracker's `pred` graph also gives better
prerequisites than we had ("levels farming 15, crafting 2; after 99 Bottles #1").

Each line is tagged by `category` so the page stays usable at this size:
- **main** — the 19 permanent story lines, listed first, green tag
- **side** — 251 permanent NPC lines, alphabetical
- **event** — 299 seasonal lines, newest first, showing when they ran

Seasonal quests that have already closed are excluded from Not Done / Available —
a finished event is not work you can pick up — but remain browsable under the new
**Events** filter and under All. Right now that leaves 1,169 actionable quests out
of 2,479, and "A Safer Big Boom" shows as running.

Note: `data/main-quests.js` is now 1.2 MB (was 96 KB). It still loads as a plain
script with no fetch, so opening from disk is unaffected.

## 2026-09-04 (completed quests) — The player's own list, applied

The player pasted their Completed Help Requests list (1,952 entries). Matched it
against the 2,479-quest database: **1,934 matched exactly, and the remaining 18
matched once spacing was ignored** — Farm RPG prints a few titles with a space
missing ("MisconstruedRelational", "Round,Buddy,", "Make Life TakeThe Lemons
Back!"), and the joke "ribbet…" quests differ only in whitespace. Final result:
**1,952 of 1,952, nothing unmatched.**

Stored in `data/personal-quests.js` using the canonical spellings from
`data/main-quests.js`, so matching is exact at runtime. The Quests page treats it
as an authoritative source that needs no extension: completed steps show as Done,
everything else as still to do. That leaves **92 quests actually outstanding**.
An account capture still adds "Available Now", which a completed list cannot know.

Also in this pass, on the extension:
- The snapshot now writes to **one file that gets overwritten**
  (`chrome.downloads` + `conflictAction: "overwrite"`), instead of the old blob
  link that made Brave keep every copy as "(1)", "(2)", … A popup toggle keeps
  that file updated after each capture. Needed the `downloads` permission; the
  scope-guard tests were updated deliberately rather than loosened.
- A capture is only labelled **provisional** when it really fell back to generic
  text parsing. It used to say that about every page, including ones a dedicated
  parser handled, which made good captures look untrustworthy.

## 2026-09-04 — The pirate saga is one questline again

Farm RPG renames the "Problems Start Arising" chain as it goes: Pirates Start
Arriving, Problems Still Abound, three different Masonry titles, You Must Build
A Stealth Boat, Pirate Stealth Arrival. The quest database treated each name as
its own questline, so a 29-step run showed up as eleven unrelated stubs.

- `data/quest-sagas.js` (new) declares the saga: the member lines and the full
  step order, read out of the in-game prerequisites rather than guessed.
- `quests-page.js` stitches saga members into one line before rendering, and
  shows the alternate names under the title.
- Step XXIX is in the player-shared requirement sheet but not yet in the quest
  database, so it is listed last, marked, with its item bill only.
- Cross-checked all 32 known steps against that sheet: 30 identical. Two differ
  (Pirates Start Arriving IX Yarn, X Cyclops Spider vs Spider); the in-game
  data was kept.

## 2026-09-04 — Setup guide moved into the site

The Account tab's "Install extension" link opened a raw README.md in the
browser. Replaced with a real guide on the page: three numbered setup steps,
the five site addresses with what each one is for, the file-URL switch called
out as the easy-to-miss one, and three columns on daily use, the file route,
and what the extension will not do.

- `sync-guide.js` builds the downloadable copy from the guide that is on
  screen, so the saved file cannot drift from the page. Styles are inlined and
  the page's own buttons are stripped.
- A test asserts the site list matches the extension manifest exactly, so the
  guide cannot claim permissions that were added or dropped.

## 2026-09-04 — Two agents, one repo

Codex and Claude Code both work on this project and both run out of usage
quickly, mostly by re-deriving what the other already knew.

- `AGENTS.md` (read automatically by Codex) sets the working agreement: read
  order, who does what, branch rules, and which files are the shared spine that
  only one agent edits per task.
- `handoff/STATE.md` and `handoff/TASKS.md` carry current state and the queue,
  deliberately short.
- `tools/handoff.mjs check` is the objective gate both agents run before
  handing over: missing `?v=` bumps, listeners bound to elements that no longer
  exist, `fetch`/ES modules that cannot work from `file://`, and text painted
  in a surface colour.

Writing that check immediately found a live bug: the quantity preset buttons on
Calculate rendered near-white on white (contrast 1.05:1, invisible). A leftover
`background: #fff` from the light theme. Now 6.31:1. Two latent dark-on-dark
buttons fixed at the same time.

## 2026-09-04 — Every picture resolves again

Centralising the art lookup had quietly broken two pages. Several data files
ship their own artwork, and the new shared helper only read `data/items.js`, so
a working URL sitting in the same file was ignored and the tile fell back to a
bare letter.

- Tower T300–T340: 45 requirements lost the wiki art from `data/tower-floors.js`
  (Gold Lemon Quartz Ring, Yellow Bag, Strong Paste, Yellow Butterfly, …).
- Mining: 132 tiles lost the release catalogue art from `data/new-items.js` —
  every craft the mines feed, and their parts.

`item-art.js` now builds its map from all four sources in order of how
canonical they are, and `itemImg` takes an optional image from the caller so a
data file's own artwork can never be dropped silently again.

Verified on screen, not from source: Tower, Mining, Quests, Inventory and
Calculate all report zero placeholders and zero broken images. Mining went from
389 images with 132 placeholders to 521 with none.

## 2026-09-04 — The Inventory tab opens on something

It opened on a dropdown reading "Choose a questline…" and nothing else, so the
page looked broken until you found the Track button on another tab.

- It now works out which questline you are in the middle of — the one you have
  started and have the most left to do on — and shows that straight away. For
  this player that is the pirate saga: next quest Problems Start Arising III,
  whole line 31 steps and 189 distinct items.
- A sentence at the top says what is being shown and how to change it. The
  picker is a change control now, not the way in.
- With no inventory imported, the panels say so above the table instead of
  letting a column of zeroes imply you own nothing in the game.

## 2026-09-04 — The gather lists show everything

Both panels were 62vh inner scroll boxes, so a 189-item questline showed about
nine rows, and item names were clipped to "Amethyst …".

- The lists run their full length; the page scrolls instead of each panel.
- Names wrap rather than truncate; row art is 28px and sits on the name.
- The whole questline has an **Expand** control that opens the complete list
  across the full screen, three columns wide, each row labelling its own
  Need / Have / Short so nothing depends on a column header lining up.

## 2026-09-04 — Extension popup back to one job

- The section list is a plain two-column list again. The per-section **Open**
  buttons are gone: they inherited the global `button { width: 100% }` rule and
  rendered on top of the labels.
- Each captured section shows how much it holds and how long ago it was read,
  so an inaccurate capture is visible rather than guessed at.
- The list refreshes itself the moment a capture lands, instead of only when
  the popup is reopened.
- **Saving a file is opt-in now.** Captures are kept in the extension and
  pushed to Lantern Ledger; nothing is downloaded unless asked for. The file
  controls and the Lantern Ledger link moved into a collapsed section so
  Capture is the only button in the main flow.
- The in-site setup guide was updated to match.

## 2026-09-04 — A captured inventory shows straight away

The Inventory tab read `frpg_owned` and treated it as authoritative whenever it
existed. It exists as an empty object from the app's first save, so a snapshot
that had just arrived from the extension showed as "nothing in your inventory"
until Apply was pressed on the Account tab. It now falls through to the
snapshot when there are no hand-entered amounts.

Verified by posting a snapshot the way the extension does: Spoon 8,000 needed
against 4,200 held reads 3,800 short, with nothing applied by hand.

## 2026-09-04 — A tracker on every tab, and captures that stop overwriting

- `gather-model.js` now owns "what is still needed", read by both the Inventory
  tab and a new floating tracker, so the two cannot drift apart.
- `tracker.js` pins the tracked questline to the corner of every tab: this
  quest on the left, the whole line on the right, collapsible, dismissible, and
  a size toggle for reading both lists properly. No width transition — the
  browser will not interpolate a px width to a `min()` value and the panel got
  stuck at whichever size it started at.
- The Inventory tab's questline picker is gone; **Track** on the Quests tab is
  the one way to choose, and both panels already say what is being shown.
- **The extension no longer captures on its own.** A 90-second timer and a
  route-change capture were reading whatever screen was open, and an inventory
  page showing only gold and silver was replacing a full inventory capture. A
  capture with under a quarter of the rows it would replace is refused too.
- Captures harvest item artwork from the page they read, so a single Inventory
  capture teaches the planner pictures for everything the player owns.

## 2026-09-04 — Tracker: this step small, the whole line across the page

- Small is the step you are on, nothing else. Pressing ⤢ spreads the whole
  line across the entire page in as many columns as fit, so 189 items are read
  across rather than scrolled down — verified at 1900×1000: 5 columns, no
  scrollbar.
- The 13 items the current step needs are marked in the big view, so they stay
  findable in a list of two hundred.
- Big mode clears the sticky masthead (z-index 90). At 70 the site nav printed
  over the tracker's own header, which put its close button out of reach.

## 2026-09-04 — A capture that finds nothing says so

A quests page that parsed no requests still reported success, which is why
"it captured but nothing happened" had nothing to go on. The capture now
records what the page actually looked like — the first lines it read — and the
extension hands those warnings back to the popup.

## 2026-09-05 — Descriptions were being stored as items, and panels hugged their own background

Two things the player reported, both real.

- **Inventory captures contained Farm RPG's item descriptions as if they were
  items** — "A blinger for your finger", "A bottom-feeder you'll want to keep
  for later" — each with a quantity. They had no picture, could not match
  anything, and corrupted every gather list built on top. Every real item on
  that page is drawn with its picture, so the capture now uses the artwork it
  already harvests to tell the two apart, and names whatever it skipped.
- **Panels showed their tint flush against the text.** `.route-card`,
  `.gather-col`, `.source-list` and the rest had their side padding zeroed back
  when the theme was light and the panel colour matched the page. On the dark
  theme that tint is visible, so every heading sat on the edge of its own
  background. They have 20px/22px again.

## 2026-09-05 — Description rows filtered on the site too

Fixing the description-as-item bug in the collector only helped future
captures; every snapshot already saved in a browser still carried them, so
nothing changed on screen. The site now filters them at the point of use as
well, and says how many it ignored instead of the count quietly shrinking.

A row counts as prose only when nothing can identify it — no artwork from any
source and no item of that name — so an item the data files have never seen
but the capture found a picture for is still kept.

Verified with a seeded snapshot: 9 real items kept with art, 10 description
rows ignored, and the summary says so.

## 2026-09-05 — The whole item list, so this stops recurring

Missing pictures had been fixed four times, each time for one more group.
`data/item-library.js` now holds **every** item Farm RPG has — 1,449 names with
artwork, from buddy.farm's own search index, which is where that site draws the
same pictures. `item-art.js` merges it beneath the more specific sources.

That also settles the description problem properly. With a complete list, "does
the game have an item by this name?" has a real answer, so prose no longer
needs guessing at. "Almost transparent" and "and it gets everywhere" — which
slipped past the earlier heuristic — are now correctly ignored, while
"Amber Mire Bloom" and "Apple Ant Buddy Doll" are kept and drawn.

Checked on the player's own list: 18 items, every one with a picture, 4
description rows ignored. Tower, Mining, Quests and Inventory all report zero
placeholders. Eight sampled library URLs return HTTP 200.

## 2026-09-05 — Track toggles off, and the item list settles the prose question

- **Pressing Track on the questline already being tracked did nothing**, because
  the handler only ever set the value. It toggles now, and the button reads
  "Tracking ✕" while it is on.
- **Untracking then auto-picked the same questline straight back**, which is
  what made it feel like nothing happened. An empty stored value is now a
  deliberate "none" and is respected; auto-picking is only for a player who has
  never chosen. The tracker hides and the Inventory tab says what to press.
- **"Adds 100 Stamina" was still showing as an item.** Every shape-based rule
  let it through — it is Title Case with no lowercase word in it. The filter no
  longer guesses: if the complete item library has no item by that name, and no
  artwork was found for it anywhere including the player's own captures, it is
  description text. An item added to the game since the library was built still
  passes, because a capture brings its picture with it.

Verified end to end: a fresh browser auto-picks; Track pins another line and
the tracker follows; pressing it again clears it and the tracker hides;
tracking again restores the list. And on a seeded inventory, "Adds 100
Stamina", "Almost transparent", "and it gets everywhere" and "A chill fish"
are ignored while "Orange Juice", "Amber Mire Bloom", "Apple Slice" and an
invented brand-new item are all kept and drawn.

## 2026-09-05 — Say which build is running, and what the page computed

"It won't track no matter what I do" could not be diagnosed from here, so the
app now reports enough to place the fault.

- The footer carries a **build stamp**. A browser holding one old file looks
  exactly like a bug that was never fixed, and there was no way to tell them
  apart.
- The Inventory tab prints what it worked out — steps left, items needed, and
  how many items your inventory has — so an empty panel has a reason attached.
- `inventory-page.js` no longer assumes `gather-model.js` is the matching
  version. A single missing helper threw and blanked the whole tab, which is
  indistinguishable from tracking being broken.

## 2026-09-05 — Dismissing the tracker was a one-way door

Pressing ✕ on the tracker set a flag with no way to clear it. After that,
tracking a questline showed nothing anywhere the player was looking, so Track
appeared to do nothing at all.

- Tracking a questline always brings the tracker back.
- The Inventory tab offers **Show the corner tracker** whenever it is hidden.
- The ✕ now says what it does: hide until you track something again.

Worth noting alongside it: "A Fool And Their Money" really does have exactly
one requirement, 5 trillion Silver, so that questline showing a single currency
row is correct rather than a failure.

## 2026-09-05 — The tracker is two docked panels

The player asked for this in their first message about the feature and several
times after: **this quest bottom-left, the whole questline bottom-right.** Both
lists had been sharing one panel in the right-hand corner the whole time.

They are now separate panels docked to opposite corners, each collapsible on
its own; only the whole-line panel opens across the page. Below 560px they
stack, with the current step on top.

## 2026-09-05 — Back button, clickable tracker rows, and a measurement

- **The browser Back button left the site.** Every tab change used
  `replaceState`, so no history was ever recorded. Tab changes push now, and
  Back/Forward move between tabs. Going back must not push again or Back could
  never escape, so history-driven changes replace instead.
- **Tracker rows open the item in the calculator**, like every other list in
  the app. Currency has nothing to open and stays inert. Enter and Space work
  too, and Escape closes the expanded whole-line view.
- **Measured before optimising:** `data/main-quests.js` is 1.2 MB, but the page
  reaches DOMContentLoaded in 102 ms with everything parsed. Splitting event
  quests out was on the list as a performance fix; it is not one. Recorded in
  `handoff/STATE.md` so nobody spends a risky refactor on it.

## 2026-09-05 — Copy the gather list

The whole-line panel has a **Copy list** button. It writes tab-separated rows —
item, needed, you have, still short — which paste straight into a spreadsheet;
the player already keeps one for this questline. `navigator.clipboard` needs a
secure context and this app opens from disk, so the copy goes through a
textarea with the clipboard API as the fallback rather than the other way
round. 190 lines for the pirate saga, verified.

Also checked, and rejected: grouping the list by item type. 924 of the 1,138
items are typed simply "item", so the grouping would have been mostly one
bucket labelled Other — worse than no grouping.

## 2026-09-05 — Where each item comes from, and a list you can take in

- **The gather lists now say how to get each item** — Craft, Cook, Grow,
  Fish <place>, Explore <place>, Buy, Trade — from the engine index `app.js`
  already builds. 155 of the pirate saga's 189 items resolve a source. Shown
  under the name on the Inventory tab, and on hover in the tracker.
  A trap worth recording: for a meal, `growMin` is the **cooking** time, not a
  growth time, so Cabbage Stew would have read "Grow". Meals are tested first.
- **The expanded list is denser**: 18px rows, 16px art, 11px text. All 189
  items still fit without scrolling and read as a list rather than a wall.
- **A filter in the expanded view.** Typing "ring" narrows 189 items to the 6
  rings, and the heading says how many matched.

## 2026-09-05 — The tracker steps aside on the Inventory tab

Both panels floated over the one page that already shows the same two lists in
full, covering it. They hide there now, unless the expanded view is open on
purpose. Every other tab keeps them.

## 2026-09-05 — Two capture bugs with real causes

- **Re-capturing masteries did nothing, by construction.**
  `data/personal-tower.js` carries `authoritativeMasteries: true`, and
  `towerMasteryMap()` read that as "skip captured masteries entirely" — the
  loop ran over an empty array. The imported file is still the base, because it
  is complete, but a capture taken *after* it now updates the items it covers.
  An older capture is still ignored, so a stale one cannot walk numbers back.
- **The farm page was being saved as your inventory.** `looksLikeInventoryPage`
  accepted any page whose text contained both "meals" and "items", which the
  farm page does. A capture there held nothing but the top-bar Silver and Gold
  and replaced hundreds of real rows. It now requires a sentence only the
  inventory page says, and a backstop refuses to store anything as the
  inventory with fewer than ten items, saying so rather than failing quietly.

Extension is v1.8.0. Nothing auto-captures — that went in 1.6.0.

## 2026-09-05 — Counts twice

The most useful thing this app can tell an endgame player is not what an item
costs — it is which of the items they already have to gather **also** finish a
Tower mastery. Both numbers were on the site already; the overlap was not.

The Inventory tab now shows, for the tracked questline, every required item
that is also an unfinished Tower requirement, with what the quest needs beside
what the mastery still needs and how far along it is. For the pirate saga that
is **39 of 183 items, 18 of which only need Grand Mastery (100k) rather than
Mega (1m)** — the cheap wins, which is exactly what is hard to spot by hand.

Sorted by the lowest unfinished floor, so the top of the list is what helps
reach the next floor. Finished masteries are excluded; currency cannot be
mastered and is excluded too. Hidden entirely when there is no overlap.

## 2026-09-05 — Where you stand, and green meaning one thing

- **The home page now opens with your actual position**: the floor you are
  climbing and how many masteries it still wants, the quest step you are on and
  how many of its items you are short, and how many of that questline's items
  also finish a Tower mastery. Three facts that otherwise needed three tabs.
  Each is a link to the tab it came from. Hidden when there is nothing to say.
- **Finished Tower requirements go quiet.** Green was marking both "done" and
  "in progress", so it separated nothing. Completed rows now use a grey bar and
  greyscale art; green is left to mean "still in front of you".
- **A quests page that only half drew says so.** The completed-requests page
  states its own total; reading 2 of 1,950 was being reported as success. It
  now says the list had not finished drawing and to scroll to the bottom first.
  The popup shows capture warnings and row counts instead of a fixed message.

## 2026-09-05 — One panel on a phone

Two docked panels stacked took 552px of an 812px phone screen, leaving almost
no page. Below 620px a single panel shows, anchored to the bottom at 42% of the
screen, with a switch in its header between the current step and the whole
questline. The expanded full-page view still works as before.

## 2026-09-05 — The dusk design, merged; and the last of the missing pictures

Merged the redesign produced from the brief: a blue-slate ground (#27364B)
instead of near-black, three colours with separate jobs (Lantern for actions,
Water for selection, Sage for progress), and three real typefaces bundled as
local WOFF2 — Bree Serif for titles, Atkinson Hyperlegible for prose, IBM Plex
Mono for numbers. Its `DESIGN_PLAN.md` is kept alongside. The repeated uppercase
kickers are gone.

Merged rather than copied: the redesign forked before the last few fixes, so
its CSS, `index.html` and assets came across while `app.js` kept this branch's
work and took only its five markup edits.

Two picture bugs found by sweeping every tab with a snapshot full of junk rows:

- **The Account tab rendered description text as items.** `gather-model.js`
  filtered the gather lists, but the Account tab's masteries, consumables and
  active effects had no such guard, so "A blinger for your finger" and "Adds
  100 Stamina" appeared there. `isRealItem()` now guards all of them, and the
  same check stops a description reaching the working inventory.
- **`itemImg` resolved artwork from the name, but several calls passed a
  possibly-null item and no name**, so the lookup had nothing to search for.
  Fixed at seven call sites — co-drops, hauls, masteries, rewards, consumables,
  active effects and the meal list.

And a bug introduced while fixing that: `fallbackName` was **overriding** the
item's own name rather than filling in for a missing item, so the Setup cards
looked up "Iron Depot" instead of "Iron" and drew a letter. The item's own name
wins now.

Swept all eight tabs with junk-laden data: zero placeholders, zero description
rows, zero broken images.

## 2026-09-05 — The Inventory tab is only your inventory

The tab carried three things the floating tracker already showed: "Counts
twice", "Next quest" and "Whole questline". Reading the same two lists twice on
one page is worse than reading them once, so the tab is now what you hold, a
search box, and a line saying what is being tracked. The tracker consequently
shows on that tab again, and the double-duty count still appears on Home.

The expanded whole-line view is **1020px — about half a 1900px screen** —
rather than the full width. Stretched edge to edge, every row had roughly 67px
of nothing between the item and its number; the median gap is now 6px, with all
189 rows still visible in six columns without scrolling.

Two CSS traps found doing it, both recorded because neither is obvious:
`width: max-content` cannot resolve against a grid whose column count depends
on its own height — it resolved to the full screen. And `auto-fill` row tracks
need a **definite** height, not a maximum, or the grid collapses to one row per
column.

## 2026-09-05 — The expanded list opens where it lives

Centred, it jumped to the middle of the screen the moment you opened it, away
from the corner and the button you pressed, and covered the left of the page
for no reason. It now stays anchored to the right-hand dock it grows out of —
29px from the right edge, vertically centred — so the page stays readable
beside it.

## 2026-09-05 — One mine in a screen, and a gather list that lines up

**Mining.** Each drop nested the crafts it feeds, and those nested theirs, so
the same recipe was printed several times and one mine — Spring Cave — ran to
**3.44 screens**. Drops are now a compact grid at the top, and every craft they
reach is a single de-duplicated grid underneath, each card showing its inputs
as chips with the one this mine drops marked. Same nine drops, same seventeen
crafts, **1.15 screens**.

**The expanded gather list.** Columns were equal-width, so a short name left
its number stranded at the far edge while a long one sat right beside it — the
same list looked differently aligned row to row. Columns now hug their contents
and pack from the left: one straight line of pictures down each column, one
line of numbers down its right, and a median gap of 8px. Item art is 22px
rather than 16, and the text 12px, so a shorter questline gets bigger, more
readable rows in the space it frees.

The column count is measured rather than guessed. Content-sized columns come
out wider than any estimate — a first attempt at 196px each still ran off the
side — so `fitColumns()` sets a row count, measures, and steps down a column at
a time until it genuinely fits.

## 2026-09-05 — The expanded list sizes itself to what is in it

A 53-item questline was being shown in a box built for 189, with half of it
empty. The panel now picks a column count that balances toward a square, sets
the rows, measures, and shrinks onto its contents — staying anchored to its
right-hand dock throughout.

| Questline | Items | Box | Columns |
|---|---|---|---|
| Problems Start Arising | 189 | 908 × 741 | 4 |
| Daily Dairy | 53 | 621 × 624 | 3 |
| Banana Stand | 4 | 280 × 260 | 1 |

Three measurement traps, all of which produced a wrong box before being found:
`scrollWidth` reports the padding box when nothing overflows, so it measured
the panel being shrunk rather than the content — the width has to come from
where the last column actually ends. Content-sized columns come out wider than
any estimate, so the column count is stepped down until a measurement agrees.
And shrinking the box can bring on a vertical scrollbar that then takes width
from the list and pushes the last column past the edge, so that width is given
back once the final height is known.

## 2026-09-05 — Craft was missing from the ingredient routes

An ingredient with a recipe — Twine, Rope, any of the dyes — could be listed as
something to go and get, with no way to say "I will make it". The route
dropdown offered Auto, farm, trade, store and covered, and never Craft.

It offers Craft now whenever the item has a recipe, and choosing it expands the
item into its own inputs: picking Craft on Fishing Net replaces it with Iron,
Rope and Antler, and Rope then offers Craft in turn. Crafting is a make
decision rather than a route, so it writes to `makeChoices` and clears any
`sourceChoices` entry — the two contradict each other if both are set.

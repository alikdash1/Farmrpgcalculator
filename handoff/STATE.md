# State — 2026-09-05

Keep this file short. It is read at the start of every session by both agents;
every line it grows is paid for twice. Facts only, no history — history is in
`CHANGELOG.md`.

## In flight

| Task | Agent | Branch | Status |
|---|---|---|---|
| — | — | — | nothing claimed |

Claim a task by adding a row before you start. Clear it when merged.

## Where things stand

- **Quests.** 2,479 quests / 569 questlines. The player's own completed list
  (`data/personal-quests.js`, 1,952 titles) is authoritative and needs no
  account capture. **92 quests remain.**
- **The pirate saga.** Farm RPG renames one chain as it goes, so it appeared as
  eleven separate questlines. `data/quest-sagas.js` + `quest-model.js` stitch
  it into one, in prerequisite order. 33 steps, 2 done, **31 left — a third of
  everything the player has remaining.** Step XXIX is known only from a
  community sheet and is flagged `pending`.
- **Gather planning.** `gather-model.js` owns the arithmetic. The **Inventory
  tab is only what you hold** — the gather lists live in the floating tracker,
  which is on every tab. Two docked panels: current step bottom-left, whole
  line bottom-right; the right one opens to about half the screen (1020px),
  dense, filterable, with Copy list. `whereFor()` says how an item is obtained
  — **for a meal, `growMin` is the cooking time, so meals test before crops**.
  `towerOverlap()` finds items a questline needs that also finish an unfinished
  Tower mastery; it is surfaced on the Home page ("Counts twice", 39 items for
  the pirate saga, 18 needing only Grand Mastery).
- **Item art.** `data/item-library.js` holds the **complete** Farm RPG item
  list, 1,449 names with artwork, taken from buddy.farm's own search index
  (`https://buddy.farm/search.json`). `item-art.js` merges it under the more
  specific sources. That is what ended the run of "another picture is
  missing" — and, because it answers "does the game have an item by this
  name?", it is also what separates real items from the description text older
  captures stored as items. 1,550 names resolve; Silver is currency and has
  none.
- **Tower.** Requirements for T300–T340 from the wiki. Grand Mastery floors
  score against 100,000 and Mega Mastery against 1,000,000 — not everything is
  1m. Masteries are the 2026-09-04 CSV, 514 items.
- **Extension.** v1.7.0, read-only, and it **only captures when asked**. The
  90-second timer and the route-change capture were reading whatever screen
  was open — an inventory page showing just gold and silver was overwriting a
  full inventory. A capture far smaller than the one it would replace is now
  refused. Captures harvest item artwork off the page, and use that same
  artwork to tell items from Farm RPG's per-item descriptions, which the text
  parser had been recording as items of their own ("A blinger for your
  finger"). Anything skipped is named in the capture's warnings.


- **Home page.** Opens with where you stand: next Tower floor and masteries
  outstanding, the quest step you are on and items short, and the "counts
  twice" total. Each links to its tab. `renderStanding()` is redrawn on
  `load` because `gather-model.js` is loaded after `app.js`.
- **Tower colours.** Green means "still ahead" only; finished requirements are
  grey with greyscale art. It used to mean both.
- **Mobile.** Below 620px the tracker is one bottom-anchored panel with a
  switch between the current step and the whole line; two stacked panels took
  two thirds of a phone screen.

- **Places.** New tab. Every explore and fishing location, and what a stated
  pour returns there. **Which rate table answers is decided by what you spend**,
  from Farm RPG's own item text: Arnold Palmer and Lemonade *find* items and
  spend no stamina, so they read the workbook's drops-per-AP; **Apple Cider is
  1,000 stamina** ("1000+ Stamina Use | Does not give Stamina"), as is Orange
  Juice at 100, so those read the logged explores-per-drop alongside raw stamina
  and plain explores. See KNOWN_MISTAKES.md "Arnold Palmer is not exploring".
- **Stamina and effectiveness are written up** in
  `docs/STAMINA_AND_EFFECTIVENESS.md`, quoted from the game. Two data errors
  came out of it: **Wanderer is a skip chance per tier (I 4% / II 7% / III 9% /
  IV 13%), not "about 20% less stamina"** — `effects.json` now says 0.13; and
  **an Apple Cider's exploring is fixed while its stamina scales with your
  effectiveness**, so it is 1,000 explores costing 1,000 x effectiveness.
- **Meals toggle on Places**, through `window.FRPG_MEALS` so Setup and Places
  share one store. Quandary Chowder is already inside the workbook's exploring
  rates and comes back out when off; Sea Pincher is not in the fishing rates
  and goes on top; Neigh moves a cider's stamina only; Mushroom Stew moves only
  how many items finish a Tower row.
- **Fishing costs bait, not stamina** — no stamina option, and no Effectiveness
  field, since that is an exploring mechanic.
- **Chests are not drops.** The workbook expands a chest into its contents and
  lists them as drops of the place. Detected arithmetically (every ingredient
  present at exactly rate x amount) and shown separately. Stripping them lands
  the affected locations on exactly 550.0 / 500.0, which is the proof.
- **Effectiveness is typed in per location** (`frpg_location_effort_v1`). Farm
  RPG prints it on the location page; Protein Bars and Jill lower it, Sprint
  Shoes raise it. With no number the stamina, OJ and Cider options refuse to
  answer rather than guess.
- **Workbook rates are scaled to the account** by find count (its AP is 500
  finds; Setup may say 200). Legitimate because the workbook's rates for one
  place sum to ~550 per AP / ~500 per LN — same unit, fewer finds. Toggleable.
- **`data/location-rates.js`** (`tools/build-location-rates.py`) holds the
  `iron_depot_rates` that `build-data.mjs` discards; used only when Setup says
  the player owns Iron Depot.
- **Calculate.** The ingredient route dropdown includes **Craft** for anything
  with a recipe; it writes to `makeChoices` (which expands the item) rather
  than `sourceChoices`, and clears the other so they cannot contradict.
- **Mining.** Drops are a chip grid at the top, then every craft they reach as
  one de-duplicated grid. Spring Cave went from 3.44 screens to 1.15.
- **Published.** `https://github.com/alikdash1/Farmrpgcalculator` — public,
  full 66-commit history, with `raw/account-captures/` and `publish/` stripped
  from **every** commit because the captures held another player's name and
  trade history. Those stay on disk and are gitignored. Work on `main`.

## Known gaps

- `publish/` is a divergent copy with **none** of this work. Do not deploy it
  without reading `NEXT_PHASE.md` first.
- Large Net base 400 vs the workbook's 500 — unresolved, do not silently pick.
- 59 workbook drops and 2 locations (Gary's Crushroom, Sinking Swamp) not
  imported.
- `data/main-quests.js` is 1.2 MB, but that is **not** a load problem: measured
  102 ms to DOMContentLoaded with everything parsed. Do not spend a refactor on
  splitting it without measuring again first.

## Unverified

Nothing outstanding. When you leave something unproven, name it here rather
than in a commit message, so the next session sees it without reading the log.

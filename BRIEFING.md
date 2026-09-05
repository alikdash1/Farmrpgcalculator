# Lantern Ledger — the whole briefing

**Read this file first and you should not need to be taught anything else.**
It exists so the owner stops re-explaining the project to every new AI session.

If you only read one section, read **Rules that do not bend** at the bottom.

---

## 1. What this is

**Lantern Ledger** is a static website that answers one question about the game
**Farm RPG**:

> What does it actually cost to get an item — in the currency the player really
> spends: stamina, exploring actions, Apple Cider, Arnold Palmer, Orange Juice,
> and gold?

It is a planning tool, not a game client. It never plays the game, never clicks
anything in the game, and never sends the player's data anywhere.

It runs **entirely from a file on disk**. The owner double-clicks
`calculator/index.html`. There is no server, no build step, no framework.

---

## 2. Farm RPG — what you must know before you say anything about it

Do **not** invent mechanics, drop rates, item names or quantities. If you need
a game fact you do not have, query the knowledge database:

```bash
node ../knowledge-pack/query.mjs <command> <query>
```

It is a SQLite database built specifically so sessions do not burn budget
re-reading spreadsheets. `../knowledge-pack/PLAYER_KNOWLEDGE.md` holds the
canonical player-facing facts, and it separates **confirmed mechanic**,
**measured rate**, **player heuristic** and **open question** — respect that
separation when you repeat anything from it.

The essentials, so you are not lost:

- **Exploring** costs stamina and returns item drops. One explore click is one
  **action**. Drinks — Apple Cider, Arnold Palmer, Lemonade — each normally
  count as one action.
- **Meals** change the economics. Cabbage Stew makes one action consume 5 Apple
  Ciders; Lemon Cream Pie does the same for Arnold Palmers. A 5× meal makes an
  action-limited effect last across five times as many drinks. Never charge an
  action-limited cost once per action *and* again per drink — that error has
  been made here before.
- **Acorn Pie** lasts 150 exploring actions, has **no effect in the Forest**,
  and *replaces* some normal location drops with Hide rather than adding Hide
  on top. Its exact weighting is an open question, not a known rate.
- **Mastery** is the long game. Reaching **Grand Mastery** on an item is
  **100,000** of it; **Mega Mastery** is **1,000,000**. This distinction
  matters enormously: scoring a Grand Mastery requirement against 1,000,000
  overstates the work by 10×, and this app got that wrong once.
- **The Tower** has floors up to T340 in this dataset. Each floor demands
  masteries — some Grand, some Mega. Climbing is the endgame.
- **Quests** (the game calls them Help Requests) ask for bulk items — tens of
  thousands of a thing. There are 2,479 in 569 questlines.
- **Silver** is the game's currency, not an item. It has no picture and cannot
  be mastered. Several bugs here came from treating it as an item.
- **Craftworks** is a crafting queue; the owner has 10 slots.
- Passive production on a developed account: Iron and Nails from the Iron
  Depot, Stone from the Quarry, Wood and Boards from an upgraded Sawmill. Coal
  is hourly, not free.
- **Buying is often cheaper than farming** — but farming can still win because
  the same run feeds masteries, quests, or useful co-drops. The app exists to
  make that comparison, so never assume "cheapest gold cost" is the answer.

Farm RPG is a **cosy pixel-art farming game**. Items have small hand-drawn
sprites, served from `https://farmrpg.com/img/items/<file>`. The app hotlinks
them; that is intended.

---

## 3. Who uses it

The owner is an **endgame player**: hundreds of hours in, **92 quests left in
the entire game**, climbing the Tower around floor T282 toward T340. They keep
spreadsheets. They do not need beginner explanations.

**31 of those 92 remaining quests are one chain** — see the pirate saga below.

Things that have been said, repeatedly, and are worth taking seriously:

- They report bugs from screenshots and **they are consistently right**. More
  than once a "that is not actually a bug" reading turned out to be a real one.
- They notice design that feels generated. Two design passes were rejected as
  "vibe coded". See §10.
- They value not being made to repeat themselves. This file is that request.

---

## 4. The eight pages

| Tab | What it is for |
|---|---|
| **Home** | Where you stand now: next Tower floor, the quest step you are on, how many items serve both. Then a goal form. |
| **Calculate** | The core tool. An item and a quantity in; crafting vs buying vs farming vs passive production out, with an ingredient tree and a per-ingredient route choice. The densest page. |
| **Setup** | Permanent bonuses, passive production, meals. Toggle-heavy. |
| **Account** | Import progress from the companion extension or a saved file. Also holds the extension's setup guide. |
| **Tower** | Every mastery requirement up to T340 with progress bars. Long; scanned, not read. |
| **Quests** | 2,479 quests in 569 questlines, collapsible and searchable, with a **Track** button. |
| **Inventory** | What you hold, what the tracked questline still needs (this step, and the whole line), and which of those items also finish a Tower mastery. |
| **Mining** | Every mine, what it drops, what those drops craft into. |

Plus a **floating tracker**: two docked panels — current step bottom-left,
whole questline bottom-right — on every tab except Inventory. On screens under
620px it becomes one panel with a switch. The right panel opens across the full
page, dense and filterable, with a **Copy list** button that emits
tab-separated rows for a spreadsheet.

---

## 5. How it is built — constraints that break the app if ignored

- **No build step, no bundler, no framework, no npm packages.** Everything
  loads through plain `<script src>` and `<link rel=stylesheet>` tags in
  `index.html`.
- **It opens from `file://`.** Therefore **no `fetch`, no ES modules, no
  dynamic `import()`**. Anything that needs a web server is wrong here.
- **Every `<script>` and `<link>` carries a `?v=` query. Bump it on any file
  you edit**, or the owner reloads and sees nothing change. Also bump
  `FRPG_BUILD` in `app.js` — it prints in the footer as the build stamp, and it
  is how "you are running an old file" gets told apart from "the fix failed".
- **Stylesheet order, last wins:** `style.css` → `v3.css` → `tower.css` →
  `mining.css` → `quests.css` → `inventory.css` → `tracker.css` →
  `system.css`. `system.css` is the design system.
- **Script order matters.** `data/*.js` define globals; `engine.js`,
  `item-art.js`, `quest-model.js`, `gather-model.js` build on them; `app.js`
  and the page scripts render. `gather-model.js` loads *after* `app.js`, which
  is why the home page redraws on `load`.
- Game data lives as **globals on `window`**, never imports.

---

## 6. The files

**Logic and data — do not restyle, do not casually edit**

| File | What it holds |
|---|---|
| `engine.js` | Pure crafting/route resolution: `buildIndex`, `resolveTree`, `sourcesFor`, `coDropsFor`, `marketQuote`, `translateCosts`. No DOM. |
| `data/data.js` | The main dataset: **1,138 items**, 1,468 recipes, 25 locations, market prices. |
| `data/main-quests.js` | **2,479 quests / 569 questlines** (1.2 MB). Each quest has title, line, category, sequence, requirements, giver, prerequisite. |
| `data/quest-sagas.js` | Stitches questlines Farm RPG renames partway through into one chain. See §8. |
| `data/tower-floors.js` | Tower T300–T340 requirements from the wiki, with artwork, and **which floors want Grand vs Mega**. |
| `data/personal-tower.js` | The owner's mastery progress — **514 items**, from a CSV dated 2026-09-04. Personal data. |
| `data/personal-quests.js` | The owner's **1,952 completed quests**. Authoritative; needs no capture. Personal data. |
| `data/item-library.js` | **The complete Farm RPG item list — 1,449 names with artwork**, from `https://buddy.farm/search.json`. See §9. |
| `data/item-art.js` | Curated artwork for items missing from `data.js`. |
| `data/new-items.js` | The mining release catalogue, 67 items with their own artwork. |
| `data/location-intel.js` | Mines, pickaxes, bags. |

**Models — shared logic the pages read**

| File | What it does |
|---|---|
| `item-art.js` | **One art lookup for the whole app.** Merges `data.js` → `item-art.js` → `item-library.js` → `new-items.js` → `tower-floors.js` → artwork harvested from the player's own captures. Also answers `isKnownItem()`, which is how real items are told from text. |
| `quest-model.js` | Applies the saga stitching and owns quest status (completed / available / ready). |
| `gather-model.js` | **Owns "what is still needed".** Both the Inventory tab and the tracker read it, so they cannot disagree. Also `whereFor()` and `towerOverlap()`. |

**Pages**

`app.js` (all the main UI and state) · `inventory-page.js` · `quests-page.js` ·
`mining-page.js` · `tracker.js` · `sync-guide.js`

**Tooling**

`tools/handoff.mjs` — the objective gate, see §11 · `build/bundle.py` — inlines
everything into one self-contained `build/preview-bundle.html` for rendering ·
`tests/*.mjs` — 87 tests, `node --test tests/*.mjs`.

**Documents**

`BRIEFING.md` (this file) · `AGENTS.md` (two-agent working agreement) ·
`handoff/STATE.md` (what is true now — read at session start) ·
`handoff/TASKS.md` (the queue) · `CHANGELOG.md` (dated log) ·
`KNOWN_MISTAKES.md` · `CLAUDE.md` (build rules).

---

## 7. State the app keeps

All in `localStorage`, all in the player's browser, none of it ever sent
anywhere.

| Key | What it is |
|---|---|
| `frpg_owned` | `{ itemId: quantity }` — the working inventory. **Exists as `{}` from the first save, so "present" is not "has anything in it"** — that distinction caused a bug. |
| `frpg_account_snapshot_v1` | The merged snapshot from the extension. |
| `frpg_tracked_line` | The tracked questline. **Absent means auto-pick; an empty string means the player deliberately chose none.** Collapsing those two was a bug. |
| `frpg_tracker_*` | Tracker collapse / hidden / size state. |

---

## 8. The pirate saga — the thing that makes this player's data interesting

Farm RPG **renames a questline partway through**. One 29-step chain appears in
the data under eleven different names: *Problems Start Arising*, *Pirates Start
Arriving*, *Problems Still Abound*, *The Masonry Requires Attention / Action /
Activity*, *Augment Redbrook Through Masonry*, *Rage Against Tattered Masonry*,
*The Ramparts Mended Anew*, *You Must Build A Stealth Boat*, *Pirate Stealth
Arrival*.

The roman numerals run straight through the renames (I … XXIX), and each step
lists the previous one as its prerequisite — which is how the true order was
reconstructed, not by guessing. `data/quest-sagas.js` records it, and a test
asserts each step names the one before it.

**33 steps, 2 done, 31 left, 189 distinct items.** A third of everything the
owner has left in the game. Step XXIX is known only from a community
spreadsheet and is flagged `pending`.

---

## 9. Decisions already made — do not relitigate these

- **Item art is solved by a complete list.** Missing pictures were fixed four
  separate times, each for one more group, until `data/item-library.js` brought
  in every item Farm RPG has. If art is ever missing again, **refresh that file
  from `https://buddy.farm/search.json`** rather than adding items one at a
  time. That same list also answers "is this a real item?", which is what
  separates items from Farm RPG's description text.
- **`data/main-quests.js` being 1.2 MB is not a performance problem.** Measured:
  102 ms to DOMContentLoaded with everything parsed. Splitting it was queued as
  an optimisation and removed after measurement. Do not attempt it without
  measuring again.
- **The extension never captures on its own.** A timer and a route-change
  capture used to read whatever screen was open, which overwrote good data.
  Captures are manual, deliberately.
- **The extension never navigates the game.** It reads pages the player opens.
  This is a promise, not an oversight.
- **Grand Mastery is 100,000 and Mega is 1,000,000**, and Tower floors specify
  which. Never score everything against 1,000,000.

---

## 10. Mistakes made here already — every one of these has happened

Read this list before you are confident about anything.

1. **A listener bound to a deleted element.** `$("someId").addEventListener(...)`
   after the element was removed throws on load and **takes down every tab**,
   not just its own. `tools/handoff.mjs check` catches it.
2. **Text painted in a surface colour.** `--paper` used as a text colour
   renders dark-on-dark and vanishes. Also: quantity buttons kept a
   `background: #fff` from the light theme and rendered near-white on white at
   **1.05:1 contrast**. Both were invisible in source and obvious on screen.
3. **Forgetting the `?v=` bump**, so the owner reloads and nothing changes —
   which looks exactly like a fix that did not work.
4. **Fixing something only at the source and not at the point of use.** Item
   descriptions were being stored as inventory items; fixing the collector did
   nothing for the snapshot already sitting in the browser.
5. **Guessing at text shape instead of checking a list.** Three heuristics tried
   to tell item names from description text. "Adds 100 Stamina" defeated all of
   them — Title Case, no lowercase word. The complete item list answered it.
6. **A `transition` on `width` that cannot interpolate to a `min()` value**, so
   the panel got stuck at whichever size it started at.
7. **A dismiss button with no undo.** The tracker's ✕ set a flag nothing could
   clear, so tracking afterwards showed nothing anywhere.
8. **A flag read as absolute.** `authoritativeMasteries: true` made the code
   skip captured masteries entirely, so re-capturing them could never change a
   number — silently.
9. **A page-type check too loose.** Any page containing the words "meals" and
   "items" was treated as the inventory, so capturing on the farm page replaced
   hundreds of rows with the top-bar Silver and Gold.
10. **Reporting success when nothing was read.** A quests page that parsed 2 of
    1,950 entries reported a clean capture, which made it undiagnosable.
11. **Assuming a data field means what its name suggests.** For a **meal**,
    `growMin` is the **cooking** time, not a growth time — labelling meals
    "Grow" would have been an invented mechanic.
12. **Design passes that changed colours and fonts without changing anything
    underneath.** Rejected twice as "vibe coded". The current look is
    near-black plus a single mint accent, which is the most common
    AI-generated dark theme there is; `--display` and `--prose` are both
    aliases of the system font stack, so the site has no typography at all.

---

## 11. How to verify — not optional

```bash
node --check <file>.js            # syntax
node tools/handoff.mjs check      # the objective gate; must exit 0
node --test tests/*.mjs           # 87 tests, all must pass
python3 build/bundle.py           # writes build/preview-bundle.html
```

`handoff.mjs check` catches, specifically: a missing `?v=` bump, a listener
bound to an element that is not in `index.html`, `fetch`/ES modules that cannot
work from `file://`, and text painted in a surface colour.

**Then look at it rendered.** `build/preview-bundle.html` is one self-contained
file; open it or render it headlessly. Check every tab, at desktop width and at
375px. Mistakes 2 and 12 above were invisible in source.

Several tests assert on CSS. They pin real bugs, not preferences — read what a
test is protecting before you change it.

---

## 12. What is still open

- **The quests captures do not land.** The Completed Help Requests page holds
  ~1,950 entries; a capture yields **2**. Available Help Requests yields
  nothing usable. Current hypothesis: Farm RPG fills that list in as you
  scroll, so a capture reads only what has been drawn. The capture now compares
  what it read against the total the page states and says so. **The next step
  needs the owner**: scroll that page to the bottom, capture, and report what
  the popup says.
- **53 Tower rows show "No route data for this one yet."** Those items are not
  in the engine index and the knowledge pack has no recipes for them. Do not
  infer recipes from item names.
- **`publish/` is a divergent copy** with none of this work. Do not deploy it.
- **Large Net base 400 vs the workbook's 500** — two sources disagree, unresolved.
- 59 workbook drops and 2 locations (Gary's Crushroom, Sinking Swamp) not imported.

---

## Rules that do not bend

1. **Never invent Farm RPG mechanics, drop rates, item names or quantities.**
   Query the knowledge pack. If it does not know, say so.
2. **Verify before claiming something works.** The owner has caught confident
   wrong answers repeatedly. "Unverified, needs a render pass" is always
   acceptable; being wrong is not.
3. **Never publish the owner's account captures or personal progress.**
   `data/personal-quests.js` and `data/personal-tower.js` are their real
   progress. They must not ship in anything public.
4. **The extension is read-only.** It never clicks, plays, or navigates the
   game for the player.
5. **Write for a player, never for a developer.** Schema names, engine
   directives and changelog notes have leaked into the live UI before.
6. **Do not deploy `publish/`.**
7. **Update `CHANGELOG.md` and `handoff/STATE.md`** at the end of real work, so
   the next session starts from what is true instead of re-deriving it.

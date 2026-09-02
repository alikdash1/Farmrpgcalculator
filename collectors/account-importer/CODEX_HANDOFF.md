# CODEX HANDOFF — Farm RPG Account Importer

**Project:** `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator`
**This work:** `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-importer\`
**Written:** 2026-08-26 by Kimi (AI assistant), at the owner's request, so Codex can review everything without the original conversation.
**Status of this document:** describes the code exactly as it exists on disk at the time of writing. All test results quoted here were actually executed (see section 8). Example values are invented; no real account data appears in this file.

## Codex repair update — 2026-08-26 (overrides stale claims below)

The delivered importer was audited and repaired in place. Current verified
test result: **17 passed, 0 failed**.

- The legacy bridge exports a perk/artifact only when `owned === true`;
  unknown ownership can no longer silently enable bonuses.
- Merely mentioning Iron Depot no longer marks it owned. Only explicit
  Owned/Active/Enabled or Not Owned/Locked/Disabled evidence is accepted.
- URL/hash route is the primary page classifier; DOM/text is fallback.
- Global icon scanning now admits non-currency inventory items only on
  inventory/storehouse pages.
- Capture schema validation checks nested section and entry shapes.
- Percent-encoded secret-bearing URL fragments are dropped.

Important remaining limitation: inventory has evidence-based parsing, but most
other live Farm RPG pages still use provisional heuristics. Their inferred
values require confirmation before calculator integration. Historical file
sizes/test counts below predate this repair notice.

---

## 1. TASK SUMMARY

### What was originally asked
Build a **read-only account-data collector** for the game Farm RPG, living entirely inside `calculator\collectors\account-importer\`, with two parts:

1. `capture-current-page.js` — a script the user pastes into the browser developer console while viewing one Farm RPG page. It downloads a JSON capture of what is visibly on that page.
2. A local `index.html` importer — opened as a plain file, no server — that imports any number of capture files, merges them into one account snapshot (newest capture wins per field, with per-value provenance), and exports `farmrpg-account-snapshot.json`.

Hard rules from the brief: no network access anywhere; no clicking, navigation, or gameplay automation; no reading cookies, tokens, passwords, or hidden form fields; unknown values stay `null` (never zero, never guessed); plain HTML/JS with no npm install; do not modify anything outside `collectors\account-importer\`.

### What was actually completed
- Both parts built and delivered (18 files, see section 2).
- Shared library modules (`numbers`, `sanitize`, `schema`, `merge`, `textparse`) load both as classic browser scripts (`window.ImporterShared`) and as Node modules (`require()`), so the exact merge/parse code that runs in the browser is unit-tested in Node.
- The Inventory ("My Inventory") page parser is **evidence-based**: written against a real donated capture of the live page and covered by a dedicated test that mirrors the real layout.
- All other page types use **generic, provisional** extraction (label/table/text matching) and every capture keeps the page's full sanitized visible text as fallback.
- A 16-test Node suite, all passing (section 8).
- `README.md` with the full user workflow.
- The user ran the whole pipeline against their real account: captures from several live pages imported successfully and produced a merged summary and export (details in section 8 under "Manual / live testing").

### What was NOT completed
- **Evidence-based (per-page-layout) parsers for non-inventory pages.** Only the inventory page has a parser tuned to real markup. Quests, masteries, perks, farm supply, tower, profile, and building pages are read with generic heuristics and their output must be treated as best-effort. A draft of stronger parsers exists in the assistant's scratch workspace (`C:\Users\user\Documents\kimi\workspace\account-importer\`) but was **never integrated, never delivered, and is not part of this handoff** — do not use it without a full review; the delivered folder is the source of truth.
- No automated UI/browser tests (no DOM test harness); `importer.js` interaction logic was tested manually only.
- No pets-page support (the legacy account template has a `pets` section; the importer collects nothing for it).
- No re-capture/repair tooling for already-downloaded capture files.

### Assumptions made
- One snapshot per account, merged from many page captures; **newest capture wins** each field, and a `null`/absent value never overwrites a known value.
- The capture script must be a **single self-contained file** (console pastes cannot load modules), so the inventory parser exists twice: `shared/textparse.js` (canonical, tested) and an embedded copy inside `capture-current-page.js`. The files carry a "keep in sync" note.
- `localStorage` is acceptable for importer persistence (user can wipe it from the UI).
- Compact game numbers (`1.2K`, `3.4M`, …) are parsed with exactness rules: integer-scaled values are exact; values beyond `Number.MAX_SAFE_INTEGER` are stored as **decimal strings** so no precision is lost.
- A third top-bar currency icon observed in real captures (likely "Ancient Coins") was deliberately **left unparsed** rather than guessed.
- `mining` was added to the skill list beyond the legacy template's five skills, because real profile pages show a Mining level.

---

## 2. COMPLETE FILE MANIFEST

Root: `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-importer\`
Sizes and modification times are the real on-disk values at handoff time (also in section 12).

| File | Purpose | Main functions / contents | Inputs | Outputs | Dependencies | Tested |
|---|---|---|---|---|---|---|
| `capture-current-page.js` (37,369 B, 2026-08-26 03:08) | Console paste-in collector; captures the currently visible Farm RPG page | `main`, `detectPageType`, `looksLikeInventoryPage`, `parseInventoryPage`, `applyInventoryPage`, `extractPlayer/Levels/Balances/Consumables/TableRows/IconItems/Inventory/Quests/Masteries/Bonuses/Infrastructure`, `parseRequirement`, `getVisibleText`, `sanitizeUrl`, `redact`, `cleanWhitespace`, `parseQty`, `scalar`, `qtyScalar`, `banner`, `downloadJson` | The open page's live DOM | Downloads `farmrpg-capture-<pageType>-<UTC timestamp>.json` | None (self-contained IIFE) | `node --check` OK; inventory parser covered by suite test #16; exercised live in the user's browser on real pages |
| `index.html` (4,416 B, 2026-08-26 02:36) | The local importer page (open this file) | Six sections: Import, Imported pages, Account summary, Missing information, Validation warnings, Export (+ technical details disclosure) | User interaction; capture `.json` files | Rendered UI; loads scripts | `styles.css`, `shared/numbers.js`, `shared/sanitize.js`, `shared/schema.js`, `shared/merge.js`, `importer.js` | Manual browser use by the user |
| `styles.css` (5,410 B, 2026-08-26 02:36) | Importer styling (desktop + mobile) | — | — | — | None | Visual check only |
| `importer.js` (14,223 B, 2026-08-26 02:36) | Importer behavior | `saveState/loadState`, `importFiles/importOne`, `isDuplicate`, `removeCapture`, `clearAllCaptures`, `clearLocalData`, `currentSnapshot`, `exportSnapshot`, `renderImportLog/CapturesTable/Summary/Missing/Warnings/Tech`, `wireEvents` | `.json` capture files (drop zone / file picker); `localStorage` | `farmrpg-account-snapshot.json` download; summary rendering | `window.ImporterShared` (numbers, sanitize, schema, merge) | Manual browser use; its merge path is the same `shared/merge.js` covered by the suite |
| `shared/numbers.js` (5,393 B, 2026-08-26 02:36) | Quantity parsing/formatting with big-number safety | `parseQuantity`, `toBigInt`, `formatCompact`, `formatExact` | Strings like `1,234`, `1.2K`, `2.4B`, `3T` | `{raw, value, approximate}`; display strings | None | Suite tests 1–4 |
| `shared/sanitize.js` (3,025 B, 2026-08-26 02:36) | URL sanitizing, text redaction, name normalization | `sanitizeUrl`, `sanitizeVisibleText`, `normalizeName` | Raw URL / visible text / names | Cleaned strings | None | Suite tests 8, 9 (and used throughout) |
| `shared/schema.js` (7,535 B, 2026-08-26 03:08) | Capture validation + snapshot factory + constants | `validateCapture`, `emptySnapshot`, `expectedScalarPaths`; constants `CAPTURE_SCHEMA`, `SNAPSHOT_SCHEMA`, `KNOWN_PAGE_TYPES`, `SKILL_KEYS`, `EXPECTED_CONSUMABLES`, `CONFIDENCE_LEVELS`, size limits | Parsed JSON of a capture file | `{ok, errors, warnings, capture}` (normalized capture) | `shared/sanitize.js` | Suite tests 7, 10 |
| `shared/merge.js` (20,962 B, 2026-08-26 03:08) | Merge engine + legacy bridge | `mergeCaptures`, `buildLegacyV1`, `readScalar`, `getPath`, `setPath`, internal `makeMerger`, `mergeInfrastructure`, `mergeQuest`, `finalizeCollections`, `computeUnknownFields` | Array of validated captures | One snapshot object (`farmrpg-account-snapshot-v1`) + `legacyV1` bridge | `shared/numbers.js`, `shared/sanitize.js`, `shared/schema.js` | Suite tests 3–6, 10 |
| `shared/textparse.js` (7,643 B, 2026-08-26 03:08) | Canonical evidence-based "My Inventory" layout parser | `NOISE_LINES`, `isNoise`, `isPlainQty`, `isPlausibleName`, `looksLikeInventoryPage`, `parseInventoryPage` | Visible-text lines + full text | Raw-string parse results (capacity, crafting level, inventory, consumables, mastery statuses) | None | Suite test 16 |
| `tests/run-tests.js` (17,907 B, 2026-08-26 03:08) | Full local test suite (16 tests) | `test()` harness + 16 test cases | Fixtures + shared modules | Console PASS/FAIL, exit code | `node:assert`, `node:fs`, `node:path`, shared modules, fixtures | Ran 2026-08-26: 16/16 PASS |
| `tests/fixtures/fake-01-profile.capture.json` (2,845 B) | Fake profile-page capture | — | — | — | — | Used by suite |
| `tests/fixtures/fake-02-inventory-older.capture.json` (1,173 B) | Fake inventory capture (older) | — | — | — | — | Used by suite |
| `tests/fixtures/fake-03-inventory-newer.capture.json` (1,263 B) | Fake inventory capture (newer, incl. a 10^20 quantity) | — | — | — | — | Used by suite |
| `tests/fixtures/fake-04-quests-available.capture.json` (1,370 B) | Fake available-quests capture | — | — | — | — | Used by suite |
| `tests/fixtures/fake-05-quests-completed.capture.json` (1,095 B) | Fake completed-quests capture | — | — | — | — | Used by suite |
| `tests/fixtures/fake-06-masteries-perks-infra.capture.json` (2,894 B) | Fake masteries/perks/infrastructure capture | — | — | — | — | Used by suite |
| `tests/fixtures/fake-07-legacy-visible-page.capture.json` (572 B) | Fake legacy `farmrpg-visible-page-v1` raw-text export | — | — | — | — | Used by suite |
| `README.md` (6,287 B, 2026-08-26 02:53) | User-facing workflow and accuracy notes | — | — | — | — | Read by the user; workflow verified in practice |
| `CODEX_HANDOFF.md` (this file) | Review handoff for Codex | — | — | — | — | — |

All fixture timestamps are 2026-08-26 02:36. **Nothing outside `collectors\account-importer\` was created or modified by this work** — verified two ways: (a) every other file/directory in the project has a modification time of 2026-08-26 01:56 or earlier, before the first delivery at 02:36; (b) the only Git-tracked file in the project (`docs/superpowers/specs/2026-08-23-farmrpg-crafting-calculator-design.md`) is unmodified (`git status` shows no tracked changes).

---

## 3. USER WORKFLOW

1. **Log in** to Farm RPG in a normal browser. The tools never see credentials.
2. **Manually visit account pages** (recommended order in `README.md`): Profile, Inventory, Masteries, Tower, Active quests, Available quests (Available Help Requests), Completed quests, Perks, Farm Supply, Artifacts, Sawmill, Quarry, plus any remaining pages (Storehouse, fishing/exploring, Orchard, Vineyard).
   - On long pages (especially Inventory) **scroll to the bottom first** so all rows are rendered before capturing.
3. **Open dev tools** (F12) → Console tab.
4. **Paste the entire `capture-current-page.js`** and press Enter. The script reads the visible page only and immediately downloads one JSON file named `farmrpg-capture-<pageType>-<UTC timestamp>.json`. A green on-page banner confirms; red means failure (console has the error).
5. **Repeat** steps 2–4 per page. Each capture file contains: schema/version markers, capture time, detected `pageType`/`pageLabel`, page `title`, sanitized `url`, a `fields` object with everything the parsers confidently extracted, the full sanitized `visibleText` fallback, and a `warnings` array.
6. **Open `index.html`** (double-click; plain local file, works offline).
7. **Import**: drag all capture `.json` files onto the drop zone (or click to choose). Each file is validated (`farmrpg-page-capture-v1`; legacy `farmrpg-visible-page-v1` accepted as text-only), duplicates by filename+timestamp are skipped, and the import log lists page type, capture time, and warnings. Individual captures can be removed; "Clear all captures" resets.
8. **Review**: the page shows the imported-pages table, an account summary (compact values with exact values on hover; unknown shown as *unknown*, never 0), a "Missing information" list of fields no capture provided, and all validation warnings.
9. **Export**: click **Export account snapshot** → the browser downloads `farmrpg-account-snapshot.json`. Merging is newest-wins per field with per-value provenance; a `legacyV1` object is attached for the older template shape.
10. **Persistence & deletion**: imported captures persist in the browser's `localStorage` (key `farmrpgAccountImporter.captures.v1`) so a refresh loses nothing. **Clear local data** wipes them; the user should also delete capture/export files from Downloads to fully clean up.

---

## 4. DATA SCHEMAS (all values below are invented examples)

### 4.1 Raw page capture — what the console script downloads (`farmrpg-page-capture-v1`)

```json
{
  "schema": "farmrpg-page-capture-v1",
  "collectorVersion": "1.0.0",
  "parserStatus": "provisional",
  "capturedAt": "2026-08-26T09:30:00.000Z",
  "pageType": "inventory",
  "pageLabel": "Inventory",
  "title": "Farm RPG - My Inventory",
  "url": "https://farmrpg.com/index.php#!/inventory.php",
  "fields": {
    "levels": { "crafting": { "value": 12, "raw": "12", "confidence": "visible-label" } },
    "balances": { "silver": { "value": 1250000, "raw": "1.25M", "confidence": "inferred-page-section" } },
    "capacity": { "inventoryMaximum": { "value": 900, "raw": "900", "confidence": "visible-label" } },
    "consumables": [
      { "name": "Fake Soup", "quantity": { "value": 42, "raw": "42", "confidence": "visible-label" }, "kind": "meal", "confidence": "visible-label" }
    ],
    "inventory": [
      { "name": "Fake Wood", "quantity": { "value": 900, "raw": "900", "confidence": "visible-label" }, "capacity": { "value": 900, "raw": "900", "confidence": "visible-label" }, "locked": null, "itemId": null, "confidence": "visible-label" }
    ],
    "masteries": [
      { "itemName": "Fake Wood", "masteryCount": null, "masteryLevel": "Mega Mastered", "grandMastery": null, "megaMastery": true, "towerRequirement": null, "progress": null, "completed": null, "confidence": "visible-label" }
    ],
    "infrastructure": { "ironDepot": { "value": true, "raw": "Iron Depot mentioned on page", "confidence": "unparsed-text" } }
  },
  "visibleText": "My Inventory\nItems that you can craft are below...\n[ sanitized, redacted, ≤100,000 chars ]",
  "warnings": ["Extraction is provisional (generic label/table/text parsing). Verify values against the page before relying on them."]
}
```

Notes: scalar fields are `{value, raw, confidence}` wrappers; empty sections are deleted from `fields` to keep files small; `pageType` is one of `profile, farm-overview, inventory, mastery, tower, quests-available, quests-active, quests-completed, quests, perks, farm-supply, artifacts, sawmill, quarry, storehouse, fishing, exploring, other, unknown`.

### 4.2 Normalized capture — what `validateCapture()` stores inside the importer

```json
{
  "schema": "farmrpg-page-capture-v1",
  "collectorVersion": "1.0.0",
  "capturedAt": "2026-08-26T09:30:00.000Z",
  "pageType": "inventory",
  "pageLabel": "Inventory",
  "title": "Farm RPG - My Inventory",
  "url": "https://farmrpg.com/index.php#!/inventory.php",
  "fields": { "...": "as in the raw capture" },
  "visibleText": "re-sanitized and capped at 100,000 chars on import",
  "warnings": ["..."],
  "legacy": false,
  "id": "mh3k9x2p-1",
  "_fileName": "farmrpg-capture-inventory-2026-08-26_09-30-00.json"
}
```

`id` and `_fileName` are added by `importer.js` at import time. Legacy `farmrpg-visible-page-v1` files are accepted with `pageType: "unknown"`, `fields: {}`, and a warning.

### 4.3 Final export — `farmrpg-account-snapshot.json` (`farmrpg-account-snapshot-v1`)

```json
{
  "schemaVersion": "farmrpg-account-snapshot-v1",
  "generatedAt": "2026-08-26T10:00:00.000Z",
  "collectorVersion": "1.0.0",
  "player": { "name": "ExampleFarmer", "playerId": "123456", "accountCreated": "1 JAN 2023" },
  "levels": { "farming": 55, "fishing": 40, "crafting": 12, "exploring": 30, "cooking": 25, "tower": 201, "mining": 18 },
  "balances": { "silver": 1250000, "gold": 120, "staminaCurrent": 500, "staminaMaximum": 1200 },
  "capacity": { "inventoryCurrent": 700, "inventoryMaximum": 900 },
  "consumables": {
    "Fake Soup": { "quantity": 42, "kind": "meal", "capturedAt": "2026-08-26T09:30:00.000Z", "sourcePage": "inventory" }
  },
  "inventory": [
    { "name": "Fake Wood", "quantity": 900, "capacity": 900, "locked": null, "itemId": null, "confidence": "visible-label", "sourcePage": "inventory", "capturedAt": "2026-08-26T09:30:00.000Z" }
  ],
  "masteries": [
    { "itemName": "Fake Wood", "masteryCount": 12345, "masteryLevel": "Mega Mastered", "grandMastery": true, "megaMastery": true, "towerRequirement": 100, "progress": null, "completed": null, "confidence": "visible-label", "sourcePage": "mastery", "capturedAt": "2026-08-26T09:35:00.000Z" }
  ],
  "quests": {
    "available": [ { "title": "A Fake Request", "giver": "Example NPC", "status": "available", "requiredItems": [ { "name": "Fake Wood", "have": 900, "need": 1000, "haveRaw": "900", "needRaw": "1,000" } ], "rewards": ["100 Silver"], "prerequisites": null, "chain": null, "history": [ { "status": "available", "capturedAt": "2026-08-26T09:40:00.000Z", "sourcePage": "quests-available" } ], "sourcePage": "quests-available", "capturedAt": "2026-08-26T09:40:00.000Z" } ],
    "active": [], "ready": [], "completed": [], "locked": []
  },
  "perks": [ { "name": "Fake Perk", "owned": true, "description": "Does fake things", "confidence": "unparsed-text", "sourcePage": "perks", "capturedAt": "2026-08-26T09:45:00.000Z" } ],
  "farmSupply": [],
  "artifacts": [],
  "infrastructure": {
    "ironDepot": true,
    "sawmill": { "level": 12, "woodPerHour": 600 },
    "quarry": { "level": 10, "stonePerHour": 48000, "coalPerHour": 5000 },
    "storehouse": { "level": 8 },
    "orchard": {},
    "vineyard": {}
  },
  "captures": [
    { "pageType": "inventory", "pageLabel": "Inventory", "capturedAt": "2026-08-26T09:30:00.000Z", "url": "https://farmrpg.com/index.php#!/inventory.php", "title": "Farm RPG - My Inventory", "fileName": "farmrpg-capture-inventory-2026-08-26_09-30-00.json", "legacy": false }
  ],
  "warnings": ["[inventory @ 2026-08-26T09:30:00.000Z] Extraction is provisional ..."],
  "unknownFields": ["balances.staminaCurrent", "consumables.Ancient Coin", "infrastructure.orchard", "infrastructure.vineyard"],
  "provenance": { "...": "see 4.4" },
  "legacyV1": {
    "schema": "farmrpg-account-v1",
    "capturedAt": "2026-08-26T10:00:00.000Z",
    "towerLevel": 201,
    "skills": { "farming": 55, "fishing": 40, "crafting": 12, "exploring": 30, "cooking": 25, "mining": 18 },
    "inventoryCapacity": 900,
    "inventory": { "Fake Wood": 900 },
    "activeQuests": [],
    "completedQuestIds": [],
    "completedQuestTitles": [],
    "masteries": { "Fake Wood": 12345 },
    "pets": {},
    "buildings": { "sawmill": { "level": 12, "woodPerHour": 600 }, "quarry": { "level": 10 }, "orchard": {} },
    "perks": ["Fake Perk"],
    "artifacts": [],
    "availableMeals": [],
    "dailyIncome": { "Large Net": 140, "Apple Cider": 12, "Arnold Palmer": null, "Orange Juice": null, "Lemonade": null },
    "notes": "Bridged from farmrpg-account-snapshot-v1. Unknown values stay null. ..."
  }
}
```

Quantities beyond `Number.MAX_SAFE_INTEGER` are stored as **exact decimal strings** (e.g. `"quantity": "100000000000000000000"`) — consumers must accept strings as well as numbers.

### 4.4 Provenance records

One entry per merged value, keyed by dotted path. Scalar example:

```json
"levels.tower": { "sourcePage": "profile", "capturedAt": "2026-08-26T09:20:00.000Z", "confidence": "visible-label", "raw": "201", "seq": 0 }
```

Collection example (`<collection>.<normalized-name>.<field>`):

```json
"inventory.fake wood.quantity": { "sourcePage": "inventory", "capturedAt": "2026-08-26T09:30:00.000Z", "confidence": "visible-label", "raw": "900" }
```

`confidence` is one of `visible-label`, `visible-table`, `inferred-page-section`, `unparsed-text`, `unknown`. `seq` is the import order, used to break same-timestamp ties deterministically.

### 4.5 Warning / conflict records (strings in `snapshot.warnings`)

```text
[inventory @ 2026-08-26T09:30:00.000Z] Extraction is provisional (generic label/table/text parsing). Verify values against the page before relying on them.
Conflict at levels.tower: profile @ 2026-08-26T09:20:00.000Z had 201, profile @ 2026-08-26T09:20:00.000Z has 999 (same capture time; kept newer import).
Conflict in inventory entry "Fake Wood" field "quantity": two captures from the same time disagree (900 vs 950); kept first import.
Quest "A Fake Request" has conflicting statuses ("available" vs "ready") in two captures from 2026-08-26T09:40:00.000Z; kept first import.
```

---

## 5. EXTRACTION MAP

Detection pipeline in the delivered `capture-current-page.js` (`main()`):
1. `detectPageType(visibleText, headings)` — keyword rules against `<h1>-<h3>` headings joined with the first 4,000 text characters, evaluated in the fixed order shown below (first match wins).
2. `looksLikeInventoryPage(lines, text)` override — if the real inventory layout is recognized (the "cannot have more than N of any single thing" sentence, or both `Meals` and `Items` section headings), the page is forced to `inventory` regardless of keywords. This override exists because nav cards mention Tower/Quests/etc. on every page.
3. The page URL is recorded (sanitized) but is **not** used to classify the page — classification is keyword/layout only.

Generic extractors run on **every** page: player identity (`extractPlayer`), skill/tower levels (`extractLevels`, incl. the two-line "My skills" panel and "The Tower" nav card), balances (`extractBalances`), the seven known consumables (`extractConsumables`), infrastructure mentions (`extractInfrastructure`), and top-bar icon+quantity pairs (`extractIconItems`, where `Silver`/`Gold` become balances and other pairs join the inventory).

| Page type | How it is detected | Fields extracted | DOM selectors / matching rules | Confidence | Tested/provisional |
|---|---|---|---|---|---|
| `profile` | Keyword `profile` / `player id` / `member since` in headings+text | player.name / playerId / accountCreated; levels; balances; consumables | Text regexes: `player name:`/`username:`/`farmer:`, `player id: N`, `joined`/`member since`/`account created`, `welcome, <name>`; level regexes per skill | `visible-label`, `inferred-page-section` | **Provisional** — generic parsing, not tuned to live markup |
| `inventory` | Layout override (capacity sentence or `Meals`+`Items` headings); also keyword `inventory` | capacity.inventoryMaximum, levels.crafting, inventory[] (name, quantity, capacity-at-max flag), consumables[] (meals), masteries[] (Mastered/Grand/Mega status marks) | Evidence-based line parser (`parseInventoryPage`): craftable zone `(qty)` markers with name look-back (≤4 lines), `have / need Material` inline + split lines, Meals/Items zone scan (name → description/status → bare count), noise/icon-ligature filtering (`NOISE_LINES`), name charset `NAME_RE` | `visible-label`, `inferred-page-section` | **Evidence-based & tested** — parser written against a real donated capture; suite test 16 mirrors the real layout; user imported a real 1,000+ item inventory successfully |
| `mastery` | Keywords `grand mastery`/`masteries` + `mastery` | masteries[] (itemName, masteryCount, grandMastery/megaMastery flags, towerRequirement, progress current/next) | Block-based heuristics (`extractMasteries`): count via `N times mastered`/`mastery: N`, grand/mega via checkmark/complete words, tower via `tower requirement N`, progress via `a / b` | `visible-label` (count), `unparsed-text` | **Provisional** |
| `tower` | Heading contains `tower` AND text has `floor N` or `tower level N` | levels.tower; balances; consumables | `extractLevels` tower regexes + "The Tower" nav-card look-ahead (≤5 lines to `Level N`) | `visible-label`, `inferred-page-section` | **Provisional** |
| `quests-available` | Keywords `help request`/`quest` + `available` | quests[] (title, giver, status=available/ready/locked, requiredItems have/need, rewards, chain) | Block-based (`extractQuests`): requirement lines `name a / b` or `a / b name`, `from:`/`giver:`, `rewards:`, status inference (all requirements met → `ready`; `locked` without requirements → `locked`) | `unparsed-text` | **Provisional** |
| `quests-active` | (Reserved in schema; no dedicated keyword rule — active quests typically land in `quests`) | quests[] with status=active when detected | Same as above | `unparsed-text` | **Provisional** |
| `quests-completed` | Keywords `completed` + `help request`/`quest` | quests[] with status=completed | Same block parser; status forced by page type | `inferred-page-section` | **Provisional** |
| `quests` | Keywords `help request`/`quest` (fallback) | quests[] | Same block parser | `unparsed-text` | **Provisional** |
| `perks` | Keyword `perk` | perks[] (name, owned, description) | `extractBonuses`: block first line = name; ownership guessed from ✓/owned/active/unlocked/purchased vs not-owned/locked words | `unparsed-text` | **Provisional** — ownership is styling-only on the real page, expect `owned: null` |
| `farm-supply` | Keywords `farm supply` | farmSupply[] (name, owned, description) | Same `extractBonuses` | `unparsed-text` | **Provisional** |
| `artifacts` | Keyword `artifact` | artifacts[] (name, owned, description) | Same `extractBonuses` | `unparsed-text` | **Provisional** |
| `sawmill` | Keyword `sawmill` | infrastructure.sawmill.level / .capacity / .woodPerHour / .boardPerHour | `extractInfrastructure`: `level: N`, `capacity|storage|maximum: N`, `N wood per hour`-style production regexes (qty-first or resource-first) | `visible-label` | **Provisional** |
| `quarry` | Keyword `quarry` | infrastructure.quarry.level / .capacity / .stonePerHour / .coalPerHour | Same | `visible-label` | **Provisional** |
| `storehouse` | Keyword `storehouse` | infrastructure.storehouse.level / .capacity; also generic table/icon inventory extraction | Same + `extractInventory` fallback | `visible-label`, `visible-table` | **Provisional** |
| `fishing` | Keywords `fishing` + `net` | Generic fields only (levels, balances, consumables, icon items) | Generic extractors | mixed | **Provisional** |
| `exploring` | Keyword `explor` | Generic fields only | Generic extractors | mixed | **Provisional** (user's real exploring capture yielded silver/gold only — that is all the page shows as parseable text) |
| `other` / `unknown` | No rule matched | Generic fields only + full `visibleText` fallback | Generic extractors | mixed | — |

Cross-page extractors used above: `extractTableRows` (`table tr` → first text cell + numeric cells; itemId from `a[href*="id="]`; lock from `locked`/🔒 text) and `extractIconItems` (`img[alt]` whose closest `div,li,td,a,span` container text is exactly one quantity). Silver/Gold top-bar values come from the icon pairing and were verified on the user's real pages.

**Not parsed by design:** cookies, tokens, hidden inputs, form fields, scripts/styles content, anything `display:none`/`visibility:hidden`. The third top-bar currency icon seen on real pages (likely Ancient Coins) is intentionally unparsed. `visibleText` is always stored so missed values remain recoverable.

---

## 6. MERGING RULES (`shared/merge.js`)

- **Capture identity:** a capture is its `schema` + `capturedAt` (UTC ISO) + `pageType`; the importer additionally dedupes by (filename, capturedAt). Validation normalizes each capture before merging.
- **Ordering:** captures are sorted by `capturedAt`; ties keep import order (`seq`). "Newer wins" means strictly greater `capturedAt`, or greater `seq` at equal timestamps.
- **Newer replaces older:** for every scalar path (`player.*`, `levels.*`, `balances.*`, `capacity.*`) and every leaf under `infrastructure.*`, a newer non-null value replaces the older one and rewrites that path's provenance. Same-timestamp disagreements keep the later-imported value **and** add a conflict warning.
- **Inventory matching:** by `normalizeName(name)` — trims, collapses whitespace, unifies curly/straight quotes, lowercases. Any real character difference = a different item (e.g. "Wood" vs "Wooden Plank" never merge). Quantity/capacity/locked/itemId merge per-field with their own timestamps, so a newer capture can update one field without erasing others.
- **Quest matching:** by normalized exact title. Status is bucketed (`available/active/ready/completed/locked`); each quest keeps a `history` of (status, capturedAt, sourcePage). A quest is **never** guessed completed because it vanished from a list. Detail fields (giver, prerequisites, chain, rewards) and requiredItems merge newest-wins independently of status.
- **Mastery matching:** by normalized item name; fields include masteryCount, masteryLevel, grandMastery, megaMastery, towerRequirement, progress, completed.
- **Perks / Farm Supply / Artifacts matching:** by normalized name; fields name/owned/description.
- **Conflicts:** never silent — every same-timestamp disagreement produces a warning string naming the path, both values, and which was kept.
- **Null/unknown handling:** `null`, `undefined`, and `""` never overwrite and never create values. Unseen expected fields are listed in `snapshot.unknownFields` ("Missing information" in the UI). Explicit zero is a real value and is kept.
- **Provenance:** every written value records `sourcePage`, `capturedAt`, `confidence`, `raw` (the exact page string), and `seq` under `snapshot.provenance[dottedPath]`.
- **Large numbers:** `parseQuantity` uses BigInt scaling. Values that fit `Number.MAX_SAFE_INTEGER` stay Numbers; larger integers are stored as exact decimal strings (e.g. `"100000000000000000000"`), which survive JSON round-trips losslessly. Approximate fractional compacts (e.g. `1.2345K`) are flagged `approximate: true`.
- **Compact suffixes:** `K/M/B/T` = ×10³/⁶/⁹/¹², optional thousands separators, optional `$`, optional leading `-`; anything not matching the full quantity grammar returns `null` (never guessed).
- **Legacy bridge:** `buildLegacyV1()` also emits the older `farmrpg-account-v1` template shape (from `collectors/account-snapshot.template.json`) alongside, adding `mining` and `completedQuestTitles` (quest IDs are not recoverable from visible pages).

---

## 7. SAFETY AND PRIVACY

- **Intentionally excluded:** passwords, cookies, session tokens, authorization headers, hidden form fields, input/select/textarea contents, script/style contents, and any DOM node that is `display:none` or `visibility:hidden` (computed-style check in the TreeWalker). Query strings are never stored.
- **URL sanitization:** `sanitizeUrl` keeps only `origin + pathname`; the fragment is kept solely when it is a plain client-side route (`#!/inventory`-style, charset-restricted, no `key=value`). Non-http(s) or unparseable URLs become `"unknown"`. Verified by suite test 8.
- **Text sanitization:** `redact`/`sanitizeVisibleText` strip zero-width and bidi control characters, redact `key=value` secrets (token/session/sid/jwt/api-key/password/cookie/secret families), redact JWT-shaped strings (`eyJ…`), redact opaque blobs of 48+ token characters, collapse whitespace, and cap length (100,000 chars in captures and on import; 40,000 default for the standalone helper). Verified by suite test 9.
- **Network:** impossible by construction. Verified by grep over the delivered folder: no `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `document.cookie`, or `navigator.` anywhere. The only browser APIs used are DOM reading, `Blob`/`URL.createObjectURL` for downloads, `FileReader` for imports, and `localStorage`.
- **Gameplay automation:** none. The capture script never clicks, navigates, submits, or synthesizes events; it runs once on paste and downloads one file. The importer only reads files the user explicitly drops/selects.
- **localStorage:** exactly one key, `farmrpgAccountImporter.captures.v1`, holding the normalized captures array (no credentials; page data only). Quota failures are caught and surfaced as a warning.
- **Deleting saved data:** "Clear local data" button in the importer (with confirm) removes the key; capture/export files in Downloads are deleted by the user manually. Documented in `README.md` §11.

---

## 8. TEST REPORT

Everything below was executed on the delivered files on 2026-08-26, in `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-importer\`, with **Node v24.15.0**.

### 8.1 Syntax checks
Command: `node --check <file>` on all eight JS files.
Result: **all OK** — `capture-current-page.js`, `importer.js`, `shared/numbers.js`, `shared/sanitize.js`, `shared/schema.js`, `shared/merge.js`, `shared/textparse.js`, `tests/run-tests.js`.

### 8.2 Unit/merge suite
Command: `node tests/run-tests.js` → **16 passed, 0 failed**:

| # | Test | Result |
|---|---|---|
| 1 | compact numbers: 1,234 / 1.2K / 1.25M / 2.4B / 3T | PASS |
| 2 | compact numbers: non-quantities are rejected, never guessed | PASS |
| 3 | large numbers beyond MAX_SAFE_INTEGER stay exact strings | PASS |
| 4 | formatCompact / formatExact round-trip huge values without loss | PASS |
| 5 | newest capture wins for scalar fields | PASS |
| 6 | null never overwrites a known value | PASS |
| 7 | same-timestamp scalar conflicts are kept as warnings | PASS |
| 8 | inventory merges by normalized exact name; newer wins; nulls kept | PASS |
| 9 | inventory huge quantities stay exact strings through the merge | PASS |
| 10 | quest buckets follow explicit statuses; disappearance never completes | PASS |
| 11 | unseen fields remain null and are listed as missing | PASS |
| 12 | malformed captures are rejected with clear errors | PASS |
| 13 | capture URLs are stripped of query strings and sensitive fragments | PASS |
| 14 | visible text is redacted, whitespace-collapsed and capped | PASS |
| 15 | all fake fixtures merge into one consistent snapshot | PASS |
| 16 | inventory-page layout: craftable list, meals, items, capacity, level | PASS |

All test data is invented fixtures; no real account data is used anywhere in the suite.

### 8.3 Manual / live testing (performed by the user on their real account, 2026-08-26)
- Ran `capture-current-page.js` in a desktop browser console on live Farm RPG pages (inventory, exploring, quests variants). Files downloaded as expected; green confirmation banner appeared.
- Imported the real captures into `index.html`: all validated and merged; the summary rendered real values (1,000+ inventory items, meals, silver/gold from the top bar, inventory capacity); "Missing information" and provisional-parsing warnings displayed as designed; export produced a snapshot file.
- One capture from an **earlier build** of the script was saved with `pageType: "tower"` while the user was actually on the inventory page (keyword rule misfired on nav-card headings). The current delivered build forces `inventory` whenever the inventory layout is recognized (section 5), but other non-inventory pages still rely on keyword detection — see section 9.
- A long inventory page capture hit the visible-text size cap on one attempt; re-capturing after scrolling produced the complete item list.

### 8.4 Offline & network verification
- The importer was used as a `file://` page with no server; all functionality (import, merge, export) worked offline.
- Grep over the delivered folder found **no** network-capable APIs (see section 7). The only outbound action is the browser's own file download of locally generated JSON.

### 8.5 Known untested behavior
- No automated DOM/browser tests of `importer.js` (no jsdom harness); UI paths were exercised manually only.
- The provisional parsers for non-inventory pages have **not** been validated against Farm RPG's live markup beyond the user's pages listed above; expect misses on pages with different layouts.
- Mobile browser workflow is untested (console access is impractical on most mobile browsers).
- Behavior with 50+ large captures in localStorage (quota pressure) is untested; failures are caught and warned, not crash-tested.

---

## 9. KNOWN LIMITATIONS

1. **Provisional non-inventory parsing.** Quests, masteries, perks, farm supply, artifacts, tower, profile, and building pages use generic label/table/text heuristics. Real imports therefore show the warning "Extraction is provisional…". Values from these pages must be verified against the game before use.
2. **Page-type detection is keyword-based.** The URL route is recorded but not used for classification. Nav cards mention Tower/Quests/etc. on every page, which already caused one mislabeled capture (an inventory page saved as `tower`) in an earlier build; the inventory layout override fixes that specific case, but other cross-labeling remains possible (e.g. a quests page mentioning perks).
3. **Ownership states are mostly unreadable.** Perk/supply/artifact "owned" is styling (color/strikethrough) on the real pages, which does not appear in visible text — expect `owned: null` for these lists. The legacy bridge treats `owned !== false` as owned, which can over-report owned perks/artifacts.
4. **Unparsed third top-bar currency.** A third icon+quantity in the top bar (likely Ancient Coins) is captured only as an unnamed inventory icon pair risk — it was deliberately not mapped to a named field. Confirm what it is before mapping it.
5. **Fields that cannot currently be collected:** pet data; quest IDs (only titles); quest prerequisites/chains (usually `null`); per-item mastery counts except where the generic mastery heuristics match; current stamina unless shown as text; current inventory slot usage (only max capacity is read from the inventory page); storehouse/orchard/vineyard levels unless explicitly labeled on a captured page.
6. **Ambiguous labels / heuristics that may misfire:** icon-grid quantity pairing requires the item's container text to be exactly one quantity; `NAME_RE` only allows a limited punctuation set (`'&+-()`); quest giver/rewards parsing assumes `from:`/`rewards:` label conventions; mastery grand/mega flags look for checkmark words in the same text block.
7. **Duplicate-name risk:** two genuinely different game items with the same normalized name would merge into one entry (none are known, but the merge cannot distinguish them).
8. **Truncation:** `visibleText` is capped at 100,000 characters (marker `[…truncated]`); extremely long pages lose tail text, though structured fields are extracted before the cap matters. Long pages must be fully scrolled before capturing or rows that were never rendered are absent entirely.
9. **Clock dependence:** newest-wins uses the capturing machine's UTC clock. A wrong clock can make an older capture "win".
10. **Same-timestamp ties:** resolved by import order (`seq`); importing the same set in a different order can flip which value wins a tie (always with a warning).
11. **Big-number strings:** quantities above `Number.MAX_SAFE_INTEGER` are strings in the export; any consumer doing math must coerce via BigInt.
12. **Approximate compacts:** fractional compact values (e.g. `1.2345M`) are parsed via float and flagged approximate; exact integer compacts are exact.
13. **DOM drift:** Farm RPG can change markup at any time; regex/text parsers may then extract less (warnings are recorded) — they should not fabricate values, but coverage can silently shrink.
14. **Manual entry still required for:** anything on pages the user did not capture, ownership states, quest IDs, pets, and any field listed under "Missing information" after import.
15. **Browser quirks:** drag-and-drop and `download` attributes behave slightly differently across browsers; the importer targets current desktop Chrome/Edge/Firefox. Mobile is impractical for the capture step.

---

## 10. REVIEW PRIORITIES FOR CODEX

Ordered checklist — highest risk first:

1. **Security**
   - Verify the no-network claim yourself: grep the folder for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `<img` beacons, `navigator.sendBeacon`, form submission.
   - Audit `redact`/`sanitizeVisibleText` coverage: are there secret shapes the regexes miss (e.g. short tokens under 48 chars, `Bearer ` headers in page text)?
   - Confirm `sanitizeUrl` cannot leak query/fragment data on unusual URLs (ports, userinfo, encoded characters).
   - Check that item names/descriptions flow into the UI only via `textContent` (they do) and into JSON via `JSON.stringify` (they do) — no `innerHTML` injection path.
2. **Data-loss risks**
   - Newest-wins overwrite semantics: confirm no path can be nulled out by a partial capture.
   - `localStorage` eviction/quota: captures persist only there until exported; quota failure is a warning, not a backup.
   - Same-timestamp tie-breaking depends on import order.
   - 100,000-char `visibleText` cap silently drops tail text on huge pages.
3. **Parsing correctness**
   - The inventory parser is the only evidence-based one — re-run it against fresh real captures before trusting edge cases (stacked requirement lines, items with `!` or `.` in names — currently outside `NAME_RE`).
   - Keyword page detection: consider driving `pageType` from the URL hash route (`#!/inventory.php`) instead of page text.
   - Icon quantity pairing (`extractIconItems`) can attach a wrong quantity if container structure changes.
4. **Schema compatibility**
   - `farmrpg-account-snapshot-v1` is new; only `legacyV1` matches the existing `collectors/account-snapshot.template.json`. Decide which shape the calculator will consume before writing any loader.
   - String-typed big quantities vs numeric expectations in the engine.
   - `KNOWN_PAGE_TYPES` drift: captures with unrecognized page types import as `unknown` with a warning.
5. **Merge correctness**
   - Re-run `node tests/run-tests.js` after any change.
   - Review per-field meta merging in `collectionEntry` (mixed old/new fields within one entry).
   - Review quest status conflicts across quest pages captured minutes apart.
6. **User-interface problems**
   - Summary grid shows only the first 8 inventory items (rest export-only) — fine, but confirm no user confusion.
   - Import log keeps only the last 30 entries.
   - Duplicate detection is (filename + capturedAt); re-importing the same capture under a renamed file double-imports it (harmless — same values, same timestamps — but noisy).
7. **Accessibility**
   - Drop zone has `role="button"`, `tabindex`, keyboard handlers; import log has `aria-live`. Tables lack captions; color is the only import-log severity cue; verify contrast of the compact-value styling.
8. **Calculator integration considerations**
   - Read section 11; nothing is integrated yet and nothing may be integrated without reviewing this folder first.
   - Respect `confidence` and `provenance` — do not feed `unparsed-text` values into calculations as facts.
   - Respect `null` semantics: `null` means "unknown", never "zero".

---

## 11. INTEGRATION MAP — DO NOT IMPLEMENT

This section only describes how the exported snapshot *could* feed the calculator later. No code was written for this and nothing in the calculator was changed.

The calculator today is a static client app (`index.html`, `app.js`, `engine.js`) driven by prebuilt datasets in `data\` (`data.js` exposes `window.FRPG_EFFECTS`, `window.FRPG_PROGRESSION`, etc.) plus user-configured "Setup" toggles. The natural integration point is a **loader that maps `farmrpg-account-snapshot.json` onto the app's per-user state** (the same role the older `farmrpg-account-v1` template was designed for; `legacyV1` already matches that template).

| Snapshot field | Calculator concept |
|---|---|
| `levels.tower` / `legacyV1.towerLevel` | Tower level — gates mastery tower-requirement checks (`progression.json` mastery `towerRequirement`) and tower-aware planning |
| `levels.{farming,fishing,crafting,exploring,cooking,mining}` | Skill levels — unlock/eligibility logic and XP-related planning |
| `inventory[]` (name → quantity) | Owned inventory — what the player already has vs. what recipes/quests need (`recipes.json`, progression `questTotal`/`maxQuestAsk`) |
| `capacity.inventoryMaximum` | Inventory capacity constraint |
| `masteries[]` (itemName, counts, grand/mega flags) | Mastery state — completion tracking against `FRPG_PROGRESSION` mastery data; mega/grand flags feed mastery-point estimates |
| `quests.active` / `quests.ready` (titles) | Active quest tracking — cross-reference `questLines` in progression data |
| `quests.completed` (titles) | Completed-quest filtering (titles only; IDs unrecoverable — see limitations) |
| `quests.available[].requiredItems` (have/need) | Outstanding requirements vs. owned inventory |
| `perks[]` / `artifacts[]` / `farmSupply[]` (names) | Effect toggles — map names onto `effects.json` entries by `kind` ("Skill perks", "Artifact", "Farm Supply") to auto-configure the Setup bonuses (craft cost/yield, sale bonus, cook save, lemonade bonus, …). **Caveat:** `owned` is usually `null` (styling-only on the page), so auto-enabling requires a trust decision or user confirmation |
| `balances.silver` / `balances.gold` | Starting currency for cost plans |
| `balances.staminaCurrent` / `staminaMaximum` | Stamina budgeting for exploring/fishing runs |
| `consumables` + `legacyV1.dailyIncome` (Large Net, Apple Cider, Arnold Palmer, Orange Juice, Lemonade) | AP/Cider/OJ/Lemonade/Net stock and consumption planning, alongside `field-rates`/drop-rate data |
| `infrastructure.sawmill` / `.quarry` (level, per-hour rates) | Passive production in income/time calculations |
| `infrastructure.storehouse` | Inventory growth modeling |
| `provenance` / `confidence` | Trust gating: only `visible-label`/`visible-table` values should auto-populate; `inferred-page-section` prompts confirmation; `unparsed-text` is review-only |
| `warnings` / `unknownFields` | Surfaced to the user as "verify these before trusting the plan" |

Suggested flow (description only): user drops `farmrpg-account-snapshot.json` into a future import control → loader validates `schemaVersion` → maps fields per the table → pre-fills Setup and owned-inventory state → user confirms inferred values → engine computes as today. Keep the importer's `legacyV1` bridge as the compatibility target if the calculator prefers the old template.

---

## 12. EXACT FINAL STATE

Directory tree of `collectors\account-importer` (sizes in bytes, local modification times):

```
collectors\account-importer\
├── CODEX_HANDOFF.md                 (this file, created 2026-08-26)
├── README.md                        6,287   2026-08-26 02:53
├── capture-current-page.js         37,369   2026-08-26 03:08
├── importer.js                     14,223   2026-08-26 02:36
├── index.html                       4,416   2026-08-26 02:36
├── styles.css                       5,410   2026-08-26 02:36
├── shared\
│   ├── merge.js                    20,962   2026-08-26 03:08
│   ├── numbers.js                   5,393   2026-08-26 02:36
│   ├── sanitize.js                  3,025   2026-08-26 02:36
│   ├── schema.js                    7,535   2026-08-26 03:08
│   └── textparse.js                 7,643   2026-08-26 03:08
└── tests\
    ├── run-tests.js                17,907   2026-08-26 03:08
    └── fixtures\
        ├── fake-01-profile.capture.json              2,845   2026-08-26 02:36
        ├── fake-02-inventory-older.capture.json      1,173   2026-08-26 02:36
        ├── fake-03-inventory-newer.capture.json      1,263   2026-08-26 02:36
        ├── fake-04-quests-available.capture.json     1,370   2026-08-26 02:36
        ├── fake-05-quests-completed.capture.json     1,095   2026-08-26 02:36
        ├── fake-06-masteries-perks-infra.capture.json 2,894  2026-08-26 02:36
        └── fake-07-legacy-visible-page.capture.json    572   2026-08-26 02:36
```

- **Generated fixture data:** the seven `tests\fixtures\fake-*.capture.json` files — entirely invented values, safe to share and safe to import for a dry run.
- **Temporary files remaining:** none — no `.bak`, no `.tmp`, no `node_modules`, no build output inside the folder.
- **Git state:** the project root `calculator\` is a Git work tree (branch `master`, three spec commits). Only **one file is tracked** — `docs/superpowers/specs/2026-08-23-farmrpg-crafting-calculator-design.md` — and it is **unmodified**. Everything else in the project (including the whole `collectors\` tree) is untracked, exactly as found; this work added no commits and changed no tracked files.
- **Outside this folder:** nothing created or modified (see section 2 for the verification method).

---

## 13. IMPORTANT DISCOVERIES (technical facts about the existing calculator)

Recorded while inspecting the project; no strategy reinterpretation, facts only:

1. **App shape:** the calculator is a fully client-side static app — `index.html` + `app.js` + `engine.js` (+ `style.css`, `v3.css`). No build step is needed to run it; there is a stray file literally named `({id` in the project root (pre-existing, purpose unknown — left untouched).
2. **Data pipeline:** `raw\` holds source exports (`items-etl2.json`, `drop_rates.json`, `cooking_recipes.json`, `locations.json`, `market-pricecheck.json`, `xp.json`, each with a `.bak` sibling), and `tools\build-data.mjs` / `tools\build-progression.mjs` compile them into `data\` (`items.json`, `recipes.json`, `effects.json`, `progression.json`, `market.json`, `constants.json`, `sources.json`, `drop_overrides.json`, `data.js`). `update-data.ps1` is the refresh entry point.
3. **Runtime data contract:** `data\data.js` assigns globals — `window.FRPG_EFFECTS` (effect list with `kind` ∈ "Skill perks" / "Skill perk" / "Farm Supply" / "Artifact" and typed modifiers like `craft_cost_off`, `craft_yield`, `sale_bonus`, `cook_save`, `lemonade_items_bonus`) and `window.FRPG_PROGRESSION` (per-item `questSteps`, `questLines`, `questTotal`, `maxQuestAsk`, `usedInCrafts`, `mastery` objects with `towerRequirement`, `communityRating`, player-count stats, `hoard` flags), with `_meta` provenance blocks (quest archive snapshot dated 2026-08-15, community mastery workbook dated 20251125). `app.js` renders a footer naming item/rate/market sources.
4. **Effects are opt-in:** the effects `_meta.note` says "Meal effects and passive buildings are configured separately in Setup" — i.e. the app already expects the user to declare which perks/artifacts/supply bonuses they own. That is exactly what an account snapshot could pre-fill (section 11).
5. **Existing collector conventions:** `collectors\README.md` defines the kit's philosophy (read-only, no clicks, no passwords; "collect evidence for the planner"). It already contained: `collect-visible-page.js` (an older raw visible-text capture — the importer accepts its `farmrpg-visible-page-v1` exports as legacy text-only captures), `account-snapshot.template.json` (schema `farmrpg-account-v1` — the target of the importer's `legacyV1` bridge; note it has no `mining` skill and no `completedQuestTitles`, both added by the bridge), `field-runs.template.json` + `field-rates.example.json` (measured drop-rate runs), and `tools\summarize-field-runs.mjs` (run statistics: weighted drops/action, drops/consumable, ~95% rate ranges).
6. **Tests exist for the engine:** `tests\engine.test.mjs` and `tests\progression.test.mjs` (not run by me — outside this task's scope).
7. **Git:** only the design spec `docs\superpowers\specs\2026-08-23-farmrpg-crafting-calculator-design.md` is tracked; the working app files are untracked. Any future integration work should expect no version-control safety net until files are committed.
8. **Compatibility requirements for any future importer consumer:** accept `null` as "unknown" (never zero); accept string-typed big integers for large quantities; key everything by exact item name (the project's datasets use the same display names, e.g. "Wood", "Board"); expect quest titles, not IDs.

---

## 14. COPYABLE MESSAGE FOR CODEX

> The handoff document is at `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-importer\CODEX_HANDOFF.md`.
> The account importer it describes lives in `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-importer\` (console capture script + local HTML importer + shared libs + Node test suite).
> Please perform a full security and correctness review of that folder **before** any integration with the calculator, and inspect the actual files — do not trust the handoff alone. Section 10 of the handoff is a prioritized review checklist; section 11 is a description-only integration map (nothing has been integrated, and the calculator must not be modified as part of the review). Verify claims by running `node --check` on each JS file and `node tests/run-tests.js` (expected: 16 passed, 0 failed).

---

*End of handoff. Kimi finished the account importer. Review everything inside `calculator\collectors\account-importer` before integrating it.*

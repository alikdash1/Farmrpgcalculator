# Farm RPG Account Importer

A small, **read-only, fully local** toolkit that helps you collect your own Farm RPG account information and merge it into one JSON snapshot file. That snapshot can later be handed to the calculator project for review and integration.

**What it is NOT:** it does not play the game for you, does not click anything, does not navigate between pages, does not read your password or cookies, and does not send anything to any server. Everything runs on your own computer.

---

## How to use it, step by step

### 1. Log in to Farm RPG normally
Open Farm RPG in your usual browser and log in the way you always do. The tools never see or touch your login.

### 2. Visit your account pages manually
Click through the pages yourself, exactly as you normally would. Good pages to visit (recommended order):

- [ ] Profile / account overview
- [ ] Inventory
- [ ] Masteries
- [ ] Tower
- [ ] Active quests
- [ ] Available quests (Available Help Requests)
- [ ] Completed quests (Completed Help Requests)
- [ ] Perks
- [ ] Farm Supply
- [ ] Artifacts
- [ ] Sawmill
- [ ] Quarry
- [ ] Any remaining account pages (Storehouse, fishing/exploration pages, Orchard, Vineyard, …)

### 3. Open your browser's developer tools
On each page, press **F12** (or right-click the page → **Inspect**) and choose the **Console** tab.

### 4. Run the capture script
Open `capture-current-page.js` in a text editor, copy the **entire** file, paste it into the console, and press **Enter**.

### 5. Save each downloaded capture
The script immediately downloads one `.json` file named like `farmrpg-capture-inventory-2026-08-26_09-30-00.json`. A green banner confirms the save; a red banner means something went wrong (copy the error text and keep it for review). Save each file into one folder you can find again. Repeat steps 2–5 for every page on the checklist.

### 6. Open the local importer
Double-click `index.html` in this folder. It opens in your browser as a plain local file — **no installation, no server, no internet needed**.

### 7. Import all captures
Drag all the downloaded `.json` files onto the drop zone (or click it and pick the files). The page lists every imported capture with its page type and capture time, and warns about anything missing or unrecognized. You can remove individual captures or clear everything and start over. Your imports are remembered in this browser's local storage, so a refresh will not lose your work.

### 8. Export the final account snapshot
Click **Export account snapshot**. Your browser saves **`farmrpg-account-snapshot.json`** — the single merged file to hand over. When two captures know the same value, the **newest** capture wins; every important value keeps a record of which page and capture time it came from.

### 9. What is NOT collected
Passwords, cookies, session tokens, authorization headers, hidden form fields, and anything not visible on the page are never read or stored. URLs are saved without their query parameters. Item IDs are only recorded when they are visibly present in a page link. Anything the script cannot confidently read stays `null` or `unknown` — never zero, never guessed.

### 10. No automation, no transmission
The capture script only reads the page you already have open. The importer only reads files you personally give it. Neither performs any network request — you can disconnect from the internet and everything still works.

### 11. How to delete locally saved importer data
In the importer, click **Clear local data** and confirm. That wipes the browser-local copy of your imported captures. To be thorough, also clear the site data for local files in your browser settings, and delete the capture `.json` files and any exported snapshots from your Downloads folder.

---

## A note on accuracy (please read)

The **Inventory ("My Inventory") page is fully supported**: its craftable list, Meals section, Items section, mastery status marks ("Mastered" / "Grand Mastered" / "Mega Mastered"), the per-item capacity sentence, and the "Your Crafting Level is N" line are parsed based on a real donated capture. On long pages, **scroll all the way down first** so every row is drawn before you run the capture.

All **other page types remain provisional**. They use generic label, table, and text matching that has not been tested against Farm RPG's real markup. Every capture therefore also stores the page's sanitized visible text, so anything the provisional parsers miss can still be recovered later. Treat extracted values from non-inventory pages as "best effort, verify before trusting," and expect some pages to import as text-only until their parsers are tuned against real captures.

## What's in this folder

| File | What it does |
| --- | --- |
| `capture-current-page.js` | Paste into the browser console on a Farm RPG page; downloads a JSON capture of the visible page. |
| `index.html` | The local importer page — open this file. |
| `styles.css` | Importer styling (desktop + mobile). |
| `importer.js` | Importer behavior: import, list, merge display, export, local storage. |
| `shared/numbers.js` | Parses `1,234`, `1.2K`, `1.25M`, `2.4B`, `3T`; keeps huge numbers exact as strings. |
| `shared/sanitize.js` | URL cleaning (strips query parameters) and text redaction/whitespace cleanup. |
| `shared/schema.js` | Capture validation and the snapshot schema factory. |
| `shared/merge.js` | Merge engine: newest-wins, exact-name matching, quest buckets, provenance, legacy bridge. |
| `shared/textparse.js` | Evidence-based parser for the real "My Inventory" page layout (also embedded in the capture script; keep both in sync). |
| `tests/run-tests.js` | Local test suite — run `node tests/run-tests.js` (Node only, no installs). |
| `tests/fixtures/` | **Fake** example captures (invented data) used by the tests and safe to import for a dry run. |

## The exported file

`farmrpg-account-snapshot.json` uses schema `farmrpg-account-snapshot-v1` and also contains a `legacyV1` object matching the older `farmrpg-account-v1` template from `collectors/account-snapshot.template.json`, so either shape can be consumed later. Unknown values are `null`; extremely large numbers are stored as exact strings; per-value provenance lives under `provenance`.

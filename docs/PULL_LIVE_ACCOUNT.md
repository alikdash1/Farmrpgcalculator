# Getting the owner's live account numbers

Every planning tool runs `tools/prepare.mjs`, which prints a line like this on
stderr before anything else:

```
account: live capture live-2026-10-01.json - masteries 2026-10-01 16:09, inventory 2026-10-01 11:16, cap 17,418
```

**Read that line before you trust a number.** If it says `DAYS OLD`, the plan
is built on stale counts. `data/personal-tower.js` is a dated export; on
2026-10-01 it was twelve days behind - Pitchfork 595,000 low, and a Spoon Mega
Mastery shown unfinished that was already done. Plans built on it were wrong.

The extension keeps the live account in the planner page's `localStorage`
under `frpg_account_snapshot_v1`, inside the owner's browser (Brave). Nothing
on disk has it until one of these routes puts it there.

## Route 1 - the owner presses one button (cheapest)

Ask the owner to click the **Farm RPG Calculator Account Sync** icon, open
**other controls**, and press **Save account snapshot to Downloads**. That
writes `~/Downloads/farm-rpg-calculator-account-snapshot.json`, and
`prepare.mjs` picks it up automatically - no copying, no context spent.

## Route 2 - read it yourself through Claude in Chrome

Check `list_connected_browsers` first; if it is empty, the owner has to connect
the Claude extension in Brave, or use Route 1.

Open `https://alikdash1.github.io/Farmrpgcalculator/#account` in a new tab in
the session's tab group, then:

**A few items only** (cheap - use this for a single question):

```js
const s = JSON.parse(localStorage.getItem("frpg_account_snapshot_v1"));
const want = ["Salt", "Water Lily", "Red Trunk"];          // the names you need
const clean = (n) => String(n || "").trim().replace(/\s+\d{3}(?:\s*\/\s*\d{3})*\s*$/, "");
({
  masteries: Object.fromEntries((s.masteries || []).filter(r => want.includes(clean(r.itemName)))
    .map(r => [clean(r.itemName), r.masteryCount ?? r.progressCurrent ?? r.masteryLevel])),
  inventory: Object.fromEntries((s.inventory || []).filter(r => want.includes(r.itemName))
    .map(r => [r.itemName, r.quantity])),
  masteriesRead: (s.masteries || []).reduce((m, r) => (r.capturedAt > m ? r.capturedAt : m), ""),
})
```

**Everything, saved to disk** (for a full plan): run `node tools/receive-snapshot.mjs`
in the background, then in the page:

```js
const s = JSON.parse(localStorage.getItem("frpg_account_snapshot_v1"));
const clean = (n) => String(n || "").trim().replace(/\s+\d{3}(?:\s*\/\s*\d{3})*\s*$/, "");
const masteries = {}, inventory = {}; let mAt = 0, iAt = 0;
for (const r of s.masteries || []) { const n = clean(r.itemName); let v = Number(r.masteryCount ?? r.progressCurrent);
  if (!Number.isFinite(v)) { if (r.megaMastery || /mega mastered/i.test(r.masteryLevel || "")) v = 1e6;
    else if (/grand mastered/i.test(r.masteryLevel || "")) v = 1e5; else continue; }
  masteries[n] = v; mAt = Math.max(mAt, Date.parse(r.capturedAt || "") || 0); }
for (const r of s.inventory || []) { const q = Number(r.quantity); if (r.itemName && Number.isFinite(q) && !/token/i.test(r.itemName)) inventory[r.itemName] = q;
  iAt = Math.max(iAt, Date.parse(r.capturedAt || "") || 0); }
const body = { schema: "frpg-live-account-v1", capturedAt: new Date(Math.max(mAt, iAt)).toISOString(),
  masteriesAt: new Date(mAt).toISOString(), inventoryAt: new Date(iAt).toISOString(),
  towerFloor: s.levels && s.levels.tower, masteries, inventory };
await fetch("http://127.0.0.1:8791/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(r => r.text()).catch(e => "failed: " + e.message)
```

Brave may hold that request behind a "allow this site to reach devices on your
local network" prompt. **Do not click it** - that grants a permission, so the
owner decides. If they would rather not, fall back to Route 1.

Close any tab you opened when you are done.

## What the file looks like

`raw/account-captures/live-YYYY-MM-DD.json` (gitignored - never commit it):

```json
{ "schema": "frpg-live-account-v1", "capturedAt": "...", "masteriesAt": "...", "inventoryAt": "...",
  "towerFloor": 288, "masteries": { "Salt": 423504 }, "inventory": { "Salt Rock": 277 } }
```

`prepare.mjs` also accepts the extension's full snapshot format directly, and
`--snapshot <file>` or `FRPG_SNAPSHOT=<file>` forces a specific one.

## What it fixes for you

- masteries and the Tower floor from the capture, when it is newer than the file
- the inventory cap, read off the fullest stacks (17,418 on 2026-10-01 - it climbs daily)
- containers held (chests, bags) straight from the bag, replacing the typed-in 13,000
- `W.FRPG_LIVE_ACCOUNT.inventory` for anything else, e.g. how many Pumpkin Juice are left

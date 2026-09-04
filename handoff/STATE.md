# State — 2026-09-04

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
- **Inventory tab.** Tracks one questline; next quest bottom-left, whole-line
  total bottom-right. Verified on screen with the saga tracked: 191 rows left,
  178 right, 201 images, none broken.
- **Item art.** `data/item-art.js` covers the 106 quest items missing from
  `data/items.js`. Silver is currency and is deliberately excluded. Nine URLs
  spot-checked, all HTTP 200.
- **Tower.** Requirements for T300–T340 from the wiki. Grand Mastery floors
  score against 100,000 and Mega Mastery against 1,000,000 — not everything is
  1m. Masteries are the 2026-09-04 CSV, 514 items.
- **Extension.** v1.3.0, read-only. Pages capture themselves on load; one
  capture per page type, newest wins. Setup guide is on the Account tab and
  downloadable.

## Known gaps

- `publish/` is a divergent copy with **none** of this work. Do not deploy it
  without reading `NEXT_PHASE.md` first.
- No `hashchange` listener, so the browser Back button leaves the site.
- Large Net base 400 vs the workbook's 500 — unresolved, do not silently pick.
- 59 workbook drops and 2 locations (Gary's Crushroom, Sinking Swamp) not
  imported.
- `data/main-quests.js` is 1.2 MB because event quests are inlined; splitting
  them into a lazily-loaded file is still open.

## Unverified

Nothing outstanding. When you leave something unproven, name it here rather
than in a commit message, so the next session sees it without reading the log.

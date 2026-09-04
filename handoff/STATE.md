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
- **Gather planning.** `gather-model.js` owns the arithmetic; the Inventory
  tab and the floating tracker both read it so they cannot disagree. The
  tracker (`tracker.js`) is appended to the body, so it shows on every tab:
  this quest on the left, the whole line on the right, collapsible, and a size
  toggle for reading both properly. Tracking is set with **Track** on the
  Quests tab; nothing is tracked yet means the line with the most left to do.
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

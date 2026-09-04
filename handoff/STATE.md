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
- **Inventory tab.** Opens on the questline you have the most left to do on,
  with no picking required; **Track** on any questline in Quests pins a
  different one. Next quest bottom-left, whole remaining line bottom-right,
  both netted against `frpg_owned`. With no inventory imported it says so
  above the table rather than showing a column of zeroes.
- **Item art.** One lookup for the whole app in `item-art.js`. It reads every
  source that carries artwork — `data/items.js`, `data/item-art.js`,
  `data/new-items.js` (mining catalogue) and `data/tower-floors.js` — because
  a lookup that read only the first silently dropped the other three. 1,356
  names resolve; Silver is currency and deliberately has none. Verified on
  screen: Tower, Mining, Quests, Inventory and Calculate all show zero
  placeholders and zero broken images.
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

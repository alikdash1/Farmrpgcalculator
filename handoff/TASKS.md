# Queue

One task per row. Take the top one that fits your agent, claim it in
`STATE.md`, and delete the row when it merges.

**Agent** says who is cheaper for it, not who is allowed: `codex` for bulk file
work, `claude` for anything needing the app on screen, `either` when it does not
matter.

| # | Task | Agent | Why it is worth doing |
|---|---|---|---|
| 0 | **Extension: quests captures do not land** | either | Completed quests reads 2 of ~1,950; Available reads nothing. See the note below |
| 1 | Crafting routes for Tower rows that show "No route data for this one yet" | codex | The Tower rail admits it does not know; the engine can usually answer |
| 2 | Split event quests out of `data/main-quests.js` into a lazily-loaded file | codex | 1.2 MB parsed on every load, for quests that mostly ended |
| 3 | Add a `hashchange` listener | either | Back currently leaves the site instead of changing tab |
| 4 | Tower "done" rows in quiet grey, green reserved for what is next | claude | Green currently means both "finished" and "active", so it means neither |
| 5 | Mining chip source text into a tooltip | claude | The chips wrap badly once a recipe has more than about four inputs |
| 6 | Reconcile Large Net base 400 vs the workbook's 500 | either | Two sources disagree; ask the user rather than picking one |
| 7 | Import the 59 workbook drops and 2 locations (Gary's Crushroom, Sinking Swamp) | codex | Known missing data, straightforward to add |
| 8 | Decide what happens to `publish/` | either | A divergent copy with none of this work; either resync it or delete it |

## Notes for whoever takes #1

`engine.js` already has `sourcesFor` and `resolveTree`. The Tower rail renders
`row.methods` from `data/personal-tower.js`, which is often empty. The question
is whether the engine can fill the gap, not whether new data is needed.

## Notes for whoever takes #8

`publish/` predates the dark theme, the design system, the saga stitching, the
quest import and the inventory tab. Resyncing it is not a merge — it is a
copy-and-verify. Ask the user whether it is still wanted at all before doing
either.


## Notes for whoever takes #0 — the capture bugs

Two symptoms, possibly one cause:

- **Completed quests**: the page holds roughly 1,950 entries; a capture yields
  **2**, and neither matches a real quest title.
- **Available quests**: nothing usable, so "Available Now" reads 0.

Do **not** guess at the page layouts. Everything needed to see the real ones is
already in place:

- `capture-page.js` pushes a warning naming the **first six lines it actually
  read** when a quests page parses nothing, and `background.js` returns those
  warnings to the popup.
- `quests-page.js` prints the completed titles that failed to match.
- The popup lists each section with **how many rows it holds and how old it
  is**, so "did this capture land at all?" is answerable at a glance.

Ask the player to capture the page, then read those back.

**Masteries not updating is solved** (2026-09-05): `data/personal-tower.js`
carries `authoritativeMasteries: true`, and `towerMasteryMap()` read that as
"ignore captured masteries entirely", so re-capturing could never change a
number. A capture newer than the imported file now updates the items it covers;
an older one is still ignored so a stale capture cannot walk numbers backwards.

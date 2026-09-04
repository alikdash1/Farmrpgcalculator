# Queue

One task per row. Take the top one that fits your agent, claim it in
`STATE.md`, and delete the row when it merges.

**Agent** says who is cheaper for it, not who is allowed: `codex` for bulk file
work, `claude` for anything needing the app on screen, `either` when it does not
matter.

| # | Task | Agent | Why it is worth doing |
|---|---|---|---|
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

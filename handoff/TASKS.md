# Queue

One task per row. Take the top one that fits your agent, claim it in
`STATE.md`, and delete the row when it merges.

**Agent** says who is cheaper for it, not who is allowed: `codex` for bulk file
work, `claude` for anything needing the app on screen, `either` when it does not
matter.

| # | Task | Agent | Why it is worth doing |
|---|---|---|---|
| 0 | **Extension: quests captures do not land** | either | Completed quests reads 2 of ~1,950; Available reads nothing. See the note below |
| 1 | **Decide: drop "best route" framing for a neutral tracker** | either | The owner wants the tool to lay out every path and let the player choose, rather than recommending one. See the note below |
| 3 | **The Calculate page counts Apple Cider as item rolls, not stamina** | either | Real arithmetic bug, found 2026-09-05. See the note below |
| 2 | Crafting routes for Tower rows that show "No route data for this one yet" | codex | The Tower rail admits it does not know; the engine can usually answer |
| 5 | Mining chip source text into a tooltip | claude | The chips wrap badly once a recipe has more than about four inputs |
| 6 | Reconcile Large Net base 400 vs the workbook's 500 | either | Two sources disagree; ask the user rather than picking one |
| 7 | Import the 59 workbook drops and 2 locations (Gary's Crushroom, Sinking Swamp) | codex | Known missing data, straightforward to add |
| 8 | Decide what happens to `publish/` | either | A divergent copy with none of this work; either resync it or delete it |

Done and removed: the Back button, the Tower colour split, and splitting
`data/main-quests.js` — that last one was measured at 102 ms to
DOMContentLoaded and is not a performance problem.

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


## Notes for whoever takes #1 — "best route" versus "you decide"

The owner said it "shouldn't be a best route website, just a calculator tracker
so everyone can decide what path he wants". That is a real change of stance,
not a tweak, and it should be agreed with them before it is built.

What the app currently does: `chooseRoute()` and `makeDecision()` in `app.js`
pick an **Auto** route per ingredient — cheapest gold-equivalent, with rules
that prefer farming when co-drops or mastery make it close — and the page leads
with "Use a mixed route" and "Not every cheap route is the right route".

What a neutral version would do: show every route an item has, side by side,
with the cost of each in its own currency, and no default winner. The data is
already there — `sourcesFor` returns crop, fish, drops, vendor and market
together, and `marketQuote` prices the trade.

The pieces that would change:

- `routeOptions()` — becomes a comparison, not a select with an Auto default.
- The "Your Route at a Glance" and "Not every cheap route is the right route"
  copy on Calculate, which is written to argue for a recommendation.
- `data/progression.json`'s route rules, which encode preferences.

Worth keeping either way: the **numbers** behind the recommendation are the
valuable part, and they stay valid whichever framing wins.

## Notes for whoever takes #3

`engine.js` `translateCosts()` does `ciders: explores / mods.drinks.ciderRolls`,
i.e. it treats one Apple Cider as 1,000 explores. The game says otherwise:
**"1000+ Stamina Use | Does not give Stamina | Works with Wanderer Perks | Need
at least 1000 Stamina to use"**. A cider is a fixed spend of 1,000 stamina, so
the explores it buys are `1000 / (stamina per explore at that location)` —
about 9.6 at 104 stamina, not 1,000. The current figure is therefore out by
roughly the location's stamina cost, and always understates how many ciders a
plan needs.

The Places page already does this correctly, but it can only do so because it
asks the player for the per-location stamina cost (`frpg_location_effort_v1`,
the Effectiveness field). **Calculate has no location context**, which is why
this was not fixed at the same time: there is no single right stamina number
for a route that spans several places. Options, in the order they seem sensible:

1. Read `frpg_location_effort_v1` for whichever location the chosen route uses,
   and say "cider count unknown" when that location has no number yet.
2. Ask for one typical stamina-per-explore in Setup and use it everywhere.
3. Drop the cider line from Calculate and point at Places instead.

`data/constants.json` `cider_base_rolls` has been re-described (it is stamina,
not rolls); the key name is left alone because `engine.js` reads it.

# Known Mistakes — Regression List

Real bugs this project already made once. Each has (or should have) a test.
Check new work against this list before shipping; if you touch the related
code, re-run the named test.

## Fixed, has a regression test

1. **Glass Orb defaulted to a crafting route (via Emberstone) instead of the
   direct Ember Lagoon explore route.** The Ember Lagoon route is what
   experienced players actually use — it also drops Emberstone, Ancient
   Coins, and Large Chest 01 as co-drops, and Emberstone itself is needed for
   several Tower-relevant masteries, so crediting the co-drops matters as
   much as picking the right primary route. Tests: `Glass Orb has a direct
   Ember Lagoon route`, `Ember Lagoon route exposes progression-rich
   co-drops`, `Glass Orb strategy rule preserves the experienced-player
   route` (engine.test.mjs).
2. **Iron and Nails weren't correctly treated as "basically free" once Iron
   Depot is enabled** — this regressed at least once after an initial fix.
   Test: `Iron and Nails use Store automatically unless Iron Depot covers
   them`.
3. **Personal Tower/mastery page didn't update from new account captures** —
   user reported it repeatedly ("its wrong i have done some more but it wont
   update when i capture", "still not working"). Fixed by treating one
   authoritative mastery-history snapshot (`data/personal-tower.js`,
   `authoritativeMasteries: true`) as the source of truth rather than
   re-deriving from partial captures. Test: `personal Tower page uses the
   authoritative mastery-history snapshot`.
4. **Mining location assignments were wrong** (e.g. Lapis Lazuli, Pyredrop,
   Bone Fragments assigned to the wrong mines) — corrected against 5 of the
   user's own screenshots on 2026-08-2x. If you add/edit mining location
   data, verify against a real screenshot or `buddy.farm`, not assumption.
5. **Mount Banon co-drop total double-counted the selected target item** —
   was showing "12 locations" of co-drops including itself; fixed to show
   the other 11 co-drops only, excluding the item you already selected as
   the target.
6. **Knowledge-pack quest/recipe requirements were duplicated** — Kimi's
   first build of `knowledge-pack/tools/build-database.py` included `source`
   in the dedup key, so the same logical requirement from two sources
   counted as two rows (e.g. "A Towering Investment II" showed 30
   requirements instead of 15). Sources should merge as provenance, not
   duplicate the fact. Fixed — spot-checked clean as of 2026-09-02
   (`node knowledge-pack/query.mjs quest "A Towering Investment II"` shows
   each ingredient once). If you touch `build-database.py`, re-check this.
7. **`app.js` had a corrupted template literal** (stray `'` characters
   inserted mid-edit around the Tower T301–T340 cost-grid render) that threw
   a `SyntaxError` and broke the entire calculator (blank page) — this is
   how the previous Codex session ended; it got cut off mid-edit by a usage
   limit before finishing. Fixed 2026-09-02. **Always run `node --check` on
   every JS file you edit before calling a task done** — this exact failure
   mode (a usage/time cutoff landing mid-edit) will recur with any AI tool
   on this project, Claude included.
8. **Three test files hardcoded an absolute Windows path**
   (`C:/Users/user/Desktop/FarmRPG Calculator Research/calculator`) instead
   of resolving relative to the test file. Harmless as long as the project
   never moves and tests always run on that exact machine, but it also
   silently breaks the whole suite if run through any sandboxed/bridged
   shell (as discovered this session) or if the folder is ever renamed/moved.
   Fixed via `path.join(path.dirname(fileURLToPath(import.meta.url)), '..')`.

9. **Route decision cards were sized against the wrong tree.** They were
   built from the fully-expanded recipe tree, while the shopping list and the
   plan tree were built from the tree *after* "buy this instead" stops were
   applied. Any ingredient reachable through two parents was therefore
   overstated on its own card, along with its gold estimate — Glass Orb
   showed "× 12m" (8m through Steel + 4m through Red Dye → Glass Bottle)
   next to a list asking for 8m, because Red Dye is bought, not crafted.
   Fixed by settling decisions and tree together to a fixed point. Tests:
   `a shared ingredient is sized from the plan, not the unstopped tree`,
   `Red Dye still reaches Glass Orb through Glass Bottle` (engine.test.mjs).
   **If you add another pass that re-resolves the tree, make sure anything
   already computed against the old tree is recomputed too.**
10. **52 dead buttons on the Tower page.** Mastery and floor-cost entries
   rendered with `role="button"`, `tabindex="0"` and a title promising "Open
   X in the Craft planner", but `FRPG_openItem` returns `false` when the item
   is not in the planner's index — so the click silently did nothing. This is
   the same failure mode as the dead Acorn Pie toggle. **Any element given a
   button role must be checked against whether its handler can actually
   succeed for that specific row**, not just whether the handler exists.
11. **Fished and explored ingredients were presented as crafts.** Leaves in
   the plan tree rendered with no route label under a heading reading "Chosen
   craft tree", so Pearl, Catfish and every other gathered item looked like
   something you craft. The routing itself was correct the whole time — this
   was purely how it was labelled, which the user reported as a data bug.
   Every leaf now names its real route.
12. **UI copy was asserted in a test.** `account-sync-extension.test.mjs`
   matched the literal string "Manual backup" in `index.html`, so rewording
   player-facing copy broke the suite for no good reason. Assert the control
   (`id="accountFile"`), not the words around it.

## Not bugs, but easy to reintroduce accidentally

- **Acorn Pie accounting**: it's action-limited (150 actions per pie), not
  drink-limited. A 5x meal (Cabbage Stew for Cider, Lemon Cream Pie for
  Arnold Palmer) means 5 drinks = 1 action = 1 Acorn use. Charging Acorn use
  per drink instead of per action would overcharge by 5x. See
  `knowledge-pack/PLAYER_KNOWLEDGE.md`.
- **Acorn Pie has no effect in the Forest** (Hide already drops there
  naturally) — don't apply Acorn Pie Hide-boost logic to Forest.
- **AP (Arnold Palmer) gold price is volatile** (observed 40–45, 60, 65, 70
  gold/1000 at different times in this same project). Never hard-code a
  gold value for AP as a fact; prefer "AP saved" as the comparison unit, and
  if a gold price is shown at all, require a fresh dated value.
- **Trade quotes use `/k` = per 1,000**, not per unit. Misreading this
  produces prices off by 1000x.
- **Buying is not always the winning route even when cheaper in isolation.**
  Farming can win on masteries, quest reserves, sellable co-drops, or
  reduced inventory voiding. Don't collapse the decision to "cheapest single
  item price wins" — see `docs/FARM_RPG_PLAYER_SKILL_BLUEPRINT.md`.
- **`data/data.js` is no longer purely generated. Do not re-run
  `tools/build-data.mjs` casually.** It carries hand-added values that are not
  in `raw/`: the `mushroom_mastery_bonus` constant and the Glass Bottle route
  rule. Regenerating silently deletes both — confirmed 2026-09-05 by running it
  and diffing the parsed JSON, which is the only way to see it (the file is
  three enormous lines, so `git diff` shows nothing useful). If you need
  something new out of `raw/`, write a separate small file the way
  `tools/build-location-rates.py` does.
- **`style.css` sets a bare `table { min-width: 1050px }`** for the Calculate
  page's decision table. It is an element selector, so it silently applies to
  every table anyone adds anywhere on the site, and it pushed the Places yield
  table to three times its card width on a phone. Any new table needs its own
  `min-width: 0`. Test: `the yield table survives the site-wide table
  min-width` (places.test.mjs).
- **Some Buddy.farm-listed location drops are event-only**, not always
  farmable, but earlier data pulls didn't distinguish this. Flag/verify
  event-only status before listing a drop as a normal route.

## Open / unresolved (not a bug fix so much as unfinished measurement)

- Acorn Pie Hide yield per location is only measured for a handful of
  locations (Small Cave, Small Spring, Highland Hills, Cane Pole Ridge), each
  with small sample sizes and no matched no-Acorn baseline. Treat these as
  provisional, not ground truth, per `PLAYER_KNOWLEDGE.md`.
- Tower floor cost data (`data/tower-floors.js`, T301–T340) currently has
  `ak: 100` hardcoded identically for every floor. The user did mention "100
  AK" in the transcript in a Tower-cost context, so this may be correct as a
  flat per-floor constant — but it was never explicitly confirmed as
  per-floor-accurate rather than a placeholder. Verify with the user or
  against `buddy.farm/tower/` before trusting it for anything precise.

## Source precedence (user's rule, 2026-09-03)

**The shared workbook outranks buddy.farm.** Where the *FarmRPG Tower MM
Calculator (Shared)* workbook and buddy.farm disagree, the workbook wins.
Live copy:
<https://docs.google.com/spreadsheets/d/1N4FdpTC3G2vjf7cn0mhcvZF2odP-_W8tSFUjiI1xjUs/edit>
(public, comment-only; export any tab with
`/export?format=csv&gid=<gid>`, or the whole book with `?format=xlsx`).
The knowledge pack already carries a 2026-08-26 snapshot of it as `wb-tower-mm`.

What a read of the live copy on 2026-09-03 established:

- **Its Tower tab stops at T300.** Column A runs 201→300 and then ends, so it
  does *not* supply named Mega Masteries for T301+, and cannot close the
  T331–T340 gap. Whatever feeds the app's named MMs to T330 comes from
  somewhere else. Do not claim this workbook as the source for them.
- **Its Bonuses tab disagrees with the calculator's constants** (workbook
  states it assumes every beneficial perk is on — resource saver, reinforced
  netting, lemon squeezer):

  | Thing | Workbook | `data/data.js` constant |
  |---|---|---|
  | Items per Arnold Palmer | 500 base | `ap_base_items` 200 (500 with Lemon Squeezer) |
  | Items per Large Net | 500 base | `net_ln_base_catch` 250 (400 with Reinforced Netting) |
  | Crafting dupe | 1.45 | — |
  | Mastery bonus | +10% event, +10% Mushroom Stew | — |

  The AP figure reconciles (workbook = perked). **The Large Net figure does
  not**: 500 vs 400 even with Reinforced Netting, and the app's own note says
  400 is "before artifacts". Unresolved — do not quietly change
  `net_ln_base_catch`, because it moves every fishing number on the site.

## Tower floor items are REWARDS, not requirements (confirmed 2026-09-03)

`data/tower-floors.js` `items[]` is what a floor **pays out**. Confirmed twice:
the game's own Tower page prints the list under "Level Rewards:" (see
`raw/account-captures/farmrpg-capture-tower-2026-08-26_*.json`), and the user
confirmed it directly. buddy.farm lists Silver *among* those items on some
floors, which only parses as a payout. What a floor costs is Silver + 100 AK +
holding that floor's named Mega Masteries. The page said "What Each Floor
Costs" for months. Do not relabel it back.

Also open: the same capture reads **T276 = 82.80B Silver** where buddy.farm
says 41.4B — exactly 2x. Every `silverB` in `data/tower-floors.js` may be half
the live cost. One data point only; confirm on a second floor before scaling.

## Arnold Palmer is not exploring (user correction, 2026-09-03)

**Exploring spends stamina. An Arnold Palmer finds items on its own and spends
no stamina.** They are two different activities with two different drop rates —
not one activity priced in two currencies.

`app.js` had `apUses = drop.explores / (apItems * qc)`, i.e. it treated an AP as
a bulk purchase of explores. For 1m Emberstone at Ember Lagoon that produced
**145.02k Arnold Palmers**; the workbook's own measured rate gives **15.47k**.
Nearly 10x wrong, and wrong in a way that made AP look far worse than Cider on
every single explore route.

Fixed: AP uses now come from the measured drops-per-AP in
`data/workbook-rates.js` (`workbookApRate()`), and are `null` when that pair was
never measured rather than derived from the explore rate.

This also explains the "128 exploring conflicts" the knowledge pack preserved
between the workbook's drops-per-AP and the 2023 logged explores-per-drop. They
were never in conflict — they measure different actions. Do not try to convert
between them.

How the units were confirmed, if this ever needs re-checking:
- Fishing locations' rates sum to **500** per Large Net; exploring locations'
  to **550** per AP = 500 x 1.1, so the workbook's exploring figures assume
  **Quandary Chowder is active**. Back that out for a player who does not
  have it.
- Refined 2026-09-05 while building Places: those totals are a **floor, not an
  identity**. Nine of thirteen fishing locations sit on 500.00 and eight of
  thirteen exploring ones on 550.00; the rest only ever come out *high* (Ember
  Lagoon 606, Sinking Swamp 605, Small Cave 581, Forest Pond 543), which is
  what rare chests and runestones landing on top of the ordinary find looks
  like. A total *below* the floor would mean the unit had changed. Test: `the
  workbook is scaled to this account, in its own unit` (places.test.mjs).
- Cross-check that the method is sound: converting the workbook's *fishing*
  rates the same way reproduces the site's existing numbers almost exactly
  (Small Pond Drum 2.10 casts vs 2.09; median agreement 0.92 over 117 pairs).

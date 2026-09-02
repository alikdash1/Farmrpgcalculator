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

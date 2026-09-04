# Next Phase

## Completed 2026-09-04 — Inventory planning

The root app now has an Inventory tab that compares the saved `frpg_owned`
inventory with the next unfinished quest and the sum of every unfinished step
in one tracked questline. Tracking can start from either Quests or Inventory.
Quest completion and saga stitching live in `quest-model.js`, so the two pages
cannot drift. Item pictures now use one shared lookup, backed by 119 verified
fallback paths in `data/item-art.js` (106 missing quest items and 13 Mining
items); Silver remains currency with no item picture.

The checked-in personal list currently marks only Problems Start Arising I and
II complete. Following the required "not completed" rule therefore makes III
the next step and produces 31 unfinished steps with 189 distinct requirement
names. The original task brief described the same account as 30 steps and 192
items; update the personal completion capture or quest requirement source if
those newer figures are authoritative.

**Still open:** `publish/` does not contain this tab, shared model, or art file.
That copy remains intentionally untouched while the two-front-end merge below
is unresolved.

## ⚠ BIGGEST OPEN ISSUE: two divergent front-ends (found 2026-09-02)

There are **two different versions of the app** in this repo and they have
drifted apart:

| | `calculator/` (root) | `calculator/publish/` |
|---|---|---|
| Views | 9 | 7 |
| Home shortcuts | CALC, FARM, **Field lab**, **Strategy library** | CALC, FARM, **Tower T340**, **Main quests**, **Mining map** |
| Rule card | "Rules already understood — Not every cheap route is the right route." | "Useful Routes — Cheap Is Not Always Best." |
| `fieldlab` + `library` sections | present | **removed** |
| Latest fixes (2026-09-02) | yes | no |

`publish/` is a **player-facing trim** — someone (a previous Codex session)
did the "make it for the player, not for the developer" pass the user asked
for, but did it as a separate build folder and **never merged it back**.

**This is almost certainly why the user says the site "feels like it's for
you and not the player": the file they actually open, `calculator/index.html`,
is the developer-facing version.** The cleaned-up one has been sitting in
`publish/` unused.

**Decided 2026-09-02** (user: "idk what you are talking about just do whats
best"): **both pages stay**, rewritten for players rather than deleted. The
Field lab keeps its Acorn Pie sample form and its editable numbers now have
readable names; the Strategy library became "Why routes get picked" with the
build diagnostics stripped out. Neither is on the home page's main grid — they
sit in the "Also here" line beneath it.

Still to do: merge one front-end direction, delete the other copy, and replace
the manual copy-paste with a real build step so they can never drift again.

Do **not** deploy `publish/` as-is — it is missing every fix made on
2026-09-02.


## Immediate — next up

The 2026-09-02 player-facing pass is **done** (see CHANGELOG for the full
list: one real quantity bug, 52 dead Tower buttons, fishing presented as
crafting, the Cider-vs-AP comparison, and the dev-facing copy across every
view). What that pass left open:

- **`publish/` is now much further behind.** It still has none of the
  2026-09-02 fixes and never got the correctness fix either. Do not deploy it.
  Deciding the merge direction is now the single most valuable next step.
- **Stamina per explore is still unverified.** The perk list models only
  Wanderer I-IV (20%) plus the Neigh meal (20%), which lands at 64% of normal.
  The user believes their real figure is nearer 50% but was explicitly unsure,
  and no source for the full stacking rule was found. There is now a "Stamina
  you really spend" percentage control on the Craft page so they can set it —
  but the underlying game rule is still an open question. Do not hard-code a
  number for this; see KNOWN_MISTAKES.md on confidently-wrong game facts.
- **43 items the game has are missing from the planner's item index** —
  Basic Pillow, Brown Dye, Oak Table, Gold Ring, Magus Hat and the rest of the
  T301+ list. They exist in `knowledge-pack/farmrpg.db` but with no recipe, no
  price, so merging them in would not create usable routes. Shared fallback art
  now covers the known quest and Mining pictures, while these rows still render
  honestly as "No route data for this one yet" instead of as dead buttons.
  Real fix = getting the route data, not merely merging names.
- **The user has not reviewed any of this yet.** Their words: "finish
  everything first then i will go through it." Expect a list.

## Backlog, from the previous session's own "is this production ready?"
assessment (2026-08-3x) — still true unless noted

| Area | Status |
|---|---|
| Private beta (you + friends) | Ready |
| Public website | Nearly ready |
| Account-sync extension | Not production-ready |
| Farm RPG accuracy | Good, still incomplete |
| Deployment/recovery | Needs work |

Specific items:

- **Hosted-domain extension support** — the account-sync extension currently
  only accepts localhost/file pages and opens `127.0.0.1:8772`. Won't sync
  with a real hosted domain until `manifest.json` and `popup.js` are updated.
- **Real deployment** — currently just a local static folder / zip. No
  HTTPS, compression, security headers, or hosting target chosen (Cloudflare
  Pages / GitHub Pages / Netlify / Vercel were suggested, never decided).
- **Editable market prices** — AP/Cider/OJ/trade prices drift over time
  (confirmed volatile, see KNOWN_MISTAKES.md) and are still effectively
  hardcoded assumptions in places; need an editable-with-"last updated"-date
  UI rather than baked-in constants.
- **Remaining game-data gaps**: Croissant source, Cid Buddy Doll source,
  Mining Bag 06 exact origin, per-pickaxe/charm mining drop rates, more
  Acorn Pie displacement measurements per location, some newly released
  quests/rewards not yet captured.
- **External dependencies** — item art and Google Fonts still load from
  external servers in some builds; for a real production release these
  should be vendored/local for reliability.
- **Accessibility** — some generated route selectors and owned-quantity
  inputs lack accessible names, some inputs lack name/autocomplete, some
  generated `<img>` lack explicit width/height (was flagged against the app's
  own generated selectors in `app.js`, not yet audited this session).
- **First-time onboarding** — no guided flow yet (import account → confirm
  perks/infrastructure → pick play style/spending → get first
  recommendation). Right now a new user has to already understand the
  system.
- **The `farm-rpg-strategist` skill described in
  `docs/FARM_RPG_PLAYER_SKILL_BLUEPRINT.md` is a design doc, not yet fully
  implemented** as an actual advisor in the app — the Craft planner does
  single-item route comparison; it doesn't yet do the full "what should I do
  right now given my whole account state" recommendation the blueprint
  describes. This is the single biggest remaining piece of ambition in this
  project per the chat history — worth checking with the user on priority
  before investing heavily here, since it's a large amount of work.

## Process notes for whoever (human or AI) picks this up next

- Query `knowledge-pack/` before re-deriving any Farm RPG fact from scratch —
  see `PROJECT_STATE.md`.
- The user explicitly asked for shorter reasoning-effort settings for
  routine work (their words: "Medium: normal development... Low: small
  visual changes... High: only for major decision-engine architecture or a
  final accuracy audit") to conserve usage — apply the equivalent judgment
  regardless of which AI tool is doing the work.
- Batch corrections/requests where possible rather than one small edit at a
  time — the user asked for this explicitly after burning through usage
  fast on many tiny turns.
- Update `CHANGELOG.md` and this file at the end of any real work session so
  the next session (any AI) doesn't have to re-read the whole chat history
  to know what happened.

## Still open after 2026-09-03

- **`publish/` has none of the 2026-09-03 work** — player-chosen routes, the
  Mining page, the new palette and typefaces all live only in the root copy.
- **59 workbook drops and 2 locations** (Gary's Crushroom, Sinking Swamp) are
  in `data/workbook-rates.js` but not in `data/data.js`.
- **Large Net base catch: 400 in our data, 500 in the workbook.** 250 base +
  150 Reinforced Netting + 100 Trigon Knot = 500, which matches the workbook
  exactly, so the workbook figure is fully-perked. Changing
  `net_ln_base_catch` moves every fishing number — needs a decision.
- **Tower silver may be 2× low.** T276 is the only confirmed data point.
- **Mining items dead-end in the calculator** — the planner's route index has
  no mining locations, so a mine drop cannot be costed yet.
- **No `hashchange` listener.** `showTab` uses `replaceState`, so the browser
  Back button leaves the site instead of returning to the previous tab.

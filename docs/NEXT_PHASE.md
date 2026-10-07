# Next Phase

## Open after 2026-10-08 — public launch

- **First tester** (a strong player): "mostly reasonable", "slightly
  overwhelming", "within 10-30% of actual is good enough". Done since: veteran
  perk defaults, Hay Field list removed, a text and box cut on every page.
- **Ask:** what he meant by "EE perks" (exploring effectiveness is per place
  and read off the game, so it cannot be a default).
- **Accuracy check still owed:** one or two real runs logged against the Trips
  page prediction, to see which drop rates are off.
- **Not done, offered:** fold Mining into Places and Inventory into Quests to
  cut the tab count from nine to about six.
- **The website still opens on the owner's farm as the example** and the
  personal files are in the public repo; only the zip starts empty. Undecided.

## Open after 2026-10-01 — T300 by the end of October

Read the owner's live numbers from their Brave (Claude in Chrome, the planner's
localStorage `frpg_account_snapshot_v1`) - the bundled `data/personal-tower.js`
is from 2026-09-19 and stale. Counts below are the 2026-10-01 capture.

- Owed to T300: Pitchfork 396,031 (T290) · Salt 576,496 + Pickaxe 732,434 (T294)
  · Fancy Drum 878,011 + Fancy Guitar 685,011 (T295) · Leather Bag 785,546 +
  Beet 783,358 (T296) · Essence of Slime 784,397 + Wrench 407,079 + Hourglass
  826,814 (T298) · Red Trunk 906,113 (T299) · Wizard Hat 25,941 + Water Lily
  667,057 (T300). Hammer, Axe, Shovel: owner says free, leave out. Wooden Bow
  and Mystic Ring are done.
- Owner's Pumpkin Juice: 2 on Salt (409,830 left), 2 on Water Lily (500,391),
  1 on Red Trunk (815,204). One PJ = finish at 909,091; two stacking to
  833,334 is ASSUMED, not confirmed.
- Steel 5.83m and Steel Wire 2.83m are wall-clock bound; the advice is to
  craft both from bought Carbon (10 AP/k) + Glass Orb, Iron is free.
- Water Lily by Large Net: 225,982 LN with Sea Pincher + Mushroom Stew, which
  also drops ~454,900 Grab Bag 01 (Bone, 3-leaf Clover, Aquamarine, Gold
  Cucumber, Mushroom, Potato, Catfish - one of, 10-50; odds unknown).
- **Fixed 2026-10-01:** container contents listed as craft recipes (Grab Bag 01
  = 50 Bone + 50 3-leaf Clover) are dropped in the tools and the app alike, by
  `js/containers.js`. If a new bag still shows a recipe, extend that rule.

## Open after 2026-09-29 — sharing it

- **Push, then check GitHub Pages serves `downloads/farm-rpg-account-sync.zip`**
  at https://alikdash1.github.io/Farmrpgcalculator/downloads/farm-rpg-account-sync.zip.
- **The author must tick "The example farm is mine"** on the Account page once
  in each browser they use, or their own bundled mastery export is set aside as
  soon as the extension connects.
- `data/player-facts.js` still mixes game rules with one farm's facts; visitor
  mode clears only `containersHeld`, `inventoryCap` and `farm`. Splitting the
  file would be cleaner.
- The Chrome Web Store would remove the Developer-mode step for players. It
  needs a developer account and a privacy policy; the extension already has no
  network code, which makes review simple.
- The questline planner still sorts places by cost, deliberately (biggest job
  first). If players expect game order there too, `FRPG_PLACE_ORDER.rank` is
  ready.

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
- **Sinking Swamp's exploring table in the sheet has two stray rows** —
  "Sinkrot" (51.59/AP) and "Re'Taw" (0.066/AP) beside the real "Sinkroot" and
  "Re'taw". The planner reads by exact item name, so it uses the real ones, but
  Places lists all four. Without the strays the table adds to exactly **500**
  per AP, where every other location adds to 550 (Quandary Chowder included).
  If that table was measured without Quandary, the planner's Arnold Palmer
  counts at Sinking Swamp are 10% high with the meal on. Ask the owner.
- **Two items were renamed in game** and stay under their data.js names:
  Spring Basket (now Spring Basket 01) and Beatrix's Booming Brawl Box (now …01).
- **Large Net base catch: 400 in our data, 500 in the workbook.** 250 base +
  150 Reinforced Netting + 100 Trigon Knot = 500, which matches the workbook
  exactly, so the workbook figure is fully-perked. Changing
  `net_ln_base_catch` moves every fishing number — needs a decision.
- **Tower silver may be 2× low.** T276 is the only confirmed data point.
- **Mined items still cannot be costed.** Since 2026-09-11 they are searchable
  and their crafts resolve, and a raw mined item says which mine and pickaxe it
  needs — but no mine has drop rates (Buddy publishes none either), so the cost
  stops there.
- **Dead CSS for a full-screen list.** `inventory.css` still styles
  `.inventory-overlay` and `.inventory-expand`, which no script creates any
  more — the tracker's expanded mode replaced it. Harmless; delete when next in
  that file.
- **Three CSS generations are still stacked** (`style.css` minified original →
  `v3.css` → `system.css`). Since 2026-09-11 their values agree, but many
  `system.css` rules exist only to override older ones. Collapsing them is a
  refactor with no visual payoff — do it only alongside real work in a sheet.
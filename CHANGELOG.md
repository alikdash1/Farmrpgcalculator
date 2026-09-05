# Changelog

Dated log of real work sessions on this project. Keep entries short — what
changed and why, not a diff. See git log for the actual diffs (this project
started tracking git history 2026-09-02; everything before that is
reconstructed from the Codex chat transcript only).

## 2026-09-05 (last, 2) — Everything the game says about stamina

The owner: *"protien bars just increase effectivness"*, then *"please check
everything about stamina and effectivness farm rpg has to offer"*. They were
right, and the check turned up two data errors older than this session.

- **Wanderer is a skip chance, not a discount.** The game lists it per tier:
  "4% / 7% / 9% / **13%** chance exploring won't use Stamina", and the tiers
  replace each other. `data/effects.json` said "Uses about 20% less stamina
  while exploring", value `0.2` — the wrong number *and* the wrong mechanic.
  Now `0.13`. This moves `exploreStaminaPer` from 0.80 to 0.87 everywhere.
- **An Apple Cider's stamina is not fixed; its exploring is.** The item page:
  "The amount of stamina used by this item depends on your exploring
  effectiveness in each explore location." So a cider is 1,000 explores
  (1,250 with Cinnamon Sticks) costing 1,000 x effectiveness stamina — at 104,
  that is 104,000, not 1,000. This reverses the "fix" made earlier today,
  which had read "1000+ Stamina Use" without the item page beside it.
- **Effectiveness only ever goes up.** Protein Bars, Jill and Sprint Shoes all
  raise it ("Doubles Stamina Effectiveness — Stamina is used faster"). The page
  said Protein Bars and Jill lowered it. It now says what raising it is for:
  stamina comes back on its own and ciders do not.
- **`docs/STAMINA_AND_EFFECTIVENESS.md`** collects all of it in the game's own
  words — what uses stamina, what gives it, what saves it, what never touches
  it, and the single inference the app leans on, flagged as an inference with
  the in-game check that would confirm it.
- 101 tests pass.

## 2026-09-05 (last) — Places corrections, all from the owner playing the game

Four reports, every one a real modelling error rather than a display bug.

- **"it doesnt calculate how much stamina i am using with cider."** Right, and
  worse than that: Apple Cider was on the wrong side of the model entirely. The
  game says **"1000+ Stamina Use | Does not give Stamina | Works with Wanderer
  Perks | Need at least 1000 Stamina to use"** — a cider is a fixed spend of
  1,000 stamina, so what it buys depends on the location. It now goes through
  the stamina path and states the spend: 1,000 ciders is 1,000,000 stamina, or
  9,615 explores at 104 each. `cider_base_rolls` was described as "item-roll
  equivalent"; it is stamina, and is now labelled so.
- **"why is stamina in fishing ... take away stamina."** Right — fishing costs
  bait, not stamina (Worms are type `bait`, "Use this to catch fish"). The
  option is gone, and Effectiveness no longer shows on fishing cards, since it
  is an exploring mechanic.
- **"the whole rings drop are from the chest not in here."** Right, and the
  data proves it: Medium Chest 02 drops 0.08987 per AP at Black Rock Canyon and
  holds 5 Aquamarine Rings; the workbook lists Aquamarine Ring at 0.4493. The
  workbook expands a chest into its contents and lists them as drops. Now
  detected by arithmetic — if every ingredient of a craftable item appears at
  exactly its rate times its amount, the table has expanded it — and shown
  under the drops as "And inside those chests". Confirmation the detection is
  right: pulling the contents back out lands Highland Hills, Black Rock Canyon
  and Mount Banon on exactly 550.0 and Pirate's Cove on 500.0.
- **"i dont understand this what is this for just take it out."** The rates
  note explained the workbook's internals. It was written for me, not for a
  player. Now one line.
- Effectiveness is the field's name, as the game calls it, and it says what it
  buys: "At 104 stamina an explore, one Orange Juice (100 stamina) is 0.96
  explores here, and one Apple Cider (1,000 stamina) is 9.6."
- A place with logged rates but no per-AP rates now says which spend would
  work instead of "nothing recorded".
- Queued as TASKS #3: `engine.js` has the same cider error on the Calculate
  page. Not fixed here because Calculate has no location, so it has no stamina
  cost to divide by — the options are written up in `handoff/TASKS.md`.
- 100 tests pass; verified in a browser with no console errors.

## 2026-09-05 (later) — Places: what a pour actually returns

The user: *"add the locations where i can explore and fish ... add Exploring
Effectiveness ... to each one of them so everyone can edit them to their own
effectiveness ... if i want to pour 1k arnold palmer there what do i get in
return"*, then *"or 2k 3k ... even for the fishing"*.

- New **Places** tab. Every explore and fishing location, with what it drops
  and what a stated pour returns: Arnold Palmers, Lemonades, Apple Ciders,
  Orange Juices, raw stamina or plain explores; Large Nets, Fishing Nets,
  rod casts or stamina for fishing. Each currency converts to actions through
  Setup's own numbers, so ticking Lemon Squeezer changes the answer here too
  (`window.FRPG_MODS`, exposed from app.js).
- **Exploring Effectiveness is typed in, per location.** Farm RPG prints it
  on the location page and Protein Bars and perks move it, so there is no
  right value to default to. Without it, the stamina and Orange Juice options
  refuse to answer rather than invent a cost. Stored per location in
  `frpg_location_effort_v1`.
- **Both rate sets are shown side by side, never averaged.** The shared Tower
  MM workbook is *drops per Arnold Palmer*; `data/data.js` is *explores per
  drop* from community logs. They disagree by roughly 12x on exploring. But
  not randomly: multiply one by the other and every item at a location lands
  near the same figure (~1,700-2,400), which the page states as "one Arnold
  Palmer does the work of about N explores here" and labels as measured off
  the two tables rather than stated by the game. On fishing the gap is about
  2x and is explained: the workbook assumes a 500-catch Large Net and Setup
  may have yours at 250. The page now says so.
- Fishing reads the table that matches how you fish — `manual_fish_rates` for
  the rod, `drop_rates` for nets. Using one for both double-counts.
- New `data/location-rates.js` (+ `tools/build-location-rates.py`): the
  `iron_depot_rates` that `build-data.mjs` was discarding. Used only when
  Setup says the player owns Iron Depot. 158 of 159 comparable pairs get
  better, as they should.
- Every row is scored against what you still need: the tracked questline's
  shortfall and the lowest unfinished Tower floor, with an "Only what I still
  need" filter and an item search that re-ranks the locations. "Where do I
  pour 1k AP for Ancient Coin" answers Ember Lagoon, 26k.
- 98 tests pass; `handoff.mjs check` clean; verified in a real browser at
  1180px and 375px with no console errors.

## 2026-09-04 — Inventory questline planner and shared item art

- Added a dedicated Inventory tab with a searchable owned-item list, questline
  picker, next-quest requirements, and a scrollable full-line total. Shortages
  sort first, completed quest steps are excluded, pending saga steps remain
  visible, and the two planning panels stack below 900px.
- Added Track controls to every questline. Quests and Inventory now share one
  saga-aware quest model and one completed-title normalizer, including the
  personal list plus imported account captures.
- Added a single shared art lookup used by the calculator, Tower, Quests,
  Mining, and Inventory. Added 106 verified missing quest-item pictures plus
  13 existing Mining pictures to `data/item-art.js`; all 119 URLs returned HTTP
  200. Silver stays art-free and is labelled as currency.
- Added Inventory/model/art regression coverage. All 52 tests pass, every
  edited script passes `node --check`, and the self-contained preview bundle
  was checked at desktop and mobile widths with no browser-console errors.

## 2026-09-02 (later) — Player-facing correctness pass

The user: *"continue with this build there's still too many wrong things in
the website"*, then two specific reports — fish being presented as crafts,
and doubt about the Cider-vs-AP "whichever is cheaper" choice because Cider
spends stamina. Everything below was found or verified by driving the real
app in a browser, not by reading source.

**Real calculation bug.** The Route decisions cards were sized against the
fully-expanded recipe tree rather than the plan actually being shown. Glass
Orb displayed "× 12m" (with a gold estimate to match) next to a shopping list
asking for 8m, because Red Dye was being bought instead of crafted through
Glass Bottle. Decisions and the tree are now settled together to a fixed
point.

**52 dead buttons.** Tower mastery and floor-cost entries rendered with
`role="button"` and "Open X in the Craft planner", but `FRPG_openItem`
returns false for items the planner has no data for, so the click silently
did nothing. Those entries are no longer buttons and say "No route data for
this one yet"; the working ones now have a hover/cursor affordance. Their
missing art rendered as a bare `?` (52 tiles) and now shows the item's
initial.

**Fishing.** Every leaf in the plan tree rendered bare under a heading that
said "Chosen craft tree", so Pearl, Catfish and every other fished ingredient
read as something you craft. Each leaf now states how you actually get it
(fish for it / explore for it / grow it / buy in trade / buy at the Country
Store), and a goal with no recipe says "Not a craft — you get this one
directly" instead of showing a crafting-yield chip.

**Cider vs AP.** "Auto — whichever is cheaper" asserted a winner without
showing that Cider's advantage is spent on stamina. The planner now prints
both sides and the gap, and warns when Lemon Squeezer, Cinnamon Sticks or
Wanderer are off — those three swing it hard (perks off: Cider looked 2.6x
cheaper; endgame set on: 5.5k vs 7.17k gold). Added a "Stamina you really
spend" percentage next to the drink picker, because the perk list only models
Wanderer and overstates stamina for an endgame account. **Not resolved:** the
user believes they spend about 50% of normal stamina but was not sure, and no
source was found for the full stacking rule — the control is there so they can
set it, but the real figure is still unverified.

**Copy.** `fmt() + "g"` rendered gold as "152.46kg". "1 inputs". "recipe
stopped at the chosen acquisition route", "direct acquisition stop", "Handled
quietly", "Extension not connected", "Calculator assumptions remain manual",
"Strategy export is unavailable. Rebuild data/knowledge.js.", and a Tower
summary claiming T330 under a heading promising T340.

**Strategy library / Field lab** (the two pages NEXT_PHASE flagged as
undecided — the user said to use judgement). Kept both, stripped the build
diagnostics. The library is now "Why routes get picked"; the integrity /
unresolved-names / parse-coverage panel and the ETL evidence strings are
gone. All 17 route notes were rewritten from calculator instructions into
player advice, and the needs-measurement badge was wrong on 7 of them — it is
now "Needs your own numbers" on only the four that genuinely need the
player's own measurement. **The rewrites were also applied to
`knowledge-pack/farmrpg.db`**, since `data/knowledge.js` is generated by
`tools/export-knowledge.py` and would otherwise lose them. The Field lab's
editable constants had raw storage keys as titles ("crop qf is reduction")
and now have readable names.

Housekeeping: added `?v=` cache-busting to the `data/data.js` and
`data/knowledge.js` script tags, removed a stray 0-byte `({id` file, ignored
`.claude/`, and replaced a test that asserted UI copy ("Manual backup") with
one that asserts the control it was standing in for. 38 tests pass.

## 2026-09-02 — Claude takes over the project

The user's Codex usage ran out mid-session; they shared the read-only Codex
chat transcript and asked Claude to continue, then to take over the project
entirely.

- Found and fixed a `SyntaxError` in `app.js` (corrupted template literal,
  stray `'` characters) left by the previous session's last, unfinished edit
  — this had made the entire calculator fail to load.
- Verified the Tower T301–T340 floor data (40 floors) and the 202-quest /
  19-questline main-quest data were actually complete and correctly wired
  in underneath that syntax error.
- Fixed 3 test files that hardcoded an absolute Windows path instead of
  resolving relative to the test file (broke portability; see
  KNOWN_MISTAKES.md).
- Updated one stale test assertion (Tower goal floor 300 → 340) to match the
  intended T340 extension.
- All 38 `calculator/tests/*.mjs` tests pass; `knowledge-pack` self-test
  passes; every top-level and `data/*.js` file passes `node --check`.
- **Created the first git commit this project has ever had**
  (`f959945`, "Checkpoint: Lantern Ledger calculator, Tower T301-T340 + main
  quests") — the project had zero version-control history despite months of
  work across many AI sessions. Set a local (not global) git identity since
  none existed on this machine.
- Wrote `PROJECT_STATE.md`, `KNOWN_MISTAKES.md`, `NEXT_PHASE.md`, and this
  file, consolidating the ~120-turn Codex chat transcript so future sessions
  don't need to re-read it. (`knowledge-pack/PLAYER_KNOWLEDGE.md`,
  `AI_READ_FIRST.md`, and `docs/FARM_RPG_PLAYER_SKILL_BLUEPRINT.md` already
  existed and are the canonical game-knowledge memory — these new files are
  a project-status layer on top, not a duplicate.)
- Fixed 5 **undefined CSS custom properties** (`--panel`, `--panel-2`,
  `--accent`, `--bg`, `--bg-soft`) used across ~18 rules in `quests.css`,
  which silently rendered quest filters, quest lines/steps, `.quest-item`,
  `.tower-cost-card` and `.route-evidence` with no background, border or
  accent colour. Remapped to the real design tokens. Same fix applied to
  `publish/quests.css`. A full CSS audit now reports zero undefined custom
  properties anywhere in the tree.
- Added `window.FRPG_openItem(name, qty)` as a cross-page bridge, and wired
  quest requirement chips, Tower mastery rows and Tower cost-grid items to
  it — clicking anything you still need now opens it in the Craft planner
  instead of leaving you to search for it by hand.
- Added missing accessible names to the owned-quantity input and the
  per-item route selector.
- **Found the likely root cause of "the site feels like it's for you and not
  the player":** there are two divergent front-ends. `publish/` is a
  player-facing trim (no Field lab, no Strategy library, home shortcuts
  pointing at Tower T340 / main quests / mining) that a previous session
  built and never merged back. The root copy — the one actually opened — is
  still the developer-facing version. See NEXT_PHASE.md; needs a user
  decision before merging.
- Archived the original Codex transcript to `docs/history/` so no future
  session ever re-fetches the ChatGPT share link.
- Added an **Exploring drink** control (Auto / Apple Cider / Arnold Palmer).
  The engine had been auto-picking whichever was cheaper in gold, so an AP
  player could never see their own numbers, and the volatile AP price made
  the pick flip between runs. Persisted as `frpg_drink_path_v1`.
- **Acorn Pie is now a visible cost.** The pie count shows as a line item
  next to Explores/stamina and Cider/AP, and the note spells out uses →
  action charges → pies, including the ÷5 when Cabbage Stew or Lemon Cream
  Pie is active. Verified: Hide ×100k on a 100-uses→250-Hide sample gives
  40k uses = 40k charges = 267 pies; with Cabbage Stew, 8k charges = 54 pies.
- Turning Acorn Pie on with no saved samples used to change nothing and say
  nothing, because `acornPlan()` bails without a measured sample. It now
  explains that and links to the Field lab.
- Route labels no longer leak internal type names ("acorn" → "Acorn Pie
  overlay"; also explore/fish/crop/vendor/inventory).
- Added `build/bundle.py`, which inlines the whole site into one file so it
  can be rendered and driven headlessly. Both bugs above were found this way,
  not by reading source.

## 2026-09-03 — Player-chosen routes, Mining page, and a real visual identity

Everything below was driven by the user watching the live site and reacting.

### The calculator stopped deciding for the player
- Removed the "cheapest route" verdict. Every ingredient row now shows the
  paths side by side and the player picks: buy it (at **their own** typed rate
  per 1k, in AP / AC / OJ / gold), explore with Apple Cider (with the stamina
  it burns, Wanderer/Neigh applied), or use Arnold Palmer (with Quandary
  Chowder applied). Stamina is never priced as gold — an endgame farm makes
  roughly a million of it, so quoting it in Orange Juice was meaningless.
- **Arnold Palmer is not exploring.** Exploring spends stamina; AP is its own
  action with its own drop rate. AP counts now come from the shared workbook's
  drops-per-AP table instead of being derived from explore counts, which had
  been off by roughly 10×.
- Items that cannot be mailed say so instead of offering a trade route.
- Route rules gained `never`, so "nobody fishes Crystal River for Glass
  Bottle" is a data statement rather than a special case in the UI.

### Fishing is fishing, not crafting
- Fish get their own plan: by hand / Fishing Nets / Large Nets, with the net
  perks and Sea Pincher Special named in the note. No production tree, no buy
  price — fish cannot be bought.
- Mushroom Stew now reports two separate figures: items that land in your
  inventory, and mastery earned. It never changed the item count.

### Mining page
- Replaced the "New items" page. The six mines stack vertically; opening one
  shows its drops inline with art, each craft's full ingredient list with art
  and where each ingredient comes from, and what the craft itself feeds into.
  Inverting the release catalogue's own recipes lifted craft links from 9/59
  to 38/59 items.

### Art sizing
- `itemImg` had been emitting `width="48" height="48"` for every tile size, so
  small tiles rendered a 48px image inside a 30px box. Each variant now
  declares its own box (`ART_PX`). Same bug fixed in the Mining page.
- `.item-art.small` was the one variant painting a cream tile behind the
  sprite; Farm RPG art is drawn for dark grounds, so pale items washed out.

### Visual identity (`system.css`)
- Gold had been doing six jobs — labels, links, hover, focus, state and data —
  which is why nothing read as important. One job per colour now: figures take
  the accent, state is a 2px rule down the left edge, labels are muted, links
  underline on hover.
- **New palette, taken from the game's own materials** rather than the generic
  dark-mode gold: indigo rock ground, copper for figures, malachite for state,
  amethyst for trade, iron blue for fish, quartz-bone paper panels.
- **New typefaces, three distinct voices:** Bricolage Grotesque for anything
  you scan (headings, tabs, buttons), Newsreader for anything you read (prose,
  item names, notes), Spline Sans Mono for anything you count.
- Deliberate unevenness instead of a uniform grid: section eyebrows hang in a
  ruled left margin like a ledger annotation, the home hero is the one
  oversized headline on the site, the goal column of the summary strip is
  wider than the ones supporting it, and padding follows a card's role.

### Data
- `data/tradeable.js` — 201 mailable / 586 not, from the knowledge pack.
- `data/workbook-rates.js` — 337 rates in the workbook's own units, labelled
  as such because they are not the same denominator as `data/data.js`.
- Tower floors annotated `itemsAre: "rewards"`; the 2× silver discrepancy at
  T276 is recorded, not applied — one data point does not justify rewriting 40
  rows if the multiplier turns out to be band-dependent.

## 2026-09-03 (later) — Threw out the dark theme; built the almanac

The indigo/copper dark theme still read as an AI dark-mode template — the user
rejected both it and the fonts outright ("looks soooo vibe coded even the
fonts"). Rather than guess a fourth palette, I put three real directions on one
style board (graph-paper worksheet / phosphor terminal / printed almanac) and,
when asked to decide, committed to the **almanac**: the one that reads as
actually being about farming instead of another dark app.

- **Light, warm-paper theme.** The whole app was dark-first; the tokens in
  `style.css :root` now define a printed-almanac palette — warm paper ground,
  ink text, rust figures (`--gold` #a63a20), forest-green state. A stray second
  `:root` in `v3.css` was still redefining the palette dark and overriding the
  theme; removed it. All the dark panel and hairline tints across the five
  stylesheets were remapped to kraft, and the white-on-dark hover washes to
  ink-on-paper.
- **Item tiles stay dark on purpose.** Farm RPG sprites are drawn for dark
  grounds, so the tiles became dark "specimen wells" pressed into the paper —
  the sprites read, and it suits the almanac.
- **New type, one job each:** Bevan (woodtype) for the big headings only,
  Bitter (serif) for reading and for the chrome, Courier Prime (typewriter) for
  every figure and label. The woodtype is a feature, not the body face.
- **Corrections live in `system.css`** in one clearly-commented block so the
  five underlying stylesheets stay dark-authored and the theme stays in one
  place — masthead kraft band, dark stamp panels (goal ticket, data cards) with
  cream inputs so typed values stay readable, notice slip, focus ring.
- Verified on Home, Calculate (Giant Squid ×1m), Mining (Highland Hollow
  opened), Setup and mobile: no console errors, no horizontal overflow, tests
  40/40.

## 2026-09-03 (later still) — Matched buddy.farm's plainness

The almanac and every earlier theme still read as "designed at" the page. The
user pointed at buddy.farm as the one that looks like everything is "in its
place" and asked what the difference was. Studied it directly: buddy uses the
plain **system font**, pure white, and — the key thing — shows item pictures
**directly on the surface with no tile box behind them**, small and inline with
their labels, rows separated by hairlines, one accent colour.

Rebuilt the theme to that discipline:
- **System font everywhere** (`--ui`, the native system-ui stack). Dropped the
  Google Fonts import entirely — no web fonts load now.
- **Item pictures have no tile.** `.item-art`/`.mine-art` are transparent, the
  sprite sits on the card the way buddy shows them. Only the single large goal
  picture keeps a soft plate to anchor the header.
- **Near-white ground, white cards, one green accent** (#2f7d55) for the primary
  figure, the active state and the primary button; every other figure is dark
  ink. Route/category colours desaturated to quiet tags.
- Calmer type scale (h1 ~40px, weight 700, not an oversized woodtype hero) and
  quieter eyebrows.
- Removed the leftover kraft tints and a stray dark `:root` in v3.css that had
  been fighting the theme.

Verified on Home, Calculate and Mining: system font active, item art
transparent and loading (naturalWidth 256), no console errors, tests 40/40.

## 2026-09-03 (eye-comfort pass) — Understood buddy, applied it

The point was never buddy's exact colours or font — it was that buddy is a
reference document (content in aligned rows, almost no boxes, generous white)
while this had been dressed as a marketed app (a grey field of bordered,
shadowed boxes, shouty UPPERCASE eyebrows over every block, tiny low-contrast
text on a very wide measure). That is what made it "hard for the eye."

Applied the principle rather than copying the site:
- **Pure white ground**, not grey with cards floating on it.
- **Borders mean "interactive."** Reading blocks lost their border and shadow
  entirely; only inputs, grouped toggles and small chips keep one light hairline.
  A single hairline under each section heading gives the page its spine.
- **Bigger, higher-contrast text** (16px base, darker `--muted`) in a
  **narrower, comfortable column** (max 1120px, was 1480).
- **Eyebrows calmed** to normal-case, small, muted — labels, not stamps.
- Removed the last decorative leftovers: the copper offset drop-shadows and page
  tilts, the dark masthead, the cream inputs.
- Home shortcuts are now a clean hairline grid (muted code, dark title, green
  link, green rule on the featured one).

No horizontal overflow, tests 40/40.

## 2026-09-03 (dark + mining) — Dark theme, and mining recipes go sideways

- **Dark theme, keeping the calm rules.** Flipped the tokens to a near-black
  ground (#151619) with light text, soft hairlines and the same single green
  accent — not a return to the old busy dark. The hard-coded whites (masthead,
  inputs, cards) became variables (`--field`, `--ink2`) so the whole app actually
  goes dark. Item pictures are still transparent, which now reads even better —
  Farm RPG sprites are drawn for dark grounds.
- **Mining recipes flow sideways.** Each ingredient was a full-width row with a
  source sub-line, so a craft like Stained Glass Art (17 parts) became an endless
  column, made worse by every drop also showing what its craft "goes into" with
  its full recipe. Ingredients are now compact chips (icon · qty×name · source)
  that wrap horizontally, and each drop is a full-width band so the chips have
  room to flow. The drop itself is marked with a green chip.

Tests 40/40, no console errors.

## 2026-09-03 (tower colours) — Tower page brought onto the theme

The Tower page had never been migrated: purple/indigo panels, a copper "next
floor" stamp with a tilt and drop-shadow, orange progress bars — and, worse, its
big numbers used `var(--paper)`, which is dark in the dark theme, so several
figures were dark-on-dark and invisible. Rebuilt tower.css on the shared tokens:
neutral dark cards, green for the next floor / active state / progress fill,
`var(--text)` for figures, muted for the "X left" amounts and labels. Dropped the
tilt and offset shadows and calmed the oversized "Your Road to T340" heading to
the site's scale. Quests was already on-theme.

## 2026-09-03 (tower requirements) — Real floor requirements from the wiki

The Tower cost section used to show each floor's reward items and a silver price
(buddy figures we already suspected were 2x off), which the user had said were
rewards, not requirements. Replaced it with the actual requirements from the
official Tower MM wiki (farmrpg.com/#!/wiki.php?page=Tower+MM): for T300–T340,
the Grand Masteries and Mega Masteries you must already hold, each with its
picture pulled straight from the wiki so it shows regardless of local data.
Silver is gone. The wiki's table ends at T340, so there is no T341–T350 to show.
`data/tower-floors.js` is now `[floor, gms[], mms[]]`; the render groups the two
and drops the silver/AK/reward lines; headings updated ("Every Floor, and What
It Needs").

## 2026-09-03 (cohesion pass) — One accent across every screen

Audited Home, Calculate, Setup, Tower, Quests and Mining together and pulled the
last of the rainbow onto the single-accent system. The three route cards no
longer each carry a different-coloured spine — green marks the recommended card,
the others a neutral hairline. Route-type tags collapse from violet/amber/blue/
gold to muted, with green for "you've got it" and red kept only for an unknown
route. Trail figures are plain ink with one green lead; the trail connector is
muted. The "your farm covers this" strip flattened from a green gradient box to a
quiet green-marked note. Compact headings inside cards no longer draw a section
rule. Green now means exactly one thing everywhere: recommended, or handled.

## 2026-09-04 — Mastery import, and floors 300–340 folded into the rail

- **Imported the 2026-09-04 mastery export.** `data/personal-tower.js` regenerated
  from the newest column of the player's Mastery History CSV (514 items, up from
  439). Names keep the same base-name rule: a trailing three-digit floor tag is
  stripped ("Looking Glass 278" → "Looking Glass") while two-digit name numbers
  ("Bone 02", "Runestone 04") are left alone. Values are clamped at 1m, the cap.
  Next blocker moved T278 → T282 because Looking Glass finished.
- **T300–T340 now live in the main rail**, in floor order after 299, instead of a
  separate section underneath. The separate grid and its listeners are gone.
- **Fixed a real overstatement:** the rail scored every requirement against 1m,
  but the wiki shows many floors only need a **Grand Mastery** (100,000). Rows now
  carry their tier and are measured against the right goal — Cotton at 237k is
  done for T301 rather than "762k left". Legend and summary updated; Pumpkin Juice
  hint only applies to Mega Masteries now.
- Requirement rows use the planner's own art where it has the item and the wiki
  picture otherwise, so every row shows a picture.

## 2026-09-04 (home panels) — Give the two home cards room

The cohesion pass had zeroed the side padding on `.readiness-card` and
`.rule-card` along with the other "reading blocks", but those two keep a visible
background, so text sat on the card edge and the surface stopped on the final
word. Restored padding (24/26/34, deeper at the bottom) so the background carries
past the last line, and set `.desk-lower` to `align-items: start` so each panel is
its own height rather than being stretched to match its neighbour.

## 2026-09-04 (quests) — Every questline in the game

Replaced the 202-quest main-story file with the full set from the community Quest
Tracker (farm-rpg-quest-tracker.pages.dev, its `questlines.json`, data of
2026-09-02): **2,479 quests across 569 questlines**. Verified the 202 story quests
survived unchanged — same titles, same requirements, same order — before swapping.

Sequels stay together, which was the point: each quest keeps its `line` and
`sequence`, and the list is pre-sorted so a line reads first step to last
("99 Bottles" runs I→XCIX in order). The tracker's `pred` graph also gives better
prerequisites than we had ("levels farming 15, crafting 2; after 99 Bottles #1").

Each line is tagged by `category` so the page stays usable at this size:
- **main** — the 19 permanent story lines, listed first, green tag
- **side** — 251 permanent NPC lines, alphabetical
- **event** — 299 seasonal lines, newest first, showing when they ran

Seasonal quests that have already closed are excluded from Not Done / Available —
a finished event is not work you can pick up — but remain browsable under the new
**Events** filter and under All. Right now that leaves 1,169 actionable quests out
of 2,479, and "A Safer Big Boom" shows as running.

Note: `data/main-quests.js` is now 1.2 MB (was 96 KB). It still loads as a plain
script with no fetch, so opening from disk is unaffected.

## 2026-09-04 (completed quests) — The player's own list, applied

The player pasted their Completed Help Requests list (1,952 entries). Matched it
against the 2,479-quest database: **1,934 matched exactly, and the remaining 18
matched once spacing was ignored** — Farm RPG prints a few titles with a space
missing ("MisconstruedRelational", "Round,Buddy,", "Make Life TakeThe Lemons
Back!"), and the joke "ribbet…" quests differ only in whitespace. Final result:
**1,952 of 1,952, nothing unmatched.**

Stored in `data/personal-quests.js` using the canonical spellings from
`data/main-quests.js`, so matching is exact at runtime. The Quests page treats it
as an authoritative source that needs no extension: completed steps show as Done,
everything else as still to do. That leaves **92 quests actually outstanding**.
An account capture still adds "Available Now", which a completed list cannot know.

Also in this pass, on the extension:
- The snapshot now writes to **one file that gets overwritten**
  (`chrome.downloads` + `conflictAction: "overwrite"`), instead of the old blob
  link that made Brave keep every copy as "(1)", "(2)", … A popup toggle keeps
  that file updated after each capture. Needed the `downloads` permission; the
  scope-guard tests were updated deliberately rather than loosened.
- A capture is only labelled **provisional** when it really fell back to generic
  text parsing. It used to say that about every page, including ones a dedicated
  parser handled, which made good captures look untrustworthy.

## 2026-09-04 — The pirate saga is one questline again

Farm RPG renames the "Problems Start Arising" chain as it goes: Pirates Start
Arriving, Problems Still Abound, three different Masonry titles, You Must Build
A Stealth Boat, Pirate Stealth Arrival. The quest database treated each name as
its own questline, so a 29-step run showed up as eleven unrelated stubs.

- `data/quest-sagas.js` (new) declares the saga: the member lines and the full
  step order, read out of the in-game prerequisites rather than guessed.
- `quests-page.js` stitches saga members into one line before rendering, and
  shows the alternate names under the title.
- Step XXIX is in the player-shared requirement sheet but not yet in the quest
  database, so it is listed last, marked, with its item bill only.
- Cross-checked all 32 known steps against that sheet: 30 identical. Two differ
  (Pirates Start Arriving IX Yarn, X Cyclops Spider vs Spider); the in-game
  data was kept.

## 2026-09-04 — Setup guide moved into the site

The Account tab's "Install extension" link opened a raw README.md in the
browser. Replaced with a real guide on the page: three numbered setup steps,
the five site addresses with what each one is for, the file-URL switch called
out as the easy-to-miss one, and three columns on daily use, the file route,
and what the extension will not do.

- `sync-guide.js` builds the downloadable copy from the guide that is on
  screen, so the saved file cannot drift from the page. Styles are inlined and
  the page's own buttons are stripped.
- A test asserts the site list matches the extension manifest exactly, so the
  guide cannot claim permissions that were added or dropped.

## 2026-09-04 — Two agents, one repo

Codex and Claude Code both work on this project and both run out of usage
quickly, mostly by re-deriving what the other already knew.

- `AGENTS.md` (read automatically by Codex) sets the working agreement: read
  order, who does what, branch rules, and which files are the shared spine that
  only one agent edits per task.
- `handoff/STATE.md` and `handoff/TASKS.md` carry current state and the queue,
  deliberately short.
- `tools/handoff.mjs check` is the objective gate both agents run before
  handing over: missing `?v=` bumps, listeners bound to elements that no longer
  exist, `fetch`/ES modules that cannot work from `file://`, and text painted
  in a surface colour.

Writing that check immediately found a live bug: the quantity preset buttons on
Calculate rendered near-white on white (contrast 1.05:1, invisible). A leftover
`background: #fff` from the light theme. Now 6.31:1. Two latent dark-on-dark
buttons fixed at the same time.

## 2026-09-04 — Every picture resolves again

Centralising the art lookup had quietly broken two pages. Several data files
ship their own artwork, and the new shared helper only read `data/items.js`, so
a working URL sitting in the same file was ignored and the tile fell back to a
bare letter.

- Tower T300–T340: 45 requirements lost the wiki art from `data/tower-floors.js`
  (Gold Lemon Quartz Ring, Yellow Bag, Strong Paste, Yellow Butterfly, …).
- Mining: 132 tiles lost the release catalogue art from `data/new-items.js` —
  every craft the mines feed, and their parts.

`item-art.js` now builds its map from all four sources in order of how
canonical they are, and `itemImg` takes an optional image from the caller so a
data file's own artwork can never be dropped silently again.

Verified on screen, not from source: Tower, Mining, Quests, Inventory and
Calculate all report zero placeholders and zero broken images. Mining went from
389 images with 132 placeholders to 521 with none.

## 2026-09-04 — The Inventory tab opens on something

It opened on a dropdown reading "Choose a questline…" and nothing else, so the
page looked broken until you found the Track button on another tab.

- It now works out which questline you are in the middle of — the one you have
  started and have the most left to do on — and shows that straight away. For
  this player that is the pirate saga: next quest Problems Start Arising III,
  whole line 31 steps and 189 distinct items.
- A sentence at the top says what is being shown and how to change it. The
  picker is a change control now, not the way in.
- With no inventory imported, the panels say so above the table instead of
  letting a column of zeroes imply you own nothing in the game.

## 2026-09-04 — The gather lists show everything

Both panels were 62vh inner scroll boxes, so a 189-item questline showed about
nine rows, and item names were clipped to "Amethyst …".

- The lists run their full length; the page scrolls instead of each panel.
- Names wrap rather than truncate; row art is 28px and sits on the name.
- The whole questline has an **Expand** control that opens the complete list
  across the full screen, three columns wide, each row labelling its own
  Need / Have / Short so nothing depends on a column header lining up.

## 2026-09-04 — Extension popup back to one job

- The section list is a plain two-column list again. The per-section **Open**
  buttons are gone: they inherited the global `button { width: 100% }` rule and
  rendered on top of the labels.
- Each captured section shows how much it holds and how long ago it was read,
  so an inaccurate capture is visible rather than guessed at.
- The list refreshes itself the moment a capture lands, instead of only when
  the popup is reopened.
- **Saving a file is opt-in now.** Captures are kept in the extension and
  pushed to Lantern Ledger; nothing is downloaded unless asked for. The file
  controls and the Lantern Ledger link moved into a collapsed section so
  Capture is the only button in the main flow.
- The in-site setup guide was updated to match.

## 2026-09-04 — A captured inventory shows straight away

The Inventory tab read `frpg_owned` and treated it as authoritative whenever it
existed. It exists as an empty object from the app's first save, so a snapshot
that had just arrived from the extension showed as "nothing in your inventory"
until Apply was pressed on the Account tab. It now falls through to the
snapshot when there are no hand-entered amounts.

Verified by posting a snapshot the way the extension does: Spoon 8,000 needed
against 4,200 held reads 3,800 short, with nothing applied by hand.

## 2026-09-04 — A tracker on every tab, and captures that stop overwriting

- `gather-model.js` now owns "what is still needed", read by both the Inventory
  tab and a new floating tracker, so the two cannot drift apart.
- `tracker.js` pins the tracked questline to the corner of every tab: this
  quest on the left, the whole line on the right, collapsible, dismissible, and
  a size toggle for reading both lists properly. No width transition — the
  browser will not interpolate a px width to a `min()` value and the panel got
  stuck at whichever size it started at.
- The Inventory tab's questline picker is gone; **Track** on the Quests tab is
  the one way to choose, and both panels already say what is being shown.
- **The extension no longer captures on its own.** A 90-second timer and a
  route-change capture were reading whatever screen was open, and an inventory
  page showing only gold and silver was replacing a full inventory capture. A
  capture with under a quarter of the rows it would replace is refused too.
- Captures harvest item artwork from the page they read, so a single Inventory
  capture teaches the planner pictures for everything the player owns.

## 2026-09-04 — Tracker: this step small, the whole line across the page

- Small is the step you are on, nothing else. Pressing ⤢ spreads the whole
  line across the entire page in as many columns as fit, so 189 items are read
  across rather than scrolled down — verified at 1900×1000: 5 columns, no
  scrollbar.
- The 13 items the current step needs are marked in the big view, so they stay
  findable in a list of two hundred.
- Big mode clears the sticky masthead (z-index 90). At 70 the site nav printed
  over the tracker's own header, which put its close button out of reach.

## 2026-09-04 — A capture that finds nothing says so

A quests page that parsed no requests still reported success, which is why
"it captured but nothing happened" had nothing to go on. The capture now
records what the page actually looked like — the first lines it read — and the
extension hands those warnings back to the popup.

## 2026-09-05 — Descriptions were being stored as items, and panels hugged their own background

Two things the player reported, both real.

- **Inventory captures contained Farm RPG's item descriptions as if they were
  items** — "A blinger for your finger", "A bottom-feeder you'll want to keep
  for later" — each with a quantity. They had no picture, could not match
  anything, and corrupted every gather list built on top. Every real item on
  that page is drawn with its picture, so the capture now uses the artwork it
  already harvests to tell the two apart, and names whatever it skipped.
- **Panels showed their tint flush against the text.** `.route-card`,
  `.gather-col`, `.source-list` and the rest had their side padding zeroed back
  when the theme was light and the panel colour matched the page. On the dark
  theme that tint is visible, so every heading sat on the edge of its own
  background. They have 20px/22px again.

## 2026-09-05 — Description rows filtered on the site too

Fixing the description-as-item bug in the collector only helped future
captures; every snapshot already saved in a browser still carried them, so
nothing changed on screen. The site now filters them at the point of use as
well, and says how many it ignored instead of the count quietly shrinking.

A row counts as prose only when nothing can identify it — no artwork from any
source and no item of that name — so an item the data files have never seen
but the capture found a picture for is still kept.

Verified with a seeded snapshot: 9 real items kept with art, 10 description
rows ignored, and the summary says so.

## 2026-09-05 — The whole item list, so this stops recurring

Missing pictures had been fixed four times, each time for one more group.
`data/item-library.js` now holds **every** item Farm RPG has — 1,449 names with
artwork, from buddy.farm's own search index, which is where that site draws the
same pictures. `item-art.js` merges it beneath the more specific sources.

That also settles the description problem properly. With a complete list, "does
the game have an item by this name?" has a real answer, so prose no longer
needs guessing at. "Almost transparent" and "and it gets everywhere" — which
slipped past the earlier heuristic — are now correctly ignored, while
"Amber Mire Bloom" and "Apple Ant Buddy Doll" are kept and drawn.

Checked on the player's own list: 18 items, every one with a picture, 4
description rows ignored. Tower, Mining, Quests and Inventory all report zero
placeholders. Eight sampled library URLs return HTTP 200.

## 2026-09-05 — Track toggles off, and the item list settles the prose question

- **Pressing Track on the questline already being tracked did nothing**, because
  the handler only ever set the value. It toggles now, and the button reads
  "Tracking ✕" while it is on.
- **Untracking then auto-picked the same questline straight back**, which is
  what made it feel like nothing happened. An empty stored value is now a
  deliberate "none" and is respected; auto-picking is only for a player who has
  never chosen. The tracker hides and the Inventory tab says what to press.
- **"Adds 100 Stamina" was still showing as an item.** Every shape-based rule
  let it through — it is Title Case with no lowercase word in it. The filter no
  longer guesses: if the complete item library has no item by that name, and no
  artwork was found for it anywhere including the player's own captures, it is
  description text. An item added to the game since the library was built still
  passes, because a capture brings its picture with it.

Verified end to end: a fresh browser auto-picks; Track pins another line and
the tracker follows; pressing it again clears it and the tracker hides;
tracking again restores the list. And on a seeded inventory, "Adds 100
Stamina", "Almost transparent", "and it gets everywhere" and "A chill fish"
are ignored while "Orange Juice", "Amber Mire Bloom", "Apple Slice" and an
invented brand-new item are all kept and drawn.

## 2026-09-05 — Say which build is running, and what the page computed

"It won't track no matter what I do" could not be diagnosed from here, so the
app now reports enough to place the fault.

- The footer carries a **build stamp**. A browser holding one old file looks
  exactly like a bug that was never fixed, and there was no way to tell them
  apart.
- The Inventory tab prints what it worked out — steps left, items needed, and
  how many items your inventory has — so an empty panel has a reason attached.
- `inventory-page.js` no longer assumes `gather-model.js` is the matching
  version. A single missing helper threw and blanked the whole tab, which is
  indistinguishable from tracking being broken.

## 2026-09-05 — Dismissing the tracker was a one-way door

Pressing ✕ on the tracker set a flag with no way to clear it. After that,
tracking a questline showed nothing anywhere the player was looking, so Track
appeared to do nothing at all.

- Tracking a questline always brings the tracker back.
- The Inventory tab offers **Show the corner tracker** whenever it is hidden.
- The ✕ now says what it does: hide until you track something again.

Worth noting alongside it: "A Fool And Their Money" really does have exactly
one requirement, 5 trillion Silver, so that questline showing a single currency
row is correct rather than a failure.

## 2026-09-05 — The tracker is two docked panels

The player asked for this in their first message about the feature and several
times after: **this quest bottom-left, the whole questline bottom-right.** Both
lists had been sharing one panel in the right-hand corner the whole time.

They are now separate panels docked to opposite corners, each collapsible on
its own; only the whole-line panel opens across the page. Below 560px they
stack, with the current step on top.

## 2026-09-05 — Back button, clickable tracker rows, and a measurement

- **The browser Back button left the site.** Every tab change used
  `replaceState`, so no history was ever recorded. Tab changes push now, and
  Back/Forward move between tabs. Going back must not push again or Back could
  never escape, so history-driven changes replace instead.
- **Tracker rows open the item in the calculator**, like every other list in
  the app. Currency has nothing to open and stays inert. Enter and Space work
  too, and Escape closes the expanded whole-line view.
- **Measured before optimising:** `data/main-quests.js` is 1.2 MB, but the page
  reaches DOMContentLoaded in 102 ms with everything parsed. Splitting event
  quests out was on the list as a performance fix; it is not one. Recorded in
  `handoff/STATE.md` so nobody spends a risky refactor on it.

## 2026-09-05 — Copy the gather list

The whole-line panel has a **Copy list** button. It writes tab-separated rows —
item, needed, you have, still short — which paste straight into a spreadsheet;
the player already keeps one for this questline. `navigator.clipboard` needs a
secure context and this app opens from disk, so the copy goes through a
textarea with the clipboard API as the fallback rather than the other way
round. 190 lines for the pirate saga, verified.

Also checked, and rejected: grouping the list by item type. 924 of the 1,138
items are typed simply "item", so the grouping would have been mostly one
bucket labelled Other — worse than no grouping.

## 2026-09-05 — Where each item comes from, and a list you can take in

- **The gather lists now say how to get each item** — Craft, Cook, Grow,
  Fish <place>, Explore <place>, Buy, Trade — from the engine index `app.js`
  already builds. 155 of the pirate saga's 189 items resolve a source. Shown
  under the name on the Inventory tab, and on hover in the tracker.
  A trap worth recording: for a meal, `growMin` is the **cooking** time, not a
  growth time, so Cabbage Stew would have read "Grow". Meals are tested first.
- **The expanded list is denser**: 18px rows, 16px art, 11px text. All 189
  items still fit without scrolling and read as a list rather than a wall.
- **A filter in the expanded view.** Typing "ring" narrows 189 items to the 6
  rings, and the heading says how many matched.

## 2026-09-05 — The tracker steps aside on the Inventory tab

Both panels floated over the one page that already shows the same two lists in
full, covering it. They hide there now, unless the expanded view is open on
purpose. Every other tab keeps them.

## 2026-09-05 — Two capture bugs with real causes

- **Re-capturing masteries did nothing, by construction.**
  `data/personal-tower.js` carries `authoritativeMasteries: true`, and
  `towerMasteryMap()` read that as "skip captured masteries entirely" — the
  loop ran over an empty array. The imported file is still the base, because it
  is complete, but a capture taken *after* it now updates the items it covers.
  An older capture is still ignored, so a stale one cannot walk numbers back.
- **The farm page was being saved as your inventory.** `looksLikeInventoryPage`
  accepted any page whose text contained both "meals" and "items", which the
  farm page does. A capture there held nothing but the top-bar Silver and Gold
  and replaced hundreds of real rows. It now requires a sentence only the
  inventory page says, and a backstop refuses to store anything as the
  inventory with fewer than ten items, saying so rather than failing quietly.

Extension is v1.8.0. Nothing auto-captures — that went in 1.6.0.

## 2026-09-05 — Counts twice

The most useful thing this app can tell an endgame player is not what an item
costs — it is which of the items they already have to gather **also** finish a
Tower mastery. Both numbers were on the site already; the overlap was not.

The Inventory tab now shows, for the tracked questline, every required item
that is also an unfinished Tower requirement, with what the quest needs beside
what the mastery still needs and how far along it is. For the pirate saga that
is **39 of 183 items, 18 of which only need Grand Mastery (100k) rather than
Mega (1m)** — the cheap wins, which is exactly what is hard to spot by hand.

Sorted by the lowest unfinished floor, so the top of the list is what helps
reach the next floor. Finished masteries are excluded; currency cannot be
mastered and is excluded too. Hidden entirely when there is no overlap.

## 2026-09-05 — Where you stand, and green meaning one thing

- **The home page now opens with your actual position**: the floor you are
  climbing and how many masteries it still wants, the quest step you are on and
  how many of its items you are short, and how many of that questline's items
  also finish a Tower mastery. Three facts that otherwise needed three tabs.
  Each is a link to the tab it came from. Hidden when there is nothing to say.
- **Finished Tower requirements go quiet.** Green was marking both "done" and
  "in progress", so it separated nothing. Completed rows now use a grey bar and
  greyscale art; green is left to mean "still in front of you".
- **A quests page that only half drew says so.** The completed-requests page
  states its own total; reading 2 of 1,950 was being reported as success. It
  now says the list had not finished drawing and to scroll to the bottom first.
  The popup shows capture warnings and row counts instead of a fixed message.

## 2026-09-05 — One panel on a phone

Two docked panels stacked took 552px of an 812px phone screen, leaving almost
no page. Below 620px a single panel shows, anchored to the bottom at 42% of the
screen, with a switch in its header between the current step and the whole
questline. The expanded full-page view still works as before.

## 2026-09-05 — The dusk design, merged; and the last of the missing pictures

Merged the redesign produced from the brief: a blue-slate ground (#27364B)
instead of near-black, three colours with separate jobs (Lantern for actions,
Water for selection, Sage for progress), and three real typefaces bundled as
local WOFF2 — Bree Serif for titles, Atkinson Hyperlegible for prose, IBM Plex
Mono for numbers. Its `DESIGN_PLAN.md` is kept alongside. The repeated uppercase
kickers are gone.

Merged rather than copied: the redesign forked before the last few fixes, so
its CSS, `index.html` and assets came across while `app.js` kept this branch's
work and took only its five markup edits.

Two picture bugs found by sweeping every tab with a snapshot full of junk rows:

- **The Account tab rendered description text as items.** `gather-model.js`
  filtered the gather lists, but the Account tab's masteries, consumables and
  active effects had no such guard, so "A blinger for your finger" and "Adds
  100 Stamina" appeared there. `isRealItem()` now guards all of them, and the
  same check stops a description reaching the working inventory.
- **`itemImg` resolved artwork from the name, but several calls passed a
  possibly-null item and no name**, so the lookup had nothing to search for.
  Fixed at seven call sites — co-drops, hauls, masteries, rewards, consumables,
  active effects and the meal list.

And a bug introduced while fixing that: `fallbackName` was **overriding** the
item's own name rather than filling in for a missing item, so the Setup cards
looked up "Iron Depot" instead of "Iron" and drew a letter. The item's own name
wins now.

Swept all eight tabs with junk-laden data: zero placeholders, zero description
rows, zero broken images.

## 2026-09-05 — The Inventory tab is only your inventory

The tab carried three things the floating tracker already showed: "Counts
twice", "Next quest" and "Whole questline". Reading the same two lists twice on
one page is worse than reading them once, so the tab is now what you hold, a
search box, and a line saying what is being tracked. The tracker consequently
shows on that tab again, and the double-duty count still appears on Home.

The expanded whole-line view is **1020px — about half a 1900px screen** —
rather than the full width. Stretched edge to edge, every row had roughly 67px
of nothing between the item and its number; the median gap is now 6px, with all
189 rows still visible in six columns without scrolling.

Two CSS traps found doing it, both recorded because neither is obvious:
`width: max-content` cannot resolve against a grid whose column count depends
on its own height — it resolved to the full screen. And `auto-fill` row tracks
need a **definite** height, not a maximum, or the grid collapses to one row per
column.

## 2026-09-05 — The expanded list opens where it lives

Centred, it jumped to the middle of the screen the moment you opened it, away
from the corner and the button you pressed, and covered the left of the page
for no reason. It now stays anchored to the right-hand dock it grows out of —
29px from the right edge, vertically centred — so the page stays readable
beside it.

## 2026-09-05 — One mine in a screen, and a gather list that lines up

**Mining.** Each drop nested the crafts it feeds, and those nested theirs, so
the same recipe was printed several times and one mine — Spring Cave — ran to
**3.44 screens**. Drops are now a compact grid at the top, and every craft they
reach is a single de-duplicated grid underneath, each card showing its inputs
as chips with the one this mine drops marked. Same nine drops, same seventeen
crafts, **1.15 screens**.

**The expanded gather list.** Columns were equal-width, so a short name left
its number stranded at the far edge while a long one sat right beside it — the
same list looked differently aligned row to row. Columns now hug their contents
and pack from the left: one straight line of pictures down each column, one
line of numbers down its right, and a median gap of 8px. Item art is 22px
rather than 16, and the text 12px, so a shorter questline gets bigger, more
readable rows in the space it frees.

The column count is measured rather than guessed. Content-sized columns come
out wider than any estimate — a first attempt at 196px each still ran off the
side — so `fitColumns()` sets a row count, measures, and steps down a column at
a time until it genuinely fits.

## 2026-09-05 — The expanded list sizes itself to what is in it

A 53-item questline was being shown in a box built for 189, with half of it
empty. The panel now picks a column count that balances toward a square, sets
the rows, measures, and shrinks onto its contents — staying anchored to its
right-hand dock throughout.

| Questline | Items | Box | Columns |
|---|---|---|---|
| Problems Start Arising | 189 | 908 × 741 | 4 |
| Daily Dairy | 53 | 621 × 624 | 3 |
| Banana Stand | 4 | 280 × 260 | 1 |

Three measurement traps, all of which produced a wrong box before being found:
`scrollWidth` reports the padding box when nothing overflows, so it measured
the panel being shrunk rather than the content — the width has to come from
where the last column actually ends. Content-sized columns come out wider than
any estimate, so the column count is stepped down until a measurement agrees.
And shrinking the box can bring on a vertical scrollbar that then takes width
from the list and pushes the last column past the edge, so that width is given
back once the final height is known.

## 2026-09-05 — Craft was missing from the ingredient routes

An ingredient with a recipe — Twine, Rope, any of the dyes — could be listed as
something to go and get, with no way to say "I will make it". The route
dropdown offered Auto, farm, trade, store and covered, and never Craft.

It offers Craft now whenever the item has a recipe, and choosing it expands the
item into its own inputs: picking Craft on Fishing Net replaces it with Iron,
Rope and Antler, and Rope then offers Craft in turn. Crafting is a make
decision rather than a route, so it writes to `makeChoices` and clears any
`sourceChoices` entry — the two contradict each other if both are set.

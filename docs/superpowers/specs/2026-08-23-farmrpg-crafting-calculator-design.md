# Farm RPG Crafting Calculator — Design

Date: 2026-08-23
Status: Approved by Ali (pending final spec review)

## Problem

Farm RPG players planning huge craft goals (e.g. 1,000,000 × Red Trunk) have no tool that
answers three questions accurately:

1. **How much do I need?** — full recursive ingredient requirements, including sub-crafts.
2. **Where do I get it?** — every acquisition path: grow, catch, explore drop, buy, or sub-craft.
3. **What does it cost?** — in silver AND in the resources that actually bottleneck endgame
   players: stamina (apple cider), fishing nets / large nets, lemonade / Arnold Palmers.

Every existing calculator/AI misses the artifact + perk bonus layer (Tower artifacts,
perk-point perks, Farm Supply gold perks). This project puts that layer at the center.

## Non-goals (v1)

- No live scraping of farmrpg.com; data ships as bundled snapshots.
- No XP/hour optimizer, market price tracking, or account integration.
- No per-player perk configuration UI — v1 assumes one canonical maxed profile (below).

## Assumed player profile (default, fixed in v1)

Endgame player: Tower 200+, all artifacts unlocked and perks purchased. Active effects include
(but are not limited to):

| Effect | Source |
|---|---|
| Crafting silver cost −60% | Artisan I–IV + Toolbox I |
| Craft yield +25% from same materials | Resource Saver I (+10%) + II (+15%) |
| Ingredient duplication +20% | Headdress of Luna (Resource Saver 3) |
| Cooking materials ×0.9 (floor 1) | Ashes of Pentagorn |
| Crop growth time −80% | Quicker Farming I–IV + Irrigation System I–II |
| Crop growth −10% of base | Diary of O'Dynn (Enriched Soil) |
| Sale silver +10% base | Bahltruvian Scales (Gift of Persuasion) |
| Sale silver bonuses | Negotiator I–IV + Fertilizer I (exact % tunable) |
| Large net yield +100 | Trigon Knot |
| Net efficiency +50%+ | Reinforced Netting |
| Lemonade ×2 / Arnold Palmer ×2.5 efficiency | Lemon Squeezer |
| Explore stamina cost reduction | Wanderer I–IV |
| Apple cider efficiency boost | Cinnamon Sticks / Sprint Shoes I–II |

Exact percentages that the wiki does not state numerically live in `data/constants.json`
with a `verify` flag so they can be corrected without touching code.

## Data sources

- `coderanger/farmrpg-etl2` (pushed 2026-07): `items.json` — 1,138 items with prices,
  levels, XP; `recipes.json` — 1,394 craft recipes. **Primary dataset.**
- `coderanger/farmrpg-ext` `data/`: `cooking_recipes.json`, `drop_rates.json`,
  `locations.json`, `xp.json`. **Secondary** (2023 vintage) for sourcing/drop info.
- `coderanger/farmrpg-wiki-archive`: Artifacts.bbcode, Perk Point Suggestions,
  Gold Perk Suggestions → curated into `data/effects.json`.
- Conflicting item facts resolve toward etl2 (newer). Every file carries a `_meta`
  version stamp shown in the app footer.

## Architecture

Static local web app. No build step, no server.

```
farmrpg-calc\
├── index.html            # single page, mobile-friendly dark theme
├── app.js                # UI rendering, search, localStorage state
├── engine.js             # pure calculation functions (no DOM)
├── style.css
├── data\
│   ├── items.json        # merged items (etl2 primary)
│   ├── recipes.json      # craft recipes (etl2) + cooking recipes (ext)
│   ├── sources.json      # locations + drop rates + crop/fish source mapping
│   ├── effects.json      # typed bonus table (above), editable
│   └── constants.json    # tunable numbers w/ verify flags
├── update-data.ps1       # re-downloads snapshots from GitHub repos
└── tests\engine.test.mjs # node --test
```

### Data model

- **items**: `{id, name, sell_price, buy_price/can_buy, craft_price, crafting_level,
  can_cook, cooking_level, yield_minutes (crops), xp_value}`
- **recipes**: `{item_id, req_id, req_amt}[]`; cooking recipes normalized to same shape.
- **effects**: `{id, name, type, value, applies_to}` where type ∈
  `craft_cost_mult | craft_yield_add | ingredient_dup | cook_save_mult | crop_speed_mult |
  sale_mult | net_yield_add | net_eff_mult | drink_eff_mult | stamina_cost_mult`.
  Stacking: additive within a type unless the wiki says otherwise.
- **constants**: e.g. `large_net_base_catch`, `fishing_net_base_catch`, `apple_cider_stamina`,
  `explore_stamina_cost`, each with `"verified": true|false`.

### Engine (pure functions)

1. `resolveTree(itemId, qty)` → recursive requirement tree. Memoized per run. Cycle-safe
   (a recipe loop is reported, not crashed on). Applies `craft_yield_add` +
   `ingredient_dup` when computing consumed inputs: `inputs = ceil(qty / yield_mult)` at
   each crafted node.
2. `annotateSources(tree)` → for each leaf: crops (plots = need / plot_yield, grow time =
   base × crop_speed_mult), fish (nets = need / net_catch_after_perks), explore drops
   (explores = need / (drop_rate × drop_qty), stamina = explores × cost_mult), vendors
   (cheapest buy price), or "sub-craft" if a recipe exists.
3. `translateCosts(totals)` → silver total (craft cost after −60%, buy totals, plus
   theoretical sell value after sale bonuses) and bottleneck equivalents:
   stamina→apple ciders (with Cinnamon Sticks/Sprint Shoes multipliers),
   fish→nets/large nets, exploring drinks→lemonade/Arnold Palmer counts.
4. Owned inventory (`owned` map) subtracts from needs everywhere; results persist to
   localStorage.

### UI

- Search box with fuzzy autocomplete over all 1,138 items.
- Quantity input with ×1k / ×10k / ×100k / ×1M shortcuts.
- Result header: item, qty, level gates flagged red vs assumed level 99+.
- Tree view: expandable nodes; leaf rows show need/owned/missing and colored source
  badges (CROP / FISH / EXPLORE / BUY / CRAFT).
- Cost panel: silver first-class; secondary rows for ciders, nets, palmers.
- Footer: dataset version stamps + link list.

### Error handling

- Unknown item id / missing recipe → explicit inline notice, never silent zeros.
- Missing drop-rate entry → chip shows "source unknown".
- Malformed JSON at load → visible load error banner naming the file.
- All engine failures surface in-page (no console-only errors).

## Testing

- `tests/engine.test.mjs` with `node --test` covers: tree resolution on Red Trunk ×1M
  (hand-checked against raw JSON), cycle detection, yield/dup math, cost translation,
  owned-subtraction.
- Acceptance check: `Red Trunk × 1,000,000` renders full tree, 5 direct ingredients expand
  to correct recursive totals, cost panel shows silver + cider/net equivalents.

## Future (post-v1, not built now)

- Perk toggle UI for non-maxed players; XP mode; live market prices; hosting.

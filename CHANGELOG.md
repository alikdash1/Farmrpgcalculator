# Changelog

Dated log of real work sessions on this project. Keep entries short — what
changed and why, not a diff. See git log for the actual diffs (this project
started tracking git history 2026-09-02; everything before that is
reconstructed from the Codex chat transcript only).

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

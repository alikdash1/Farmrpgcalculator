# Lantern Ledger — Farm RPG planner

A static site that answers one question: **what does it actually cost to get
an item, in the currency the player really spends?** Built for **endgame
players** — people chasing Grand Mastery (100,000) and Mega Mastery
(1,000,000) who need to compare farming vs buying in stamina, explores, Apple
Cider, Arnold Palmer, OJ and gold.

## Read these first, in this order

Do **not** re-derive Farm RPG facts or re-read chat history from scratch.
Almost everything has already been established and written down:

| File | What it holds |
|---|---|
| **`BRIEFING.md`** | **The whole project in one file — game, player, app, files, decisions, mistakes. Start here.** |
| `handoff/STATE.md` | What is true right now |
| `PROJECT_STATE.md` | What this project is, where things live |
| `NEXT_PHASE.md` | What's left to do, and the open decisions |
| `KNOWN_MISTAKES.md` | Corrections the user made; regressions not to reintroduce |
| `CHANGELOG.md` | Dated log of real work sessions |
| `docs/HOW_THE_OWNER_PLAYS.md` | **How to cost a job so it is actually useful to them. Read before planning anything.** |
| `docs/STAMINA_AND_EFFECTIVENESS.md` | **Every stamina and effectiveness fact, in the game's own words** |
| `../knowledge-pack/PLAYER_KNOWLEDGE.md` | **Canonical Farm RPG game facts** |
| `../knowledge-pack/AI_READ_FIRST.md` | How to query the knowledge database |
| `docs/history/` | The original Codex transcript this was built in |

Query the knowledge pack instead of guessing or searching the web:

```
node ../knowledge-pack/query.mjs <command> <query>
```

It is a SQLite database (1360 items, 298 recipes, 2468 quests) built
specifically so sessions don't burn usage re-reading raw spreadsheets.

## How the app is built

- **No build step, no server, no framework.** Everything loads through plain
  `<script src>` tags. There is no `fetch()` and no ES module anywhere.
- `index.html` therefore **opens directly from disk** — double-click
  it. Do not tell the user to start a web server; they don't need one.
- `engine.js` — pure crafting/route resolution (buildIndex, resolveTree,
  sourcesFor, coDropsFor, marketQuote).
- `app.js` — all UI, state and rendering. State persists in `localStorage`.
- `data/*.js` — game data as globals (`window.FRPG_DATA`, `FRPG_KNOWLEDGE`, …).
- `publish/` — a **second, divergent copy** of the app. See the
  warning in `NEXT_PHASE.md`. Don't deploy it without reading that first.

## Verifying changes — this matters

You cannot judge this app by reading the source. Two real bugs (a dead Acorn
Pie toggle, and route labels rendered invisible in near-black on the dark
theme) were invisible in source and obvious on screen. So:

```bash
node --check app.js                  # syntax
node --test tests/*.mjs              # 40 tests, all should pass
python3 build/bundle.py              # inline everything into one file
```

`build/bundle.py` writes `build/preview-bundle.html`, a single self-contained
page. Render it headlessly (Playwright/Chromium) to screenshot views, read
console errors, drive the UI and read computed numbers back. Item art is
hotlinked from `farmrpg.com`, so images will be broken in any sandbox without
network access — that is the sandbox, not a bug.

## Working style the user has asked for

- **Be efficient with usage.** This project ran out of usage on another tool
  once already. Batch edits; don't make many tiny turns; don't re-derive
  known facts.
- **Verify before claiming something works.** The user has repeatedly caught
  confident wrong answers about game mechanics.
- Write player-facing copy, never developer-facing. Internal vocabulary,
  engine directives and changelog notes have leaked into the live UI before.
- Update `CHANGELOG.md` and `NEXT_PHASE.md` at the end of a real work session.

## Git

The repo root is this folder. History starts 2026-09-02;
everything before that exists only in `docs/history/`.

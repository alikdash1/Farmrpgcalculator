# FarmRPG Calculator ("Lantern Ledger") — Project State

Read this first when resuming this project in a new session. Then read, in order:

1. `docs/FARM_RPG_PLAYER_SKILL_BLUEPRINT.md` — the target design for a
   `farm-rpg-strategist` skill (decision model, spending profiles, Craftworks/void
   prevention, recommendation format). Not fully implemented in the live
   calculator yet — see NEXT_PHASE.md.
2. `../knowledge-pack/AI_READ_FIRST.md` — how to query the local game-knowledge
   database (`node knowledge-pack/query.mjs <command> <query>`) instead of
   re-reading spreadsheets/web captures. **Always query this before assuming a
   game fact — do not re-derive game mechanics from memory.**
3. `../knowledge-pack/PLAYER_KNOWLEDGE.md` — confirmed mechanics, measured
   field tests (Acorn Pie Hide rates per location, etc.), and open hypotheses.
4. `KNOWN_MISTAKES.md` (this folder) — bugs already found and fixed once;
   don't reintroduce them, and check new work against this list.
5. `NEXT_PHASE.md` (this folder) — the current backlog and what's next.
6. `CHANGELOG.md` (this folder) — dated log of what changed each session.

## What this project is

A Farm RPG (browser game) calculator/planner built for the user and their
friend group, named **Lantern Ledger**. It's a static site (`index.html` +
`app.js` + `engine.js` + `data/*.js`), no build step, no server required
(everything loads via `<script>` tags, so it works over `file://`).

Built almost entirely by OpenAI Codex over ~8+ chat sessions (shared transcript:
a ChatGPT/Codex share link the user provided). The user ran out of usage
mid-session; that's how this project changed hands. Prior context lives only
in that transcript and in this repo's files — there is no other record.

## Live pages (calculator/index.html tabs)

- **Home** — dashboard / desk.
- **Craft** — the crafting/acquisition planner (buy vs. farm vs. craft vs.
  trade, with co-drops, opportunity cost, quest/mastery credit).
- **Setup** — perks, meals, farm infrastructure toggles (Iron Depot, Sawmill,
  Quarry, etc.) that change what the planner assumes is "basically free".
- **Account** — manual/extension account import (Tower, inventory, masteries,
  quests, perks) — review-then-apply, never auto-applied.
- **Tower** — personal Tower mastery progress (T277 baseline in this user's
  account) plus floor-by-floor T301–T340 cost data (silver/AK/min-MM/items).
- **Quests** — main-questline browser (202 quests / 19 questlines). Event
  quests intentionally excluded per the user's request.
- **Inventory** — searchable saved inventory plus next-step and whole-questline
  gathering lists for one tracked, saga-aware questline.
- **New items** — Mining-skill items and other recently-added items not yet
  folded into the main planner, with sources/recipes/connected crafts.

A public-safe stripped build lives in `calculator/publish/` (removes research
tooling, personal Tower data, localhost-only extension installer) and is
zipped as `Lantern-Ledger-publish.zip` at the project root — this is what
would go to a real host if/when it's deployed.

There's also a browser extension at
`calculator/collectors/account-sync-extension/` (manifest v3, read-only,
`storage`+`tabs` permissions only) that captures the user's own visible
account pages and syncs them into the calculator automatically, so the user
doesn't have to re-paste account data every session.

## Engineering state (as of 2026-09-02, this session)

- **Version control:** the project had **zero commits** despite months of
  work until this session — everything was untracked. A checkpoint commit
  was made (`f959945`). Git identity was set locally (not globally) as
  `FarmRPG Calculator Project <farmrpg-calculator@local>` since none existed
  on this machine. **Commit meaningful checkpoints going forward** — this
  project has no other backup.
- **Tests:** `cd calculator && node --test tests/*.mjs` — 38 tests, all
  passing. `cd knowledge-pack && node --test tests/run-tests.mjs` — passing.
- **Syntax:** every top-level and `data/*.js` file passes `node --check`.
- Test files must resolve paths via `path.dirname(fileURLToPath(import.meta.url))`,
  not a hardcoded absolute path — three test files had this bug (fixed
  2026-09-02); it silently makes tests "fail" (ENOENT/MODULE_NOT_FOUND) when
  run from anywhere but the exact original Windows checkout path.
- No `fetch()` calls anywhere in the app — all data loads via `<script src>`,
  which is why `index.html` works directly over `file://` with no server.
  Keep it that way unless there's a strong reason to change it (a server adds
  a step for the user and for whoever's continuing this project).

## Who's working on this project

The user has used multiple AI tools on this same codebase: Codex (primary
builder, ChatGPT/OpenAI), Kimi (delegated for narrowly-scoped, mechanical
jobs — the account-sync extension, the knowledge-pack ETL — under tightly
written prompts that explicitly forbid it from making Farm RPG strategy or
design decisions), and now Claude. If you hand work to another agent, scope
it as narrowly as Codex did with Kimi and have it write a handoff doc before
touching anything outside its lane.

The user is very sensitive to AI usage/token cost (hit usage limits multiple
times; that's why the knowledge-pack query tool exists — to avoid re-reading
spreadsheets/web dumps every session) and to the site *feeling* like a
generic AI-generated product rather than something a real endgame player
would use. Both concerns should shape how much you re-derive vs. query, and
how much you explain vs. just ship a clean result.

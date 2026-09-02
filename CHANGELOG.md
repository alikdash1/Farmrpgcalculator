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

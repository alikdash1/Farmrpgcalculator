# Working agreement — Codex and Claude Code share this repo

Two agents work on Lantern Ledger. Usage on both runs out fast, and almost all
of it is wasted the same way: **re-deriving things the other one already knew.**
Everything below exists to stop that.

## Read these, in this order, and stop

1. **`BRIEFING.md`** — the whole project in one file: the game, the player, the
   app, every file, the decisions already made, and the mistakes already made.
   If you read nothing else, read that.
2. `CLAUDE.md` — how the app is built and the rules that break it. Applies to
   you too; it is not Claude-specific.
3. `handoff/STATE.md` — what is true right now and who is on what. Short by
   design.
4. `handoff/TASKS.md` — the queue.

Do **not** re-read the changelog, the Codex transcript in `docs/history/`, or
the spreadsheets in `../workbooks/` to work out what the project is. That is
what burned the last budget. If `STATE.md` does not answer your question, ask
the user one direct question instead of reading your way to it.

Game facts live in the knowledge pack, already built for this purpose:

```bash
node ../knowledge-pack/query.mjs <command> <query>
```

## Who does what

The split is by capability, not by preference.

**Codex — bulk work inside the repo.** Large refactors, generating data files,
gathering and verifying many external values, writing tests. It reads and
writes files directly, so anything that touches many files at once is cheaper
here.

**Claude Code — integration and proof.** It drives a real browser: it can
render the app, screenshot it, read computed styles, click through the UI and
check that URLs actually resolve. So it reviews, verifies on screen, fixes what
the other agent could only check by reading, and merges.

The division that matters: **whoever can prove a thing should be the one to
prove it.** Do not claim a visual change works if you cannot see it — say
"unverified, needs a render pass" and hand it over. That sentence costs nothing
and is always better than being wrong.

## Branches

- Codex works on `codex/<short-task-name>`. Claude Code works on `master`, or
  `claude/<task>` when both are running at once.
- **Never commit to the other agent's branch, and never rebase it.**
- Merges into `master` happen after a review pass, not automatically.

## Avoiding merge conflicts

Conflicts in this repo are expensive because the files are large. So:

- **New behaviour goes in a new file.** `quests-page.js`, `inventory-page.js`,
  `mining-page.js` and `sync-guide.js` are all separate for this reason.
- `index.html`, `app.js` and `system.css` are the shared spine. **Only one
  agent edits those per task.** If you need a change there and it is not your
  task, write down what you need in `handoff/TASKS.md` instead of making it.
- Claim your task in `handoff/STATE.md` before you start, in one line.

## Before you hand anything over

```bash
node tools/handoff.mjs check    # the objective gate — must exit 0
node --test tests/*.mjs         # all must pass
```

`check` catches the failures that have actually happened here: a missing `?v=`
bump so the user never sees the change, a listener bound to an element that no
longer exists (which throws on load and kills every tab), `fetch`/ES modules
that cannot work from `file://`, and text painted in a surface colour so it
renders invisible. It is deliberately short and fast. Run it; do not re-derive
what it already checked.

Then update `handoff/STATE.md` — what changed, what you could not verify, and
what the other agent should pick up. **The handover note is part of the work.**

## Two rules with no exceptions

- **Verify before claiming.** The user has repeatedly caught confident wrong
  answers about this game. Uncertain is a fine thing to say; wrong is not.
- **Never invent Farm RPG mechanics, drop rates or item data.** If the
  knowledge pack does not have it and you cannot check it, say so.

# Lantern Ledger

A planning tool for **Farm RPG**, built for endgame play.

It answers one question: **what does it actually cost to get an item** — in the
currency you really spend, which is stamina, exploring actions, Apple Cider,
Arnold Palmer, Orange Juice and gold, not just silver.

## What it does

- **Calculate** — pick an item and a quantity; compare crafting, buying,
  farming and passive production, with a per-ingredient route choice.
- **Tower** — every mastery requirement up to T340, scored against the right
  goal: Grand Mastery is 100,000, Mega Mastery is 1,000,000, and floors differ.
- **Quests** — 2,479 quests in 569 questlines. Questlines Farm RPG renames
  partway through are stitched back into one chain, in prerequisite order.
- **Inventory** — track a questline and see what this step needs, what the
  whole line needs, and **which of those items also finish a Tower mastery**.
- **Mining** — every mine, what it drops, and what those drops craft into.
- A floating tracker on every page: current step on the left, whole line on the
  right, openable across the screen, and copyable into a spreadsheet.

## Running it

There is no build step and no server. Clone it and open `index.html`.

```bash
git clone <this repo>
cd lantern-ledger
# then just open index.html in a browser
```

Item artwork is loaded from farmrpg.com, so pictures need a connection.

## Your own progress

Two files hold one player's real progress and are what make the numbers
personal: `data/personal-quests.js` (completed quests) and
`data/personal-tower.js` (mastery counts). Replace them with your own, or
delete them — the app works without them, it just cannot tell you what is done.

There is also an optional read-only browser extension in
`collectors/account-sync-extension/` that reads Farm RPG pages you open and
sends what it finds to the planner. It never clicks, plays, or navigates the
game for you, and nothing it reads leaves your browser.

## Working on it

`BRIEFING.md` is the whole project in one file — the game, the app, every file,
the decisions already made, and the mistakes already made. Start there.

```bash
node tools/handoff.mjs check    # cache busters, dead element references, file:// rules, contrast
node --test tests/*.mjs         # 89 tests
python3 build/bundle.py         # one self-contained page for rendering
```

## Credit

Game data and item artwork belong to Farm RPG. The complete item list is
derived from [buddy.farm](https://buddy.farm)'s public search index. This is a
fan-made planner and is not affiliated with either.

Bundled fonts are Bree Serif, Atkinson Hyperlegible and IBM Plex Mono, all
under the SIL Open Font License; their licences are in `assets/fonts/`.

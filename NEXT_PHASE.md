# Next Phase

## Immediate — in progress this session (2026-09-02)

The user's last request to the previous session, never finished (it got cut
off mid-edit by a usage limit): *"there's so many things in the site that
seems like they are for you and not for the player make it easy to see and
read and understand how to use ... also add tower to 340 with the
requirments and we would need quests as well ... all the main quests no
need for the event ones."*

- Tower T301–T340 + main quests: **done**, code was actually correct, just
  had a syntax error left mid-edit — fixed this session.
- Player-facing UX cleanup (remove dev/internal-facing language, simplify):
  **not started** — this is the open part of that request. Needs an actual
  visual pass in a real browser (not just source reading) to find what
  reads as "for you, not for the player" — page copy, debug-looking labels,
  raw numbers instead of the compact-number convention, anything that
  assumes the reader is the AI building the tool rather than a player using
  it.

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

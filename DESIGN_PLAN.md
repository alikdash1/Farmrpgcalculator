# Design plan — Lantern Ledger after dusk

Written before CSS changes, 2026-09-05.

## Colour
- Dusk #27364B: the page and recessed inputs; a blue working slate, never near-black.
- Slate #34475B: raised panels, with a quiet chalk edge and a 2px lower lip.
- Chalk #E8E8D4: reading text and numbers. Secondary text and dividers are mixtures of Chalk and Slate.
- Lantern #E8B967: primary actions and keyboard focus. It does not mean completed, selected, or cheap.
- Water #91BFCB: selected tabs, enabled settings and route choices. It does not mean completion.
- Sage #ABC58D: gathering/mastery progress and covered requirements. Completed Tower rows keep their existing neutral treatment.

Existing warning/error roles remain distinct, derived by mixing these pigments. Error labels retain their words; colour is never their only signal.

## Type
Bree Serif, regular, for the brand and page/section titles: sturdy, low-contrast farm-sign lettering instead of fashionable editorial serifs. Atkinson Hyperlegible for prose, labels and dense lists at 12–14px, chosen for distinguishable characters in long midnight sessions. IBM Plex Mono, regular/medium, for quantities and rates, with tabular numerals. All are bundled as local WOFF2 with real fallback stacks and OFL licences. No network font dependency.

Type scale: 12, 14, 16, 20, 24, 32, 40px. Large titles are sparse; the data stays compact.

## Layout
Keep every existing view, work area, control, fact and calculation in place. Preserve current grids and table scrolling. Use 4/8/12/16/24/32/48px spacing. One panel idiom: Slate inset into Dusk, a quiet chalk edge, a small solid lower lip. Radius 8px for panels, 4px for controls and artwork plates. Status dots remain circles.

Existing structure, unchanged:
[brand | eight tabs | export]
[standing / introduction | goal form]
[existing work areas]
[existing secondary sections]
[current-step dock]             [whole-line dock]

## Signature and risk
A field-edge frieze using the app's own Farm RPG location artwork, with a pixel lantern mark and yellow action tabs. It recalls returning from exploration to a farm workbench. The risk is committing to blue painted surfaces and honest game pixel art in a dense tool, without turning the whole UI into a game HUD. The illustration occupies the Home introduction only; the lantern and panel idiom carry the identity elsewhere. No invented items or mechanics.

## Trap check
Nearest to (b), because this remains a dark, late-night tool. It differs in a visibly blue, mid-dark ground, three colours with separate meanings, genuine farm landscape art, and characterful sign lettering paired with readable data typography. It is neither cream/terracotta editorial design nor a newspaper grid. Keep the display serif sturdy and occasional, keep real numbers neutral, and remove repeated headline kickers rather than restyling all of them.

## Scope and verification
Change presentation and headline copy only. Preserve all IDs, event bindings, scripts, page order, source logic and game data. Maintain file:// loading and cache versions. Run the handoff gate, entire existing test suite and bundle generator. Inspect all eight tabs at desktop and 375px, including calculator results and tracker expansion. Record findings in CHANGELOG.md and handoff/STATE.md.

# Farm RPG Player Skill — Living Blueprint

## Goal

Build a reusable `farm-rpg-strategist` skill that recommends what a real player should do, rather than merely selecting the mathematically fastest source for one item.

The skill must work across:

- early, mid, late, Tower, and endgame progression;
- free-to-play, light-spend, moderate-spend, and high-spend profiles;
- active/maximum-efficiency play and low-attention/low-overstimulation play;
- quest, Tower, mastery, silver, Gold, friendship, and inventory goals.

## Never collapse these into one value

Keep four kinds of knowledge separate:

1. **Verified fact** — captured account value or sourced game mechanic.
2. **Measured rate** — player test or community sample with sample size and conditions.
3. **Player heuristic** — experienced-player advice that may depend on context.
4. **Open question** — uncertain or conflicting information that needs research or a player decision.

Store provenance, date, conditions, and confidence. Do not silently turn a heuristic into a universal rule.

## Player context

Before making a major recommendation, account for:

- progression and Tower level;
- completed, active, available, and locked quests;
- current inventory and inventory cap;
- mastery and Tower mastery requirements;
- Silver, Gold, stamina, AP, nets, juice, and meal supply;
- owned perks, Farm Supply upgrades, artifacts, pets, and buildings;
- Craftworks slots, queue order, active recipes, blockers, and void risk;
- monthly spending comfort, not just a vague `P2P` label;
- attention tolerance and preferred session length;
- current goals and acceptable completion time.

## Spending profiles

Treat spending as a budget constraint, not as skill level:

- F2P: protect Gold and use renewable systems aggressively.
- Light spend: use Gold where it removes a meaningful bottleneck or recurring annoyance.
- Moderate spend: compare permanent convenience and progress acceleration against recurring consumable purchases.
- High spend (for example, around $100/month): still avoid waste; optimize time, bottlenecks, and durable account value rather than assuming every Gold purchase is good.

Always let the player override the profile and specify what they enjoy buying.

## Decision model

Evaluate complete routes, not isolated ingredients. Score or explain:

- direct time and resource cost;
- opportunity cost of Silver, Gold, stamina, AP, nets, and juices;
- useful co-drops and mastery progress;
- quest and Tower dependencies;
- buy-versus-farm availability and market units;
- passive building production over the relevant time horizon;
- Craftworks slot pressure and recipe-chain dependencies;
- inventory headroom and expected voided output;
- meal effects, duration, action speed, and interaction constraints;
- attention burden and how often the route needs intervention.

The cheapest purchase is not automatically the best route when farming advances several required masteries or produces valuable co-drops. The best theoretical route is not automatically best when it creates excessive switching or Craftworks pressure.

## Craftworks and void prevention

Treat Craftworks as part of resource acquisition, especially during high-output exploration and meal windows.

Current account fact: the player can use **10 Craftworks items/slots**. Treat the exact queue as volatile session state, not permanent profile data. Request or automatically capture the live queue only when producing a current farming plan.

## Current meal strategy

- The player can cook every meal except **Cabbage Stew**.
- Meals are inexpensive enough for this account that the normal acquisition rule is **buy**, not spend oven time and ingredients merely to obtain the effect.
- Oven capacity is used deliberately for cooking mastery rather than routine meal supply.
- The current cooking-mastery focus is **Neigh toward Grand Mastery**.
- Override the buy default when a quest, mastery target, market shortage, unusual price, or account-stage constraint makes cooking materially better.

Before recommending an Acorn Pie or other boosted session:

- estimate which drops will reach inventory cap;
- identify recipes that can consume those drops continuously;
- check the number and order of available Craftworks slots;
- check whether output items will themselves cap and halt the chain;
- preserve slots for active Tower, quest, and mastery goals;
- recommend inventory headroom, selling/storing, or a shorter batch when necessary;
- incorporate concurrent meal limit and confirmed meal interactions.

Confirmed player mechanic: **Acorn Pie replaces some normal exploring-location drops with Hide; Hide is not simply added on top of the normal drop table.** Therefore, optimize on net value and progression impact, not Hide yield alone. A reliable location test needs a matched no-Acorn baseline and an Acorn run with the same drink count and other buffs. Capture the full drop vector automatically so displaced quest items, mastery items, sale value, and void risk are included.

Confirmed action model: **Acorn Pie uses are consumed per action, not per drink inside a 5x action.** Lemon Cream Pie makes one action use 5 Arnold Palmers; 125 AP with the meal is 25 actions and consumes 25 Acorn uses. Without it, 125 AP is 125 actions and consumes 125 Acorn uses. Cabbage Stew has the corresponding 5x-per-action behavior for Cider. Model actions, drinks/action, output/drink, stamina cost, and effect charges separately.

First measurement: Small Cave with Acorn Pie + Lemon Cream Pie + Quandary Chowder used 125 AP across 25 actions and gained 6,348 Hide = **253.92 Hide/action** or **50.784 Hide/AP**. This is a conditional measured rate, not a universal probability. It lacks a no-Acorn baseline and full displaced-drop vector. Canonical record: `knowledge-pack/field-tests/acorn-pie-tests.jsonl`.

Do not assume untested cross-location rates or Cider/AP output economics. Record conditions and tests.

## Recommendation styles

Support at least four modes:

- Fastest progression
- Best combined mastery/quest value
- Lowest consumable or currency cost
- Low-attention, manageable routine

Default to a short recommendation:

1. **Do now** — one concrete action or small routine.
2. **Why it fits** — the decisive account-specific reasons.
3. **Watch for** — the first likely blocker or void risk.
4. **Alternative** — only when another route is genuinely competitive.

Use compact quantities such as `10K`, `1.2M`, and `3.4B`; retain exact values in calculations.

## How the user teaches the skill

When evidence cannot resolve an important decision:

1. Present a realistic account scenario and no more than three viable choices.
2. State the tradeoff behind each choice.
3. Ask which choice the experienced player would make and why.
4. Convert the answer into a general heuristic plus explicit exceptions.
5. Test the heuristic on a different progression/spending profile before accepting it.

Do not repeatedly ask for facts already present in captures or the knowledge pack.

## Initial evaluation scenarios

These will be refined after account and Craftworks capture is complete:

- Mount Banon versus Whispering Creek when Oak is needed but Coal, Black Powder, Crossbow, and several masteries are also active.
- Buy versus farm Leather during an Acorn Pie session, including co-drops, meal duration, Craftworks slots, and void risk.
- F2P versus $100/month choices for permanent Farm Supply upgrades, consumables, and bottleneck removal.
- A low-attention player with many Tower masteries: choose a stable multi-day loop without presenting an overwhelming checklist.

## Completion standard

The skill is not finished merely because a `SKILL.md` exists. It is ready after:

- account captures and the knowledge pack can supply its inputs;
- key formulas and rules have provenance;
- representative early/late and spending-profile scenarios have been tested;
- the user's corrections have been generalized and retested;
- it avoids confident answers when the underlying rate or mechanic is unknown.

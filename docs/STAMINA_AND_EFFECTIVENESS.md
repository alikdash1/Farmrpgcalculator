# Stamina and Exploring Effectiveness

Everything Farm RPG says about stamina, gathered 2026-09-05 because the planner
had two of these wrong. **Every line below is the game's own text**, from
`raw/items-etl2.json` item descriptions and the player's own Farm Supply
capture. Nothing here is inferred except the one section that says so.

---

## Exploring Effectiveness

A **per-location, per-player** number. The game states it on the location page:

> You are currently using **N** stamina every time you continue exploring this
> location.

Three things change it, and **all three raise it**:

| What | The game's words |
|---|---|
| **Protein Bar** | "Increases exploring effectiveness" · "This item can be eaten in a location to increase your exploring effectiveness." |
| **Jill** | "Jill is very knowledgeable about the *(location)* and can help you explore it more effectively for a small fee." |
| **Sprint Shoes I / II / III** | "Doubles Stamina Effectiveness — **Stamina is used faster**" |

Protein Bars have a per-location allowance before Gold is required ("You have
eaten all you can eat here without using Gold"), so the number is specific to
each place *and* to how much you have invested in that place.

**Nothing lowers it.** An earlier version of the Places page said Protein Bars
and Jill lowered it. They do not.

### Why you would want it higher

Because it is the one thing that makes an **Apple Cider** go further. Stamina
regenerates on its own; ciders cost 40 Apples + an Orange + a Glass Bottle
each. See the cider entry below.

---

## What uses stamina

| Item | The game's words |
|---|---|
| **Apple Cider** | "1000+ Stamina Use \| Does not give Stamina \| Works with Wanderer Perks \| Need at least 1000 Stamina to use" |
| | *Item page:* "The amount of stamina used by this item depends on your **exploring effectiveness in each explore location**. It can also be boosted with the Cinnamon Sticks perk at the Farm Supply." |

Read those two together and the shape is fixed: **the exploring a cider does is
the constant, and the stamina it costs is the variable.** One cider is worth
1,000 explores (1,250 with Cinnamon Sticks, "Apple Cider is 25% more
effective") and costs `1,000 × your effectiveness` stamina at that location —
which is why the minimum is 1,000, at an effectiveness of 1.

So raising effectiveness makes a cider *cost more stamina*, and that is the
point: the same cider covers proportionally more ground.

**Fishing does not use stamina.** Worms are `type: "bait"` — "Use this to catch
fish."

---

## What gives stamina

| Source | The game's words |
|---|---|
| **Orange Juice** | "Adds 100 Stamina" |
| **Cranberry Juice** | "Adds a lot of stamina" · "used at the bottom of *Explore the Area*. It adds a large amount of stamina **based on the size of your orchard**." |
| **Energy Drink** (perk) | "+20 stamina refill every 10 minutes" |
| **Apple Pie** | "Will greatly increase your Max Stamina amount" · "To use this item, visit your Farmhouse" |
| **Farmhouse** | "Rest to increase max stamina — 2 Stamina Increase Per Day" |
| **Mattress Pad** | "+1 Max Stamina daily in Farmhouse" |
| **+25 Max Stamina** (perk) | Repeatable cap upgrade. The owner's max was **83,334** at capture. |

---

## What saves stamina

| Perk | The game's words |
|---|---|
| **Wanderer I** | "4% chance exploring won't use Stamina" |
| **Wanderer II** | "7% chance exploring won't use Stamina" |
| **Wanderer III** | "9% chance exploring won't use Stamina" |
| **Wanderer IV** | "13% chance exploring won't use Stamina" |
| **Neigh** (meal) | "Cider uses 20% less stamina for 5 minutes" |

**These are tiers, not additions**, and they are a *skip chance*, not a
discount. `data/effects.json` said "Uses about 20% less stamina while
exploring" with a value of `0.2`; it is now `0.13`, matching Wanderer IV. The
old value both overstated the saving and described the wrong mechanic.

Apple Cider explicitly "Works with Wanderer Perks".

---

## What does NOT use stamina

| Item | The game's words |
|---|---|
| **Lemonade** | "Finds items while exploring" — 10 items, 20 with Lemon Squeezer |
| **Arnold Palmer** | "Quicker than regular Lemonade" — 200 items, 500 with Lemon Squeezer |

This is the distinction `KNOWN_MISTAKES.md` records as "Arnold Palmer is not
exploring". An AP finds items on its own; it never touches stamina, and its
drop rates are measured per AP, not per explore.

Boosters for these: **Lemon Squeezer** (Farm Supply), **Quandary Chowder**
("Lemonade/APs more effective for 5 minutes"), **Lemon Seltzer** ("Increases
effectiveness of Lemonade and Arnold Palmers").

---

## Click savers, which change nothing about yield

| Meal | The game's words |
|---|---|
| **Cabbage Stew** | "Allows for 5x Cider use per click" |
| **Lemon Cream Pie** | "Allows for 5x AP use per click" |

These save clicking. They do not change how much material anything produces —
except where an Acorn Pie is running, because a pie is limited to 150
**actions**, so five drinks in one click cost one charge instead of five.

---

## The one inference on this page

Everything above is quoted. This part is not, and is flagged as such wherever
the app relies on it.

A cider does a fixed amount of exploring for a stamina cost that scales with
effectiveness. Taken literally on its own, that would make effectiveness
*harmful* — the same exploring for more stamina. The reading that makes every
quoted line true **and** makes effectiveness worth buying is:

> One explore action at effectiveness N costs N stamina and does N explores'
> worth of drops.

Under it: yield per **stamina** is flat, yield per **cider** rises with
effectiveness, "Stamina is used faster" is an accurate warning, and "Need at
least 1000 Stamina to use" is the N = 1 case. It is consistent with
`explore_base_stamina: 1` ("Base stamina opportunity per logged item roll"),
which the project already assumed.

**Worth confirming in game**, since it decides whether a stamina figure should
be divided by effectiveness: read the location's effectiveness, spend a known
amount of stamina, and check whether the explore counter moves by
`stamina ÷ effectiveness` or by `stamina`.

# Stamina and Exploring Effectiveness

Everything Farm RPG says about stamina, gathered 2026-09-05 because the planner
had several of these wrong. **Every quoted line is the game's own text**, from
`raw/items-etl2.json` item descriptions and the player's own Farm Supply
capture.

The one thing the text does not settle on its own is what effectiveness *does*.
That section is marked, and it was settled by the owner's own play, not by
reading — two readings of the item text gave two wrong answers first.

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

Because it is **fewer clicks for the same result** — one click does N explores
instead of one. It does not change what a pour costs or what it drops. See
*What effectiveness actually does* below.

---

## What uses stamina

| Item | The game's words |
|---|---|
| **Apple Cider** | "1000+ Stamina Use \| Does not give Stamina \| Works with Wanderer Perks \| Need at least 1000 Stamina to use" |
| | *Item page:* "The amount of stamina used by this item depends on your **exploring effectiveness in each explore location**. It can also be boosted with the Cinnamon Sticks perk at the Farm Supply." |

One cider is worth **about 1,000 explores for about 1,000 stamina** (1,250
explores with Cinnamon Sticks, "Apple Cider is 25% more effective").

The item page's "depends on your exploring effectiveness" is easy to over-read,
and was over-read here twice. It does **not** mean the bill scales with
effectiveness — see *What effectiveness actually does* below, which is settled
by measurement rather than by reading. It means a cider spends whole clicks, so
the total lands a little past 1,000 rather than exactly on it. Hence "1000+".

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

## What effectiveness actually does — from the owner's own workbook

The item text does not settle this, and two readings of it gave two wrong
answers on 2026-09-05. The **stamina calculator** tab of the owner's workbook
settles it outright, with a table running from effectiveness 0 to 108:

| Column | What it is | Exact relationship |
|---|---|---|
| stamina before meal and perk | a cider's raw cost | **1250 + 12.5 × effectiveness** |
| stamina with perk | after Wanderer | × **0.67** |
| stamina with meal | after Neigh too | × **0.8** |
| cider needed | ciders for a fixed job | ÷ **(1 + effectiveness/100)** |

Those hold at every one of the 28 steps, with no drift. Divide the first by the
last and the effectiveness cancels:

> **One explore costs 1.25 stamina, at any effectiveness.**

So effectiveness raises what a cider *does* and what it *costs* by the same
proportion. It stretches your **ciders**, not your stamina — which is the point,
because stamina comes back on its own and a cider costs 40 Apples.

At effectiveness 104: a cider is **2,040 explores for 2,550 stamina**, or
**1,708 with Wanderer** and **1,367 with Neigh as well**.

`data/constants.json` carries this as `cider_stamina_base` (1250),
`cider_stamina_per_eff` (12.5) and `explore_base_stamina` (1.25).

### Wanderer's tiers ADD UP

The sheet's perk column is exactly ×0.67 at every step, and 4 + 7 + 9 + 13 = 33.
So the four Wanderer tiers **stack** rather than replacing each other.
`data/effects.json` has been 0.2, then 0.13, and is now **0.33**.

## An older inference, now superseded

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

**Superseded by the measurement above.** The original wording is kept because
it shows how the wrong reading looked reasonable. **Worth confirming in game**, since it decides whether a stamina figure should
be divided by effectiveness: read the location's effectiveness, spend a known
amount of stamina, and check whether the explore counter moves by
`stamina ÷ effectiveness` or by `stamina`.

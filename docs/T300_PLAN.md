# The road to T300, one requirement at a time

Started 2026-09-06. The owner works the Tower floor by floor and wants each
requirement costed **as part of the loop it belongs to**, not on its own. Read
`HOW_THE_OWNER_PLAYS.md` first — especially rule 4 (stack masteries) and rule 7
(judge by marginal cost).

## The mastery arithmetic — get this right first

Two multipliers, and they are independent:

- **Mushroom Stew +10% mastery.** Mastery per item obtained = 1.1.
- **Resource Saver I + II + III = 45% duplicate chance.** The game's own words:
  *"10% / 15% / 20% chance item is duplicated during crafting or resources are
  returned if max inventory."* So a craft yields **1.45 items on average**, and
  the duplicate is a real item, so it carries mastery too.

**crafts = (1,000,000 - current) / 1.1 / 1.45**

The 1.45 applies to *every* craft in a chain, including intermediate ones — the
Steel you craft to feed a Glass Jar is itself duplicated 45% of the time. It
does **not** apply to anything bought, explored or fished.

One caveat worth respecting at 15,870 inventory: the perk pays a duplicate
*or*, at max inventory, refunds the resources instead. Refunded resources carry
no mastery. Keep headroom in the output stack while grinding, or the 1.45
quietly becomes 1.0 for mastery purposes.

(`engine.js` already divides by `craftYield` — the Calculate page has always
done this. It is hand-written plans that forget it.)

Progress is from the 2026-09-06 mastery export in `data/personal-tower.js`.

---

## The shared bottleneck: Steel, and why it is not a production problem

Four Tower requirements want Steel and one wants Steel Wire. Waiting for the
buildings is not a plan:

| Item | Steel needed | At 5,000/hr |
|---|---|---|
| Glass Jar (T287) | 611,435 | 122 hrs |
| Pitchfork (T290) | 1,243,523 | 249 hrs |
| Wrench (T298) | 255,739 | 51 hrs |
| Red Trunk (T299) | 4,760,877 | 952 hrs |
| **Total** | **6,871,575** | **57 days** |
| Fancy Guitar (T295) | 3,187,365 **Steel Wire** | 1,912 hrs = **80 days** |

**But Steel and Steel Wire are craftable, and the only scarce ingredient is
Carbon Sphere.**

- Steel = 10 Iron + 1 Glass Orb + 1 Carbon Sphere (craft level 15)
- Steel Wire = 10 Iron + 1 Stone + 1 Carbon Sphere (craft level 50)

Both duplicate, so 6,871,575 Steel is only 4,739,017 crafts and 3,187,365 Wire
is 2,198,183. Iron is Iron Depot, Stone is the Quarry, Glass Orb is 2–3 AP/k.
So the whole steel programme is **6,937,200 Carbon Sphere** — about **69,000
AP** bought at 8–12 AP/k, or **112,000 AP** exploring Mount Banon at 61.74/AP.

That turns Red Trunk and Fancy Guitar from months of building output into an AP
purchase. Two things to check before betting on it:

1. **Market depth.** Nobody sells 6.9m Carbon Sphere. Mount Banon is the
   fallback and it is not absurd.
2. **Iron at scale.** Rule 5 says iron is free, and it is — but this is ~69m
   Iron through the Depot. Confirm the Depot keeps up before treating it as
   background.

---

## T287 — Glass Jar

At 24,761 / 1,000,000. **611,435 crafts.**
Recipe: 3 Glass Orb + 1 Shimmer Quartz + 1 Steel.

| Need | Quantity | Where it comes from |
|---|---|---|
| Glass Orb | 1,834,305 (+421,679 for the Steel) = **2,255,984** | buy at 2–3 AP/k ≈ **5,640 AP**, or Ember Lagoon at 113.41/AP = 19,892 AP |
| Shimmer Quartz | 611,435 | **Black Rock Canyon only, 24.63/AP = 24,825 AP. Not mailable — cannot be bought.** |
| Steel | 611,435 items = 421,679 crafts | crafted, see above |
| Carbon Sphere | 421,679 | buy at 8–12 AP/k ≈ **4,216 AP**, or Mount Banon at 61.74/AP = 6,829 AP |
| Iron | 4,216,793 | Iron Depot |

**Buying the orbs and spheres: ~9,900 AP.**

**The Shimmer Quartz is free.** Salt (T294) needs 20,154,921 Salt Rock, which
is 250,549 AP at Black Rock Canyon — and that run drops **6,170,773 Shimmer
Quartz**, ten times what Glass Jar wants. Do Salt at Black Rock Canyon rather
than Whispering Creek (80.44 vs 78.16 Salt Rock/AP, and the Creek gives no
Quartz).

The same run also drops **9,428,413 Horn**, which covers Horn Canteen's (T297)
557,461 many times over. And Salt eats one Hammer per craft: 403,098 Hammer
crafts is **642,942 Hammer mastery**, and Hammer (T289) only needs 496,946 —
so **Salt finishes Hammer on its own.**

Practical note: all three ingredients cap at 15,870. Glass Orb at 3 per jar is
the tightest — one full load is 5,290 jars, so this is roughly **116 fill-and-
craft cycles**, not one big craft.

---

## Already costed, for reference

- **T286 Aquamarine Ring / T300 Sewing Needle / T300 Water Lily** — one loop:
  Grab Bag 01 in 3,500s for Potato, Bone and Aquamarine while fishing Forest
  Pond for Water Lily; Awl twine accrues on its own.
- **T286 Wooden Spear** — quoted at 813,560 crafts **before the 1.45 was
  counted**; the real figure is 561,076 crafts, so 2,244,304 Straw = 41.6 hrs
  at 54,000/hr, not 60.3. Arrowhead price still unanswered.

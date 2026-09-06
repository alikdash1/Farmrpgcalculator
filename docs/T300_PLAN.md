# The road to T300, one requirement at a time

Started 2026-09-06. The owner works the Tower floor by floor and wants each
requirement costed **as part of the loop it belongs to**, not on its own. Read
`HOW_THE_OWNER_PLAYS.md` first — especially rule 4 (stack masteries) and rule 7
(judge by marginal cost).

Mastery model used throughout: **1 mastery per item, x1.1 with Mushroom Stew**,
so crafts needed = (1,000,000 - current) / 1.1. Progress is from the
2026-09-06 mastery export in `data/personal-tower.js`.

---

## The shared bottleneck: Steel, and why it is not a production problem

Four Tower requirements want Steel and one wants Steel Wire. Waiting for the
buildings is not a plan:

| Item | Steel needed | At 5,000/hr |
|---|---|---|
| Glass Jar (T287) | 886,581 | 177 hrs |
| Pitchfork (T290) | 1,803,108 | 361 hrs |
| Wrench (T298) | 370,821 | 74 hrs |
| Red Trunk (T299) | 6,903,272 | 1,381 hrs |
| **Total** | **9,963,782** | **83 days** |
| Fancy Guitar (T295) | 4,621,674 **Steel Wire** | 2,772 hrs = **115 days** |

**But Steel and Steel Wire are craftable, and the only scarce ingredient is
Carbon Sphere.**

- Steel = 10 Iron + 1 Glass Orb + 1 Carbon Sphere (craft level 15)
- Steel Wire = 10 Iron + 1 Stone + 1 Carbon Sphere (craft level 50)

Iron is Iron Depot, Stone is the Quarry, Glass Orb is 2–3 AP/k. So the whole
steel programme is **14,585,456 Carbon Sphere** — about **145,000 AP** bought
at 8–12 AP/k, or **236,000 AP** exploring Mount Banon at 61.74/AP.

That turns Red Trunk and Fancy Guitar from months of building output into an AP
purchase. Two things to check before betting on it:

1. **Market depth.** Nobody sells 14.5m Carbon Sphere. Mount Banon is the
   fallback and it is not absurd.
2. **Iron at scale.** Rule 5 says iron is free, and it is — but this is ~100m
   Iron through the Depot. Confirm the Depot keeps up before treating it as
   background.

---

## T287 — Glass Jar

At 24,761 / 1,000,000. **886,581 crafts** with Stew.
Recipe: 3 Glass Orb + 1 Shimmer Quartz + 1 Steel.

| Need | Quantity | Where it comes from |
|---|---|---|
| Glass Orb | 2,659,743 (+886,581 for the Steel) = **3,546,324** | buy at 2–3 AP/k ≈ **8,900 AP**, or Ember Lagoon at 113.41/AP = 31,270 AP |
| Shimmer Quartz | 886,581 | **Black Rock Canyon only, 24.63/AP = 35,997 AP. Not mailable — cannot be bought.** |
| Carbon Sphere (for the Steel) | 886,581 | buy at 8–12 AP/k ≈ **8,900 AP**, or Mount Banon at 61.74/AP = 14,359 AP |
| Iron | 8,865,810 | Iron Depot |

**The Shimmer Quartz is free.** Salt (T294) needs 29,224,600 Salt Rock, which
is 363,296 AP at Black Rock Canyon — and that run drops **8,947,611 Shimmer
Quartz**, ten times what Glass Jar wants. Do Salt at Black Rock Canyon rather
than Whispering Creek (80.44 vs 78.16 Salt Rock/AP, and the Creek gives no
Quartz) and Glass Jar's only real bill is the orbs and spheres, ~17,800 AP.

The same Black Rock Canyon run also drops **13,671,182 Horn**, which finishes
Horn Canteen's (T297) 808,319 Horn outright.

Practical note: all three ingredients cap at 15,870. Glass Orb at 3 per jar is
the tightest — one full load is 5,290 jars, so this is roughly **168 fill-and-
craft cycles**, not one big craft.

---

## Already costed, for reference

- **T286 Aquamarine Ring / T300 Sewing Needle / T300 Water Lily** — one loop:
  Grab Bag 01 in 3,500s for Potato, Bone and Aquamarine while fishing Forest
  Pond for Water Lily; Awl twine accrues on its own.
- **T286 Wooden Spear** — 813,560 crafts; 3,254,240 Straw is 60.3 hrs at
  54,000/hr, the first place production is genuinely the wall. Arrowhead price
  still unanswered.

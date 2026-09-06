# The road to T300, one requirement at a time

Started 2026-09-06. The owner works the Tower floor by floor and wants each
requirement costed **as part of the loop it belongs to**, not on its own. Read
`HOW_THE_OWNER_PLAYS.md` first — especially rule 4 (stack masteries) and rule 7
(judge by marginal cost).

## The mastery arithmetic — get this right first

Two multipliers, and **they do not both apply to the same job**:

- **Resource Saver I + II + III = 45% duplicate chance.** The game's own words:
  *"10% / 15% / 20% chance item is duplicated during crafting or resources are
  returned if max inventory."* A craft yields **1.45 items on average**, and the
  duplicate is a real item, so it carries mastery. Crafting only.
- **Mushroom Stew +10% mastery** — but it lasts **five minutes**. The owner's
  ruling: **do not count it on a craft grind.** You cannot keep it up across
  hundreds of thousands of crafts. Count it only on burst activities where a
  five-minute window is the whole job: **fishing, opening Grab Bags, harvesting
  a field.**

So:

    crafted item   crafts = (1,000,000 - current) / 1.45
    fished / bagged / farmed item   items = (1,000,000 - current) / 1.1

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

| Item | Steel needed | At 6,000/hr |
|---|---|---|
| Glass Jar (T287) | 672,579 | 112 hrs |
| Pitchfork (T290) | 1,367,876 | 228 hrs |
| Wrench (T298) | 281,313 | 47 hrs |
| Red Trunk (T299) | 5,236,966 | 873 hrs |
| **Total** | **7,558,733** | **52.5 days** |
| Fancy Guitar (T295) | 3,506,102 **Steel Wire** | 1,753 hrs = **73 days** |

**But Steel and Steel Wire are craftable, and the only scarce ingredient is
Carbon Sphere.**

- Steel = 10 Iron + 1 Glass Orb + 1 Carbon Sphere (craft level 15)
- Steel Wire = 10 Iron + 1 Stone + 1 Carbon Sphere (craft level 50)

Both duplicate, so 7,558,733 Steel is only 5,212,919 crafts and 3,506,102 Wire
is 2,418,001. Iron is Iron Depot, Stone is the Quarry, Glass Orb is 2–3 AP/k.
So the whole steel programme is **7,630,921 Carbon Sphere** — about **76,000
AP** bought at 8–12 AP/k, or **124,000 AP** exploring Mount Banon at 61.74/AP.

**But the buildings were upgraded to 6,000 Steel and 2,000 Wire an hour
(2026-09-06), which changes the answer.** That is 144,000 Steel and 48,000 Wire
a day, and the T300 push is months of elapsed time anyway. Carbon Sphere is now
a **top-up for whatever production misses**, not the whole bill:

| If the push takes | Steel covered | Wire covered | Spheres to buy | AP |
|---|---|---|---|---|
| 30 days | 57% | 41% | 3,658,507 | ~36,600 |
| 45 days | 86% | 62% | 1,672,300 | ~16,700 |
| 60 days | 100% | 82% | 431,794 | ~4,300 |
| 90 days | 100% | 100% | 0 | 0 |

**Steel Wire is the half that falls short**, not Steel — the 2,000/hr line has
to cover 3.5m for Fancy Guitar alone. Collect often enough that a tick never
overflows the 15,870 cap.

That turns Red Trunk and Fancy Guitar from months of building output into an AP
purchase. Two things to check before betting on it:

1. **Market depth.** Nobody sells millions of Carbon Sphere. Mount Banon is
   the fallback and it is not absurd.
2. **Iron at scale.** Rule 5 says iron is free, and it is — but this is ~76m
   Iron through the Depot. Confirm the Depot keeps up before treating it as
   background.

---

## T287 — Glass Jar

At 24,761 / 1,000,000. **672,579 crafts.**
Recipe: 3 Glass Orb + 1 Shimmer Quartz + 1 Steel.

| Need | Quantity | Where it comes from |
|---|---|---|
| Glass Orb | 2,017,736 (+463,847 for the Steel) = **2,481,583** | buy at 2–3 AP/k ≈ **6,204 AP**, or Ember Lagoon at 113.41/AP = 21,882 AP |
| Shimmer Quartz | 672,579 | **Black Rock Canyon only, 24.63/AP = 27,308 AP. Not mailable — cannot be bought.** |
| Steel | 672,579 items = 463,847 crafts | crafted, see above |
| Carbon Sphere | 463,847 | buy at 8–12 AP/k ≈ **4,638 AP**, or Mount Banon at 61.74/AP = 7,513 AP |
| Iron | 4,638,473 | Iron Depot |

**Buying the orbs and spheres: ~10,800 AP.**

### What the Shimmer Quartz run costs, and what else it pays for

672,579 Shimmer Quartz from Black Rock Canyon is **27,308 Arnold Palmers** or
**27,523 Apple Ciders** — the two rate tables agree to within 1%, which is the
best cross-check this project has produced. In stamina, at effectiveness 104:
2,550 per cider, x0.8 Neigh, x0.67 Wanderer = **1,367 each, 37.6m total** (451
full bars). Without Wanderer configured it reads 2,040 and 56.1m.

That one run also drops:

| | Amount | Covers |
|---|---|---|
| Salt Rock | 1.9m–2.2m | 37,700–43,900 Salt crafts = **55k–64k Salt mastery**, ~10% of what is left |
| Horn | 1.0m–1.1m | Horn Canteen (T297) needs 613,208 — **finished outright** |
| Sandstone | 5.3m | Hourglass (T298) needs ~2.0m — **finished outright** |
| Coal | 5.3m | — |

**Salt itself is not done at Black Rock Canyon.** The owner runs it at
Whispering Creek: 22,170,414 Salt Rock at 78.16/AP is **283,672 AP** against
275,604 at the Canyon — 2.9% more AP for Oak, Apple, Orange, Lemon, Striped
Feather, Slimestone and Raptor Claw, every one of which they use. The Canyon's
other drops are dead weight to them. Rule 7, applied by the owner, not the
rule book.

That Whispering Creek run also covers Fancy Drum and Fancy Guitar's 12,017,628
Oak (55.4m), Essence of Slime's 1,090,206 Slimestone (22.2m), and Red Dye's
942,370 Striped Feather (5.0m).

And Salt eats one Hammer per craft: 443,408 Hammer crafts is **642,942 Hammer
mastery**, and Hammer (T289) only needs 496,946 — so **Salt finishes Hammer on
its own.**

Practical note: all three ingredients cap at 15,870. Glass Orb at 3 per jar is
the tightest — one full load is 5,290 jars, so this is roughly **128 fill-and-
craft cycles**, not one big craft.

---

## Already costed, for reference

- **T286 Aquamarine Ring / T300 Sewing Needle / T300 Water Lily** — one loop:
  Grab Bag 01 in 3,500s for Potato, Bone and Aquamarine while fishing Forest
  Pond for Water Lily; Awl twine accrues on its own.
- **T286 Wooden Spear** — quoted at 813,560 crafts **before the 1.45 was
  counted**; the real figure is 617,183 crafts, so 2,468,734 Straw = 45.7 hrs
  at 54,000/hr, not 60.3. Arrowhead price still unanswered.

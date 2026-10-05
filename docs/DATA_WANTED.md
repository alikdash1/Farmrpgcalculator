# Data wanted

Ordered by how much each one changes an answer. Tier 1 is worth more than the
rest combined: without a cap, a rate is not an answer, and these are the caps.

Paste anything back in any shape — raw numbers, a screenshot's text, a mess.
Parsing it is cheap; guessing it is what breaks plans.

---

## Tier 1 — the caps

Every wrong answer this project has produced was a rate quoted without its
limit. These are the limits.

**1. Craftworks — resolved.**
There is no daily ceiling. It runs every few seconds while ingredients are in
inventory; the paid slot count is a queue/QoL limit. Supply and inventory
rounds, not Craftworks throughput, set the duration.

**2. Inventory cap — read it from the newest full capture.**
It grows daily, so no prose value is permanent. `tools/prepare.mjs` infers it
from several full stacks in the newest snapshot and reports the source/date.

**3. Farm production, per building.**
How much each makes and how often: **Sawmill** (wood, boards), **Hay Field**
(straw), **Quarry** (stone, coal), **Steelworks** (steel, wire), **Vineyard**
(grapes), **Orchard** (apples, oranges, lemons), **Cow Pasture** (milk),
**Chicken Coop** (eggs), **Trout Farm**, **Worm Habitat**, **Pig Pen**.
→ Milk and Eggs currently show as "no source in the data". Grapes at 344,828
is the single biggest line in Distant Illusions I and I cannot say how many
days that is.

**4. Wishing Well — resolved for this account.**
30 tosses per day. One returned item per successful toss, doubled by Reflecting
Pool, so at most 60 returned items/day before the outcome chance is applied.

**5. Stamina and effectiveness.**
Daily max stamina is 103,834 as of 2026-10-05. Exploring effectiveness still
varies by location and is stored in `frpg_location_effort_v1`; it must be
entered or captured for exact Cider/stamina answers.

---

## Tier 2 — fresh captures

Use one full current snapshot. Each new same-day snapshot overwrites the prior
same-day file; planning tools automatically select the newest dated snapshot.

**6. Inventory** — the netting on every number uses August stock.
**7. Quests** — what is done and what is available now.
**8. Farm and Farmhouse** — partially known: 48 crop plots, 800,000 farmhouse
stamina/day, and the orchard numbers below. Other building captures still help.
**9. Pets** — levels, and which items each pet has unlocked.

---

## Tier 3 — decisions only you can make

**10. Which questlines do you actually intend to finish?**
There are **172 open lines, 527 steps**, and the biggest are `frank's pranks`
and `Deck The Town With Bats And Lanterns`. The planner is currently ranking
places across all of it.
→ A list of 5–10 lines turns the ordering from noise into a plan. **Cheapest
big improvement available.**

**11. Goal order — resolved.**
T350 is the long-term goal. Current checkpoint: T300, then PSA and Distant
Illusions, then continue the Tower push.

**12. Does your Pig Pen give Bacon?** → deletes 214,000 AP.

**13. Amber — any route other than Misty Forest?**
buddy.farm says **Lemur at level 6 collects Amber**. Do you have that, and how
much does it give? → 374k AP hangs on this, and Amber cannot be mailed.

**14. What you pay.** The community checker at
`https://farmrpg-pricecheck.free.nf/` supplies current ranges, but the owner's
actual quoted deal overrides it. Variable buying/selling means AP/day remains
unknown unless the owner gives a budget for the specific plan.

---

## Tier 4 — gaps to fill when convenient

**15. Wishing Well — how many come back per toss.**
The wiki has no quantity column. Toss 10 of something and count what returns.
One measurement prices every Well route.

**16. Chest payouts.** Open one each of Small Chest 01/02, Medium Chest 02,
Large Chest 01/02 and write down what came out. This is published nowhere, and
it decides whether your 13,000 Large Chest 02 are worth their Locksmith cost.

**17. Pet collections.** Amount per collection, the cooldown, and how level
changes it. Without these, Crunchy Omelette's +50% multiplies nothing.

**18. Exchange Center — the full table.** Five rates are known and two of them
already changed plans: 250 Acorn gives 125 Grapes, 40 Gold Leaf gives 50 Gold
Feather.

---

## Also worth recording

Whenever a number here turns out wrong, say so — corrections go in
`KNOWN_MISTAKES.md` and into the `farmrpg-progression` skill, so the same
mistake cannot be made twice. Your three catches today (Neigh is not AP, the
Well is capped, Magna Core comes from Compass) are all in there now.

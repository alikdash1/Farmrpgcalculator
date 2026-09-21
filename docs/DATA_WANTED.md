# Data wanted

Ordered by how much each one changes an answer. Tier 1 is worth more than the
rest combined: without a cap, a rate is not an answer, and these are the caps.

Paste anything back in any shape — raw numbers, a screenshot's text, a mess.
Parsing it is cheap; guessing it is what breaks plans.

---

## Tier 1 — the caps

Every wrong answer this project has produced was a rate quoted without its
limit. These are the limits.

**1. Craftworks — crafts per day.**
Distant Illusions is 24m crafting actions and nobody knows how long that is.
Open Craftworks and note how many crafts it runs at once, how long a batch
takes, and any daily ceiling.
→ Turns "24m crafting actions" into a number of days.

**2. Inventory cap — the real one.**
I have been using 17,004 all session on an assumption. Open the inventory page
and read the cap off it, plus the Storehouse level.
→ Decides how many gather-craft rounds every big job takes.

**3. Farm production, per building.**
How much each makes and how often: **Sawmill** (wood, boards), **Hay Field**
(straw), **Quarry** (stone, coal), **Steelworks** (steel, wire), **Vineyard**
(grapes), **Orchard** (apples, oranges, lemons), **Cow Pasture** (milk),
**Chicken Coop** (eggs), **Trout Farm**, **Worm Habitat**, **Pig Pen**.
→ Milk and Eggs currently show as "no source in the data". Grapes at 344,828
is the single biggest line in Distant Illusions I and I cannot say how many
days that is.

**4. Wishing Well — exact free tosses a day.**
You said about 30. Which Extra Wish perks do you own, and what does the page
actually say?
→ Every Well route is `qty / (tosses x chance x 2)`. The cap is the whole sum.

**5. Stamina and effectiveness.**
Current stamina cap, and your exploring effectiveness per location. Which
Wanderer tiers, Lemon Squeezer, Iron Depot, Cinnamon Sticks you have.
→ Every cider and stamina figure I have given is a default-perks estimate.

---

## Tier 2 — fresh captures

Everything on disk is from **26–27 August**. One extension click each.

**6. Inventory** — the netting on every number uses August stock.
**7. Quests** — what is done and what is available now.
**8. Farm and Farmhouse** — fills tier 1 item 3 automatically.
**9. Pets** — levels, and which items each pet has unlocked.

---

## Tier 3 — decisions only you can make

**10. Which questlines do you actually intend to finish?**
There are **172 open lines, 527 steps**, and the biggest are `frank's pranks`
and `Deck The Town With Bats And Lanterns`. The planner is currently ranking
places across all of it.
→ A list of 5–10 lines turns the ordering from noise into a plan. **Cheapest
big improvement available.**

**11. Goal floor — 300 or 340?**
`personal-tower.js` says 340; the tool defaults to 300 and finds only 2
masteries owed. To 340 the list is far longer and reorders everything.

**12. Does your Pig Pen give Bacon?** → deletes 214,000 AP.

**13. Amber — any route other than Misty Forest?**
buddy.farm says **Lemur at level 6 collects Amber**. Do you have that, and how
much does it give? → 374k AP hangs on this, and Amber cannot be mailed.

**14. What you pay.** Arnold Palmer, Apple Cider, OJ — your real prices, and
what you sell into. The AP price is missing from the shop data entirely.
→ Turns every AP figure into gold and makes buy-versus-farm decidable instead
of a judgement call.

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

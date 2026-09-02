# Farm RPG mechanics review — please check my calculator's assumptions

I'm building a Farm RPG planning tool called **Lantern Ledger**. It answers one
question: *what does it actually cost to get an item, in the currency I really
spend?* It's built for endgame play — Grand Mastery (100,000), Mega Mastery
(1,000,000), and Tower floors T301–T340.

An AI assistant has been doing the coding. It fixed a lot of real structural
bugs, but it does **not** actually know Farm RPG — it's been working from a data
file someone else built, and several of the game rules baked into that file are
marked "unverified" or are outright guesses.

**What I want from you: explain these mechanics properly, and tell me which of
my assumptions below are wrong.** Please explain the actual game rule in each
case, not just yes/no — I want to understand the mechanics myself, not just
patch numbers. Where you're not certain, say so plainly rather than guessing.
Confidently wrong is much worse than "I don't know" here.

---

## Part 1 — What was just changed, so you know the state of the tool

These were all **structural** fixes. None of them settled a game rule:

1. **A quantity bug.** Ingredient "decision cards" were sized against the fully
   expanded recipe tree instead of the plan actually shown. Glass Orb displayed
   "× 12m" next to a shopping list asking for 8m — 8m via Steel, plus 4m via
   Red Dye → Glass Bottle, except Red Dye is bought, so that second branch never
   happens. Now consistent at 8m everywhere.
2. **52 dead buttons** on the Tower page — items the planner has no data for
   looked clickable but did nothing.
3. **Fished and explored items were labelled as crafts.** The routing was
   correct; only the labels were wrong. Each step now says "fish for it",
   "explore for it", "buy in trade", and so on.
4. **Cider vs Arnold Palmer** now shows its working instead of just announcing a
   winner. This is the part I most doubt — see Part 3.
5. A lot of developer-facing wording replaced with player wording.

---

## Part 2 — Every game rule currently baked into the tool

Please correct anything wrong, and explain the real mechanic behind it.

### Exploring, stamina and drinks — the part I trust least

| Value | Assumed | Marked in the data as |
|---|---|---|
| Stamina per explore | 1 | **unverified** |
| Apple Cider | 1000 "item rolls" each | verified |
| Cinnamon Sticks | Cider 25% more effective | verified |
| Arnold Palmer | 200 items each | verified |
| Lemon Squeezer | AP finds 500 instead of 200 | verified |
| Lemonade | 10 items, 20 with Lemon Squeezer | verified |
| Wanderer I–IV | 20% less stamina while exploring | verified |
| Neigh (meal) | Cider uses 20% less stamina | verified |
| Quandary Chowder | +10% Lemonade / AP output | verified |
| Orange Juice | restores 100 stamina | verified |

The formula it uses for a single exploring route:

```
ciderUses = explores / (1000 x cinnamonMultiplier)
stamina   = explores x staminaPerExplore x neighMultiplier
oj        = stamina / 100
apUses    = explores / (apItems x quandaryMultiplier)

costOfCider = ciderUses x priceOfCider  +  oj x priceOfOJ
costOfAP    = apUses x priceOfAP
```

**Questions:**

1. Is "1 explore = 1 stamina" right? Does it scale with anything?
2. **Does Apple Cider itself consume stamina, or does it substitute for it?**
   The model charges Cider *both* the bottle price *and* the full stamina of
   every explore it covers. Is that double-counting?
3. **Does Arnold Palmer consume stamina at all?** The model assumes zero, which
   is the only reason AP can ever win. Is that correct?
4. Is "1 Cider = 1000 item rolls" the right way to think about Cider, or does
   Cider work differently — a percentage boost, a duration, a multiplier on
   finds?
5. **How do stamina reductions actually stack?** The model knows only Wanderer
   (20%) and Neigh (20%), multiplying out to 64% of normal. I think my real
   figure is nearer **50%**, but I'm not sure and I don't know the rule. What
   else reduces stamina — perks, artifacts, Farm Supply, meals, levels? Do they
   multiply or add?
6. Is comparing Cider and AP **in gold** even the right frame? Is one of them
   simply what you should always use at endgame regardless of price?

### Acorn Pie

Assumed:

- Lasts **150 actions**.
- Adds Hide **outside the Forest** only (Hide already drops in the Forest).
- The Hide rate varies by location and by bulk method, so the tool refuses to
  guess it and asks me to record my own runs.
- With Cabbage Stew (5 Ciders per click) or Lemon Cream Pie (5 APs per click),
  **five drinks = one action = one Acorn charge**, not five charges.

Is all of that right? How does the Hide rate actually work — is it a flat
overlay, or does it interact with the location's own drop table?

### Fishing

- Fishing Net: 10 items, 15 with Reinforced Netting.
- Large Net: 250 base → 400 with Reinforced Netting → **500** with Trigon Knot.
- Sea Pincher Special: +10% net effectiveness — **unverified**, a community
  guess.

Correct? Does Sea Pincher affect Nets, Large Nets, or both, and by how much?
Does anything else raise the catch?

### Crafting

- Artisan I–IV (50%) + Toolbox I (10%) + Odthorin's Charm (10%) cut Workshop
  **silver** cost. The model adds these to 70%, then caps the total cut at
  **75%** as a pure safety guess because it doesn't know the real stacking rule.
- Resource Saver I (10%) + Resource Saver II (15%) + Headdress of Luna (20%)
  give extra crafted output, added to **1.45x**.
- Ashes of Pentagorn: cooking uses 10% fewer ingredients.

**How do these actually stack — additive or multiplicative?** Is 1.45x right for
the full set? Is there a real cap on the silver reduction, and if so what is it?

### Mastery and the Tower

- Grand Mastery = 100,000. Mega Mastery = 1,000,000.
- **Pumpkin Juice** gives +10% mastery, so the tool says you can stop at
  **909,091** and the bonus carries you to 1m. It applies this to exactly nine
  items: Pitchfork, Salt, Fancy Pan Flute, Wrench, Red Trunk, Water Lily,
  Wizard Hat, Jade Charm, Fancy Guitar.
- Mushroom Stew: +10% mastery for 5 minutes; shown for planning but changes no
  material totals.

**Questions:**

7. Is the 909,091 stopping point real? Does Pumpkin Juice's +10% apply to
   mastery counts like that?
8. **Why only those nine items?** That list looks arbitrary. Should it apply to
   every craftable mastery, or is there a real reason it's restricted?
9. Tower floors T301–T340 have **"100 AK" hardcoded identically on every one of
   the 40 floors**, alongside a silver cost rising 60.2b → 68b and a minimum-MM
   count rising 51 → 60. Is the AK cost really flat across all 40 floors? And
   what is AK?

### Passive production and infrastructure

- **Iron Depot** auto-buys Iron and Nails with silver, so the tool treats both
  as effectively free and removes them from the shopping list entirely.
- **Sawmill**: Wood and Boards hourly. **Hickory Omelette** adds six 20% ticks
  during its hour.
- **Quarry**: Stone on a 10-minute cycle; Coal only an occasional extra.
- Crops: Quicker Farming I–IV + Irrigation I–II = 80% growth reduction, plus
  Diary of O'Dynn cutting another 10% of base time.
- Crop yield assumed **1 harvested per seed planted** — unverified.

Are these right? In particular: does inventory capacity / voiding matter enough
that treating Sawmill output as free is wrong?

### Selling and trade

- Bahltruvian Scales (10%) + Fertilizer I (10%) + Negotiator I–IV (20%) → items
  sell for **1.4x** silver, added together. Correct?
- Shrimp-a-Plenty: +10% at Market for 5 minutes.
- Trade prices come from Price Check, where **`/k` means per 1,000**. Arnold
  Palmer's gold price has been seen at 40, 45, 60, 65 and 70 gold per 1,000 at
  different times, so nothing hard-codes it.

### Runecube

Listed as "boosts some rare drops; only used where the exact formula is known" —
meaning the tool currently does nothing with it at all. What does Runecube
actually do, and is it modellable?

---

## Part 3 — The specific thing that made me doubt the tool

The planner has a setting: *"Exploring drink: Auto — whichever is cheaper"*.

It **always picks Apple Cider**. Cider is cheaper per bottle, but **it uses
stamina** and Arnold Palmer (I believe) doesn't — so my instinct is that the two
should be much closer than the tool says, or that AP might even win.

With no perks enabled the tool says Cider is 2.6x cheaper than AP. With the full
endgame perk set enabled that narrows sharply — 5.5k vs 7.17k gold for the same
job — which tells me the comparison is extremely sensitive to Lemon Squeezer,
Cinnamon Sticks and Wanderer.

**Please explain how Apple Cider and Arnold Palmer actually differ mechanically
at endgame, and which one an experienced player should use for bulk exploring,
and why.** If the honest answer is "it depends on X", tell me what X is so I can
put it into the tool.

---

## What I'd like back

1. A plain explanation of each mechanic above — I want to understand the game,
   not just receive corrected numbers.
2. A clear list of **which of my assumptions are wrong**, with the right value
   or the right formula.
3. Anything **important the tool doesn't model at all** and should.
4. For anything you're unsure of, say so. I'd rather have a gap I know about
   than a number I wrongly trust — this project has already been burned by
   confident wrong answers about game mechanics.

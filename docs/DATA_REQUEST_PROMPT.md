# Prompt to gather the missing Farm RPG data

Paste the block below into ChatGPT (or any assistant with web access). Ask it
to answer in one message per section so the results can be pasted back here and
turned into data files.

The gaps it covers are the ones confirmed absent from the knowledge pack:
Wishing Well, bag and chest payouts, dailies, pet collections, Exchange Center
rates, shop prices and quest rewards.

---

## The prompt

> You are gathering reference data about the browser game **Farm RPG**
> (farmrpg.com). Use the community wiki at **buddy.farm** and the in-game wiki
> at `farmrpg.com/#!/wiki.php?page=...` as sources.
>
> Rules, all of them important:
> - **Only report what a source actually states.** If you cannot find a number,
>   write `UNKNOWN` for it. Never estimate, never interpolate, never round a
>   guess into a figure.
> - **Cite the page** you took each number from, as a URL.
> - **State the unit explicitly** every time. Farm RPG data has two different
>   exploring units in circulation — *drops per Arnold Palmer* and *explores
>   per drop* — and mixing them silently ruins everything downstream. Say which
>   one you mean on every rate.
> - Output **JSON**, one object per section, with an `unknown` array listing
>   anything you could not find.
>
> Gather these seven sections:
>
> **1. Wishing Well.** The two in-game wiki pages that hold this are
> `farmrpg.com/index.php#!/wiki.php?page=WW+Drops+Table` and
> `...?page=WW+Wants`. Reproduce **both tables in full**: every item that can be
> thrown in, exactly what comes back, and the odds or quantity for each
> outcome. Also find the **Tower perk that doubles Wishing Well output** - its
> name, which floor grants it, and whether the wiki's numbers are stated before
> or after that doubling. Note any daily limit on throws.
>
> Confirmed already, for cross-checking: Compass returns Magna Core at 100%,
> one for one, so 30 Compass gives 60 with the perk doubled; a Large Chest 02
> returns a Small Key, Square Key or Treasure Key at 33.3% each.
>
> **2. Chest and bag payouts.** For each of Small Chest 01, Small Chest 02,
> Large Chest 01, Large Chest 02, Grab Bag 01 through 07, Cornucopia 01, Borgen
> Bag 01, Bug Bag 01, Drink Bundle and any similar container: what you receive
> when you open it, with quantity ranges and odds, and separately what it costs
> to unlock. Make the distinction sharp — unlock costs are already known and
> payouts are not.
>
> **3. Dailies and streaks.** The daily reward table, any login streak rewards,
> the daily quest system and anything that resets on a timer, including the
> Daily Grapes.
>
> **4. Pets.** Every pet, what it produces, how much per collection, the
> collection cooldown, and how pet level or friendship changes the amount.
> Also confirm what Crunchy Omelette's "+50% items collected from pets for 2
> minutes" applies to.
>
> **5. Exchange Center and Borgen.** Every exchange rate: what you give, what
> you get, and how many. Include the VIP Card and Borgen Buck economy.
>
> **6. Shops.** Every item buyable for silver or gold, with its price, and
> which shop sells it. Note anything limited per day.
>
> **7. Quest rewards.** For the questlines **Distant Illusions**, **Secretly A
> Society Summons You**, **Archeology Requires Knowhow** and **The Masonry
> Requires Attention**: the rewards for each step. Only what the source states.
>
> Finish with a single list titled **NOT FOUND** naming every field you had to
> mark UNKNOWN, so the gaps are explicit.

---

## What to do with the answer

Paste the JSON back into a session with the `farmrpg-progression` skill. It
becomes `data/*.js` files with a `source` and `capturedAt` on each, the same
shape as `data/workbook-rates.js`, and `references/data-map.md` gets its
"What is NOT in the data" list trimmed by however much arrived.

Anything still marked UNKNOWN stays on that list. A known gap is useful; a
guessed number is not.

# Farm RPG Calculator Account Sync

## Saving to disk (v1.3)

The snapshot is written to **one** file, `farm-rpg-calculator-account-snapshot.json`
in your Downloads folder, and each save **overwrites** it. The old export used a
blob link, so the browser kept every previous copy and added `(1)`, `(2)`, … —
that is what produced the pile of near-identical files.

Leave **"Keep that file updated after every capture"** ticked and the file always
matches what the extension has captured, with no duplicates. Untick it to save
only when you press the button.

This Brave/Chrome extension keeps Farm RPG Calculator updated from the Farm RPG account pages you actually visit. It is read-only: it does not click, navigate, craft, sell, explore, fish, trade, or send account data to a server.

## Install or update in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select:
   `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-sync-extension`
4. If it was already installed, press **Reload** on the extension card after every update.
5. Open Farm RPG and refresh the game tab once.
6. Visit account pages normally. The small **Account sync** pill confirms what was saved.
7. Open Farm RPG Calculator at `http://127.0.0.1:8772/index.html#account`.

## Account sections

The popup tracks twelve core sections independently:

- Profile
- Inventory
- Tower
- Masteries
- Available quests
- Completed quests
- Perks
- Farm Supply
- Pets
- Craftworks
- Kitchen
- Friendships

A page that is still loading cannot replace a complete saved Mastery, Inventory, Tower, Profile, Perks, Farm Supply, Friendship, Kitchen, or other protected capture. The extension retries a loading page up to three times.

Existing captures made by version 1.1 are migrated when possible. In particular, Pets, Craftworks, Kitchen, and Friendship captures that were incorrectly stored as `unknown` are recovered from their saved page label.

## Local and hosted calculators

Automatic live sync is limited to Farm RPG, your local Farm RPG Calculator address, and **one** hosted address: `https://alikdash1.github.io/Farmrpgcalculator/*` (added in v1.10). Not all of github.io — just this site.

- Default calculator: `https://alikdash1.github.io/Farmrpgcalculator/index.html`
- Change it from the popup under **Local calculator and data controls** (localhost and file addresses still work).
- **Sync to the website is private.** The extension hands the snapshot to the open page inside your own browser, the same way it does locally. Nothing is uploaded or committed, so other people see the plain site and other devices do not get your captures.
- Any other hosted copy: choose **Save account snapshot to Downloads**, then load that JSON file from the **Account** tab.

If you open Farm RPG Calculator through a `file:///` address, enable **Allow access to file URLs** on the extension’s Details page.

## Troubleshooting

- **Collector unavailable:** reload the Farm RPG tab after reloading the extension.
- **Page still loading:** leave the account page open; the extension retries automatically. Press **Sync** after the page finishes if needed.
- **Old Tower/Mastery values:** open that exact Farm RPG page and press **Sync**. The newest complete capture wins.
- **Duplicate or missing sections:** reload version 1.2, open the popup once to run migration, then revisit any section still listed as missing.
- **Website does not update live:** press **Reload** on the extension card (v1.10 or later is needed), then reload the website tab.

## Keeping it current (v1.3)

The popup now lists all twelve sections with **how old each capture is** and an
**Open** button that reopens the exact Farm RPG page that section came from. A
page captures itself once it finishes loading, so refreshing everything is a few
clicks — no remembering which screen feeds which numbers.

The extension deliberately does **not** navigate the game for you. It only reads
pages you open yourself, which is why anything you have not visited recently
shows its real age rather than pretending to be up to date.

Live sync while you play: leave Farm RPG Calculator open in a tab. Every capture is
pushed to it immediately, so the Tower and Quests pages update as you browse.

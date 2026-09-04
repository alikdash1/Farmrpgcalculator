# Lantern Ledger Account Sync

## Saving to disk (v1.3)

The snapshot is written to **one** file, `lantern-ledger-account-snapshot.json`
in your Downloads folder, and each save **overwrites** it. The old export used a
blob link, so the browser kept every previous copy and added `(1)`, `(2)`, … —
that is what produced the pile of near-identical files.

Leave **"Keep that file updated after every capture"** ticked and the file always
matches what the extension has captured, with no duplicates. Untick it to save
only when you press the button.

This Brave/Chrome extension keeps Lantern Ledger updated from the Farm RPG account pages you actually visit. It is read-only: it does not click, navigate, craft, sell, explore, fish, trade, or send account data to a server.

## Install or update in Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select:
   `C:\Users\user\Desktop\FarmRPG Calculator Research\calculator\collectors\account-sync-extension`
4. If it was already installed, press **Reload** on the extension card after every update.
5. Open Farm RPG and refresh the game tab once.
6. Visit account pages normally. The small **Account sync** pill confirms what was saved.
7. Open Lantern Ledger at `http://127.0.0.1:8772/index.html#account`.

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

Automatic live sync is intentionally limited to Farm RPG and your local Lantern Ledger address. This keeps extension permissions narrow.

- Default local calculator: `http://127.0.0.1:8772/index.html`
- Change the local port/address from the popup under **Local calculator and data controls**.
- For a hosted calculator, choose **Save account snapshot to Downloads**, then load that single JSON file from Lantern Ledger’s **Account** tab.
- After the final public domain is chosen, that one exact domain can be added for automatic sync without granting access to every website.

If you open Lantern Ledger through a `file:///` address, enable **Allow access to file URLs** on the extension’s Details page.

## Troubleshooting

- **Collector unavailable:** reload the Farm RPG tab after reloading the extension.
- **Page still loading:** leave the account page open; the extension retries automatically. Press **Sync** after the page finishes if needed.
- **Old Tower/Mastery values:** open that exact Farm RPG page and press **Sync**. The newest complete capture wins.
- **Duplicate or missing sections:** reload version 1.2, open the popup once to run migration, then revisit any section still listed as missing.
- **Hosted site does not update live:** export the complete snapshot and import it manually until the final domain is added.

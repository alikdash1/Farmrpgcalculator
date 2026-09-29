# Farm RPG Calculator Account Sync

Keeps [Farm RPG Calculator](https://alikdash1.github.io/Farmrpgcalculator/) filled
with your own account, from the Farm RPG pages you actually visit.

It is read-only. It does not click, navigate, craft, sell, explore, fish or
trade, and it has no network code: nothing it reads leaves your browser.

## Install

1. Unzip `farm-rpg-account-sync.zip` somewhere you will keep it. The browser
   runs the extension from that folder, so do not delete it.
2. Open `chrome://extensions` — or `brave://extensions`, `edge://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the `farm-rpg-account-sync` folder.
5. If you open the planner from a file on your disk, open **Details** and switch
   on **Allow access to file URLs**.
6. Open Farm RPG and refresh the game tab once.
7. Open the planner in another tab and leave it open. Its Account page says
   when the two have found each other.

Visit your profile, Inventory, Tower, Mastery, Quests and farm pages once each.
After that, the pages you visit while playing keep everything fresh.

## Update

Download the new zip, replace the folder's contents, and press **Reload** on the
extension's card.

## Saving to disk

Nothing is written unless you ask. **Save account snapshot to Downloads**
writes one file, `farm-rpg-calculator-account-snapshot.json`, and each save
overwrites it rather than piling up numbered copies. Tick **Keep that file
updated after every capture** to have it rewritten automatically.

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

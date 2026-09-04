// Farm RPG renames some questlines partway through. The pirate saga is the
// worst case: it starts as "Problems Start Arising", becomes "Pirates Start
// Arriving", then "Problems Still Abound", then four different Masonry titles
// and "You Must Build A Stealth Boat" — but the roman numerals run straight
// through, and each step lists the one before it as its prerequisite. Farm RPG
// treats it as one chain, so this file stitches it back into one.
//
// The order below is the prerequisite chain read out of data/main-quests.js,
// not a guess; it matches the column order of the player-shared requirement
// sheet exactly.
window.FRPG_QUEST_SAGAS = {
  schema: "farmrpg-quest-sagas-v1",
  updated: "2026-09-04",
  sagas: [
    {
      name: "Problems Start Arising",
      category: "side",
      aka: [
        "Pirates Start Arriving",
        "Problems Still Abound",
        "The Masonry Requires Attention / Action / Activity",
        "Augment Redbrook Through Masonry",
        "Rage Against Tattered Masonry",
        "The Ramparts Mended Anew",
        "You Must Build A Stealth Boat",
        "Pirate Stealth Arrival"
],
      note: "One 29-step pirate chain that changes its name as it goes. Every step needs the one before it, so treat it as a single run.",
      lines: [
        "Problems Start Arising",
        "Pirates Start Arriving",
        "The Masonry Requires Attention",
        "Problems Still Abound",
        "The Masonry Requires Action",
        "Augment Redbrook Through Masonry",
        "You Must Build A Stealth Boat",
        "Rage Against Tattered Masonry",
        "The Masonry Requires Activity",
        "The Ramparts Mended Anew",
        "Pirate Stealth Arrival"
],
      order: [
        "Problems Start Arising I",
        "Problems Start Arising II",
        "Problems Start Arising III",
        "Problems Start Arising IV",
        "Problems Start Arising V",
        "Pirates Start Arriving VI",
        "Pirates Start Arriving VII",
        "Pirates Start Arriving VIII",
        "Pirates Start Arriving IX",
        "Pirates Start Arriving X",
        "Pirates Start Arriving XI",
        "Pirates Start Arriving XII",
        "Pirates Start Arriving XIII",
        "Pirates Start Arriving XIV",
        "Pirates Start Arriving XV",
        "Pirates Start Arriving XVI",
        "Pirates Start Arriving XVII",
        "The Masonry Requires Attention XVIII",
        "Pirates Start Arriving XIX",
        "Problems Still Abound XX",
        "The Masonry Requires Action XXI",
        "Problems Still Abound XXII",
        "Augment Redbrook Through Masonry XXIII",
        "You Must Build A Stealth Boat I",
        "Rage Against Tattered Masonry XXIV",
        "You Must Build A Stealth Boat II",
        "The Masonry Requires Activity XXV",
        "You Must Build A Stealth Boat III",
        "The Ramparts Mended Anew XXVI",
        "You Must Build A Stealth Boat IV",
        "Pirate Stealth Arrival XXVII",
        "Pirate Stealth Arrival XXVIII"
],
      // Step XXIX is in the shared requirement sheet but has not appeared in
      // the quest database yet, so its real title is unknown. It is listed
      // last, clearly marked, rather than left out — the item bill is the part
      // worth planning against.
      pending: [
        {
          label: "Step XXIX",
          sourceNote: "From the shared requirement sheet; not yet in the quest database, so the in-game title is unknown.",
          requirements: [
          {
                    "item": "Amber Cane",
                    "quantity": 1
          },
          {
                    "item": "Dragon Skull",
                    "quantity": 1
          },
          {
                    "item": "Emerald Ring",
                    "quantity": 10000
          },
          {
                    "item": "Fancy Chair",
                    "quantity": 1
          },
          {
                    "item": "Fancy Clock",
                    "quantity": 1
          },
          {
                    "item": "Fancy Sword",
                    "quantity": 1
          },
          {
                    "item": "Fancy Table",
                    "quantity": 1
          },
          {
                    "item": "Fancy Violin",
                    "quantity": 1
          },
          {
                    "item": "Flying Machine",
                    "quantity": 1
          },
          {
                    "item": "Garnet Ring",
                    "quantity": 10000
          },
          {
                    "item": "Gold Potato",
                    "quantity": 1
          },
          {
                    "item": "Grand Piano",
                    "quantity": 1
          },
          {
                    "item": "Heart Container",
                    "quantity": 1
          },
          {
                    "item": "Hourglass",
                    "quantity": 10000
          },
          {
                    "item": "Jade Charm",
                    "quantity": 10000
          },
          {
                    "item": "Joker",
                    "quantity": 25
          },
          {
                    "item": "Lemon Quartz Ring",
                    "quantity": 10000
          },
          {
                    "item": "Lima Bean",
                    "quantity": 1
          },
          {
                    "item": "Magic Conch Shell",
                    "quantity": 1
          },
          {
                    "item": "Magna Quartz",
                    "quantity": 1
          },
          {
                    "item": "Mystic Ring",
                    "quantity": 10000
          },
          {
                    "item": "Red Trunk",
                    "quantity": 10000
          },
          {
                    "item": "Seashell Necklace",
                    "quantity": 10000
          },
          {
                    "item": "Shimmer Ring",
                    "quantity": 10000
          },
          {
                    "item": "Ship in a Bottle",
                    "quantity": 1
          },
          {
                    "item": "Spiky Bracelet",
                    "quantity": 10000
          },
          {
                    "item": "Treasure Chest",
                    "quantity": 10000
          },
          {
                    "item": "Winged Amulet",
                    "quantity": 1000
          }
]
        }
      ],
      source: "In-game prerequisites in data/main-quests.js, cross-checked against a player-shared requirement sheet (2026-09-04)"
    }
  ]
};

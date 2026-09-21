// The Wishing Well, container payouts and the daily systems.
//
// Source: the in-game wiki pages WW Drops Table and WW Wants, last updated
// March 13rd, 2026, plus buddy.farm for containers and dailies.
// Gathered 2026-09-21 through docs/DATA_REQUEST_PROMPT.md.
//
// UNITS. `chance` is the probability of that outcome per toss, 0 to 1. The
// wiki has no quantity column, so HOW MANY come back per toss is unknown for
// every row. The Reflecting Pool perk doubles the returned quantity, not the
// chance, so these chances are the same with or without it.
//
// READ THIS BEFORE USING ANY OF IT. The Well is capped at about **30 tosses a
// day**. That makes it a source of *kinds* of item, never of *quantities*, and
// the chances below are worthless without that cap in front of them:
//
//   Magna Core   2,759 needed, Compass at 100%, doubled = 60/day = 46 days. Fine.
//   Spiked Shell 30,000 needed, Salt at 50%, doubled = 30/day = 1,000 days. Absurd.
//
// So the Well is only worth planning around for:
//   1. items with no other source at all - Magna Core is the case that matters,
//      because it needs a Seeing Stone and a Seeing Stone has no source, no
//      recipe and no trade, so the Well is the only way one ever exists;
//   2. small quest quantities, in the tens or low hundreds;
//   3. a modest bonus on something you happen to be holding anyway.
//
// Never propose it for a bulk item. Always divide by 30 tosses a day and say
// how many days it would take before suggesting it.
window.FRPG_WISHING_WELL = {
  schema: "farmrpg-wishing-well-v1",
  source: "in-game wiki WW Drops Table and WW Wants",
  sourceUpdated: "March 13rd, 2026",
  capturedAt: "2026-09-21",
  // One item back per toss, doubled by Reflecting Pool. With 30 tosses a day
  // that is at most 60 items daily, whatever the chance column says.
  quantityPerToss: 1,
  effectivePerDay: 60,

  // Magic Mirror artifact, Tower floor 140. Doubles the quantity returned.
  perk: {
    name: "Reflecting Pool",
    artifact: "Magic Mirror",
    towerFloor: 140,
    multiplier: 2,
    appliesTo: "returned item quantity, not the listed chance",
  },

  // Free tosses per server day. About 30 all in, per the account owner. This
  // is the number that decides whether a Well route is worth anything.
  dailyLimit: {
    total: 30,   // confirmed by the account owner
    base: null,
    perks: [{"perk":"Extra Wish","adds":1},{"perk":"Extra Wishes","adds":5},{"perk":"Extra Wishes II","adds":10},{"perk":"Extra Wishes III","adds":10}],
    perkTotal: 26,
  },

  // What you get for tossing something in.
  throwIn: {
    "4-leaf Clover": [
      {
        "get": "MIAB",
        "chance": 0.333
      },
      {
        "get": "Small Flute",
        "chance": 0.333
      },
      {
        "get": "Wooden Mask",
        "chance": 0.333
      }
    ],
    "Ancient Coin": [
      {
        "get": "Captains Log",
        "chance": 0.083
      },
      {
        "get": "Cogwheel",
        "chance": 0.083
      },
      {
        "get": "Eye Patch",
        "chance": 0.083
      },
      {
        "get": "Freaky Picture",
        "chance": 0.083
      },
      {
        "get": "Giant Centipede",
        "chance": 0.083
      },
      {
        "get": "Octopus",
        "chance": 0.083
      },
      {
        "get": "Orange Gecko",
        "chance": 0.083
      },
      {
        "get": "Shiny Beetle",
        "chance": 0.083
      },
      {
        "get": "Small Gear",
        "chance": 0.083
      },
      {
        "get": "Small Screw",
        "chance": 0.083
      },
      {
        "get": "Snail",
        "chance": 0.083
      },
      {
        "get": "Wax Candle",
        "chance": 0.083
      }
    ],
    "Antler": [
      {
        "get": "Arrowhead",
        "chance": 0.333
      },
      {
        "get": "Bird Egg",
        "chance": 0.333
      },
      {
        "get": "Pine Cone",
        "chance": 0.333
      }
    ],
    "Apple Cider": [
      {
        "get": "Iced Tea",
        "chance": 0.333
      },
      {
        "get": "Lemonade",
        "chance": 0.333
      },
      {
        "get": "Orange Juice",
        "chance": 0.333
      }
    ],
    "Aquamarine": [
      {
        "get": "Amethyst",
        "chance": 0.25
      },
      {
        "get": "Emerald",
        "chance": 0.25
      },
      {
        "get": "Lemon Quartz",
        "chance": 0.25
      },
      {
        "get": "Ruby",
        "chance": 0.25
      }
    ],
    "Bacon": [
      {
        "get": "Gold Feather",
        "chance": 0.333
      },
      {
        "get": "Gold Leaf",
        "chance": 0.333
      },
      {
        "get": "Magicite",
        "chance": 0.333
      }
    ],
    "Belt Drive": [
      {
        "get": "Energy Coil",
        "chance": 0.333
      },
      {
        "get": "Metal Spool",
        "chance": 0.333
      },
      {
        "get": "Spool of Copper",
        "chance": 0.333
      }
    ],
    "Block of Wood": [
      {
        "get": "Carved Bear",
        "chance": 0.063
      },
      {
        "get": "Carved Camel",
        "chance": 0.063
      },
      {
        "get": "Carved Chicken",
        "chance": 0.063
      },
      {
        "get": "Carved Cow",
        "chance": 0.063
      },
      {
        "get": "Carved Dragon",
        "chance": 0.063
      },
      {
        "get": "Carved Fox",
        "chance": 0.063
      },
      {
        "get": "Carved Kitty",
        "chance": 0.063
      },
      {
        "get": "Carved Moose",
        "chance": 0.063
      },
      {
        "get": "Carved Mouse",
        "chance": 0.063
      },
      {
        "get": "Carved Owl",
        "chance": 0.063
      },
      {
        "get": "Carved Pig",
        "chance": 0.063
      },
      {
        "get": "Carved Rabbit",
        "chance": 0.063
      },
      {
        "get": "Carved Rhino",
        "chance": 0.063
      },
      {
        "get": "Carved Squirrel",
        "chance": 0.063
      },
      {
        "get": "Carved Squisquatch",
        "chance": 0.063
      },
      {
        "get": "Carved Warthog",
        "chance": 0.063
      }
    ],
    "Candy": [
      {
        "get": "Apple",
        "chance": 0.25
      },
      {
        "get": "Lollipop",
        "chance": 0.25
      },
      {
        "get": "Spider",
        "chance": 0.25
      },
      {
        "get": "Taffy",
        "chance": 0.25
      }
    ],
    "Candy Corn": [
      {
        "get": "Egyptian Necklace",
        "chance": 0.333
      },
      {
        "get": "R.O.A.S.",
        "chance": 0.333
      },
      {
        "get": "Taffy",
        "chance": 0.333
      }
    ],
    "Captains Log": [
      {
        "get": "Eye Patch",
        "chance": 0.25
      },
      {
        "get": "Moonstone",
        "chance": 0.25
      },
      {
        "get": "Pirate Flag",
        "chance": 0.25
      },
      {
        "get": "Strange Letter",
        "chance": 0.25
      }
    ],
    "Carved Bear": [
      {
        "get": "Carved Cow",
        "chance": 0.25
      },
      {
        "get": "Carved Fox",
        "chance": 0.25
      },
      {
        "get": "Carved Moose",
        "chance": 0.25
      },
      {
        "get": "Carved Rhino",
        "chance": 0.25
      }
    ],
    "Carved Owl": [
      {
        "get": "Carved Camel",
        "chance": 0.333
      },
      {
        "get": "Carved Rhino",
        "chance": 0.333
      },
      {
        "get": "Carved Warthog",
        "chance": 0.333
      }
    ],
    "Carved Rabbit": [
      {
        "get": "Carved Kitty",
        "chance": 0.25
      },
      {
        "get": "Carved Mouse",
        "chance": 0.25
      },
      {
        "get": "Carved Owl",
        "chance": 0.25
      },
      {
        "get": "Carved Warthog",
        "chance": 0.25
      }
    ],
    "Carved Warthog": [
      {
        "get": "Carved Moose",
        "chance": 0.25
      },
      {
        "get": "Carved Rabbit",
        "chance": 0.25
      },
      {
        "get": "Carved Squirrel",
        "chance": 0.25
      },
      {
        "get": "Carved Squisquatch",
        "chance": 0.25
      }
    ],
    "Caterpillar": [
      {
        "get": "Fire Ant",
        "chance": 0.25
      },
      {
        "get": "Giant Centipede",
        "chance": 0.25
      },
      {
        "get": "Runestone 09",
        "chance": 0.25
      },
      {
        "get": "Shiny Beetle",
        "chance": 0.25
      }
    ],
    "Chattering Teeth": [
      {
        "get": "Candy",
        "chance": 0.25
      },
      {
        "get": "Lollipop",
        "chance": 0.25
      },
      {
        "get": "Treat Bag 01",
        "chance": 0.25
      },
      {
        "get": "Witch Hat",
        "chance": 0.25
      }
    ],
    "Cogwheel": [
      {
        "get": "Pocket Watch",
        "chance": 0.25
      },
      {
        "get": "Small Flute",
        "chance": 0.25
      },
      {
        "get": "Small Screw",
        "chance": 0.25
      },
      {
        "get": "Wooden Mask",
        "chance": 0.25
      }
    ],
    "Compass": [
      {
        "get": "Magna Core",
        "chance": 1
      }
    ],
    "Crab Claw": [
      {
        "get": "Frog",
        "chance": 0.333
      },
      {
        "get": "Orange Gecko",
        "chance": 0.333
      },
      {
        "get": "Sea Dragon",
        "chance": 0.333
      }
    ],
    "Cutlass": [
      {
        "get": "Mug of Beer",
        "chance": 0.333
      },
      {
        "get": "Rubber Duckie",
        "chance": 0.333
      },
      {
        "get": "Shark Tooth",
        "chance": 0.333
      }
    ],
    "Dice": [
      {
        "get": "Bacon",
        "chance": 0.25
      },
      {
        "get": "Small Flute",
        "chance": 0.25
      },
      {
        "get": "Spectacles",
        "chance": 0.25
      },
      {
        "get": "Teapot",
        "chance": 0.25
      }
    ],
    "Dragonfly": [
      {
        "get": "Coal",
        "chance": 0.333
      },
      {
        "get": "Egg 02",
        "chance": 0.333
      },
      {
        "get": "Stone",
        "chance": 0.333
      }
    ],
    "Essence of Slime": [
      {
        "get": "Chum",
        "chance": 0.5
      },
      {
        "get": "Wooden Bow",
        "chance": 0.5
      }
    ],
    "Eye Patch": [
      {
        "get": "Moonstone",
        "chance": 0.25
      },
      {
        "get": "Runestone 01",
        "chance": 0.25
      },
      {
        "get": "Runestone 02",
        "chance": 0.25
      },
      {
        "get": "Spectacles",
        "chance": 0.25
      }
    ],
    "Fire Ant": [
      {
        "get": "Caterpillar",
        "chance": 0.25
      },
      {
        "get": "Giant Centipede",
        "chance": 0.25
      },
      {
        "get": "Horned Beetle",
        "chance": 0.25
      },
      {
        "get": "Runestone 08",
        "chance": 0.25
      }
    ],
    "Fish Biscuit": [
      {
        "get": "Borgen Bag 01",
        "chance": 1
      }
    ],
    "Freaky Picture": [
      {
        "get": "Pirate Flag",
        "chance": 0.25
      },
      {
        "get": "Small Gear",
        "chance": 0.25
      },
      {
        "get": "Small Spring",
        "chance": 0.25
      },
      {
        "get": "Teapot",
        "chance": 0.25
      }
    ],
    "Frog": [
      {
        "get": "Crab Claw",
        "chance": 0.333
      },
      {
        "get": "Orange Gecko",
        "chance": 0.333
      },
      {
        "get": "Sea Dragon",
        "chance": 0.333
      }
    ],
    "Giant Centipede": [
      {
        "get": "Horned Beetle",
        "chance": 0.25
      },
      {
        "get": "Runestone 07",
        "chance": 0.25
      },
      {
        "get": "Shiny Beetle",
        "chance": 0.25
      },
      {
        "get": "Snail",
        "chance": 0.25
      }
    ],
    "Gold Carrot": [
      {
        "get": "Gold Cucumber",
        "chance": 0.25
      },
      {
        "get": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "get": "Gold Peas",
        "chance": 0.25
      },
      {
        "get": "Strange Letter",
        "chance": 0.25
      }
    ],
    "Gold Catfish": [
      {
        "get": "Goldgill",
        "chance": 0.333
      },
      {
        "get": "Goldjack",
        "chance": 0.333
      },
      {
        "get": "Wooden Bow",
        "chance": 0.333
      }
    ],
    "Gold Coral": [
      {
        "get": "Goldfin",
        "chance": 0.5
      },
      {
        "get": "Sturdy Bow",
        "chance": 0.5
      }
    ],
    "Gold Cucumber": [
      {
        "get": "Bacon",
        "chance": 0.333
      },
      {
        "get": "Gold Carrot",
        "chance": 0.333
      },
      {
        "get": "Gold Eggplant",
        "chance": 0.333
      }
    ],
    "Gold Drum": [
      {
        "get": "Gold Catfish",
        "chance": 0.333
      },
      {
        "get": "Gold Trout",
        "chance": 0.333
      },
      {
        "get": "Sturdy Bow",
        "chance": 0.333
      }
    ],
    "Gold Eggplant": [
      {
        "get": "Bacon",
        "chance": 0.25
      },
      {
        "get": "Gold Carrot",
        "chance": 0.25
      },
      {
        "get": "Gold Leaf",
        "chance": 0.25
      },
      {
        "get": "Gold Peas",
        "chance": 0.25
      }
    ],
    "Gold Feather": [
      {
        "get": "Bacon",
        "chance": 0.333
      },
      {
        "get": "Gold Leaf",
        "chance": 0.333
      },
      {
        "get": "Runestone 05",
        "chance": 0.333
      }
    ],
    "Goldfin": [
      {
        "get": "Gold Catfish",
        "chance": 0.333
      },
      {
        "get": "Goldjack",
        "chance": 0.333
      },
      {
        "get": "Gold Trout",
        "chance": 0.333
      }
    ],
    "Gold Flier": [
      {
        "get": "Gold Catfish",
        "chance": 0.333
      },
      {
        "get": "Goldgill",
        "chance": 0.333
      },
      {
        "get": "Gold Sea Bass",
        "chance": 0.333
      }
    ],
    "Goldgill": [
      {
        "get": "Gold Catfish",
        "chance": 0.333
      },
      {
        "get": "Goldfin",
        "chance": 0.333
      },
      {
        "get": "Goldjack",
        "chance": 0.333
      }
    ],
    "Goldjack": [
      {
        "get": "Goldgill",
        "chance": 0.333
      },
      {
        "get": "Goldray",
        "chance": 0.333
      },
      {
        "get": "Gold Sea Bass",
        "chance": 0.333
      }
    ],
    "Gold Leaf": [
      {
        "get": "Gold Feather",
        "chance": 0.333
      },
      {
        "get": "Magicite",
        "chance": 0.333
      },
      {
        "get": "Runestone 07",
        "chance": 0.333
      }
    ],
    "Gold Peas": [
      {
        "get": "Gold Cucumber",
        "chance": 0.25
      },
      {
        "get": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "get": "Gold Feather",
        "chance": 0.25
      },
      {
        "get": "Gold Peppers",
        "chance": 0.25
      }
    ],
    "Gold Peppers": [
      {
        "get": "Gold Carrot",
        "chance": 0.2
      },
      {
        "get": "Gold Cucumber",
        "chance": 0.2
      },
      {
        "get": "Gold Eggplant",
        "chance": 0.2
      },
      {
        "get": "Gold Peas",
        "chance": 0.2
      },
      {
        "get": "Runestone 01",
        "chance": 0.2
      }
    ],
    "Goldray": [
      {
        "get": "Gold Drum",
        "chance": 0.333
      },
      {
        "get": "Gold Flier",
        "chance": 0.333
      },
      {
        "get": "Gold Trout",
        "chance": 0.333
      }
    ],
    "Gold Sea Bass": [
      {
        "get": "Gold Coral",
        "chance": 0.333
      },
      {
        "get": "Goldfin",
        "chance": 0.333
      },
      {
        "get": "Gold Flier",
        "chance": 0.333
      }
    ],
    "Gold Trout": [
      {
        "get": "Gold Flier",
        "chance": 0.333
      },
      {
        "get": "Goldgill",
        "chance": 0.333
      },
      {
        "get": "Goldray",
        "chance": 0.333
      }
    ],
    "Gouda": [
      {
        "get": "Candy Corn",
        "chance": 0.333
      },
      {
        "get": "Chattering Teeth",
        "chance": 0.333
      },
      {
        "get": "Wax Candle",
        "chance": 0.333
      }
    ],
    "Grasshopper": [
      {
        "get": "Bell",
        "chance": 0.5
      },
      {
        "get": "Spider",
        "chance": 0.5
      }
    ],
    "Herbs": [
      {
        "get": "Corn",
        "chance": 0.167
      },
      {
        "get": "Flamejack",
        "chance": 0.167
      },
      {
        "get": "Gold Sea Bass",
        "chance": 0.167
      },
      {
        "get": "Green Jellyfish",
        "chance": 0.167
      },
      {
        "get": "Honey",
        "chance": 0.167
      },
      {
        "get": "Octopus",
        "chance": 0.167
      }
    ],
    "Horned Beetle": [
      {
        "get": "Fire Ant",
        "chance": 0.25
      },
      {
        "get": "Giant Centipede",
        "chance": 0.25
      },
      {
        "get": "Runestone 06",
        "chance": 0.25
      },
      {
        "get": "Shiny Beetle",
        "chance": 0.25
      }
    ],
    "Hummingbird Feeder": [
      {
        "get": "Borgen Bag 01",
        "chance": 1
      }
    ],
    "Jack-o-lantern": [
      {
        "get": "Candy Corn",
        "chance": 0.333
      },
      {
        "get": "Goldfish",
        "chance": 0.333
      },
      {
        "get": "Spider",
        "chance": 0.333
      }
    ],
    "Jade": [
      {
        "get": "Amethyst",
        "chance": 0.25
      },
      {
        "get": "Aquamarine",
        "chance": 0.25
      },
      {
        "get": "Emberstone",
        "chance": 0.25
      },
      {
        "get": "Ruby",
        "chance": 0.25
      }
    ],
    "Large Chest 01": [
      {
        "get": "Small Key",
        "chance": 0.333
      },
      {
        "get": "Square Key",
        "chance": 0.333
      },
      {
        "get": "Treasure Key",
        "chance": 0.333
      }
    ],
    "Large Chest 02": [
      {
        "get": "Small Key",
        "chance": 0.333
      },
      {
        "get": "Square Key",
        "chance": 0.333
      },
      {
        "get": "Treasure Key",
        "chance": 0.333
      }
    ],
    "Lollipop": [
      {
        "get": "Candy",
        "chance": 0.333
      },
      {
        "get": "Spider",
        "chance": 0.333
      },
      {
        "get": "Taffy",
        "chance": 0.333
      }
    ],
    "Magicite": [
      {
        "get": "Gold Leaf",
        "chance": 0.25
      },
      {
        "get": "Runestone 01",
        "chance": 0.25
      },
      {
        "get": "Runestone 02",
        "chance": 0.25
      },
      {
        "get": "Strange Letter",
        "chance": 0.25
      }
    ],
    "Milk and Cookies": [
      {
        "get": "Dancer",
        "chance": 0.25
      },
      {
        "get": "Grab Bag 07",
        "chance": 0.25
      },
      {
        "get": "Holiday Wreath",
        "chance": 0.25
      },
      {
        "get": "Vixen",
        "chance": 0.25
      }
    ],
    "Moonstone": [
      {
        "get": "Runestone 01",
        "chance": 0.25
      },
      {
        "get": "Runestone 02",
        "chance": 0.25
      },
      {
        "get": "Runestone 07",
        "chance": 0.25
      },
      {
        "get": "Strange Letter",
        "chance": 0.25
      }
    ],
    "Old Boot": [
      {
        "get": "4-leaf Clover",
        "chance": 0.333
      },
      {
        "get": "Ancient Coin",
        "chance": 0.333
      },
      {
        "get": "Glass Bottle",
        "chance": 0.333
      }
    ],
    "Orange Gecko": [
      {
        "get": "Crab Claw",
        "chance": 0.333
      },
      {
        "get": "Frog",
        "chance": 0.333
      },
      {
        "get": "Sea Dragon",
        "chance": 0.333
      }
    ],
    "Pine Cone": [
      {
        "get": "Antler",
        "chance": 0.333
      },
      {
        "get": "Horn",
        "chance": 0.333
      },
      {
        "get": "Prism Shard",
        "chance": 0.333
      }
    ],
    "Pirate Bandana": [
      {
        "get": "Captains Log",
        "chance": 0.25
      },
      {
        "get": "Carved Bear",
        "chance": 0.25
      },
      {
        "get": "Eye Patch",
        "chance": 0.25
      },
      {
        "get": "Pirate Flag",
        "chance": 0.25
      }
    ],
    "Pirate Flag": [
      {
        "get": "Sealed Letter",
        "chance": 0.25
      },
      {
        "get": "Small Flute",
        "chance": 0.25
      },
      {
        "get": "Small Gear",
        "chance": 0.25
      },
      {
        "get": "Spectacles",
        "chance": 0.25
      }
    ],
    "Pocket Watch": [
      {
        "get": "Cogwheel",
        "chance": 0.333
      },
      {
        "get": "Pirate Bandana",
        "chance": 0.333
      },
      {
        "get": "Wooden Mask",
        "chance": 0.333
      }
    ],
    "Red Dye": [
      {
        "get": "Blue Purse",
        "chance": 0.333
      },
      {
        "get": "Purple Bag",
        "chance": 0.333
      },
      {
        "get": "Red Shield",
        "chance": 0.333
      }
    ],
    "R.O.A.S.": [
      {
        "get": "Candy Corn",
        "chance": 0.333
      },
      {
        "get": "Square Key",
        "chance": 0.333
      },
      {
        "get": "Taffy",
        "chance": 0.333
      }
    ],
    "Runestone 01": [
      {
        "get": "Moonstone",
        "chance": 0.333
      },
      {
        "get": "Runestone 02",
        "chance": 0.333
      },
      {
        "get": "Strange Letter",
        "chance": 0.333
      }
    ],
    "Runestone 02": [
      {
        "get": "Magicite",
        "chance": 0.25
      },
      {
        "get": "Magna Quartz",
        "chance": 0.25
      },
      {
        "get": "Runestone 01",
        "chance": 0.25
      },
      {
        "get": "Runestone 03",
        "chance": 0.25
      }
    ],
    "Runestone 03": [
      {
        "get": "Moonstone",
        "chance": 0.333
      },
      {
        "get": "Runestone 04",
        "chance": 0.333
      },
      {
        "get": "Runestone 05",
        "chance": 0.333
      }
    ],
    "Runestone 04": [
      {
        "get": "Gold Feather",
        "chance": 0.333
      },
      {
        "get": "Gold Leaf",
        "chance": 0.333
      },
      {
        "get": "Runestone 03",
        "chance": 0.333
      }
    ],
    "Runestone 05": [
      {
        "get": "Magicite",
        "chance": 0.25
      },
      {
        "get": "Magna Quartz",
        "chance": 0.25
      },
      {
        "get": "Runestone 04",
        "chance": 0.25
      },
      {
        "get": "Runestone 06",
        "chance": 0.25
      }
    ],
    "Runestone 06": [
      {
        "get": "Gold Feather",
        "chance": 0.25
      },
      {
        "get": "Gold Leaf",
        "chance": 0.25
      },
      {
        "get": "Runestone 07",
        "chance": 0.25
      },
      {
        "get": "Runestone 10",
        "chance": 0.25
      }
    ],
    "Runestone 07": [
      {
        "get": "Gold Leaf",
        "chance": 0.333
      },
      {
        "get": "Runestone 08",
        "chance": 0.333
      },
      {
        "get": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 08": [
      {
        "get": "Gold Feather",
        "chance": 0.333
      },
      {
        "get": "Runestone 09",
        "chance": 0.333
      },
      {
        "get": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 09": [
      {
        "get": "Gold Feather",
        "chance": 0.333
      },
      {
        "get": "Runestone 08",
        "chance": 0.333
      },
      {
        "get": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 10": [
      {
        "get": "Runestone 06",
        "chance": 0.333
      },
      {
        "get": "Runestone 08",
        "chance": 0.333
      },
      {
        "get": "Runestone 09",
        "chance": 0.333
      }
    ],
    "Salt": [
      {
        "get": "Broccoli",
        "chance": 0.5
      },
      {
        "get": "Spiked Shell",
        "chance": 0.5
      }
    ],
    "Sea Dragon": [
      {
        "get": "Fancy Drum",
        "chance": 0.333
      },
      {
        "get": "Frog",
        "chance": 0.333
      },
      {
        "get": "Orange Gecko",
        "chance": 0.333
      }
    ],
    "Shark Tooth": [
      {
        "get": "4-leaf Clover",
        "chance": 0.333
      },
      {
        "get": "Bacon",
        "chance": 0.333
      },
      {
        "get": "Moonstone",
        "chance": 0.333
      }
    ],
    "Shiny Beetle": [
      {
        "get": "Caterpillar",
        "chance": 0.25
      },
      {
        "get": "Horned Beetle",
        "chance": 0.25
      },
      {
        "get": "Runestone 05",
        "chance": 0.25
      },
      {
        "get": "Snail",
        "chance": 0.25
      }
    ],
    "Small Flute": [
      {
        "get": "Captains Log",
        "chance": 0.2
      },
      {
        "get": "Carved Warthog",
        "chance": 0.2
      },
      {
        "get": "Dice",
        "chance": 0.2
      },
      {
        "get": "Small Screw",
        "chance": 0.2
      },
      {
        "get": "Strange Letter",
        "chance": 0.2
      }
    ],
    "Small Gear": [
      {
        "get": "Fancy Box",
        "chance": 0.333
      },
      {
        "get": "Gouda",
        "chance": 0.333
      },
      {
        "get": "Wax Candle",
        "chance": 0.333
      }
    ],
    "Small Spring": [
      {
        "get": "Small Screw",
        "chance": 0.25
      },
      {
        "get": "Spectacles",
        "chance": 0.25
      },
      {
        "get": "Strange Letter",
        "chance": 0.25
      },
      {
        "get": "Wooden Pipe",
        "chance": 0.25
      }
    ],
    "Snail": [
      {
        "get": "Caterpillar",
        "chance": 0.25
      },
      {
        "get": "Horned Beetle",
        "chance": 0.25
      },
      {
        "get": "Runestone 10",
        "chance": 0.25
      },
      {
        "get": "Shiny Beetle",
        "chance": 0.25
      }
    ],
    "Spectacles": [
      {
        "get": "Carved Squirrel",
        "chance": 0.2
      },
      {
        "get": "Dice",
        "chance": 0.2
      },
      {
        "get": "Pirate Bandana",
        "chance": 0.2
      },
      {
        "get": "Small Screw",
        "chance": 0.2
      },
      {
        "get": "Wooden Pipe",
        "chance": 0.2
      }
    ],
    "Spoon": [
      {
        "get": "Canoe",
        "chance": 0.333
      },
      {
        "get": "Onyx Scorpion",
        "chance": 0.333
      },
      {
        "get": "Wrench",
        "chance": 0.333
      }
    ],
    "Steel Plate": [
      {
        "get": "Blue Purse",
        "chance": 0.333
      },
      {
        "get": "Monster Skull",
        "chance": 0.333
      },
      {
        "get": "Wrench",
        "chance": 0.333
      }
    ],
    "Strange Letter": [
      {
        "get": "Dice",
        "chance": 0.25
      },
      {
        "get": "Freaky Picture",
        "chance": 0.25
      },
      {
        "get": "Small Screw",
        "chance": 0.25
      },
      {
        "get": "Spectacles",
        "chance": 0.25
      }
    ],
    "Sturdy Bow": [
      {
        "get": "Fancy Drum",
        "chance": 0.333
      },
      {
        "get": "Fancy Guitar",
        "chance": 0.333
      },
      {
        "get": "Machine Press",
        "chance": 0.333
      }
    ],
    "Taffy": [
      {
        "get": "Ancient Coin",
        "chance": 0.333
      },
      {
        "get": "Candy",
        "chance": 0.333
      },
      {
        "get": "Lollipop",
        "chance": 0.333
      }
    ],
    "Teapot": [
      {
        "get": "Captains Log",
        "chance": 0.143
      },
      {
        "get": "Carved Owl",
        "chance": 0.143
      },
      {
        "get": "Carved Rhino",
        "chance": 0.143
      },
      {
        "get": "Carved Warthog",
        "chance": 0.143
      },
      {
        "get": "Freaky Picture",
        "chance": 0.143
      },
      {
        "get": "Pirate Flag",
        "chance": 0.143
      },
      {
        "get": "Runestone 02",
        "chance": 0.143
      }
    ],
    "Treat Bag 02": [
      {
        "get": "Egyptian Necklace",
        "chance": 0.333
      },
      {
        "get": "Square Key",
        "chance": 0.333
      },
      {
        "get": "Taffy",
        "chance": 0.333
      }
    ],
    "Treat Bag 03": [
      {
        "get": "Candy Corn",
        "chance": 0.333
      },
      {
        "get": "Jack-o-lantern",
        "chance": 0.333
      },
      {
        "get": "Moonstone",
        "chance": 0.333
      }
    ],
    "Water Lily": [
      {
        "get": "Grab Bag 02",
        "chance": 0.333
      },
      {
        "get": "Mushroom Paste",
        "chance": 0.333
      },
      {
        "get": "Popcorn",
        "chance": 0.333
      }
    ],
    "Wax Candle": [
      {
        "get": "Gouda",
        "chance": 0.333
      },
      {
        "get": "R.O.A.S.",
        "chance": 0.333
      },
      {
        "get": "Witch Hat",
        "chance": 0.333
      }
    ],
    "Witch Hat": [
      {
        "get": "Chattering Teeth",
        "chance": 0.333
      },
      {
        "get": "Wax Candle",
        "chance": 0.333
      },
      {
        "get": "Wizard Hat",
        "chance": 0.333
      }
    ],
    "Wooden Box": [
      {
        "get": "Carved Chicken",
        "chance": 0.25
      },
      {
        "get": "Carved Fox",
        "chance": 0.25
      },
      {
        "get": "Treasure Chest",
        "chance": 0.25
      },
      {
        "get": "Wooden Mask",
        "chance": 0.25
      }
    ],
    "Wooden Mask": [
      {
        "get": "Carved Owl",
        "chance": 0.333
      },
      {
        "get": "Small Flute",
        "chance": 0.333
      },
      {
        "get": "Spectacles",
        "chance": 0.333
      }
    ],
    "Wooden Pipe": [
      {
        "get": "Dice",
        "chance": 0.25
      },
      {
        "get": "Fancy Pipe",
        "chance": 0.25
      },
      {
        "get": "Small Flute",
        "chance": 0.25
      },
      {
        "get": "Small Gear",
        "chance": 0.25
      }
    ]
  },

  // The same table read backwards: what to toss to get a thing.
  toGet: {
    "4-leaf Clover": [
      {
        "toss": "Old Boot",
        "chance": 0.333
      },
      {
        "toss": "Shark Tooth",
        "chance": 0.333
      }
    ],
    "Amethyst": [
      {
        "toss": "Aquamarine",
        "chance": 0.25
      },
      {
        "toss": "Jade",
        "chance": 0.25
      }
    ],
    "Ancient Coin": [
      {
        "toss": "Old Boot",
        "chance": 0.333
      },
      {
        "toss": "Taffy",
        "chance": 0.333
      }
    ],
    "Antler": [
      {
        "toss": "Pine Cone",
        "chance": 0.333
      }
    ],
    "Apple": [
      {
        "toss": "Candy",
        "chance": 0.25
      }
    ],
    "Aquamarine": [
      {
        "toss": "Jade",
        "chance": 0.25
      }
    ],
    "Arrowhead": [
      {
        "toss": "Antler",
        "chance": 0.333
      }
    ],
    "Bacon": [
      {
        "toss": "Dice",
        "chance": 0.25
      },
      {
        "toss": "Gold Cucumber",
        "chance": 0.333
      },
      {
        "toss": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "toss": "Gold Feather",
        "chance": 0.333
      },
      {
        "toss": "Shark Tooth",
        "chance": 0.333
      }
    ],
    "Bell": [
      {
        "toss": "Grasshopper",
        "chance": 0.5
      }
    ],
    "Bird Egg": [
      {
        "toss": "Antler",
        "chance": 0.333
      }
    ],
    "Blue Purse": [
      {
        "toss": "Red Dye",
        "chance": 0.333
      },
      {
        "toss": "Steel Plate",
        "chance": 0.333
      }
    ],
    "Borgen Bag 01": [
      {
        "toss": "Fish Biscuit",
        "chance": 1
      },
      {
        "toss": "Hummingbird Feeder",
        "chance": 1
      }
    ],
    "Broccoli": [
      {
        "toss": "Salt",
        "chance": 0.5
      }
    ],
    "Candy": [
      {
        "toss": "Chattering Teeth",
        "chance": 0.25
      },
      {
        "toss": "Lollipop",
        "chance": 0.333
      },
      {
        "toss": "Taffy",
        "chance": 0.333
      }
    ],
    "Candy Corn": [
      {
        "toss": "Gouda",
        "chance": 0.333
      },
      {
        "toss": "Jack-o-lantern",
        "chance": 0.333
      },
      {
        "toss": "R.O.A.S.",
        "chance": 0.333
      },
      {
        "toss": "Treat Bag 03",
        "chance": 0.333
      }
    ],
    "Canoe": [
      {
        "toss": "Spoon",
        "chance": 0.333
      }
    ],
    "Captains Log": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Pirate Bandana",
        "chance": 0.25
      },
      {
        "toss": "Small Flute",
        "chance": 0.2
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Carved Bear": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Pirate Bandana",
        "chance": 0.25
      }
    ],
    "Carved Camel": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Owl",
        "chance": 0.333
      }
    ],
    "Carved Chicken": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Wooden Box",
        "chance": 0.25
      }
    ],
    "Carved Cow": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Bear",
        "chance": 0.25
      }
    ],
    "Carved Dragon": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      }
    ],
    "Carved Fox": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Bear",
        "chance": 0.25
      },
      {
        "toss": "Wooden Box",
        "chance": 0.25
      }
    ],
    "Carved Kitty": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Rabbit",
        "chance": 0.25
      }
    ],
    "Carved Moose": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Bear",
        "chance": 0.25
      },
      {
        "toss": "Carved Warthog",
        "chance": 0.25
      }
    ],
    "Carved Mouse": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Rabbit",
        "chance": 0.25
      }
    ],
    "Carved Owl": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Rabbit",
        "chance": 0.25
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      },
      {
        "toss": "Wooden Mask",
        "chance": 0.333
      }
    ],
    "Carved Pig": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      }
    ],
    "Carved Rabbit": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Warthog",
        "chance": 0.25
      }
    ],
    "Carved Rhino": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Bear",
        "chance": 0.25
      },
      {
        "toss": "Carved Owl",
        "chance": 0.333
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Carved Squirrel": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Warthog",
        "chance": 0.25
      },
      {
        "toss": "Spectacles",
        "chance": 0.2
      }
    ],
    "Carved Squisquatch": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Warthog",
        "chance": 0.25
      }
    ],
    "Carved Warthog": [
      {
        "toss": "Block of Wood",
        "chance": 0.063
      },
      {
        "toss": "Carved Owl",
        "chance": 0.333
      },
      {
        "toss": "Carved Rabbit",
        "chance": 0.25
      },
      {
        "toss": "Small Flute",
        "chance": 0.2
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Caterpillar": [
      {
        "toss": "Fire Ant",
        "chance": 0.25
      },
      {
        "toss": "Shiny Beetle",
        "chance": 0.25
      },
      {
        "toss": "Snail",
        "chance": 0.25
      }
    ],
    "Chattering Teeth": [
      {
        "toss": "Gouda",
        "chance": 0.333
      },
      {
        "toss": "Witch Hat",
        "chance": 0.333
      }
    ],
    "Chum": [
      {
        "toss": "Essence of Slime",
        "chance": 0.5
      }
    ],
    "Coal": [
      {
        "toss": "Dragonfly",
        "chance": 0.333
      }
    ],
    "Cogwheel": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Pocket Watch",
        "chance": 0.333
      }
    ],
    "Corn": [
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Crab Claw": [
      {
        "toss": "Frog",
        "chance": 0.333
      },
      {
        "toss": "Orange Gecko",
        "chance": 0.333
      }
    ],
    "Dancer": [
      {
        "toss": "Milk and Cookies",
        "chance": 0.25
      }
    ],
    "Dice": [
      {
        "toss": "Small Flute",
        "chance": 0.2
      },
      {
        "toss": "Spectacles",
        "chance": 0.2
      },
      {
        "toss": "Strange Letter",
        "chance": 0.25
      },
      {
        "toss": "Wooden Pipe",
        "chance": 0.25
      }
    ],
    "Egg 02": [
      {
        "toss": "Dragonfly",
        "chance": 0.333
      }
    ],
    "Egyptian Necklace": [
      {
        "toss": "Candy Corn",
        "chance": 0.333
      },
      {
        "toss": "Treat Bag 02",
        "chance": 0.333
      }
    ],
    "Emberstone": [
      {
        "toss": "Jade",
        "chance": 0.25
      }
    ],
    "Emerald": [
      {
        "toss": "Aquamarine",
        "chance": 0.25
      }
    ],
    "Energy Coil": [
      {
        "toss": "Belt Drive",
        "chance": 0.333
      }
    ],
    "Eye Patch": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Captains Log",
        "chance": 0.25
      },
      {
        "toss": "Pirate Bandana",
        "chance": 0.25
      }
    ],
    "Fancy Box": [
      {
        "toss": "Small Gear",
        "chance": 0.333
      }
    ],
    "Fancy Drum": [
      {
        "toss": "Sea Dragon",
        "chance": 0.333
      },
      {
        "toss": "Sturdy Bow",
        "chance": 0.333
      }
    ],
    "Fancy Guitar": [
      {
        "toss": "Sturdy Bow",
        "chance": 0.333
      }
    ],
    "Fancy Pipe": [
      {
        "toss": "Wooden Pipe",
        "chance": 0.25
      }
    ],
    "Fire Ant": [
      {
        "toss": "Caterpillar",
        "chance": 0.25
      },
      {
        "toss": "Horned Beetle",
        "chance": 0.25
      }
    ],
    "Flamejack": [
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Freaky Picture": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Strange Letter",
        "chance": 0.25
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Frog": [
      {
        "toss": "Crab Claw",
        "chance": 0.333
      },
      {
        "toss": "Orange Gecko",
        "chance": 0.333
      },
      {
        "toss": "Sea Dragon",
        "chance": 0.333
      }
    ],
    "Giant Centipede": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Caterpillar",
        "chance": 0.25
      },
      {
        "toss": "Fire Ant",
        "chance": 0.25
      },
      {
        "toss": "Horned Beetle",
        "chance": 0.25
      }
    ],
    "Glass Bottle": [
      {
        "toss": "Old Boot",
        "chance": 0.333
      }
    ],
    "Gold Carrot": [
      {
        "toss": "Gold Cucumber",
        "chance": 0.333
      },
      {
        "toss": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "toss": "Gold Peppers",
        "chance": 0.2
      }
    ],
    "Gold Catfish": [
      {
        "toss": "Gold Drum",
        "chance": 0.333
      },
      {
        "toss": "Goldfin",
        "chance": 0.333
      },
      {
        "toss": "Gold Flier",
        "chance": 0.333
      },
      {
        "toss": "Goldgill",
        "chance": 0.333
      }
    ],
    "Gold Coral": [
      {
        "toss": "Gold Sea Bass",
        "chance": 0.333
      }
    ],
    "Gold Cucumber": [
      {
        "toss": "Gold Carrot",
        "chance": 0.25
      },
      {
        "toss": "Gold Peas",
        "chance": 0.25
      },
      {
        "toss": "Gold Peppers",
        "chance": 0.2
      }
    ],
    "Gold Drum": [
      {
        "toss": "Goldray",
        "chance": 0.333
      }
    ],
    "Gold Eggplant": [
      {
        "toss": "Gold Carrot",
        "chance": 0.25
      },
      {
        "toss": "Gold Cucumber",
        "chance": 0.333
      },
      {
        "toss": "Gold Peas",
        "chance": 0.25
      },
      {
        "toss": "Gold Peppers",
        "chance": 0.2
      }
    ],
    "Gold Feather": [
      {
        "toss": "Bacon",
        "chance": 0.333
      },
      {
        "toss": "Gold Leaf",
        "chance": 0.333
      },
      {
        "toss": "Gold Peas",
        "chance": 0.25
      },
      {
        "toss": "Runestone 04",
        "chance": 0.333
      },
      {
        "toss": "Runestone 06",
        "chance": 0.25
      },
      {
        "toss": "Runestone 08",
        "chance": 0.333
      },
      {
        "toss": "Runestone 09",
        "chance": 0.333
      }
    ],
    "Goldfin": [
      {
        "toss": "Gold Coral",
        "chance": 0.5
      },
      {
        "toss": "Goldgill",
        "chance": 0.333
      },
      {
        "toss": "Gold Sea Bass",
        "chance": 0.333
      }
    ],
    "Goldfish": [
      {
        "toss": "Jack-o-lantern",
        "chance": 0.333
      }
    ],
    "Gold Flier": [
      {
        "toss": "Goldray",
        "chance": 0.333
      },
      {
        "toss": "Gold Sea Bass",
        "chance": 0.333
      },
      {
        "toss": "Gold Trout",
        "chance": 0.333
      }
    ],
    "Goldgill": [
      {
        "toss": "Gold Catfish",
        "chance": 0.333
      },
      {
        "toss": "Gold Flier",
        "chance": 0.333
      },
      {
        "toss": "Goldjack",
        "chance": 0.333
      },
      {
        "toss": "Gold Trout",
        "chance": 0.333
      }
    ],
    "Goldjack": [
      {
        "toss": "Gold Catfish",
        "chance": 0.333
      },
      {
        "toss": "Goldfin",
        "chance": 0.333
      },
      {
        "toss": "Goldgill",
        "chance": 0.333
      }
    ],
    "Gold Leaf": [
      {
        "toss": "Bacon",
        "chance": 0.333
      },
      {
        "toss": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "toss": "Gold Feather",
        "chance": 0.333
      },
      {
        "toss": "Magicite",
        "chance": 0.25
      },
      {
        "toss": "Runestone 04",
        "chance": 0.333
      },
      {
        "toss": "Runestone 06",
        "chance": 0.25
      },
      {
        "toss": "Runestone 07",
        "chance": 0.333
      }
    ],
    "Gold Peas": [
      {
        "toss": "Gold Carrot",
        "chance": 0.25
      },
      {
        "toss": "Gold Eggplant",
        "chance": 0.25
      },
      {
        "toss": "Gold Peppers",
        "chance": 0.2
      }
    ],
    "Gold Peppers": [
      {
        "toss": "Gold Peas",
        "chance": 0.25
      }
    ],
    "Goldray": [
      {
        "toss": "Goldjack",
        "chance": 0.333
      },
      {
        "toss": "Gold Trout",
        "chance": 0.333
      }
    ],
    "Gold Sea Bass": [
      {
        "toss": "Gold Flier",
        "chance": 0.333
      },
      {
        "toss": "Goldjack",
        "chance": 0.333
      },
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Gold Trout": [
      {
        "toss": "Gold Drum",
        "chance": 0.333
      },
      {
        "toss": "Goldfin",
        "chance": 0.333
      },
      {
        "toss": "Goldray",
        "chance": 0.333
      }
    ],
    "Gouda": [
      {
        "toss": "Small Gear",
        "chance": 0.333
      },
      {
        "toss": "Wax Candle",
        "chance": 0.333
      }
    ],
    "Grab Bag 02": [
      {
        "toss": "Water Lily",
        "chance": 0.333
      }
    ],
    "Grab Bag 07": [
      {
        "toss": "Milk and Cookies",
        "chance": 0.25
      }
    ],
    "Green Jellyfish": [
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Holiday Wreath": [
      {
        "toss": "Milk and Cookies",
        "chance": 0.25
      }
    ],
    "Honey": [
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Horn": [
      {
        "toss": "Pine Cone",
        "chance": 0.333
      }
    ],
    "Horned Beetle": [
      {
        "toss": "Fire Ant",
        "chance": 0.25
      },
      {
        "toss": "Giant Centipede",
        "chance": 0.25
      },
      {
        "toss": "Shiny Beetle",
        "chance": 0.25
      },
      {
        "toss": "Snail",
        "chance": 0.25
      }
    ],
    "Iced Tea": [
      {
        "toss": "Apple Cider",
        "chance": 0.333
      }
    ],
    "Jack-o-lantern": [
      {
        "toss": "Treat Bag 03",
        "chance": 0.333
      }
    ],
    "Lemonade": [
      {
        "toss": "Apple Cider",
        "chance": 0.333
      }
    ],
    "Lemon Quartz": [
      {
        "toss": "Aquamarine",
        "chance": 0.25
      }
    ],
    "Lollipop": [
      {
        "toss": "Candy",
        "chance": 0.25
      },
      {
        "toss": "Chattering Teeth",
        "chance": 0.25
      },
      {
        "toss": "Taffy",
        "chance": 0.333
      }
    ],
    "Machine Press": [
      {
        "toss": "Sturdy Bow",
        "chance": 0.333
      }
    ],
    "Magicite": [
      {
        "toss": "Bacon",
        "chance": 0.333
      },
      {
        "toss": "Gold Leaf",
        "chance": 0.333
      },
      {
        "toss": "Runestone 02",
        "chance": 0.25
      },
      {
        "toss": "Runestone 05",
        "chance": 0.25
      }
    ],
    "Magna Core": [
      {
        "toss": "Compass",
        "chance": 1
      }
    ],
    "Magna Quartz": [
      {
        "toss": "Runestone 02",
        "chance": 0.25
      },
      {
        "toss": "Runestone 05",
        "chance": 0.25
      }
    ],
    "Metal Spool": [
      {
        "toss": "Belt Drive",
        "chance": 0.333
      }
    ],
    "MIAB": [
      {
        "toss": "4-leaf Clover",
        "chance": 0.333
      }
    ],
    "Monster Skull": [
      {
        "toss": "Steel Plate",
        "chance": 0.333
      }
    ],
    "Moonstone": [
      {
        "toss": "Captains Log",
        "chance": 0.25
      },
      {
        "toss": "Eye Patch",
        "chance": 0.25
      },
      {
        "toss": "Runestone 01",
        "chance": 0.333
      },
      {
        "toss": "Runestone 03",
        "chance": 0.333
      },
      {
        "toss": "Shark Tooth",
        "chance": 0.333
      },
      {
        "toss": "Treat Bag 03",
        "chance": 0.333
      }
    ],
    "Mug of Beer": [
      {
        "toss": "Cutlass",
        "chance": 0.333
      }
    ],
    "Mushroom Paste": [
      {
        "toss": "Water Lily",
        "chance": 0.333
      }
    ],
    "Octopus": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Herbs",
        "chance": 0.167
      }
    ],
    "Onyx Scorpion": [
      {
        "toss": "Spoon",
        "chance": 0.333
      }
    ],
    "Orange Gecko": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Crab Claw",
        "chance": 0.333
      },
      {
        "toss": "Frog",
        "chance": 0.333
      },
      {
        "toss": "Sea Dragon",
        "chance": 0.333
      }
    ],
    "Orange Juice": [
      {
        "toss": "Apple Cider",
        "chance": 0.333
      }
    ],
    "Pine Cone": [
      {
        "toss": "Antler",
        "chance": 0.333
      }
    ],
    "Pirate Bandana": [
      {
        "toss": "Pocket Watch",
        "chance": 0.333
      },
      {
        "toss": "Spectacles",
        "chance": 0.2
      }
    ],
    "Pirate Flag": [
      {
        "toss": "Captains Log",
        "chance": 0.25
      },
      {
        "toss": "Freaky Picture",
        "chance": 0.25
      },
      {
        "toss": "Pirate Bandana",
        "chance": 0.25
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Pocket Watch": [
      {
        "toss": "Cogwheel",
        "chance": 0.25
      }
    ],
    "Popcorn": [
      {
        "toss": "Water Lily",
        "chance": 0.333
      }
    ],
    "Prism Shard": [
      {
        "toss": "Pine Cone",
        "chance": 0.333
      }
    ],
    "Purple Bag": [
      {
        "toss": "Red Dye",
        "chance": 0.333
      }
    ],
    "Red Shield": [
      {
        "toss": "Red Dye",
        "chance": 0.333
      }
    ],
    "R.O.A.S.": [
      {
        "toss": "Candy Corn",
        "chance": 0.333
      },
      {
        "toss": "Wax Candle",
        "chance": 0.333
      }
    ],
    "Rubber Duckie": [
      {
        "toss": "Cutlass",
        "chance": 0.333
      }
    ],
    "Ruby": [
      {
        "toss": "Aquamarine",
        "chance": 0.25
      },
      {
        "toss": "Jade",
        "chance": 0.25
      }
    ],
    "Runestone 01": [
      {
        "toss": "Eye Patch",
        "chance": 0.25
      },
      {
        "toss": "Gold Peppers",
        "chance": 0.2
      },
      {
        "toss": "Magicite",
        "chance": 0.25
      },
      {
        "toss": "Moonstone",
        "chance": 0.25
      },
      {
        "toss": "Runestone 02",
        "chance": 0.25
      }
    ],
    "Runestone 02": [
      {
        "toss": "Eye Patch",
        "chance": 0.25
      },
      {
        "toss": "Magicite",
        "chance": 0.25
      },
      {
        "toss": "Moonstone",
        "chance": 0.25
      },
      {
        "toss": "Runestone 01",
        "chance": 0.333
      },
      {
        "toss": "Teapot",
        "chance": 0.143
      }
    ],
    "Runestone 03": [
      {
        "toss": "Runestone 02",
        "chance": 0.25
      },
      {
        "toss": "Runestone 04",
        "chance": 0.333
      }
    ],
    "Runestone 04": [
      {
        "toss": "Runestone 03",
        "chance": 0.333
      },
      {
        "toss": "Runestone 05",
        "chance": 0.25
      }
    ],
    "Runestone 05": [
      {
        "toss": "Gold Feather",
        "chance": 0.333
      },
      {
        "toss": "Runestone 03",
        "chance": 0.333
      },
      {
        "toss": "Shiny Beetle",
        "chance": 0.25
      }
    ],
    "Runestone 06": [
      {
        "toss": "Horned Beetle",
        "chance": 0.25
      },
      {
        "toss": "Runestone 05",
        "chance": 0.25
      },
      {
        "toss": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 07": [
      {
        "toss": "Giant Centipede",
        "chance": 0.25
      },
      {
        "toss": "Gold Leaf",
        "chance": 0.333
      },
      {
        "toss": "Moonstone",
        "chance": 0.25
      },
      {
        "toss": "Runestone 06",
        "chance": 0.25
      }
    ],
    "Runestone 08": [
      {
        "toss": "Fire Ant",
        "chance": 0.25
      },
      {
        "toss": "Runestone 07",
        "chance": 0.333
      },
      {
        "toss": "Runestone 09",
        "chance": 0.333
      },
      {
        "toss": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 09": [
      {
        "toss": "Caterpillar",
        "chance": 0.25
      },
      {
        "toss": "Runestone 08",
        "chance": 0.333
      },
      {
        "toss": "Runestone 10",
        "chance": 0.333
      }
    ],
    "Runestone 10": [
      {
        "toss": "Runestone 06",
        "chance": 0.25
      },
      {
        "toss": "Runestone 07",
        "chance": 0.333
      },
      {
        "toss": "Runestone 08",
        "chance": 0.333
      },
      {
        "toss": "Runestone 09",
        "chance": 0.333
      },
      {
        "toss": "Snail",
        "chance": 0.25
      }
    ],
    "Sea Dragon": [
      {
        "toss": "Crab Claw",
        "chance": 0.333
      },
      {
        "toss": "Frog",
        "chance": 0.333
      },
      {
        "toss": "Orange Gecko",
        "chance": 0.333
      }
    ],
    "Sealed Letter": [
      {
        "toss": "Pirate Flag",
        "chance": 0.25
      }
    ],
    "Shark Tooth": [
      {
        "toss": "Cutlass",
        "chance": 0.333
      }
    ],
    "Shiny Beetle": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Caterpillar",
        "chance": 0.25
      },
      {
        "toss": "Giant Centipede",
        "chance": 0.25
      },
      {
        "toss": "Horned Beetle",
        "chance": 0.25
      },
      {
        "toss": "Snail",
        "chance": 0.25
      }
    ],
    "Small Flute": [
      {
        "toss": "4-leaf Clover",
        "chance": 0.333
      },
      {
        "toss": "Cogwheel",
        "chance": 0.25
      },
      {
        "toss": "Dice",
        "chance": 0.25
      },
      {
        "toss": "Pirate Flag",
        "chance": 0.25
      },
      {
        "toss": "Wooden Mask",
        "chance": 0.333
      },
      {
        "toss": "Wooden Pipe",
        "chance": 0.25
      }
    ],
    "Small Gear": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Freaky Picture",
        "chance": 0.25
      },
      {
        "toss": "Pirate Flag",
        "chance": 0.25
      },
      {
        "toss": "Wooden Pipe",
        "chance": 0.25
      }
    ],
    "Small Key": [
      {
        "toss": "Large Chest 01",
        "chance": 0.333
      },
      {
        "toss": "Large Chest 02",
        "chance": 0.333
      }
    ],
    "Small Screw": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Cogwheel",
        "chance": 0.25
      },
      {
        "toss": "Small Flute",
        "chance": 0.2
      },
      {
        "toss": "Small Spring",
        "chance": 0.25
      },
      {
        "toss": "Spectacles",
        "chance": 0.2
      },
      {
        "toss": "Strange Letter",
        "chance": 0.25
      }
    ],
    "Small Spring": [
      {
        "toss": "Freaky Picture",
        "chance": 0.25
      }
    ],
    "Snail": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Giant Centipede",
        "chance": 0.25
      },
      {
        "toss": "Shiny Beetle",
        "chance": 0.25
      }
    ],
    "Spectacles": [
      {
        "toss": "Dice",
        "chance": 0.25
      },
      {
        "toss": "Eye Patch",
        "chance": 0.25
      },
      {
        "toss": "Pirate Flag",
        "chance": 0.25
      },
      {
        "toss": "Small Spring",
        "chance": 0.25
      },
      {
        "toss": "Strange Letter",
        "chance": 0.25
      },
      {
        "toss": "Wooden Mask",
        "chance": 0.333
      }
    ],
    "Spider": [
      {
        "toss": "Candy",
        "chance": 0.25
      },
      {
        "toss": "Grasshopper",
        "chance": 0.5
      },
      {
        "toss": "Jack-o-lantern",
        "chance": 0.333
      },
      {
        "toss": "Lollipop",
        "chance": 0.333
      }
    ],
    "Spiked Shell": [
      {
        "toss": "Salt",
        "chance": 0.5
      }
    ],
    "Spool of Copper": [
      {
        "toss": "Belt Drive",
        "chance": 0.333
      }
    ],
    "Square Key": [
      {
        "toss": "Large Chest 01",
        "chance": 0.333
      },
      {
        "toss": "Large Chest 02",
        "chance": 0.333
      },
      {
        "toss": "R.O.A.S.",
        "chance": 0.333
      },
      {
        "toss": "Treat Bag 02",
        "chance": 0.333
      }
    ],
    "Stone": [
      {
        "toss": "Dragonfly",
        "chance": 0.333
      }
    ],
    "Strange Letter": [
      {
        "toss": "Captains Log",
        "chance": 0.25
      },
      {
        "toss": "Gold Carrot",
        "chance": 0.25
      },
      {
        "toss": "Magicite",
        "chance": 0.25
      },
      {
        "toss": "Moonstone",
        "chance": 0.25
      },
      {
        "toss": "Runestone 01",
        "chance": 0.333
      },
      {
        "toss": "Small Flute",
        "chance": 0.2
      },
      {
        "toss": "Small Spring",
        "chance": 0.25
      }
    ],
    "Sturdy Bow": [
      {
        "toss": "Gold Coral",
        "chance": 0.5
      },
      {
        "toss": "Gold Drum",
        "chance": 0.333
      }
    ],
    "Taffy": [
      {
        "toss": "Candy",
        "chance": 0.25
      },
      {
        "toss": "Candy Corn",
        "chance": 0.333
      },
      {
        "toss": "Lollipop",
        "chance": 0.333
      },
      {
        "toss": "R.O.A.S.",
        "chance": 0.333
      },
      {
        "toss": "Treat Bag 02",
        "chance": 0.333
      }
    ],
    "Teapot": [
      {
        "toss": "Dice",
        "chance": 0.25
      },
      {
        "toss": "Freaky Picture",
        "chance": 0.25
      }
    ],
    "Treasure Chest": [
      {
        "toss": "Wooden Box",
        "chance": 0.25
      }
    ],
    "Treasure Key": [
      {
        "toss": "Large Chest 01",
        "chance": 0.333
      },
      {
        "toss": "Large Chest 02",
        "chance": 0.333
      }
    ],
    "Treat Bag 01": [
      {
        "toss": "Chattering Teeth",
        "chance": 0.25
      }
    ],
    "Vixen": [
      {
        "toss": "Milk and Cookies",
        "chance": 0.25
      }
    ],
    "Wax Candle": [
      {
        "toss": "Ancient Coin",
        "chance": 0.083
      },
      {
        "toss": "Gouda",
        "chance": 0.333
      },
      {
        "toss": "Small Gear",
        "chance": 0.333
      },
      {
        "toss": "Witch Hat",
        "chance": 0.333
      }
    ],
    "Witch Hat": [
      {
        "toss": "Chattering Teeth",
        "chance": 0.25
      },
      {
        "toss": "Wax Candle",
        "chance": 0.333
      }
    ],
    "Wizard Hat": [
      {
        "toss": "Witch Hat",
        "chance": 0.333
      }
    ],
    "Wooden Bow": [
      {
        "toss": "Essence of Slime",
        "chance": 0.5
      },
      {
        "toss": "Gold Catfish",
        "chance": 0.333
      }
    ],
    "Wooden Mask": [
      {
        "toss": "4-leaf Clover",
        "chance": 0.333
      },
      {
        "toss": "Cogwheel",
        "chance": 0.25
      },
      {
        "toss": "Pocket Watch",
        "chance": 0.333
      },
      {
        "toss": "Wooden Box",
        "chance": 0.25
      }
    ],
    "Wooden Pipe": [
      {
        "toss": "Small Spring",
        "chance": 0.25
      },
      {
        "toss": "Spectacles",
        "chance": 0.2
      }
    ],
    "Wrench": [
      {
        "toss": "Spoon",
        "chance": 0.333
      },
      {
        "toss": "Steel Plate",
        "chance": 0.333
      }
    ]
  },

  unknown: [
    "the exact split between the base limit and the Extra Wish perks",
  ],

  // Days a Well route would take. Call this before ever recommending one.
  // `chance` is 0 to 1, `perToss` defaults to 1 because the wiki has no
  // quantity column, and `doubled` is the Reflecting Pool perk.
  daysFor(qty, chance, perToss, doubled) {
    const each = (perToss || 1) * (doubled === false ? 1 : this.perk.multiplier);
    const perDay = this.dailyLimit.total * chance * each;
    return perDay > 0 ? qty / perDay : Infinity;
  },
};

// Containers.
//
// A CHEST costs ONE KEY to open at the Locksmith, and the list buddy.farm
// shows *below* the heading "Open At Locksmith For" is what comes OUT. That
// heading reads like a price and is not one - this file had it backwards twice
// before the account owner checked the live page on 2026-09-21. The hard part
// is getting the chest, never the key.
//
// A BAG is not a Locksmith item and its list is a payout too.
window.FRPG_CONTAINERS = {
  schema: "farmrpg-containers-v1",
  source: "buddy.farm",
  capturedAt: "2026-09-21",
  payoutUnknownFor: [],
  byName: {
    "Small Chest 01": {
      "mode": "one key at the Locksmith",
      "payout": [{"item": "Amethyst", "min": 10, "max": 10, "odds": null}, {"item": "Aquamarine", "min": 10, "max": 10, "odds": null}, {"item": "Emerald", "min": 10, "max": 10, "odds": null}, {"item": "Jade", "min": 10, "max": 10, "odds": null}, {"item": "Lemon Quartz", "min": 10, "max": 10, "odds": null}, {"item": "Ruby", "min": 10, "max": 10, "odds": null}],
      "opensWith": "one key",
      "source": "https://buddy.farm/i/small-chest-01/"
    },
    "Small Chest 02": {
      "mode": "one key at the Locksmith",
      "payout": [{"item": "Antler", "min": 10, "max": 10, "odds": null}, {"item": "Glass Orb", "min": 10, "max": 10, "odds": null}, {"item": "Leather", "min": 10, "max": 10, "odds": null}, {"item": "Rope", "min": 10, "max": 10, "odds": null}, {"item": "Wooden Plank", "min": 10, "max": 10, "odds": null}],
      "opensWith": "one key",
      "source": "https://buddy.farm/i/small-chest-02/"
    },
    "Medium Chest 02": {
      "mode": "one key at the Locksmith",
      "payout": [{"item": "Amethyst Necklace", "min": 5, "max": 5, "odds": null}, {"item": "Aquamarine Ring", "min": 5, "max": 5, "odds": null}, {"item": "Emerald Ring", "min": 5, "max": 5, "odds": null}, {"item": "Ruby Ring", "min": 5, "max": 5, "odds": null}, {"item": "Shimmer Ring", "min": 5, "max": 5, "odds": null}],
      "opensWith": "one key",
      "source": "https://buddy.farm/i/medium-chest-02/"
    },
    "Large Chest 01": {
      "mode": "one key at the Locksmith",
      "payout": [{"item": "Ancient Coin", "min": 100, "max": 100, "odds": null}, {"item": "Emerald", "min": 50, "max": 50, "odds": null}, {"item": "Jade", "min": 50, "max": 50, "odds": null}, {"item": "Pearl", "min": 50, "max": 50, "odds": null}, {"item": "Ruby", "min": 50, "max": 50, "odds": null}, {"item": "Shimmer Topaz", "min": 50, "max": 50, "odds": null}],
      "opensWith": "one key",
      "source": "https://buddy.farm/i/large-chest-01/"
    },
    "Large Chest 02": {
      "mode": "one key at the Locksmith",
      "payout": [{"item": "Cogwheel", "min": 2, "max": 2, "odds": null}, {"item": "Hammer", "min": 1, "max": 1, "odds": null}, {"item": "Small Gear", "min": 3, "max": 3, "odds": null}, {"item": "Small Screw", "min": 8, "max": 8, "odds": null}, {"item": "Small Spring", "min": 2, "max": 2, "odds": null}, {"item": "Steel", "min": 5, "max": 5, "odds": null}],
      "opensWith": "one key",
      "source": "https://buddy.farm/i/large-chest-02/"
    },
    "Grab Bag 01": {
      "mode": "one of",
      "payout": [
        {
          "item": "3-leaf Clover",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Aquamarine",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Bone",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Catfish",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Cucumber",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Mushroom",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Potato",
          "min": 10,
          "max": 50,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-01/"
    },
    "Grab Bag 02": {
      "mode": "one of",
      "payout": [
        {
          "item": "Ancient Coin",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Antler",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Fire Ant",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Giant Centipede",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Globber",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Gummy Worms",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Horn",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Shiny Beetle",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Snail",
          "min": 10,
          "max": 25,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-02/"
    },
    "Grab Bag 03": {
      "mode": "one of",
      "payout": [
        {
          "item": "Gold Carrot",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Cucumber",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Eggplant",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Feather",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Leaf",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Peas",
          "min": 10,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Peppers",
          "min": 10,
          "max": 50,
          "odds": null
        },
        {
          "item": "Treasure Key",
          "min": 1,
          "max": 7,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-03/"
    },
    "Grab Bag 04": {
      "mode": "one of",
      "payout": [
        {
          "item": "Runestone 01",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 02",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 03",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 04",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 05",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 06",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 07",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 08",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 09",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 10",
          "min": 1,
          "max": 2,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-04/"
    },
    "Grab Bag 05": {
      "mode": "one of",
      "payout": [
        {
          "item": "Runestone 11",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 12",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 13",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 14",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 15",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 16",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 17",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 18",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 19",
          "min": 1,
          "max": 2,
          "odds": null
        },
        {
          "item": "Runestone 20",
          "min": 1,
          "max": 2,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-05/"
    },
    "Grab Bag 06": {
      "mode": "one of",
      "payout": [
        {
          "item": "Ancient Coin",
          "min": 10,
          "max": 150,
          "odds": null
        },
        {
          "item": "Fishing Net",
          "min": 10,
          "max": 20,
          "odds": null
        },
        {
          "item": "Grape Juice",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Lemonade",
          "min": 10,
          "max": 20,
          "odds": null
        },
        {
          "item": "Orange Juice",
          "min": 10,
          "max": 20,
          "odds": null
        },
        {
          "item": "Skull Coin",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Steak",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Wine",
          "min": 1,
          "max": 4,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-06/"
    },
    "Grab Bag 07": {
      "mode": "one of",
      "payout": [
        {
          "item": "Gold Catfish",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Coral",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Drum",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Flier",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Jelly",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Sea Bass",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Sea Crest",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Gold Trout",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Goldfin",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Goldgill",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Goldjack",
          "min": 1,
          "max": 5,
          "odds": null
        },
        {
          "item": "Goldray",
          "min": 1,
          "max": 5,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/grab-bag-07/"
    },
    "Cornucopia 01": {
      "mode": "all listed rewards",
      "payout": [
        {
          "item": "Gold",
          "min": 25,
          "max": 25,
          "odds": null
        },
        {
          "item": "Acorn",
          "min": 50,
          "max": 50,
          "odds": null
        },
        {
          "item": "Apple",
          "min": 25,
          "max": 25,
          "odds": null
        },
        {
          "item": "Corn",
          "min": 25,
          "max": 25,
          "odds": null
        },
        {
          "item": "Gold Leaf",
          "min": 3,
          "max": 3,
          "odds": null
        },
        {
          "item": "Grapes",
          "min": 10,
          "max": 10,
          "odds": null
        },
        {
          "item": "Orange",
          "min": 10,
          "max": 10,
          "odds": null
        },
        {
          "item": "Pumpkin",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Sunflower",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Wheat",
          "min": 3,
          "max": 3,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/cornucopia-01/"
    },
    "Borgen Bag 01": {
      "mode": "one of",
      "payout": [
        {
          "item": "Arnold Palmer",
          "min": 10,
          "max": 600,
          "odds": null
        },
        {
          "item": "Borgen Buck",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Happy Cookies",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Joker",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Large Chest 01",
          "min": 10,
          "max": 100,
          "odds": null
        },
        {
          "item": "Large Chest 02",
          "min": 10,
          "max": 100,
          "odds": null
        },
        {
          "item": "Large Chest 03",
          "min": 10,
          "max": 100,
          "odds": null
        },
        {
          "item": "Lovely Cookies",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Piece of Heart",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Raptor Claw",
          "min": 10,
          "max": 100,
          "odds": null
        },
        {
          "item": "Spooky Cookies",
          "min": 1,
          "max": 1,
          "odds": null
        },
        {
          "item": "Treasure Key",
          "min": 10,
          "max": 400,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/borgen-bag-01/"
    },
    "Bug Bag 01": {
      "mode": "one of",
      "payout": [
        {
          "item": "Caterpillar",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Cricket",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Cyclops Spider",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Dragonfly",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Fire Ant",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Giant Centipede",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Grasshopper",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Gummy Worms",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Horned Beetle",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Mealworms",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Onyx Scorpion",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Ruby Scorpion",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Shiny Beetle",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Snail",
          "min": 1,
          "max": 10,
          "odds": null
        },
        {
          "item": "Spider",
          "min": 1,
          "max": 10,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/bug-bag-01/"
    },
    "Friendship Bag 01": {
      "mode": "one of",
      "payout": [
        {
          "item": "Five Point Mace",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Heart Container",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Perfect Paint Palette",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Prism Shell",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Ramjoram's Mask",
          "min": 1,
          "max": 3,
          "odds": null
        },
        {
          "item": "Refined Corn Quartz",
          "min": 1,
          "max": 3,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/friendship-bag-01/"
    },
    "Drink Bundle": {
      "mode": "all listed rewards",
      "payout": [
        {
          "item": "Apple Cider",
          "min": 10,
          "max": 10,
          "odds": null
        },
        {
          "item": "Arnold Palmer",
          "min": 5,
          "max": 5,
          "odds": null
        },
        {
          "item": "Grape Juice",
          "min": 5,
          "max": 5,
          "odds": null
        },
        {
          "item": "Iced Tea",
          "min": 10,
          "max": 10,
          "odds": null
        },
        {
          "item": "Lemonade",
          "min": 50,
          "max": 50,
          "odds": null
        },
        {
          "item": "Orange Juice",
          "min": 100,
          "max": 100,
          "odds": null
        }
      ],
      "locksmithCost": null,
      "source": "https://buddy.farm/i/drink-bundle/"
    }
  },
};

// Dailies, streaks and anything on a timer.
window.FRPG_DAILIES = {
  schema: "farmrpg-dailies-v1",
  source: "buddy.farm",
  capturedAt: "2026-09-21",
  dailyRewards: {
    "value": "UNKNOWN",
    "unit": "reward items/currency per day",
    "source_url": "UNKNOWN",
    "note": "No public buddy.farm or public in-game-wiki page located that states a fixed day-by-day reward table."
  },
  loginStreak: {
    "value": "UNKNOWN",
    "unit": "reward items/currency per consecutive login day",
    "source_url": "UNKNOWN",
    "note": "No source located that establishes a Farm RPG login-reward streak table. Chore completion streaks are a separate mechanic."
  },
  chores: {
    "monthly_reward_tiers": {
      "count": 3,
      "unit": "monthly reward tiers",
      "source_url": "https://buddy.farm/qz/locations-101/",
      "threshold_days_completed": [
        "UNKNOWN",
        "UNKNOWN",
        28
      ],
      "threshold_unit": "completed daily-chore days in the current month",
      "threshold_source_urls": [
        "UNKNOWN",
        "UNKNOWN",
        "https://buddy.farm/q/a-cold-start-i/"
      ],
      "note": "buddy.farm explicitly states there are three monthly rewards and separately identifies a 28-day Daily Chores reward; the first two current thresholds and the current reward contents were not stated on the located pages."
    },
    "extra_chore_set": {
      "cost": {
        "value": 10,
        "unit": "Gold per extra chore set"
      },
      "can_make_up_missed_days": true,
      "scope": "current month only",
      "precondition": "missed day must follow previously completed days in that month",
      "source_url": "https://www.reddit.com/r/FarmRPG/comments/ub7f41/"
    },
    "one_time_achievement_rewards": [
      {
        "achievement": "Day Job",
        "trigger": {
          "value": 1,
          "unit": "Daily Chore completed"
        },
        "reward": [
          {
            "value": 10000,
            "unit": "Silver"
          }
        ],
        "source_url": "https://farmrpg.com/achievements.php"
      },
      {
        "achievement": "Quitting Time",
        "trigger": {
          "value": 1,
          "unit": "complete day of Daily Chores"
        },
        "reward": [
          {
            "value": 5,
            "unit": "Gold"
          }
        ],
        "source_url": "https://farmrpg.com/achievements.php"
      },
      {
        "achievement": "100 Days Done",
        "trigger": {
          "value": 100,
          "unit": "completed chore days; not required to be consecutive"
        },
        "reward": [
          {
            "value": 50000000,
            "unit": "Silver"
          }
        ],
        "source_url": "https://farmrpg.com/achievements.php"
      },
      {
        "achievement": "Chore Titan",
        "trigger": {
          "value": 5000,
          "unit": "Daily Chores; not required to be consecutive"
        },
        "reward": [
          {
            "value": 2147483647,
            "unit": "Silver"
          },
          {
            "value": 300,
            "unit": "Ascension Knowledge"
          }
        ],
        "source_url": "https://farmrpg.com/achievements.php"
      }
    ]
  },
  grapes: {
    "amount": {
      "value": "UNKNOWN",
      "unit": "Grapes per daily Vineyard production"
    },
    "reset_time": {
      "value": "UNKNOWN",
      "unit": "server time"
    },
    "source_url": "UNKNOWN",
    "note": "The Vineyard amount is player-upgraded rather than a universal constant; no public source located here states the amount formula or explicitly ties its production to an exact clock time."
  },
  timerResets: [
    {
      "system": "General daily server reset/maintenance window",
      "reset": {
        "start": "12:00 am",
        "end": "12:10 am",
        "unit": "server time"
      },
      "source_url": "https://farmrpg.com/locksmith.php"
    },
    {
      "system": "Farm Supply sale rotation",
      "reset": {
        "value": "Mondays",
        "unit": "server calendar day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Wishing Well Extra Wish perks",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increments": [
        {
          "perk": "Extra Wish",
          "value": 1,
          "unit": "additional toss per day"
        },
        {
          "perk": "Extra Wishes",
          "value": 5,
          "unit": "additional tosses per day"
        },
        {
          "perk": "Extra Wishes II",
          "value": 10,
          "unit": "additional tosses per day"
        },
        {
          "perk": "Extra Wishes III",
          "value": 10,
          "unit": "additional tosses per day"
        }
      ],
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Grape Juice use perks",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increments": [
        {
          "perk": "Grape Juice Pitcher",
          "value": 1,
          "unit": "additional Grape Juice use per day"
        },
        {
          "perk": "Grape Juice Fountain",
          "value": 2,
          "unit": "additional Grape Juice uses per day"
        },
        {
          "perk": "Grape Juice Waterfall",
          "value": 3,
          "unit": "additional Grape Juice uses per day"
        }
      ],
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Farmhouse Mattress Pad",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "maximum Stamina per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Lost+Found Memory Expansion I",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "additional free game per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Vault Codebreaker",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "additional Vault guess per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Buddyjack Ace Up the Sleeve II",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "allowance": {
        "value": 1,
        "unit": "cheat use per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Buddyjack Ace Up the Sleeve III",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "additional cheat use per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Buddyjack Know When To Hold 'Em",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "allowance": {
        "value": 1,
        "unit": "view of Buddy's score per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "House of Cards Dealer's Choice",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "additional free re-roll per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    },
    {
      "system": "Buddyjack High Roller I",
      "reset": {
        "value": "daily",
        "unit": "server day"
      },
      "increment": {
        "value": 1,
        "unit": "additional game per day"
      },
      "source_url": "https://farmrpg.com/supply.php"
    }
  ],
  unknown: [
    "Fixed day-by-day daily reward table.",
    "Login streak reward table and confirmation that a distinct login-reward streak exists.",
    "Current-month Daily Chores reward contents.",
    "First and second Daily Chores monthly reward thresholds on the located current sources.",
    "Number and full pool of Daily Chores assigned per day.",
    "Daily Grapes amount formula or a player-specific Daily Grapes amount.",
    "Daily Grapes exact reset time explicitly stated by a source.",
    "Exact clock time for each individual daily perk reset; the source says daily but not a clock time.",
    "Exhaustive list of every timer reset in Farm RPG; the public sources located do not provide a complete canonical timer registry."
  ],
};

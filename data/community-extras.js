// Gaps the knowledge pack never had, gathered from buddy.farm 2026-09-21 via
// the prompt in docs/DATA_REQUEST_PROMPT.md.
//
// PARTIAL ON PURPOSE. Every field the source did not state is recorded as
// null, never as zero and never as a guess. `unknown` on each section lists
// what is still missing, so nothing here can be mistaken for complete.
//
// Pet outputs are per-collection item lists. They are NOT drops per Arnold
// Palmer and NOT explores per drop. Quantities are unknown.
window.FRPG_COMMUNITY_EXTRAS = {
  schema: "farmrpg-community-extras-v1",
  source: "buddy.farm",
  capturedAt: "2026-09-21",

  // What each pet can bring back, by the level that unlocks it. Amounts per
  // collection, the cooldown, and how level or friendship scale the amount are
  // all unknown, so these are "what", never "how much".
  pets: {
    unit: "items per pet collection",
    amountPerCollection: null,
    cooldown: null,
    levelScaling: null,
    friendshipScaling: null,
    byPet: {
      "Wolf": { 1: ["Feathers", "Pumpkin", "Bone", "Bitten Apple"], 3: ["Acorn", "Straw", "Blue Feathers", "Fall Leaves"], 6: ["Gold Leaf", "Striped Feather", "Green Rubee", "Raw Meat"] },
      "Cat": { 1: ["Drum", "Crappie", "Feathers", "Carp"], 3: ["Blue Catfish", "Blue Shell", "Bluegill", "Blue Feathers"], 6: ["Pearl", "Gold Feather", "Globber", "Shinefish"] },
      "Lemur": { 1: ["Snail", "Caterpillar", "Fire Ant", "Giant Centipede"], 3: ["Shiny Beetle", "Horned Beetle", "Spider", "Ruby Scorpion"], 6: ["Amber", "Grasshopper", "Cyclops Spider", "Dragonfly"] },
      "Snake": { 1: ["Iron", "Hops", "Glass Orb", "Horseshoe"], 3: ["Bucket", "Shimmer Quartz", "Steel", "Wizard Hat"], 6: ["Wine", "Gold Carrot", "Runestone 15", "Skull Coin"] },
      "Pet Rock": { 1: ["Unpolished Ruby", "Unpolished Emerald", "Unpolished Jade", "Unpolished Garnet"], 3: ["Amethyst", "Lemon Quartz", "Shimmer Topaz", "Jade"], 6: ["Shimmer Stone", "Glass Orb", "Carbon Sphere", "Diamond"] },
      "Green Dragon": { 1: ["Runestone 01", "Runestone 02", "Runestone 03", "Runestone 04"], 3: ["Runestone 05", "Runestone 06", "Runestone 07", "Runestone 08"], 6: ["Runestone 09", "Runestone 10", "Runestone 11", "Runestone 12"] },
      "Red Dragon": { 1: ["Runestone 13", "Slimestone", "Unpolished Garnet", "Sour Root"], 3: ["Runestone 14", "Runestone 16", "Green Cloak", "Lantern"], 6: ["Runestone 17", "Runestone 18", "Salt", "Herbs"] },
      "Blue Dragon": { 1: ["Runestone 01", "Runestone 02", "Runestone 04", "Runestone 06"], 3: ["Runestone 08", "Runestone 09", "Runestone 13", "Runestone 14"], 6: ["Lava Sphere", "Runestone 16", "Runestone 18", "Runestone 19"] },
      "Bear": { 1: ["Crappie", "Trout", "Honey", "Small Key"], 3: ["Square Key", "Medium Chest 02", "Sunflower", "Grab Bag 04"], 6: ["Inferno Sphere", "Large Chest 01", "Treasure Key", "Grab Bag 05"] },
      "Hedgehog": { 1: ["Cabbage", "Explosive", "Straw", "Cheese"], 3: ["Orange Juice", "Twine", "Gold Cucumber", "Broccoli"], 6: ["Runestone 07", "Gold Peas", "Green Shield", "Torch Fish"] },
      "Strange Onion": { 1: ["Tomato", "Onion", "Hops", "Potato"], 3: ["Leek", "Watermelon", "Corn", "Cabbage"], 6: ["Pumpkin", "Broccoli", "Mega Beet Seeds", "Mega Sunflower Seeds"] },
    },
    unknown: ["the full pet list", "amount per collection at each level", "cooldown", "level to quantity formula", "friendship effect"],
  },

  // Exchange Center. Five confirmed rates out of a table of unknown size.
  exchange: {
    unit: "items given per items received, one exchange",
    rates: [
      { give: "Acorn", giveQty: 250, get: "Grapes", getQty: 125 },
      { give: "Jade", giveQty: 100, get: "Shark Tooth", getQty: 25 },
      { give: "Spider", giveQty: 350, get: "Cutlass", getQty: 3 },
      { give: "Axe", giveQty: 400, get: "Mug of Beer", getQty: 3 },
      { give: "Gold Leaf", giveQty: 40, get: "Gold Feather", getQty: 50 },
    ],
    unknown: ["the complete rate table", "VIP Card exchanges", "the Borgen Buck economy"],
  },

  // Shop prices. Partial, and the reason a gold figure can finally be put on
  // an exploring plan.
  shops: {
    unit: "price per item",
    entries: [
      { shop: "Country Store", item: "Worms", price: 3, currency: "silver" },
      { shop: "Country Store", item: "Nails", price: 1, currency: "silver" },
      { shop: "Country Store", item: "Pepper Seeds", price: 9, currency: "silver" },
      { shop: "Country Store", item: "Leek Seeds", price: 680, currency: "silver" },
      { shop: "Country Store", item: "Welcome Card", price: 1500, currency: "silver" },
      { shop: "Flea Market", item: "Orange Juice", price: 1, currency: "gold" },
      { shop: "Flea Market", item: "Lemonade", price: 2, currency: "gold" },
      { shop: "Flea Market", item: "Apple Cider", price: 5, currency: "gold" },
      { shop: "Flea Market", item: "Lemon Cream Pie", price: 5, currency: "gold" },
      { shop: "Flea Market", item: "Drink Bundle", price: 100, currency: "gold" },
      { shop: "Flea Market", item: "Tackle Box", price: 50, currency: "gold" },
    ],
    dailyLimits: null,
    unknown: ["the complete silver and gold shop lists", "daily purchase limits", "the Arnold Palmer price"],
  },

  // Quest rewards. Four steps of Distant Illusions and scattered others. The
  // Large Chest 02 line matters: the questline pays them out in bulk.
  questRewards: {
    "Distant Illusions III": { "Borgen Bag 01": 25 },
    "Distant Illusions IV": { "Large Chest 02": 2000 },
    "Distant Illusions VII": { "Grab Bag 06": 500 },
    "Distant Illusions X": { "Lemon Cream Pie": 25 },
    "Secretly A Society Summons You IV": { silver: 5000000000, "Spades": 1, "Large Chest 01": 50 },
    "Secretly A Society Summons You V": { silver: 500000000, "Apple Cider": 200, "Orange Juice": 1000, "Clubs": 1 },
    "Archeology Requires Knowhow I": { "Clubs": 1, "Hearts": 1, "Borgen Buck": 1, "Large Net": 200 },
    "Archeology Requires Knowhow V": { "Apple Turnover": 1 },
    "The Masonry Requires Attention XVIII": {
      silver: 500000000000, "Ancient Coin": 10000, "Apple": 10000, "Apple Cider": 5000, "Baba Cola": 1,
      "Borgen Bag 01": 30, "Cranberry Juice": 1, "Fish and Chips": 2, "Friendship Bag 01": 1,
      "Large Chest 02": 500, "Lemon": 10000, "Maverick Chip": 1, "Mega Cotton Seeds": 200,
      "Mini Time Egg": 1, "Orange": 10000, "Paper Receipt": 1, "Raptor Claw": 200, "Skull Coin": 1000,
    },
  },

  // Recipes the app's own data is missing. Verified on buddy.farm.
  // A missing recipe makes an item look gather-only and can cost tens of
  // thousands of AP, so check buddy.farm before calling anything ungatherable.
  missingRecipes: {
    "Small Bolt": { level: 80, station: "Workshop", ingredients: [["Coal", 5], ["Emberstone", 1], ["Hammer", 1], ["Scrap Metal", 3]], source: "https://buddy.farm/i/small-bolt/" },
  },

  // Still completely absent. Do not guess any of it.
  stillMissing: [
    "the WW Drops Table and WW Wants tables in full",
    "the Tower perk that doubles Wishing Well output - name and floor",
    "whether the wiki's WW numbers are before or after that doubling",
    "the daily Wishing Well throw limit",
    "what any chest or bag actually pays out, for every container",
    "the daily reward table, login streaks, and Daily Grapes",
    "pet amounts per collection, cooldown and scaling",
    "the complete Exchange Center table",
    "complete shop lists and daily limits",
    "per-step rewards for most quest steps",
  ],
};

// Things the account owner has told us directly, that no data source carries.
//
// These are the throughput limits and habits that decide whether a rate means
// anything. Told to Claude 2026-09-21. Where a number is approximate it says
// so; where something is unmeasured it is null, never zero.
window.FRPG_PLAYER_FACTS = {
  schema: "farmrpg-player-facts-v1",
  toldAt: "2026-09-21",

  // Craftworks is an auto-crafter. It runs every second as long as the
  // ingredients are there, so crafting is NOT a bottleneck and a crafting
  // action count is not a time estimate. Supply is the constraint, not the
  // machine.
  craftworks: { auto: true, tickSeconds: 1, dailyCap: null, isBottleneck: false },

  // Not a fixed number. It climbs every day, and resting adds about 18.
  // Read off the game on 2026-09-23: 17,274.
  inventoryCap: { approx: 17274, growsDaily: true, perRest: 18, note: "other items raise it too" },

  // 30 wishes a day. Every item thrown returns ONE item, and the Tower perk
  // doubles it, so a toss returns two of the same thing. That, with the cap,
  // is the whole economics: 30 tosses is at most 60 items a day.
  wishingWell: { tossesPerDay: 30, itemsBack: 1, perkMultiplier: 2, effectivePerDay: 60 },

  // What the farm actually produces. Trout Farm and Worm Habitat are not
  // worth modelling by the owner's own account.
  farm: {
    cowPasture: { milkPerDay: 5000 },
    chickenCoop: { eggsPerDay: null, feathersPerDay: null, note: "a quest returns 10% of total feathers each day as Gold Feather" },
    vineyard: { grapesPerDay: null, cadence: "daily" },
    pigPen: { bacon: true, note: "pigs are killed for Bacon; they also give Truffle, which sells well" },
    troutFarm: { model: false, note: "owner says it is not worth checking" },
    wormHabitat: { model: false, note: "owner says it is not worth checking" },
  },

  // Cheap enough to buy rather than plan around when in a hurry.
  buyWhenRushed: ["Milk", "Grapes", "Eggs"],

  // The Tower target.
  goalFloor: 350,

  // Of the 527 open quest steps, roughly 100 are main-quest steps and the rest
  // are events. Rank main-quest lines first; do not let event lines steer a
  // plan. The owner does intend to finish everything eventually.
  quests: { openStepsTotal: 527, mainQuestStepsApprox: 100, restAreEvents: true },

  // Too slow to be a supply. Use it only for things that exist nowhere else -
  // mega seeds, ducks and similar rarities.
  exchangeCenter: { reliableSupply: false, useFor: "items available nowhere else" },

  // Things the farm hands over for nothing. These cost DAYS, never AP, and
  // must never appear in a "what to stockpile" list: the buildings do it.
  farmMakes: [
    "Wood", "Board", "Straw", "Stone", "Coal", "Steel", "Steel Wire",
    "Iron", "Nails", "Grapes", "Apple", "Orange", "Lemon", "Milk",
    "Eggs", "Feathers", "Bacon",
  ],

  // Containers held in bulk. A chest costs one key to open, so what is in it
  // is effectively already in the bag. Distant Illusions IV hands over another
  // 2,000 Large Chest 02 partway through.
  containersHeld: { "Large Chest 02": 13000 },

  // The Temple. Nothing in any data source covers this - not the knowledge
  // pack, not buddy.farm - so it is here on the owner's word, 2026-09-23.
  temple: {
    offer: "King Apple",
    firstRequirement: 15000,
    stepUp: 1500,              // a flat tenth of the FIRST number, not compounding
    reward: "Cranberry Juice",
    doubleChance: 0.15,
    perDay: 1,
    resetItem: "Temple Voucher",
    // Vouchers come only from Lorn's Expedition Bag and are getting dearer as
    // more players chase them, so treat once a day as the real rule.
    voucherSource: "Lorn's Expedition Bag",
    voucherScarce: true,
    input: "manual clicking, the same black-dot minigame as fishing",
    // The Temple itself has NO cap - you pour in as much as you like, in as
    // many goes as you like. So the 17,274 inventory cap never blocks a
    // turn-in, however large the requirement gets: gather a bagful, pour it,
    // repeat. The real limits are one a day, and the owner's hand.
    holdsPartialDeposits: true,
    bindingLimit: "once a day, and clicking time - never the inventory cap",
  },

  // Apple Bobbing: an event location, roughly three days. Measured by the
  // owner from two screenshots five minutes apart, 2026-09-23. This place is
  // in no drop table anywhere, and none of its items have a known sell price.
  appleBobbing: {
    perMinute: { "Apple": 752, "King Apple": 235, "Apple Core": 3.4 },
    neverMoved: ["Ant Apple", "Bitten Apple", "Apple Slice"],
    note: "rarer than 1 in 5,000 - they did not move once in five minutes",
    inventoryCapObserved: 17274,
    // King Apple has no drop table anywhere in the data and cannot be mailed,
    // so an Apple Bobbing event is the only time it is available at all. The
    // Temple ladder is permanent and only advances when used, which means the
    // cheap early rungs should be spent while an event is running.
    kingAppleIsEventOnly: true,
  },

  // Stamina perks are all owned.
  perks: { staminaCapAllOwned: true },

  // How the owner actually plays - the throughput limits that turn a rate
  // into days. Told to Claude 2026-09-24 to 2026-10-01. A plan that assumes
  // twenty-four hours a day of anything is a wrong plan.
  schedule: {
    activeHoursPerDay: 12,          // "probably can do 12 hours a day"
    sleepsThroughCap: true,         // buildings fill to the cap overnight, the rest is lost
    apPerDay: null,                 // UNKNOWN - ask before saying a goal fits in a month
  },

  // Farm buildings as the owner reported them. Steelworks is the wall on
  // anything made of Steel or Steel Wire.
  buildings: {
    steelworks: { steelPerHour: 8000, steelWirePerHour: 2000, upgradeTo: { steelWirePerHour: 2333, silver: 5e12 } },
    sawmill: { hickoryAlmostAlwaysOn: true },
  },

  // Items per hour from the farm, the shape tools read. Hickory Omelette adds
  // six 20% ticks an hour to the Sawmill only (x2.2). Wood, Board, Straw and
  // Stone rates are from docs/HOW_THE_OWNER_PLAYS.md (2026-09-06); Steel and
  // Steel Wire are the owner's 2026-09-25 numbers. Oak IS a Sawmill product -
  // a session once told the owner it was not.
  perHour: {
    "Wood": { rate: 48000, building: "Sawmill", hickory: true },
    "Board": { rate: 60000, building: "Sawmill", hickory: true },
    "Oak": { rate: 4000, building: "Sawmill", hickory: true },
    "Straw": { rate: 54000, building: "Hay Field" },
    "Stone": { rate: 48000, building: "Quarry" },
    "Coal": { rate: 5000, building: "Quarry" },
    "Steel": { rate: 8000, building: "Steelworks" },
    "Steel Wire": { rate: 2000, building: "Steelworks" },
  },

  // Iron comes off the farm in amounts the owner calls free - do not cost it.
  ironIsFree: true,

  // Prices the owner quoted, in AP per THOUSAND items ("10apk" = 10 AP buys
  // 1,000). Market prices drift; these are the owner's numbers and dates.
  apPerThousand: {
    // Rising and getting hard to source: 10 on 2026-09-24, 12 on 2026-10-02,
    // and the owner reports sellers are scarce at that price.
    "Carbon Sphere": { buy: 12, was: 10, scarce: true, at: "2026-10-02" },
    "Spider": { buy: 50, at: "2026-09-23" },
    "Caterpillar": { buy: 60, at: "2026-09-23" },
    "Scrap Metal": { buy: 3, high: 5, at: "2026-09-22" },
    "Bone": { sell: 7, at: "2026-10-01" },
    "3-leaf Clover": { sell: 7, at: "2026-10-01" },
  },

  // Gold prices the owner quoted, in gold per THOUSAND items.
  goldPerThousand: {
    // Scarce at this price on 2026-10-02 - the owner can "barely find anyone
    // selling for 10". Treat 10 as a floor, not a number you can fill at.
    "Large Net": { buy: 10, high: 11, scarce: true, at: "2026-10-02" },
    "Arnold Palmer": { sell: 42.5, high: 45, at: "2026-10-01" },
    "Apple Cider": { buy: 12.5, at: "2026-10-02" },
    "Orange Juice": { sell: 6, at: "2026-10-02" },
  },
  // How the owner explores, 2026-10-02: stamina plus Apple Cider at 104
  // effectiveness at Whispering Creek, buying Cider when low. Oranges are
  // crafted to OJ and Lemons to Arnold Palmer, and both are sold.
  exploring: { effectiveness: 104, usesCider: true, buysCiderWhenLow: true,
               craftsAndSells: ["Orange Juice", "Arnold Palmer"] },
  // The owner's own read, 2026-10-02: Wrench is a couple of days (1 Steel per
  // craft), Pitchfork is 600k+ in. The hard ones are Red Trunk, Salt, Fancy
  // Drum and Fancy Guitar.
  hardMasteries: ["Red Trunk", "Salt", "Fancy Drum", "Fancy Guitar"],
  // Bone: sell the Grab Bag haul, buy back what quests need later (2026-10-01).
  boneBuyBackLater: true,

  // The budget the owner set for the T300 push, 2026-10-02. They do not want
  // to spend past this. Stamina converts to AP-equivalent only through the
  // derivation in docs/STAMINA_AND_EFFECTIVENESS.md (1.25 stamina per explore,
  // 500 items per AP with Lemon Squeezer = ~625 stamina per AP) - no tool
  // carries that conversion, so say it is derived whenever you use it.
  t300Budget: { stamina: 50e6, gold: 3000, ap: 8000, at: "2026-10-02",
                deadline: "2026-10-31", why: "monthly pack worth 700g+" },

  // Masteries the owner says will finish anyway and should not be planned.
  treatAsFree: ["Hammer", "Axe", "Shovel"],

  // Pumpkin Juice: one makes a Mega Mastery finish at 909,091. Whether a
  // second stacks (finishing at 833,334) is NOT confirmed - say so when used.
  pumpkinJuice: { perJuice: 0.1, stackingConfirmed: false },
  // Owner's choice for the T300 push, 2026-10-01.
  // 2026-10-02: Salt 2, Water Lily "maybe 2", Red Trunk "1 or 2".
  pumpkinJuicePlan: { "Salt": 2, "Water Lily": 2, "Red Trunk": 1 },
  pumpkinJuiceMaybe: { "Red Trunk": 2 },
};

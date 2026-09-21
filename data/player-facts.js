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
  inventoryCap: { approx: 17200, growsDaily: true, perRest: 18, note: "other items raise it too" },

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

  // Stamina perks are all owned.
  perks: { staminaCapAllOwned: true },
};

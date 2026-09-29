// The order Farm RPG itself lists places in, which is the order they unlock.
//
// The Places page used to sort alphabetically, so Black Rock Canyon came second
// and Small Cave came near the end. Nobody thinks of the map that way. A player
// reading this page has the game's own list in their head, and a page that
// disagrees with it makes them hunt for every row.
//
// This list is the authority. Anything not named here is listed after it, in
// alphabetical order, so a new place still shows up rather than disappearing -
// and tests/place-order.test.mjs fails until it is given its real position.
window.FRPG_PLACE_ORDER = {
  schema: "farmrpg-place-order-v1",

  // Exploring, in unlock order.
  explore: [
    "Small Cave",
    "Small Spring",
    "Highland Hills",
    "Cane Pole Ridge",
    "Misty Forest",
    "Black Rock Canyon",
    "Forest",
    "Mount Banon",
    "Ember Lagoon",
    "Whispering Creek",
    "Jundland Desert",
    "Gary's Crushroom",
    "Sinking Swamp",
  ],

  // Fishing, in unlock order.
  fishing: [
    "Small Pond",
    "Farm Pond",
    "Forest Pond",
    "Lake Tempest",
    "Small Island",
    "Crystal River",
    "Emerald Beach",
    "Vast Ocean",
    "Lake Minerva",
    "Large Island",
    "Pirate's Cove",
    "Glacier Lake",
    "Sinking Swamp",
  ],

  // Seasonal places. The game only shows them while the event is running, so
  // they belong after the permanent list rather than wedged into it.
  events: [
    "Haunted House",
    "Santa's Workshop",
  ],
};

// Sort key for one place. Lower comes first. Permanent places keep their
// in-game position, event places follow them, and anything unrecognised goes
// last so it is visible rather than silently mis-sorted.
window.FRPG_PLACE_ORDER.rank = function rank(mode, name) {
  const order = this[mode === "fishing" ? "fishing" : "explore"] || [];
  const at = order.indexOf(name);
  if (at >= 0) return at;
  const event = this.events.indexOf(name);
  if (event >= 0) return 1000 + event;
  return 2000;
};

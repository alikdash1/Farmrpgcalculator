// Container contents are not recipes.
//
// data/data.js carries what a bag, chest or present GIVES as if it were what it
// COSTS ("Grab Bag 01 = 50 Bone + 50 3-leaf Clover"). That invented demand for
// clover, bones and chest parts. This file removes those rows from
// FRPG_DATA.recipes.craft once, at load, so every page and engine.js inherit it.
//
// Load after data/data.js, data/extra-items.js, data/item-info.js and
// data/wishing-well.js, and before js/engine.js. tools/prepare.mjs runs this
// same file, so the command-line tools and the app share one rule.
(function () {
  var CONTAINER_NAME = /(^(Box|Bag|Bags?) of )|(\b(Bag|Basket|Present|Chest|Crate|Bundle|Cornucopia|Envelope|Tote|Stocking|Box|Snack Pack)( \d+)?$)/;

  function isContainer(W, item) {
    if (!item) return false;
    var boxes = ((W.FRPG_CONTAINERS || {}).byName) || {};
    if (boxes[item.name]) return true;
    var info = ((W.FRPG_ITEM_INFO || {}).items || {})[item.name] || {};
    // The Locksmith hint lives in either field - "desc" is the game text, "note"
    // is buddy.farm's, and Green Backpack only says it in the note.
    var desc = (info.desc || "") + " " + (info.note || "");
    if (/locksmith|open to receive/i.test(desc)) return true;
    // Never made at a workbench, and either named like a container or described
    // by what is inside it ("Includes bait, fishing nets", "Contains 5 Playing
    // Cards"). Not "full of": Red Berry Pie is full of red berries. Wooden Box
    // and Sturdy Box have a craft level, so they stay real.
    if (item.craftLevel != null) return false;
    return CONTAINER_NAME.test(item.name) || /\b(includes|contains)\b/i.test(desc);
  }

  // Returns the sorted names of every container whose recipe rows have been
  // removed so far. Safe to run twice; a second run removes nothing new.
  function dropContainerRecipes(W) {
    var D = W.FRPG_DATA;
    var dropped = new Set(W.FRPG_DROPPED_CONTAINERS || []);
    if (!D || !D.recipes || !Array.isArray(D.recipes.craft) || !D.items) return Array.from(dropped).sort();
    var byId = new Map(D.items.items.map(function (i) { return [i.id, i]; }));
    D.recipes.craft = D.recipes.craft.filter(function (r) {
      var out = byId.get(r.itemId);
      if (isContainer(W, out)) { dropped.add(out.name); return false; }
      return true;
    });
    W.FRPG_DROPPED_CONTAINERS = Array.from(dropped).sort();
    return W.FRPG_DROPPED_CONTAINERS;
  }

  window.FRPG_CONTAINER_RULE = { isContainer: isContainer, dropContainerRecipes: dropContainerRecipes };
  dropContainerRecipes(window);
})();

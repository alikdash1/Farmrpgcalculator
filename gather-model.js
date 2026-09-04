(function () {
  // What is still needed for a tracked questline, netted against what the
  // player holds. Both the Inventory tab and the floating tracker read this,
  // so the two can never disagree about what is left.
  const MODEL = window.FRPG_QUEST_MODEL;
  const ART = window.FRPG_ITEM_ART_HELPER;
  if (!MODEL || !ART) return;

  const itemRows = ((((window.FRPG_DATA || {}).items || {}).items) || []);
  const byId = new Map(itemRows.map((item) => [String(item.id), item]));
  const byName = new Map(itemRows.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
  const keyFor = (name) => String(name || "").trim().toLowerCase();

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (_) { return null; }
  }

  // frpg_owned exists as an empty object from the app's first save, so
  // "present" is not "has amounts in it". Fall through to the capture when the
  // player has entered nothing by hand.
  function inventoryRows() {
    const saved = readJson("frpg_owned");
    if (saved && typeof saved === "object" && !Array.isArray(saved) && Object.keys(saved).length) {
      return Object.entries(saved).map(([id, quantity]) => {
        const item = byId.get(String(id));
        return item && Number(quantity) > 0 ? { name: item.name, quantity: Number(quantity), item } : null;
      }).filter(Boolean);
    }
    const snapshot = readJson("frpg_account_snapshot_v1");
    const rows = ((snapshot && snapshot.inventory) || []).map((row) => {
      const name = row.name || row.itemName || "";
      const item = byName.get(keyFor(name)) || null;
      return name && Number(row.quantity) > 0 ? { name, quantity: Number(row.quantity), item } : null;
    }).filter(Boolean);
    return rows.filter((row) => !isDescription(row.name));
  }

  // Farm RPG prints a description under each item name, and older captures
  // stored those as items: "A blinger for your finger", "Almost transparent",
  // "Adds 100 Stamina". Guessing at their shape kept missing cases — the last
  // one is Title Case with no lowercase word in it. The complete item library
  // makes guessing unnecessary: if Farm RPG has no item by that name, and no
  // artwork was found for it anywhere including the player's own captures,
  // then it is not an item. An item added to the game after the library was
  // built still passes, because a capture brings its picture along.
  function isDescription(name) {
    const text = String(name || "").trim();
    if (!text) return true;
    if (ART.isCurrency(text)) return false;
    return !(ART.isKnownItem ? ART.isKnownItem(text) : (ART.itemFor(text) || ART.urlFor(text)));
  }

  function ignoredCount() {
    const snapshot = readJson("frpg_account_snapshot_v1");
    const saved = readJson("frpg_owned");
    if (saved && typeof saved === "object" && Object.keys(saved).length) return 0;
    return ((snapshot && snapshot.inventory) || [])
      .filter((row) => isDescription(row.name || row.itemName || "")).length;
  }

  function ownedMap(rows) {
    const map = new Map();
    for (const row of rows) map.set(keyFor(row.name), (map.get(keyFor(row.name)) || 0) + Number(row.quantity || 0));
    return map;
  }

  function totalsFor(quests) {
    const totals = new Map();
    for (const quest of quests) {
      for (const row of quest.requirements || []) {
        const key = keyFor(row.item);
        if (!key) continue;
        if (!totals.has(key)) totals.set(key, { name: row.item, quantity: 0 });
        totals.get(key).quantity += Number(row.quantity || 0);
      }
    }
    return [...totals.values()];
  }

  function withStock(requirements, have) {
    return requirements.map((row) => {
      const currency = ART.isCurrency(row.name);
      const owned = currency ? null : Number(have.get(keyFor(row.name)) || 0);
      return { ...row, owned, short: Math.max(0, Number(row.quantity || 0) - Number(owned || 0)), currency };
    }).sort((a, b) => Number(b.short > 0) - Number(a.short > 0) || b.short - a.short || a.name.localeCompare(b.name));
  }

  function trackedLine() {
    try { return localStorage.getItem("frpg_tracked_line") || ""; }
    catch (_) { return ""; }
  }

  function hasStoredChoice() {
    try { return localStorage.getItem("frpg_tracked_line") !== null; }
    catch (_) { return false; }
  }

  // The questline the player has started and has the most left to do on. Used
  // when nothing is pinned, so neither view ever opens on an empty picker.
  function busiestLine() {
    const completed = MODEL.completedSet();
    let started = null;
    let anything = null;
    for (const line of MODEL.lines) {
      const steps = MODEL.quests.filter((quest) => quest.line === line.name);
      const left = steps.filter((quest) => !completed.has(MODEL.normalizeTitle(quest.title))).length;
      if (!left) continue;
      if (!anything || left > anything.left) anything = { name: line.name, left };
      if (steps.length - left > 0 && (!started || left > started.left)) started = { name: line.name, left };
    }
    return (started || anything || {}).name || "";
  }

  function plan() {
    const pinned = trackedLine();
    const known = MODEL.lines.some((line) => line.name === pinned);
    // An empty stored value is a deliberate "none" and must be respected;
    // auto-picking is only for a player who has never chosen.
    const clearedOnPurpose = !known && hasStoredChoice() && !pinned;
    const lineName = known ? pinned : (clearedOnPurpose ? "" : busiestLine());
    const stock = inventoryRows();
    if (!lineName) return { lineName: "", auto: !known, stock, remaining: [], next: null, nextRows: [], wholeRows: [] };

    const completed = MODEL.completedSet();
    const remaining = MODEL.quests.filter((quest) => quest.line === lineName && !completed.has(MODEL.normalizeTitle(quest.title)));
    const have = ownedMap(stock);
    return {
      lineName,
      auto: !known,
      stock,
      remaining,
      next: remaining[0] || null,
      nextRows: remaining.length ? withStock(totalsFor([remaining[0]]), have) : [],
      wholeRows: withStock(totalsFor(remaining), have),
    };
  }

  // Where an item comes from, in the player's terms, from the data already
  // loaded — no rates, no invention. Beware: for a meal, growMin is the
  // cooking time, not a growth time, so meals must never read as "Grow".
  function whereFor(name) {
    const index = window.FRPG_INDEX;
    if (!index) return "";
    const id = index.idByName.get(keyFor(name));
    const item = id ? index.itemsById.get(id) : null;
    if (!item) return "";

    const bits = [];
    if (item.craftPrice != null) bits.push("Craft");
    if (item.type === "meal" || item.cookLevel != null) bits.push("Cook");
    else if (item.growMin > 0) bits.push("Grow");

    const sources = index.locsByItem.get(keyFor(item.name)) || [];
    const fishing = [...new Set(sources.filter((row) => row.mode === "fishes").map((row) => row.loc))];
    const exploring = [...new Set(sources.filter((row) => row.mode !== "fishes").map((row) => row.loc))];
    if (fishing.length) bits.push("Fish " + fishing[0] + (fishing.length > 1 ? " +" + (fishing.length - 1) : ""));
    if (exploring.length) bits.push("Explore " + exploring[0] + (exploring.length > 1 ? " +" + (exploring.length - 1) : ""));

    if (item.buy != null && item.buy > 0) bits.push("Buy " + item.buy.toLocaleString() + "g");
    const market = index.marketByName.get(keyFor(item.name));
    if (market && (market.gold || market.ap || market.oj)) bits.push("Trade");
    return bits.join(" · ");
  }

  window.FRPG_GATHER = {
    whereFor, plan, inventoryRows, ignoredCount, trackedLine, hasStoredChoice, busiestLine, keyFor };
})();

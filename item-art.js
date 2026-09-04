(function () {
  // One art lookup for the whole app.
  //
  // Several data files arrive carrying their own artwork — the mining release
  // catalogue in data/new-items.js, the Tower T300-T340 requirements in
  // data/tower-floors.js. When the lookup only consulted data/items.js those
  // pictures were silently dropped and the tile fell back to a bare initial,
  // even though a perfectly good URL was sitting in the same file. So this
  // helper reads every source that has art, in order of how canonical it is.
  const W = window;
  const absolute = (path) => {
    const value = String(path || "").trim();
    if (!value) return "";
    return /^https?:\/\//i.test(value) ? value : `https://farmrpg.com${value}`;
  };

  const items = ((((W.FRPG_DATA || {}).items || {}).items) || []);
  const byName = new Map(items.map((item) => [String(item.name || "").trim().toLowerCase(), item]));

  // Later sources never overwrite an earlier one.
  const art = new Map();
  const learn = (name, path) => {
    const key = String(name || "").trim().toLowerCase();
    const url = absolute(path);
    if (key && url && !art.has(key)) art.set(key, url);
  };

  for (const item of items) learn(item.name, item.img);
  for (const [name, path] of Object.entries((W.FRPG_ITEM_ART && W.FRPG_ITEM_ART.art) || {})) learn(name, path);

  const catalog = W.FRPG_NEW_ITEMS || {};
  const connected = Array.isArray(catalog.connected) ? catalog.connected : Object.values(catalog.connected || {});
  for (const row of [...(catalog.items || []), ...connected]) learn(row && row.name, row && (row.image || row.img));

  for (const floor of ((W.FRPG_TOWER_FLOORS || {}).floors || [])) {
    for (const row of [...(floor.gms || []), ...(floor.mms || [])]) learn(row.name, row.img);
  }

  // Silver is the game's currency, not an item. It gets no picture anywhere.
  function isCurrency(name) {
    return String(name || "").trim().toLowerCase() === "silver";
  }

  function itemFor(name) {
    return byName.get(String(name || "").trim().toLowerCase()) || null;
  }

  function urlFor(name) {
    if (isCurrency(name)) return "";
    return art.get(String(name || "").trim().toLowerCase()) || "";
  }

  W.FRPG_ITEM_ART_HELPER = { itemFor, urlFor, isCurrency, known: art.size };
})();

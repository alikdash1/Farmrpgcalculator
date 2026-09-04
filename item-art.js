(function () {
  const items = ((((window.FRPG_DATA || {}).items || {}).items) || []);
  const byName = new Map(items.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
  const extra = (window.FRPG_ITEM_ART && window.FRPG_ITEM_ART.art) || {};
  const extraByName = new Map(Object.entries(extra).map(([name, path]) => [name.trim().toLowerCase(), path]));
  const absolute = (path) => path && /^https?:\/\//i.test(path) ? path : path ? `https://farmrpg.com${path}` : "";

  function itemFor(name) {
    return byName.get(String(name || "").trim().toLowerCase()) || null;
  }

  function urlFor(name) {
    if (isCurrency(name)) return "";
    const item = itemFor(name);
    if (item && item.img) return absolute(item.img);
    return absolute(extraByName.get(String(name || "").trim().toLowerCase()) || "");
  }

  function isCurrency(name) {
    return String(name || "").trim().toLowerCase() === "silver";
  }

  window.FRPG_ITEM_ART_HELPER = { itemFor, urlFor, isCurrency };
})();

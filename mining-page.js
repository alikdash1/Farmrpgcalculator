// Mines page: pick a mine, see everything it drops and what those drops make.
// Data comes from data/location-intel.js (the six mines and their item lists,
// built from the player's own location captures) joined against the item
// catalogue in data/new-items.js + data/mining-capture-items.js for art, and
// against the main recipe index in data/data.js for craft links.
(() => {
  const INTEL = window.FRPG_LOCATION_INTEL;
  const CATALOG = window.FRPG_NEW_ITEMS;
  const DATA = window.FRPG_DATA;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const grid = document.getElementById("mineGrid");
  if (!INTEL || !ART || !grid) return;

  const mines = (INTEL.mining && INTEL.mining.mines) || [];
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ---- item lookup ---------------------------------------------------------
  const catalogItems = (CATALOG && CATALOG.items) || [];
  const connected = CATALOG && CATALOG.connected
    ? (Array.isArray(CATALOG.connected) ? CATALOG.connected : Object.values(CATALOG.connected))
    : [];
  const baseItems = (DATA && DATA.items && DATA.items.items) || [];

  const byName = new Map();
  const remember = (row) => {
    const key = String(row && row.name || "").toLowerCase();
    if (key && !byName.has(key)) byName.set(key, row);
  };
  catalogItems.forEach(remember);
  connected.forEach(remember);

  const baseByName = new Map(baseItems.map((item) => [item.name.toLowerCase(), item]));
  const artFor = (name) => ART.urlFor(name);

  // ---- craft links ---------------------------------------------------------
  // Prefer the release catalogue's own usedIn/recipe, and fall back to the full
  // recipe index so older materials still show what they feed.
  // craft rows are {itemId: what gets made, reqId: what it needs, amt}
  const craftRows = (DATA && DATA.recipes && DATA.recipes.craft) || [];
  const nameById = new Map(baseItems.map((item) => [item.id, item.name]));
  const usedInIndex = new Map();
  const linkUsedIn = (ingredient, output) => {
    if (!ingredient || !output) return;
    const key = String(ingredient).toLowerCase();
    if (!usedInIndex.has(key)) usedInIndex.set(key, new Set());
    usedInIndex.get(key).add(output);
  };
  for (const row of craftRows) linkUsedIn(nameById.get(row.reqId), nameById.get(row.itemId));
  // The release catalogue records each craft's ingredients but not always the
  // reverse, so invert those recipes too — otherwise a raw ore looks unused
  // when the craft that eats it is sitting right there in the same file.
  for (const item of [...catalogItems, ...connected]) {
    if (!item || !Array.isArray(item.recipe)) continue;
    for (const part of item.recipe) linkUsedIn(part && part.name, item.name);
  }

  function craftsFrom(name) {
    const key = String(name || "").toLowerCase();
    const rich = byName.get(key);
    const out = new Map();
    if (rich && Array.isArray(rich.usedIn)) {
      for (const row of rich.usedIn) if (row && row.name) out.set(row.name, row.name);
    }
    for (const output of (usedInIndex.get(key) || [])) out.set(output, output);
    return [...out.keys()];
  }

  function madeOf(name) {
    const rich = byName.get(String(name || "").toLowerCase());
    if (!rich || !Array.isArray(rich.recipe) || !rich.recipe.length) return [];
    return rich.recipe.map((row) => `${row.quantity ? `${row.quantity}× ` : ""}${row.name}`);
  }

  // ---- where things come from, and what each craft needs ------------------
  const SOURCE_WORDS = { explore: "Explore", fishing: "Fishing", mining: "Mining" };
  const itemSources = (INTEL && INTEL.itemSources) || {};

  function whereFrom(name) {
    const rows = itemSources[name] || itemSources[String(name || "")] || [];
    const seen = [];
    for (const row of rows) {
      const label = `${SOURCE_WORDS[row.type] || row.type} · ${row.location}`;
      if (!seen.includes(label)) seen.push(label);
    }
    if (seen.length) return seen.slice(0, 2).join(" / ");
    const rich = byName.get(String(name || "").toLowerCase());
    if (rich && Array.isArray(rich.sources) && rich.sources.length) return rich.sources[0].label || "";
    const base = baseByName.get(String(name || "").toLowerCase());
    if (base && base.buy != null && base.buy > 0) return "Country Store";
    return "";
  }

  // The release catalogue carries art with its recipes; the base index carries
  // recipes for everything older. Prefer the first, fall back to the second.
  const recipeByOutput = new Map();
  for (const row of craftRows) {
    const output = nameById.get(row.itemId);
    const part = nameById.get(row.reqId);
    if (!output || !part) continue;
    if (!recipeByOutput.has(output)) recipeByOutput.set(output, []);
    recipeByOutput.get(output).push({ name: part, quantity: row.amt });
  }

  function recipeFor(name) {
    const rich = byName.get(String(name || "").toLowerCase());
    if (rich && Array.isArray(rich.recipe) && rich.recipe.length) return rich.recipe;
    return recipeByOutput.get(name) || [];
  }

  function craftLevel(name) {
    const rich = byName.get(String(name || "").toLowerCase());
    if (rich && rich.sources && rich.sources.length && rich.sources[0].label) return rich.sources[0].label;
    if (rich && rich.craftingLevel) return `Workshop · Crafting ${rich.craftingLevel}`;
    return "";
  }

  // ---- rendering -----------------------------------------------------------
  // One stacked row per mine. Opening a mine drops its drops in directly
  // underneath it and pushes the remaining mines down, rather than sending the
  // player to a separate panel further down the page.

  // Each tile size has to declare its own box; a single hard-coded 28 made the
  // 34px drop tiles and 22px ingredient tiles both claim the wrong size.
  const ART_PX = { drop: 34, craft: 28, part: 22 };
  function itemImg(name, cls) {
    const src = artFor(name);
    const px = ART_PX[cls] || 28;
    const label = esc(name);
    if (!src) return `<span class="mine-art ${cls} missing" aria-hidden="true">${label.slice(0, 1)}</span>`;
    return `<span class="mine-art ${cls}"><img src="${esc(src)}" alt="${label}" width="${px}" height="${px}" loading="lazy"></span>`;
  }

  function itemsMarkup(mine) {
    const drops = new Set(mine.items);

    // Every craft this mine's drops reach, one level out and then one more, in
    // a single de-duplicated list. Nesting each craft under each drop that
    // feeds it repeated the same recipes and turned one mine into minutes of
    // scrolling.
    const crafts = [];
    const seen = new Set();
    const addCraft = (name) => {
      if (!name || drops.has(name) || seen.has(name)) return;
      seen.add(name);
      crafts.push(name);
    };
    for (const drop of mine.items) for (const craft of craftsFrom(drop)) addCraft(craft);
    for (const craft of [...crafts]) for (const next of craftsFrom(craft)) addCraft(next);

    const dropChips = mine.items.map((name) => {
      const feeds = craftsFrom(name).length;
      return `<li class="mine-drop">${itemImg(name, "drop")}<span><b>${esc(name)}</b><small>${feeds ? `feeds ${feeds}` : "no craft yet"}</small></span></li>`;
    }).join("");

    const craftCards = crafts.map((craft) => {
      const parts = recipeFor(craft);
      const level = craftLevel(craft);
      return `<article class="mine-craft">
        <header>${itemImg(craft, "craft")}<span><b>${esc(craft)}</b>${level ? `<small>${esc(level)}</small>` : ""}</span></header>
        ${parts.length ? `<ul class="mine-recipe">${parts.map((part) => {
          const from = whereFrom(part.name);
          return `<li class="${drops.has(part.name) ? "is-this" : ""}" title="${esc(from || "source not recorded")}">${itemImg(part.name, "part")}<span>${part.quantity ? `${part.quantity}× ` : ""}${esc(part.name)}</span></li>`;
        }).join("")}</ul>` : `<p class="mine-recipe-none">Recipe not recorded yet.</p>`}
      </article>`;
    }).join("");

    return `<div class="mine-body">
      <section class="mine-section">
        <h3>What it drops</h3>
        <ul class="mine-drops">${dropChips}</ul>
      </section>
      <section class="mine-section">
        <h3>What those drops make <small>${crafts.length} craft${crafts.length === 1 ? "" : "s"}</small></h3>
        ${crafts.length ? `<div class="mine-crafts">${craftCards}</div>` : `<p class="mine-recipe-none">Nothing recorded that uses these yet.</p>`}
      </section>
    </div>`;
  }

  function render() {
    grid.innerHTML = mines.map((mine) => {
      const unknown = Number(mine.unknownSlots || 0);
      return `<details class="mine-row" data-mine="${esc(mine.name)}">
        <summary>
          <span class="mine-card-art">${mine.image ? `<img src="${esc(mine.image)}" alt="" width="56" height="56" loading="lazy">` : ""}</span>
          <span class="mine-card-body">
            <strong>${esc(mine.name)}</strong>
            <small>${mine.items.length} items${unknown ? ` · ${unknown} slot${unknown === 1 ? "" : "s"} still locked` : ""}</small>
            <small class="mine-card-kit">${esc(mine.pickaxe || "Pickaxe unknown")} · ${esc(mine.bag || "Bag unknown")}</small>
          </span>
          <span class="mine-row-cue">View drops</span>
        </summary>
        ${itemsMarkup(mine)}
      </details>`;
    }).join("");
  }

  // One at a time, so the open mine's drops are what fills the screen.
  grid.addEventListener("toggle", (event) => {
    const row = event.target;
    if (!(row instanceof HTMLDetailsElement) || !row.open) return;
    grid.querySelectorAll("details.mine-row[open]").forEach((other) => {
      if (other !== row) other.open = false;
    });
    row.scrollIntoView({ block: "start", behavior: "smooth" });
  }, true);

  render();
})();

// Items page: the whole game's item list, and one page per item that answers
// "what is this, where does it come from, what is it worth, and who wants it".
//
// Everything here is already loaded by the other pages — recipes and drop rates
// from data/data.js (+ data/extra-items.js), drops per Arnold Palmer and per
// Large Net from the owner's sheet in data/workbook-rates.js, descriptions from
// data/item-info.js, quests from quest-model.js, and what the player holds from
// their own account snapshot. Nothing is fetched and nothing is invented.
(() => {
  const DATA = window.FRPG_DATA;
  const INFO = (window.FRPG_ITEM_INFO || {}).items || {};
  const ART = window.FRPG_ITEM_ART_HELPER;
  const WB = window.FRPG_WORKBOOK_RATES || {};
  const INTEL = window.FRPG_LOCATION_INTEL || {};
  const QUESTS = window.FRPG_QUEST_MODEL || null;
  const PROGRESS = window.FRPG_PROGRESSION || { items: {} };
  const TOWER = window.FRPG_PERSONAL_TOWER || { masteries: {} };
  const view = document.getElementById("items");
  const list = document.getElementById("itemsResults");
  const detail = document.getElementById("itemsDetail");
  const search = document.getElementById("itemsSearch");
  if (!DATA || !ART || !view || !list || !detail || !search) return;

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const nf = new Intl.NumberFormat();
  const fmt = (value) => {
    const n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 2).replace(/\.00$/, "") + "m";
    if (n >= 10000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
    return nf.format(Math.round(n * 100) / 100);
  };
  const whole = (value) => nf.format(Math.round(Number(value) || 0));
  const key = (name) => String(name || "").trim().toLowerCase();

  // ---- the catalogue -------------------------------------------------------
  const items = (DATA.items.items || []).filter((item) => item.active !== false);
  const byName = new Map(items.map((item) => [key(item.name), item]));
  const byId = new Map(items.map((item) => [item.id, item]));

  const craftOf = new Map();      // what this item's recipe needs
  const craftInto = new Map();    // what this item helps make
  for (const row of DATA.recipes.craft || []) {
    if (!craftOf.has(row.itemId)) craftOf.set(row.itemId, []);
    craftOf.get(row.itemId).push(row);
    if (!craftInto.has(row.reqId)) craftInto.set(row.reqId, []);
    craftInto.get(row.reqId).push(row);
  }
  const cookOf = new Map();
  const cookInto = new Map();
  for (const row of DATA.recipes.cook || []) {
    if (!cookOf.has(row.itemId)) cookOf.set(row.itemId, []);
    cookOf.get(row.itemId).push(row);
    const reqId = row.reqId != null ? row.reqId : (byName.get(key(row.reqName)) || {}).id;
    if (reqId == null) continue;
    if (!cookInto.has(reqId)) cookInto.set(reqId, []);
    cookInto.get(reqId).push(Object.assign({}, row, { reqId }));
  }

  // Where each item is found, in both units the game gives you: the logged
  // explores (or casts) per drop, and the owner's sheet per Arnold Palmer or
  // per Large Net.
  const placesOf = new Map();
  const addPlace = (name, place) => {
    const k = key(name);
    if (!placesOf.has(k)) placesOf.set(k, []);
    placesOf.get(k).push(place);
  };
  for (const loc of DATA.sources.locations || []) {
    const fishing = loc.type === "fishing";
    const sheet = (fishing ? WB.fishing : WB.exploring) || {};
    const sheetRates = sheet[loc.name] || {};
    const seen = new Set();
    for (const [table, byHand] of [[loc.drops || {}, false], [loc.fish || {}, true]]) {
      for (const [name, info] of Object.entries(table)) {
        const k = key(name) + (byHand ? "|hand" : "");
        if (seen.has(k)) continue;
        seen.add(k);
        addPlace(name, {
          location: loc.name,
          kind: fishing ? (byHand ? "fishing by hand" : "fishing with nets") : "exploring",
          fishing,
          byHand,
          denom: info && info.denom > 0 ? info.denom : null,
          // The sheet counts per Large Net, so it says nothing about casting
          // by hand and does not belong on that row.
          sheet: !byHand && sheetRates[name] > 0 ? sheetRates[name] : null,
        });
      }
    }
    // A place the logs never covered still has the sheet's own rates.
    for (const [name, rate] of Object.entries(sheetRates)) {
      if (!(rate > 0)) continue;
      if ((placesOf.get(key(name)) || []).some((place) => place.location === loc.name)) continue;
      addPlace(name, { location: loc.name, kind: fishing ? "fishing with nets" : "exploring", fishing, byHand: false, denom: null, sheet: rate });
    }
  }
  const mineOf = new Map();
  for (const mine of ((INTEL.mining || {}).mines) || []) {
    for (const name of mine.items || []) mineOf.set(key(name), mine);
  }

  const market = (DATA.market && DATA.market.items) || {};
  const marketFor = (name) => market[name] || null;
  const infoFor = (name) => INFO[name] || {};
  const factFor = (name) => (PROGRESS.items || {})[name] || null;

  // ---- what the player has -------------------------------------------------
  function snapshot() {
    try { return JSON.parse(localStorage.getItem("frpg_account_snapshot_v1") || "null"); }
    catch (_) { return null; }
  }
  let account = snapshot();
  let held = new Map();
  const readHeld = () => {
    held = new Map();
    for (const row of (account && account.inventory) || []) {
      const quantity = Number(row && row.quantity);
      if (row && row.name && Number.isFinite(quantity)) held.set(key(row.name), quantity);
    }
  };
  readHeld();
  const heldOf = (name) => held.get(key(name));

  const masteryOf = (name) => {
    const value = Number((TOWER.masteries || {})[name]);
    return Number.isFinite(value) ? value : null;
  };
  const towerFloorOf = (name) => {
    const fact = factFor(name);
    return fact && fact.mastery && fact.mastery.towerRequirement ? Number(fact.mastery.towerRequirement) : null;
  };

  const towerByName = () => {
    const map = new Map();
    for (const row of window.FRPG_TOWER_NEEDS || []) {
      const k = key(row.name);
      const held = map.get(k);
      // An unfinished floor beats a finished one; otherwise the lower floor.
      if (!held || (Number(held.complete) - Number(row.complete)) > 0 || (held.complete === row.complete && row.floor < held.floor)) {
        map.set(k, row);
      }
    }
    return map;
  };
  let towerRows = towerByName();
  const towerOf = (name) => towerRows.get(key(name)) || null;

  const questCache = new Map();
  function questNeeds(name) {
    if (!QUESTS) return null;
    const k = key(name);
    if (!questCache.has(k)) questCache.set(k, QUESTS.needsByItem(name, account));
    return questCache.get(k);
  }

  // ---- filters -------------------------------------------------------------
  const FILTERS = [
    { id: "all", label: "Everything", test: () => true },
    { id: "quest", label: "Wanted by a quest", test: (item) => !!questNeeds(item.name) },
    { id: "craft", label: "Craftable", test: (item) => craftOf.has(item.id) || cookOf.has(item.id) },
    { id: "found", label: "Found somewhere", test: (item) => (placesOf.get(key(item.name)) || []).length > 0 || mineOf.has(key(item.name)) },
    // Only what the Tower still wants: a mastery you have finished is not a job.
    { id: "tower", label: "Tower mastery", test: (item) => { const row = towerOf(item.name); return !!row && !row.complete; } },
    { id: "held", label: "In your inventory", test: (item) => heldOf(item.name) > 0 },
  ];
  const prefs = {
    filter: localStorage.getItem("frpg_items_filter_v1") || "all",
    query: "",
  };

  // ---- the list ------------------------------------------------------------
  const RECENT_KEY = "frpg_items_recent_v1";
  const recent = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((name) => byName.has(key(name))); }
    catch (_) { return []; }
  };
  const remember = (name) => {
    const rows = [name, ...recent().filter((row) => key(row) !== key(name))].slice(0, 8);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(rows)); } catch (_) { /* private mode */ }
  };

  const slugFor = (name) => infoFor(name).slug || key(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const bySlug = new Map(items.map((item) => [slugFor(item.name), item]));

  function summaryLine(item) {
    const bits = [];
    const places = placesOf.get(key(item.name)) || [];
    if (craftOf.has(item.id)) bits.push("craft");
    if (cookOf.has(item.id)) bits.push("cook");
    if (item.growMin > 0 && item.type !== "meal") bits.push("grow");
    if (places.length) bits.push(places.length === 1 ? places[0].location : `${places.length} places`);
    if (mineOf.has(key(item.name))) bits.push("mine");
    if (item.buy > 0) bits.push("store");
    const needs = questNeeds(item.name);
    if (needs) bits.push(`${fmt(needs.total)} for quests`);
    const have = heldOf(item.name);
    if (have > 0) bits.push(`${fmt(have)} held`);
    return bits.join(" · ") || item.type;
  }

  let results = [];
  let selected = null;

  function matches(item) {
    const filter = FILTERS.find((row) => row.id === prefs.filter) || FILTERS[0];
    if (!filter.test(item)) return false;
    if (!prefs.query) return true;
    return key(item.name).includes(prefs.query);
  }

  function renderList() {
    towerRows = towerByName();
    const byFloor = prefs.filter === "tower";
    results = items.filter(matches).sort((a, b) => {
      if (byFloor) {
        const rowA = towerOf(a.name), rowB = towerOf(b.name);
        if (rowA && rowB) {
          // Nearest floor first, and what is still owed before what is done.
          return Number(rowA.complete) - Number(rowB.complete) || rowA.floor - rowB.floor || rowA.remaining - rowB.remaining;
        }
        if (rowA || rowB) return rowA ? -1 : 1;
      }
      if (prefs.query) {
        const aStarts = key(a.name).startsWith(prefs.query), bStarts = key(b.name).startsWith(prefs.query);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    const shown = results.slice(0, 300);
    const count = document.getElementById("itemsCount");
    if (count) {
      count.textContent = `${whole(results.length)} ${results.length === 1 ? "item" : "items"}` +
        (byFloor ? " · nearest floor first" : "") +
        (results.length > shown.length ? ` · first ${whole(shown.length)} shown` : "");
    }
    list.innerHTML = shown.map((item) => {
      const tower = towerOf(item.name);
      const pct = tower && tower.goal > 0 ? Math.min(100, Math.round(tower.current / tower.goal * 100)) : 0;
      const towerLine = tower ? `
        <span class="items-row-tower">
          <em class="items-tier is-${tower.tier}">${tower.tier === "gm" ? "GM" : "MM"}</em>
          <em class="items-floor">T${whole(tower.floor)}</em>
          <span class="items-rowbar" aria-hidden="true"><i style="width:${pct}%"></i></span>
          <em class="items-left">${tower.complete ? "done" : `${fmt(tower.remaining)} left`}</em>
        </span>` : "";
      return `
      <button type="button" class="items-row${selected && selected.id === item.id ? " is-open" : ""}${tower && tower.complete ? " is-done" : ""}" data-item="${esc(item.name)}">
        <img src="${esc(ART.urlFor(item.name) || "")}" alt="" width="32" height="32" loading="lazy">
        <span><b>${esc(item.name)}</b><small>${esc(summaryLine(item))}</small>${towerLine}</span>
      </button>`;
    }).join("") || `<p class="items-none">Nothing matches that. Try a shorter word, or another filter.</p>`;
  }

  // ---- one item ------------------------------------------------------------
  const chip = (name, amount) => `
    <button type="button" class="items-chip" data-item="${esc(name)}" title="Open ${esc(name)}">
      <img src="${esc(ART.urlFor(name) || "")}" alt="" width="26" height="26" loading="lazy">
      <span><b>${esc(name)}</b>${amount != null ? `<small>× ${whole(amount)}</small>` : ""}</span>
    </button>`;

  function factsHtml(item) {
    const rows = [];
    if (item.sell != null) rows.push(["Sells for", `${whole(item.sell)} silver`, "each, before perks"]);
    const quote = marketFor(item.name);
    if (quote && quote.raw) {
      const traded = ["gold", "ap", "oj"].filter((cur) => quote.raw[cur] && quote.raw[cur] !== "PC")
        .map((cur) => `${quote.raw[cur]} ${cur.toUpperCase()}`);
      if (traded.length) rows.push(["Players pay", traded.join(" · "), quote.updated ? `price check ${String(quote.updated).slice(0, 10)}` : ""]);
    }
    if (item.buy > 0) rows.push(["Country Store", `${whole(item.buy)} silver`, "buy it outright"]);
    if (item.craftLevel) rows.push(["Crafting level", whole(item.craftLevel), item.craftPrice ? `${whole(item.craftPrice)} silver a craft` : ""]);
    if (item.cookLevel) rows.push(["Cooking level", whole(item.cookLevel), ""]);
    if (item.growMin > 0 && item.type !== "meal") rows.push(["Grows in", `${whole(item.growMin)} min`, "before any speed perks"]);
    if (item.xp) rows.push(["XP", whole(item.xp), "for each one"]);
    const have = heldOf(item.name);
    if (have != null) rows.push(["You hold", whole(have), "from your last capture"]);
    return rows.length ? `<div class="items-facts">${rows.map(([label, value, note]) =>
      `<div><span>${esc(label)}</span><strong>${esc(value)}</strong>${note ? `<small>${esc(note)}</small>` : ""}</div>`).join("")}</div>` : "";
  }

  function placesHtml(item) {
    const places = (placesOf.get(key(item.name)) || []).slice().sort((a, b) => {
      const aRate = a.denom ? 1 / a.denom : 0, bRate = b.denom ? 1 / b.denom : 0;
      return bRate - aRate || (b.sheet || 0) - (a.sheet || 0);
    });
    if (!places.length) return "";
    const best = Math.max(...places.map((place) => (place.denom ? 1 / place.denom : 0)));
    return `<section class="items-block"><h3>Where it is found</h3><div class="items-places">${places.map((place) => {
      const rate = place.denom ? 1 / place.denom : 0;
      const width = best > 0 && rate > 0 ? Math.max(4, Math.round(rate / best * 100)) : 0;
      const unit = place.fishing ? (place.byHand ? "casts" : "catches") : "explores";
      const sheetUnit = place.fishing ? "per Large Net" : "per Arnold Palmer";
      return `<div class="items-place">
        <div class="items-place-head"><b>${esc(place.location)}</b><small>${esc(place.kind)}</small></div>
        <div class="items-place-bar" aria-hidden="true"><span style="width:${width}%"></span></div>
        <div class="items-place-rates">${place.denom ? `<span><b>1</b> in ${fmt(place.denom)} ${esc(unit)}</span>` : `<span class="items-muted">no logged rate</span>`}${place.sheet ? `<span><b>${fmt(place.sheet)}</b> ${esc(sheetUnit)}</span>` : ""}</div>
      </div>`;
    }).join("")}</div><p class="items-note">Explores and casts per drop come from community logs. The per-Arnold-Palmer and per-Large-Net figures are the shared workbook's, measured with every perk on.</p></section>`;
  }

  function makeHtml(item) {
    const blocks = [];
    const craft = craftOf.get(item.id) || [];
    if (craft.length) {
      blocks.push(`<div class="items-recipe"><h4>Crafted from${item.craftLevel ? ` · crafting ${whole(item.craftLevel)}` : ""}</h4>
        <div class="items-chips">${craft.map((row) => chip((byId.get(row.reqId) || {}).name || "Unknown", row.amt)).join("")}</div></div>`);
    }
    const cook = cookOf.get(item.id) || [];
    if (cook.length) {
      const minutes = cook[0].timeSec ? Math.round(cook[0].timeSec / 60) : null;
      blocks.push(`<div class="items-recipe"><h4>Cooked from${minutes ? ` · ${whole(minutes)} min` : ""}</h4>
        <div class="items-chips">${cook.map((row) => chip(row.reqName || (byId.get(row.reqId) || {}).name || "Unknown", row.amt)).join("")}</div></div>`);
    }
    const mine = mineOf.get(key(item.name));
    if (mine) {
      blocks.push(`<div class="items-recipe"><h4>Mined</h4><p>${esc(mine.name)}${mine.pickaxe ? `, with the ${esc(mine.pickaxe)}` : ""}. No mine has recorded drop rates yet, so this one cannot be costed.</p></div>`);
    }
    if (item.growMin > 0 && item.type !== "meal") {
      blocks.push(`<div class="items-recipe"><h4>Grown</h4><p>${whole(item.growMin)} minutes a harvest, before Quality Fertilizer and the like.</p></div>`);
    }
    return blocks.length ? `<section class="items-block"><h3>How you get it</h3>${blocks.join("")}</section>` : "";
  }

  function usedInHtml(item) {
    const rows = [...(craftInto.get(item.id) || []), ...(cookInto.get(item.id) || [])]
      .map((row) => ({ name: (byId.get(row.itemId) || {}).name, amt: row.amt }))
      .filter((row) => row.name)
      .sort((a, b) => b.amt - a.amt);
    if (!rows.length) return "";
    return `<section class="items-block"><h3>What it makes <small>${whole(rows.length)}</small></h3>
      <div class="items-chips">${rows.slice(0, 60).map((row) => chip(row.name, row.amt)).join("")}</div>
      ${rows.length > 60 ? `<p class="items-note">And ${whole(rows.length - 60)} more.</p>` : ""}</section>`;
  }

  function questHtml(item) {
    const needs = questNeeds(item.name);
    if (!needs) return "";
    const have = heldOf(item.name);
    const short = have != null ? Math.max(0, needs.total - have) : null;
    const covered = have != null && needs.total > 0 ? Math.min(100, Math.round(have / needs.total * 100)) : null;
    return `<section class="items-block items-quests"><h3>Still needed for quests</h3>
      <div class="items-quest-top">
        <div><span>Quests want</span><strong>${whole(needs.total)}</strong><small>across ${whole(needs.steps)} ${needs.steps === 1 ? "quest" : "quests"}</small></div>
        ${have != null ? `<div><span>You hold</span><strong>${whole(have)}</strong><small>${short > 0 ? `${whole(short)} short` : "enough for all of them"}</small></div>` : ""}
      </div>
      ${covered != null ? `<div class="items-cover" aria-hidden="true"><span style="width:${covered}%"></span></div>` : ""}
      <div class="items-quest-rows">${needs.rows.map((row) => {
        const word = QUESTS.needStatusWord(row.status);
        const bits = [row.line, row.category === "event" ? "event" : "", word].filter(Boolean).join(" · ");
        const enough = have != null && have >= row.quantity;
        return `<div class="items-quest-row${enough ? " is-covered" : ""}"><b>${whole(row.quantity)}</b><span>${esc(row.title)}<small>${esc(bits)}</small></span>${have != null ? `<em>${enough ? "covered" : `${whole(row.quantity - have)} short`}</em>` : ""}</div>`;
      }).join("")}</div>
      <p class="items-note">Quests you have finished are left out, and so are events that have closed.${have == null ? " Import your account to see what you already hold against them." : ""}</p></section>`;
  }

  // The Tower rows app.js builds already know the floor, the tier and the goal
  // it is measured against — a Grand Mastery is 100,000, not a million, and
  // one item can be wanted on two floors.
  function towerHtml(item) {
    const rows = (window.FRPG_TOWER_NEEDS || [])
      .filter((row) => key(row.name) === key(item.name))
      .sort((a, b) => a.floor - b.floor);
    const bar = (current, goal) => {
      const pct = goal > 0 ? Math.min(100, Math.round(current / goal * 100)) : 0;
      return `<div class="items-cover" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
    };
    if (!rows.length) {
      const current = masteryOf(item.name);
      if (current == null) return "";
      return `<section class="items-block"><h3>Mastery</h3>
        <div class="items-quest-top"><div><span>You have</span><strong>${fmt(current)}</strong><small>no Tower floor asks for this one</small></div></div>
        ${bar(current, 1000000)}</section>`;
    }
    return `<section class="items-block"><h3>Tower mastery</h3>${rows.map((row) => {
      const goalLabel = row.tier === "gm" ? "100k" : "1m";
      const tier = row.tier === "gm" ? "GM" : "MM";
      return `<div class="items-tower${row.complete ? " is-done" : ""}">
        <div class="items-tower-head">
          <b>Floor T${whole(row.floor)}</b>
          <span class="items-tier is-${row.tier}" title="${row.tier === "gm" ? "Grand Mastery, 100,000" : "Mega Mastery, 1,000,000"}">${tier}</span>
          <em>${row.complete ? "done" : `${fmt(row.remaining)} left`}</em>
        </div>
        ${bar(row.current, row.goal)}
        <div class="items-tower-numbers"><b>${fmt(row.current)} / ${goalLabel}</b><span>${row.goal > 0 ? Math.floor(Math.min(100, row.current / row.goal * 100)) : 0}%</span></div>
      </div>`;
    }).join("")}</section>`;
  }

  function renderDetail(item) {
    if (!item) {
      detail.innerHTML = `<div class="items-empty"><h2>Pick an item</h2>
        <p>Every item in the game is here: what it is, where it comes from, what it makes, and which quests still want it.</p>
        ${recent().length ? `<h3>Last looked at</h3><div class="items-chips">${recent().map((name) => chip(name)).join("")}</div>` : ""}</div>`;
      return;
    }
    const info = infoFor(item.name);
    const typeWord = { crop: "Crop", fish: "Fish", meal: "Meal", seeds: "Seeds", bait: "Bait", card: "Card" }[item.type] || "Item";
    detail.innerHTML = `
      <header class="items-head">
        <img src="${esc(ART.urlFor(item.name) || "")}" alt="" width="64" height="64">
        <div class="items-head-copy">
          <span class="items-kind">${esc(typeWord)}</span>
          <h2>${esc(item.name)}</h2>
          ${info.desc ? `<p class="items-desc">${esc(info.desc)}</p>` : ""}
          ${info.note ? `<p class="items-note">${esc(info.note)}</p>` : ""}
        </div>
        <div class="items-actions">
          <button type="button" class="primary-action" data-calculate="${esc(item.name)}">Cost this out →</button>
          <button type="button" class="quiet-button" data-copy="${esc(item.name)}">Copy name</button>
          <a class="quiet-button" href="https://buddy.farm/i/${esc(slugFor(item.name))}/" target="_blank" rel="noopener noreferrer">Buddy's Almanac ↗</a>
        </div>
      </header>
      ${factsHtml(item)}
      ${makeHtml(item)}
      ${placesHtml(item)}
      ${usedInHtml(item)}
      ${towerHtml(item)}
      ${questHtml(item)}`;
  }

  function select(name, options) {
    const item = byName.get(key(name));
    if (!item) return;
    selected = item;
    remember(item.name);
    renderDetail(item);
    renderList();
    const target = `#items/${slugFor(item.name)}`;
    if (!(options && options.fromHash) && location.hash !== target) history.replaceState(null, "", target);
    if (options && options.scroll) detail.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // ---- wiring --------------------------------------------------------------
  search.addEventListener("input", () => {
    prefs.query = key(search.value);
    renderList();
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && results.length) {
      event.preventDefault();
      select(results[0].name, { scroll: true });
      return;
    }
    // Up and down walk the list without leaving the search box.
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const rows = [...list.querySelectorAll(".items-row")];
    if (!rows.length) return;
    event.preventDefault();
    const at = rows.findIndex((row) => row.dataset.item === (selected || {}).name);
    const next = event.key === "ArrowDown" ? Math.min(rows.length - 1, at + 1) : Math.max(0, at - 1);
    select(rows[next].dataset.item);
    const moved = list.querySelector(`.items-row[data-item="${CSS.escape(rows[next].dataset.item)}"]`);
    if (moved) moved.scrollIntoView({ block: "nearest" });
  });

  const filterRow = document.getElementById("itemsFilters");
  if (filterRow) {
    filterRow.innerHTML = FILTERS.map((filter) =>
      `<button type="button" class="items-filter${prefs.filter === filter.id ? " on" : ""}" data-filter="${filter.id}" aria-pressed="${prefs.filter === filter.id}">${esc(filter.label)}</button>`).join("");
    filterRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      prefs.filter = button.dataset.filter;
      try { localStorage.setItem("frpg_items_filter_v1", prefs.filter); } catch (_) { /* private mode */ }
      filterRow.querySelectorAll("[data-filter]").forEach((node) => {
        const on = node.dataset.filter === prefs.filter;
        node.classList.toggle("on", on);
        node.setAttribute("aria-pressed", String(on));
      });
      renderList();
    });
  }

  view.addEventListener("click", (event) => {
    const open = event.target.closest("[data-item]");
    if (open) { select(open.dataset.item, { scroll: open.classList.contains("items-chip") }); return; }
    const calculate = event.target.closest("[data-calculate]");
    if (calculate && window.FRPG_openItem) { window.FRPG_openItem(calculate.dataset.calculate, 1000); return; }
    const copy = event.target.closest("[data-copy]");
    if (copy && navigator.clipboard) {
      navigator.clipboard.writeText(copy.dataset.copy).then(() => {
        copy.textContent = "Copied";
        setTimeout(() => { copy.textContent = "Copy name"; }, 1200);
      }, () => { /* clipboard blocked; the name is on screen anyway */ });
    }
  });

  const fromHash = () => {
    const parts = location.hash.replace(/^#/, "").split("/");
    if (parts[0] !== "items" || !parts[1]) return false;
    const item = bySlug.get(parts[1]) || byName.get(key(decodeURIComponent(parts[1])));
    if (!item) return false;
    select(item.name, { fromHash: true });
    return true;
  };
  window.addEventListener("hashchange", fromHash);

  // A capture can land while this page is open; the held counts follow it.
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window || !message || message.source !== "farmrpg-account-sync" || message.type !== "snapshot") return;
    account = message.snapshot;
    readHeld();
    questCache.clear();
    renderList();
    if (selected) renderDetail(selected);
  });

  // Openable from anywhere else in the app.
  window.FRPG_openItemPage = (name) => {
    const item = byName.get(key(name));
    if (!item) return false;
    location.hash = `#items/${slugFor(item.name)}`;
    return true;
  };

  renderList();
  if (!fromHash()) renderDetail(null);
})();

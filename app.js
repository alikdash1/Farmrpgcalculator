/* Farm RPG Field Planner — interface, strategy routing, and player profile. */
(function () {
  const D = window.FRPG_DATA;
  const E = window.Engine;
  const BASE_EFFECTS = window.FRPG_EFFECTS.effects;
  const BASE_CONSTS = window.FRPG_CONSTANTS;
  const P = window.FRPG_PROGRESSION || { items: {}, routeRules: {}, locationNotes: {}, _meta: {} };
  const K = window.FRPG_KNOWLEDGE || { meta: { counts: {}, sourceStatus: {} }, rules: [], meals: [], perks: [], conflicts: [] };
  const PERSONAL = window.FRPG_PERSONAL_TOWER || { startFloor: 277, goalFloor: 340, masteries: {} };
  const TOWER_FLOORS = window.FRPG_TOWER_FLOORS || { floors: [] };
  const index = E.buildIndex(D);
  // Shared so the gather lists can say where an item comes from without
  // building a second copy of this index.
  window.FRPG_INDEX = index;
  const EVENT_LOCATIONS = new Set(["Haunted House", "Santa's Workshop"]);
  const EXACT_AP_RATES = {
    "Mount Banon": {
      "Coal": { value: 101.93, unit: "drops/AP" },
      "Iron": { value: 101.90, unit: "drops/AP" },
      "Unpolished Shimmer Stone": { value: 101.89, unit: "drops/AP" },
      "Stone": { value: 101.88, unit: "drops/AP" },
      "Unpolished Emerald": { value: 45.78, unit: "drops/AP" },
      "Carbon Sphere": { value: 45.73, unit: "drops/AP" },
      "Magna Quartz": { value: 2.36, unit: "AP/drop" },
      "Gold Feather": { value: 6.73, unit: "AP/drop" },
      "Bacon": { value: 9.39, unit: "AP/drop" },
      "Small Chest 02": { value: 9.50, unit: "AP/drop" },
      "Runestone 19": { value: 10.86, unit: "AP/drop" },
      "Dragon Skull": { value: 47.07, unit: "AP/drop" },
    },
  };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

  const fmt = (number) => {
    if (number == null || !isFinite(number)) return "—";
    const n = Number(number);
    const abs = Math.abs(n);
    const compact = (divisor, suffix) => `${Math.round((n / divisor) * 100) / 100}${suffix}`;
    if (abs >= 1e12) return compact(1e12, "t");
    if (abs >= 1e9) return compact(1e9, "b");
    if (abs >= 1e6) return compact(1e6, "m");
    if (abs >= 1e3) return compact(1e3, "k");
    if (abs >= 100) return Math.round(n).toLocaleString("en-US");
    return String(Math.round(n * 100) / 100);
  };
  const clean = (number) => String(Math.round(Number(number) * 10000) / 10000);
  // Counts in player-facing sentences need agreement — "1 inputs" shipped once.
  const plural = (count, one, many) => `${fmt(count)} ${Number(count) === 1 ? one : many}`;
  // Filled in on every render; treeHtml reads it to label each leaf's real route.
  let leafRoutes = new Map();
  const capitalise = (text) => String(text || "").replace(/^./, (c) => c.toUpperCase());
  const ASSUMPTION_LABELS = {
    crop_qf_is_reduction: "Crop growth time saved by perks",
    crop_dod_base_cut: "Extra crop time saved by Diary of O'Dynn",
    craft_cost_cap: "Most the Workshop silver cost can be cut by",
    net_fn_base_catch: "Items per Fishing Net",
    net_ln_base_catch: "Items per Large Net",
    cider_base_rolls: "Item rolls per Apple Cider",
    lemonade_base_items: "Items per Lemonade",
    ap_base_items: "Items per Arnold Palmer",
    oj_stamina: "Stamina restored by one Orange Juice",
    quandary_bonus: "Extra output from Quandary Chowder",
    neigh_stamina_save: "Stamina saved by Neigh",
    sea_pincher_bonus: "Net boost from Sea Pincher Special",
    hickory_tick_bonus: "Sawmill boost per Hickory Omelette tick",
    acorn_pie_actions: "Actions one Acorn Pie lasts",
    explore_base_stamina: "Stamina per explore, before any perks",
    explore_stamina_measured: "Stamina you really spend, as a fraction of normal (0 = use perks)",
    plot_yield_default: "Crops harvested per seed planted",
    rate_adjust_global: "Adjustment to the community drop rates",
  };
  const FRPG_BUILD = "2026-09-05.dusk11";
  const itemByName = (name) => index.itemsById.get(index.idByName.get(name.toLowerCase()));
  const ART = window.FRPG_ITEM_ART_HELPER;
  // Items the game has but this planner has no artwork for still need a tile.
  // A bare "?" reads as a broken image, so fall back to the item's initial.
  const artInitial = (item, fallbackName) => {
    const name = String((item && item.name) || fallbackName || "").trim();
    return name ? name[0].toUpperCase() : "·";
  };
  // Every tile size declared its image as 48x48 regardless of the class it was
  // going into, so a 23px tree tile and a 78px goal tile both claimed 48px.
  // That is what made the art jump around and sit wrong. Declare the real box.
  const ART_PX = { "": 42, "small": 30, "goal-art": 78, "table-art": 38, "tree-art": 23, "meal-art": 52, "drop-art": 32, "tower-art": 50, "haul-art": 26, "meal-chip-art": 24 };
  const artPx = (cls) => {
    for (const key of String(cls || "").split(/\s+/)) {
      if (key && ART_PX[key]) return ART_PX[key];
    }
    return ART_PX[""];
  };
  // fallbackImg lets a data file that carries its own artwork — the Tower's
  // wiki images, say — still draw when the item is not in the shared art map.
  // Without it that artwork is silently dropped and the tile shows an initial.
  // Farm RPG prints a description under each item name, and older captures
  // stored those as rows of their own ("A blinger for your finger", "Adds 100
  // Stamina"). gather-model.js filters them for the gather lists; anything
  // rendering capture data needs the same guard or they surface here instead.
  const isRealItem = (name) => {
    const text = String(name || "").trim();
    if (!text) return false;
    if (ART && ART.isCurrency && ART.isCurrency(text)) return true;
    if (ART && ART.isKnownItem) return ART.isKnownItem(text);
    return true;
  };

  const itemImg = (item, cls, fallbackName, fallbackImg) => {
    const px = artPx(cls);
    // The item's own name wins: fallbackName is for when there is no item at
    // all. Reading it the other way round made the Setup cards look up their
    // building ("Iron Depot") instead of the item they produce ("Iron").
    const name = (item && item.name) || fallbackName || "";
    const src = (ART ? ART.urlFor(name) : "") || fallbackImg || "";
    return src
      ? `<span class="item-art ${cls || ""}"><img loading="lazy" width="${px}" height="${px}" referrerpolicy="no-referrer" src="${esc(src)}" alt="${esc(name)}"></span>`
      : `<span class="item-art missing-art ${cls || ""}" aria-hidden="true">${esc(artInitial(item, fallbackName))}</span>`;
  };
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  };

  const allEffectIds = BASE_EFFECTS.map((effect) => effect.id);
  const INFRA_DEFAULTS = {
    sawmillWood: false,
    sawmillBoard: false,
    quarryStone: false,
    quarryCoal: false,
    woodHour: 0,
    boardHour: 0,
    stoneTen: 0,
    coalHour: 0,
  };
  const MEALS = [
    { id: "neigh", name: "Neigh", area: "Exploring economy", effect: "Cider uses 20% less stamina", calc: "Lowers stamina and OJ opportunity cost. It does not reduce the number of Ciders used." },
    { id: "quandary", name: "Quandary Chowder", area: "Exploring economy", effect: "+10% Lemonade / AP output", calc: "Reduces the Lemonade or Arnold Palmer count needed for a route." },
    { id: "cabbage", name: "Cabbage Stew", area: "Bulk actions", effect: "Use 5 Ciders per click", calc: "Saves clicks. With Acorn Pie, five Ciders consume one of its 150 action charges." },
    { id: "lemoncream", name: "Lemon Cream Pie", area: "Bulk actions", effect: "Use 5 AP per click", calc: "Saves clicks. With Acorn Pie, five AP consume one of its 150 action charges." },
    { id: "hickory", name: "Hickory Omelette", area: "Farm production", effect: "+20% Sawmill every 10 min for 1 hour", calc: "Adds six 20% ticks on top of the normal hourly Sawmill collection, before inventory voiding." },
    { id: "acorn", name: "Acorn Pie", img: "/img/items/acorn_pie.png", area: "Exploring special", effect: "Adds Hide outside Forest for 150 actions", calc: "Uses your own measured samples because the Hide rate changes by location and bulk method." },
    { id: "seapincher", name: "Sea Pincher Special", area: "Fishing economy", effect: "Nets and Large Nets are more effective", calc: "Uses the editable 10% community estimate for Net requirements." },
    { id: "shrimp", name: "Shrimp-a-Plenty", area: "Selling", effect: "+10% silver at Market for 5 minutes", calc: "Included in final sell value and raw-material opportunity value." },
    { id: "mushroom", name: "Mushroom Stew", area: "Mastery", effect: "+10% Mastery for 5 minutes", calc: "Each item counts 1.1x toward a mastery, so a 1m Mega Mastery lands at about 909.09k items." },
  ];
  const MEAL_DEFAULTS = Object.fromEntries(MEALS.map((meal) => [meal.id, false]));

  const state = {
    itemId: null,
    qty: 1000000,
    owned: read("frpg_owned", {}),
    enabled: new Set(read("frpg_effects_v2", [])),
    overrides: read("frpg_assumptions", {}),
    infra: Object.assign({}, INFRA_DEFAULTS, read("frpg_infra_v2", {})),
    meals: Object.assign({}, MEAL_DEFAULTS, read("frpg_meals_v2", {})),
    sourceChoices: read("frpg_sources_v2", {}),
    farmLocations: read("frpg_farm_locations_v1", {}),
    fishMethods: read("frpg_fish_methods_v1", {}),
    drinkChoices: read("frpg_drink_choices_v1", {}),
    buyRates: read("frpg_buy_rates_v1", {}),
    mealStripHidden: read("frpg_meal_strip_hidden_v1", false),
    includeEvents: read("frpg_include_events_v1", false) === true,
    drinkPath: read("frpg_drink_path_v1", "auto"),
    makeChoices: read("frpg_make_v2", {}),
    account: read("frpg_account_snapshot_v1", null),
    acornTests: read("frpg_acorn_tests_v2", []),
    towerStart: Number(read("frpg_tower_start_v1", PERSONAL.startFloor || 277)),
    towerShowDone: read("frpg_tower_show_done_v1", false) === true,
    extensionConnectedAt: null,
    showCovered: false,
    treeOpen: true,
    lastPlan: null,
    decisionActions: new Map(),
  };

  const el = {
    search: $("search"), qty: $("qty"), suggest: $("suggest"), result: $("result"),
    empty: $("empty"), error: $("error"), ingBody: document.querySelector("#ingTable tbody"),
    tree: $("tree"), makeBuy: $("makeBuy"), covered: $("coveredStrip"),
  };

  function constants() {
    const copy = JSON.parse(JSON.stringify(BASE_CONSTS));
    for (const [key, value] of Object.entries(state.overrides)) {
      if (copy[key] && typeof copy[key].v === "number") copy[key].v = Number(value);
    }
    return copy;
  }
  function c(key, fallback) {
    const value = constants()[key];
    return value && value.v != null ? Number(value.v) : fallback;
  }
  function mods() {
    const base = E.computeMods(BASE_EFFECTS.filter((effect) => state.enabled.has(effect.id)), constants());
    if (state.meals.shrimp) base.saleMult += 0.1;
    // The perk list above knows about Wanderer and little else, so it can badly
    // overstate stamina for an endgame account. If the player has told us what
    // they actually spend, that wins.
    const measured = Number(c("explore_stamina_measured", 0));
    if (measured > 0) base.exploreStaminaPer = c("explore_base_stamina", 1) * measured;
    return base;
  }
  // Places reads the same resolved perk numbers, so ticking Lemon Squeezer
  // in Setup changes what an Arnold Palmer is worth there too.
  window.FRPG_MODS = mods;
  function save() {
    localStorage.setItem("frpg_owned", JSON.stringify(state.owned));
    localStorage.setItem("frpg_effects_v2", JSON.stringify([...state.enabled]));
    localStorage.setItem("frpg_assumptions", JSON.stringify(state.overrides));
    localStorage.setItem("frpg_infra_v2", JSON.stringify(state.infra));
    localStorage.setItem("frpg_meals_v2", JSON.stringify(state.meals));
    localStorage.setItem("frpg_sources_v2", JSON.stringify(state.sourceChoices));
    localStorage.setItem("frpg_farm_locations_v1", JSON.stringify(state.farmLocations));
    localStorage.setItem("frpg_fish_methods_v1", JSON.stringify(state.fishMethods));
    localStorage.setItem("frpg_drink_choices_v1", JSON.stringify(state.drinkChoices));
    localStorage.setItem("frpg_buy_rates_v1", JSON.stringify(state.buyRates));
    localStorage.setItem("frpg_meal_strip_hidden_v1", JSON.stringify(state.mealStripHidden));
    localStorage.setItem("frpg_include_events_v1", JSON.stringify(state.includeEvents));
    localStorage.setItem("frpg_drink_path_v1", JSON.stringify(state.drinkPath));
    localStorage.setItem("frpg_make_v2", JSON.stringify(state.makeChoices));
    localStorage.setItem("frpg_acorn_tests_v2", JSON.stringify(state.acornTests));
    localStorage.setItem("frpg_tower_start_v1", JSON.stringify(state.towerStart));
    localStorage.setItem("frpg_tower_show_done_v1", JSON.stringify(state.towerShowDone));
    try {
      if (state.account) localStorage.setItem("frpg_account_snapshot_v1", JSON.stringify(state.account));
      else localStorage.removeItem("frpg_account_snapshot_v1");
    } catch (_) {
      localStorage.removeItem("frpg_account_snapshot_v1");
    }
  }

  // Every tab change replaced the hash instead of pushing it, so the browser
  // kept no history and Back left the site entirely. Tab changes push; going
  // Back or Forward calls this again with fromHistory set, which must not
  // push another entry or Back would never escape.
  function showTab(id, fromHistory) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
    document.querySelectorAll(".tab").forEach((tab) => {
      const selected = tab.dataset.tab === id;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    if (id === "setup" || id === "fieldlab") renderSetup();
    if (id === "account") renderAccount();
    if (id === "tower") renderTower();
    if (id === "home") renderHome();
    if (id === "library") renderLibrary();
    if (id === "places" && window.FRPG_renderPlaces) window.FRPG_renderPlaces();
    if (history && history.pushState) {
      const target = "#" + id;
      if (fromHistory) history.replaceState(null, "", target);
      else if (location.hash !== target) history.pushState(null, "", target);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll(".tab").forEach((tab) => { tab.onclick = () => showTab(tab.dataset.tab); });
  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-open-view]");
    if (!control || control.dataset.openViewBound === "1") return;
    event.preventDefault();
    showTab(control.dataset.openView);
  });
  document.querySelectorAll("[data-open-view]").forEach((control) => {
    control.dataset.openViewBound = "1";
    control.onclick = (event) => { event.preventDefault(); showTab(control.dataset.openView); };
  });

  function searchItems(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return D.items.items.filter((item) => item.active && item.name.toLowerCase().includes(q)).sort((a, b) => {
      const A = a.name.toLowerCase(), B = b.name.toLowerCase();
      return Number(B.startsWith(q)) - Number(A.startsWith(q)) || A.localeCompare(B);
    }).slice(0, 14);
  }
  function suggestions(list) {
    if (!list.length) {
      el.suggest.classList.add("hidden");
      return;
    }
    el.suggest.innerHTML = list.map((item) => `<div class="sg" data-id="${item.id}">${itemImg(item, "small")}<span class="sg-name">${esc(item.name)}</span><span class="sub">${item.craftPrice != null ? "craft" : item.growMin > 0 ? "crop" : item.cookLevel > 0 ? "cook" : item.type || "item"}</span></div>`).join("");
    el.suggest.classList.remove("hidden");
    el.suggest.querySelectorAll(".sg").forEach((row) => {
      row.onmousedown = (event) => { event.preventDefault(); pick(Number(row.dataset.id)); };
    });
  }
  function pick(id) {
    state.itemId = id;
    el.search.value = index.itemsById.get(id).name;
    el.suggest.classList.add("hidden");
    localStorage.setItem("frpg_last", String(id));
    render();
  }

  // Cross-page bridge: lets other loaded scripts (Quests, New items) open an
  // item directly in the calculator without duplicating item lookup/route
  // logic. Returns true if the item was found and opened.
  window.FRPG_openItem = function (name, qty) {
    const id = index.idByName.get(String(name || "").trim().toLowerCase());
    if (!id) return false;
    const parsedQty = Number(qty);
    if (Number.isFinite(parsedQty) && parsedQty > 0) {
      state.qty = Math.round(parsedQty);
      el.qty.value = state.qty.toLocaleString("en-US");
    }
    pick(id);
    showTab("planner");
    return true;
  };

  // Where you actually stand, on the first page you see: the floor you are
  // climbing, the quest step you are on, and how much of that step's gathering
  // also finishes a Tower mastery. All of it is elsewhere in the app already —
  // the point is not having to go and look.
  function renderStanding() {
    const host = $("homeStanding");
    if (!host) return;
    const gather = window.FRPG_GATHER;
    const bits = [];

    const needs = window.FRPG_TOWER_NEEDS || [];
    const nextFloor = needs.filter((row) => !row.complete).sort((a, b) => a.floor - b.floor)[0];
    if (nextFloor) {
      const left = needs.filter((row) => row.floor === nextFloor.floor && !row.complete).length;
      bits.push(`<a href="#tower" data-open-view="tower"><span>Next floor</span><strong>T${nextFloor.floor}</strong><small>${left} mastery${left === 1 ? "" : "s"} to go</small></a>`);
    }

    if (gather && typeof gather.plan === "function") {
      const plan = gather.plan();
      if (plan.next) {
        const short = plan.nextRows.filter((row) => row.short > 0).length;
        bits.push(`<a href="#inventory" data-open-view="inventory"><span>Current step</span><strong>${esc(plan.next.title)}</strong><small>${short} item${short === 1 ? "" : "s"} still short</small></a>`);
        if (typeof gather.towerOverlap === "function") {
          const both = gather.towerOverlap(plan.wholeRows.filter((row) => row.short > 0)).length;
          if (both) bits.push(`<a href="#inventory" data-open-view="inventory"><span>Counts twice</span><strong>${fmt(both)}</strong><small>items feed this line and a Tower mastery</small></a>`);
        }
      }
    }

    host.hidden = bits.length === 0;
    host.innerHTML = bits.join("");
  }

  function renderHome() {
    const item = state.itemId ? index.itemsById.get(state.itemId) : null;
    const enabledRows = profileRows().filter((row) => row.ids.every((id) => state.enabled.has(id))).length;
    const totalRows = profileRows().length;
    const passive = [state.infra.sawmillWood, state.infra.sawmillBoard, state.infra.quarryStone, state.infra.quarryCoal].filter(Boolean).length;
    const activeMeals = Object.values(state.meals).filter(Boolean).length;
    const measured = state.acornTests.length;
    const readiness = [enabledRows > 0, passive > 0, activeMeals > 0, measured > 0].filter(Boolean).length;

    $("homeRecent").innerHTML = item
      ? `<button class="recent-button" data-home-recent><span>Last calculation</span><strong>${itemImg(item, "small")}${esc(item.name)} × ${fmt(state.qty)}</strong><b>Continue →</b></button>`
      : `<span class="recent-empty">No previous calculation on this device.</span>`;
    const recent = document.querySelector("[data-home-recent]");
    if (recent) recent.onclick = () => showTab("planner");

    renderStanding();
    $("homeSetupSummary").textContent = `${enabledRows}/${totalRows} permanent bonuses on · ${passive} passive sources · ${activeMeals} meals active.`;
    $("homeReadiness").textContent = `${readiness}/4 checked`;
    const readinessRows = [
      ["Permanent bonuses", `${enabledRows}/${totalRows} active`, enabledRows > 0],
      ["Passive materials", `${passive}/4 covered`, passive > 0],
      ["Plan meals", `${activeMeals}/${MEALS.length} active`, activeMeals > 0],
      ["Personal field samples", measured ? `${measured} saved` : "None yet", measured > 0],
    ];
    $("homeReadinessRows").innerHTML = readinessRows.map(([label, value, ready]) => `<div><span class="readiness-dot ${ready ? "ready" : "review"}"></span><strong>${esc(label)}</strong><b>${esc(value)}</b></div>`).join("");

    const ENGINE_DIRECTIVE = /should not|do not recommend|must not|never recommend|should be treated|do not treat/i;
    const playerFacing = K.rules.filter((rule) => !ENGINE_DIRECTIVE.test(rule.rule));
    const preferred = playerFacing.filter((rule) => /glass orb|acorn pie|leather|sawmill|stone|coal|ember|cider/i.test(rule.rule));
    const rules = (preferred.length ? preferred : playerFacing).slice(0, 4);
    $("homeRules").innerHTML = rules.length ? rules.map((rule) => `<div><span>${rule.needsVerification ? "Needs your own numbers" : "Confirmed"}</span><p>${esc(rule.rule)}</p></div>`).join("") : `<p class="empty-samples">No route notes to show yet.</p>`;
  }

  $("itemOptions").innerHTML = D.items.items.filter((item) => item.active).map((item) => `<option value="${esc(item.name)}"></option>`).join("");
  $("homeGoal").onsubmit = (event) => {
    event.preventDefault();
    const query = $("homeSearch").value.trim().toLowerCase();
    const exactId = index.idByName.get(query);
    const candidate = exactId ? index.itemsById.get(exactId) : searchItems(query)[0];
    if (!candidate) {
      $("homeSearch").setCustomValidity("Choose an item from the Farm RPG item list.");
      $("homeSearch").reportValidity();
      return;
    }
    $("homeSearch").setCustomValidity("");
    const qty = parseInt($("homeQty").value.replace(/\D/g, ""), 10) || 0;
    if (!qty) return;
    state.qty = qty;
    el.qty.value = String(qty);
    pick(candidate.id);
    showTab("planner");
  };
  el.search.oninput = () => suggestions(searchItems(el.search.value));
  el.search.onblur = () => setTimeout(() => el.suggest.classList.add("hidden"), 120);
  el.search.onkeydown = (event) => {
    if (event.key === "Enter") {
      const first = el.suggest.querySelector(".sg");
      if (first) pick(Number(first.dataset.id));
    }
  };
  el.qty.oninput = () => { state.qty = parseInt(el.qty.value.replace(/\D/g, ""), 10) || 0; render(); };
  el.qty.onblur = () => { if (state.qty > 0) el.qty.value = state.qty.toLocaleString("en-US"); };
  document.querySelectorAll("[data-q]").forEach((button) => {
    button.onclick = () => { state.qty = Number(button.dataset.q); el.qty.value = state.qty.toLocaleString("en-US"); render(); };
  });
  $("clearOwned").onclick = () => { state.owned = {}; save(); render(); };
  $("collapseTree").onclick = () => {
    state.treeOpen = !state.treeOpen;
    el.tree.querySelectorAll("details").forEach((detail) => { detail.open = state.treeOpen; });
    $("collapseTree").textContent = state.treeOpen ? "Collapse all" : "Expand all";
  };
  $("toggleCovered").onchange = (event) => { state.showCovered = event.target.checked; render(); };

  function infraFor(item, need, m) {
    if (!item) return null;
    const name = item.name.toLowerCase();
    if ((name === "iron" || name === "nails") && m.ironDepot) {
      const silver = (item.buy || 0) * need;
      return { kind: "Iron Depot", detail: `Auto-filled for ${fmt(silver)} silver`, hours: null };
    }
    if (name === "wood" && state.infra.sawmillWood) {
      const multiplier = state.meals.hickory ? 1 + 6 * c("hickory_tick_bonus", 0.2) : 1;
      const rate = Number(state.infra.woodHour || 0) * multiplier;
      return { kind: "Sawmill", detail: rate ? `${fmt(rate)}/hr useful output` : "Covered; enter your rate in Setup", hours: rate ? need / rate : null };
    }
    if (name === "board" && state.infra.sawmillBoard) {
      const multiplier = state.meals.hickory ? 1 + 6 * c("hickory_tick_bonus", 0.2) : 1;
      const rate = Number(state.infra.boardHour || 0) * multiplier;
      return { kind: "Sawmill", detail: rate ? `${fmt(rate)}/hr useful output` : "Covered; enter your rate in Setup", hours: rate ? need / rate : null };
    }
    if (name === "stone" && state.infra.quarryStone) {
      const rate = Number(state.infra.stoneTen || 0) * 6;
      return { kind: "Quarry", detail: rate ? `${fmt(rate)}/hr from 10-minute ticks` : "Covered; enter your 10-minute tick in Setup", hours: rate ? need / rate : null };
    }
    if (name === "coal" && state.infra.quarryCoal) {
      const rate = Number(state.infra.coalHour || 0);
      return { kind: "Quarry coal", detail: rate ? `${fmt(rate)}/hr measured average` : "Marked covered without a measured rate", hours: rate ? need / rate : null };
    }
    return null;
  }

  function quoteText(quote) {
    if (!quote || !quote.best) return "No trade quote";
    const best = quote.best;
    const unit = best.currency === "gold" ? "gold" : best.currency.toUpperCase();
    const rate = best.raw || `${fmt(best.rate)} ${unit}${best.per === 1000 ? "/k" : ""}`;
    return `${rate} → ${fmt(best.amount)} ${unit}${best.goldEq != null && best.currency !== "gold" ? ` ≈ ${fmt(best.goldEq)} gold` : ""}`;
  }
  function goldEach(itemName) {
    const market = index.marketByName.get(itemName.toLowerCase());
    if (!market || !market.gold) return null;
    return market.gold.mid / E.pricePer((market.raw || {}).gold);
  }

  function acornPlan(need) {
    if (!state.meals.acorn || !state.acornTests.length || need <= 0) return null;
    const plans = [];
    for (const test of state.acornTests) {
      const uses = Number(test.uses), hides = Number(test.hides);
      if (!(uses > 0 && hides > 0)) continue;
      const requiredUses = need * uses / hides;
      const bulkMeal = test.method === "ap" && state.meals.lemoncream ? "Lemon Cream Pie"
        : test.method === "cider" && state.meals.cabbage ? "Cabbage Stew" : null;
      const bulk = bulkMeal ? 5 : 1;
      const actions = requiredUses / bulk;
      const pies = Math.ceil(actions / c("acorn_pie_actions", 150));
      let fullRouteGoldEq = null;
      let extra = "";
      if (test.method === "ap") {
        const unit = goldEach("Arnold Palmer");
        fullRouteGoldEq = unit == null ? null : requiredUses * unit;
      } else if (test.method === "cider") {
        const ciderUnit = goldEach("Apple Cider");
        const ojUnit = E.currencyGoldEach(index, "oj");
        const stamina = requiredUses * c("cider_base_rolls", 1000) * (state.meals.neigh ? 1 - c("neigh_stamina_save", 0.2) : 1);
        const oj = stamina / c("oj_stamina", 100);
        fullRouteGoldEq = ciderUnit == null || ojUnit == null ? null : requiredUses * ciderUnit + oj * ojUnit;
        extra = ` · ${fmt(oj)} OJ-equivalent stamina`;
      } else if (test.method === "lemonade") {
        const unit = goldEach("Lemonade");
        fullRouteGoldEq = unit == null ? null : requiredUses * unit;
      } else {
        const ojUnit = E.currencyGoldEach(index, "oj");
        const stamina = requiredUses * mods().exploreStaminaPer;
        fullRouteGoldEq = ojUnit == null ? null : stamina / c("oj_stamina", 100) * ojUnit;
      }
      const pieQuote = E.marketQuote(index, "Acorn Pie", pies);
      const incrementalGoldEq = pieQuote && pieQuote.best.goldEq != null ? pieQuote.best.goldEq : null;
      plans.push({
        type: "acorn", method: test.method, location: test.location, uses: requiredUses,
        actions, pies, bulk, bulkMeal, goldEq: incrementalGoldEq, fullRouteGoldEq, extra, overlay: true,
        confidence: { label: "Your measured sample", level: 3 }, progressionScore: 20,
        reason: "Run Acorn Pie during exploration you already need; charge Hide only for the pies, not for the underlying AP/Cider twice.",
        detail: `Piggyback ${fmt(actions)} actions · ${fmt(pies)} Acorn Pies${bulkMeal ? ` · ${bulkMeal} makes 5 uses cost 1 action` : ""}${incrementalGoldEq != null ? ` ≈ ${fmt(incrementalGoldEq)} gold incremental` : ""}`,
      });
    }
    return plans.filter((plan) => plan.goldEq != null).sort((a, b) => a.goldEq - b.goldEq)[0] || plans[0] || null;
  }

  const isFish = (item) => !!item && item.type === "fish";
  // Drops per Arnold Palmer, straight from the shared workbook. Null when that
  // location/item pair was never measured — never guessed from the explore rate.
  function workbookApRate(location, itemName) {
    const table = window.FRPG_WORKBOOK_RATES && window.FRPG_WORKBOOK_RATES.exploring;
    const row = table && table[location];
    const rate = row && row[itemName];
    return rate > 0 ? rate : null;
  }
  const itemFact = (name) => P.items[name] || { questSteps: 0, questTotal: 0, usedInCrafts: 0, relevance: 0, hoard: false };
  const routeRule = (name) => P.routeRules[name] || null;
  const farmLabel = (farm) => farm.type === "fish" ? "Fish" : farm.type === "crop" ? "Grow" : farm.type === "acorn" ? "Acorn overlay" : "Explore";

  function coDropSentence(route) {
    if (!route || !route.coDrops || !route.coDrops.length) return "";
    const preview = route.coDrops.slice(0, 4).map((drop) => `${fmt(drop.expected)} ${esc(drop.name)}`).join(" · ");
    const more = Math.max(0, route.coDrops.length - 4);
    return `${preview}${more ? ` · +${more} more below` : ""}`;
  }

  function decisionLabel(value) {
    return ({ trade: "Buy/trade", farm: "Farm directly", craft: "Craft it", building: "Passive supply",
      acorn: "Acorn Pie overlay", explore: "Explore for it", fish: "Fish for it", crop: "Grow it",
      vendor: "Country Store", inventory: "Use inventory" })[value] || value;
  }

  function winnerSentence(decision) {
    const cash = decisionLabel(decision.cashWinner);
    const progression = decisionLabel(decision.progressionWinner);
    if (decision.cashWinner === decision.progressionWinner) return `<b>Recommended:</b> ${esc(cash)}`;
    return `<b>Cheapest:</b> ${esc(cash)} <b>With progression:</b> ${esc(progression)}`;
  }

  function farmPlan(item, need, m, consts) {
    // Some items technically drop somewhere but nobody sane gathers them —
    // Glass Bottle off Crystal River at ~1 per 68 casts, for instance. A rule
    // with never:"farm" keeps them out of the routing entirely.
    const noFarm = routeRule(item.name);
    if (noFarm && noFarm.never === "farm") return null;
    if (!item || need <= 0) return null;
    const sources = E.sourcesFor(index, item.id, need, m, consts);
    if (item.name === "Hide") {
      const measured = acornPlan(need);
      if (measured) return measured;
    }
    if (sources.crop) {
      return {
        type: "crop",
        plants: sources.crop.plants,
        minutes: sources.crop.minutesEach,
        goldEq: null,
        confidence: { label: "Official crop time", level: 3 },
        progressionScore: itemFact(item.name).relevance || 0,
        detail: `${fmt(sources.crop.plants)} plants · ${fmt(sources.crop.minutesEach)} min/harvest`,
      };
    }
    const rule = routeRule(item.name);
    const dropPlans = sources.drops.filter((row) => row.explores != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location))).map((drop) => {
      const qc = state.meals.quandary ? 1 + c("quandary_bonus", 0.1) : 1;
      const neigh = state.meals.neigh ? 1 - c("neigh_stamina_save", 0.2) : 1;
      const ciderUses = drop.explores / m.drinks.ciderRolls;
      const stamina = drop.explores * m.exploreStaminaPer * neigh;
      const oj = stamina / c("oj_stamina", 100);
      // Arnold Palmer is NOT exploring. Exploring spends stamina; an AP finds
      // items on its own, with its own drop rate per use. Deriving AP uses from
      // the explore count treated one as a bulk purchase of the other, which is
      // wrong. Use the workbook's measured drops-per-AP when we have it.
      // Its exploring rates are stated with Quandary Chowder on (each location's
      // table sums to 550 = 500 x 1.1), so back that out if the meal is off.
      const wbAp = workbookApRate(drop.location, item.name);
      const apUses = wbAp != null
        ? need / (wbAp * (state.meals.quandary ? 1 : 1 / (1 + c("quandary_bonus", 0.1))))
        : null;
      const ciderUnit = goldEach("Apple Cider");
      const apUnit = goldEach("Arnold Palmer");
      const ojUnit = E.currencyGoldEach(index, "oj");
      const ciderGold = ciderUnit == null || ojUnit == null ? null : ciderUses * ciderUnit + oj * ojUnit;
      const apGold = apUnit == null || apUses == null ? null : apUses * apUnit;
      // The player picks the drink. Cider spends stamina and an Arnold Palmer
      // does not, so there is no honest "cheaper" to pick for them.
      const pick = state.drinkChoices[item.id];
      const useAp = pick === "ap" ? apUses != null : false;
      const coDrops = E.coDropsFor(index, drop.location, drop.explores, item.name, P, 20);
      const prized = (P.locationNotes[drop.location] || {}).prizedCoDrops || [];
      coDrops.sort((a, b) => {
        const ai = prized.indexOf(a.name), bi = prized.indexOf(b.name);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || b.score - a.score;
      });
      const coDropSellSilver = coDrops.reduce((sum, co) => {
        const coItem = itemByName(co.name);
        return sum + (coItem && coItem.sell != null ? co.expected * coItem.sell * m.saleMult : 0);
      }, 0);
      const progressionScore = coDrops.reduce((sum, co) => sum + Math.min(6, co.score), itemFact(item.name).relevance || 0);
      const preferred = !!(rule && rule.action === "farm" && (!rule.location || rule.location === drop.location));
      return {
        type: "explore",
        method: useAp ? "ap" : "cider",
        location: drop.location,
        explores: drop.explores,
        stamina,
        oj,
        ciders: ciderUses,
        aps: apUses,
        goldEq: useAp ? apGold : ciderGold,
        // Keep both sides of the drink comparison so the plan can show its
        // working. Cider looks cheaper per bottle but burns stamina, and how
        // much stamina depends on the player's own perks and meals.
        ciderGold,
        apGold,
        coDrops,
        coDropSellSilver,
        progressionScore,
        preferred,
        confidence: E.sourceConfidence(drop.src),
        reason: preferred ? rule.why : coDrops.length ? `Also advances ${coDrops.slice(0, 3).map((co) => co.name).join(", ")}` : "Fastest known direct drop",
        detail: useAp
          ? `${esc(drop.location)} · ${fmt(apUses)} AP with${state.meals.quandary ? "" : "out"} Quandary`
          : `${esc(drop.location)} · ${fmt(ciderUses)} Cider + ${fmt(oj)} OJ-equivalent stamina`,
      };
    }).sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.explores - b.explores);
    const chosenLocation = state.farmLocations[item.id];
    const chosenDrop = dropPlans.find((plan) => plan.location === chosenLocation);
    if (chosenDrop) return chosenDrop;
    const fishPlans = sources.fish.filter((row) => row.catches != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location))).sort((a, b) => a.catches - b.catches);
    const chosenFish = fishPlans.find((row) => row.location === chosenLocation);
    const fish = chosenFish || (!dropPlans.length ? fishPlans[0] : null);
    if (fish) {
      const mealBoost = state.meals.seapincher ? 1 + c("sea_pincher_bonus", 0.1) : 1;
      const lnCatch = m.nets.lnCatch * mealBoost;
      const fnCatch = m.nets.fnCatch * mealBoost;
      const largeNets = lnCatch > 0 ? fish.catches / lnCatch : null;
      const fishingNets = fnCatch > 0 ? fish.catches / fnCatch : null;
      // Fishing by hand is one cast at a time. How much stamina a cast costs is
      // not recorded in any local source, so the cast count is given and the
      // stamina is left blank rather than guessed.
      const method = FISH_METHODS[state.fishMethods[item.id]] ? state.fishMethods[item.id] : "large";
      const lnUnit = goldEach("Large Net");
      const fnUnit = goldEach("Fishing Net");
      const goldEq = method === "large" ? (lnUnit == null || largeNets == null ? null : largeNets * lnUnit)
        : method === "net" ? (fnUnit == null || fishingNets == null ? null : fishingNets * fnUnit)
        : null;
      const detailBy = method === "large" ? `${fmt(largeNets)} Large Nets`
        : method === "net" ? `${fmt(fishingNets)} Fishing Nets`
        : `${fmt(fish.catches)} casts by hand`;
      // 250 base + 150 Reinforced Netting + 100 Trigon Knot = 500 per Large Net,
      // which is exactly what the shared workbook quotes. Sea Pincher then adds
      // 10% on top (community estimate, sea_pincher_bonus is verified:false).
      const netNotes = [
        state.enabled.has("reinforced_ln") && "Reinforced Netting",
        state.enabled.has("trigonn") && "Trigon Knot",
        state.meals.seapincher && "Sea Pincher",
      ].filter(Boolean);
      return {
        type: "fish",
        location: fish.location,
        catches: fish.catches,
        netNotes,
        method,
        largeNets,
        fishingNets,
        lnCatch,
        fnCatch,
        goldEq,
        confidence: E.sourceConfidence(fish.src),
        progressionScore: itemFact(item.name).relevance || 0,
        detail: `${esc(fish.location)} · ${detailBy}`,
      };
    }
    if (dropPlans.length) return dropPlans[0];
    return null;
  }

  function farmLocationChoices(item, need, m, consts) {
    const sources = E.sourcesFor(index, item.id, Math.max(1, need), m, consts);
    const rows = [];
    for (const row of sources.drops || []) {
      if (row.explores != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location))) {
        rows.push({ location: row.location, kind: "Explore", event: EVENT_LOCATIONS.has(row.location) });
      }
    }
    for (const row of sources.fish || []) {
      if (row.catches != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location))) {
        rows.push({ location: row.location, kind: "Fish", event: EVENT_LOCATIONS.has(row.location) });
      }
    }
    return rows.filter((row, i) => rows.findIndex((other) => other.location === row.location) === i);
  }

  function locationSelect(item, need, m, route) {
    const choices = farmLocationChoices(item, need, m, constants());
    if (!choices.length || !route || !["explore", "fish"].includes(route.type)) return "";
    const selected = state.farmLocations[item.id] || route.location || "";
    return `<label class="location-choice"><span>Farm at</span><select data-location-id="${item.id}">${choices.map((choice) => `<option value="${esc(choice.location)}" ${selected === choice.location ? "selected" : ""}>${choice.event ? "Event · " : ""}${esc(choice.location)} · ${choice.kind}</option>`).join("")}</select></label>`;
  }

  function makeMaterialQuote(node, m, consts) {
    const subtree = E.resolveTree(index, node.id, node.qtyOut, m, 0, [], consts);
    const leaves = E.flattenLeaves(subtree);
    let totalGold = 0;
    let priced = 0;
    let count = 0;
    const routes = [];
    for (const [, leaf] of leaves) {
      if (leaf.id == null) continue;
      count += 1;
      const item = index.itemsById.get(leaf.id);
      const infra = infraFor(item, leaf.total, m);
      if (infra) {
        priced += 1;
        routes.push({ name: item.name, type: "covered", goldEq: 0 });
        continue;
      }
      const quote = E.marketQuote(index, leaf.id, leaf.total);
      const farm = farmPlan(item, leaf.total, m, consts);
      const choices = [
        quote && quote.best.goldEq != null && { type: "trade", goldEq: quote.best.goldEq },
        farm && farm.goldEq != null && { type: "farm", goldEq: farm.goldEq },
      ].filter(Boolean).sort((a, b) => a.goldEq - b.goldEq);
      if (choices.length) {
        totalGold += choices[0].goldEq;
        priced += 1;
        routes.push({ name: item.name, ...choices[0] });
      }
    }
    return { goldEq: totalGold, complete: count > 0 && priced === count, priced, count, routes };
  }

  function makeDecision(node, m, consts) {
    const manual = state.makeChoices[node.id] || "auto";
    const item = index.itemsById.get(node.id);
    const infra = infraFor(item, node.qtyOut, m);
    const direct = E.marketQuote(index, node.id, node.qtyOut);
    const farm = farmPlan(item, node.qtyOut, m, consts);
    const materials = makeMaterialQuote(node, m, consts);
    const rule = routeRule(item.name);
    const costs = [
      materials.complete && { action: "craft", goldEq: materials.goldEq },
      direct && direct.best.goldEq != null && { action: "trade", goldEq: direct.best.goldEq },
      farm && farm.goldEq != null && { action: "farm", goldEq: farm.goldEq },
    ].filter(Boolean).sort((a, b) => a.goldEq - b.goldEq);
    const cashWinner = costs[0] || { action: "craft", goldEq: materials.goldEq };
    let auto = cashWinner.action;
    let reason = "Cheapest way to get this item on its own";
    if (infra) {
      auto = "building";
      reason = infra.kind + " covers this input";
    } else if (rule && rule.action === "farm" && farm && (!rule.location || rule.location === farm.location)) {
      auto = "farm";
      reason = rule.why;
    } else if (farm && farm.goldEq != null && cashWinner.goldEq != null) {
      const ratio = cashWinner.goldEq > 0 ? farm.goldEq / cashWinner.goldEq : Infinity;
      if (ratio <= 1.2 || (ratio <= 1.5 && farm.progressionScore >= 16)) {
        auto = "farm";
        reason = ratio <= 1.2
          ? "Farm cost is close enough that co-drops and mastery progress break the tie"
          : "Progression-rich location offsets part of the higher consumable cost";
      } else if (cashWinner.action === "trade") {
        reason = "Buying is the cash winner; farming remains the progression alternative";
      }
    }
    const progressionWinner = farm && (farm.preferred || farm.progressionScore >= 8) ? "farm" : auto;
    const action = manual === "auto" ? auto : manual;
    return {
      action,
      auto,
      reason,
      direct,
      farm,
      materials,
      infra,
      manual,
      cashWinner: cashWinner.action,
      progressionWinner,
    };
  }

  function sourceRoute(item, missing, m, consts) {
    if (missing <= 0) return { type: "owned", label: "Inventory", detail: "Already covered", goldEq: 0 };
    const decision = state.decisionActions.get(item.id);
    const infra = infraFor(item, missing, m);
    if (decision === "building" || infra && !decision) {
      return { type: "covered", label: infra.kind, detail: infra.detail, hours: infra.hours, goldEq: 0 };
    }
    if (decision === "trade") {
      const direct = E.marketQuote(index, item.id, missing);
      return direct ? { type: "trade", label: "Buy in trade", detail: quoteText(direct), quote: direct, goldEq: direct.best.goldEq } : { type: "unknown", label: "No quote", detail: "Trade was selected but no saved price exists" };
    }
    if (decision === "farm") {
      const chosenFarm = farmPlan(item, missing, m, consts);
      return chosenFarm
        ? Object.assign({ label: farmLabel(chosenFarm) }, chosenFarm)
        : { type: "unknown", label: "No farm route", detail: "Farm was selected but no measured route exists" };
    }

    const source = E.sourcesFor(index, item.id, missing, m, consts);
    const trade = E.marketQuote(index, item.id, missing);
    const farm = farmPlan(item, missing, m, consts);
    const vendor = source.vendor ? { type: "vendor", label: "Country Store", silver: source.vendor.priceEach * missing, detail: `${fmt(source.vendor.priceEach * missing)} silver` } : null;
    const isDepotItem = item.name === "Iron" || item.name === "Nails";
    const choice = state.sourceChoices[item.id] || "auto";
    if (choice === "covered" && infra) return { type: "covered", label: infra.kind, detail: infra.detail, hours: infra.hours, goldEq: 0 };
    if (choice === "trade" && trade && !isFish(item)) return { type: "trade", label: "Buy in trade", detail: quoteText(trade), quote: trade, goldEq: trade.best.goldEq };
    if (choice === "farm" && farm) return Object.assign({ label: farm.type === "fish" ? "Fish" : farm.type === "crop" ? "Grow" : farm.type === "acorn" ? "Acorn test" : "Explore" }, farm);
    if (choice === "vendor" && vendor) return vendor;
    if (choice !== "auto") return { type: "unknown", label: "Unavailable", detail: "That route is not known for this item" };

    if (infra) return { type: "covered", label: infra.kind, detail: infra.detail, hours: infra.hours, goldEq: 0 };
    if (isDepotItem && vendor) {
      return {
        ...vendor,
        detail: `${fmt(vendor.silver)} silver · normal supply route when Iron Depot is not enabled`,
      };
    }
    if (item.name === "Hide" && farm && farm.type === "acorn") {
      const cashNote = trade && trade.best.goldEq != null
        ? ` Cash-only alternative: trade costs about ${fmt(trade.best.goldEq)}g; Acorn remains the default because it adds Hide to exploration you already need.`
        : " Acorn remains the default because it adds Hide to exploration you already need.";
      return Object.assign({ label: "Acorn overlay" }, farm, { detail: farm.detail + cashNote });
    }
    if (farm && farm.type === "fish") return Object.assign({ label: "Fish" }, farm);
    if (isFish(item)) return { type: "unknown", label: "Fish for it", detail: "No fishing rate recorded for this one yet" };
    if (trade && farm && trade.best.goldEq != null && farm.goldEq != null && trade.best.goldEq <= farm.goldEq * 1.05) {
      return { type: "trade", label: "Buy in trade", detail: quoteText(trade) + " · cheaper than consumables", quote: trade, goldEq: trade.best.goldEq };
    }
    if (farm) return Object.assign({ label: farm.type === "fish" ? "Fish" : farm.type === "crop" ? "Grow" : farm.type === "acorn" ? "Acorn test" : "Explore" }, farm);
    if (vendor) return vendor;
    if (trade) return { type: "trade", label: "Buy in trade", detail: quoteText(trade), quote: trade, goldEq: trade.best.goldEq };
    return { type: "unknown", label: "Not known yet", detail: "No reliable way to get this one is recorded yet" };
  }

  function routeOptions(item, route, m) {
    const source = E.sourcesFor(index, item.id, 1, m, constants());
    const options = [["auto", "Auto"]];
    // Craft was missing here entirely: an item with a recipe -- Twine, Rope,
    // any of the dyes -- could be listed as something to go and get with no way
    // to say "I will make it". It sets the make choice rather than the route,
    // because crafting is what expands the item into its own inputs.
    const craftable = (index.craftByItem.get(item.id) || []).length > 0;
    if (craftable) options.push(["craft", "Craft"]);
    const gather = farmPlan(item, 1, m, constants());
    if (gather) options.push(["farm", farmLabel(gather)]);
    if (!isFish(item) && E.marketQuote(index, item.id, 1)) options.push(["trade", "Trade"]);
    if (!isFish(item) && source.vendor) options.push(["vendor", "Store"]);
    if (infraFor(item, 1, m)) options.push(["covered", "Covered"]);
    const selected = state.makeChoices[item.id] === "craft" && craftable
      ? "craft"
      : (state.sourceChoices[item.id] || "auto");
    return `<select class="route-select" data-source-id="${item.id}" aria-label="Acquisition route for ${esc(item.name)}">${options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}</select><span class="route-choice ${route.type}">${esc(route.label)}</span>`;
  }

  // The game will not let you mail some items, so there is no trade route for
  // them at any price. Absence from the list means unknown, not tradeable.
  const CANNOT_MAIL = new Set(((window.FRPG_TRADEABLE || {}).cannotMail || []).map((n) => String(n).toLowerCase()));
  const canTrade = (item) => !!item && !CANNOT_MAIL.has(String(item.name || "").toLowerCase());

  // Meals that genuinely move the numbers for this kind of run, toggleable
  // wherever the run is shown. The Hide control collapses the row only — it
  // never changes whether a meal is on.
  function mealStripFor(kind) {
    const meals = [
      kind === "fish" && { id: "seapincher", label: "Sea Pincher Special", note: "nets catch 10% more" },
      kind !== "fish" && { id: "quandary", label: "Quandary Chowder", note: "10% more per Arnold Palmer" },
      kind !== "fish" && { id: "neigh", label: "Neigh", note: "Cider uses 20% less stamina" },
      { id: "mushroom", label: "Mushroom Stew", note: "each item counts 1.1x toward a mastery" },
    ].filter(Boolean);
    const activeCount = meals.filter((meal) => state.meals[meal.id]).length;
    const hidden = !!state.mealStripHidden;
    return `<div class="gather-path meal-strip">` +
      `<span class="meal-strip-head">Meals in these numbers<small>${activeCount} on</small>` +
      `<button type="button" class="meal-strip-toggle" data-meal-strip aria-expanded="${!hidden}">${hidden ? "Show" : "Hide"}</button></span>` +
      `<div class="meal-chips"${hidden ? " hidden" : ""}>` +
      meals.map((meal) => `<label class="meal-chip${state.meals[meal.id] ? " on" : ""}" title="${esc(meal.label)} — ${esc(meal.note)}">` +
        `<input type="checkbox" data-gather-meal="${meal.id}" ${state.meals[meal.id] ? "checked" : ""}>` +
        `${itemImg(itemByName(meal.label), "meal-chip-art", meal.label)}` +
        `<span class="meal-chip-name">${esc(meal.label)}</span></label>`).join("") +
      `</div></div>`;
  }

  // What you actually pay, at your own rate. Trade prices move constantly and
  // every player buys at a different number, so the quote is only a starting
  // suggestion — type over it and the plan uses your figure.
  const BUY_CURRENCIES = [["ap", "Arnold Palmer"], ["ac", "Apple Cider"], ["oj", "Orange Juice"], ["gold", "Gold"]];
  function buyRate(item) {
    const saved = state.buyRates[item.id];
    if (saved && saved.perK > 0) return saved;
    const quote = E.marketQuote(index, item.id, 1000);
    if (quote && quote.best) {
      const cur = quote.best.currency === "gold" ? "gold" : quote.best.currency;
      return { perK: quote.best.rate, currency: BUY_CURRENCIES.some(([k]) => k === cur) ? cur : "ap", suggested: true };
    }
    return null;
  }
  function buyRateBlock(item, missing) {
    if (!canTrade(item)) {
      return `<div class="path-buy muted"><b>Or buy it</b> <small>${esc(item.name)} cannot be mailed, so there is no trade route for it.</small></div>`;
    }
    const rate = buyRate(item);
    const perK = rate ? rate.perK : "";
    const cur = rate ? rate.currency : "ap";
    const units = rate && rate.perK > 0 ? (Math.max(1, missing) / 1000) * rate.perK : null;
    const curName = (BUY_CURRENCIES.find(([k]) => k === cur) || [, "Arnold Palmer"])[1];
    return `<div class="path-buy">
      <b>Or buy it</b>
      <span class="buy-rate">
        <input class="buy-per-k" type="number" min="0" step="0.1" inputmode="decimal"
               value="${perK === "" ? "" : esc(String(round2(perK)))}" placeholder="rate"
               data-buy-id="${item.id}" aria-label="What you pay per 1,000 ${esc(item.name)}">
        <select class="buy-cur" data-buy-cur="${item.id}" aria-label="What you pay in">
          ${BUY_CURRENCIES.map(([k, label]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <small>per 1,000</small>
      </span>
      ${units != null ? `<small class="buy-total">${fmt(missing)} costs about <b>${fmt(units)} ${esc(curName)}</b>${rate.suggested ? " — quoted rate, change it to yours" : ""}</small>` : `<small class="buy-total muted">Enter what you pay and I'll total it.</small>`}
    </div>`;
  }

  // Every way to get this one ingredient, side by side with real numbers, so
  // the choice is the player's and nothing is hidden behind a verdict.
  function pathChoices(item, route, missing, m) {
    if (!route) return "";
    // On a bought row the only thing worth showing is what you pay for it.
    if (["trade", "vendor"].includes(route.type)) return `<div class="path-choices">${buyRateBlock(item, missing)}</div>`;
    if (!["explore", "acorn"].includes(route.type)) return "";
    const chosen = state.drinkChoices[item.id] === "ap" ? "ap" : "cider";
    const perks = [
      state.enabled.has("wanderer") && "Wanderer",
      state.meals.neigh && "Neigh",
    ].filter(Boolean);
    const staminaNote = perks.length ? `${perks.join(" + ")} applied` : "no stamina perks on";
    const apNote = state.meals.quandary ? "Quandary Chowder applied" : "without Quandary Chowder";

    const cider = route.ciders != null ? `
      <label class="path-pick${chosen === "cider" ? " on" : ""}">
        <input type="radio" name="drink-${item.id}" value="cider" ${chosen === "cider" ? "checked" : ""} data-drink-id="${item.id}">
        <span><b>Explore with Apple Cider</b>
          <small>${fmt(route.ciders)} Cider · ${fmt(route.stamina)} stamina — ${esc(staminaNote)}</small></span>
      </label>` : "";

    const ap = route.aps != null ? `
      <label class="path-pick${chosen === "ap" ? " on" : ""}">
        <input type="radio" name="drink-${item.id}" value="ap" ${chosen === "ap" ? "checked" : ""} data-drink-id="${item.id}">
        <span><b>Use Arnold Palmers</b>
          <small>${fmt(route.aps)} Arnold Palmer — ${esc(apNote)}</small></span>
      </label>` : `
      <div class="path-pick muted"><span><b>Use Arnold Palmers</b>
        <small>no measured per-AP rate for this one</small></span></div>`;

    const buy = buyRateBlock(item, missing);

    return `<div class="path-choices"><span class="path-head">${fmt(route.explores)} explores at ${esc(route.location)}</span>${cider}${ap}${mealStripFor("explore")}${buy}</div>`;
  }

  function routeEvidence(item, route) {
    const fact = itemFact(item.name);
    const lines = [];
    if (route.reason) lines.push(`<span>${esc(route.reason)}</span>`);
    if (route.coDrops && route.coDrops.length) lines.push(`<span><b>Expected drops from this run</b></span><span class="drop-chips">${route.coDrops.map((drop) => {
      const dropItem = itemByName(drop.name);
      const exactRate = ((EXACT_AP_RATES[route.location] || {})[drop.name]) || null;
      const rate = exactRate ? `${Number(exactRate.value).toFixed(2)} ${exactRate.unit}` : "";
      return `<span class="drop-chip">${itemImg(dropItem, "drop-art", drop.name)}<span><b>${fmt(drop.expected)}</b><small>${esc(drop.name)}</small>${rate ? `<small>${rate}</small>` : ""}</span></span>`;
    }).join("")}</span>`);
    if (route.location && EVENT_LOCATIONS.has(route.location)) lines.push(`<span class="event-warning"><b>Seasonal:</b> ${esc(route.location)} is only included because event locations are enabled.</span>`);
    if (fact.hoard) {
      const tower = fact.mastery && fact.mastery.towerRequirement ? ` · Tower MM ${fmt(fact.mastery.towerRequirement)}` : "";
      lines.push(`<span class="hoard-note"><b>Save for later:</b> quests in the guide ask for ${fmt(fact.questTotal)} total across ${fmt(fact.questSteps)} steps${tower}. Your remaining amount may be lower.</span>`);
    }
    const summary = route.coDrops && route.coDrops.length ? `See ${route.coDrops.length} useful drops & future uses` : "Why this route";
    return lines.length ? `<details class="route-evidence"><summary>${summary}</summary><small class="route-evidence-body">${lines.join("")}</small></details>` : "";
  }
  // Everything hanging off a craft used to render bare, which made fished and
  // explored items look like things you craft. Say how each one is actually got.
  const treeRouteWord = (route) => {
    if (!route) return "";
    switch (route.type) {
      case "fish": return "fish for it";
      case "crop": return "grow it";
      case "explore": return "explore for it";
      case "acorn": return "explore with Acorn Pie";
      case "trade": return "buy in trade";
      case "vendor": return "buy at the Country Store";
      case "covered": return "your farm covers it";
      case "owned": return "already in your inventory";
      default: return "";
    }
  };
  function treeHtml(node) {
    const item = index.itemsById.get(node.id);
    if (node.cyclic) return `<div class="leaf cyclic">↻ ${esc(node.name)} — circular recipe</div>`;
    if (!node.children.length) {
      const how = treeRouteWord(leafRoutes.get(node.id)) || (node.stopped ? "get ready-made" : "");
      return `<div class="leaf">${itemImg(item, "tree-art", node.name)}<span class="node-amt">×${fmt(node.qtyOut)}</span>${esc(node.name)}${how ? `<span class="node-kind">${esc(how)}</span>` : ""}</div>`;
    }
    return `<details ${state.treeOpen ? "open" : ""}><summary>${itemImg(item, "tree-art", node.name)}<span class="node-amt">×${fmt(node.qtyOut)}</span>${esc(node.name)}<span class="node-kind">${node.kind} ×${fmt(node.craftsNeeded)}</span></summary>${node.children.map(treeHtml).join("")}</details>`;
  }
  // ---- Gathered goals (fish / explore / grow) -------------------------------
  // Farm RPG does not craft a Drum. When the goal has no recipe, the craft
  // scaffolding is hidden and this panel answers the real question instead.
  const FISH_METHODS = {
    hand:  { label: "By hand",      note: "one cast at a time" },
    net:   { label: "Fishing Nets", note: "" },
    large: { label: "Large Nets",   note: "" },
  };

  const GATHER_WORDS = {
    fish:  { verb: "you fish for this one",     noun: "Fishing",   place: "Best pond",   act: "casts",    actTitle: "Casts",    also: "Also caught here" },
    explore:{ verb: "you explore for this one", noun: "Exploring", place: "Best place",  act: "explores", actTitle: "Explores", also: "Also found here" },
    acorn: { verb: "you explore for this one",  noun: "Exploring", place: "Best place",  act: "explores", actTitle: "Explores", also: "Also found here" },
    crop:  { verb: "you grow this one",         noun: "Growing",   place: "On the farm", act: "plants",   actTitle: "Plants",   also: "" },
  };

  function gatherRankedPlaces(goal, need, m) {
    const src = E.sourcesFor(index, goal.id, Math.max(1, need), m, constants());
    const rows = [];
    for (const row of src.fish || []) {
      if (row.catches != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location)))
        rows.push({ location: row.location, kind: "fish", denom: row.denom, actions: row.catches });
    }
    for (const row of src.drops || []) {
      if (row.explores != null && (state.includeEvents || !EVENT_LOCATIONS.has(row.location)))
        rows.push({ location: row.location, kind: "explore", denom: row.denom, actions: row.explores });
    }
    return rows.sort((a, b) => a.actions - b.actions);
  }

  function renderGatherPanel(goal, m, goalIsCrafted, tradeGoldEq) {
    const panel = $("gatherPanel");
    if (!panel) return;
    const need = Math.max(1, state.qty);
    const plan = goalIsCrafted ? null : farmPlan(goal, need, m, constants());
    const gathered = !!plan && !!GATHER_WORDS[plan.type];

    // Craft-shaped furniture only makes sense for something you craft.
    for (const [id, hide] of [["routeSummaryHead", gathered], ["routeGrid", gathered], ["treeCard", gathered]]) {
      const node = $(id);
      if (node) node.classList.toggle("hidden", hide);
    }
    if ($("workbenchEyebrow")) $("workbenchEyebrow").textContent = gathered ? "Your options" : "Shopping & Farming List";
    if ($("workbenchTitle")) $("workbenchTitle").textContent = gathered ? "Change how you get it" : "Items You Still Need";

    if (!gathered) { panel.classList.add("hidden"); panel.innerHTML = ""; return; }

    const words = GATHER_WORDS[plan.type];
    const places = gatherRankedPlaces(goal, need, m);
    const best = places.find((row) => row.location === plan.location) || places[0] || null;

    // Both drink paths, in the units they are actually spent in. Apple Cider
    // burns stamina and Arnold Palmer does not, so they are listed side by side
    // and never totalled against each other or converted to gold — which of the
    // two is "cheaper" depends on a farm's own stamina production.
    // Mushroom Stew makes each item count 1.1x toward a mastery, so the same run
    // yields more mastery than items. Show both rather than one blended number.
    const masteryMult = state.meals.mushroom ? 1 + c("mushroom_mastery_bonus", 0.1) : 1;
    const runLines = [];
    runLines.push(["Items you get", fmt(state.qty), "what lands in your inventory"]);
    if (masteryMult > 1) {
      runLines.push(["Mastery earned", fmt(Math.round(state.qty * masteryMult)), `Mushroom Stew — each item counts ${round2(masteryMult)}×`]);
    }
    if (best) runLines.push([words.actTitle, fmt(best.actions), best.denom != null ? `${fmt(round2(best.denom))} per ${esc(goal.name)}` : "rate not measured yet"]);
    // The shared workbook quotes the same drops per Arnold Palmer / per Large
    // Net. Shown as-is beside our own figure, never converted into it — the two
    // use different rate semantics (see KNOWN_MISTAKES.md).
    const wbRates = window.FRPG_WORKBOOK_RATES;
    if (best && wbRates) {
      const table = plan.type === "fish" ? wbRates.fishing : wbRates.exploring;
      const quoted = table && table[best.location] && table[best.location][goal.name];
      if (quoted) runLines.push(["Workbook rate", fmt(round2(quoted)), plan.type === "fish" ? "drops per Large Net" : "drops per Arnold Palmer"]);
    }
    if (plan.type === "fish") {
      const netWith = plan.netNotes && plan.netNotes.length ? ` · ${plan.netNotes.join(" + ")} applied` : " · no net perks or meals on";
      if (plan.method === "large" && plan.largeNets != null) runLines.push(["Large Nets", fmt(plan.largeNets), `${fmt(plan.lnCatch)} catches per net${netWith}`]);
      if (plan.method === "net" && plan.fishingNets != null) runLines.push(["Fishing Nets", fmt(plan.fishingNets), `${fmt(plan.fnCatch)} catches per net${netWith}`]);
      if (plan.method === "hand") runLines.push(["Casts by hand", fmt(plan.catches), "stamina per cast is not recorded yet"]);
    }
    if (plan.type === "crop" && plan.plants) runLines.push(["Plants", fmt(plan.plants), plan.minutesEach ? `${fmt(plan.minutesEach)} min each` : ""]);

    const drinkPaths = [];
    if (plan.ciders) drinkPaths.push(["If you explore for it", [
      ["Apple Cider", fmt(plan.ciders), ""],
      ["Stamina", fmt(plan.stamina), "Cider spends stamina — it does not give any"],
    ]]);
    if (plan.aps) drinkPaths.push(["Or use Arnold Palmers instead", [
      ["Arnold Palmer", fmt(plan.aps), "finds items without exploring"],
    ]]);

    const canBuy = !isFish(goal);
    const quote = canBuy ? E.marketQuote(index, goal.id, need) : null;
    const buyLines = [];
    if (quote && quote.best) {
      const b = quote.best;
      buyLines.push([b.currency === "gold" ? "Gold" : b.currency.toUpperCase(), fmt(b.amount), b.raw ? `quoted at ${esc(b.raw)}` : ""]);
    }
    const vendorEach = goal.buy != null && goal.buy > 0 ? goal.buy : null;
    if (canBuy && vendorEach) buyLines.push(["Country Store", fmt(vendorEach * need) + " silver", `${fmt(vendorEach)} each`]);

    const coDrops = best ? E.coDropsFor(index, best.location, best.actions, goal.name, P, 40) : [];
    const placeChoices = places.map((row) =>
      `<option value="${esc(row.location)}" ${row === best ? "selected" : ""}>${esc(row.location)}${row.denom != null ? ` · ${fmt(round2(row.denom))} ${esc(words.act)} each` : ""}</option>`).join("");

    const lineRow = ([k, v, note]) => `<div class="gather-line"><b>${esc(k)}</b><strong>${v}</strong>${note ? `<small>${note}</small>` : ""}</div>`;
    const col = (label, lines, extra) =>
      `<div class="gather-col"><span>${esc(label)}</span>` +
      (lines.length ? lines.map(lineRow).join("")
                    : `<p class="gather-none">No price recorded for this one yet.</p>`) +
      (extra || "") + `</div>`;
    const drinkBlocks = drinkPaths.map(([title, lines]) =>
      `<div class="gather-path"><span>${esc(title)}</span>${lines.map(lineRow).join("")}</div>`).join("");

    const fishBox = plan.type === "fish"
      ? `<div class="gather-path"><span>How you fish it</span><div class="gather-methods">` +
        Object.entries(FISH_METHODS).map(([key, meta]) => {
          const amount = key === "large" ? plan.largeNets : key === "net" ? plan.fishingNets : plan.catches;
          const unit = key === "hand" ? "casts" : "nets";
          const per = key === "large" ? plan.lnCatch : key === "net" ? plan.fnCatch : null;
          return `<label class="gather-method${plan.method === key ? " on" : ""}">` +
            `<input type="radio" name="fishMethod" value="${key}" ${plan.method === key ? "checked" : ""}>` +
            `<span><b>${esc(meta.label)}</b><small>${amount != null ? `${fmt(amount)} ${unit}` : "not recorded"}${per ? ` · ${fmt(per)} catches each` : ""}${meta.note ? ` · ${esc(meta.note)}` : ""}</small></span></label>`;
        }).join("") + `</div></div>`
      : "";

    // Meals that genuinely change this item's numbers, toggleable right here so
    // the total in front of you is the total for how you actually play.
    const relevantMeals = [
      plan.type === "fish" && { id: "seapincher", label: "Sea Pincher Special", note: "nets catch 10% more — community estimate" },
      { id: "mushroom", label: "Mushroom Stew", note: "each item counts 1.1× toward a mastery" },
    ].filter(Boolean);
    const activeCount = relevantMeals.filter((meal) => state.meals[meal.id]).length;
    const hidden = !!state.mealStripHidden;
    const mealStrip = `<div class="gather-path meal-strip">` +
      `<span class="meal-strip-head">Meals in these numbers` +
        `<small>${activeCount} on</small>` +
        `<button type="button" class="meal-strip-toggle" data-meal-strip aria-expanded="${!hidden}">${hidden ? "Show" : "Hide"}</button>` +
      `</span>` +
      `<div class="meal-chips"${hidden ? " hidden" : ""}>` +
      relevantMeals.map((meal) => `<label class="meal-chip${state.meals[meal.id] ? " on" : ""}" title="${esc(meal.label)} — ${esc(meal.note)}">` +
        `<input type="checkbox" data-gather-meal="${meal.id}" ${state.meals[meal.id] ? "checked" : ""}>` +
        `${itemImg(itemByName(meal.label), "meal-chip-art", meal.label)}` +
        `<span class="meal-chip-name">${esc(meal.label)}</span></label>`).join("") +
      `</div>${hidden ? "" : ""}${state.meals.mushroom ? `<p class="gather-mastery">Chasing the mastery only? <b>${fmt(Math.ceil(state.qty / (1 + c("mushroom_mastery_bonus", 0.1))))}</b> items reaches ${fmt(state.qty)} mastery.</p>` : ""}</div>`;

    const acornRelevant = plan.type !== "fish" && plan.type !== "crop";
    const acornBox = acornRelevant
      ? `<label class="gather-acorn"><input type="checkbox" id="gatherAcorn" ${state.meals.acorn ? "checked" : ""}>` +
        `<span><b>Using Acorn Pie</b><small>${best && best.location === "Forest"
          ? "No effect in the Forest — Hide already drops there."
          : "Adds Hide by replacing part of this location's normal drops. One charge per action, 150 per Pie."}</small></span></label>`
      : "";

    panel.innerHTML =
      `<div class="gather-head"><span class="scope-label">Gathered, not crafted</span>` +
      `<h2>${esc(goal.name)} × ${fmt(state.qty)} — ${esc(words.verb)}</h2>` +
      `<p class="gather-sub">${canBuy ? "What each way actually costs you. No winner is picked — that depends on your own stamina and stock." : "Fish cannot be mailed, so there is no trade route — this is the only way to get it."}</p></div>` +
      (places.length > 1
        ? `<label class="gather-where"><span>${esc(words.place)}</span><select data-location-id="${goal.id}">${placeChoices}</select></label>`
        : best ? `<p class="gather-where-fixed"><span>${esc(words.place)}</span> <b>${esc(best.location)}</b></p>` : "") +
      `<div class="gather-grid">` +
        col(plan.type === "fish" ? "Fish for it" : plan.type === "crop" ? "Grow it" : "Explore for it", runLines, fishBox + drinkBlocks + acornBox + mealStrip) +
        (canBuy ? col("Or buy it", buyLines) : "") +
      `</div>` +
      (coDrops.length ? `<div class="gather-haul"><span class="gather-haul-head">${esc(words.also)} — ${plural(coDrops.length, "other item", "other items")} from the same run</span>` +
        `<div class="haul-grid">${coDrops.map((drop) => {
          const dropItem = itemByName(drop.name);
          return `<span class="haul-chip">${itemImg(dropItem, "haul-art", drop.name)}<span><b>${fmt(drop.expected)}</b><small>${esc(drop.name)}</small></span></span>`;
        }).join("")}</div></div>` : "");
    panel.classList.remove("hidden");

    panel.querySelectorAll('input[name="fishMethod"]').forEach((radio) => {
      radio.onchange = () => { if (radio.checked) { state.fishMethods[goal.id] = radio.value; save(); render(); } };
    });
    const stripToggle = panel.querySelector("[data-meal-strip]");
    if (stripToggle) stripToggle.onclick = () => { state.mealStripHidden = !state.mealStripHidden; save(); render(); };
    panel.querySelectorAll("[data-gather-meal]").forEach((box) => {
      box.onchange = () => { state.meals[box.dataset.gatherMeal] = box.checked; save(); renderSetup(); render(); };
    });
    const acornToggle = $("gatherAcorn");
    if (acornToggle) acornToggle.onchange = () => { state.meals.acorn = acornToggle.checked; save(); renderSetup(); render(); };
  }

  const round2 = (n) => Math.round(Number(n) * 100) / 100;

  const metric = (key, value, note) => `<div class="route-metric"><span>${key}${note ? `<small>${note}</small>` : ""}</span><b>${value}</b></div>`;
  const trail = (label, value, note, tone) => `<div class="trail-stop ${tone || ""}"><span>${label}</span><strong>${value}</strong><small>${note || ""}</small></div>`;

  function render() {
    el.error.classList.add("hidden");
    if (!state.itemId || !state.qty) {
      el.result.classList.add("hidden"); el.empty.classList.remove("hidden"); return;
    }
    const consts = constants(), m = mods();
    let fullTree;
    try {
      fullTree = E.resolveTree(index, state.itemId, state.qty, m, 0, [], consts);
    } catch (error) {
      el.error.textContent = error.message; el.error.classList.remove("hidden"); return;
    }

    // How much of an ingredient you need depends on which of its parents are
    // still being crafted, and that depends on the decisions themselves. So
    // settle the two together: size every decision against the current tree,
    // re-resolve the tree with the resulting "buy/farm instead" stops, and
    // repeat until the stops stop changing. Sizing them once against the
    // fully-expanded tree overstated shared ingredients — Glass Orb read 12m
    // when the plan it was shown next to only needed 8m, because Red Dye was
    // being bought rather than crafted through Glass Bottle.
    const fullNodes = E.collectNodes(fullTree);
    const craftableIds = [...fullNodes.values()].filter((node) => node.children && node.children.length).map((node) => node.id);
    let tree = fullTree;
    let treeNodes = fullNodes;
    let decisions = [];
    let stopIds = new Set();
    for (let pass = 0; pass < 4; pass += 1) {
      const passDecisions = [];
      const passStops = new Set();
      const passActions = new Map();
      for (const id of craftableIds) {
        const sized = treeNodes.get(id);
        if (!sized) continue; // pruned away by a stop higher up the tree
        const item = index.itemsById.get(id);
        if (!item) continue;
        const node = { id, name: item.name, qtyOut: sized.qtyOut };
        const direct = E.marketQuote(index, id, node.qtyOut);
        const infra = infraFor(item, node.qtyOut, m);
        const farm = farmPlan(item, node.qtyOut, m, consts);
        if (!direct && !infra && !farm) continue;
        const decision = makeDecision(node, m, consts);
        passDecisions.push({ node, item, ...decision });
        passActions.set(id, decision.action);
        if (["trade", "building", "farm"].includes(decision.action)) passStops.add(id);
      }
      const settled = pass > 0 && passStops.size === stopIds.size && [...passStops].every((id) => stopIds.has(id));
      decisions = passDecisions;
      stopIds = passStops;
      state.decisionActions = passActions;
      tree = E.resolveTree(index, state.itemId, state.qty, m, 0, [], consts, stopIds);
      treeNodes = E.collectNodes(tree);
      if (settled) break;
    }
    const activeNodeIds = new Set(treeNodes.keys());
    const activeDecisions = decisions.filter((decision) => activeNodeIds.has(decision.node.id));
    const leaves = E.flattenLeaves(tree);
    const rows = [...leaves.values()].filter((leaf) => leaf.id != null).map((leaf) => {
      const item = index.itemsById.get(leaf.id);
      const owned = Number(state.owned[leaf.id] || 0);
      const missing = Math.max(0, leaf.total - owned);
      return { leaf, item, owned, missing, route: sourceRoute(item, missing, m, consts) };
    }).sort((a, b) => b.missing - a.missing);
    leafRoutes = new Map(rows.map((row) => [row.item.id, row.route]));

    let craftSilver = E.treeCraftSilver(tree, m);
    let vendorSilver = 0, tradeGoldEq = 0, farmGoldEq = 0, rawSellValue = 0;
    let explores = 0, stamina = 0, ciders = 0, aps = 0, oj = 0, largeNets = 0, plants = 0, passiveHours = 0;
    let acornPies = 0, acornActions = 0, acornUses = 0, acornBulk = 1, acornBulkMeal = null;
    let independentExplores = 0;
    const tradeCurrency = { gold: 0, ap: 0, oj: 0 };
    const exploreBundles = new Map();
    for (const row of rows) {
      const route = row.route;
      if (row.item.sell != null) rawSellValue += row.missing * row.item.sell * m.saleMult;
      if (route.type === "vendor") vendorSilver += route.silver || 0;
      if (route.type === "trade" && route.quote) {
        const best = route.quote.best;
        tradeCurrency[best.currency] += best.amount;
        tradeGoldEq += best.goldEq || 0;
      }
      if (route.type === "explore") {
        independentExplores += route.explores || 0;
        const previous = exploreBundles.get(route.location);
        if (!previous || (route.explores || 0) > (previous.explores || 0)) exploreBundles.set(route.location, route);
      } else {
        if (["fish", "acorn"].includes(route.type)) farmGoldEq += route.goldEq || 0;
        if (route.type === "acorn") {
          acornPies += route.pies || 0;
          acornActions += route.actions || 0;
          acornUses += route.uses || 0;
          if ((route.bulk || 1) > acornBulk) { acornBulk = route.bulk; acornBulkMeal = route.bulkMeal; }
        }
        stamina += route.stamina || 0;
        ciders += route.method === "cider" ? route.ciders || route.uses || 0 : 0;
        aps += route.method === "ap" ? route.aps || route.uses || 0 : 0;
        oj += route.oj || 0;
      }
      largeNets += route.largeNets || 0;
      plants += route.plants || 0;
      passiveHours = Math.max(passiveHours, route.hours || 0);
    }
    for (const route of exploreBundles.values()) {
      farmGoldEq += route.goldEq || 0;
      explores += route.explores || 0;
      stamina += route.method === "cider" ? route.stamina || 0 : 0;
      ciders += route.method === "cider" ? route.ciders || 0 : 0;
      aps += route.method === "ap" ? route.aps || 0 : 0;
      oj += route.method === "cider" ? route.oj || 0 : 0;
    }
    const sharedExploreSavings = Math.max(0, independentExplores - explores);
    const goal = index.itemsById.get(state.itemId);
    const outputSell = goal.sell != null ? goal.sell * m.saleMult * state.qty : null;
    const netSilver = outputSell == null ? null : outputSell - craftSilver - vendorSilver;
    const trueNet = netSilver == null ? null : netSilver - rawSellValue;
    const coveredRows = rows.filter((row) => row.route.type === "covered");
    const visibleRows = state.showCovered ? rows : rows.filter((row) => row.route.type !== "covered");
    const chosenCounts = rows.reduce((acc, row) => { acc[row.route.type] = (acc[row.route.type] || 0) + 1; return acc; }, {});
    const cashBuyCount = activeDecisions.filter((decision) => decision.cashWinner === "trade").length;
    const progressionFarmCount = activeDecisions.filter((decision) => decision.progressionWinner === "farm").length;

    el.empty.classList.add("hidden"); el.result.classList.remove("hidden");
    // A fished or explored goal has no recipe, so crafting language (and the
    // crafting-yield chip) doesn't apply to it.
    const goalIsCrafted = !!(fullTree.children && fullTree.children.length);
    const goalSummary = goalIsCrafted
      ? `${plural(rows.length, "ingredient", "ingredients")} · ${coveredRows.length} already covered by your farm · ${activeDecisions.filter((d) => ["trade", "farm", "building"].includes(d.action)).length} bought or farmed instead of crafted`
      : `Not a craft — you get this one directly. ${esc(capitalise(treeRouteWord(rows[0] && rows[0].route) || "see the route below"))}.`;
    $("goalHeader").innerHTML = `<div class="goal-identity">${itemImg(goal, "goal-art", goal.name)}<div class="goal-title"><h2>${esc(goal.name)} × ${fmt(state.qty)}</h2><p>${goalSummary}</p></div></div><div class="goal-yield">${goalIsCrafted && m.craftYield > 1 ? `<strong>${fmt(m.craftYield)}× per craft</strong><span>your perks make extra</span>` : ""}${m.saleMult > 1 ? `<span>${fmt(m.saleMult)}× sell price</span>` : ""}</div>`;
    $("resourceTrail").innerHTML = [
      trail("Goal", fmt(state.qty), goal.name),
      trail("Buying part", tradeGoldEq > 0 ? fmt(tradeGoldEq) + " gold" : "nothing", tradeGoldEq > 0 ? "the pieces you're buying" : "you're not buying any of it", "violet"),
      trail("Ingredients", fmt(rows.length), rows.length === 1 ? "one thing to get" : "things to get"),
      trail("Your farm covers", fmt(coveredRows.length), passiveHours ? `longest wait ${fmt(passiveHours)}h` : "ingredients you can skip"),
    ].join("");
    $("includeEvents").checked = state.includeEvents;
    if ($("drinkPath")) $("drinkPath").value = state.drinkPath;
    const staminaField = $("staminaMeasured");
    if (staminaField && document.activeElement !== staminaField) {
      const measured = Number(state.overrides.explore_stamina_measured || 0);
      staminaField.value = measured > 0 ? String(Math.round(measured * 100)) : "";
    }
    const acornNotice = $("acornNotice");
    if (state.meals.acorn && !state.acornTests.length) {
      acornNotice.innerHTML = 'Acorn Pie is on, but it cannot change these numbers yet. It needs at least one of your own measured samples \u2014 how many Hide you got from how many uses \u2014 because the rate differs by location and method. <button class="text-action" data-open-view="fieldlab">Add a sample</button>';
      acornNotice.hidden = false;
    } else {
      acornNotice.hidden = true;
    }

    const bestText = Object.entries(chosenCounts).sort((a, b) => b[1] - a[1])[0];
    $("bestRoute").innerHTML = `<span class="route-label">Best fit</span><h3>Use a mixed route</h3><p class="verdict">${plural(cashBuyCount, "ingredient is", "ingredients are")} cheaper to buy than to craft. ${plural(progressionFarmCount, "ingredient is", "ingredients are")} worth farming anyway, because the same run also feeds masteries, quests or other drops you want.</p>${metric("Most-used route", bestText ? decisionLabel(bestText[0]) : "Use inventory")}${metric("Exploring saved by combining runs", fmt(sharedExploreSavings))}${metric("Longest passive wait", passiveHours ? fmt(passiveHours) + " hours" : "None")}`;
    $("grindRoute").innerHTML = `<span class="route-label">Farm yourself</span><h3>Consumables and time</h3>${explores > 0 ? metric("Explores", fmt(explores)) : ""}${ciders > 0 ? metric("Apple Cider", fmt(ciders), "spends stamina") : ""}${aps > 0 ? metric("Arnold Palmer", fmt(aps), "no stamina") : ""}${acornPies > 0 ? metric("Acorn Pies", fmt(acornPies)) : ""}${largeNets > 0 ? metric("Large Nets", fmt(largeNets)) : ""}${plants > 0 ? metric("Crop plants", fmt(plants)) : ""}<p class="route-note">Anything from the same location comes out of one trip — the biggest requirement carries the rest.${acornPies > 0 ? ` ${fmt(acornUses)} Acorn uses = ${fmt(acornActions)} action charges` + (acornBulk > 1 ? ` because ${acornBulkMeal} makes 5 uses cost 1 charge` : "") + `, and one Pie covers ${fmt(c("acorn_pie_actions", 150))} charges.` : ""}</p>`;
    $("marketRoute").innerHTML = `<span class="route-label">Buy or trade</span><h3>Buy it instead</h3>${metric("Gold", fmt(tradeCurrency.gold))}${metric("Arnold Palmer", fmt(tradeCurrency.ap))}${metric("Orange Juice", fmt(tradeCurrency.oj))}${metric("All of it in gold", fmt(tradeGoldEq))}${metric("Country Store", fmt(vendorSilver) + " silver")}<p class="route-note">Price Check quotes ending in <b>/k</b> are per 1,000 items — Leather at 5 AP/k means 5 Arnold Palmers per 1,000 Leather.</p>`;

    // A fished, explored or grown goal is not a production plan. Its recipe
    // tree, "mixed route" verdict and multi-ingredient shopping list are all
    // empty scaffolding, so stand them down and lead with what the player
    // actually asked: where do I get this, and what does it cost in nets or
    // drinks compared with just buying it.
    renderGatherPanel(goal, m, goalIsCrafted, tradeGoldEq);

    if (coveredRows.length) {
      el.covered.classList.remove("hidden");
      el.covered.innerHTML = `<div><span class="scope-label">Your farm already covers these</span><strong>${plural(coveredRows.length, "ingredient you do not need to chase", "ingredients you do not need to chase")}</strong><p>${coveredRows.map((row) => `${esc(row.item.name)} × ${fmt(row.missing)} — ${esc(row.route.label)}`).join(" · ")}</p></div><label class="mini-check"><input type="checkbox" ${state.showCovered ? "checked" : ""} data-show-covered> Show them in the list anyway</label>`;
      el.covered.querySelector("[data-show-covered]").onchange = (event) => { state.showCovered = event.target.checked; $("toggleCovered").checked = state.showCovered; render(); };
    } else {
      el.covered.classList.add("hidden");
    }

    if (activeDecisions.length) {
      el.makeBuy.classList.remove("hidden");
      el.makeBuy.innerHTML = `<div class="section-heading compact"><div><h2>Make, buy, farm, or wait</h2></div><p>Auto picks the cheapest known route. Change it when you want mastery progress, a different location, or useful co-drops.</p></div><div class="decision-list">${activeDecisions.slice(0, 40).map((decision) => {
        const selected = state.makeChoices[decision.item.id] || "auto";
        const materialText = decision.materials.complete ? `${fmt(decision.materials.goldEq)} gold of ingredients on the cheapest routes` : `${decision.materials.priced} of ${decision.materials.count} ingredients priced so far`;
        const farmText = decision.farm ? `${farmLabel(decision.farm)} ${esc(decision.farm.location || "")}${decision.farm.goldEq != null ? ` · ${fmt(decision.farm.goldEq)} gold` : ""}` : "";
        const directText = decision.direct ? quoteText(decision.direct) : "";
        const infraText = decision.infra ? decision.infra.detail : "";
        const costText = decision.auto === "farm" ? farmText : decision.auto === "trade" ? directText : decision.auto === "building" ? infraText : materialText;
        const codrops = decision.farm ? coDropSentence(decision.farm) : "";
        const autoLabel = decision.auto === "building" ? "building" : decision.auto;
        return `<div class="decision-row">${itemImg(decision.item, "small")}<div class="decision-copy"><strong>${esc(decision.item.name)} × ${fmt(decision.node.qtyOut)}</strong><small>${esc(decision.reason)}</small>${codrops ? `<span class="codrop-line">Co-drops: ${codrops}</span>` : ""}<span class="winner-line">${winnerSentence(decision)}</span></div><div class="decision-cost">${costText}<small>${materialText}</small></div><div class="decision-controls"><select data-make-id="${decision.item.id}"><option value="auto" ${selected === "auto" ? "selected" : ""}>Auto → ${esc(autoLabel)}</option><option value="craft" ${selected === "craft" ? "selected" : ""}>Craft it</option>${decision.farm ? `<option value="farm" ${selected === "farm" ? "selected" : ""}>Farm directly</option>` : ""}${decision.direct ? `<option value="trade" ${selected === "trade" ? "selected" : ""}>Buy/trade it</option>` : ""}${decision.infra ? `<option value="building" ${selected === "building" ? "selected" : ""}>Use ${esc(decision.infra.kind)}</option>` : ""}</select>${decision.farm && (selected === "farm" || (selected === "auto" && decision.auto === "farm")) ? locationSelect(decision.item, decision.node.qtyOut, m, decision.farm) : ""}</div></div>`;
      }).join("")}</div>`;
      el.makeBuy.querySelectorAll("[data-make-id]").forEach((select) => {
        select.onchange = () => { state.makeChoices[select.dataset.makeId] = select.value; save(); render(); };
      });
    } else {
      el.makeBuy.classList.add("hidden");
    }

    $("ingCount").textContent = `${visibleRows.length} shown · ${rows.length} active`;
    el.ingBody.innerHTML = visibleRows.map((row) => `<tr class="route-${row.route.type}"><td><div class="item-cell">${itemImg(row.item, "table-art")}<span><b>${esc(row.item.name)}</b>${row.leaf.stopped ? '<small>Getting this ready-made, so its own recipe is not broken down</small>' : ""}</span></div></td><td class="num">${fmt(row.leaf.total)}</td><td class="num"><input class="owned" data-id="${row.item.id}" inputmode="numeric" value="${row.owned || ""}" placeholder="0" aria-label="Owned quantity of ${esc(row.item.name)}"></td><td class="num">${fmt(row.missing)}</td><td>${routeOptions(row.item, row.route, m)}${locationSelect(row.item, row.missing, m, row.route)}</td><td><span class="route-detail">${row.route.detail}</span>${row.route.goldEq != null && row.route.goldEq > 0 ? `<small class="gold-eq">≈ ${fmt(row.route.goldEq)} gold value</small>` : ""}${pathChoices(row.item, row.route, row.missing, m)}${routeEvidence(row.item, row.route)}</td></tr>`).join("");
    el.ingBody.querySelectorAll(".owned").forEach((input) => {
      input.onchange = () => {
        const value = parseInt(input.value.replace(/\D/g, ""), 10);
        if (isNaN(value)) delete state.owned[input.dataset.id]; else state.owned[input.dataset.id] = value;
        save(); render();
      };
    });
    el.ingBody.querySelectorAll("[data-source-id]").forEach((select) => {
      select.onchange = () => {
        const id = select.dataset.sourceId;
        if (select.value === "craft") {
          // Crafting is a decision about how the item is made, not where it is
          // bought, so it lives in the other store — and the two must not both
          // be set or they contradict each other.
          state.makeChoices[id] = "craft";
          delete state.sourceChoices[id];
        } else {
          if (state.makeChoices[id] === "craft") delete state.makeChoices[id];
          state.sourceChoices[id] = select.value;
        }
        save();
        render();
      };
    });
    document.querySelectorAll("[data-meal-strip]").forEach((button) => {
      button.onclick = () => { state.mealStripHidden = !state.mealStripHidden; save(); render(); };
    });
    document.querySelectorAll("[data-gather-meal]").forEach((box) => {
      box.onchange = () => { state.meals[box.dataset.gatherMeal] = box.checked; save(); renderSetup(); render(); };
    });
    document.querySelectorAll("[data-buy-id]").forEach((input) => {
      input.onchange = () => {
        const id = input.dataset.buyId;
        const perK = Number(input.value);
        const cur = (document.querySelector(`[data-buy-cur="${id}"]`) || {}).value || "ap";
        if (Number.isFinite(perK) && perK > 0) state.buyRates[id] = { perK, currency: cur };
        else delete state.buyRates[id];
        save(); render();
      };
    });
    document.querySelectorAll("[data-buy-cur]").forEach((select) => {
      select.onchange = () => {
        const id = select.dataset.buyCur;
        const existing = state.buyRates[id];
        const input = document.querySelector(`[data-buy-id="${id}"]`);
        const perK = existing ? existing.perK : Number(input && input.value);
        if (Number.isFinite(perK) && perK > 0) { state.buyRates[id] = { perK, currency: select.value }; save(); render(); }
      };
    });
    document.querySelectorAll("[data-drink-id]").forEach((radio) => {
      radio.onchange = () => { if (radio.checked) { state.drinkChoices[radio.dataset.drinkId] = radio.value; save(); render(); } };
    });
    document.querySelectorAll("[data-location-id]").forEach((select) => {
      select.onchange = () => { state.farmLocations[select.dataset.locationId] = select.value; save(); render(); };
    });
    el.tree.innerHTML = treeHtml(tree);

    state.lastPlan = {
      generatedAt: new Date().toISOString(),
      goal: { id: goal.id, name: goal.name, quantity: state.qty },
      profile: { enabledEffects: [...state.enabled], meals: state.meals, infrastructure: state.infra, assumptions: state.overrides },
      economics: { craftSilver, vendorSilver, outputSell, rawSellOpportunity: rawSellValue, economicNetSilver: trueNet, tradeGoldEquivalent: tradeGoldEq, farmGoldEquivalent: farmGoldEq },
      ingredients: rows.map((row) => ({ id: row.item.id, name: row.item.name, need: row.leaf.total, owned: row.owned, missing: row.missing, route: row.route.type, detail: row.route.detail })),
    };
  }

  function profileRows() {
    const map = new Map();
    for (const effect of BASE_EFFECTS) {
      const key = effect.family || effect.id;
      if (!map.has(key)) map.set(key, { key, ids: [], name: effect.name, kind: effect.kind, plain: [] });
      const row = map.get(key);
      row.ids.push(effect.id);
      if (effect.plain && !row.plain.includes(effect.plain)) row.plain.push(effect.plain);
    }
    return [...map.values()];
  }
  function perkArea(row) {
    const effects = BASE_EFFECTS.filter((effect) => row.ids.includes(effect.id));
    const types = effects.map((effect) => effect.type);
    if (types.some((type) => type.includes("craft") || type === "cook_save")) return "Workshop and cooking";
    if (types.some((type) => type.includes("sale"))) return "Selling";
    if (types.some((type) => type.includes("net") || type === "fn_bonus" || type === "ln_bonus")) return "Fishing";
    if (types.some((type) => type.includes("lemonade") || type.includes("ap_items") || type.includes("cider") || type.includes("stamina"))) return "Exploring and drinks";
    if (types.includes("iron_depot")) return "Farm infrastructure";
    return "Special drops";
  }
  function renderSetup() {
    const rows = profileRows();
    const groups = {};
    rows.forEach((row) => { (groups[perkArea(row)] ||= []).push(row); });
    $("perkGroups").innerHTML = Object.entries(groups).map(([name, groupRows]) => `<section class="perk-group"><h2>${esc(name)}</h2>${groupRows.map((row) => {
      const checked = row.ids.every((id) => state.enabled.has(id));
      return `<label class="perk-row"><input type="checkbox" data-effect-family="${esc(row.key)}" ${checked ? "checked" : ""}><span><strong>${esc(row.name)}</strong><small>${esc(row.kind || "Bonus")}</small><p>${row.plain.map(esc).join(" ")}</p></span></label>`;
    }).join("")}</section>`).join("");
    document.querySelectorAll("[data-effect-family]").forEach((input) => {
      input.onchange = () => {
        const row = rows.find((candidate) => candidate.key === input.dataset.effectFamily);
        row.ids.forEach((id) => input.checked ? state.enabled.add(id) : state.enabled.delete(id));
        save(); renderSetup(); render();
      };
    });
    const enabledRows = rows.filter((row) => row.ids.every((id) => state.enabled.has(id))).length;
    $("perkCount").textContent = `${enabledRows}/${rows.length}`;
    $("profileSummary").innerHTML = `<span class="profile-score"><b>${enabledRows}</b> of ${rows.length} permanent bonuses active</span>`;

    const infraCards = [
      { title: "Iron Depot", art: itemByName("Iron"), body: "Keeps Iron and Nails full by auto-buying with silver. These stay out of the main bottleneck list when enabled.", controls: `<label class="inline-toggle"><input type="checkbox" data-effect-direct="iron_depot" ${state.enabled.has("iron_depot") ? "checked" : ""}> I own Iron Depot</label>` },
      { title: "Sawmill", art: itemByName("Wood"), body: "Wood and Boards arrive hourly. Hickory adds six 20% ticks during its hour; useful output can still be limited by inventory or Craftworks.", controls: `<label class="inline-toggle"><input type="checkbox" data-infra="sawmillWood" ${state.infra.sawmillWood ? "checked" : ""}> Cover Wood</label><label class="inline-toggle"><input type="checkbox" data-infra="sawmillBoard" ${state.infra.sawmillBoard ? "checked" : ""}> Cover Boards</label><label class="mini-field">Useful Wood/hr<input type="number" min="0" data-infra-number="woodHour" value="${clean(state.infra.woodHour)}"></label><label class="mini-field">Useful Boards/hr<input type="number" min="0" data-infra-number="boardHour" value="${clean(state.infra.boardHour)}"></label>` },
      { title: "Quarry", art: itemByName("Stone"), body: "Stone is a 10-minute production item. Coal is only an occasional secondary output, so it has its own separate switch and measured rate.", controls: `<label class="inline-toggle"><input type="checkbox" data-infra="quarryStone" ${state.infra.quarryStone ? "checked" : ""}> Cover Stone</label><label class="inline-toggle"><input type="checkbox" data-infra="quarryCoal" ${state.infra.quarryCoal ? "checked" : ""}> Cover Coal too</label><label class="mini-field">Stone / 10 min<input type="number" min="0" data-infra-number="stoneTen" value="${clean(state.infra.stoneTen)}"></label><label class="mini-field">Average Coal/hr<input type="number" min="0" data-infra-number="coalHour" value="${clean(state.infra.coalHour)}"></label>` },
    ];
    $("infraGrid").innerHTML = infraCards.map((card) => `<article class="infra-card"><div class="infra-title">${itemImg(card.art, "meal-art", card.title)}<div><h3>${card.title}</h3></div></div><p>${card.body}</p><div class="infra-controls">${card.controls}</div></article>`).join("");
    document.querySelectorAll("[data-infra]").forEach((input) => { input.onchange = () => { state.infra[input.dataset.infra] = input.checked; save(); render(); }; });
    document.querySelectorAll("[data-infra-number]").forEach((input) => { input.onchange = () => { state.infra[input.dataset.infraNumber] = Number(input.value || 0); save(); render(); }; });
    document.querySelectorAll("[data-effect-direct]").forEach((input) => { input.onchange = () => { input.checked ? state.enabled.add(input.dataset.effectDirect) : state.enabled.delete(input.dataset.effectDirect); save(); renderSetup(); render(); }; });

    $("mealGrid").innerHTML = MEALS.map((meal) => {
      const item = itemByName(meal.name) || (meal.img ? { name: meal.name, img: meal.img } : null);
      return `<label class="meal-card ${state.meals[meal.id] ? "active" : ""}"><input type="checkbox" data-meal="${meal.id}" ${state.meals[meal.id] ? "checked" : ""}>${itemImg(item, "meal-art", meal.name)}<span><small>${esc(meal.area)}</small><strong>${esc(meal.name)}</strong><b>${esc(meal.effect)}</b><p>${esc(meal.calc)}</p></span></label>`;
    }).join("");
    document.querySelectorAll("[data-meal]").forEach((input) => { input.onchange = () => { state.meals[input.dataset.meal] = input.checked; save(); renderSetup(); render(); }; });

    if (!$("acornTests") || !$("acornForm") || !$("assumptionGrid")) return;
    $("acornTests").innerHTML = state.acornTests.length ? state.acornTests.map((test, idx) => {
      const bulk = test.method === "ap" && state.meals.lemoncream ? 5 : test.method === "cider" && state.meals.cabbage ? 5 : 1;
      const hidesPerUse = Number(test.hides) / Number(test.uses);
      return `<div class="sample-row"><span><b>${esc(test.location)}</b><small>${fmt(test.hides)} Hide from ${fmt(test.uses)} ${esc(test.method.toUpperCase())} · ${fmt(hidesPerUse)} Hide/use · current bulk ${bulk}×</small></span><button data-remove-sample="${idx}" aria-label="Remove sample">Remove</button></div>`;
    }).join("") : `<div class="empty-samples">No samples yet. The calculator will use normal Hide routes or the trade price until you add one.</div>`;
    document.querySelectorAll("[data-remove-sample]").forEach((button) => { button.onclick = () => { state.acornTests.splice(Number(button.dataset.removeSample), 1); save(); renderSetup(); render(); }; });
    $("acornForm").onsubmit = (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const sample = { location: String(form.get("location") || "Unknown location"), method: String(form.get("method") || "ap"), uses: Number(form.get("uses")), hides: Number(form.get("hides")) };
      if (sample.uses > 0 && sample.hides > 0) { state.acornTests.push(sample); save(); event.currentTarget.reset(); renderSetup(); render(); }
    };

    // These rows used to be titled with the raw storage key ("crop qf is
    // reduction", "net ln base catch"), which is unreadable to anyone but the
    // person who wrote it.
    $("assumptionGrid").innerHTML = Object.entries(BASE_CONSTS).filter(([, value]) => value && typeof value.v === "number").map(([key, value]) => `<label class="assumption-row ${value.verified ? "" : "unverified"}"><span><strong>${esc(ASSUMPTION_LABELS[key] || key.replaceAll("_", " "))}</strong><small>${esc(value.why || "")}</small></span><input type="number" step="any" data-assumption="${esc(key)}" aria-label="${esc(ASSUMPTION_LABELS[key] || key.replaceAll("_", " "))}" value="${clean(state.overrides[key] ?? value.v)}"></label>`).join("");
    document.querySelectorAll("[data-assumption]").forEach((input) => { input.onchange = () => { state.overrides[input.dataset.assumption] = Number(input.value); save(); render(); }; });
  }

  function accountScalar(value) {
    return value === null || value === undefined || value === "" ? "Unknown" : fmt(Number(value));
  }

  function validAccountSnapshot(value) {
    return value && typeof value === "object" && value.schemaVersion === "farmrpg-account-snapshot-v1"
      && value.levels && value.balances && value.quests && Array.isArray(value.inventory);
  }

  function enrichProfileCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1"
      || !capture.visibleText || !shared || typeof shared.parseProfilePage !== "function") return capture;
    const parsed = shared.parseProfilePage(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    capture.fields ||= {};
    capture.fields.player ||= {};
    const evidence = (value, confidence) => ({ value, raw: String(value), confidence });
    if (capture.pageType === "profile") {
      if (parsed.player.name) capture.fields.player.name = evidence(parsed.player.name, "inferred-page-section");
      if (parsed.player.farmName) capture.fields.player.farmName = evidence(parsed.player.farmName, "visible-label");
      if (parsed.player.accountCreated) capture.fields.player.accountCreated = evidence(parsed.player.accountCreated, "inferred-page-section");
    }
    if (parsed.activeEffects.length) {
      capture.fields.activeEffects = parsed.activeEffects.map((effect) => ({
        name: effect.name,
        uses: effect.uses ? evidence(Number(String(effect.uses).replace(/,/g, "")), "visible-label") : null,
        remaining: effect.remaining,
        confidence: "visible-label",
      }));
    }
    const infra = capture.fields.infrastructure;
    for (const name of ["orchard", "vineyard"]) {
      if (infra && infra[name] && infra[name].notes && infra[name].notes.confidence === "unparsed-text") delete infra[name];
    }
    return capture;
  }

  function enrichTowerCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1" || capture.pageType !== "tower"
      || !capture.visibleText || !shared || typeof shared.parseTowerPage !== "function") return capture;
    const parsed = shared.parseTowerPage(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    const evidence = (raw, confidence = "visible-label") => {
      if (raw === null || raw === undefined || raw === "") return null;
      const compact = String(raw).replace(/,/g, "").match(/^([\d.]+)([KMBT])?$/i);
      if (!compact) return { value: raw, raw: String(raw), confidence };
      const powers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
      const value = Number(compact[1]) * (compact[2] ? powers[compact[2].toUpperCase()] : 1);
      return { value, raw: String(raw), confidence };
    };
    capture.fields ||= {};
    capture.fields.levels ||= {};
    capture.fields.towerProgress = {
      currentLevel: evidence(parsed.currentLevel),
      ascensionKnowledge: evidence(parsed.ascensionKnowledge),
      dailySilver: evidence(parsed.dailySilver),
      nextLevel: evidence(parsed.nextLevel),
      nextAkCost: evidence(parsed.nextAkCost),
      nextSilverCost: evidence(parsed.nextSilverCost),
      nextMegaMasteries: evidence(parsed.nextMegaMasteries),
      nextRewards: parsed.nextRewards.map((reward) => ({ name: reward.name, quantity: evidence(reward.quantity) })),
      history: parsed.history.map((entry) => ({
        level: evidence(entry.level),
        date: entry.date,
        current: entry.current,
        rewards: entry.rewards.map((reward) => ({ name: reward.name, quantity: evidence(reward.quantity) })),
      })),
    };
    if (capture.fields.towerProgress.currentLevel) capture.fields.levels.tower = capture.fields.towerProgress.currentLevel;
    return capture;
  }

  function enrichMasteryCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1" || capture.pageType !== "mastery"
      || !capture.visibleText || !shared || typeof shared.parseMasteryPage !== "function") return capture;
    const parsed = shared.parseMasteryPage(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    const evidence = (raw, confidence = "visible-label") => {
      if (raw === null || raw === undefined || raw === "") return null;
      const numeric = String(raw).replace(/,/g, "");
      return { value: /^\d+(?:\.\d+)?$/.test(numeric) ? Number(numeric) : raw, raw: String(raw), confidence };
    };
    capture.fields ||= {};
    if (capture.fields.towerProgress === null) delete capture.fields.towerProgress;
    capture.fields.masteryStats = {
      mastered: evidence(parsed.stats.mastered),
      grandMastered: evidence(parsed.stats.grandMastered),
      megaMastered: evidence(parsed.stats.megaMastered),
    };
    capture.fields.masteries = parsed.masteries.map((entry) => ({
      itemName: entry.itemName,
      masteryCount: evidence(entry.masteryCount),
      masteryLevel: entry.masteryLevel,
      mastered: entry.mastered,
      grandMastery: entry.grandMastery,
      megaMastery: entry.megaMastery,
      towerRequirement: null,
      progressCurrent: evidence(entry.progressCurrent),
      progressTarget: evidence(entry.progressTarget),
      progressPercent: evidence(entry.progressPercent),
      completed: entry.completed,
      confidence: "visible-label",
    }));
    return capture;
  }

  function enrichQuestCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1" || !String(capture.pageType || "").startsWith("quests")
      || !capture.visibleText || !shared || typeof shared.parseQuestDashboard !== "function") return capture;
    const lines = capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const completed = typeof shared.parseCompletedQuestPage === "function"
      ? shared.parseCompletedQuestPage(lines, capture.visibleText) : { quests: [] };
    if (completed.quests.length) {
      const evidence = (raw, confidence = "visible-label") => {
        if (raw === null || raw === undefined || raw === "") return null;
        const numeric = String(raw).replace(/,/g, "");
        return { value: typeof raw === "boolean" ? raw : (/^\d+(?:\.\d+)?$/.test(numeric) ? Number(numeric) : raw), raw: String(raw), confidence };
      };
      capture.pageType = "quests-completed";
      capture.pageLabel = "Completed Requests";
      capture.fields ||= {};
      capture.fields.questStats ||= {};
      for (const key of Object.keys(completed.stats)) {
        const value = evidence(completed.stats[key]);
        if (value) capture.fields.questStats[key] = value;
      }
      capture.fields.quests = completed.quests.map((quest) => ({
        ...quest,
        communityCompletions: quest.communityCompletions === null ? null : Number(String(quest.communityCompletions).replace(/,/g, "")),
        communityCompletionPercent: quest.communityCompletionPercent === null ? null : Number(quest.communityCompletionPercent),
      }));
      capture.warnings ||= [];
      if (completed.stats.completedHistoryTruncated && !capture.warnings.some((warning) => /completed request history was truncated/i.test(warning))) {
        capture.warnings.push("Completed request history was truncated by the collector; missing older titles remain unknown.");
      }
      return capture;
    }
    const parsed = shared.parseQuestDashboard(lines, capture.visibleText);
    if (!parsed.quests.length) return capture;
    const evidence = (raw, confidence = "visible-label") => {
      if (raw === null || raw === undefined || raw === "") return null;
      const numeric = String(raw).replace(/,/g, "");
      return { value: /^\d+(?:\.\d+)?$/.test(numeric) ? Number(numeric) : raw, raw: String(raw), confidence };
    };
    capture.fields ||= {};
    capture.fields.questStats = {};
    for (const key of Object.keys(parsed.stats)) {
      const value = evidence(parsed.stats[key]);
      if (value) capture.fields.questStats[key] = value;
    }
    capture.fields.quests = parsed.quests.map((quest) => ({
      ...quest,
      progressPercent: evidence(quest.progressPercent),
    }));
    return capture;
  }

  function enrichPerkCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1" || capture.pageType !== "perks"
      || !capture.visibleText || !shared || typeof shared.parsePerkPage !== "function") return capture;
    const parsed = shared.parsePerkPage(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    const evidence = (raw, confidence = "visible-label") => {
      if (raw === null || raw === undefined || raw === "") return null;
      const numeric = String(raw).replace(/,/g, "");
      return { value: /^\d+(?:\.\d+)?$/.test(numeric) ? Number(numeric) : raw, raw: String(raw), confidence };
    };
    capture.fields ||= {};
    const existing = new Map((capture.fields.perks || []).map((perk) => [String(perk.name || "").toLowerCase(), perk]));
    capture.fields.perkStats = {};
    for (const key of Object.keys(parsed.stats)) {
      const value = evidence(parsed.stats[key]);
      if (value) capture.fields.perkStats[key] = value;
    }
    capture.fields.perks = parsed.perks.map((perk) => {
      const prior = existing.get(perk.name.toLowerCase()) || {};
      const inferredOwned = typeof prior.owned === "boolean" ? prior.owned
        : (typeof shared.inferPerkOwnership === "function" ? shared.inferPerkOwnership(prior.domEvidence) : null);
      return {
        ...perk,
        owned: inferredOwned,
        towerRequirement: evidence(perk.towerRequirement),
        domEvidence: prior.domEvidence || null,
      };
    });
    return capture;
  }

  function enrichFarmSupplyCapture(capture) {
    const shared = window.ImporterShared;
    const isSupply = capture && (capture.pageType === "farm-supply" || /\/supply\.php(?:$|#)/i.test(String(capture.url || "")));
    if (!isSupply || capture.schema !== "farmrpg-page-capture-v1" || !capture.visibleText
      || !shared || typeof shared.parseFarmSupplyOverview !== "function") return capture;
    const parsed = shared.parseFarmSupplyOverview(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    const evidence = (raw, confidence = "visible-label") => {
      if (raw === null || raw === undefined || raw === "") return null;
      const numeric = String(raw).replace(/,/g, "");
      return { value: /^\d+(?:\.\d+)?$/.test(numeric) ? Number(numeric) : raw, raw: String(raw), confidence };
    };
    capture.pageType = "farm-supply";
    capture.pageLabel = "Farm Supply";
    capture.fields ||= {};
    delete capture.fields.quests;
    capture.fields.capacity ||= {};
    capture.fields.balances ||= {};
    if (parsed.capacityMax) capture.fields.capacity.inventoryMaximum = evidence(parsed.capacityMax);
    if (parsed.staminaMax) capture.fields.balances.staminaMaximum = evidence(parsed.staminaMax);
    capture.fields.supplyStats = {};
    for (const key of Object.keys(parsed.supplyStats)) {
      const value = evidence(parsed.supplyStats[key]);
      if (value) capture.fields.supplyStats[key] = value;
    }
    capture.fields.infrastructure ||= {};
    for (const [building, values] of Object.entries(parsed.infrastructure)) {
      capture.fields.infrastructure[building] = {};
      for (const [key, raw] of Object.entries(values)) capture.fields.infrastructure[building][key] = evidence(raw);
    }
    // Repair captures made by the first Supply-aware collector, where four
    // capacity cards included their "Current ..." subtitle in the name.
    capture.fields.farmSupply = (capture.fields.farmSupply || []).map((entry) => {
      const match = String(entry.name || "").match(/^(\+\d+ (?:Inventory Cap|Max Stamina|Max Mailbox|Active Meal Effect))\b/i);
      return match ? { ...entry, name: match[1] } : entry;
    });
    return capture;
  }

  function enrichPetCapture(capture) {
    const isPets = capture && (capture.pageType === "pets" || /\/pets\.php(?:$|#)/i.test(String(capture.url || "")));
    if (!isPets || capture.schema !== "farmrpg-page-capture-v1") return capture;
    capture.pageType = "pets";
    capture.pageLabel = "Pets";
    capture.fields ||= {};
    const pets = capture.fields.pets || [];
    const canonicalSpecies = [
      "Cat", "Dog", "Squirrel", "Owl", "Boar", "Python", "Lemur", "Baboon", "Frog",
      "Hedgehog", "Fox", "Armadillo", "Tarantula", "Rock", "Parrot", "Penguin",
      "Green Dragon", "Red Dragon", "Blue Dragon", "Bear", "Capybara", "Onion", "Seal",
      "Skunk", "Polar Bear", "Hummingbird", "Tiger Shark",
    ];
    const wolfOnlyAvailable = /Available Pets[\s\S]*?\bWolf\b/i.test(String(capture.visibleText || ""));
    if (pets.length === canonicalSpecies.length && wolfOnlyAvailable && pets.every((pet) => !pet.species)) {
      capture.fields.pets = pets.map((pet, index) => ({ ...pet, species: canonicalSpecies[index] }));
    }
    return capture;
  }

  function enrichFriendshipCapture(capture) {
    const shared = window.ImporterShared;
    const isFriendship = capture && (capture.pageType === "friendships" || /\/npclevels\.php(?:$|#)/i.test(String(capture.url || "")));
    if (!isFriendship || capture.schema !== "farmrpg-page-capture-v1" || !shared
      || typeof shared.parseFriendshipPage !== "function") return capture;
    capture.pageType = "friendships";
    capture.pageLabel = "Friendship Levels";
    capture.fields ||= {};
    delete capture.fields.quests;
    const parsed = shared.parseFriendshipPage(String(capture.visibleText || "").split(/\n/).map((line) => line.trim()).filter(Boolean), String(capture.visibleText || ""));
    const evidence = (raw) => raw === null || raw === undefined ? null : ({
      value: Number(String(raw).replace(/,/g, "")), raw: String(raw), confidence: "visible-label",
    });
    capture.fields.friendships = parsed.friendships.map((entry) => ({
      name: entry.name,
      level: evidence(entry.level),
      nextRewardLevel: evidence(entry.nextRewardLevel),
      townsfolkOfDay: entry.townsfolkOfDay,
      confidence: entry.confidence,
    }));
    return capture;
  }

  function enrichKitchenCapture(capture) {
    const shared = window.ImporterShared;
    const isKitchen = capture && (capture.pageType === "kitchen" || /\/kitchen\.php(?:$|#)/i.test(String(capture.url || "")));
    if (!isKitchen || capture.schema !== "farmrpg-page-capture-v1" || !shared
      || typeof shared.parseKitchenPage !== "function") return capture;
    capture.pageType = "kitchen";
    capture.pageLabel = "My Kitchen";
    capture.fields ||= {};
    delete capture.fields.quests;
    const parsed = shared.parseKitchenPage(String(capture.visibleText || "").split(/\n/).map((line) => line.trim()).filter(Boolean), String(capture.visibleText || ""));
    const evidence = (raw) => raw === null || raw === undefined ? null : ({
      value: Number(String(raw).replace(/,/g, "")), raw: String(raw), confidence: "visible-label",
    });
    capture.fields.levels ||= {};
    if (parsed.cookingLevel) capture.fields.levels.cooking = evidence(parsed.cookingLevel);
    capture.fields.kitchenStats = {};
    for (const key of ["ovensOwned", "emptyOvens", "maximumOvensAvailable", "nextOvenCookingLevel", "fruitPunchLeft"]) {
      if (parsed[key]) capture.fields.kitchenStats[key] = evidence(parsed[key]);
    }
    return capture;
  }

  function enrichInventoryCapture(capture) {
    const shared = window.ImporterShared;
    if (!capture || capture.schema !== "farmrpg-page-capture-v1" || capture.pageType !== "inventory"
      || !capture.visibleText || !shared || typeof shared.parseInventoryPage !== "function") return capture;
    const parsed = shared.parseInventoryPage(capture.visibleText.split(/\n/).map((line) => line.trim()).filter(Boolean), capture.visibleText);
    const evidence = (raw, confidence) => {
      const plain = String(raw).replace(/,/g, "");
      const value = /^\d+$/.test(plain) ? Number(plain) : raw;
      return { value, raw: String(raw), confidence };
    };
    capture.fields ||= {};
    const standalone = (capture.fields.consumables || []).filter((entry) => entry.kind !== "meal");
    capture.fields.inventory = parsed.inventory.map((entry) => ({
      name: entry.name,
      quantity: evidence(entry.quantity, entry.confidence || "visible-label"),
      capacity: entry.atCapacity && parsed.capacityMax ? evidence(parsed.capacityMax, "visible-label") : null,
      locked: null,
      itemId: null,
      confidence: entry.confidence || "visible-label",
    }));
    capture.fields.consumables = standalone.concat(parsed.consumables.map((entry) => ({
      name: entry.name,
      quantity: evidence(entry.quantity, entry.confidence || "visible-label"),
      kind: "meal",
      confidence: entry.confidence || "visible-label",
    })));
    capture.fields.masteries = parsed.masteries.map((entry) => ({
      itemName: entry.itemName,
      masteryCount: null,
      masteryLevel: entry.status,
      grandMastery: /^Grand Mastered$/i.test(entry.status) ? true : null,
      megaMastery: /^Mega Mastered$/i.test(entry.status) ? true : null,
      towerRequirement: null,
      confidence: entry.confidence || "visible-label",
    }));
    capture.fields.capacity ||= {};
    if (parsed.capacityMax) capture.fields.capacity.inventoryMaximum = evidence(parsed.capacityMax, "visible-label");
    capture.fields.inventoryStats ||= {};
    if (parsed.inventoryStats.uniqueItems) capture.fields.inventoryStats.uniqueItems = evidence(parsed.inventoryStats.uniqueItems, "visible-label");
    if (parsed.inventoryStats.totalItems) capture.fields.inventoryStats.totalItems = evidence(parsed.inventoryStats.totalItems, "visible-label");
    return capture;
  }

  function enrichCapture(capture) {
    if (capture && capture.fields && capture.fields.towerProgress === null) delete capture.fields.towerProgress;
    return enrichKitchenCapture(enrichFriendshipCapture(enrichPetCapture(enrichFarmSupplyCapture(enrichPerkCapture(enrichQuestCapture(enrichMasteryCapture(enrichTowerCapture(enrichInventoryCapture(enrichProfileCapture(capture))))))))));
  }

  function renderAccount() {
    const snapshot = state.account;
    $("accountEmpty").classList.toggle("hidden", !!snapshot);
    $("accountResult").classList.toggle("hidden", !snapshot);
    if (!snapshot) return;
    const q = snapshot.quests || {};
    const questBuckets = ["available", "active", "ready", "completed", "locked"];
    const questCount = questBuckets.reduce((sum, key) => sum + ((q[key] || []).length), 0);
    const inventory = (snapshot.inventory || []).filter((row) => isRealItem(row.name || row.itemName));
    const masteries = (snapshot.masteries || []).filter((row) => isRealItem(row.itemName));
    const consumables = Object.entries(snapshot.consumables || {}).filter(([name]) => isRealItem(name)).sort((a, b) => a[0].localeCompare(b[0]));
    const activeEffects = (snapshot.activeEffects || []).filter((row) => isRealItem(row.name));
    const perks = snapshot.perks || [];
    const supply = snapshot.farmSupply || [];
    const pets = snapshot.pets || [];
    const friendships = snapshot.friendships || [];
    const kitchen = snapshot.kitchenStats || {};
    $("accountSummary").innerHTML = [
      ["Player", snapshot.player && snapshot.player.name || "Unknown", "from your import"],
      ["Tower", accountScalar(snapshot.levels.tower), "current floor"],
      ["Inventory", fmt(snapshot.inventoryStats && snapshot.inventoryStats.uniqueItems || inventory.length), snapshot.inventoryStats && snapshot.inventoryStats.totalItems ? `${fmt(snapshot.inventoryStats.totalItems)} total held` : "items captured"],
      ["Quests", fmt(questCount), "statuses captured"],
      ["Masteries", fmt(masteries.length), "items captured"],
      ["Active now", fmt(activeEffects.length), "at capture time"],
      ["Perks", fmt(perks.filter((perk) => perk.owned === true).length), fmt(perks.filter((perk) => perk.owned === null || perk.owned === undefined).length) + " ownership states unknown"],
      ["Farm Supply", fmt(supply.filter((perk) => perk.owned === true).length), fmt(supply.filter((perk) => perk.owned === null || perk.owned === undefined).length) + " ownership states unknown"],
      ["Pets", fmt(pets.length), fmt(pets.filter((pet) => pet.species && pet.level !== null && pet.level !== undefined).length) + " identified with levels"],
      ["Friendships", fmt(friendships.length), "townsfolk levels captured"],
      ["Kitchen", kitchen.ovensOwned == null ? "Unknown" : fmt(kitchen.ovensOwned) + " ovens", kitchen.fruitPunchLeft == null ? "Fruit Punch unknown" : fmt(kitchen.fruitPunchLeft) + " Fruit Punch left"],
      ["Not captured", fmt((snapshot.unknownFields || []).length), "details the import could not find"],
    ].map(([label, value, note]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join("");
    const questStats = snapshot.questStats || {};
    $("accountQuests").innerHTML = `<div class="account-kv">${questBuckets.map((key) => `<div><span>${esc(key)}</span><b>${fmt((q[key] || []).length)}</b></div>`).join("")}${questStats.requestsCompleted != null ? `<div><span>Lifetime completed</span><b>${fmt(Number(questStats.requestsCompleted))}</b></div>` : ""}${questStats.personalCompleted != null ? `<div><span>Personal completed</span><b>${fmt(Number(questStats.personalCompleted))}</b></div>` : ""}${questStats.completedListed != null ? `<div><span>Diary titles captured</span><b>${fmt(Number(questStats.completedCaptured || 0))} / ${fmt(Number(questStats.completedListed))}${questStats.completedHistoryTruncated ? " · partial" : ""}</b></div>` : ""}</div>${["active", "ready", "available"].map((key) => {
      const rows = (q[key] || []).slice(0, 8);
      return rows.length ? `<div class="account-list"><strong>${esc(key)}</strong>${rows.map((quest) => {
        const detail = [quest.giver, quest.progressPercent != null ? fmt(Number(quest.progressPercent)) + "%" : null, quest.availability].filter(Boolean).join(" · ");
        return `<span>${esc(quest.title || "Untitled quest")}${detail ? ` <small>${esc(detail)}</small>` : ""}</span>`;
      }).join("")}</div>` : "";
    }).join("")}`;
    const unfinished = masteries.filter((entry) => entry.megaMastery !== true).slice(0, 16);
    const masteryStats = snapshot.masteryStats || {};
    $("accountMasteries").innerHTML = `<div class="account-kv"><div><span>Mastered</span><b>${fmt(Number(masteryStats.mastered ?? masteries.filter((m2) => m2.mastered === true).length))}</b></div><div><span>Grand mastered</span><b>${fmt(Number(masteryStats.grandMastered ?? masteries.filter((m2) => m2.grandMastery === true).length))}</b></div><div><span>Mega mastered</span><b>${fmt(Number(masteryStats.megaMastered ?? masteries.filter((m2) => m2.megaMastery === true).length))}</b></div></div><div class="account-list"><strong>Closest to next tier</strong>${unfinished.length ? unfinished.map((entry) => {
      const item = itemByName(entry.itemName);
      const target = entry.progressTarget != null ? ` / ${fmt(Number(entry.progressTarget))}` : "";
      return `<span class="account-item">${itemImg(item, "drop-art", entry.itemName)}<span>${esc(entry.itemName)}${entry.masteryCount != null ? ` · ${fmt(Number(entry.masteryCount))}${target}` : ""}</span></span>`;
    }).join("") : "<span>No unfinished mastery entries were captured.</span>"}</div>`;
    const tower = snapshot.towerProgress || {};
    const nextRewards = tower.nextRewards || [];
    $("accountTower").innerHTML = tower.currentLevel != null ? `<div class="account-kv">
      <div><span>Current level</span><b>${fmt(Number(tower.currentLevel))}</b></div>
      <div><span>Ascension Knowledge</span><b>${fmt(Number(tower.ascensionKnowledge || 0))}</b></div>
      <div><span>Daily silver</span><b>${fmt(Number(tower.dailySilver || 0))}</b></div>
      <div><span>Next level</span><b>${fmt(Number(tower.nextLevel || 0))}</b></div>
      <div><span>Next AK cost</span><b>${fmt(Number(tower.nextAkCost || 0))}</b></div>
      <div><span>Next silver cost</span><b>${fmt(Number(tower.nextSilverCost || 0))}</b></div>
    </div><div class="account-list"><strong>Next rewards</strong>${nextRewards.map((reward) => {
      const item = itemByName(reward.name);
      return `<span class="account-item">${itemImg(item, "drop-art", reward.name)}<span>${fmt(Number(reward.quantity))} ${esc(reward.name)}</span></span>`;
    }).join("") || "<span>No visible next-floor rewards.</span>"}</div>` : "<p>Tower details have not been captured yet.</p>";
    const warnings = [...(snapshot.warnings || []), ...(snapshot.unknownFields || []).map((field) => "Missing: " + field)];
    $("accountWarnings").innerHTML = warnings.length ? warnings.slice(0, 30).map((warning) => `<p>${esc(warning)}</p>`).join("") : "<p>Nothing looked wrong in what you imported.</p>";
    $("accountConsumables").innerHTML = (consumables.length || activeEffects.length) ? consumables.slice(0, 10).map(([name, entry]) => {
        const item = itemByName(name);
        return `<span>${itemImg(item, "drop-art", name)}<b>${fmt(Number(entry.quantity || 0))}</b><small>${esc(name)}</small></span>`;
      }).join("") + activeEffects.map((effect) => {
        const item = itemByName(effect.name);
        const detail = effect.uses != null ? `${fmt(Number(effect.uses))} uses` : effect.remaining || "active";
        return `<span>${itemImg(item, "drop-art", effect.name)}<b>${esc(detail)}</b><small>${esc(effect.name)} · at capture</small></span>`;
      }).join("") : "";
  }


  const PUMPKIN_JUICE_MMS = new Set(["Pitchfork", "Salt", "Fancy Pan Flute", "Wrench", "Red Trunk", "Water Lily", "Wizard Hat", "Jade Charm", "Fancy Guitar"]);

  // The imported mastery file is the base, because it is complete. A capture
  // taken AFTER it should still update the items it covers — treating the file
  // as absolute meant re-capturing masteries could never change anything, and
  // it silently did nothing. An older capture is ignored, so a stale one can
  // never walk the numbers backwards.
  function masteryRowsToApply() {
    const rows = (state.account && state.account.masteries) || [];
    if (!rows.length) return [];
    if (!PERSONAL.authoritativeMasteries) return rows;
    const fileAt = Date.parse(PERSONAL.capturedAt || "");
    const captureAt = Date.parse((state.account && (state.account.generatedAt || state.account.syncedAt)) || "");
    if (!Number.isFinite(fileAt) || !Number.isFinite(captureAt)) return [];
    return captureAt > fileAt ? rows : [];
  }

  function towerMasteryMap() {
    const values = new Map(Object.entries(PERSONAL.masteries || {}).map(([name, value]) => [name.toLowerCase(), Number(value) || 0]));
    for (const row of masteryRowsToApply()) {
      const name = String(row.itemName || "").trim();
      if (!name) continue;
      let value = Number(row.masteryCount ?? row.progressCurrent);
      if (row.megaMastery === true || /mega mastered/i.test(String(row.masteryLevel || ""))) value = 1000000;
      else if (!Number.isFinite(value) && (row.grandMastery === true || /grand mastered/i.test(String(row.masteryLevel || "")))) value = 100000;
      else if (!Number.isFinite(value) && /mastered/i.test(String(row.masteryLevel || ""))) value = 10000;
      if (Number.isFinite(value)) values.set(name.toLowerCase(), Math.min(1000000, Math.max(0, value)));
    }
    return values;
  }

  const MM_GOAL = 1000000;
  const GM_GOAL = 100000;

  // Every floor's requirement, in one list. Floors the Tower MM wiki covers
  // (T300–T340) come from it, because it is the only source that says which
  // masteries a floor wants at GRAND level rather than Mega — scoring those
  // against 1m overstates what is actually left. Earlier floors keep the
  // planner's own named Mega Mastery goals.
  function towerRequirements() {
    const progress = towerMasteryMap();
    const wikiFloors = new Set((TOWER_FLOORS.floors || []).map((row) => row.floor));
    const rows = [];
    const push = (name, floor, tier, img, methods) => {
      const goal = tier === "gm" ? GM_GOAL : MM_GOAL;
      const current = progress.get(String(name).toLowerCase()) || 0;
      rows.push({
        name, floor, tier, goal, current,
        remaining: Math.max(0, goal - current),
        complete: current >= goal,
        methods: methods || [],
        img: img || null,
      });
    };
    for (const [name, row] of Object.entries(P.items || {})) {
      if (!row.mastery || row.mastery.towerRequirement == null) continue;
      const floor = Number(row.mastery.towerRequirement);
      if (!Number.isFinite(floor) || wikiFloors.has(floor)) continue;
      push(name, floor, "mm", null, row.mastery.methods);
    }
    for (const floorRow of TOWER_FLOORS.floors || []) {
      const known = (name) => (P.items || {})[name];
      for (const entry of floorRow.gms || []) {
        const item = known(entry.name);
        push(entry.name, floorRow.floor, "gm", entry.img, item && item.mastery && item.mastery.methods);
      }
      for (const entry of floorRow.mms || []) {
        const item = known(entry.name);
        push(entry.name, floorRow.floor, "mm", entry.img, item && item.mastery && item.mastery.methods);
      }
    }
    return rows.sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name));
  }

  function renderTower() {
    const start = Math.max(1, Math.min(340, Number(state.towerStart) || 277));
    const goal = 340;
    // Published so the gather lists can point out the items that serve a Tower
    // mastery as well as the questline being tracked. Rebuilt on every Tower
    // render, which is also when the mastery numbers can have changed.
    window.FRPG_TOWER_NEEDS = towerRequirements();
    const rows = window.FRPG_TOWER_NEEDS.filter((row) => row.floor >= start && row.floor <= goal);
    const floors = new Map();
    for (const row of rows) {
      if (!floors.has(row.floor)) floors.set(row.floor, []);
      floors.get(row.floor).push(row);
    }
    const unfinished = rows.filter((row) => !row.complete);
    const blocked = [...floors].filter(([, items]) => items.some((row) => !row.complete));
    const nextFloor = blocked[0] ? blocked[0][0] : goal;
    const remaining = unfinished.reduce((sum, row) => sum + row.remaining, 0);
    $("towerStart").value = String(start);
    $("towerShowDone").checked = state.towerShowDone;
    $("towerNextFloor").textContent = `T${nextFloor}`;
    const captureDate = PERSONAL.authoritativeMasteries ? PERSONAL.capturedAt : state.extensionConnectedAt || state.account && state.account.generatedAt || PERSONAL.capturedAt;
    $("towerCaptureAge").textContent = captureDate
      ? `Last updated ${new Date(captureDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`
      : "No saved progress yet";
    // The named-mastery list only reaches as far as the data does — don't
    // claim a floor range the rows can't back up.
    const namedTop = rows.length ? rows[rows.length - 1].floor : start;
    $("towerSummary").innerHTML = [
      ["Masteries still to finish", `${unfinished.length} / ${rows.length}`, `requirements up to T${namedTop}`],
      ["Floors still blocked", String(blocked.length), `of ${floors.size} in this range`],
      ["Still to make or catch", fmt(remaining), "items across every unfinished mastery"],
      ["Already done", String(rows.length - unfinished.length), `${rows.filter((r) => r.tier === "gm").length} of these only need a Grand Mastery`],
    ].map(([label, value, note]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join("");
    const visibleFloors = [...floors].filter(([, items]) => state.towerShowDone || items.some((row) => !row.complete));
    $("towerRail").innerHTML = visibleFloors.length ? visibleFloors.map(([floor, items]) => {
      const complete = items.every((row) => row.complete);
      const isNext = floor === nextFloor;
      return `<article class="tower-floor ${complete ? "is-done" : "is-work"} ${isNext ? "is-next" : ""}"><div class="tower-floor-mark"><span>Floor</span><strong>T${floor}</strong><small>${complete ? "Gate cleared" : `${items.filter((row) => !row.complete).length} left`}</small></div><div class="tower-floor-items">${items.map((row) => {
        const item = itemByName(row.name);
        const percent = Math.min(100, (row.current / row.goal) * 100);
        const tierLabel = row.tier === "gm" ? "Grand Mastery" : "Mega Mastery";
        const method = [row.methods.join(" / "), tierLabel].filter(Boolean).join(" · ");
        const goalLabel = row.tier === "gm" ? "100k" : "1m";
        // Pumpkin Juice only shortens a Mega Mastery.
        const pjGap = row.tier === "mm" && PUMPKIN_JUICE_MMS.has(row.name) && !row.complete ? Math.max(0, 909091 - row.current) : null;
        // Only offer the "open in the planner" click when the planner actually
        // knows the item. Otherwise it looked like a button and did nothing.
        const plannable = !!item;
        const openAttrs = row.complete || !plannable ? "" : ` data-open-item="${esc(row.name)}" data-open-qty="${row.remaining}" tabindex="0" role="button" title="Open ${esc(row.name)} in the calculator"`;
        const noPlan = row.complete || plannable ? "" : `<small class="tower-noplan">No route data for this one yet</small>`;
        const art = itemImg(item, "tower-art", row.name, row.img);
        return `<div class="tower-mm ${row.complete ? "complete" : "working"}${plannable || row.complete ? "" : " no-plan"}"${openAttrs}>${art}<div class="tower-mm-main"><div class="tower-mm-title"><strong>${esc(row.name)}</strong><span>${esc(method)}</span></div><div class="tower-progress"><i style="width:${percent}%"></i></div><div class="tower-mm-numbers"><b>${fmt(row.current)} / ${goalLabel}</b><span>${row.complete ? `${row.tier === "gm" ? "GM" : "MM"} complete` : `${fmt(row.remaining)} left`}</span></div>${pjGap !== null ? `<small class="tower-pj">Drinking Pumpkin Juice? You only need ${fmt(pjGap)} more — it finishes at 909.09k</small>` : ""}${noPlan}</div></div>`;
      }).join("")}</div></article>`;
    }).join("") : `<div class="tower-all-clear"><strong>Everything in this range is complete.</strong><span>Turn on “Show completed floors” to review the cleared requirements.</span></div>`;

    const connected = !!state.extensionConnectedAt;
    const sync = $("towerSyncState");
    sync.classList.toggle("connected", connected);
    sync.innerHTML = `<span></span><strong>${connected ? "Updating automatically" : "Using your saved progress"}</strong><small>${connected ? `Refreshed ${new Date(state.extensionConnectedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Numbers change only when you import again"}</small>`;
    const accountSync = $("extensionStatus");
    if (accountSync) {
      accountSync.classList.toggle("connected", connected);
      accountSync.innerHTML = `<span></span><strong>${connected ? "Extension connected" : "Waiting for extension"}</strong><small>${connected ? "New Farm RPG pages refresh this account automatically." : "Load the extension once, then browse Farm RPG normally."}</small>`;
    }
  }

  function openTowerItem(target) {
    const button = target.closest("[data-open-item]");
    if (!button) return;
    window.FRPG_openItem && window.FRPG_openItem(button.dataset.openItem, button.dataset.openQty);
  }
  $("towerRail").addEventListener("click", (event) => openTowerItem(event.target));
  $("towerRail").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTowerItem(event.target); } });

  function applyAccountSnapshot() {
    if (!state.account) return;
    let inventoryApplied = 0;
    for (const entry of state.account.inventory || []) {
      if (!isRealItem(entry.name)) continue;
      const id = index.idByName.get(String(entry.name || "").trim().toLowerCase());
      const quantity = Number(entry.quantity);
      if (id && Number.isFinite(quantity) && quantity >= 0) {
        state.owned[id] = quantity;
        inventoryApplied += 1;
      }
    }
    const confirmed = [...(state.account.perks || []), ...(state.account.farmSupply || []), ...(state.account.artifacts || [])]
      .filter((entry) => entry.owned === true).map((entry) => String(entry.name || "").trim().toLowerCase());
    let effectsApplied = 0;
    for (const effect of BASE_EFFECTS) {
      if (confirmed.includes(String(effect.name || "").trim().toLowerCase())) {
        state.enabled.add(effect.id);
        effectsApplied += 1;
      }
    }
    if (state.account.infrastructure && state.account.infrastructure.ironDepot === true && !state.enabled.has("iron_depot")) {
      state.enabled.add("iron_depot");
      effectsApplied += 1;
    }
    save();
    renderSetup();
    render();
    $("accountWarnings").insertAdjacentHTML("afterbegin", `<p class="apply-success">Applied ${fmt(inventoryApplied)} exact inventory values and ${fmt(effectsApplied)} explicitly confirmed bonuses.</p>`);
  }

  $("maxProfile").onclick = () => { state.enabled = new Set(allEffectIds); save(); renderSetup(); render(); };
  $("zeroProfile").onclick = () => { state.enabled.clear(); save(); renderSetup(); render(); };
  if ($("resetAssumptions")) $("resetAssumptions").onclick = () => { state.overrides = {}; save(); renderSetup(); render(); };
  $("includeEvents").onchange = (event) => { state.includeEvents = event.target.checked; save(); render(); };
  if ($("drinkPath")) $("drinkPath").onchange = (event) => { state.drinkPath = event.target.value; save(); render(); };
  if ($("staminaMeasured")) $("staminaMeasured").oninput = (event) => {
    const percent = Number(event.target.value);
    if (event.target.value === "" || !Number.isFinite(percent) || percent <= 0) delete state.overrides.explore_stamina_measured;
    else state.overrides.explore_stamina_measured = Math.min(100, percent) / 100;
    save(); render();
  };
  $("accountFile").onchange = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    try {
      const parsedFiles = await Promise.all(files.map(async (file) => ({ file, parsed: enrichCapture(JSON.parse(await file.text())) })));
      if (parsedFiles.length === 1 && validAccountSnapshot(parsedFiles[0].parsed)) {
        state.account = parsedFiles[0].parsed;
      } else {
        const shared = window.ImporterShared;
        if (!shared || typeof shared.validateCapture !== "function" || typeof shared.mergeCaptures !== "function") {
          throw new Error("The local capture merger did not load.");
        }
        const captures = [];
        const failures = [];
        for (const row of parsedFiles) {
          const checked = shared.validateCapture(row.parsed, row.file.size);
          if (!checked.ok) failures.push(row.file.name + ": " + checked.errors.join(" "));
          else {
            checked.capture._fileName = row.file.name;
            captures.push(checked.capture);
          }
        }
        if (!captures.length) throw new Error(failures.join(" ") || "No valid page captures were selected.");
        state.account = shared.mergeCaptures(captures);
        state.account.legacyV1 = shared.buildLegacyV1(state.account);
        if (failures.length) state.account.warnings.unshift(...failures);
      }
      save();
      renderAccount();
    } catch (error) {
      state.account = null;
      save();
      renderAccount();
      $("accountEmpty").innerHTML = `<strong>Could not load that file.</strong><span>${esc(error.message || error)}</span>`;
    }
    event.target.value = "";
  };
  $("clearAccount").onclick = () => { state.account = null; save(); renderAccount(); };
  $("applyAccount").onclick = applyAccountSnapshot;
  $("towerStart").onchange = (event) => { state.towerStart = Number(event.target.value) || 277; save(); renderTower(); };
  $("towerShowDone").onchange = (event) => { state.towerShowDone = event.target.checked; save(); renderTower(); };

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window || !message || message.source !== "farmrpg-account-sync" || message.type !== "snapshot") return;
    if (!validAccountSnapshot(message.snapshot)) return;
    state.account = message.snapshot;
    state.extensionConnectedAt = message.syncedAt || new Date().toISOString();
    save();
    renderAccount();
    renderTower();
  });
  window.postMessage({ source: "farmrpg-calculator", type: "request-snapshot" }, "*");
  $("exportPlan").onclick = () => {
    if (!state.lastPlan) { showTab("planner"); el.error.textContent = "Choose an item before exporting a plan."; el.error.classList.remove("hidden"); return; }
    const blob = new Blob([JSON.stringify(state.lastPlan, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `farmrpg-${state.lastPlan.goal.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-plan.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const itemCount = D.items.items.filter((item) => item.active).length;
  const recipeCount = D.recipes.craft.length + D.recipes.cook.length;
  const locCount = D.sources.locations.length;
  const marketCount = Object.keys(D.market.items || {}).length;
  const progressionCount = Object.keys(P.items || {}).length;
  const strategyRuleCount = Object.keys(P.routeRules || {}).length;
  // Was a row of build counters (recipe rows, progression profiles, source
  // parse status). Players don't need the shape of the database — they need to
  // know how much of the game is covered.
  if ($("dataSummary")) $("dataSummary").innerHTML = [["Items", itemCount], ["Recipes", recipeCount], ["Places to gather", locCount], ["Items with a trade price", marketCount]].map(([label, value]) => `<div class="data-card"><span>${label}</span><strong>${fmt(value)}</strong></div>`).join("");
  // A visible build stamp. Half the "it still does the old thing" reports are a
// browser holding an old copy of a file, and this is the only way to tell.
if ($("footer")) $("footer").innerHTML = "Lantern Ledger is a fan-made Farm RPG planner. Your account data stays in this browser. <span class=\"build-stamp\">Build " + FRPG_BUILD + "</span>";

  function renderLibrary() {
    if (!$('strategyRules') || !$('mechanicsIndex')) return;
    // This used to print build diagnostics — database integrity, unresolved
    // names, "21 parsed · 24 incomplete". None of that is a player's problem.
    // What is worth saying plainly: not every part of the game is covered.
    const status = $("knowledgeStatus");
    if (status) status.innerHTML = `<p>Not everything in Farm RPG is in here yet. Where a drop rate or a price has never been measured, the planner says so rather than guessing — the notes below say so and ask for your own numbers instead.</p>`;

    $("strategyRules").innerHTML = K.rules.length ? K.rules.map((rule) => `<article><div><span>${esc(rule.topic || "strategy")}</span>${rule.needsVerification ? `<b>Needs your own numbers</b>` : `<b class="supported">Confirmed</b>`}</div><p>${esc(rule.rule)}</p></article>`).join("") : `<div class="empty-samples">No route rules yet.</div>`;

    const mealByName = new Map(K.meals.map((meal) => [meal.name.toLowerCase(), meal]));
    $("mechanicsIndex").innerHTML = MEALS.map((meal) => {
      const known = mealByName.get(meal.name.toLowerCase());
      return `<article><div>${itemImg(itemByName(meal.name), "table-art", meal.name, meal.img)}<span><strong>${esc(meal.name)}</strong><small>${esc(meal.area)}</small></span></div><p>${esc((known && known.effect) || meal.effect)}</p><b>${esc(meal.calc)}</b></article>`;
    }).join("");
  }

  renderSetup();
  renderLibrary();
  renderTower();
  const last = Number(localStorage.getItem("frpg_last"));
  if (last && index.itemsById.has(last)) pick(last);
  else {
    const redTrunk = index.idByName.get("red trunk");
    if (redTrunk) pick(redTrunk);
  }
  renderHome();
  const viewFromHash = () => {
    const id = location.hash.replace(/^#/, "");
    return document.getElementById(id)?.classList.contains("view") ? id : "home";
  };
  // gather-model.js loads after this file, so the first render of the home
  // page cannot see it. Redraw once everything is in, and whenever what is
  // being tracked changes.
  window.addEventListener("load", renderStanding);
  window.addEventListener("frpg:tracked-line", renderStanding);
  window.addEventListener("popstate", () => showTab(viewFromHash(), true));
  window.addEventListener("hashchange", () => showTab(viewFromHash(), true));
  // The Tower tab may never be opened, but the gather lists still want to know
  // which items double as Tower masteries.
  try { window.FRPG_TOWER_NEEDS = towerRequirements(); } catch (_) { /* data not ready */ }
  showTab(viewFromHash(), true);
})();



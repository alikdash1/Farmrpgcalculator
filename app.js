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
  const itemByName = (name) => index.itemsById.get(index.idByName.get(name.toLowerCase()));
  const imageUrl = (item) => item && item.img ? "https://farmrpg.com" + item.img : "";
  const itemImg = (item, cls) => item && item.img
    ? `<span class="item-art ${cls || ""}"><img loading="lazy" width="48" height="48" referrerpolicy="no-referrer" src="${esc(imageUrl(item))}" alt=""></span>`
    : `<span class="item-art missing-art ${cls || ""}">?</span>`;
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
    { id: "mushroom", name: "Mushroom Stew", area: "Mastery only", effect: "+10% Mastery for 5 minutes", calc: "Shown for planning, but does not change material quantities." },
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
    return base;
  }
  function save() {
    localStorage.setItem("frpg_owned", JSON.stringify(state.owned));
    localStorage.setItem("frpg_effects_v2", JSON.stringify([...state.enabled]));
    localStorage.setItem("frpg_assumptions", JSON.stringify(state.overrides));
    localStorage.setItem("frpg_infra_v2", JSON.stringify(state.infra));
    localStorage.setItem("frpg_meals_v2", JSON.stringify(state.meals));
    localStorage.setItem("frpg_sources_v2", JSON.stringify(state.sourceChoices));
    localStorage.setItem("frpg_farm_locations_v1", JSON.stringify(state.farmLocations));
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

  function showTab(id) {
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
    if (history && history.replaceState) history.replaceState(null, "", "#" + id);
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
  // item directly in the Craft planner without duplicating item lookup/route
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
    $("homeRules").innerHTML = rules.length ? rules.map((rule) => `<div><span>${rule.needsVerification ? "From player reports" : "Confirmed"}</span><p>${esc(rule.rule)}</p></div>`).join("") : `<p class="empty-samples">Strategy export is unavailable. Rebuild data/knowledge.js.</p>`;
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
      const bulk = test.method === "ap" && state.meals.lemoncream ? 5
        : test.method === "cider" && state.meals.cabbage ? 5 : 1;
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
        actions, pies, goldEq: incrementalGoldEq, fullRouteGoldEq, extra, overlay: true,
        confidence: { label: "Your measured sample", level: 3 }, progressionScore: 20,
        reason: "Run Acorn Pie during exploration you already need; charge Hide only for the pies, not for the underlying AP/Cider twice.",
        detail: `Piggyback ${fmt(actions)} actions · ${fmt(pies)} Acorn Pies${incrementalGoldEq != null ? ` ≈ ${fmt(incrementalGoldEq)}g incremental` : ""}`,
      });
    }
    return plans.filter((plan) => plan.goldEq != null).sort((a, b) => a.goldEq - b.goldEq)[0] || plans[0] || null;
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
    return ({ trade: "Buy/trade", farm: "Farm directly", craft: "Craft it", building: "Passive supply" })[value] || value;
  }

  function winnerSentence(decision) {
    const cash = decisionLabel(decision.cashWinner);
    const progression = decisionLabel(decision.progressionWinner);
    if (decision.cashWinner === decision.progressionWinner) return `<b>Recommended:</b> ${esc(cash)}`;
    return `<b>Cheapest:</b> ${esc(cash)} <b>With progression:</b> ${esc(progression)}`;
  }

  function farmPlan(item, need, m, consts) {
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
      const apUses = drop.explores / (m.drinks.apItems * qc);
      const ciderUnit = goldEach("Apple Cider");
      const apUnit = goldEach("Arnold Palmer");
      const ojUnit = E.currencyGoldEach(index, "oj");
      const ciderGold = ciderUnit == null || ojUnit == null ? null : ciderUses * ciderUnit + oj * ojUnit;
      const apGold = apUnit == null ? null : apUses * apUnit;
      const cheaperIsAp = apGold != null && (ciderGold == null || apGold < ciderGold);
      const useAp = state.drinkPath === "ap" ? apGold != null
        : state.drinkPath === "cider" ? false
        : cheaperIsAp;
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
      const largeNets = fish.catches / (m.nets.lnCatch * mealBoost);
      const lnUnit = goldEach("Large Net");
      return {
        type: "fish",
        location: fish.location,
        catches: fish.catches,
        largeNets,
        goldEq: lnUnit == null ? null : largeNets * lnUnit,
        confidence: E.sourceConfidence(fish.src),
        progressionScore: itemFact(item.name).relevance || 0,
        detail: `${esc(fish.location)} · ${fmt(largeNets)} Large Nets`,
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
    if (choice === "trade" && trade) return { type: "trade", label: "Buy in trade", detail: quoteText(trade), quote: trade, goldEq: trade.best.goldEq };
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
    if (trade && farm && trade.best.goldEq != null && farm.goldEq != null && trade.best.goldEq <= farm.goldEq * 1.05) {
      return { type: "trade", label: "Buy in trade", detail: quoteText(trade) + " · cheaper than consumables", quote: trade, goldEq: trade.best.goldEq };
    }
    if (farm) return Object.assign({ label: farm.type === "fish" ? "Fish" : farm.type === "crop" ? "Grow" : farm.type === "acorn" ? "Acorn test" : "Explore" }, farm);
    if (vendor) return vendor;
    if (trade) return { type: "trade", label: "Buy in trade", detail: quoteText(trade), quote: trade, goldEq: trade.best.goldEq };
    return { type: "unknown", label: "Review manually", detail: "No trusted acquisition route in the snapshot" };
  }

  function routeOptions(item, route, m) {
    const source = E.sourcesFor(index, item.id, 1, m, constants());
    const options = [["auto", "Auto"]];
    if (farmPlan(item, 1, m, constants())) options.push(["farm", "Farm"]);
    if (E.marketQuote(index, item.id, 1)) options.push(["trade", "Trade"]);
    if (source.vendor) options.push(["vendor", "Store"]);
    if (infraFor(item, 1, m)) options.push(["covered", "Covered"]);
    const selected = state.sourceChoices[item.id] || "auto";
    return `<select class="route-select" data-source-id="${item.id}" aria-label="Acquisition route for ${esc(item.name)}">${options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}</select><span class="route-choice ${route.type}">${esc(route.label)}</span>`;
  }

  function routeEvidence(item, route) {
    const fact = itemFact(item.name);
    const lines = [];
    if (route.reason) lines.push(`<span>${esc(route.reason)}</span>`);
    if (route.coDrops && route.coDrops.length) lines.push(`<span><b>Expected drops from this run</b></span><span class="drop-chips">${route.coDrops.map((drop) => {
      const dropItem = itemByName(drop.name);
      const exactRate = ((EXACT_AP_RATES[route.location] || {})[drop.name]) || null;
      const rate = exactRate ? `${Number(exactRate.value).toFixed(2)} ${exactRate.unit}` : "";
      return `<span class="drop-chip">${itemImg(dropItem, "drop-art")}<span><b>${fmt(drop.expected)}</b><small>${esc(drop.name)}</small>${rate ? `<small>${rate}</small>` : ""}</span></span>`;
    }).join("")}</span>`);
    if (route.location && EVENT_LOCATIONS.has(route.location)) lines.push(`<span class="event-warning"><b>Seasonal:</b> ${esc(route.location)} is only included because event locations are enabled.</span>`);
    if (fact.hoard) {
      const tower = fact.mastery && fact.mastery.towerRequirement ? ` · Tower MM ${fmt(fact.mastery.towerRequirement)}` : "";
      lines.push(`<span class="hoard-note"><b>Save for later:</b> quests in the guide ask for ${fmt(fact.questTotal)} total across ${fmt(fact.questSteps)} steps${tower}. Your remaining amount may be lower.</span>`);
    }
    const summary = route.coDrops && route.coDrops.length ? `See ${route.coDrops.length} useful drops & future uses` : "Why this route";
    return lines.length ? `<details class="route-evidence"><summary>${summary}</summary><small class="route-evidence-body">${lines.join("")}</small></details>` : "";
  }
  function treeHtml(node) {
    const item = index.itemsById.get(node.id);
    if (node.cyclic) return `<div class="leaf cyclic">↻ ${esc(node.name)} — circular recipe</div>`;
    if (!node.children.length) return `<div class="leaf">${itemImg(item, "tree-art")}<span class="node-amt">×${fmt(node.qtyOut)}</span>${esc(node.name)}${node.stopped ? '<span class="node-kind">direct acquisition stop</span>' : ""}</div>`;
    return `<details ${state.treeOpen ? "open" : ""}><summary>${itemImg(item, "tree-art")}<span class="node-amt">×${fmt(node.qtyOut)}</span>${esc(node.name)}<span class="node-kind">${node.kind} ×${fmt(node.craftsNeeded)}</span></summary>${node.children.map(treeHtml).join("")}</details>`;
  }
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

    const allNodes = [...E.collectNodes(fullTree).values()].filter((node) => node.children && node.children.length);
    const decisions = [];
    const stopIds = new Set();
    state.decisionActions = new Map();
    for (const node of allNodes) {
      const item = index.itemsById.get(node.id);
      if (!item) continue;
      const direct = E.marketQuote(index, node.id, node.qtyOut);
      const infra = infraFor(item, node.qtyOut, m);
      const farm = farmPlan(item, node.qtyOut, m, consts);
      if (!direct && !infra && !farm) continue;
      const decision = makeDecision(node, m, consts);
      decisions.push({ node, item, ...decision });
      state.decisionActions.set(node.id, decision.action);
      if (["trade", "building", "farm"].includes(decision.action)) stopIds.add(node.id);
    }
    const tree = E.resolveTree(index, state.itemId, state.qty, m, 0, [], consts, stopIds);
    const activeNodeIds = new Set(E.collectNodes(tree).keys());
    const activeDecisions = decisions.filter((decision) => activeNodeIds.has(decision.node.id));
    const leaves = E.flattenLeaves(tree);
    const rows = [...leaves.values()].filter((leaf) => leaf.id != null).map((leaf) => {
      const item = index.itemsById.get(leaf.id);
      const owned = Number(state.owned[leaf.id] || 0);
      const missing = Math.max(0, leaf.total - owned);
      return { leaf, item, owned, missing, route: sourceRoute(item, missing, m, consts) };
    }).sort((a, b) => b.missing - a.missing);

    let craftSilver = E.treeCraftSilver(tree, m);
    let vendorSilver = 0, tradeGoldEq = 0, farmGoldEq = 0, rawSellValue = 0;
    let explores = 0, stamina = 0, ciders = 0, aps = 0, oj = 0, largeNets = 0, plants = 0, passiveHours = 0;
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
    $("goalHeader").innerHTML = `<div class="goal-identity">${itemImg(goal, "goal-art")}<div class="goal-title"><span class="eyebrow">Active goal</span><h2>${esc(goal.name)} × ${fmt(state.qty)}</h2><p>${rows.length} ingredients · ${coveredRows.length} already covered by your farm · ${activeDecisions.filter((d) => ["trade", "farm", "building"].includes(d.action)).length} bought or farmed instead of crafted</p></div></div><div class="goal-yield"><strong>${fmt(m.craftYield)}× yield</strong><span>${fmt(m.saleMult)}× sale value</span></div>`;
    $("resourceTrail").innerHTML = [
      trail("Goal", fmt(state.qty), goal.name),
      trail("Trade value", fmt(tradeGoldEq) + " gold", "comparison value", "violet"),
      trail("Cider / AP", `${fmt(ciders)} / ${fmt(aps)}`, "chosen explore routes"),
      trail("Covered", fmt(coveredRows.length), passiveHours ? `${fmt(passiveHours)}h longest wait` : "farm / depot"),
    ].join("");
    $("includeEvents").checked = state.includeEvents;
    $("drinkPath").value = state.drinkPath;
    const acornNotice = $("acornNotice");
    if (state.meals.acorn && !state.acornTests.length) {
      acornNotice.innerHTML = 'Acorn Pie is on, but it cannot change these numbers yet. It needs at least one of your own measured samples \u2014 how many Hide you got from how many uses \u2014 because the rate differs by location and method. <button class="text-action" data-open-view="fieldlab">Add a sample</button>';
      acornNotice.hidden = false;
    } else {
      acornNotice.hidden = true;
    }

    const bestText = Object.entries(chosenCounts).sort((a, b) => b[1] - a[1])[0];
    $("bestRoute").innerHTML = `<span class="route-label">Best fit</span><h3>Use a mixed route</h3><p class="verdict">Buying is cheapest for ${fmt(cashBuyCount)} craftable inputs. Farming may be worth it for ${fmt(progressionFarmCount)} inputs because the same run also helps masteries, quests, or useful drops.</p>${metric("Most-used route", bestText ? decisionLabel(bestText[0]) : "Use inventory")}${metric("Exploring saved by combining runs", fmt(sharedExploreSavings))}${metric("Longest passive wait", passiveHours ? fmt(passiveHours) + " hours" : "None")}`;
    $("grindRoute").innerHTML = `<span class="route-label">Farm yourself</span><h3>Consumables and time</h3>${metric("Explores / stamina", `${fmt(explores)} / ${fmt(stamina)}`)}${metric("Cider / AP", `${fmt(ciders)} / ${fmt(aps)}`)}${metric("OJ-equivalent", fmt(oj))}${metric("Large Nets", fmt(largeNets))}${metric("Crop plants", fmt(plants))}<p class="route-note">Routes at the same location share one exploration run; the largest requirement covers the smaller co-drops. Consumables remain valued at their current trade opportunity.</p>`;
    $("marketRoute").innerHTML = `<span class="route-label">Buy or trade</span><h3>Direct acquisition</h3>${metric("Gold", fmt(tradeCurrency.gold))}${metric("Arnold Palmer", fmt(tradeCurrency.ap))}${metric("Orange Juice", fmt(tradeCurrency.oj))}${metric("Gold-equivalent", fmt(tradeGoldEq))}${metric("Country Store", fmt(vendorSilver) + " silver")}<p class="route-note">Price Check quotes ending in <b>/k</b> are per 1,000 items — Leather at 5 AP/k means 5 Arnold Palmers per 1,000 Leather.</p>`;

    if (coveredRows.length) {
      el.covered.classList.remove("hidden");
      el.covered.innerHTML = `<div><span class="eyebrow">Handled quietly</span><strong>${coveredRows.length} infrastructure-covered inputs</strong><p>${coveredRows.map((row) => `${esc(row.item.name)} × ${fmt(row.missing)} — ${esc(row.route.label)}`).join(" · ")}</p></div><label class="mini-check"><input type="checkbox" ${state.showCovered ? "checked" : ""} data-show-covered> Show them in the workbench</label>`;
      el.covered.querySelector("[data-show-covered]").onchange = (event) => { state.showCovered = event.target.checked; $("toggleCovered").checked = state.showCovered; render(); };
    } else {
      el.covered.classList.add("hidden");
    }

    if (activeDecisions.length) {
      el.makeBuy.classList.remove("hidden");
      el.makeBuy.innerHTML = `<div class="section-heading compact"><div><span class="eyebrow">Route decisions</span><h2>Make, buy, farm, or wait</h2></div><p>Auto picks the cheapest known route. Change it when you want mastery progress, a different location, or useful co-drops.</p></div><div class="decision-list">${activeDecisions.slice(0, 40).map((decision) => {
        const selected = state.makeChoices[decision.item.id] || "auto";
        const materialText = decision.materials.complete ? `${fmt(decision.materials.goldEq)}g through the cheapest known ingredient routes` : `${decision.materials.priced}/${decision.materials.count} ingredient routes priced`;
        const farmText = decision.farm ? `${farmLabel(decision.farm)} ${esc(decision.farm.location || "")}${decision.farm.goldEq != null ? ` · ${fmt(decision.farm.goldEq)} gold` : ""}` : "";
        const directText = decision.direct ? quoteText(decision.direct) : "";
        const infraText = decision.infra ? decision.infra.detail : "";
        const costText = decision.auto === "farm" ? farmText : decision.auto === "trade" ? directText : decision.auto === "building" ? infraText : materialText;
        const codrops = decision.farm ? coDropSentence(decision.farm) : "";
        const autoLabel = decision.auto === "building" ? "building" : decision.auto;
        return `<div class="decision-row">${itemImg(decision.item, "small")}<div class="decision-copy"><strong>${esc(decision.item.name)} × ${fmt(decision.node.qtyOut)}</strong><small>${esc(decision.reason)}</small>${codrops ? `<span class="codrop-line">Co-drops: ${codrops}</span>` : ""}<span class="winner-line">${winnerSentence(decision)}</span></div><div class="decision-cost">${costText}<small>${materialText}</small></div><div class="decision-controls"><select data-make-id="${decision.item.id}"><option value="auto" ${selected === "auto" ? "selected" : ""}>Auto → ${esc(autoLabel)}</option><option value="craft" ${selected === "craft" ? "selected" : ""}>Craft it</option>${decision.farm ? `<option value="farm" ${selected === "farm" ? "selected" : ""}>Farm directly</option>` : ""}${decision.direct ? `<option value="trade" ${selected === "trade" ? "selected" : ""}>Buy/trade it</option>` : ""}${decision.infra ? `<option value="building" ${selected === "building" ? "selected" : ""}>Use ${esc(decision.infra.kind)}</option>` : ""}</select>${decision.farm ? locationSelect(decision.item, decision.node.qtyOut, m, decision.farm) : ""}</div></div>`;
      }).join("")}</div>`;
      el.makeBuy.querySelectorAll("[data-make-id]").forEach((select) => {
        select.onchange = () => { state.makeChoices[select.dataset.makeId] = select.value; save(); render(); };
      });
    } else {
      el.makeBuy.classList.add("hidden");
    }

    $("ingCount").textContent = `${visibleRows.length} shown · ${rows.length} active`;
    el.ingBody.innerHTML = visibleRows.map((row) => `<tr class="route-${row.route.type}"><td><div class="item-cell">${itemImg(row.item, "table-art")}<span><b>${esc(row.item.name)}</b>${row.leaf.stopped ? '<small>recipe stopped at the chosen acquisition route</small>' : ""}</span></div></td><td class="num">${fmt(row.leaf.total)}</td><td class="num"><input class="owned" data-id="${row.item.id}" inputmode="numeric" value="${row.owned || ""}" placeholder="0" aria-label="Owned quantity of ${esc(row.item.name)}"></td><td class="num">${fmt(row.missing)}</td><td>${routeOptions(row.item, row.route, m)}${locationSelect(row.item, row.missing, m, row.route)}</td><td><span class="route-detail">${row.route.detail}</span>${row.route.goldEq != null && row.route.goldEq > 0 ? `<small class="gold-eq">≈ ${fmt(row.route.goldEq)} gold value</small>` : ""}${routeEvidence(row.item, row.route)}</td></tr>`).join("");
    el.ingBody.querySelectorAll(".owned").forEach((input) => {
      input.onchange = () => {
        const value = parseInt(input.value.replace(/\D/g, ""), 10);
        if (isNaN(value)) delete state.owned[input.dataset.id]; else state.owned[input.dataset.id] = value;
        save(); render();
      };
    });
    el.ingBody.querySelectorAll("[data-source-id]").forEach((select) => {
      select.onchange = () => { state.sourceChoices[select.dataset.sourceId] = select.value; save(); render(); };
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
    $("infraGrid").innerHTML = infraCards.map((card) => `<article class="infra-card"><div class="infra-title">${itemImg(card.art, "meal-art")}<div><span class="eyebrow">Farm source</span><h3>${card.title}</h3></div></div><p>${card.body}</p><div class="infra-controls">${card.controls}</div></article>`).join("");
    document.querySelectorAll("[data-infra]").forEach((input) => { input.onchange = () => { state.infra[input.dataset.infra] = input.checked; save(); render(); }; });
    document.querySelectorAll("[data-infra-number]").forEach((input) => { input.onchange = () => { state.infra[input.dataset.infraNumber] = Number(input.value || 0); save(); render(); }; });
    document.querySelectorAll("[data-effect-direct]").forEach((input) => { input.onchange = () => { input.checked ? state.enabled.add(input.dataset.effectDirect) : state.enabled.delete(input.dataset.effectDirect); save(); renderSetup(); render(); }; });

    $("mealGrid").innerHTML = MEALS.map((meal) => {
      const item = itemByName(meal.name) || (meal.img ? { name: meal.name, img: meal.img } : null);
      return `<label class="meal-card ${state.meals[meal.id] ? "active" : ""}"><input type="checkbox" data-meal="${meal.id}" ${state.meals[meal.id] ? "checked" : ""}>${itemImg(item, "meal-art")}<span><small>${esc(meal.area)}</small><strong>${esc(meal.name)}</strong><b>${esc(meal.effect)}</b><p>${esc(meal.calc)}</p></span></label>`;
    }).join("");
    document.querySelectorAll("[data-meal]").forEach((input) => { input.onchange = () => { state.meals[input.dataset.meal] = input.checked; save(); renderSetup(); render(); }; });

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

    $("assumptionGrid").innerHTML = Object.entries(BASE_CONSTS).filter(([, value]) => value && typeof value.v === "number").map(([key, value]) => `<label class="assumption-row ${value.verified ? "" : "unverified"}"><span><strong>${esc(key.replaceAll("_", " "))}</strong><small>${esc(value.why || "")}</small></span><input type="number" step="any" data-assumption="${esc(key)}" value="${clean(state.overrides[key] ?? value.v)}"></label>`).join("");
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
    const inventory = snapshot.inventory || [];
    const masteries = snapshot.masteries || [];
    const consumables = Object.entries(snapshot.consumables || {}).sort((a, b) => a[0].localeCompare(b[0]));
    const activeEffects = snapshot.activeEffects || [];
    const perks = snapshot.perks || [];
    const supply = snapshot.farmSupply || [];
    const pets = snapshot.pets || [];
    const friendships = snapshot.friendships || [];
    const kitchen = snapshot.kitchenStats || {};
    $("accountSummary").innerHTML = [
      ["Player", snapshot.player && snapshot.player.name || "Unknown", "local snapshot"],
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
      ["Unknown", fmt((snapshot.unknownFields || []).length), "fields still missing"],
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
      return `<span class="account-item">${itemImg(item, "drop-art")}<span>${esc(entry.itemName)}${entry.masteryCount != null ? ` · ${fmt(Number(entry.masteryCount))}${target}` : ""}</span></span>`;
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
      return `<span class="account-item">${itemImg(item, "drop-art")}<span>${fmt(Number(reward.quantity))} ${esc(reward.name)}</span></span>`;
    }).join("") || "<span>No visible next-floor rewards.</span>"}</div>` : "<p>Tower details have not been captured yet.</p>";
    const warnings = [...(snapshot.warnings || []), ...(snapshot.unknownFields || []).map((field) => "Missing: " + field)];
    $("accountWarnings").innerHTML = warnings.length ? warnings.slice(0, 30).map((warning) => `<p>${esc(warning)}</p>`).join("") : "<p>No warnings in this snapshot.</p>";
    $("accountConsumables").innerHTML = (consumables.length || activeEffects.length) ? consumables.slice(0, 10).map(([name, entry]) => {
        const item = itemByName(name);
        return `<span>${itemImg(item, "drop-art")}<b>${fmt(Number(entry.quantity || 0))}</b><small>${esc(name)}</small></span>`;
      }).join("") + activeEffects.map((effect) => {
        const item = itemByName(effect.name);
        const detail = effect.uses != null ? `${fmt(Number(effect.uses))} uses` : effect.remaining || "active";
        return `<span>${itemImg(item, "drop-art")}<b>${esc(detail)}</b><small>${esc(effect.name)} · at capture</small></span>`;
      }).join("") : "";
  }


  const PUMPKIN_JUICE_MMS = new Set(["Pitchfork", "Salt", "Fancy Pan Flute", "Wrench", "Red Trunk", "Water Lily", "Wizard Hat", "Jade Charm", "Fancy Guitar"]);

  function towerMasteryMap() {
    const values = new Map(Object.entries(PERSONAL.masteries || {}).map(([name, value]) => [name.toLowerCase(), Number(value) || 0]));
    for (const row of PERSONAL.authoritativeMasteries ? [] : state.account && state.account.masteries || []) {
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

  function towerRequirements() {
    const progress = towerMasteryMap();
    return Object.entries(P.items || {}).map(([name, row]) => {
      if (!row.mastery || row.mastery.towerRequirement == null) return null;
      const floor = Number(row.mastery.towerRequirement);
      if (!Number.isFinite(floor)) return null;
      const current = progress.get(name.toLowerCase()) || 0;
      return { name, floor, current, remaining: Math.max(0, 1000000 - current), complete: current >= 1000000, methods: row.mastery.methods || [] };
    }).filter(Boolean).sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name));
  }

  function renderTower() {
    const start = Math.max(1, Math.min(340, Number(state.towerStart) || 277));
    const goal = 340;
    const rows = towerRequirements().filter((row) => row.floor >= start && row.floor <= goal);
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
    $("towerCaptureAge").textContent = captureDate ? `Progress saved ${new Date(captureDate).toLocaleString()}` : "Progress date unknown";
    $("towerSummary").innerHTML = [
      ["Named MM goals left", `${unfinished.length} / ${rows.length}`, "mastery plan through T330"],
      ["Floor costs", String(TOWER_FLOORS.floors.length), "T301 through T340"],
      ["Progress left", fmt(remaining), "mastery actions / output"],
      ["Completed here", String(rows.length - unfinished.length), "MM requirements"],
    ].map(([label, value, note]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join("");
    const visibleFloors = [...floors].filter(([, items]) => state.towerShowDone || items.some((row) => !row.complete));
    $("towerRail").innerHTML = visibleFloors.length ? visibleFloors.map(([floor, items]) => {
      const complete = items.every((row) => row.complete);
      const isNext = floor === nextFloor;
      return `<article class="tower-floor ${complete ? "is-done" : "is-work"} ${isNext ? "is-next" : ""}"><div class="tower-floor-mark"><span>Floor</span><strong>T${floor}</strong><small>${complete ? "Gate cleared" : `${items.filter((row) => !row.complete).length} left`}</small></div><div class="tower-floor-items">${items.map((row) => {
        const item = itemByName(row.name);
        const percent = Math.min(100, row.current / 10000);
        const method = row.methods.join(" / ") || "item";
        const pjGap = PUMPKIN_JUICE_MMS.has(row.name) && !row.complete ? Math.max(0, 909091 - row.current) : null;
        const openAttrs = row.complete ? "" : ` data-open-item="${esc(row.name)}" data-open-qty="${row.remaining}" tabindex="0" role="button" title="Open ${esc(row.name)} in the Craft planner"`;
        return `<div class="tower-mm ${row.complete ? "complete" : "working"}"${openAttrs}>${itemImg(item, "tower-art")}<div class="tower-mm-main"><div class="tower-mm-title"><strong>${esc(row.name)}</strong><span>${esc(method)}</span></div><div class="tower-progress"><i style="width:${percent}%"></i></div><div class="tower-mm-numbers"><b>${fmt(row.current)} / 1m</b><span>${row.complete ? "MM complete" : `${fmt(row.remaining)} left`}</span></div>${pjGap !== null ? `<small class="tower-pj">One-PJ setup: ${fmt(pjGap)} more to 909.09k</small>` : ""}</div></div>`;
      }).join("")}</div></article>`;
    }).join("") : `<div class="tower-all-clear"><strong>Everything in this range is complete.</strong><span>Turn on “Show completed floors” to review the cleared requirements.</span></div>`;

    const floorRows = (TOWER_FLOORS.floors || []).filter((row) => row.floor >= Math.max(301, start) && row.floor <= goal);
    const costGrid = $("towerCostGrid");
    if (costGrid) costGrid.innerHTML = floorRows.map((row) => `<article class="tower-cost-card"><div class="tower-cost-mark"><span>Floor</span><strong>T${row.floor}</strong><small>${fmt(row.silverB)}b Silver</small><small>${fmt(row.ak)} AK</small><small>${fmt(row.minMM)} MM minimum</small></div><div class="tower-cost-items">${row.items.map((entry) => { const item = itemByName(entry.name); return `<div class="tower-cost-item" data-open-item="${esc(entry.name)}" data-open-qty="${entry.quantity}" tabindex="0" role="button" title="Open ${esc(entry.name)} in the Craft planner">${itemImg(item, "tower-art")}<span><b>${esc(entry.name)}</b><small>${fmt(entry.quantity)}</small></span></div>`; }).join("")}</div></article>`).join("") || `<div class="tower-all-clear"><strong>No T301–T340 costs in this filter.</strong><span>Set “Start at floor” to 301 or lower.</span></div>`;
    const connected = !!state.extensionConnectedAt;
    const sync = $("towerSyncState");
    sync.classList.toggle("connected", connected);
    sync.innerHTML = `<span></span><strong>${connected ? "Extension connected" : "Saved account"}</strong><small>${connected ? `Updated ${new Date(state.extensionConnectedAt).toLocaleTimeString()}` : "Extension not connected"}</small>`;
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
  $("towerCostGrid").addEventListener("click", (event) => openTowerItem(event.target));
  $("towerCostGrid").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTowerItem(event.target); } });

  function applyAccountSnapshot() {
    if (!state.account) return;
    let inventoryApplied = 0;
    for (const entry of state.account.inventory || []) {
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
  $("resetAssumptions").onclick = () => { state.overrides = {}; save(); renderSetup(); render(); };
  $("includeEvents").onchange = (event) => { state.includeEvents = event.target.checked; save(); render(); };
  $("drinkPath").onchange = (event) => { state.drinkPath = event.target.value; save(); render(); };
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
  $("dataSummary").innerHTML = [["Active items", itemCount], ["Recipe rows", recipeCount], ["Gathering zones", locCount], ["Market entries", marketCount], ["Progression profiles", progressionCount], ["Experienced-player rules", strategyRuleCount]].map(([label, value]) => `<div class="data-card"><span>${label}</span><strong>${fmt(value)}</strong></div>`).join("");
  $("footer").innerHTML = "Lantern Ledger is a fan-made Farm RPG planner. Your account data stays in this browser.";

  function renderLibrary() {
    const counts = K.meta.counts || {};
    const sourceStatus = K.meta.sourceStatus || {};
    const parsed = Number(sourceStatus.parsed || 0);
    const incomplete = Object.entries(sourceStatus).filter(([status]) => status !== "parsed").reduce((sum, [, count]) => sum + Number(count || 0), 0);
    $("knowledgeStatus").innerHTML = `<div><span class="status-light good"></span><strong>Database integrity</strong><b>${esc(K.meta.integrity || "unknown")}</b></div><div><span class="status-light ${counts.unmatched_names ? "warn" : "good"}"></span><strong>Unresolved names</strong><b>${fmt(counts.unmatched_names || 0)}</b></div><div><span class="status-light ${counts.conflicts > 2 ? "warn" : "good"}"></span><strong>Comparable conflicts</strong><b>${fmt(counts.conflicts || 0)}</b></div><div><span class="status-light warn"></span><strong>Source coverage</strong><b>${parsed} parsed · ${incomplete} incomplete</b></div><p>${esc(K.meta.warning || "Coverage information unavailable.")}</p>`;

    $("strategyRules").innerHTML = K.rules.length ? K.rules.map((rule) => `<article><div><span>${esc(rule.topic || "strategy")}</span>${rule.needsVerification ? `<b>Needs measurement</b>` : `<b class="supported">Supported</b>`}</div><p>${esc(rule.rule)}</p>${rule.confirmedBy ? `<small>Evidence: ${esc(rule.confirmedBy)}</small>` : ""}</article>`).join("") : `<div class="empty-samples">No strategy rules exported.</div>`;

    const mealByName = new Map(K.meals.map((meal) => [meal.name.toLowerCase(), meal]));
    $("mechanicsIndex").innerHTML = MEALS.map((meal) => {
      const known = mealByName.get(meal.name.toLowerCase());
      return `<article><div>${itemImg(itemByName(meal.name) || (meal.img ? { img: meal.img } : null), "table-art")}<span><strong>${esc(meal.name)}</strong><small>${esc(meal.area)}</small></span></div><p>${esc((known && known.effect) || meal.effect)}</p><b>${esc(meal.calc)}</b></article>`;
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
  const requestedView = location.hash.replace(/^#/, "");
  showTab(document.getElementById(requestedView)?.classList.contains("view") ? requestedView : "home");
})();



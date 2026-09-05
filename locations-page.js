// Places page: every explore and fishing spot, what it drops, and what a pour
// of Arnold Palmers / nets / stamina actually hands back.
//
// Two rate sets cover these locations, in different units, because they
// measure different activities. Which one answers follows from what is being
// spent - see the note above FINDS, and KNOWN_MISTAKES.md "Arnold Palmer is
// not exploring".
//
//   * window.FRPG_WORKBOOK_RATES - drops per Arnold Palmer (exploring) and per
//     Large Net (fishing), from the shared Tower MM workbook, measured with
//     every perk on.
//   * data/data.js - explores per drop, from community outcome logs. Fishing
//     keeps two of these: the net table and the rod table.
//     data/location-rates.js holds the same logs re-counted for Iron Depot.
//
// How much stamina one action costs is a per-player, per-location number that
// only the game can tell you (Farm RPG prints it under Exploring
// Effectiveness), so it is typed in here rather than guessed.
(() => {
  const DATA = window.FRPG_DATA;
  const INTEL = window.FRPG_LOCATION_INTEL;
  const WB = window.FRPG_WORKBOOK_RATES;
  const IRON = window.FRPG_LOCATION_RATES;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const root = document.getElementById("placesBody");
  if (!DATA || !ART || !root) return;

  const EFFORT_KEY = "frpg_location_effort_v1";
  const PREFS_KEY = "frpg_places_prefs_v1";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ }
  };

  const effort = readJson(EFFORT_KEY, {});
  const prefs = Object.assign(
    { mode: "explore", amount: 1000, kind: "ap", want: "", onlyNeeded: false, scaled: true },
    readJson(PREFS_KEY, {})
  );

  // ---- numbers -------------------------------------------------------------
  function count(value) {
    if (!(value > 0)) return "0";
    if (value >= 1e6) return (value / 1e6).toFixed(value >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (value >= 10000) return Math.round(value / 1000) + "k";
    if (value >= 100) return Math.round(value).toLocaleString();
    if (value >= 10) return value.toFixed(0);
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(2);
  }
  const whole = (value) => Math.round(value || 0).toLocaleString();
  function oneIn(denom) {
    if (!(denom > 0)) return "rate unknown";
    return denom >= 100 ? "1 in " + Math.round(denom).toLocaleString() : "1 in " + denom.toFixed(1);
  }

  // ---- the player's setup --------------------------------------------------
  // Setup owns the perks. Reading them here rather than keeping a second copy
  // means ticking Lemon Squeezer changes what a pour is worth on this page too.
  function mods() {
    const fn = window.FRPG_MODS;
    const base = typeof fn === "function" ? fn() : null;
    if (base && base.drinks && base.nets) return base;
    return {
      drinks: { apItems: 200, lemonadeItems: 10, ciderRolls: 1000 },
      nets: { fnCatch: 10, lnCatch: 250 },
      ironDepot: false,
    };
  }
  function constant(key, fallback) {
    const row = (window.FRPG_CONSTANTS || {})[key];
    return row && row.v != null ? Number(row.v) : fallback;
  }

  // ---- locations -----------------------------------------------------------
  const intelFor = (type, name) => (INTEL && INTEL.locations && INTEL.locations[type + ":" + name]) || null;

  const places = [];
  for (const loc of (DATA.sources && DATA.sources.locations) || []) {
    if (loc.type !== "explore" && loc.type !== "fishing") continue;
    const meta = intelFor(loc.type, loc.name) || {};
    places.push({
      name: loc.name,
      mode: loc.type === "fishing" ? "fishing" : "explore",
      image: meta.image || null,
      buddyUrl: meta.buddyUrl || null,
      drops: loc.drops || {},
      fish: loc.fish || {},
      ironDepot: (IRON && IRON.ironDepot && IRON.ironDepot[loc.name]) || null,
      workbook: null,
    });
  }
  // The workbook covers two places the logs never did. Listing them with their
  // workbook rates beats pretending they do not exist.
  const seen = new Set(places.map((place) => place.mode + ":" + place.name));
  const attachWorkbook = (table, mode) => {
    for (const [name, rates] of Object.entries(table || {})) {
      const existing = places.find((place) => place.mode === mode && place.name === name);
      if (existing) { existing.workbook = rates; continue; }
      if (seen.has(mode + ":" + name)) continue;
      const meta = intelFor(mode === "fishing" ? "fishing" : "explore", name) || {};
      places.push({
        name, mode, image: meta.image || null, buddyUrl: meta.buddyUrl || null,
        drops: {}, fish: {}, ironDepot: null, workbook: rates,
      });
      seen.add(mode + ":" + name);
    }
  };
  attachWorkbook(WB && WB.exploring, "explore");
  attachWorkbook(WB && WB.fishing, "fishing");
  places.sort((a, b) => a.name.localeCompare(b.name));

  // ---- what a pour is worth here ------------------------------------------
  const KINDS = {
    explore: [
      ["ap", "Arnold Palmers"],
      ["lemonade", "Lemonades"],
      ["cider", "Apple Ciders"],
      ["oj", "Orange Juices"],
      ["stamina", "stamina"],
      ["explores", "explores"],
    ],
    fishing: [
      ["largenet", "Large Nets"],
      ["fishingnet", "Fishing Nets"],
      ["casts", "casts with the rod"],
      ["stamina", "stamina"],
    ],
  };

  const effortKey = (place) => place.mode + ":" + place.name;
  function staminaPer(place) {
    const value = Number((effort[effortKey(place)] || {}).stamina || 0);
    return value > 0 ? value : 0;
  }

  // KNOWN_MISTAKES.md, "Arnold Palmer is not exploring": an AP finds items on
  // its own and spends no stamina, so it is a different activity from
  // exploring, not the same one bought in bulk. Treating one as the other was
  // a tenfold error once already. So WHAT YOU SPEND decides which table can
  // answer; it is not the reader's choice to get wrong.
  //
  //   AP / Lemonade / Cider   -> finds        -> the workbook's drops per AP
  //   Large Net / Fishing Net -> catches      -> the workbook's drops per LN
  //   explores / stamina / OJ -> explores     -> the logged explores per drop
  //   rod casts / stamina     -> manual casts -> the logged rod table
  const FINDS = new Set(["ap", "lemonade", "cider", "largenet", "fishingnet"]);
  const byRod = () => prefs.kind === "casts" || prefs.kind === "stamina";

  // The workbook was measured with every perk on. Its exploring rates for any
  // one location add up to 550 per AP - 500 finds plus 10% for Quandary
  // Chowder - and its fishing rates to exactly 500 per Large Net. That is what
  // makes scaling to this account legitimate: it is the same unit, just fewer
  // finds. It is not a conversion between exploring and drinking.
  const WORKBOOK_FINDS = 500;

  // How many workbook units the pour is worth. One AP is one unit; everything
  // else in this group converts by how many finds it makes, which Setup knows.
  function unitsFor(place) {
    const amount = Number(prefs.amount) || 0;
    const m = mods();
    switch (prefs.kind) {
      case "ap": return amount;
      case "lemonade": return m.drinks.apItems > 0 ? amount * m.drinks.lemonadeItems / m.drinks.apItems : 0;
      case "cider": return m.drinks.apItems > 0 ? amount * m.drinks.ciderRolls / m.drinks.apItems : 0;
      case "largenet": return amount;
      case "fishingnet": return m.nets.lnCatch > 0 ? amount * m.nets.fnCatch / m.nets.lnCatch : 0;
      default: return 0;
    }
  }

  // How many explores or casts the pour buys. Only stamina answers this, and
  // only once the player has said what an action costs here.
  function actionsFor(place) {
    const amount = Number(prefs.amount) || 0;
    const per = staminaPer(place);
    switch (prefs.kind) {
      case "oj": return per > 0 ? amount * constant("oj_stamina", 100) / per : null;
      case "stamina": return per > 0 ? amount / per : null;
      default: return amount;
    }
  }

  // What one workbook unit is worth on this account, as a fraction of the
  // workbook's own assumption. 1 when every relevant perk is ticked.
  function setupScale(place) {
    if (!prefs.scaled) return 1;
    const m = mods();
    const mine = place.mode === "fishing" ? m.nets.lnCatch : m.drinks.apItems;
    return mine > 0 ? mine / WORKBOOK_FINDS : 1;
  }

  function denomTable(place) {
    if (place.mode === "fishing") {
      return byRod() && Object.keys(place.fish).length ? place.fish : place.drops;
    }
    if (mods().ironDepot && place.ironDepot) return place.ironDepot;
    return place.drops;
  }

  function yields(place) {
    const rows = [];
    const finds = FINDS.has(prefs.kind);
    const unit = place.mode === "fishing" ? "Large Net" : "AP";

    if (finds) {
      if (!place.workbook) return { basis: "workbook", rows: [], missing: true };
      const units = unitsFor(place) * setupScale(place);
      for (const [name, rate] of Object.entries(place.workbook)) {
        if (!(rate > 0)) continue;
        rows.push({ name, expected: rate * units, rate: count(rate) + " per " + unit, known: true });
      }
    } else {
      const actions = actionsFor(place);
      if (actions == null) return { basis: "logged", rows: [], blocked: true };
      const table = denomTable(place);
      if (!Object.keys(table).length) return { basis: "logged", rows: [], missing: true };
      for (const [name, info] of Object.entries(table)) {
        const denom = typeof info === "number" ? info : (info && info.denom);
        if (!(denom > 0)) {
          rows.push({ name, expected: null, rate: "not logged yet", known: false });
          continue;
        }
        rows.push({ name, expected: actions / denom, rate: oneIn(denom), known: true });
      }
      rows.actions = actions;
    }
    rows.sort((a, b) =>
      Number(b.known) - Number(a.known) ||
      (b.expected || 0) - (a.expected || 0) ||
      a.name.localeCompare(b.name));
    return { basis: finds ? "workbook" : "logged", rows, actions: finds ? null : rows.actions };
  }

  // ---- what those items are worth to you ----------------------------------
  const itemsByName = new Map(((DATA.items && DATA.items.items) || []).map((item) => [item.name.toLowerCase(), item]));
  const key = (name) => String(name || "").trim().toLowerCase();

  function questShort() {
    const gather = window.FRPG_GATHER;
    const map = new Map();
    if (!gather) return map;
    try {
      const plan = gather.plan();
      for (const row of plan.wholeRows || []) if (row.short > 0) map.set(key(row.name), row.short);
    } catch (_) { /* quest data not ready */ }
    return map;
  }
  function towerShort() {
    const map = new Map();
    for (const need of window.FRPG_TOWER_NEEDS || []) {
      if (need.complete) continue;
      const k = key(need.name);
      const held = map.get(k);
      // Lowest floor first: that is the one it helps you reach next.
      if (!held || need.floor < held.floor) map.set(k, need);
    }
    return map;
  }

  // ---- rendering -----------------------------------------------------------
  function kindLabel() {
    const list = KINDS[prefs.mode] || [];
    const row = list.find((entry) => entry[0] === prefs.kind) || list[0];
    return row ? row[1] : "";
  }

  // Which table answered, and what it assumes that this account may not.
  // "Every perk on" is a number Setup already knows, so the gap is stated
  // rather than left for the player to discover in the game.
  function sourceNote() {
    const m = mods();
    if (FINDS.has(prefs.kind)) {
      const unit = prefs.mode === "fishing" ? "Large Net" : "Arnold Palmer";
      const mine = prefs.mode === "fishing" ? m.nets.lnCatch : m.drinks.apItems;
      let text = "Drops per " + unit + ", measured in the shared Tower MM workbook. Its rates for a place add up to " +
        (prefs.mode === "fishing"
          ? "about 500 catches per Large Net"
          : "about 550 per Arnold Palmer — 500 finds, plus 10% for Quandary Chowder") +
        ", which is what makes scaling them sound. A few places come out higher, where rare chests and runestones land on top of the ordinary find.";
      if (prefs.scaled && mine > 0 && mine !== WORKBOOK_FINDS) {
        text += " Setup says yours " + (prefs.mode === "fishing" ? "catches " : "finds ") + whole(mine) +
          ", so these are scaled to " + count(100 * mine / WORKBOOK_FINDS) + "% of what the workbook measured.";
      } else if (!prefs.scaled && mine > 0 && mine !== WORKBOOK_FINDS) {
        text += " Shown as measured, which is " + count(WORKBOOK_FINDS / mine) + "× what Setup says you would really pull.";
      }
      return text;
    }
    if (prefs.mode === "fishing") {
      return "Casts per catch, from community logs — " + (byRod() ? "the rod table, which was logged separately from nets" : "the net table") + ".";
    }
    return "Explores per drop, from community logs" +
      (m.ironDepot ? " — the Iron Depot counts, since Setup says you own it" : "") +
      ". Exploring spends stamina and an Arnold Palmer does not, so these are a different measurement from the workbook's, not a second opinion on it.";
  }
  function controls() {
    const list = KINDS[prefs.mode] || [];
    const options = list.map((entry) =>
      '<option value="' + entry[0] + '"' + (entry[0] === prefs.kind ? " selected" : "") + ">" + esc(entry[1]) + "</option>").join("");
    return '<div class="places-controls">' +
      '<div class="places-modes" role="group" aria-label="Kind of place">' +
        '<button type="button" class="places-mode' + (prefs.mode === "explore" ? " active" : "") + '" data-mode="explore" aria-pressed="' + (prefs.mode === "explore") + '">Exploring</button>' +
        '<button type="button" class="places-mode' + (prefs.mode === "fishing" ? " active" : "") + '" data-mode="fishing" aria-pressed="' + (prefs.mode === "fishing") + '">Fishing</button>' +
      "</div>" +
      '<div class="places-pour">' +
        '<label class="places-field"><span>Spend</span><input id="placesAmount" type="number" min="0" step="1" inputmode="numeric" value="' + esc(prefs.amount) + '"></label>' +
        '<label class="places-field"><span>of</span><select id="placesKind">' + options + "</select></label>" +
        '<label class="places-field grow"><span>after in particular</span><input id="placesWant" type="search" value="' + esc(prefs.want) + '" placeholder="anything — try Iron"></label>' +
      "</div>" +
      '<div class="places-basis">' +
        (FINDS.has(prefs.kind)
          ? '<button type="button" class="places-chip' + (prefs.scaled ? " active" : "") + '" data-scaled aria-pressed="' + !!prefs.scaled + '">Scale to my Setup</button>'
          : "") +
        '<button type="button" class="places-chip needed' + (prefs.onlyNeeded ? " active" : "") + '" data-only aria-pressed="' + !!prefs.onlyNeeded + '">Only what I still need</button>' +
      "</div>" +
      '<p class="places-basis-note">' + esc(sourceNote()) + "</p>" +
    "</div>";
  }

  function effortRow(place) {
    const per = staminaPer(place);
    const verb = place.mode === "fishing" ? "cast" : "explore";
    const oj = constant("oj_stamina", 100);
    const said = per > 0
      ? whole(per) + " stamina each, so one Orange Juice (" + whole(oj) + " stamina) is worth about " + count(oj / per) + " " + verb + (oj / per === 1 ? "" : "s") + " here."
      : "Farm RPG knows this one. Open the location and read <b>Exploring Effectiveness</b> — <i>you are currently using N stamina every time you continue exploring this location</i>. Protein Bars and perks move it, so the number is yours alone.";
    return '<div class="places-effort">' +
      "<label><span>Stamina per " + verb + " here</span>" +
      '<input type="number" min="0" step="1" inputmode="numeric" data-effort="' + esc(effortKey(place)) + '" value="' + (per > 0 ? per : "") + '" placeholder="—"></label>' +
      "<p>" + said + "</p></div>";
  }

  function rowsMarkup(result, quests, tower) {
    if (!result.rows.length) return '<p class="places-none">No drops recorded here yet.</p>';
    const body = result.rows.map((row) => {
      const art = ART.urlFor(row.name);
      const short = quests.get(key(row.name)) || 0;
      const need = tower.get(key(row.name));
      const tags = [];
      if (short > 0) tags.push('<span class="places-tag quest">Questline needs ' + whole(short) + "</span>");
      if (need) tags.push('<span class="places-tag tower">T' + need.floor + " " + (need.tier === "gm" ? "Grand" : "Mega") + " · " + whole(need.remaining) + " left</span>");
      const covers = row.expected != null && short > 0 && row.expected >= short;
      return '<tr class="' + (covers ? "covers" : "") + '">' +
        '<td><button type="button" class="places-item" data-open-item="' + esc(row.name) + '">' +
          (art ? '<img src="' + esc(art) + '" alt="" width="24" height="24" loading="lazy">' : '<span class="places-noart"></span>') +
          "<span>" + esc(row.name) + "</span></button></td>" +
        '<td class="num">' + (row.expected == null ? "—" : "<b>" + count(row.expected) + "</b>") + "</td>" +
        '<td class="rate">' + esc(row.rate) + "</td>" +
        '<td class="tags">' + (tags.join(" ") || '<span class="places-tag quiet">—</span>') + "</td>" +
      "</tr>";
    }).join("");
    return '<div class="places-scroll"><table class="places-table"><thead><tr><th>Item</th>' +
      '<th class="num">You would get</th><th class="rate">Rate</th>' +
      '<th class="tags">Also wanted for</th></tr></thead><tbody>' + body + "</tbody></table></div>";
  }

  function sellValue(result) {
    let silver = 0;
    for (const row of result.rows) {
      if (!(row.expected > 0)) continue;
      const item = itemsByName.get(key(row.name));
      if (item && item.sell > 0) silver += item.sell * row.expected;
    }
    return silver;
  }

  function render() {
    const quests = questShort();
    const tower = towerShort();
    const want = key(prefs.want);
    const wanted = (name) => quests.has(key(name)) || tower.has(key(name));
    const scored = places.filter((place) => place.mode === prefs.mode).map((place) => {
      const result = yields(place);
      if (prefs.onlyNeeded) result.rows = result.rows.filter((row) => wanted(row.name));
      const hit = want ? result.rows.find((row) => key(row.name).includes(want)) : null;
      return { place, result, hit };
    });
    if (want) scored.sort((a, b) => ((b.hit && b.hit.expected) || -1) - ((a.hit && a.hit.expected) || -1));

    const label = kindLabel();
    const amount = whole(prefs.amount);
    const cards = scored.map((entry) => {
      const place = entry.place;
      const result = entry.result;
      const blocked = !!result.blocked;
      const missing = !!result.missing;
      const noun = place.mode === "fishing" ? "catches" : "explores";
      const preview = blocked
        ? '<span class="places-preview blocked">Say what an ' + (place.mode === "fishing" ? "cast" : "explore") + " costs here and this fills in.</span>"
        : '<span class="places-preview">' + (result.rows.slice(0, 3).map((row) =>
            "<b>" + count(row.expected || 0) + "</b> " + esc(row.name)).join(" · ") || "nothing recorded here") + "</span>";
      const found = !want ? ""
        : (entry.hit && entry.hit.expected != null
          ? '<span class="places-found">' + count(entry.hit.expected) + " " + esc(entry.hit.name) + "</span>"
          : '<span class="places-found none">no ' + esc(prefs.want) + "</span>");
      const silver = blocked ? 0 : sellValue(result);
      const worth = silver > 0 ? ", worth about <b>" + whole(silver) + "</b> silver if you sold every bit of it" : "";
      // An Arnold Palmer finds items without spending stamina, so a drink pour
      // is counted in finds and never restated as a number of explores.
      const line = blocked
        ? "Nothing to work out until that number is in."
        : missing
          ? "Nothing recorded for " + esc(place.name) + " in that table yet."
          : result.basis === "workbook"
            ? amount + " " + esc(label) + " here" + worth + "."
            : (prefs.kind === "explores" || prefs.kind === "casts")
              // Saying "1,000 casts is 1,000 catches" tells nobody anything.
              ? amount + " " + esc(label) + " here" + worth + "."
              : amount + " " + esc(label) + " is <b>" + whole(result.actions) + "</b> " + noun + " here" + worth + ".";
      return '<details class="places-card" data-place="' + esc(effortKey(place)) + '"><summary>' +
        '<span class="places-art">' + (place.image ? '<img src="' + esc(place.image) + '?v=20260905-1" alt="" width="52" height="52" loading="lazy">' : "") + "</span>" +
        '<span class="places-headline"><strong>' + esc(place.name) + "</strong>" + preview + "</span>" +
        found +
        '<span class="places-cue" aria-hidden="true"></span>' +
      "</summary>" +
      '<div class="places-detail">' + effortRow(place) +
        '<p class="places-actions">' + line + "</p>" +
        (blocked || missing ? "" : rowsMarkup(result, quests, tower)) +
        (place.buddyUrl ? '<p class="places-source"><a href="' + esc(place.buddyUrl) + '" target="_blank" rel="noopener">Open ' + esc(place.name) + " on Buddy's Almanac</a></p>" : "") +
      "</div></details>";
    }).join("");

    root.innerHTML = controls() + '<div class="places-list">' + (cards || '<p class="places-none">Nothing recorded for this yet.</p>') + "</div>";
    bind();
  }

  function update(patch) {
    Object.assign(prefs, patch);
    writeJson(PREFS_KEY, prefs);
    render();
  }

  function reopen(ids) {
    ids.forEach((id) => {
      const card = [...root.querySelectorAll("details.places-card")].find((row) => row.dataset.place === id);
      if (card) card.open = true;
    });
  }

  function bind() {
    root.querySelectorAll("[data-mode]").forEach((button) => {
      button.onclick = () => {
        const mode = button.dataset.mode;
        const allowed = (KINDS[mode] || []).map((entry) => entry[0]);
        update({ mode, kind: allowed.indexOf(prefs.kind) >= 0 ? prefs.kind : allowed[0] });
      };
    });
    const scaled = root.querySelector("[data-scaled]");
    if (scaled) scaled.onclick = () => update({ scaled: !prefs.scaled });
    const only = root.querySelector("[data-only]");
    if (only) only.onclick = () => update({ onlyNeeded: !prefs.onlyNeeded });
    const amount = root.querySelector("#placesAmount");
    if (amount) amount.onchange = () => update({ amount: Math.max(0, Number(amount.value) || 0) });
    const kind = root.querySelector("#placesKind");
    if (kind) kind.onchange = () => update({ kind: kind.value });

    // Re-rendering on every keystroke would take the caret with it, so the
    // search waits for a pause and then puts the caret back where it was.
    const want = root.querySelector("#placesWant");
    if (want) {
      let timer = null;
      want.oninput = () => {
        clearTimeout(timer);
        const at = want.selectionStart;
        timer = setTimeout(() => {
          update({ want: want.value });
          const again = root.querySelector("#placesWant");
          if (again) { again.focus(); again.setSelectionRange(at, at); }
        }, 260);
      };
    }

    root.querySelectorAll("[data-effort]").forEach((input) => {
      input.onchange = () => {
        const id = input.dataset.effort;
        const value = Math.max(0, Number(input.value) || 0);
        if (value > 0) effort[id] = { stamina: value };
        else delete effort[id];
        writeJson(EFFORT_KEY, effort);
        const open = [...root.querySelectorAll("details.places-card[open]")].map((row) => row.dataset.place);
        render();
        reopen(open);
      };
    });
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-item]");
    if (!button) return;
    if (window.FRPG_openItem) window.FRPG_openItem(button.dataset.openItem);
  });

  window.FRPG_renderPlaces = render;
  render();
  // gather-model.js and the quest model load after this file, so the first
  // pass cannot know what the tracked questline still needs. Draw again once
  // everything is on the page.
  window.addEventListener("load", render);
})();

// Trips page: the player writes down what they are going to do - "100 Arnold
// Palmers in the Forest", "50,000 stamina at Whispering Creek", "2,000 Large
// Nets at Forest Pond" - and sees everything those trips bring home, added up
// into one list next to what they already hold.
//
// Nothing here is chosen for them. The rates, perks, meals and effectiveness
// all come from the Places page (window.FRPG_PLACES), so the two pages always
// agree about what a pour is worth.
(() => {
  const root = document.getElementById("tripsBody");
  const ART = window.FRPG_ITEM_ART_HELPER;
  if (!root) return;

  const KEY = "frpg_trips_v1";
  const SNAPSHOT_KEY = "frpg_account_snapshot_v1";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const whole = (value) => Math.round(value || 0).toLocaleString("en-US");
  const count = (value) => {
    if (!(value > 0)) return "0";
    if (value >= 100) return whole(value);
    if (value >= 10) return value.toFixed(0);
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(2);
  };
  const key = (name) => String(name || "").trim().toLowerCase();

  const read = (name, fallback) => {
    try {
      const raw = localStorage.getItem(name);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed == null ? fallback : parsed;
    } catch (_) { return fallback; }
  };
  const write = (name, value) => {
    try { localStorage.setItem(name, JSON.stringify(value)); } catch (_) { /* private mode */ }
  };

  let trips = read(KEY, []);
  if (!Array.isArray(trips)) trips = [];
  let filter = "";
  let nextId = trips.reduce((max, trip) => Math.max(max, Number(trip.id) || 0), 0) + 1;

  const api = () => window.FRPG_PLACES;
  const placesFor = (mode) => (api() ? api().list().filter((place) => place.mode === mode) : []);
  const kindsFor = (mode) => (api() ? api().kinds[mode] || [] : []);

  function save() { write(KEY, trips); }

  function addTrip() {
    const mode = trips.length ? trips[trips.length - 1].mode : "explore";
    const place = (placesFor(mode)[0] || {}).name || "";
    const kind = (kindsFor(mode)[0] || [])[0] || "ap";
    trips.push({ id: nextId++, mode, place, kind, amount: 0 });
    save();
    render();
  }

  // What the player already holds, from their own account capture. Nothing
  // here when no farm is loaded - the haul is then shown on its own.
  function holdings() {
    const map = new Map();
    const snapshot = read(SNAPSHOT_KEY, null);
    for (const row of (snapshot && snapshot.inventory) || []) {
      const name = row.name || row.itemName;
      const qty = Number(row.quantity ?? row.count ?? row.qty);
      if (name && Number.isFinite(qty)) map.set(key(name), qty);
    }
    const cap = Number(snapshot && snapshot.capacity && snapshot.capacity.inventoryMaximum) || null;
    return { map, cap, has: map.size > 0 };
  }

  function kindLabel(mode, kind) {
    const row = kindsFor(mode).find((entry) => entry[0] === kind);
    return row ? row[1] : kind;
  }

  function tripResult(trip) {
    if (!api() || !trip.place || !(trip.amount > 0)) return null;
    return api().haul(trip.mode, trip.place, trip.kind, trip.amount);
  }

  function tripRow(trip, result) {
    const places = placesFor(trip.mode);
    const kinds = kindsFor(trip.mode);
    const found = result && !result.missing ? result.rows.reduce((sum, row) => sum + (row.expected || 0), 0) : 0;
    const bits = [];
    if (result && result.missing) {
      bits.push("No rates for " + esc(trip.place) + " with " + esc(kindLabel(trip.mode, trip.kind)) + " — try a different thing to spend.");
    } else if (result) {
      bits.push("about <b>" + whole(found) + "</b> items");
      if (result.actions != null && trip.kind !== "explores" && trip.kind !== "casts") {
        bits.push(whole(result.actions) + (trip.mode === "fishing" ? " casts" : " explores"));
      }
      if (result.stamina != null && trip.kind !== "stamina") bits.push(whole(result.stamina) + " stamina");
    }
    return '<div class="trip-row" data-trip="' + trip.id + '">' +
      '<label class="trip-field"><span>Doing</span><select data-field="mode">' +
        '<option value="explore"' + (trip.mode === "explore" ? " selected" : "") + ">Exploring</option>" +
        '<option value="fishing"' + (trip.mode === "fishing" ? " selected" : "") + ">Fishing</option>" +
      "</select></label>" +
      '<label class="trip-field grow"><span>at</span><select data-field="place">' +
        places.map((place) => '<option value="' + esc(place.name) + '"' + (place.name === trip.place ? " selected" : "") + ">" + esc(place.name) + (place.event ? " (event)" : "") + "</option>").join("") +
      "</select></label>" +
      '<label class="trip-field"><span>using</span><input data-field="amount" type="number" min="0" step="1" inputmode="numeric" value="' + (trip.amount > 0 ? trip.amount : "") + '" placeholder="how many"></label>' +
      '<label class="trip-field"><span>of</span><select data-field="kind">' +
        kinds.map((entry) => '<option value="' + entry[0] + '"' + (entry[0] === trip.kind ? " selected" : "") + ">" + esc(entry[1]) + "</option>").join("") +
      "</select></label>" +
      '<button type="button" class="trip-remove" data-remove="' + trip.id + '" aria-label="Remove this trip">✕</button>' +
      (bits.length ? '<p class="trip-sum">' + bits.join(" · ") + "</p>" : "") +
    "</div>";
  }

  function render() {
    if (!api()) {
      root.innerHTML = '<p class="places-none">The places list is still loading.</p>';
      return;
    }
    const hold = holdings();
    const totals = new Map();
    const spent = new Map();
    let stamina = 0;
    const results = trips.map((trip) => {
      const result = tripResult(trip);
      if (result && !result.missing) {
        const label = kindLabel(trip.mode, trip.kind);
        spent.set(label, (spent.get(label) || 0) + (Number(trip.amount) || 0));
        if (result.stamina != null && trip.kind !== "stamina") stamina += result.stamina;
        const add = (name, qty, inside) => {
          if (!(qty > 0)) return;
          const k = key(name);
          const row = totals.get(k) || { name, qty: 0, from: new Set(), inside: new Set() };
          row.qty += qty;
          row.from.add(trip.place);
          if (inside) row.inside.add(inside);
          totals.set(k, row);
        };
        for (const row of result.rows) add(row.name, row.expected);
        for (const row of result.inChests) add(row.name, row.expected, row.chest);
      }
      return result;
    });

    const list = trips.map((trip, i) => tripRow(trip, results[i])).join("");
    const spentLine = [...spent.entries()].map(([label, qty]) => "<b>" + whole(qty) + "</b> " + esc(label)).join(" · ");

    let rows = [...totals.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
    if (filter) rows = rows.filter((row) => key(row.name).includes(filter));
    const table = rows.map((row) => {
      const art = ART && ART.urlFor ? ART.urlFor(row.name) : "";
      const have = hold.map.get(key(row.name)) || 0;
      const after = have + row.qty;
      const over = hold.cap && after > hold.cap;
      return "<tr" + (over ? ' class="over"' : "") + ">" +
        '<td><button type="button" class="places-item" data-open-item="' + esc(row.name) + '">' +
          (art ? '<img src="' + esc(art) + '" alt="" width="24" height="24" loading="lazy">' : '<span class="places-noart"></span>') +
          "<span>" + esc(row.name) + (row.inside.size ? ' <small class="trip-inside">in ' + esc([...row.inside].join(", ")) + "</small>" : "") + "</span></button></td>" +
        '<td class="num"><b>' + count(row.qty) + "</b></td>" +
        (hold.has ? '<td class="num">' + whole(have) + '</td><td class="num">' + whole(after) +
          (over ? ' <small class="trip-cap">over your ' + whole(hold.cap) + " cap</small>" : "") + "</td>" : "") +
        '<td class="trip-from">' + esc([...row.from].join(", ")) + "</td>" +
      "</tr>";
    }).join("");

    root.innerHTML =
      '<div class="trip-list">' + (list || '<p class="places-none">No trips yet.</p>') + "</div>" +
      '<div class="trip-actions"><button type="button" class="primary-action" data-add>Add a trip</button>' +
        (trips.length ? '<button type="button" class="quiet-button" data-clear>Clear all trips</button>' : "") + "</div>" +
      (totals.size
        ? '<section class="trip-haul"><div class="section-heading compact"><div><h2>What you bring home</h2></div>' +
            "<p>" + (spentLine ? "Spending " + spentLine + (stamina > 0 ? " · " + whole(stamina) + " stamina in all" : "") + ". " : "") +
            (hold.has ? "Counted against what your account holds." : "Load your farm on the Account page to see it next to what you already hold.") + "</p></div>" +
            '<label class="places-field grow trip-filter"><span>Find an item</span><input type="search" data-filter value="' + esc(filter) + '" placeholder="anything — try Salt Rock"></label>' +
            '<div class="places-scroll"><table class="places-table trip-table"><thead><tr><th>Item</th><th class="num">From these trips</th>' +
            (hold.has ? '<th class="num">You hold</th><th class="num">After</th>' : "") +
            "<th>From</th></tr></thead><tbody>" + (table || '<tr><td colspan="5">Nothing matches.</td></tr>') + "</tbody></table></div></section>"
        : "");
    bind();
  }

  function bind() {
    const add = root.querySelector("[data-add]");
    if (add) add.onclick = addTrip;
    const clear = root.querySelector("[data-clear]");
    if (clear) clear.onclick = () => { trips = []; save(); render(); };
    root.querySelectorAll("[data-remove]").forEach((button) => {
      button.onclick = () => {
        trips = trips.filter((trip) => String(trip.id) !== button.dataset.remove);
        save();
        render();
      };
    });
    root.querySelectorAll(".trip-row").forEach((rowEl) => {
      const trip = trips.find((row) => String(row.id) === rowEl.dataset.trip);
      if (!trip) return;
      rowEl.querySelectorAll("[data-field]").forEach((input) => {
        input.onchange = () => {
          const field = input.dataset.field;
          if (field === "amount") trip.amount = Math.max(0, Number(input.value) || 0);
          else trip[field] = input.value;
          if (field === "mode") {
            trip.place = (placesFor(trip.mode)[0] || {}).name || "";
            trip.kind = (kindsFor(trip.mode)[0] || [])[0] || "";
          }
          save();
          render();
        };
      });
    });
    const search = root.querySelector("[data-filter]");
    if (search) {
      let timer = null;
      search.oninput = () => {
        clearTimeout(timer);
        const at = search.selectionStart;
        timer = setTimeout(() => {
          filter = key(search.value);
          render();
          const again = root.querySelector("[data-filter]");
          if (again) { again.focus(); again.setSelectionRange(at, at); }
        }, 250);
      };
    }
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-item]");
    if (button && window.FRPG_openItem) window.FRPG_openItem(button.dataset.openItem);
  });

  window.FRPG_renderTrips = render;
  render();
  window.addEventListener("load", render);
})();

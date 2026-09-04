(function () {
  const MODEL = window.FRPG_QUEST_MODEL;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const picker = document.getElementById("inventoryQuestline");
  const search = document.getElementById("inventorySearch");
  const summary = document.getElementById("inventorySummary");
  const ownedRoot = document.getElementById("inventoryOwned");
  const nextRoot = document.getElementById("inventoryNext");
  const wholeRoot = document.getElementById("inventoryWhole");
  if (!MODEL || !ART || !picker || !search || !summary || !ownedRoot || !nextRoot || !wholeRoot) return;

  const itemRows = ((((window.FRPG_DATA || {}).items || {}).items) || []);
  const byId = new Map(itemRows.map((item) => [String(item.id), item]));
  const byName = new Map(itemRows.map((item) => [String(item.name || "").trim().toLowerCase(), item]));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const keyFor = (name) => String(name || "").trim().toLowerCase();

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (_) { return null; }
  }

  function inventoryRows() {
    const saved = readJson("frpg_owned");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return Object.entries(saved).map(([id, quantity]) => {
        const item = byId.get(String(id));
        return item && Number(quantity) > 0 ? { name: item.name, quantity: Number(quantity), item } : null;
      }).filter(Boolean);
    }
    const snapshot = readJson("frpg_account_snapshot_v1");
    const rows = (snapshot && snapshot.inventory) || [];
    return rows.map((row) => {
      const name = row.name || row.itemName || "";
      const item = byName.get(keyFor(name)) || null;
      return name && Number(row.quantity) > 0 ? { name, quantity: Number(row.quantity), item } : null;
    }).filter(Boolean);
  }

  function artMarkup(name, className) {
    const src = ART.urlFor(name);
    if (src) return `<span class="inventory-art ${className || ""}"><img src="${esc(src)}" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer"></span>`;
    if (ART.isCurrency(name)) return `<span class="inventory-art inventory-currency-art" aria-hidden="true"></span>`;
    return `<span class="inventory-art ${className || ""} is-missing" aria-hidden="true">•</span>`;
  }

  function itemControl(name, quantity, extra) {
    const content = `${artMarkup(name)}<span><b>${esc(name)}</b>${extra || ""}</span>`;
    if (!ART.isCurrency(name) && ART.itemFor(name)) {
      return `<button type="button" class="inventory-item-link" data-open-item="${esc(name)}" data-open-qty="${Number(quantity) || 0}" title="Open ${esc(name)} in the calculator">${content}</button>`;
    }
    return `<span class="inventory-item-link is-static">${content}</span>`;
  }

  function trackedLine() {
    try { return localStorage.getItem("frpg_tracked_line") || ""; }
    catch (_) { return ""; }
  }

  function ownedMap(rows) {
    const map = new Map();
    for (const row of rows) map.set(keyFor(row.name), (map.get(keyFor(row.name)) || 0) + Number(row.quantity || 0));
    return map;
  }

  function summarizeRequirements(quests) {
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

  function requirementRows(requirements, have) {
    return requirements.map((row) => {
      const currency = ART.isCurrency(row.name);
      const owned = currency ? null : Number(have.get(keyFor(row.name)) || 0);
      return { ...row, owned, short: Math.max(0, Number(row.quantity || 0) - Number(owned || 0)), currency };
    }).sort((a, b) => Number(b.short > 0) - Number(a.short > 0) || b.short - a.short || a.name.localeCompare(b.name));
  }

  function tableMarkup(rows, emptyCopy) {
    if (!rows.length) return `<div class="inventory-empty"><strong>${esc(emptyCopy)}</strong></div>`;
    return `<div class="inventory-requirements" role="table"><div class="inventory-row inventory-row-head" role="row"><span role="columnheader">Item</span><span role="columnheader">Needed</span><span role="columnheader">You have</span><span role="columnheader">Still short</span></div>${rows.map((row) => `<div class="inventory-row${row.short > 0 ? " is-short" : " is-covered"}" role="row"><span role="cell">${itemControl(row.name, row.quantity, row.currency ? `<small>Currency</small>` : "")}</span><b role="cell">${fmt.format(row.quantity)}</b><span role="cell">${row.owned == null ? "—" : fmt.format(row.owned)}</span><strong role="cell">${fmt.format(row.short)}</strong></div>`).join("")}</div>`;
  }

  function renderOwned(rows) {
    const query = keyFor(search.value);
    const visible = rows.filter((row) => !query || keyFor(row.name).includes(query)).sort((a, b) => a.name.localeCompare(b.name));
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    summary.innerHTML = `<span><strong>${fmt.format(rows.length)}</strong> distinct items</span><span><strong>${fmt.format(total)}</strong> held in total</span>`;
    if (!rows.length) {
      ownedRoot.innerHTML = `<div class="inventory-empty"><strong>Nothing in your inventory yet.</strong><span>Import an account capture or add owned amounts in the calculator.</span></div>`;
      return;
    }
    if (!visible.length) {
      ownedRoot.innerHTML = `<div class="inventory-empty"><strong>No items match that search.</strong><span>Try a shorter item name.</span></div>`;
      return;
    }
    ownedRoot.innerHTML = visible.map((row) => `<div class="inventory-owned-item">${itemControl(row.name, row.quantity, `<small>${fmt.format(row.quantity)} held</small>`)}</div>`).join("");
  }

  function renderPlan(rows) {
    const lineName = trackedLine();
    picker.value = MODEL.lines.some((line) => line.name === lineName) ? lineName : "";
    if (!lineName) {
      const empty = `<div class="inventory-empty"><strong>Nothing tracked yet.</strong><span>Choose a questline above or press Track on the Quests tab.</span></div>`;
      nextRoot.innerHTML = empty;
      wholeRoot.innerHTML = empty;
      return;
    }

    const completed = MODEL.completedSet();
    const remaining = MODEL.quests.filter((quest) => quest.line === lineName && !completed.has(MODEL.normalizeTitle(quest.title)));
    if (!remaining.length) {
      const done = `<div class="inventory-empty is-finished"><strong>This questline is finished.</strong><span>Choose another line when you are ready.</span></div>`;
      nextRoot.innerHTML = done;
      wholeRoot.innerHTML = done;
      return;
    }

    const have = ownedMap(rows);
    const next = remaining[0];
    const nextRows = requirementRows(summarizeRequirements([next]), have);
    const wholeRows = requirementRows(summarizeRequirements(remaining), have);
    const covered = wholeRows.filter((row) => row.short === 0).length;
    const short = wholeRows.length - covered;
    const nextLabel = next.pending ? "Planning estimate · title not available in game yet" : `Step ${next.sagaStep || next.sequence || 1}`;

    nextRoot.innerHTML = `<header class="inventory-panel-heading"><span>${esc(nextLabel)}</span><h2>${esc(next.title)}</h2></header>${tableMarkup(nextRows, "No item requirement is recorded for this quest.")}`;
    wholeRoot.innerHTML = `<header class="inventory-panel-heading"><span>${remaining.length} step${remaining.length === 1 ? "" : "s"} left</span><h2>${esc(lineName)}</h2></header>${tableMarkup(wholeRows, "No remaining item requirements are recorded.")}<footer class="inventory-total"><b>${wholeRows.length} distinct item${wholeRows.length === 1 ? "" : "s"}</b><span>${covered} fully covered</span><span>${short} still short</span></footer>`;
  }

  function render() {
    const rows = inventoryRows();
    renderOwned(rows);
    renderPlan(rows);
  }

  picker.innerHTML = `<option value="">Choose a questline…</option>${MODEL.lines.map((line) => `<option value="${esc(line.name)}">${esc(line.name)}</option>`).join("")}`;
  picker.addEventListener("change", () => {
    if (picker.value) localStorage.setItem("frpg_tracked_line", picker.value);
    else localStorage.removeItem("frpg_tracked_line");
    window.dispatchEvent(new CustomEvent("frpg:tracked-line", { detail: picker.value }));
    render();
  });
  search.addEventListener("input", render);
  document.getElementById("inventory")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-item]");
    if (button) window.FRPG_openItem && window.FRPG_openItem(button.dataset.openItem, button.dataset.openQty);
  });
  document.querySelector('[data-tab="inventory"]')?.addEventListener("click", render);
  window.addEventListener("frpg:tracked-line", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") render();
  });
  render();
})();

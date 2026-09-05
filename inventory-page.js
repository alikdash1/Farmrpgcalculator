(function () {
  // The Inventory tab is only what you hold. Gather planning lives in the
  // floating tracker, which is on every page — having both meant reading the
  // same two lists twice.
  const MODEL = window.FRPG_QUEST_MODEL;
  const GATHER = window.FRPG_GATHER;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const search = document.getElementById("inventorySearch");
  const summary = document.getElementById("inventorySummary");
  const ownedRoot = document.getElementById("inventoryOwned");
  const trackingNote = document.getElementById("inventoryTracking");
  if (!MODEL || !GATHER || !ART || !search || !summary || !ownedRoot || !trackingNote) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const keyFor = (name) => String(name || "").trim().toLowerCase();

  function artMarkup(name, className) {
    const src = ART.urlFor(name);
    if (src) return `<span class="inventory-art ${className || ""}"><img src="${esc(src)}" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer"></span>`;
    if (ART.isCurrency(name)) return `<span class="inventory-art inventory-currency-art" aria-hidden="true"></span>`;
    return `<span class="inventory-art ${className || ""} is-missing" aria-hidden="true">•</span>`;
  }

  // Where the item comes from, from the data already loaded.
  function sourceHint(name) {
    const where = typeof GATHER.whereFor === "function" ? GATHER.whereFor(name) : "";
    return where ? `<small class="inventory-source">${esc(where)}</small>` : "";
  }

  function itemControl(name, quantity, extra) {
    const content = `${artMarkup(name)}<span><b>${esc(name)}</b>${extra || ""}</span>`;
    if (!ART.isCurrency(name) && ART.itemFor(name)) {
      return `<button type="button" class="inventory-item-link" data-open-item="${esc(name)}" data-open-qty="${Number(quantity) || 0}" title="Open ${esc(name)} in the calculator">${content}</button>`;
    }
    return `<span class="inventory-item-link is-static">${content}</span>`;
  }

  function renderTracking(plan) {
    const chose = typeof GATHER.hasStoredChoice === "function" && GATHER.hasStoredChoice() && !GATHER.trackedLine();
    if (!plan.lineName) {
      trackingNote.innerHTML = chose
        ? `Not tracking anything. Press <b>Track</b> on a questline in Quests and it appears in the corner.`
        : `Everything on your list is finished.`;
      return;
    }
    const short = plan.nextRows.filter((row) => row.short > 0).length;
    trackingNote.innerHTML = (plan.auto
      ? `Tracking <b>${esc(plan.lineName)}</b> — the questline you have the most left to do on.`
      : `Tracking <b>${esc(plan.lineName)}</b>.`)
      + ` <small class="inventory-diag">${plan.remaining.length} step${plan.remaining.length === 1 ? "" : "s"} left · ${plan.wholeRows.length} items · ${short} short for the step you are on. The corner panels have the lists.</small>`;
  }

  function renderOwned(rows) {
    const query = keyFor(search.value);
    const visible = rows.filter((row) => !query || keyFor(row.name).includes(query)).sort((a, b) => a.name.localeCompare(b.name));
    const total = rows.reduce((sum, row) => sum + row.quantity, 0);
    // Say plainly when rows were left out, rather than letting the count look
    // wrong for no visible reason.
    const ignored = typeof GATHER.ignoredCount === "function" ? GATHER.ignoredCount() : 0;
    summary.innerHTML = `<span><strong>${fmt.format(rows.length)}</strong> distinct items</span><span><strong>${fmt.format(total)}</strong> held in total</span>`
      + (ignored ? `<span class="inventory-ignored" title="Farm RPG prints a description under each item name. An older capture stored those as items; capturing again clears them."><strong>${fmt.format(ignored)}</strong> rows ignored — Farm RPG description text, not items</span>` : "");

    if (!rows.length) {
      ownedRoot.innerHTML = `<div class="inventory-empty"><strong>Nothing in your inventory yet.</strong><span>Import an account capture or add owned amounts in the calculator.</span></div>`;
      return;
    }
    if (!visible.length) {
      ownedRoot.innerHTML = `<div class="inventory-empty"><strong>No items match that search.</strong><span>Try a shorter item name.</span></div>`;
      return;
    }
    ownedRoot.innerHTML = visible.map((row) => `<div class="inventory-owned-item">${itemControl(row.name, row.quantity, `<small>${fmt.format(row.quantity)} held</small>${sourceHint(row.name)}`)}</div>`).join("");
  }

  function render() {
    const plan = GATHER.plan();
    renderOwned(plan.stock);
    renderTracking(plan);
  }

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

(function () {
  const MODEL = window.FRPG_QUEST_MODEL;
  const GATHER = window.FRPG_GATHER;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const trackingNote = document.getElementById("inventoryTracking");
  const overlay = document.getElementById("inventoryOverlay");
  const overlayTitle = document.getElementById("inventoryOverlayTitle");
  const overlayMeta = document.getElementById("inventoryOverlayMeta");
  const overlayBody = document.getElementById("inventoryOverlayBody");
  const search = document.getElementById("inventorySearch");
  const summary = document.getElementById("inventorySummary");
  const ownedRoot = document.getElementById("inventoryOwned");
  const nextRoot = document.getElementById("inventoryNext");
  const wholeRoot = document.getElementById("inventoryWhole");
  if (!MODEL || !GATHER || !ART || !search || !summary || !ownedRoot || !nextRoot || !wholeRoot || !trackingNote || !overlay || !overlayTitle || !overlayMeta || !overlayBody) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const keyFor = (name) => String(name || "").trim().toLowerCase();


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

  // Where the item comes from, from the data already loaded. Knowing you need
  // 84,000 Cannons matters less than knowing they are crafted.
  function sourceHint(name) {
    const where = typeof GATHER.whereFor === "function" ? GATHER.whereFor(name) : "";
    return where ? `<small class="inventory-source">${esc(where)}</small>` : "";
  }

  function tableMarkup(rows, emptyCopy) {
    if (!rows.length) return `<div class="inventory-empty"><strong>${esc(emptyCopy)}</strong></div>`;
    return `<div class="inventory-requirements" role="table"><div class="inventory-row inventory-row-head" role="row"><span role="columnheader">Item</span><span role="columnheader">Needed</span><span role="columnheader">You have</span><span role="columnheader">Still short</span></div>${rows.map((row) => `<div class="inventory-row${row.short > 0 ? " is-short" : " is-covered"}" role="row"><span role="cell">${itemControl(row.name, row.quantity, row.currency ? `<small>Currency</small>` : sourceHint(row.name))}</span><b role="cell">${fmt.format(row.quantity)}</b><span role="cell">${row.owned == null ? "—" : fmt.format(row.owned)}</span><strong role="cell">${fmt.format(row.short)}</strong></div>`).join("")}</div>`;
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
    ownedRoot.innerHTML = visible.map((row) => `<div class="inventory-owned-item">${itemControl(row.name, row.quantity, `<small>${fmt.format(row.quantity)} held</small>`)}</div>`).join("");
  }

  let expanded = { title: "", meta: "", rows: [] };

  function openExpanded() {
    overlayTitle.textContent = expanded.title;
    overlayMeta.textContent = expanded.meta;
    // A shared column header cannot line up once the list wraps into three
    // columns, so each row carries its own labels here instead.
    overlayBody.innerHTML = expanded.rows.length
      ? `<div class="inventory-wide">${expanded.rows.map((row) => `<div class="inventory-wide-row${row.short > 0 ? " is-short" : " is-covered"}">${itemControl(row.name, row.quantity, row.currency ? `<small>Currency</small>` : "")}<span class="inventory-wide-nums"><span><i>Need</i><b>${fmt.format(row.quantity)}</b></span><span><i>Have</i><b>${row.owned == null ? "—" : fmt.format(row.owned)}</b></span><span><i>Short</i><b>${fmt.format(row.short)}</b></span></span></div>`).join("")}</div>`
      : `<div class="inventory-empty"><strong>No remaining item requirements are recorded.</strong></div>`;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("inventoryOverlayClose").focus();
  }

  function closeExpanded() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function renderPlan(plan) {
    const { lineName, auto, stock, remaining, next } = plan;

    const chose = typeof GATHER.hasStoredChoice === "function" && GATHER.hasStoredChoice() && !GATHER.trackedLine();
    trackingNote.innerHTML = !lineName && chose
      ? `Not tracking anything. Press <b>Track</b> on a questline in Quests to follow it here.`
      : lineName
      ? (auto
        ? `Showing <b>${esc(lineName)}</b> — the questline you have the most left to do on. Press <b>Track</b> on any questline in Quests to follow a different one.`
        : `Tracking <b>${esc(lineName)}</b>. Press <b>Track</b> on another questline in Quests to switch.`)
      : "Everything on your list is finished. Nothing left to gather for.";

    if (!lineName) {
      const cleared = chose;
      const empty = cleared
        ? `<div class="inventory-empty"><strong>Nothing tracked.</strong><span>Press <b>Track</b> on any questline in Quests and its remaining items appear here.</span></div>`
        : `<div class="inventory-empty is-finished"><strong>No questline left to gather for.</strong><span>Every questline in your list is complete.</span></div>`;
      nextRoot.innerHTML = empty;
      wholeRoot.innerHTML = empty;
      return;
    }

    if (!remaining.length) {
      const done = `<div class="inventory-empty is-finished"><strong>This questline is finished.</strong><span>Choose another line when you are ready.</span></div>`;
      nextRoot.innerHTML = done;
      wholeRoot.innerHTML = done;
      return;
    }

    // Without an imported inventory every "still short" equals the full amount.
    // Say so once, rather than letting a column of zeroes imply the player owns
    // nothing in the game.
    const noInventory = stock.length === 0
      ? `<p class="inventory-caveat">No inventory imported yet, so <b>You have</b> reads nothing and <b>Still short</b> shows the full amount. Import your account on the Account tab to net these against what you hold.</p>`
      : "";
    const nextRows = plan.nextRows;
    const wholeRows = plan.wholeRows;
    const covered = wholeRows.filter((row) => row.short === 0).length;
    const short = wholeRows.length - covered;
    const nextLabel = next.pending ? "Planning estimate · title not available in game yet" : `Step ${next.sagaStep || next.sequence || 1}`;

    const trackerHidden = (() => { try { return localStorage.getItem("frpg_tracker_hidden") === "1"; } catch (_) { return false; } })();
    if (trackerHidden) {
      trackingNote.innerHTML += ` <button type="button" class="quiet-button inventory-show-tracker" data-show-tracker>Show the corner tracker</button>`;
    }
    trackingNote.innerHTML += ` <small class="inventory-diag">${remaining.length} step${remaining.length === 1 ? "" : "s"} left · ${plan.wholeRows.length} items · ${stock.length} in your inventory</small>`;
    nextRoot.innerHTML = `<header class="inventory-panel-heading"><span>${esc(nextLabel)}</span><h2>${esc(next.title)}</h2></header>${noInventory}${tableMarkup(nextRows, "No item requirement is recorded for this quest.")}`;
    const wholeMeta = `${remaining.length} step${remaining.length === 1 ? "" : "s"} left · ${wholeRows.length} distinct item${wholeRows.length === 1 ? "" : "s"} · ${covered} fully covered · ${short} still short`;
    expanded = { title: lineName, meta: wholeMeta, rows: wholeRows };
    wholeRoot.innerHTML = `<header class="inventory-panel-heading"><span>${remaining.length} step${remaining.length === 1 ? "" : "s"} left</span><h2>${esc(lineName)}</h2><button type="button" class="inventory-expand" data-expand-whole>Expand</button></header>${noInventory}${tableMarkup(wholeRows, "No remaining item requirements are recorded.")}<footer class="inventory-total"><b>${wholeRows.length} distinct item${wholeRows.length === 1 ? "" : "s"}</b><span>${covered} fully covered</span><span>${short} still short</span></footer>`;
  }

  function render() {
    const plan = GATHER.plan();
    renderOwned(plan.stock);
    renderPlan(plan);
  }


  search.addEventListener("input", render);
  document.getElementById("inventory")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-show-tracker]")) {
      window.FRPG_showTracker && window.FRPG_showTracker();
      return render();
    }
    if (event.target.closest("[data-expand-whole]")) return openExpanded();
    const button = event.target.closest("[data-open-item]");
    if (button) window.FRPG_openItem && window.FRPG_openItem(button.dataset.openItem, button.dataset.openQty);
  });
  document.getElementById("inventoryOverlayClose").addEventListener("click", closeExpanded);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeExpanded();
  });
  document.querySelector('[data-tab="inventory"]')?.addEventListener("click", render);
  window.addEventListener("frpg:tracked-line", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") render();
  });
  render();
})();

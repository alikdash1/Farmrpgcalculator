(function () {
  // A small always-there panel for the questline you are tracking, so the list
  // of what you still need is readable from any tab instead of only from the
  // Inventory page.
  const GATHER = window.FRPG_GATHER;
  const ART = window.FRPG_ITEM_ART_HELPER;
  if (!GATHER || !ART) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const short = (value) => (value >= 100000 ? compact.format(value) : fmt.format(value));

  const read = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : raw; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) { /* private mode */ } };

  const panel = document.createElement("aside");
  panel.id = "questTracker";
  panel.className = "quest-tracker";
  panel.hidden = true;
  document.body.append(panel);

  function art(name) {
    const src = ART.urlFor(name);
    return src
      ? `<img src="${esc(src)}" alt="" width="20" height="20" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="tracker-noart" aria-hidden="true"></span>`;
  }

  function rowsHtml(rows, thisStep) {
    if (!rows.length) return `<li class="tracker-done"><span>Nothing left to gather.</span></li>`;
    return rows.map((row) => {
      const now = thisStep && thisStep.has(row.name);
      const cls = [row.currency ? "is-currency" : "", now ? "is-now" : ""].filter(Boolean).join(" ");
      return `<li${cls ? ` class="${cls}"` : ""}${now ? ' title="Needed for the step you are on"' : ""}>${art(row.name)}<span>${esc(row.name)}</span><b>${short(row.short)}</b></li>`;
    }).join("");
  }

  function render() {
    if (read("frpg_tracker_hidden", "") === "1") { panel.hidden = true; return; }
    const plan = GATHER.plan();
    if (!plan.lineName || !plan.next) { panel.hidden = true; return; }

    const collapsed = read("frpg_tracker_collapsed", "") === "1";
    const big = read("frpg_tracker_big", "") === "1" && !collapsed;
    const nextRows = plan.nextRows.filter((row) => row.short > 0);
    const wholeRows = plan.wholeRows.filter((row) => row.short > 0);

    // Small: the step you are on. Big: everything the line still needs, laid
    // out across the page, with this step's items marked so they stay findable.
    const rows = big ? wholeRows : nextRows;
    const thisStep = big ? new Set(nextRows.map((row) => row.name)) : null;
    const heading = big ? plan.lineName : plan.next.title;
    const sub = big
      ? `${plan.remaining.length} step${plan.remaining.length === 1 ? "" : "s"} left · ${wholeRows.length} items · ${nextRows.length} for this step`
      : plan.lineName;

    panel.hidden = false;
    panel.classList.toggle("is-collapsed", collapsed);
    panel.classList.toggle("is-big", big);
    panel.innerHTML = `
      <header class="tracker-head">
        <button type="button" class="tracker-toggle" data-tracker-collapse aria-expanded="${!collapsed}" title="${collapsed ? "Show" : "Hide"} the list">${collapsed ? "▲" : "▼"}</button>
        <span class="tracker-title"><b>${esc(heading)}</b><small>${esc(sub)}</small></span>
        ${collapsed ? "" : `<button type="button" class="tracker-toggle" data-tracker-size aria-pressed="${big}" title="${big ? "Back to just this quest" : "Show the whole line across the page"}">${big ? "⤡" : "⤢"}</button>`}
        <button type="button" class="tracker-toggle" data-tracker-close title="Hide this until you track something again">✕</button>
      </header>
      ${collapsed ? "" : `<ul class="tracker-list">${rowsHtml(rows, thisStep)}</ul>
        <footer class="tracker-foot">${rows.length} still short<button type="button" data-tracker-open>Open</button></footer>`}
    `;
  }

  panel.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.trackerCollapse !== undefined) {
      write("frpg_tracker_collapsed", panel.classList.contains("is-collapsed") ? "0" : "1");
      return render();
    }
    if (target.dataset.trackerClose !== undefined) {
      write("frpg_tracker_hidden", "1");
      return render();
    }
    if (target.dataset.trackerSize !== undefined) {
      write("frpg_tracker_big", panel.classList.contains("is-big") ? "0" : "1");
      return render();
    }
    if (target.dataset.trackerOpen !== undefined) {
      document.querySelector('[data-tab="inventory"]')?.click();
    }
  });

  // Anything that changes what is tracked, what is owned, or what is done.
  window.addEventListener("frpg:tracked-line", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") setTimeout(render, 0);
  });
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setTimeout(render, 0)));
  window.FRPG_showTracker = () => { write("frpg_tracker_hidden", "0"); render(); };
  render();
})();

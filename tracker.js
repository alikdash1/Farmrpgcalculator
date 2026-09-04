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

  function column(title, subtitle, rows) {
    return `<section class="tracker-col">
      <header><b>${esc(title)}</b><small>${esc(subtitle)}</small></header>
      <ul>${rows.length
        ? rows.map((row) => `<li${row.currency ? ' class="is-currency"' : ""}>${art(row.name)}<span>${esc(row.name)}</span><b>${short(row.short)}</b></li>`).join("")
        : `<li class="tracker-done"><span>Nothing left here.</span></li>`}</ul>
    </section>`;
  }

  function render() {
    if (read("frpg_tracker_hidden", "") === "1") { panel.hidden = true; return; }
    const plan = GATHER.plan();
    if (!plan.lineName || !plan.next) { panel.hidden = true; return; }

    const collapsed = read("frpg_tracker_collapsed", "") === "1";
    const big = read("frpg_tracker_big", "") === "1";
    const nextRows = plan.nextRows.filter((row) => row.short > 0);
    const wholeRows = plan.wholeRows.filter((row) => row.short > 0);
    const steps = `${plan.remaining.length} step${plan.remaining.length === 1 ? "" : "s"} left`;

    panel.hidden = false;
    panel.classList.toggle("is-collapsed", collapsed);
    panel.classList.toggle("is-big", big && !collapsed);
    panel.innerHTML = `
      <header class="tracker-head">
        <button type="button" class="tracker-toggle" data-tracker-collapse aria-expanded="${!collapsed}" title="${collapsed ? "Show" : "Hide"} the list">${collapsed ? "▲" : "▼"}</button>
        <span class="tracker-title"><b>${esc(plan.lineName)}</b><small>${esc(plan.next.title)}</small></span>
        ${collapsed ? "" : `<button type="button" class="tracker-toggle" data-tracker-size aria-pressed="${big}" title="${big ? "Shrink" : "Show everything at once"}">${big ? "⤡" : "⤢"}</button>`}
        <button type="button" class="tracker-toggle" data-tracker-close title="Hide the tracker">✕</button>
      </header>
      ${collapsed ? "" : `
        <div class="tracker-cols">
          ${column("This quest", plan.next.title, nextRows)}
          ${column("Whole line", steps, wholeRows)}
        </div>
        <footer class="tracker-foot">${nextRows.length} short here · ${wholeRows.length} in the line<button type="button" data-tracker-open>Open</button></footer>`}
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

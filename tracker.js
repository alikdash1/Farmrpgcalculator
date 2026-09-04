(function () {
  // Two docked panels, the way the player asked for from the start:
  //   bottom LEFT  — the quest you are on
  //   bottom RIGHT — everything the whole questline still needs
  // They are separate panels, not two halves of one, so each can be collapsed
  // on its own and the right one can be opened across the page.
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

  const panels = {
    next: Object.assign(document.createElement("aside"), { id: "questTrackerNext", className: "quest-tracker is-next" }),
    whole: Object.assign(document.createElement("aside"), { id: "questTrackerWhole", className: "quest-tracker is-whole" }),
  };
  for (const panel of Object.values(panels)) {
    panel.hidden = true;
    document.body.append(panel);
  }

  function art(name) {
    const src = ART.urlFor(name);
    return src
      ? `<img src="${esc(src)}" alt="" width="20" height="20" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="tracker-noart" aria-hidden="true"></span>`;
  }

  function rowsHtml(rows, mark) {
    if (!rows.length) return `<li class="tracker-done"><span>Nothing left to gather.</span></li>`;
    return rows.map((row) => {
      const now = mark && mark.has(row.name);
      const cls = [row.currency ? "is-currency" : "", now ? "is-now" : ""].filter(Boolean).join(" ");
      return `<li${cls ? ` class="${cls}"` : ""}${now ? ' title="Also needed for the step you are on"' : ""}>${art(row.name)}<span>${esc(row.name)}</span><b>${short(row.short)}</b></li>`;
    }).join("");
  }

  function draw(which, { title, subtitle, rows, mark, collapsed, big, canExpand }) {
    const panel = panels[which];
    panel.hidden = false;
    panel.classList.toggle("is-collapsed", collapsed);
    panel.classList.toggle("is-big", !!big && !collapsed);
    panel.innerHTML = `
      <header class="tracker-head">
        <button type="button" class="tracker-toggle" data-collapse="${which}" aria-expanded="${!collapsed}" title="${collapsed ? "Show" : "Hide"} this list">${collapsed ? "▲" : "▼"}</button>
        <span class="tracker-title"><b>${esc(title)}</b><small>${esc(subtitle)}</small></span>
        ${canExpand && !collapsed ? `<button type="button" class="tracker-toggle" data-size aria-pressed="${!!big}" title="${big ? "Back to the corner" : "Open across the page"}">${big ? "⤡" : "⤢"}</button>` : ""}
        <button type="button" class="tracker-toggle" data-close title="Hide until you track something again">✕</button>
      </header>
      ${collapsed ? "" : `<ul class="tracker-list">${rowsHtml(rows, mark)}</ul>
        <footer class="tracker-foot">${rows.length} still short<button type="button" data-open>Open</button></footer>`}
    `;
  }

  function render() {
    if (read("frpg_tracker_hidden", "") === "1") {
      for (const panel of Object.values(panels)) panel.hidden = true;
      return;
    }
    const plan = GATHER.plan();
    if (!plan.lineName || !plan.next) {
      for (const panel of Object.values(panels)) panel.hidden = true;
      return;
    }

    const nextRows = plan.nextRows.filter((row) => row.short > 0);
    const wholeRows = plan.wholeRows.filter((row) => row.short > 0);
    const steps = `${plan.remaining.length} step${plan.remaining.length === 1 ? "" : "s"} left · ${wholeRows.length} items`;

    draw("next", {
      title: plan.next.title,
      subtitle: plan.lineName,
      rows: nextRows,
      collapsed: read("frpg_tracker_next_collapsed", "") === "1",
      canExpand: false,
    });
    draw("whole", {
      title: plan.lineName,
      subtitle: steps,
      rows: wholeRows,
      // The items this step also needs, so they stay findable in a long list.
      mark: new Set(nextRows.map((row) => row.name)),
      collapsed: read("frpg_tracker_whole_collapsed", "") === "1",
      big: read("frpg_tracker_big", "") === "1",
      canExpand: true,
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".quest-tracker button");
    if (!button) return;
    if (button.dataset.collapse) {
      const key = button.dataset.collapse === "next" ? "frpg_tracker_next_collapsed" : "frpg_tracker_whole_collapsed";
      write(key, read(key, "") === "1" ? "0" : "1");
      return render();
    }
    if (button.dataset.size !== undefined) {
      write("frpg_tracker_big", panels.whole.classList.contains("is-big") ? "0" : "1");
      return render();
    }
    if (button.dataset.close !== undefined) {
      write("frpg_tracker_hidden", "1");
      return render();
    }
    if (button.dataset.open !== undefined) {
      document.querySelector('[data-tab="inventory"]')?.click();
    }
  });

  window.addEventListener("frpg:tracked-line", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") setTimeout(render, 0);
  });
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setTimeout(render, 0)));
  window.FRPG_showTracker = () => { write("frpg_tracker_hidden", "0"); render(); };
  render();
})();

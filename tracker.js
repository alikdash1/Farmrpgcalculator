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
      // Every other list in the app opens an item in the calculator on click;
      // this one was the exception. Currency has nothing to open.
      const openable = !row.currency && ART.itemFor(row.name);
      const where = GATHER.whereFor ? GATHER.whereFor(row.name) : "";
      const hint = [where, now ? "Also needed for the step you are on" : ""].filter(Boolean).join(" — ");
      const attrs = openable
        ? ` data-open-item="${esc(row.name)}" data-open-qty="${row.short}" role="button" tabindex="0" title="${esc(hint || ("Work out how to get " + row.name))}"`
        : (hint ? ` title="${esc(hint)}"` : "");
      return `<li${cls ? ` class="${cls}${openable ? " is-openable" : ""}"` : (openable ? ' class="is-openable"' : "")}${attrs}>${art(row.name)}<span>${esc(row.name)}</span><b>${short(row.short)}</b></li>`;
    }).join("");
  }

  let filter = "";
  // A phone cannot host two docked lists — stacked they took two thirds of the
  // screen. On a narrow screen one panel shows, with a switch for which list.
  const narrow = window.matchMedia("(max-width: 620px)");
  let mobileScope = "next";

  function draw(which, { title, subtitle, rows, mark, collapsed, big, canExpand, scopeSwitch }) {
    const panel = panels[which];
    panel.hidden = false;
    panel.classList.toggle("is-collapsed", collapsed);
    panel.classList.toggle("is-big", !!big && !collapsed);
    panel.innerHTML = `
      <header class="tracker-head">
        <button type="button" class="tracker-toggle" data-collapse="${which}" aria-expanded="${!collapsed}" title="${collapsed ? "Show" : "Hide"} this list">${collapsed ? "▲" : "▼"}</button>
        <span class="tracker-title"><b>${esc(title)}</b><small>${esc(subtitle)}</small></span>
        ${scopeSwitch ? `<button type="button" class="tracker-toggle is-scope" data-scope="${mobileScope === "next" ? "whole" : "next"}" title="${mobileScope === "next" ? "Show the whole questline" : "Show just this step"}">${mobileScope === "next" ? "All" : "Step"}</button>` : ""}
        ${canExpand && !collapsed ? `<button type="button" class="tracker-toggle" data-size aria-pressed="${!!big}" title="${big ? "Back to the corner" : "Open across the page"}">${big ? "⤡" : "⤢"}</button>` : ""}
        <button type="button" class="tracker-toggle" data-close title="Hide until you track something again">✕</button>
      </header>
      ${collapsed ? "" : `${big ? `<div class="tracker-filter"><input type="search" data-filter value="${esc(filter)}" placeholder="Filter these ${rows.length} items…" autocomplete="off"></div>` : ""}
        <ul class="tracker-list">${rowsHtml(rows, mark)}</ul>
        <footer class="tracker-foot">${rows.length} still short<span class="tracker-foot-actions">${canExpand ? `<button type="button" data-copy title="Copy as tab-separated rows, ready to paste into a spreadsheet">Copy list</button>` : ""}<button type="button" data-open>Open</button></span></footer>`}
    `;
  }

  // Size the expanded panel to what is actually in it. A 53-item questline was
  // being shown in a box built for 189, with half of it empty. CSS cannot do
  // this: grid-auto-flow: column keeps adding columns until it runs off the
  // side, and auto-fill rows need a height that depends on the rows. So pick a
  // column count, set the rows, measure, and fit the box to the result.
  const ROW_PX = 22;
  const COL_PX = 200;

  function fitColumns() {
    const panel = panels.whole;
    const list = panel.querySelector(".tracker-list");
    if (!list || !panel.classList.contains("is-big")) return;
    const count = list.children.length;
    if (!count) return;

    const maxWidth = Math.min(1020, window.innerWidth - 28);
    const maxHeight = Math.min(window.innerHeight * 0.78, 820);
    const chrome = panel.offsetHeight - list.offsetHeight;
    const maxRows = Math.max(4, Math.floor((maxHeight - chrome) / ROW_PX));
    const maxColumns = Math.max(1, Math.floor(maxWidth / COL_PX));

    // A roughly square block reads better than a tall ribbon or a wide strip,
    // so start from the shape that balances, then take enough columns to avoid
    // scrolling if the height allows it, and never more than the width fits.
    let columns = Math.ceil(Math.sqrt((count * ROW_PX) / COL_PX));
    columns = Math.max(columns, Math.ceil(count / maxRows));
    columns = Math.min(columns, maxColumns, count);

    const applyColumns = (value) => {
      list.style.gridTemplateRows = `repeat(${Math.ceil(count / Math.max(1, value))}, minmax(${ROW_PX}px, max-content))`;
    };

    panel.style.width = maxWidth + "px";
    panel.style.height = "auto";
    applyColumns(columns);
    // Content-sized columns come out wider than any estimate, so step down
    // until the measurement says it genuinely fits rather than trusting it.
    for (let guard = 0; guard < 8 && columns > 1 && list.scrollWidth > list.clientWidth + 1; guard += 1) {
      columns -= 1;
      applyColumns(columns);
    }

    // Now shrink the box onto its contents. scrollWidth is no use here: with
    // nothing overflowing it reports the padding box, which is the panel we are
    // trying to shrink. Measure where the last column actually ends.
    const listBox = list.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(list).paddingRight || 0);
    const rightmost = Math.max(...[...list.children].map((row) => row.getBoundingClientRect().right));
    const contentWidth = (rightmost - listBox.left) + padding + (panel.offsetWidth - list.offsetWidth);
    panel.style.width = Math.min(maxWidth, Math.max(280, Math.ceil(contentWidth))) + "px";
    panel.style.height = Math.min(maxHeight, Math.ceil(panel.scrollHeight)) + "px";

    // Shrinking the box can bring on a vertical scrollbar, which then takes
    // width from the list and pushes the last column past the edge. Give that
    // width back, once, now that the final height is known.
    const gutter = list.scrollWidth - list.clientWidth;
    if (gutter > 0) {
      panel.style.width = Math.min(maxWidth, panel.offsetWidth + gutter) + "px";
    }
  }

  function clearFit() {
    panels.whole.style.width = "";
    panels.whole.style.height = "";
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

    const big = read("frpg_tracker_big", "") === "1";

    if (narrow.matches && !big) {
      const showingStep = mobileScope === "next";
      panels.whole.hidden = true;
      draw("next", {
        title: showingStep ? plan.next.title : plan.lineName,
        subtitle: showingStep ? plan.lineName : steps,
        rows: showingStep ? nextRows : wholeRows,
        mark: showingStep ? null : new Set(nextRows.map((row) => row.name)),
        collapsed: read("frpg_tracker_next_collapsed", "") === "1",
        canExpand: false,
        scopeSwitch: true,
      });
      return;
    }

    draw("next", {
      title: plan.next.title,
      subtitle: plan.lineName,
      rows: nextRows,
      collapsed: read("frpg_tracker_next_collapsed", "") === "1",
      canExpand: false,
    });
    const needle = filter.trim().toLowerCase();
    draw("whole", {
      title: plan.lineName,
      subtitle: steps + (big && needle ? ` · ${wholeRows.filter((row) => row.name.toLowerCase().includes(needle)).length} matching` : ""),
      rows: big && needle ? wholeRows.filter((row) => row.name.toLowerCase().includes(needle)) : wholeRows,
      // The items this step also needs, so they stay findable in a long list.
      mark: new Set(nextRows.map((row) => row.name)),
      collapsed: read("frpg_tracker_whole_collapsed", "") === "1",
      big,
      canExpand: true,
    });
    if (big) fitColumns();
    else clearFit();
  }

  function openItem(node) {
    const row = node && node.closest(".quest-tracker [data-open-item]");
    if (!row) return false;
    window.FRPG_openItem && window.FRPG_openItem(row.dataset.openItem, row.dataset.openQty);
    return true;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panels.whole.classList.contains("is-big")) {
      write("frpg_tracker_big", "0");
      return render();
    }
    if ((event.key === "Enter" || event.key === " ") && openItem(event.target)) event.preventDefault();
  });

  document.addEventListener("input", (event) => {
    if (!event.target.matches(".quest-tracker [data-filter]")) return;
    filter = event.target.value;
    render();
    const field = panels.whole.querySelector("[data-filter]");
    if (field) { field.focus(); field.setSelectionRange(field.value.length, field.value.length); }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".quest-tracker button");
    if (!button) return openItem(event.target), undefined;
    if (button.dataset.scope) {
      mobileScope = button.dataset.scope;
      return render();
    }
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
    if (button.dataset.copy !== undefined) {
      copyList(button);
      return;
    }
    if (button.dataset.open !== undefined) {
      document.querySelector('[data-tab="inventory"]')?.click();
    }
  });

  // Tab-separated, so it pastes straight into a spreadsheet — the player keeps
  // one for this questline already. navigator.clipboard needs a secure context
  // and this app is opened from disk, so the textarea fallback is the path
  // that actually runs.
  function copyList(button) {
    const plan = GATHER.plan();
    const rows = plan.wholeRows.filter((row) => row.short > 0);
    if (!rows.length) return;
    const text = ["Item\tNeeded\tYou have\tStill short"]
      .concat(rows.map((row) => [row.name, row.quantity, row.owned == null ? "" : row.owned, row.short].join("\t")))
      .join("\n");
    const done = (ok) => {
      button.textContent = ok ? "Copied" : "Press Ctrl+C";
      setTimeout(() => { button.textContent = "Copy list"; }, 1800);
    };
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.append(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
    field.remove();
    if (ok) return done(true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
      return;
    }
    done(false);
  }

  narrow.addEventListener("change", render);
  window.addEventListener("resize", fitColumns);
  window.addEventListener("frpg:tracked-line", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") setTimeout(render, 0);
  });
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setTimeout(render, 0)));
  window.FRPG_showTracker = () => { write("frpg_tracker_hidden", "0"); render(); };
  render();
})();

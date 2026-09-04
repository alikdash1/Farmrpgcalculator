(function () {
  const MODEL = window.FRPG_QUEST_MODEL;
  const ART = window.FRPG_ITEM_ART_HELPER;
  const root = document.getElementById("questLines");
  const search = document.getElementById("questSearch");
  const count = document.getElementById("questCount");
  const summary = document.getElementById("questSummary");
  const note = document.getElementById("questAccountNote");
  if (!MODEL || !ART || !root || !search || !count || !summary || !note) return;

  let filter = "unfinished";
  const expanded = new Set();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const NOW = Date.now();
  const isEvent = (quest) => quest.category === "event";
  const hasEnded = (quest) => !!quest.end && Date.parse(quest.end) < NOW;
  const isLive = (quest) => !!(quest.start || quest.end)
    && (!quest.start || Date.parse(quest.start) <= NOW)
    && (!quest.end || Date.parse(quest.end) >= NOW);
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

  function trackedLine() {
    try { return localStorage.getItem("frpg_tracked_line") || ""; }
    catch (_) { return ""; }
  }

  function itemImage(name) {
    const src = ART.urlFor(name);
    if (src) return `<img src="${esc(src)}" alt="" width="34" height="34" loading="lazy" referrerpolicy="no-referrer">`;
    if (ART.isCurrency(name)) return `<span class="quest-item-currency" aria-hidden="true"></span>`;
    return `<span class="quest-item-fallback" aria-hidden="true">•</span>`;
  }

  function requirementHtml(row) {
    const qty = Number(row.quantity || 0);
    const currency = ART.isCurrency(row.item);
    const content = `${itemImage(row.item)}<span><b>${esc(row.item)}</b><small>${fmt.format(qty)}${currency ? " · currency" : ""}</small></span>`;
    if (currency || !ART.itemFor(row.item)) return `<span class="quest-item is-static${currency ? " is-currency" : ""}">${content}</span>`;
    return `<button type="button" class="quest-item" data-open-item="${esc(row.item)}" data-open-qty="${qty}" title="Open ${esc(row.item)} in the calculator">${content}</button>`;
  }

  function questHtml(quest, status) {
    const labels = { completed: "Done", ready: "Ready", active: "In progress", available: "Available", locked: "Locked", unknown: "Not found in capture", untracked: "Import account to track" };
    const requirements = (quest.requirements || []).map(requirementHtml).join("");
    const window_ = isEvent(quest) && (quest.start || quest.end)
      ? `${isLive(quest) ? "Running now" : "Ran"} ${dateLabel(quest.start)}${quest.end ? ` – ${dateLabel(quest.end)}` : ""}`
      : "";
    const pending = quest.pending ? `<small class="quest-pending">Planning estimate · in-game title not available yet</small>` : "";
    const extra = [quest.prerequisite, quest.unlock, window_].filter(Boolean).map((text) => `<small>${esc(text)}</small>`).join("");
    return `<article class="quest-step is-${status}"><div class="quest-step-head"><div><strong>${esc(quest.title)}</strong>${pending}${quest.giver ? `<small>${esc(quest.giver)}</small>` : ""}</div><span>${labels[status]}</span></div>${requirements ? `<div class="quest-items">${requirements}</div>` : `<p class="quest-no-items">No item requirement recorded.</p>`}${extra ? `<div class="quest-extra">${extra}</div>` : ""}</article>`;
  }

  function matchesFilter(status, quest) {
    if (filter === "all") return true;
    if (filter === "events") return isEvent(quest);
    if (filter === "completed") return status === "completed";
    if (isEvent(quest) && hasEnded(quest)) return false;
    if (filter === "available") return ["ready", "active", "available"].includes(status);
    return status !== "completed";
  }

  function render() {
    const snapshot = MODEL.accountSnapshot();
    const sets = MODEL.statusSets(snapshot);
    const query = normalize(search.value);
    const tracking = !!snapshot || MODEL.hasPersonal;
    const tracked = trackedLine();
    const quests = MODEL.quests.map((quest) => ({ ...quest, status: MODEL.statusFor(quest.title, sets, !!snapshot) }));
    const visible = quests.filter((quest) => matchesFilter(quest.status, quest) && (!query || normalize(`${quest.title} ${quest.line} ${quest.giver} ${(quest.requirements || []).map((r) => r.item).join(" ")}`).includes(query)));
    const completed = quests.filter((quest) => quest.status === "completed").length;
    const actionable = quests.filter((quest) => ["ready", "active", "available"].includes(quest.status)).length;
    const mainCount = MODEL.quests.filter((q) => q.category === "main").length;
    const eventCount = MODEL.quests.filter(isEvent).length;

    summary.innerHTML = `<article><span>Quests</span><strong>${MODEL.quests.filter((q) => !q.pending).length}</strong><small>${mainCount} story · ${eventCount} seasonal</small></article><article><span>Questlines</span><strong>${MODEL.lines.length}</strong><small>sequels kept in order</small></article><article><span>Completed</span><strong>${tracking ? completed : "—"}</strong><small>${tracking ? "of every quest listed" : "import account to track"}</small></article><article><span>Available Now</span><strong>${snapshot ? actionable : "—"}</strong><small>${snapshot ? "ready, active, or available" : "import account to see this"}</small></article>`;
    if (!snapshot && MODEL.hasPersonal) {
      const personal = window.FRPG_PERSONAL_QUESTS || {};
      note.innerHTML = `<strong>Using your completed-quest list.</strong><span><b>${MODEL.personalCount.toLocaleString()}</b> finished quests loaded from your own Farm RPG list${personal.capturedAt ? ` (${esc(personal.capturedAt)})` : ""}. Everything else is shown as still to do. Import an account capture as well if you want “Available Now” filled in.</span>`;
    } else if (snapshot) {
      const known = new Set(MODEL.quests.map((quest) => MODEL.normalizeTitle(quest.title)));
      const capturedRows = (((snapshot || {}).quests || {}).completed || []);
      const captured = [...new Set(capturedRows.map((row) => MODEL.normalizeTitle(typeof row === "string" ? row : row && row.title)))];
      const unmatched = captured.filter((title) => !known.has(title));
      const matched = captured.length - unmatched.length;
      const truncated = snapshot.questStats && snapshot.questStats.completedHistoryTruncated;
      const bits = captured.length
        ? [`Matched <b>${matched.toLocaleString()}</b> of <b>${captured.length.toLocaleString()}</b> completed quests in your capture.`]
        : ["Your capture has no completed quests in it — open Farm RPG’s Completed Help Requests page, let it finish loading, then press Sync."];
      if (unmatched.length) bits.push(`${unmatched.length.toLocaleString()} title${unmatched.length === 1 ? "" : "s"} did not match this quest list.`);
      if (truncated) bits.push("Farm RPG truncated the older history, so some finished steps stay untracked.");
      note.innerHTML = `<strong>Using your saved account.</strong><span>${bits.join(" ")}</span>`;
    } else {
      note.innerHTML = `<strong>No account imported.</strong><span>You can still browse every quest. Import your account to mark completed and available steps.</span>`;
    }
    count.textContent = `${visible.length} quest${visible.length === 1 ? "" : "s"}`;

    const grouped = MODEL.lines.map((line) => {
      const all = visible.filter((quest) => quest.line === line.name);
      if (!all.length) return "";
      const done = quests.filter((quest) => quest.line === line.name && quest.status === "completed").length;
      const shouldOpen = expanded.has(line.name) || !!query;
      const tag = line.category === "main" ? "Story" : line.category === "event" ? "Event" : "NPC";
      const ran = line.category === "event" && line.lastEnd ? ` · ${Date.parse(line.lastEnd) < NOW ? "ended" : "running"} ${dateLabel(line.lastEnd)}` : "";
      const isTracked = tracked === line.name;
      return `<details class="quest-line is-${esc(line.category)}" data-line="${esc(line.name)}" ${shouldOpen ? "open" : ""}><summary><span><b>${esc(line.name)}</b><small><i class="quest-line-tag">${tag}</i> ${all.length} shown · ${line.count} total${ran}</small>${line.aka && line.aka.length ? `<small class="quest-line-aka">Also called ${esc(line.aka.join(" · "))}</small>` : ""}</span><span class="quest-line-actions"><span class="quest-line-progress">${tracking ? `${done}/${line.count} done` : "View quests"}</span><button type="button" class="quest-track${isTracked ? " is-tracked" : ""}" data-track-line="${esc(line.name)}" aria-pressed="${isTracked}" title="${isTracked ? "Stop tracking this questline" : "Follow this questline on the Inventory tab"}">${isTracked ? "Tracking ✕" : "Track"}</button></span></summary><div class="quest-line-body">${shouldOpen ? all.map((quest) => questHtml(quest, quest.status)).join("") : ""}</div></details>`;
    }).join("");
    root.innerHTML = grouped || `<div class="quest-empty"><strong>No matching quests.</strong><span>Try another name, item, or filter.</span></div>`;

    root.querySelectorAll("details.quest-line").forEach((details) => {
      details.addEventListener("toggle", () => {
        const line = details.dataset.line;
        if (details.open) expanded.add(line); else expanded.delete(line);
        const body = details.querySelector(".quest-line-body");
        if (details.open && !body.innerHTML) body.innerHTML = visible.filter((quest) => quest.line === line).map((quest) => questHtml(quest, quest.status)).join("");
      });
    });
  }

  let timer;
  search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 100); });
  document.querySelectorAll("[data-quest-filter]").forEach((button) => button.addEventListener("click", () => {
    filter = button.dataset.questFilter;
    document.querySelectorAll("[data-quest-filter]").forEach((row) => row.classList.toggle("active", row === button));
    render();
  }));
  root.addEventListener("click", (event) => {
    const tracker = event.target.closest("[data-track-line]");
    if (tracker) {
      event.preventDefault();
      event.stopPropagation();
      // Press it again to stop tracking. Storing an empty string means "the
      // player chose nothing", which is different from never having chosen —
      // the latter still auto-picks the questline with the most left to do.
      const next = trackedLine() === tracker.dataset.trackLine ? "" : tracker.dataset.trackLine;
      localStorage.setItem("frpg_tracked_line", next);
      window.dispatchEvent(new CustomEvent("frpg:tracked-line", { detail: next }));
      render();
      return;
    }
    const button = event.target.closest("[data-open-item]");
    if (!button || ART.isCurrency(button.dataset.openItem)) return;
    window.FRPG_openItem && window.FRPG_openItem(button.dataset.openItem, button.dataset.openQty);
  });
  document.querySelector('[data-tab="quests"]')?.addEventListener("click", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") setTimeout(render, 0);
  });
  render();
})();

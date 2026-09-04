(function () {
  const DATA = window.FRPG_MAIN_QUESTS || { quests: [], lines: [] };
  const itemRows = (((window.FRPG_DATA || {}).items || {}).items || []);
  const itemMap = new Map(itemRows.map((item) => [String(item.name).toLowerCase(), item]));
  const root = document.getElementById("questLines");
  const search = document.getElementById("questSearch");
  const count = document.getElementById("questCount");
  const summary = document.getElementById("questSummary");
  const note = document.getElementById("questAccountNote");
  if (!root || !search || !count || !summary || !note) return;

  let filter = "unfinished";
  const expanded = new Set();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const NOW = Date.now();
  // A seasonal quest you can no longer start is history, not a to-do. It stays
  // browsable under Events, but it never pads the "Not Done" list.
  const isEvent = (quest) => quest.category === "event";
  const hasEnded = (quest) => !!quest.end && Date.parse(quest.end) < NOW;
  const isLive = (quest) => !!(quest.start || quest.end)
    && (!quest.start || Date.parse(quest.start) <= NOW)
    && (!quest.end || Date.parse(quest.end) >= NOW);
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

  function account() {
    try { return JSON.parse(localStorage.getItem("frpg_account_snapshot_v1") || "null"); }
    catch { return null; }
  }

  function statusSets(snapshot) {
    const quests = (snapshot && snapshot.quests) || {};
    const make = (key) => new Set((quests[key] || []).map((q) => normalize(q.title)));
    return { completed: make("completed"), active: make("active"), ready: make("ready"), available: make("available"), locked: make("locked") };
  }

  function statusFor(title, sets, hasAccount) {
    const key = normalize(title);
    if (sets.completed.has(key)) return "completed";
    if (sets.ready.has(key)) return "ready";
    if (sets.active.has(key)) return "active";
    if (sets.available.has(key)) return "available";
    if (sets.locked.has(key)) return "locked";
    return hasAccount ? "unknown" : "untracked";
  }

  function itemImage(name) {
    const item = itemMap.get(normalize(name));
    return item && item.img
      ? `<img src="https://farmrpg.com${esc(item.img)}" alt="" width="34" height="34" loading="lazy">`
      : `<span class="quest-item-fallback" aria-hidden="true">•</span>`;
  }

  function requirementHtml(row) {
    const qty = Number(row.quantity || 0);
    return `<button type="button" class="quest-item" data-open-item="${esc(row.item)}" data-open-qty="${qty}" title="Open ${esc(row.item)} in the calculator">${itemImage(row.item)}<span><b>${esc(row.item)}</b><small>${fmt.format(qty)}</small></span></button>`;
  }

  function questHtml(quest, status) {
    const labels = { completed: "Done", ready: "Ready", active: "In progress", available: "Available", locked: "Locked", unknown: "Not found in capture", untracked: "Import account to track" };
    const requirements = (quest.requirements || []).map(requirementHtml).join("");
    const window_ = isEvent(quest) && (quest.start || quest.end)
      ? `${isLive(quest) ? "Running now" : "Ran"} ${dateLabel(quest.start)}${quest.end ? ` – ${dateLabel(quest.end)}` : ""}`
      : "";
    const extra = [quest.prerequisite, quest.unlock, window_].filter(Boolean).map((text) => `<small>${esc(text)}</small>`).join("");
    return `<article class="quest-step is-${status}"><div class="quest-step-head"><div><strong>${esc(quest.title)}</strong>${quest.giver ? `<small>${esc(quest.giver)}</small>` : ""}</div><span>${labels[status]}</span></div>${requirements ? `<div class="quest-items">${requirements}</div>` : `<p class="quest-no-items">No item requirement recorded.</p>`}${extra ? `<div class="quest-extra">${extra}</div>` : ""}</article>`;
  }

  function matchesFilter(status, quest) {
    if (filter === "all") return true;
    if (filter === "events") return isEvent(quest);
    if (filter === "completed") return status === "completed";
    // Everything else is about what you can still act on, so finished seasonal
    // quests drop out — a closed event is not work you can pick up.
    if (isEvent(quest) && hasEnded(quest)) return false;
    if (filter === "available") return ["ready", "active", "available"].includes(status);
    return status !== "completed";
  }

  function render() {
    const snapshot = account();
    const sets = statusSets(snapshot);
    const query = normalize(search.value);
    const quests = DATA.quests.map((quest) => ({ ...quest, status: statusFor(quest.title, sets, !!snapshot) }));
    const visible = quests.filter((quest) => matchesFilter(quest.status, quest) && (!query || normalize(`${quest.title} ${quest.line} ${quest.giver} ${(quest.requirements || []).map((r) => r.item).join(" ")}`).includes(query)));
    const completed = quests.filter((quest) => quest.status === "completed").length;
    const actionable = quests.filter((quest) => ["ready", "active", "available"].includes(quest.status)).length;

    const mainCount = DATA.quests.filter((q) => q.category === "main").length;
    const eventCount = DATA.quests.filter(isEvent).length;
    summary.innerHTML = `<article><span>Quests</span><strong>${DATA.quests.length}</strong><small>${mainCount} story · ${eventCount} seasonal</small></article><article><span>Questlines</span><strong>${DATA.lines.length}</strong><small>sequels kept in order</small></article><article><span>Completed</span><strong>${snapshot ? completed : "—"}</strong><small>${snapshot ? "found in your capture" : "import account to track"}</small></article><article><span>Available Now</span><strong>${snapshot ? actionable : "—"}</strong><small>${snapshot ? "ready, active, or available" : "import account to track"}</small></article>`;
    note.innerHTML = snapshot
      ? `<strong>Using your saved account.</strong><span>${snapshot.questStats && snapshot.questStats.completedHistoryTruncated ? "Older completed quests may be missing from the capture, so some finished steps can appear untracked." : "Quest status is matched from your latest imported capture."}</span>`
      : `<strong>No account imported.</strong><span>You can still browse every main quest. Import your account to mark completed and available steps.</span>`;
    count.textContent = `${visible.length} quest${visible.length === 1 ? "" : "s"}`;

    const grouped = DATA.lines.map((line) => {
      const all = visible.filter((quest) => quest.line === line.name);
      if (!all.length) return "";
      const done = quests.filter((quest) => quest.line === line.name && quest.status === "completed").length;
      const shouldOpen = expanded.has(line.name) || !!query;
      const tag = line.category === "main" ? "Story" : line.category === "event" ? "Event" : "NPC";
      const ran = line.category === "event" && line.lastEnd
        ? ` · ${Date.parse(line.lastEnd) < NOW ? "ended" : "running"} ${dateLabel(line.lastEnd)}`
        : "";
      return `<details class="quest-line is-${esc(line.category)}" data-line="${esc(line.name)}" ${shouldOpen ? "open" : ""}><summary><span><b>${esc(line.name)}</b><small><i class="quest-line-tag">${tag}</i> ${all.length} shown · ${line.count} total${ran}</small></span><span class="quest-line-progress">${snapshot ? `${done}/${line.count} done` : "View quests"}</span></summary><div class="quest-line-body">${shouldOpen ? all.map((quest) => questHtml(quest, quest.status)).join("") : ""}</div></details>`;
    }).join("");
    root.innerHTML = grouped || `<div class="quest-empty"><strong>No matching main quests.</strong><span>Try another name, item, or filter.</span></div>`;

    root.querySelectorAll("details.quest-line").forEach((details) => {
      details.addEventListener("toggle", () => {
        const line = details.dataset.line;
        if (details.open) expanded.add(line); else expanded.delete(line);
        const body = details.querySelector(".quest-line-body");
        if (details.open && !body.innerHTML) {
          body.innerHTML = visible.filter((quest) => quest.line === line).map((quest) => questHtml(quest, quest.status)).join("");
        }
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
    const button = event.target.closest("[data-open-item]");
    if (!button) return;
    const opened = window.FRPG_openItem && window.FRPG_openItem(button.dataset.openItem, button.dataset.openQty);
    if (!opened) return; // item not in the calculator's dataset yet; stay on this page.
  });
  document.querySelector('[data-tab="quests"]')?.addEventListener("click", render);
  window.addEventListener("storage", render);
  window.addEventListener("message", (event) => {
    if (event.data && event.data.source === "farmrpg-account-sync" && event.data.type === "snapshot") setTimeout(render, 0);
  });
  render();
})();

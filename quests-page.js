(function () {
  const RAW = window.FRPG_MAIN_QUESTS || { quests: [], lines: [] };

  // Some questlines are one chain that Farm RPG renames partway through (see
  // data/quest-sagas.js). Stitch those back together before anything else
  // looks at the data, so the page only ever sees the real questline.
  function applySagas(data, config) {
    const sagas = (config && config.sagas) || [];
    if (!sagas.length) return data;
    let quests = data.quests.slice();
    let lines = data.lines.slice();
    for (const saga of sagas) {
      const members = new Set(saga.lines || []);
      const rank = new Map((saga.order || []).map((title, index) => [title, index]));
      const inSaga = quests.filter((quest) => members.has(quest.line));
      if (!inSaga.length) continue;
      const steps = inSaga
        .slice()
        .sort((a, b) => (rank.has(a.title) ? rank.get(a.title) : 1e6) - (rank.has(b.title) ? rank.get(b.title) : 1e6))
        .map((quest, index) => ({ ...quest, line: saga.name, sagaStep: index + 1 }));
      // Steps the community sheet knows about but the quest database has not
      // caught up with. Kept last and flagged, never silently mixed in.
      for (const row of saga.pending || []) {
        steps.push({
          title: row.label,
          line: saga.name,
          category: saga.category || "side",
          requirements: row.requirements || [],
          prerequisite: row.sourceNote || "",
          pending: true,
          sagaStep: steps.length + 1,
        });
      }
      let placed = false;
      quests = quests.flatMap((quest) => {
        if (!members.has(quest.line)) return [quest];
        if (placed) return [];
        placed = true;
        return steps;
      });
      let linePlaced = false;
      lines = lines.flatMap((line) => {
        if (!members.has(line.name)) return [line];
        if (linePlaced) return [];
        linePlaced = true;
        return [{ name: saga.name, count: steps.length, category: saga.category || "side", aka: saga.aka || [], note: saga.note || "" }];
      });
    }
    return { ...data, quests, lines };
  }

  const DATA = applySagas(RAW, window.FRPG_QUEST_SAGAS);
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

  // The player's own completed list, saved straight from Farm RPG's Completed
  // Help Requests page. It is authoritative and needs no extension, so it is
  // merged on top of whatever an account capture happens to know.
  const PERSONAL = window.FRPG_PERSONAL_QUESTS || null;
  const personalDone = new Set(((PERSONAL && PERSONAL.completed) || []).map((title) => normalize(title)));

  function statusSets(snapshot) {
    const quests = (snapshot && snapshot.quests) || {};
    const make = (key) => new Set((quests[key] || []).map((q) => normalize(q.title)));
    const completed = make("completed");
    for (const title of personalDone) completed.add(title);
    return { completed, active: make("active"), ready: make("ready"), available: make("available"), locked: make("locked") };
  }

  function statusFor(title, sets, hasAccount) {
    const key = normalize(title);
    if (sets.completed.has(key)) return "completed";
    // With a personal list loaded, "not in it" means not done — not "unknown".
    if (personalDone.size && !hasAccount) return "untracked";
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
    const tracking = !!snapshot || personalDone.size > 0;
    const quests = DATA.quests.map((quest) => ({ ...quest, status: statusFor(quest.title, sets, !!snapshot) }));
    const visible = quests.filter((quest) => matchesFilter(quest.status, quest) && (!query || normalize(`${quest.title} ${quest.line} ${quest.giver} ${(quest.requirements || []).map((r) => r.item).join(" ")}`).includes(query)));
    const completed = quests.filter((quest) => quest.status === "completed").length;
    const actionable = quests.filter((quest) => ["ready", "active", "available"].includes(quest.status)).length;

    const mainCount = DATA.quests.filter((q) => q.category === "main").length;
    const eventCount = DATA.quests.filter(isEvent).length;
    summary.innerHTML = `<article><span>Quests</span><strong>${DATA.quests.filter((q) => !q.pending).length}</strong><small>${mainCount} story · ${eventCount} seasonal</small></article><article><span>Questlines</span><strong>${DATA.lines.length}</strong><small>sequels kept in order</small></article><article><span>Completed</span><strong>${tracking ? completed : "—"}</strong><small>${tracking ? "of every quest listed" : "import account to track"}</small></article><article><span>Available Now</span><strong>${snapshot ? actionable : "—"}</strong><small>${snapshot ? "ready, active, or available" : "import account to see this"}</small></article>`;
    // Say plainly how much of the capture actually lined up. A title the
    // capture has but this list does not is the one failure mode that would
    // otherwise silently under-report progress, so name it and show examples.
    if (!snapshot && personalDone.size) {
      note.innerHTML = `<strong>Using your completed-quest list.</strong><span>`
        + `<b>${personalDone.size.toLocaleString()}</b> finished quests loaded from your own Farm RPG list`
        + `${PERSONAL && PERSONAL.capturedAt ? ` (${esc(PERSONAL.capturedAt)})` : ""}. `
        + `Everything else is shown as still to do. Import an account capture as well if you want "Available Now" filled in.</span>`;
    } else if (snapshot) {
      const known = new Set(DATA.quests.map((quest) => normalize(quest.title)));
      const captured = [...sets.completed];
      const unmatched = captured.filter((title) => !known.has(title));
      const matched = captured.length - unmatched.length;
      const truncated = snapshot.questStats && snapshot.questStats.completedHistoryTruncated;
      const bits = [];
      if (captured.length) {
        bits.push(`Matched <b>${matched.toLocaleString()}</b> of <b>${captured.length.toLocaleString()}</b> completed quests in your capture.`);
        if (unmatched.length) {
          const sample = unmatched.slice(0, 3).map((t) => esc(t)).join(", ");
          bits.push(`${unmatched.length.toLocaleString()} title${unmatched.length === 1 ? "" : "s"} not in this quest list (${sample}${unmatched.length > 3 ? ", …" : ""}).`);
        }
      } else {
        bits.push("Your capture has no completed quests in it — open Farm RPG’s Completed Help Requests page, let it finish loading, then press Sync.");
      }
      if (truncated) bits.push("Farm RPG truncated the older history, so some finished steps stay untracked.");
      note.innerHTML = `<strong>Using your saved account.</strong><span>${bits.join(" ")}</span>`;
    } else {
      note.innerHTML = `<strong>No account imported.</strong><span>You can still browse every quest. Import your account to mark completed and available steps.</span>`;
    }
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
      return `<details class="quest-line is-${esc(line.category)}" data-line="${esc(line.name)}" ${shouldOpen ? "open" : ""}><summary><span><b>${esc(line.name)}</b><small><i class="quest-line-tag">${tag}</i> ${all.length} shown · ${line.count} total${ran}</small>${line.aka && line.aka.length ? `<small class="quest-line-aka">Also called ${esc(line.aka.join(" · "))}</small>` : ""}</span><span class="quest-line-progress">${tracking ? `${done}/${line.count} done` : "View quests"}</span></summary><div class="quest-line-body">${shouldOpen ? all.map((quest) => questHtml(quest, quest.status)).join("") : ""}</div></details>`;
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

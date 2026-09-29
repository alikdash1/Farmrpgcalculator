(function () {
  const RAW = window.FRPG_MAIN_QUESTS || { quests: [], lines: [] };

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

  const data = applySagas(RAW, window.FRPG_QUEST_SAGAS);
  const normalizeTitle = (title) => String(title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const personal = new Set((((window.FRPG_PERSONAL_QUESTS || {}).completed) || []).map(normalizeTitle));
  const titleOf = (row) => typeof row === "string" ? row : row && row.title;

  function accountSnapshot() {
    try { return JSON.parse(localStorage.getItem("frpg_account_snapshot_v1") || "null"); }
    catch (_) { return null; }
  }

  function completedSet(snapshot) {
    const completed = new Set(personal);
    const rows = (((snapshot === undefined ? accountSnapshot() : snapshot) || {}).quests || {}).completed || [];
    for (const row of rows) completed.add(normalizeTitle(titleOf(row)));
    return completed;
  }

  function statusSets(snapshot) {
    const quests = (snapshot && snapshot.quests) || {};
    const make = (key) => new Set((quests[key] || []).map((row) => normalizeTitle(titleOf(row))));
    return {
      completed: completedSet(snapshot),
      active: make("active"),
      ready: make("ready"),
      available: make("available"),
      locked: make("locked"),
    };
  }

  function statusFor(title, sets, hasAccount) {
    const key = normalizeTitle(title);
    if (sets.completed.has(key)) return "completed";
    if (personal.size && !hasAccount) return "untracked";
    if (sets.ready.has(key)) return "ready";
    if (sets.active.has(key)) return "active";
    if (sets.available.has(key)) return "available";
    if (sets.locked.has(key)) return "locked";
    return hasAccount ? "unknown" : "untracked";
  }

  // Which quests still ask for an item, and how much each one wants. The
  // questlines are indexed by item once; the player's finished quests and any
  // event whose end date has passed are dropped when the list is asked for.
  const needIndex = (() => {
    const index = new Map();
    for (const quest of data.quests) {
      // One quest can list the same item on two lines; that is one ask.
      const wanted = new Map();
      for (const row of quest.requirements || []) {
        const key = String(row.item || "").trim().toLowerCase();
        if (!key || !(Number(row.quantity) > 0)) continue;
        wanted.set(key, (wanted.get(key) || 0) + Number(row.quantity));
      }
      for (const [key, quantity] of wanted) {
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ title: quest.title, line: quest.line, category: quest.category, end: quest.end || null, quantity });
      }
    }
    return index;
  })();

  const NEED_ORDER = { ready: 0, active: 1, available: 2, unknown: 3, untracked: 3, locked: 4 };

  function needsByItem(name, snapshot) {
    const rows = needIndex.get(String(name || "").trim().toLowerCase()) || [];
    if (!rows.length) return null;
    const sets = statusSets(snapshot);
    const hasAccount = !!snapshot;
    const now = Date.now();
    const open = [];
    for (const row of rows) {
      const status = statusFor(row.title, sets, hasAccount);
      if (status === "completed") continue;
      if (row.end && Date.parse(row.end) < now) continue;
      open.push(Object.assign({ status }, row));
    }
    if (!open.length) return null;
    open.sort((a, b) => (NEED_ORDER[a.status] || 3) - (NEED_ORDER[b.status] || 3) || b.quantity - a.quantity);
    return { rows: open, total: open.reduce((sum, row) => sum + row.quantity, 0), steps: open.length };
  }

  const NEED_STATUS_WORD = {
    ready: "ready to hand in", active: "in progress", available: "available now",
    locked: "not unlocked yet", unknown: "", untracked: "",
  };

  window.FRPG_QUEST_MODEL = {
    quests: data.quests,
    lines: data.lines,
    applySagas,
    normalizeTitle,
    accountSnapshot,
    completedSet,
    statusSets,
    statusFor,
    needsByItem,
    needStatusWord: (status) => NEED_STATUS_WORD[status] || "",
    hasPersonal: personal.size > 0,
    personalCount: personal.size,
  };
})();

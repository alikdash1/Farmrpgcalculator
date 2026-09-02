/* Farm RPG Account Importer — UI logic.
   Plain browser JavaScript, no dependencies, no network access.
   Data never leaves this page; captures persist only in localStorage. */
(() => {
  "use strict";

  const S = window.ImporterShared;
  const STORAGE_KEY = "farmrpgAccountImporter.captures.v1";

  /** @type {{captures: Array, importLog: Array}} */
  const state = { captures: [], importLog: [] };
  let idCounter = 1;

  /* ---------------- storage ---------------- */

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.captures));
    } catch (err) {
      log("warn", "Could not save captures to local storage (browser may be full or blocking it).");
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.captures = parsed.filter((c) => c && typeof c === "object" && c.capturedAt && c.pageType);
        for (const c of state.captures) {
          const n = Number(String(c.id || "").split("-").pop());
          if (Number.isFinite(n)) idCounter = Math.max(idCounter, n + 1);
        }
      }
    } catch (err) {
      log("warn", "Saved local data was unreadable and was ignored.");
    }
  }

  /* ---------------- import ---------------- */

  function log(kind, msg) {
    state.importLog.push({ kind, msg });
    renderImportLog();
  }

  function makeId() {
    return Date.now().toString(36) + "-" + idCounter++;
  }

  function isDuplicate(capture, fileName) {
    return state.captures.some(
      (c) => c._fileName === fileName && c.capturedAt === capture.capturedAt
    );
  }

  function importFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    let pending = files.length;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importOne(file.name, String(reader.result || ""));
        } catch (err) {
          log("err", file.name + ": could not read file (" + (err && err.message ? err.message : err) + ")");
        }
        if (--pending === 0) {
          saveState();
          renderAll();
        }
      };
      reader.onerror = () => {
        log("err", file.name + ": could not read file.");
        if (--pending === 0) {
          saveState();
          renderAll();
        }
      };
      reader.readAsText(file);
    }
  }

  function importOne(fileName, text) {
    if (text.length > S.MAX_CAPTURE_BYTES) {
      log("err", fileName + ": rejected — file is larger than 5 MB.");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      log("err", fileName + ": rejected — not valid JSON.");
      return;
    }
    const result = S.validateCapture(parsed, text.length);
    if (!result.ok) {
      log("err", fileName + ": rejected — " + result.errors.join(" "));
      return;
    }
    if (isDuplicate(result.capture, fileName)) {
      log("warn", fileName + ": skipped — this exact capture is already imported.");
      return;
    }
    result.capture.id = makeId();
    result.capture._fileName = fileName;
    state.captures.push(result.capture);
    const extra = result.warnings.length ? " (" + result.warnings.length + " warning" + (result.warnings.length === 1 ? "" : "s") + ")" : "";
    log("ok", fileName + ": imported “" + result.capture.pageType + "” captured " + result.capture.capturedAt + extra);
    for (const w of result.warnings) log("warn", fileName + ": " + w);
  }

  /* ---------------- mutation ---------------- */

  function removeCapture(id) {
    state.captures = state.captures.filter((c) => c.id !== id);
    saveState();
    renderAll();
  }

  function clearAllCaptures() {
    if (!state.captures.length) return;
    if (!window.confirm("Remove all imported captures from this page?")) return;
    state.captures = [];
    saveState();
    renderAll();
  }

  function clearLocalData() {
    if (!window.confirm("Delete ALL locally saved importer data from this browser? This cannot be undone.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) { /* ignore */ }
    state.captures = [];
    state.importLog = [];
    log("ok", "Local importer data cleared from this browser.");
    renderAll();
  }

  /* ---------------- merge + export ---------------- */

  function currentSnapshot() {
    return S.mergeCaptures(state.captures, { now: new Date().toISOString() });
  }

  function exportSnapshot() {
    if (!state.captures.length) {
      log("warn", "Nothing to export — import at least one capture first.");
      return;
    }
    const snapshot = currentSnapshot();
    snapshot.legacyV1 = S.buildLegacyV1(snapshot);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "farmrpg-account-snapshot.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    log("ok", "Exported farmrpg-account-snapshot.json (" + state.captures.length + " captures merged). The file was saved by your browser — nothing was uploaded.");
  }

  /* ---------------- rendering ---------------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function valueSpan(value, raw) {
    const span = el("span");
    if (value === null || value === undefined || value === "") {
      span.className = "val unknown";
      span.textContent = "unknown";
      span.title = "Not seen in any capture";
      return span;
    }
    span.className = "val";
    span.textContent = typeof value === "boolean" ? (value ? "yes" : "no") : S.formatCompact(value);
    const exact = typeof value === "boolean" ? String(value) : S.formatExact(value);
    span.title = raw && raw !== String(value) ? exact + " (page showed: " + raw + ")" : exact;
    return span;
  }

  function kvTable(rows) {
    const table = el("table");
    const tbody = el("tbody");
    for (const [label, value, raw] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", null, label));
      const td = el("td");
      td.appendChild(valueSpan(value, raw));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  function renderImportLog() {
    const list = document.getElementById("import-log");
    list.textContent = "";
    for (const entry of state.importLog.slice(-30)) {
      list.appendChild(el("li", entry.kind, entry.msg));
    }
    list.scrollTop = list.scrollHeight;
  }

  function renderCapturesTable() {
    const tbody = document.getElementById("captures-tbody");
    const empty = document.getElementById("captures-empty");
    tbody.textContent = "";
    empty.hidden = state.captures.length > 0;
    const sorted = state.captures.slice().sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : 1));
    for (const c of sorted) {
      const tr = el("tr");
      const tdType = el("td");
      tdType.appendChild(el("span", "badge", c.pageType));
      if (c.legacy) tdType.appendChild(el("span", "badge legacy", "raw text only"));
      tr.appendChild(tdType);
      tr.appendChild(el("td", "num", c.capturedAt.replace("T", " ").replace(/\.\d+Z$/, "Z")));
      tr.appendChild(el("td", null, c._fileName || "—"));
      tr.appendChild(el("td", null, c.url || "unknown"));
      const tdNotes = el("td");
      const n = (c.warnings || []).length;
      tdNotes.textContent = n ? n + " warning" + (n === 1 ? "" : "s") : "";
      tr.appendChild(tdNotes);
      const tdRm = el("td");
      const btn = el("button", "btn-link", "Remove");
      btn.type = "button";
      btn.addEventListener("click", () => removeCapture(c.id));
      tdRm.appendChild(btn);
      tr.appendChild(tdRm);
      tbody.appendChild(tr);
    }
  }

  function renderSummary(snapshot) {
    const grid = document.getElementById("summary-grid");
    grid.textContent = "";

    const p = snapshot.player;
    grid.appendChild(card("Player", kvTable([
      ["Name", p.name], ["Player ID", p.playerId], ["Account created", p.accountCreated],
    ])));

    const L = snapshot.levels;
    grid.appendChild(card("Levels", kvTable([
      ["Farming", L.farming], ["Fishing", L.fishing], ["Crafting", L.crafting],
      ["Exploring", L.exploring], ["Cooking", L.cooking], ["Tower", L.tower],
    ])));

    const b = snapshot.balances;
    grid.appendChild(card("Balances", kvTable([
      ["Silver", b.silver], ["Gold", b.gold],
      ["Stamina", b.staminaCurrent], ["Stamina max", b.staminaMaximum],
    ])));

    const cap = snapshot.capacity;
    grid.appendChild(card("Capacity", kvTable([
      ["Inventory", cap.inventoryCurrent], ["Inventory max", cap.inventoryMaximum],
    ])));

    const cons = Object.keys(snapshot.consumables).sort();
    const consCard = el("div", "card");
    consCard.appendChild(el("h3", null, "Consumables (" + cons.length + ")"));
    if (cons.length) {
      consCard.appendChild(kvTable(cons.map((name) => {
        const c = snapshot.consumables[name];
        const prov = snapshot.provenance["consumables." + S.normalizeName(name) + ".quantity"];
        return [name, c.quantity, prov && prov.raw];
      })));
    } else {
      consCard.appendChild(el("p", "empty-note", "None captured yet."));
    }
    grid.appendChild(consCard);

    const invCard = el("div", "card");
    invCard.appendChild(el("h3", null, "Inventory (" + snapshot.inventory.length + " items)"));
    if (snapshot.inventory.length) {
      invCard.appendChild(kvTable(snapshot.inventory.slice(0, 8).map((item) => {
        const prov = snapshot.provenance["inventory." + S.normalizeName(item.name) + ".quantity"];
        return [item.name, item.quantity, prov && prov.raw];
      })));
      if (snapshot.inventory.length > 8) {
        invCard.appendChild(el("p", "empty-note", "…and " + (snapshot.inventory.length - 8) + " more (see export)."));
      }
    } else {
      invCard.appendChild(el("p", "empty-note", "No inventory page imported yet."));
    }
    grid.appendChild(invCard);

    grid.appendChild(card("Masteries", kvTable([
      ["Items tracked", snapshot.masteries.length],
      ["Grand Mastery", snapshot.masteries.filter((m) => m.grandMastery === true).length],
      ["Mega Mastery", snapshot.masteries.filter((m) => m.megaMastery === true).length],
    ])));

    const q = snapshot.quests;
    grid.appendChild(card("Quests / Help Requests", kvTable([
      ["Available", q.available.length], ["Active", q.active.length], ["Ready", q.ready.length],
      ["Completed", q.completed.length], ["Locked", q.locked.length],
    ])));

    grid.appendChild(card("Perks & bonuses", kvTable([
      ["Perks", snapshot.perks.length],
      ["Farm Supply", snapshot.farmSupply.length],
      ["Artifacts", snapshot.artifacts.length],
    ])));

    const infra = snapshot.infrastructure;
    grid.appendChild(card("Farm infrastructure", kvTable([
      ["Iron Depot", infra.ironDepot],
      ["Sawmill level", infra.sawmill && infra.sawmill.level],
      ["Quarry level", infra.quarry && infra.quarry.level],
      ["Storehouse level", infra.storehouse && infra.storehouse.level],
    ])));
  }

  function card(title, contentNode) {
    const div = el("div", "card");
    div.appendChild(el("h3", null, title));
    div.appendChild(contentNode);
    return div;
  }

  function renderMissing(snapshot) {
    const list = document.getElementById("missing-list");
    const none = document.getElementById("missing-none");
    list.textContent = "";
    none.hidden = snapshot.unknownFields.length > 0;
    for (const field of snapshot.unknownFields) {
      list.appendChild(el("li", null, field));
    }
  }

  function renderWarnings(snapshot) {
    const list = document.getElementById("warnings-list");
    const none = document.getElementById("warnings-none");
    list.textContent = "";
    none.hidden = snapshot.warnings.length > 0;
    for (const w of snapshot.warnings) {
      list.appendChild(el("li", null, w));
    }
  }

  function renderTech(snapshot) {
    document.getElementById("provenance-view").textContent = JSON.stringify(snapshot.provenance, null, 2) || "{}";
    document.getElementById("snapshot-view").textContent = JSON.stringify(snapshot, null, 2);
  }

  function renderAll() {
    const snapshot = currentSnapshot();
    renderCapturesTable();
    renderSummary(snapshot);
    renderMissing(snapshot);
    renderWarnings(snapshot);
    renderTech(snapshot);
  }

  /* ---------------- events ---------------- */

  function wireEvents() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");

    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener("change", () => {
      importFiles(fileInput.files);
      fileInput.value = "";
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files) importFiles(e.dataTransfer.files);
    });
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => e.preventDefault());

    document.getElementById("btn-clear-all").addEventListener("click", clearAllCaptures);
    document.getElementById("btn-clear-local").addEventListener("click", clearLocalData);
    document.getElementById("btn-export").addEventListener("click", exportSnapshot);
  }

  /* ---------------- boot ---------------- */

  loadState();
  wireEvents();
  renderAll();
})();

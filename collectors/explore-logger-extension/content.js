(() => {
  "use strict";
  if (window.__farmRpgExploreLoggerUi) return;
  window.__farmRpgExploreLoggerUi = true;

  const KEY = "farmRpgExploreLoggerStateV1";
  let state = {
    schema: "farmrpg-exploration-log-v1",
    active: false,
    location: "",
    startedAt: null,
    stoppedAt: null,
    baseline: null,
    ending: null,
    entries: []
  };
  let saveTimer = null;

  const storageGet = () => new Promise((resolve) => {
    chrome.storage.local.get(KEY, (result) => resolve(result?.[KEY] || null));
  });
  const storageSet = () => new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: state }, resolve);
  });
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => storageSet(), 250);
  };
  const sendActive = () => window.dispatchEvent(new CustomEvent(
    "farmrpg-explore-command",
    { detail: { active: state.active } }
  ));
  const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const snapshot = () => {
    const body = document.body?.innerText || "";
    const useful = body.split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean)
      .filter((line) => /Acorn Pie|Arnold Palmer|Apple Cider|\bHide\b|stamina every time|explored this location|things found here/i.test(line))
      .slice(0, 120);
    return {
      capturedAt: new Date().toISOString(),
      title: document.title,
      path: location.pathname + location.hash,
      location: state.location || null,
      relevantVisibleLines: useful
    };
  };
  const recentVisibleResults = () => {
    const selectors = [
      ".toast", ".toast-text", ".notification", ".notification-item",
      ".dialog-text", "[id*='explore']", "[class*='explore-result']",
      "[class*='explore_result']", "[class*='result-message']"
    ];
    const seen = new Set();
    const rows = [];
    document.querySelectorAll(selectors.join(",")).forEach((node) => {
      const text = cleanText(node.innerText || node.textContent);
      if (text && text.length <= 5000 && !seen.has(text)) {
        seen.add(text);
        rows.push(text);
      }
    });
    return rows.slice(-30);
  };
  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
  const download = () => {
    const payload = {
      ...state,
      exportedAt: new Date().toISOString(),
      privacy: "No request bodies, headers, cookies, passwords, or session tokens are intentionally captured. Response text is locally redacted best-effort.",
      notes: "Actions were performed manually by the player; this extension never clicks or sends game requests."
    };
    const filename = "farmrpg-exploration-log-" + stamp() + ".json";
    chrome.runtime.sendMessage({
      type: "farmrpg-download-log",
      filename,
      payload: JSON.stringify(payload, null, 2)
    }, (result) => {
      const error = chrome.runtime.lastError?.message || result?.error;
      if (error) {
        alert("Explore Logger export failed: " + error);
      }
    });
  };

  const panel = document.createElement("section");
  panel.id = "farmrpg-explore-logger";
  panel.innerHTML = [
    "<div class='frpg-log-title'>Explore Logger <span data-role='status'>OFF</span></div>",
    "<input data-role='location' type='text' placeholder='Location name' autocomplete='off'>",
    "<div class='frpg-log-actions'>",
    "<button data-action='start'>Start clean run</button>",
    "<button data-action='stop'>Stop</button>",
    "<button data-action='export'>Export JSON</button>",
    "<button data-action='clear'>Clear</button>",
    "</div>",
    "<div class='frpg-log-count' data-role='count'>0 responses</div>",
    "<div class='frpg-log-note'>Start, perform your normal test, then Stop + Export. No automatic clicks.</div>"
  ].join("");
  document.documentElement.appendChild(panel);

  const locationInput = panel.querySelector("[data-role='location']");
  const statusNode = panel.querySelector("[data-role='status']");
  const countNode = panel.querySelector("[data-role='count']");
  const render = () => {
    statusNode.textContent = state.active ? "RECORDING" : "OFF";
    statusNode.classList.toggle("active", state.active);
    countNode.textContent = state.entries.length + " network responses";
    if (document.activeElement !== locationInput) locationInput.value = state.location || "";
  };

  panel.addEventListener("click", async (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (!action) return;
    if (action === "start") {
      state = {
        schema: "farmrpg-exploration-log-v1",
        active: true,
        location: cleanText(locationInput.value),
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        baseline: null,
        ending: null,
        entries: []
      };
      state.baseline = snapshot();
      sendActive();
      await storageSet();
    } else if (action === "stop") {
      state.active = false;
      state.stoppedAt = new Date().toISOString();
      state.ending = snapshot();
      sendActive();
      await storageSet();
    } else if (action === "export") {
      if (state.active) {
        state.ending = snapshot();
        await storageSet();
      }
      download();
    } else if (action === "clear") {
      state = {
        schema: "farmrpg-exploration-log-v1",
        active: false,
        location: cleanText(locationInput.value),
        startedAt: null,
        stoppedAt: null,
        baseline: null,
        ending: null,
        entries: []
      };
      sendActive();
      await storageSet();
    }
    render();
  });
  locationInput.addEventListener("change", () => {
    state.location = cleanText(locationInput.value);
    scheduleSave();
  });

  window.addEventListener("farmrpg-explore-network", (event) => {
    if (!state.active || !event.detail) return;
    const entry = { ...event.detail, location: state.location || null };
    state.entries.push(entry);
    render();
    setTimeout(() => {
      entry.visibleResultText = recentVisibleResults();
      scheduleSave();
    }, 300);
  });

  storageGet().then((saved) => {
    if (saved?.schema === "farmrpg-exploration-log-v1") state = saved;
    sendActive();
    render();
  });
})();

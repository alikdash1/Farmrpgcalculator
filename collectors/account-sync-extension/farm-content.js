(() => {
  if (globalThis.__farmRpgAccountSyncLoaded) return;
  globalThis.__farmRpgAccountSyncLoaded = true;

  let timer = 0;
  let watchdog = 0;
  let lastRoute = "";
  let busy = false;
  let retries = 0;

  const panel = document.createElement("div");
  panel.id = "farmrpg-account-sync-pill";
  panel.innerHTML = '<i></i><span><b>Account sync</b><small>Waiting for page</small></span><button type="button" title="Capture this page now">Sync</button>';
  document.documentElement.appendChild(panel);
  const note = panel.querySelector("small");

  function setStatus(text, mode) {
    note.textContent = text;
    panel.dataset.state = mode || "";
  }

  function queueCapture(reason, delay) {
    clearTimeout(timer);
    timer = setTimeout(() => runCapture(reason), delay);
  }

  function runCapture(reason) {
    if (busy) {
      if (reason === "manual") setStatus("A capture is already running", "busy");
      return;
    }
    if (typeof globalThis.__farmRpgCaptureNow !== "function") {
      setStatus("Collector unavailable — reload Farm RPG", "error");
      return;
    }
    busy = true;
    setStatus("Reading this page…", "busy");
    const started = globalThis.__farmRpgCaptureNow();
    if (!started) busy = false;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (!busy) return;
      busy = false;
      setStatus("Capture timed out — press Sync", "error");
    }, 15000);
  }

  function routeCheck() {
    const route = location.href;
    if (route === lastRoute) return;
    lastRoute = route;
    retries = 0;
    busy = false;
    clearTimeout(watchdog);
    // Farm RPG swaps the page body after the hash changes. Give the new
    // account view time to render before reading it.
    queueCapture("route", 2600);
  }

  panel.querySelector("button").addEventListener("click", () => {
    retries = 0;
    queueCapture("manual", 250);
  });
  window.addEventListener("hashchange", routeCheck);
  window.addEventListener("popstate", routeCheck);
  window.addEventListener("pageshow", routeCheck);

  window.addEventListener("farmrpg-account-captured", (event) => {
    const result = event.detail || {};
    busy = false;
    clearTimeout(watchdog);
    const detail = Number.isFinite(result.rowCount) ? " (" + result.rowCount + " details)" : "";
    if (result.ok === false && result.retryable && retries < 3) {
      retries += 1;
      setStatus("Page still loading — retry " + retries + "/3", "busy");
      queueCapture("retry", 3500);
      return;
    }
    retries = 0;
    setStatus(
      result.ok === false ? (result.error || "Could not sync") : ((result.pageType || "Page") + detail + " saved locally"),
      result.ok === false ? "error" : "ok"
    );
  });

  window.addEventListener("farmrpg-account-capture-error", (event) => {
    busy = false;
    clearTimeout(watchdog);
    setStatus(event.detail || "Could not sync", "error");
  });

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (!message || message.type !== "farmrpg-capture-now") return;
    if (busy) {
      reply({ ok: true, queued: false, message: "Capture already running" });
      return;
    }
    retries = 0;
    queueCapture("manual", 250);
    reply({ ok: true, queued: true });
  });

  setInterval(() => {
    if (!document.hidden && !busy) queueCapture("periodic", 500);
  }, 90000);
  setInterval(routeCheck, 1200);
  routeCheck();
})();

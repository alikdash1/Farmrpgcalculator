(() => {
  if (globalThis.__farmRpgCalculatorBridge) return;
  globalThis.__farmRpgCalculatorBridge = true;
  async function publish() {
    const data = await chrome.storage.local.get(["snapshot", "syncedAt"]);
    if (data.snapshot) window.postMessage({ source: "farmrpg-account-sync", type: "snapshot", snapshot: data.snapshot, syncedAt: data.syncedAt }, "*");
  }
  window.addEventListener("message", (event) => {
    if (event.source === window && event.data && event.data.source === "farmrpg-calculator" && event.data.type === "request-snapshot") publish();
  });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && (changes.snapshot || changes.syncedAt)) publish(); });
  publish();
})();

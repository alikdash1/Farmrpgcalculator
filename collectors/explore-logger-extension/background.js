chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "farmrpg-download-log") return false;
  try {
    const json = String(message.payload || "");
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const url = "data:application/json;base64," + btoa(binary);
    chrome.downloads.download({
      url,
      filename: message.filename || "farmrpg-exploration-log.json",
      saveAs: true
    }, (downloadId) => {
      const error = chrome.runtime.lastError?.message;
      sendResponse(error ? { ok: false, error } : { ok: true, downloadId });
    });
  } catch (error) {
    sendResponse({ ok: false, error: String(error?.message || error) });
  }
  return true;
});

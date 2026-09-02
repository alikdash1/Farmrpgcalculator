(() => {
  "use strict";
  if (window.__farmRpgExploreLoggerHook) return;
  window.__farmRpgExploreLoggerHook = true;

  let active = false;
  const MAX_BODY = 200000;
  const sameFarmHost = (url) => {
    try {
      const host = new URL(url, location.href).hostname.toLowerCase();
      return host === "farmrpg.com" || host === "www.farmrpg.com";
    } catch {
      return false;
    }
  };
  const cleanUrl = (url) => {
    try {
      const parsed = new URL(url, location.href);
      return parsed.pathname + (parsed.hash || "");
    } catch {
      return String(url || "").slice(0, 500);
    }
  };
  const bodyText = (value) => {
    let text = typeof value === "string" ? value : JSON.stringify(value);
    if (!text) return "";
    text = text
      .replace(/((?:password|passwd|authorization|csrf|xsrf|session|token|secret|email)[^:=]{0,30}[":=\s]+)[^&"'<\s]{4,}/gi, "$1[REDACTED]")
      .slice(0, MAX_BODY);
    return text;
  };
  const emit = (record) => {
    if (!active) return;
    window.dispatchEvent(new CustomEvent("farmrpg-explore-network", {
      detail: { ...record, capturedAt: new Date().toISOString() }
    }));
  };

  window.addEventListener("farmrpg-explore-command", (event) => {
    active = event.detail?.active === true;
  });

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const input = args[0];
      const url = typeof input === "string" ? input : input?.url;
      if (active && sameFarmHost(url)) {
        response.clone().text().then((text) => emit({
          transport: "fetch",
          method: String(args[1]?.method || input?.method || "GET").toUpperCase(),
          url: cleanUrl(url),
          status: response.status,
          responseText: bodyText(text)
        })).catch(() => {});
      }
      return response;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__farmRpgLogMeta = { method: String(method || "GET").toUpperCase(), url };
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const meta = this.__farmRpgLogMeta;
    if (meta && sameFarmHost(meta.url)) {
      this.addEventListener("loadend", () => {
        if (!active) return;
        let responseText = "";
        try {
          responseText = this.responseType === "json"
            ? bodyText(this.response)
            : bodyText(this.responseText);
        } catch {}
        emit({
          transport: "xhr",
          method: meta.method,
          url: cleanUrl(meta.url),
          status: this.status,
          responseText
        });
      }, { once: true });
    }
    return originalSend.apply(this, args);
  };
})();

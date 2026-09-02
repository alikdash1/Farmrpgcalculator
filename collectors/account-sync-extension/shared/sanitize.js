/* Farm RPG account importer — sanitization and normalization helpers.
   Loaded as a classic script in the browser (exposes window.ImporterShared)
   and via require() in Node tests. No dependencies, no network access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImporterShared = Object.assign(root.ImporterShared || {}, api);
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const DEFAULT_TEXT_LIMIT = 40000;

  /**
   * Keep only origin + pathname. Query strings are always dropped (they may
   * carry tokens or session parameters). A fragment is kept only when it is
   * a plain client-side route path such as "#!/inventory" — never when it
   * contains key=value pairs or other data.
   */
  function sanitizeUrl(raw) {
    if (!raw || typeof raw !== "string") return "unknown";
    let u;
    try {
      u = new URL(raw);
    } catch (err) {
      return "unknown";
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return "unknown";
    let out = u.origin + u.pathname;
    const hash = u.hash || "";
    let decodedHash = "";
    try { decodedHash = decodeURIComponent(hash); } catch (err) { decodedHash = ""; }
    if (/^#!?\/[A-Za-z0-9_\-\/.]*$/.test(decodedHash) &&
        !/[?=&]|token|session|auth|secret|password/i.test(decodedHash)) out += decodedHash;
    return out;
  }

  /**
   * Sanitize fallback visible text:
   *  - strips zero-width / bidi control characters
   *  - redacts key=value secrets, JWTs and long opaque blobs
   *  - collapses duplicate whitespace
   *  - caps total length (marker appended when truncated)
   */
  function sanitizeVisibleText(text, maxLen) {
    const limit = Number.isInteger(maxLen) && maxLen > 0 ? maxLen : DEFAULT_TEXT_LIMIT;
    let s = String(text === null || text === undefined ? "" : text);
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "");
    s = s.replace(
      /(\b(?:access_?token|auth(?:orization)?|session(?:_?id)?|sess|sid|token|jwt|api[_-]?key|password|passwd|pwd|cookie|secret)\b)\s*[:=]\s*[^\s&;]+/gi,
      "$1=[redacted]"
    );
    s = s.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted-jwt]");
    s = s.replace(/\b[A-Za-z0-9+/=_-]{48,}\b/g, "[redacted]");
    s = s.replace(/[ \t\f\v]+/g, " ");
    s = s.replace(/ *\n */g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    s = s.trim();
    if (s.length > limit) s = s.slice(0, limit) + "\n[…truncated]";
    return s;
  }

  /**
   * Normalized exact-match key for item names and quest titles.
   * Only whitespace, quote style and case are normalized — two names that
   * differ in any real character never merge.
   */
  function normalizeName(name) {
    return String(name || "")
      .replace(/[’‘`´]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  return {
    sanitizeUrl: sanitizeUrl,
    sanitizeVisibleText: sanitizeVisibleText,
    normalizeName: normalizeName,
    DEFAULT_TEXT_LIMIT: DEFAULT_TEXT_LIMIT,
  };
});

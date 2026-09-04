importScripts("shared/numbers.js", "shared/sanitize.js", "shared/schema.js", "shared/merge.js");

const EXPECTED = [
  "profile", "inventory", "tower", "mastery",
  "quests-available", "quests-completed", "perks", "farm-supply",
  "pets", "craftworks", "kitchen", "friendships"
];

const PAGE_HINTS = [
  [/completed requests?|completed help|questscomp/i, "quests-completed"],
  [/available requests?|available help/i, "quests-available"],
  [/master(?:y|ies)/i, "mastery"],
  [/(?:the )?tower/i, "tower"],
  [/farm supply|supply\.php/i, "farm-supply"],
  [/craftworks?/i, "craftworks"],
  [/friendship|npclevels/i, "friendships"],
  [/my kitchen|kitchen/i, "kitchen"],
  [/my pets|pets?\.php/i, "pets"],
  [/inventory/i, "inventory"],
  [/perks?/i, "perks"],
  [/profile/i, "profile"],
  [/artifacts?/i, "artifacts"],
  [/sawmill/i, "sawmill"],
  [/quarry/i, "quarry"],
  [/storehouse/i, "storehouse"],
  [/fishing/i, "fishing"],
  [/explor/i, "exploring"]
];

function inferPageType(capture) {
  const current = String(capture && capture.pageType || "");
  if (current && current !== "unknown" && current !== "other") return current;
  const hint = [capture && capture.pageLabel, capture && capture.title, capture && capture.url].filter(Boolean).join(" ");
  for (const [pattern, type] of PAGE_HINTS) if (pattern.test(hint)) return type;
  return current || "unknown";
}

function evidenceValue(value) {
  return value && typeof value === "object" && "value" in value ? value.value : value;
}

function objectEvidenceCount(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).filter((entry) => evidenceValue(entry) !== null && evidenceValue(entry) !== undefined).length;
}

function detailCount(capture) {
  const f = capture && capture.fields || {};
  switch (capture && capture.pageType) {
    case "profile": return objectEvidenceCount(f.player) + objectEvidenceCount(f.levels);
    case "inventory": return (f.inventory || []).length;
    case "tower": return objectEvidenceCount(f.towerProgress);
    case "mastery": return (f.masteries || []).length;
    case "quests-available":
    case "quests-active":
    case "quests-completed":
    case "quests": return (f.quests || []).length + objectEvidenceCount(f.questStats);
    case "perks": return (f.perks || []).length + objectEvidenceCount(f.perkStats);
    case "farm-supply": return (f.farmSupply || []).length + objectEvidenceCount(f.supplyStats);
    case "pets": return (f.pets || []).length;
    case "craftworks": return (f.craftworks || []).length;
    case "kitchen": return objectEvidenceCount(f.kitchenStats);
    case "friendships": return (f.friendships || []).length;
    case "artifacts": return (f.artifacts || []).length;
    default: return Object.keys(f).length;
  }
}

function isExplicitlyEmpty(capture) {
  const f = capture && capture.fields || {};
  const text = String(capture && capture.visibleText || "");
  if (capture.pageType === "quests-available") {
    const available = f.questStats && evidenceValue(f.questStats.specialAvailable);
    const personal = f.questStats && evidenceValue(f.questStats.personalAvailable);
    return available === 0 && (personal === 0 || personal === null || personal === undefined);
  }
  if (capture.pageType === "craftworks") return /(?:nothing|no items?).{0,30}craftworks|craftworks.{0,30}(?:empty|no items?)/i.test(text);
  return false;
}

function incompleteRequiredPage(capture) {
  const required = new Set(["profile", "inventory", "tower", "mastery", "perks", "farm-supply", "friendships"]);
  if (!required.has(capture.pageType) || detailCount(capture) > 0) return null;
  return capture.pageLabel + " has not finished loading any account details yet.";
}

function protectUsefulCapture(oldCapture, nextCapture) {
  if (!oldCapture) return null;
  const oldCount = detailCount(oldCapture);
  const nextCount = detailCount(nextCapture);
  if (oldCount <= 0 || isExplicitlyEmpty(nextCapture)) return null;
  const protectedTypes = new Set([
    "profile", "inventory", "tower", "mastery", "quests-completed",
    "perks", "farm-supply", "pets", "kitchen", "friendships", "artifacts"
  ]);
  if (!protectedTypes.has(nextCapture.pageType)) return null;
  if (nextCount === 0) {
    return "This page has not finished loading its account details. The previous complete " +
      nextCapture.pageLabel + " capture was kept.";
  }
  // A half-drawn page can still yield a few rows — an inventory showing only
  // gold and silver, say — and replacing hundreds of rows with three loses
  // real data. A shrink that severe is a half-loaded page, not an account that
  // changed, so keep what is already known and say so.
  if (oldCount >= 20 && nextCount < oldCount / 4) {
    return "That read only found " + nextCount + " of the " + oldCount + " rows already saved, " +
      "so the page had probably not finished loading. The fuller " + nextCapture.pageLabel +
      " capture was kept — open the page, let it finish, then capture again.";
  }
  return null;
}

function normalizeStoredCaptures(raw) {
  const normalized = {};
  for (const capture of Object.values(raw || {}).filter(Boolean)) {
    const fixed = { ...capture, pageType: inferPageType(capture) };
    const prior = normalized[fixed.pageType];
    if (!prior || String(fixed.capturedAt || "") >= String(prior.capturedAt || "")) {
      normalized[fixed.pageType] = fixed;
    }
  }
  return normalized;
}

async function rebuild(captures) {
  const rows = Object.values(captures || {}).filter(Boolean);
  if (!rows.length) return null;
  const snapshot = ImporterShared.mergeCaptures(rows);
  snapshot.legacyV1 = ImporterShared.buildLegacyV1(snapshot);
  return snapshot;
}

async function readState() {
  const data = await chrome.storage.local.get(["captures", "snapshot", "syncedAt"]);
  const captures = normalizeStoredCaptures(data.captures);
  if (JSON.stringify(captures) !== JSON.stringify(data.captures || {})) {
    const snapshot = await rebuild(captures);
    await chrome.storage.local.set({ captures, snapshot });
    data.snapshot = snapshot;
  }
  data.captures = captures;
  return data;
}

async function status() {
  const data = await readState();
  const captured = Object.keys(data.captures || {}).filter((name) => name !== "other" && name !== "unknown").sort();
  const details = {};
  for (const [type, capture] of Object.entries(data.captures || {})) {
    // Keep the URL the capture came from: it is the one address guaranteed to
    // be right for refreshing that section, so the popup can link straight back.
    details[type] = { capturedAt: capture.capturedAt, count: detailCount(capture), label: capture.pageLabel || type, url: capture.url || "" };
  }
  return {
    snapshot: data.snapshot || null,
    syncedAt: data.syncedAt || null,
    captured,
    details,
    missing: EXPECTED.filter((name) => !captured.includes(name))
  };
}


/* ---------------- local snapshot file ----------------
   One file, overwritten. The old export used a blob <a download>, so Brave
   kept the previous copy and added "(1)", "(2)"… to every new one. The
   downloads API with conflictAction "overwrite" keeps exactly one current
   snapshot on disk instead of a pile of near-identical files. */
const SNAPSHOT_FILE = "lantern-ledger-account-snapshot.json";

async function saveSnapshotFile(snapshot) {
  if (!snapshot) return { ok: false, error: "Nothing captured yet." };
  if (!chrome.downloads || !chrome.downloads.download) {
    return { ok: false, error: "Downloads permission unavailable; reload the extension." };
  }
  // A service worker has no URL.createObjectURL, so hand the bytes over inline.
  const url = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
  try {
    const id = await chrome.downloads.download({ url, filename: SNAPSHOT_FILE, conflictAction: "overwrite", saveAs: false });
    return { ok: true, id, filename: SNAPSHOT_FILE };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error) };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) return sendResponse({ ok: false, error: "Missing message type" });

    if (message.type === "farmrpg-account-capture") {
      const rawBytes = new TextEncoder().encode(JSON.stringify(message.capture || {})).length;
      const checked = ImporterShared.validateCapture(message.capture, rawBytes);
      if (!checked.ok) return sendResponse({ ok: false, error: checked.errors.join("; ") });

      checked.capture.pageType = inferPageType(checked.capture);
      checked.capture._fileName = message.filename || checked.capture.pageType + ".json";
      const state = await readState();
      const captures = state.captures || {};
      const old = captures[checked.capture.pageType];

      if (old && String(checked.capture.capturedAt) < String(old.capturedAt)) {
        return sendResponse({
          ok: false,
          retained: true,
          pageType: checked.capture.pageType,
          error: "An older page result was ignored; the newer saved capture was kept."
        });
      }

      const incomplete = incompleteRequiredPage(checked.capture);
      if (incomplete) {
        return sendResponse({ ok: false, retained: !!old, retryable: true, pageType: checked.capture.pageType, rowCount: 0, error: incomplete });
      }

      const protection = protectUsefulCapture(old, checked.capture);
      if (protection) {
        return sendResponse({
          ok: false,
          retained: true,
          retryable: true,
          pageType: checked.capture.pageType,
          rowCount: detailCount(checked.capture),
          error: protection
        });
      }

      captures[checked.capture.pageType] = checked.capture;
      const snapshot = await rebuild(captures);
      const syncedAt = new Date().toISOString();
      await chrome.storage.local.set({ captures, snapshot, syncedAt });
      const prefs = await chrome.storage.local.get(["autoSaveFile"]);
      // Opt-in: the player asked not to keep collecting downloaded copies.
      // A capture is already saved here and pushed to Lantern Ledger; the file
      // is only for moving it somewhere this extension cannot reach.
      if (prefs.autoSaveFile === true) await saveSnapshotFile(snapshot);
      return sendResponse({
        ok: true,
        pageType: checked.capture.pageType,
        rowCount: detailCount(checked.capture),
        captured: Object.keys(captures).length,
        syncedAt
      });
    }

    if (message.type === "farmrpg-account-status") return sendResponse({ ok: true, ...(await status()) });

    if (message.type === "farmrpg-account-export") {
      const data = await readState();
      return sendResponse({ ok: true, snapshot: data.snapshot || null, syncedAt: data.syncedAt || null });
    }

    if (message.type === "farmrpg-account-save-file") {
      const data = await readState();
      const saved = await saveSnapshotFile(data.snapshot);
      return sendResponse(saved);
    }

    if (message.type === "farmrpg-account-clear") {
      await chrome.storage.local.remove(["captures", "snapshot", "syncedAt"]);
      return sendResponse({ ok: true });
    }

    if (message.type === "farmrpg-capture-active") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) return sendResponse({ ok: false, error: "No active tab" });
      try {
        return sendResponse(await chrome.tabs.sendMessage(tabs[0].id, { type: "farmrpg-capture-now" }));
      } catch (_) {
        return sendResponse({ ok: false, error: "Open a Farm RPG page first" });
      }
    }

    return sendResponse({ ok: false, error: "Unknown message" });
  })().catch((error) => sendResponse({ ok: false, error: String(error && error.message || error) }));
  return true;
});



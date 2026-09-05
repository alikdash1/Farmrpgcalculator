const DEFAULT_CALCULATOR = "http://127.0.0.1:8772/index.html";
const LABELS = {
  profile: "Profile", inventory: "Inventory", tower: "Tower", mastery: "Masteries",
  "quests-available": "Available quests", "quests-completed": "Completed quests",
  perks: "Perks", "farm-supply": "Farm Supply", pets: "Pets",
  craftworks: "Craftworks", kitchen: "Kitchen", friendships: "Friendships"
};
const $ = (selector) => document.querySelector(selector);

function say(text, bad) {
  $("#message").textContent = text;
  $("#message").classList.toggle("bad", !!bad);
}

function formatMissing(rows) {
  return rows.map((name) => LABELS[name] || name).join(", ");
}



function ageText(iso) {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "never";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + " h ago";
  return Math.round(hours / 24) + " d ago";
}

// One row per section: what it holds and how long ago it was read. No buttons
// here — the extension does not open Farm RPG pages for you, and a row of
// controls made the list unreadable.
function renderSections(result) {
  const list = document.querySelector("#sections");
  if (!list) return;
  const details = result.details || {};
  list.innerHTML = "";
  for (const [key, label] of Object.entries(LABELS)) {
    const row = details[key];
    const item = document.createElement("li");
    item.className = row ? "has" : "missing";

    const name = document.createElement("span");
    name.textContent = label;

    const state = document.createElement("b");
    if (row) {
      const count = Number(row.count || 0);
      state.textContent = (count ? count.toLocaleString() + " · " : "") + ageText(row.capturedAt);
    } else {
      state.textContent = "not captured";
    }

    item.append(name, state);
    list.append(item);
  }
}

async function refresh() {
  try {
    const [result, local] = await Promise.all([
      chrome.runtime.sendMessage({ type: "farmrpg-account-status" }),
      chrome.storage.local.get(["calculatorUrl"])
    ]);
    if (!result || result.ok === false) throw new Error(result && result.error || "Could not read extension storage");
    const count = (result.captured || []).filter((name) => LABELS[name]).length;
    $("#count").textContent = count + " / " + Object.keys(LABELS).length;
    $("#status").textContent = count ? "Account memory ready" : "No pages captured";
    $("#updated").textContent = result.syncedAt ? "Updated " + new Date(result.syncedAt).toLocaleString() : "Open Farm RPG and visit an account page";
    $("#missing").textContent = result.missing && result.missing.length ? "Still visit: " + formatMissing(result.missing) : "All core account sections learned.";
    renderSections(result);
    if (document.activeElement !== $("#calculatorUrl")) $("#calculatorUrl").value = local.calculatorUrl || DEFAULT_CALCULATOR;
  } catch (error) {
    $("#status").textContent = "Extension error";
    say(String(error && error.message || error), true);
  }
}

$("#capture").onclick = async () => {
  say("Capture queued…");
  const result = await chrome.runtime.sendMessage({ type: "farmrpg-capture-active" });
  if (!result || !result.ok) {
    say((result && result.error) || "Could not capture this page", true);
    setTimeout(refresh, 1200);
    return;
  }
  // A capture can succeed and still have read almost nothing. The warnings are
  // the only place that says so, and they used to go nowhere.
  const notes = (result.warnings || []).filter(Boolean);
  const rows = Number.isFinite(result.rowCount) ? result.rowCount : null;
  say(notes.length
    ? notes[0]
    : "Read this page" + (rows === null ? "" : " — " + rows.toLocaleString() + " row" + (rows === 1 ? "" : "s")) +
      ". Saved here, and sent to Lantern Ledger if you have it open.",
    notes.length > 0);
  setTimeout(refresh, 1200);
};

$("#open").onclick = async () => {
  const local = await chrome.storage.local.get(["calculatorUrl"]);
  let url = local.calculatorUrl || DEFAULT_CALCULATOR;
  url = url.replace(/#.*$/, "") + "#tower";
  chrome.tabs.create({ url });
};

$("#export").onclick = async () => {
  const saved = await chrome.runtime.sendMessage({ type: "farmrpg-account-save-file" });
  if (!saved || !saved.ok) return say(saved && saved.error || "Capture at least one Farm RPG page before exporting.", true);
  say("Saved to Downloads as " + saved.filename + " (replaces the previous copy).");
};

$("#autoSave").onchange = async (event) => {
  await chrome.storage.local.set({ autoSaveFile: !!event.target.checked });
  say(event.target.checked
    ? "Each capture now updates that one file automatically."
    : "Automatic saving off; use the button above when you want the file.");
};

$("#saveUrl").onclick = async () => {
  try {
    const url = new URL($("#calculatorUrl").value.trim());
    const localWeb = (url.protocol === "http:" || url.protocol === "https:") && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
    if (!localWeb && url.protocol !== "file:") throw new Error("Automatic sync is limited to localhost or a local file.");
    await chrome.storage.local.set({ calculatorUrl: url.href });
    say("Local calculator address saved.");
  } catch (error) {
    say(String(error && error.message || error), true);
  }
};

$("#clear").onclick = async () => {
  if (!confirm("Clear all locally saved Farm RPG captures?")) return;
  await chrome.runtime.sendMessage({ type: "farmrpg-account-clear" });
  say("Local account memory cleared.");
  // A capture arriving from a page you are looking at changes storage, so the
// list updates itself instead of waiting for the popup to be reopened.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.captures || changes.snapshot || changes.syncedAt)) refresh();
});

refresh();
};

(async () => {
  const prefs = await chrome.storage.local.get(["autoSaveFile"]);
  const box = $("#autoSave");
  if (box) box.checked = prefs.autoSaveFile === true;
})();

refresh();

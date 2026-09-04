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


const FALLBACK_URL = {
  profile: "https://farmrpg.com/#!/profile.php",
  inventory: "https://farmrpg.com/#!/inventory.php",
  tower: "https://farmrpg.com/#!/tower.php",
  mastery: "https://farmrpg.com/#!/mastery.php",
  "quests-available": "https://farmrpg.com/#!/quests.php",
  "quests-completed": "https://farmrpg.com/#!/questscomp.php",
};

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

// One row per section: how old it is, and a link that reopens the exact page it
// came from. Refreshing everything is then a few clicks instead of remembering
// which Farm RPG screens feed which numbers.
function renderSections(result) {
  const list = document.querySelector("#sections");
  if (!list) return;
  const details = result.details || {};
  list.innerHTML = "";
  for (const [key, label] of Object.entries(LABELS)) {
    const row = details[key];
    const url = (row && row.url) || FALLBACK_URL[key] || "";
    const item = document.createElement("li");
    item.className = row ? "has" : "missing";
    const name = document.createElement("span");
    name.textContent = label;
    const age = document.createElement("b");
    age.textContent = row ? ageText(row.capturedAt) : "not captured";
    item.append(name, age);
    if (url) {
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open";
      open.title = "Open this Farm RPG page; it captures itself once it loads";
      open.onclick = () => chrome.tabs.create({ url });
      item.append(open);
    }
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
  say(result && result.ok ? "Reading the open Farm RPG page…" : result && result.error || "Could not capture this page", !(result && result.ok));
  setTimeout(refresh, 1800);
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
  refresh();
};

(async () => {
  const prefs = await chrome.storage.local.get(["autoSaveFile"]);
  const box = $("#autoSave");
  if (box) box.checked = prefs.autoSaveFile !== false;
})();

refresh();

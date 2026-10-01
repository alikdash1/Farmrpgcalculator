// The step every planning tool runs right after loading data/*.js.
//
//   import { prepare } from "./prepare.mjs";
//   prepare(W);            // W = the vm window the data files were loaded into
//
// It fixes, in place, the two things that made this project's plans wrong
// over and over:
//
// 1. STALE ACCOUNT NUMBERS. data/personal-tower.js is a dated export. Every
//    plan built on it was quietly out of date - a Pitchfork 595,000 behind, a
//    Spoon Mega Mastery already finished. If a newer live capture exists, its
//    masteries, inventory, Tower floor and containers replace the old ones here,
//    and a one-line banner on stderr says exactly which capture and how old.
//
// 2. CONTAINER CONTENTS LISTED AS RECIPES. data/data.js carries what a bag,
//    chest or present GIVES as if it were what it COSTS ("Grab Bag 01 = 50 Bone
//    + 50 3-leaf Clover"). That invented demand for clover, bones and chest
//    parts. Those recipes are removed from FRPG_DATA.recipes.craft here.
//
// Where live captures come from: see docs/PULL_LIVE_ACCOUNT.md. Order of
// preference: --snapshot <file>, FRPG_SNAPSHOT, then the newest of
// raw/account-captures/live-*.json and ~/Downloads/*account-snapshot*.json.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STALE_DAYS = 3;

function ensure(W, file, global) {
  if (W[global]) return;
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  const ctx = { window: W, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: file });
}

// ---- 1. containers ---------------------------------------------------------

const CONTAINER_NAME = /(^(Box|Bag|Bags?) of )|(\b(Bag|Basket|Present|Chest|Crate|Bundle|Cornucopia|Envelope|Tote|Stocking|Box|Snack Pack)( \d+)?$)/;

export function isContainer(W, item) {
  if (!item) return false;
  const boxes = ((W.FRPG_CONTAINERS || {}).byName) || {};
  if (boxes[item.name]) return true;
  const info = ((W.FRPG_ITEM_INFO || {}).items || {})[item.name] || {};
  // The Locksmith hint lives in either field - "desc" is the game text, "note"
  // is buddy.farm's, and Green Backpack only says it in the note.
  const desc = `${info.desc || ""} ${info.note || ""}`;
  if (/locksmith|open to receive/i.test(desc)) return true;
  // Never made at a workbench, and either named like a container or described
  // by what is inside it ("Includes bait, fishing nets", "Contains 5 Playing
  // Cards"). Not "full of": Red Berry Pie is full of red berries. Wooden Box and Sturdy Box have a craft level, so they stay real.
  if (item.craftLevel != null) return false;
  return CONTAINER_NAME.test(item.name) || /\b(includes|contains)\b/i.test(desc);
}

function dropContainerRecipes(W) {
  const D = W.FRPG_DATA;
  if (!D || !D.recipes || !Array.isArray(D.recipes.craft)) return [];
  const byId = new Map(D.items.items.map((i) => [i.id, i]));
  const dropped = new Set();
  D.recipes.craft = D.recipes.craft.filter((r) => {
    const out = byId.get(r.itemId);
    if (isContainer(W, out)) { dropped.add(out.name); return false; }
    return true;
  });
  return [...dropped].sort();
}

// What N of a container actually hand over. "one of" bags give a single
// line, so the expected haul is each line's average over the line count -
// never every line at once.
export function containerYield(W, name, count) {
  const box = (((W.FRPG_CONTAINERS || {}).byName) || {})[name];
  const out = new Map();
  if (!box || !count) return out;
  const rows = (box.payout || []).filter((r) => Number.isFinite(Number(r.min)));
  const oneOf = /one of/i.test(String(box.mode || ""));
  for (const r of rows) {
    const max = Number.isFinite(Number(r.max)) ? Number(r.max) : Number(r.min);
    const each = oneOf ? ((Number(r.min) + max) / 2) / rows.length : Number(r.min);
    out.set(r.item, (out.get(r.item) || 0) + each * count);
  }
  return out;
}

// ---- 2. live account -------------------------------------------------------

const clean = (n) => String(n || "").trim().replace(/\s+\d{3}(?:\s*\/\s*\d{3})*\s*$/, "");

// Accept both the compact live format and the extension's full snapshot.
function normalise(raw, file) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.masteries && !Array.isArray(raw.masteries)) {
    return {
      file,
      masteries: raw.masteries,
      inventory: raw.inventory || {},
      masteriesAt: raw.masteriesAt || raw.capturedAt,
      inventoryAt: raw.inventoryAt || raw.capturedAt,
      towerFloor: Number(raw.towerFloor) || 0,
    };
  }
  if (!Array.isArray(raw.masteries)) return null;
  const masteries = {}; const inventory = {}; let mAt = 0; let iAt = 0;
  for (const r of raw.masteries) {
    const n = clean(r.itemName);
    let v = Number(r.masteryCount ?? r.progressCurrent);
    if (!Number.isFinite(v)) {
      if (r.megaMastery || /mega mastered/i.test(r.masteryLevel || "")) v = 1000000;
      else if (/grand mastered/i.test(r.masteryLevel || "")) v = 100000;
      else continue;
    }
    if (n) masteries[n] = v;
    mAt = Math.max(mAt, Date.parse(r.capturedAt || "") || 0);
  }
  for (const r of raw.inventory || []) {
    const n = r.itemName || r.name;
    const q = Number(r.quantity && typeof r.quantity === "object" ? r.quantity.value : (r.quantity ?? r.count ?? r.qty));
    if (n && Number.isFinite(q)) inventory[n] = q;
    iAt = Math.max(iAt, Date.parse(r.capturedAt || "") || 0);
  }
  const fallback = raw.generatedAt || null;
  return {
    file,
    masteries,
    inventory,
    masteriesAt: mAt ? new Date(mAt).toISOString() : fallback,
    inventoryAt: iAt ? new Date(iAt).toISOString() : fallback,
    towerFloor: Number(raw.levels && raw.levels.tower) || 0,
  };
}

function candidates() {
  const argv = process.argv;
  const at = argv.indexOf("--snapshot");
  if (at >= 0 && argv[at + 1]) return [path.resolve(argv[at + 1])];
  if (process.env.FRPG_SNAPSHOT) return [path.resolve(process.env.FRPG_SNAPSHOT)];
  const out = [];
  const dir = path.join(root, "raw", "account-captures");
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) if (/^live-.*\.json$/i.test(f)) out.push(path.join(dir, f));
  }
  const dl = path.join(os.homedir(), "Downloads");
  if (fs.existsSync(dl)) {
    for (const f of fs.readdirSync(dl)) if (/account-snapshot.*\.json$/i.test(f)) out.push(path.join(dl, f));
  }
  return out;
}

export function liveAccount() {
  let best = null;
  for (const file of candidates()) {
    let snap;
    try { snap = normalise(JSON.parse(fs.readFileSync(file, "utf8")), file); } catch { continue; }
    if (!snap) continue;
    const at = Date.parse(snap.masteriesAt || "") || 0;
    if (!best || at > (Date.parse(best.masteriesAt || "") || 0)) best = snap;
  }
  return best;
}

// The inventory cap is not a constant - it climbs daily. The fullest stacks
// in a fresh capture sit right at it, so read it from there.
function capFrom(inventory) {
  const counts = Object.entries(inventory)
    .filter(([name]) => !/^(Silver|Gold)$/.test(name))
    .map(([, q]) => q)
    .filter((q) => q > 1000)
    .sort((a, b) => b - a);
  if (counts.length < 5) return null;
  const top = counts[0];
  // Several stacks at exactly the same top value is the cap.
  return counts.filter((q) => q === top).length >= 3 ? top : null;
}

const days = (iso) => (Date.now() - (Date.parse(iso || "") || 0)) / 86400000;
const when = (iso) => (iso ? String(iso).replace("T", " ").slice(0, 16) : "unknown");

export function prepare(W, { quiet = false } = {}) {
  ensure(W, "data/wishing-well.js", "FRPG_CONTAINERS");
  ensure(W, "data/item-info.js", "FRPG_ITEM_INFO");
  const dropped = dropContainerRecipes(W);

  const tower = W.FRPG_PERSONAL_TOWER || (W.FRPG_PERSONAL_TOWER = { masteries: {} });
  const fileAt = tower.capturedAt || null;
  const live = liveAccount();
  let source;
  if (live && (Date.parse(live.masteriesAt || "") || 0) > (Date.parse(fileAt || "") || 0)) {
    tower.masteries = Object.assign({}, tower.masteries || {}, live.masteries);
    tower.towerAtCapture = Math.max(Number(tower.towerAtCapture) || 0, live.towerFloor || 0);
    tower.capturedAt = live.masteriesAt;
    const cap = capFrom(live.inventory);
    const facts = W.FRPG_PLAYER_FACTS || (W.FRPG_PLAYER_FACTS = {});
    if (cap) facts.inventoryCap = Object.assign({}, facts.inventoryCap || {}, { approx: cap, readFrom: "live capture" });
    // Containers actually in the bag, from the bag - not a number typed in weeks ago.
    const boxes = ((W.FRPG_CONTAINERS || {}).byName) || {};
    const held = {};
    for (const name of Object.keys(boxes)) if (live.inventory[name] > 0) held[name] = live.inventory[name];
    facts.containersHeld = held;
    W.FRPG_LIVE_ACCOUNT = { ...live, inventoryCap: cap };
    source = `live capture ${path.basename(live.file)} - masteries ${when(live.masteriesAt)}, inventory ${when(live.inventoryAt)}` +
      (cap ? `, cap ${cap.toLocaleString("en-US")}` : "");
    if (days(live.masteriesAt) > STALE_DAYS) source += `  [${Math.floor(days(live.masteriesAt))} DAYS OLD - pull a fresh one, docs/PULL_LIVE_ACCOUNT.md]`;
  } else {
    W.FRPG_LIVE_ACCOUNT = null;
    source = `data/personal-tower.js from ${when(fileAt)}  [${Math.floor(days(fileAt))} DAYS OLD - no newer live capture found; pull one, docs/PULL_LIVE_ACCOUNT.md]`;
  }
  if (!quiet) {
    process.stderr.write(`account: ${source}\n`);
    process.stderr.write(`data: ignoring ${dropped.length} container "recipes" (bags, chests, presents list their contents, not their cost)\n`);
  }
  return { source, dropped, live };
}

// What the bag holds right now: live inventory if there is one.
export function inventoryOf(W) {
  const live = W.FRPG_LIVE_ACCOUNT;
  const rows = new Map();
  if (live) for (const [n, q] of Object.entries(live.inventory)) if (q > 0) rows.set(n.toLowerCase(), q);
  return rows;
}

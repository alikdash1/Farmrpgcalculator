/* Farm RPG account importer — evidence-based text parsers for the inventory
 * page layout. Written against a real donated capture (2026-08).
 * Loaded as a classic script in the browser (window.ImporterShared) and via
 * require() in Node tests. No dependencies, no network access.
 *
 * NOTE: capture-current-page.js embeds a copy of these parsers because the
 * console script must be a single self-contained file. Keep both in sync. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImporterShared = Object.assign(root.ImporterShared || {}, api);
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  /* Icon-font ligatures and UI chrome that leak into visible text. */
  const NOISE_LINES = new Set([
    "heart_fill", "heart", "chevron_down", "chevron_up", "chevron_left", "chevron_right",
    "star", "star_border", "star_fill", "star_half", "lock", "lock_open", "search",
    "in craftworks", "favorite items", "craftable items", "sort options:", "item name",
    "quantity (asc)", "quantity (desc)", "adjust order", "buy more materials",
    "view / edit craftable items", "go to craftworks", "back", ",",
    "fish & bait", "crops", "seeds", "loot & treasure", "runestones", "books",
    "cards", "super rares", "inventory stats", "unique items and", "mastery progress",
  ]);

  function isNoise(line) {
    return NOISE_LINES.has(line.trim().toLowerCase());
  }

  function isPlainQty(line) {
    return /^[\d,]+$/.test(line.trim());
  }

  const NAME_RE = /^(?=.*\p{L})[\p{L}\p{N}][\p{L}\p{N} .'’&+\-()]{1,50}$/u;

  function isPlausibleName(line) {
    const l = line.trim();
    return NAME_RE.test(l) && !isNoise(l) && !isPlainQty(l);
  }

  /**
   * Detect whether visible text looks like the Farm RPG "My Inventory" page
   * (craftable list + capacity sentence + Meals/Items sections).
   */
  function looksLikeInventoryPage(lines, text) {
    const hasCapacitySentence = /cannot have more than\s*[\d,]+\s*of any single thing/i.test(text);
    const lower = lines.map((l) => l.trim().toLowerCase());
    return hasCapacitySentence || (lower.includes("meals") && lower.includes("items"));
  }

  /**
   * Parse the inventory-page layout.
   * Returns { capacityMax, craftingLevel, inventory: [], consumables: [], masteries: [], notes: [] }
   * where quantities are RAW STRINGS (the caller runs them through
   * parseQuantity and attaches confidence labels). Nothing is invented:
   * entries without a visible count are skipped.
   */
  function parseInventoryPage(lines, text) {
    const out = { capacityMax: null, craftingLevel: null, inventoryStats: { uniqueItems: null, totalItems: null }, inventory: [], consumables: [], masteries: [], notes: [] };

    const capM = text.match(/cannot have more than\s*([\d,]+)\s*of any single thing/i);
    if (capM) out.capacityMax = capM[1];

    const lvlM = text.match(/crafting level is\s*([\d,]+)/i);
    if (lvlM) out.craftingLevel = lvlM[1];
    const statsM = text.match(/inventory contains\s*([\d,]+)\s*unique items and\s*([\d,]+)\s*items in total/i);
    if (statsM) {
      out.inventoryStats.uniqueItems = statsM[1];
      out.inventoryStats.totalItems = statsM[2];
    }

    const clean = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    const idxOf = (label, from) => {
      for (let i = from || 0; i < clean.length; i++) {
        if (clean[i].toLowerCase() === label) return i;
      }
      return -1;
    };
    const idxCap = clean.findIndex((l) => /^currently, you cannot have more than/i.test(l));
    const idxMeals = idxOf("meals", idxCap === -1 ? 0 : idxCap);
    const idxItems = idxMeals === -1 ? -1 : idxOf("items", idxMeals + 1);
    const idxStats = idxItems === -1 ? -1 : idxOf("inventory stats", idxItems + 1);

    const inventorySeen = new Map();
    const addInventory = (name, qtyRaw, confidence, extra) => {
      const key = name.trim().toLowerCase();
      if (!inventorySeen.has(key)) {
        const entry = { name: name.trim(), quantity: qtyRaw, confidence: confidence };
        if (extra && extra.atCapacity) entry.atCapacity = true;
        inventorySeen.set(key, entry);
        out.inventory.push(entry);
      }
    };

    /* ---- zone 1: craftable/favorites list (Name + "(qty)", plus
       requirement lines "have / need Material" both inline and split) ---- */
    const craftEnd = idxCap === -1 ? (idxMeals === -1 ? clean.length : idxMeals) : idxCap;
    const REQ_INLINE = /^([\d,]+(?:\.\d+)?[KMBT]?)\s*\/\s*([\d,]+(?:\.\d+)?[KMBT]?)\s+([A-Za-z][A-Za-z0-9 '&+\-]{1,40})$/;
    const REQ_SPLIT_A = /^([\d,]+(?:\.\d+)?[KMBT]?)\s*\/$/;
    for (let i = 0; i < craftEnd; i++) {
      const line = clean[i];
      if (isNoise(line)) continue;
      // "(qty)" marks a craftable item. Its name is the FIRST plausible name
      // above the count, after the previous entry boundary (icon noise,
      // requirement line, or bare number). Description lines sit between.
      const pm = line.match(/^\(([\d,]+)\)$/);
      if (pm) {
        const candidates = [];
        for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
          const l = clean[j];
          if (isNoise(l) || isPlainQty(l) || REQ_INLINE.test(l) || REQ_SPLIT_A.test(l) || /^\([\d,]+\)$/.test(l)) break;
          if (isPlausibleName(l)) candidates.unshift(l);
        }
        if (candidates.length) addInventory(candidates[0], pm[1], "inferred-page-section", null);
        continue;
      }
      // inline "have / need Material"
      let m = line.match(REQ_INLINE);
      if (m) {
        addInventory(m[3], m[1], "inferred-page-section", null);
        continue;
      }
      // split "have /" | "need" | "Material"
      m = line.match(REQ_SPLIT_A);
      if (m && i + 2 < craftEnd && isPlainQty(clean[i + 1]) && isPlausibleName(clean[i + 2])) {
        addInventory(clean[i + 2], m[1], "inferred-page-section", null);
        i += 2;
        continue;
      }
    }

    /* ---- zones 2+3: Meals and Items sections.
       Entry = name line, then description/status lines, then a bare count. ---- */
    const STATUS_RE = /^(Grand Mastered|Mega Mastered|Mastered)$/i;
    function scanEntries(start, end, onEntry) {
      let i = start;
      while (i >= 0 && i < end) {
        const line = clean[i];
        if (!isPlausibleName(line)) { i++; continue; }
        const name = line;
        let j = i + 1;
        let count = null, status = null, atCapacity = false;
        const desc = [];
        while (j < end) {
          const l = clean[j];
          if (isPlainQty(l)) { count = l; break; }
          const sm = l.match(STATUS_RE);
          if (sm) { status = sm[1]; j++; continue; }
          if (l === "MAX ON HAND") { atCapacity = true; j++; continue; }
          if (isNoise(l)) { j++; continue; }
          desc.push(l);
          j++;
          if (desc.length > 6) break; // safety: unreasonably long description
        }
        if (count !== null) {
          onEntry({ name: name, count: count, status: status, atCapacity: atCapacity, description: desc.join(" ") || null });
          i = j + 1;
        } else {
          i++; // no visible count -> skip; never invent
        }
      }
    }

    if (idxMeals !== -1 && idxItems !== -1) {
      scanEntries(idxMeals + 1, idxItems, (e) => {
        out.consumables.push({ name: e.name, quantity: e.count, confidence: "visible-label", kind: "meal" });
        if (e.status) {
          out.masteries.push({ itemName: e.name, status: e.status, confidence: "visible-label" });
        }
      });
    }
    if (idxItems !== -1) {
      scanEntries(idxItems + 1, idxStats === -1 ? clean.length : idxStats, (e) => {
        addInventory(e.name, e.count, "visible-label", e.atCapacity ? { atCapacity: true } : null);
        if (e.status) {
          out.masteries.push({ itemName: e.name, status: e.status, confidence: "visible-label" });
        }
      });
    }

    return out;
  }

  /**
   * Parse the current profile layout without guessing from navigation labels.
   * Returns raw strings; the collector attaches evidence wrappers.
   */
  function parseProfilePage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { player: {}, activeEffects: [] };
    const dateRe = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i;

    const farmLine = clean.find((line) => /^Farm Name:\s*\S/i.test(line));
    if (farmLine) out.player.farmName = farmLine.replace(/^Farm Name:\s*/i, "").trim();

    const started = clean.findIndex((line) => /^Started$/i.test(line));
    if (started > 0 && dateRe.test(clean[started - 1])) {
      out.player.accountCreated = clean[started - 1];
      let serverMarker = -1;
      for (let i = started - 2; i >= 0; i--) {
        if (/^Current server time:/i.test(clean[i])) { serverMarker = i; break; }
      }
      if (serverMarker >= 0) {
        const identity = clean.slice(serverMarker + 1, started - 1);
        if (identity[0] && identity[0].length <= 40) out.player.name = identity[0];
        if (!out.player.farmName && identity[1] && identity[1].length <= 60) out.player.farmName = identity[1];
      }
    }

    const effectNames = [
      "Acorn Pie", "Hickory Omelette", "Mushroom Stew", "Neigh",
      "Quandary Chowder", "Cabbage Stew", "Lemon Cream Pie",
      "Sea Pincher Special", "Shrimp-a-Plenty",
    ];
    const effectStart = clean.findIndex((line) => /^Active Effects\s*\(?$/i.test(line) || /^Active Effects\s*\(/i.test(line));
    const effectEnd = clean.findIndex((line, i) => i > effectStart && (/^Completed$/i.test(line) || /^Where do you want to go\?$/i.test(line)));
    if (effectStart >= 0 && effectEnd > effectStart) {
      const section = clean.slice(effectStart + 1, effectEnd);
      for (let i = 0; i < section.length; i++) {
        const canonical = effectNames.find((name) => name.toLowerCase() === section[i].toLowerCase());
        if (!canonical) continue;
        let end = section.length;
        for (let j = i + 1; j < section.length; j++) {
          if (effectNames.some((name) => name.toLowerCase() === section[j].toLowerCase())) { end = j; break; }
        }
        const block = section.slice(i + 1, end);
        const usesLine = block.find((line) => /^\d[\d,]*\s+uses?\s+left$/i.test(line));
        const timeRe = /^(?:for\s+)?(?:(?:\d+\s*(?:day|hour|min|minute|sec|second)s?)(?:,\s*|\s+)){0,3}\d+\s*(?:day|hour|min|minute|sec|second)s?$/i;
        const timeLine = block.find((line) => !/^for\s+/i.test(line) && timeRe.test(line)) || block.find((line) => timeRe.test(line));
        out.activeEffects.push({
          name: canonical,
          uses: usesLine ? usesLine.match(/^([\d,]+)/)[1] : null,
          remaining: timeLine ? timeLine.replace(/^for\s+/i, "") : null,
        });
      }
    }
    return out;
  }

  /** Parse the Tower progress panel and its visible reward history. */
  function parseTowerPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = {
      currentLevel: null,
      ascensionKnowledge: null,
      dailySilver: null,
      nextLevel: null,
      nextAkCost: null,
      nextSilverCost: null,
      nextMegaMasteries: null,
      nextRewards: [],
      history: [],
    };
    let m = text.match(/You currently have\s*([\d,]+)\s*Ascension Knowledge/i);
    if (m) out.ascensionKnowledge = m[1];
    m = text.match(/Currently, you are at\s*([\d,]+)\s*Silver generated daily/i);
    if (m) out.dailySilver = m[1];

    const progress = clean.findIndex((line) => /^Tower Progress$/i.test(line));
    if (progress < 0) return out;
    const levelIndexes = [];
    for (let i = progress + 1; i + 1 < clean.length; i++) {
      if (/^Level$/i.test(clean[i]) && /^\d+$/.test(clean[i + 1])) levelIndexes.push(i);
      if (/^Ground Floor$/i.test(clean[i])) break;
    }
    if (!levelIndexes.length) return out;

    const rewardPairs = (start, end) => {
      const rewards = [];
      for (let i = start; i + 1 < end; i++) {
        const q = clean[i + 1].match(/^\(x([\d,]+)\)$/i);
        if (q && isPlausibleName(clean[i])) {
          rewards.push({ name: clean[i], quantity: q[1] });
          i++;
        }
      }
      return rewards;
    };

    const nextStart = levelIndexes[0];
    const nextEnd = levelIndexes[1] || clean.length;
    out.nextLevel = clean[nextStart + 1];
    const nextBlock = clean.slice(nextStart + 2, nextEnd);
    const ak = nextBlock.find((line) => /^Cost:\s*[\d,]+\s*AK$/i.test(line));
    if (ak) out.nextAkCost = ak.match(/([\d,]+)/)[1];
    for (let i = 0; i + 2 < nextBlock.length; i++) {
      if (/^[\d,]+(?:\.\d+)?$/.test(nextBlock[i]) && /^[KMBT]$/i.test(nextBlock[i + 1]) && /^Silver$/i.test(nextBlock[i + 2])) {
        out.nextSilverCost = nextBlock[i] + nextBlock[i + 1].toUpperCase();
        break;
      }
    }
    const mm = nextBlock.findIndex((line) => /^Mega Masteries:$/i.test(line));
    if (mm >= 0 && nextBlock[mm + 1] && /^[\d,]+$/.test(nextBlock[mm + 1])) out.nextMegaMasteries = nextBlock[mm + 1];
    const nextRewardLabel = clean.findIndex((line, i) => i > nextStart && i < nextEnd && /^Level Rewards:$/i.test(line));
    if (nextRewardLabel >= 0) out.nextRewards = rewardPairs(nextRewardLabel + 1, nextEnd);

    for (let n = 1; n < levelIndexes.length; n++) {
      const start = levelIndexes[n];
      const ground = clean.findIndex((line, i) => i > start && /^Ground Floor$/i.test(line));
      const end = levelIndexes[n + 1] || ground;
      const safeEnd = end > start ? end : clean.length;
      const block = clean.slice(start + 2, safeEnd);
      const got = block.findIndex((line) => /^You got:$/i.test(line));
      if (got < 0) continue;
      const date = block.find((line) => /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(line)) || null;
      const current = block.some((line) => /^You are here\b/i.test(line));
      const entry = {
        level: clean[start + 1],
        date: date,
        current: current,
        rewards: rewardPairs(start + 2 + got + 1, safeEnd),
      };
      out.history.push(entry);
      if (current) out.currentLevel = entry.level;
    }
    if (!out.currentLevel && out.history.length) out.currentLevel = out.history[0].level;
    return out;
  }

  /** Parse the real Item Mastery list: summary totals plus every visible row. */
  function parseMasteryPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { stats: { mastered: null, grandMastered: null, megaMastered: null }, masteries: [] };
    let m = text.match(/So far, you have\s*([\d,]+)\s*items Mastered,\s*([\d,]+)\s*items Grand Mastered and\s*([\d,]+)\s*items Mega Mastered/i);
    if (m) {
      out.stats.mastered = m[1];
      out.stats.grandMastered = m[2];
      out.stats.megaMastered = m[3];
    }
    const start = clean.findIndex((line) => /^Mastery In-Progress$/i.test(line));
    if (start < 0) return out;
    let tier = null;
    const seen = new Set();
    for (let i = start + 1; i < clean.length; i++) {
      const line = clean[i];
      if (/^Tier V \(MM\)$/i.test(line)) { tier = "Tier V (MM)"; continue; }
      if (/^Tier IV \(GM\)$/i.test(line)) { tier = "Tier IV (GM)"; continue; }
      if (/^Tier III \(M\)$/i.test(line)) { tier = "Tier III (M)"; continue; }
      if (/^Tier II$/i.test(line)) { tier = "Tier II"; continue; }
      if (/^Tier I$/i.test(line)) { tier = "Tier I"; continue; }
      if (/^No Tier$/i.test(line)) { tier = "No Tier"; continue; }
      if (/^Mega Mastered$/i.test(line)) { tier = "Mega Mastered"; continue; }
      const progress = line.match(/^([\d,]+)\s*\/\s*([\d,]+|∞)\s*Progress$/i);
      if (!progress || i === 0) continue;
      const name = clean[i - 1];
      if (!isPlausibleName(name) || seen.has(name.toLowerCase())) continue;
      const current = progress[1];
      const target = progress[2];
      const currentNumber = Number(current.replace(/,/g, ""));
      const targetNumber = target === "∞" ? null : Number(target.replace(/,/g, ""));
      const mega = target === "∞" || currentNumber >= 1000000;
      const grand = mega || currentNumber >= 100000;
      const mastered = grand || currentNumber >= 10000;
      seen.add(name.toLowerCase());
      out.masteries.push({
        itemName: name,
        masteryCount: current,
        masteryLevel: tier,
        mastered: mastered,
        grandMastery: grand,
        megaMastery: mega,
        completed: mega,
        progressCurrent: current,
        progressTarget: targetNumber === null ? null : progress[2],
        progressPercent: targetNumber ? (currentNumber / targetNumber) * 100 : null,
        confidence: "visible-label",
      });
    }
    return out;
  }

  /** Parse the Help Requests dashboard list without mistaking navigation for quests. */
  function parseQuestDashboard(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = {
      stats: { specialAvailable: null, active: null, personalAvailable: null, requestsCompleted: null, personalCompleted: null },
      quests: [],
    };
    let m = text.match(/Special Requests\s*\(([\d,]+)\)/i);
    if (m) out.stats.specialAvailable = m[1];
    m = text.match(/Active Requests\s*\(([\d,]+)\)/i);
    if (m) out.stats.active = m[1];
    m = text.match(/Personal Requests\s*\(([\d,]+)\)/i);
    if (m) out.stats.personalAvailable = m[1];
    m = text.match(/Requests Completed\s*([\d,]+)/i);
    if (m) out.stats.requestsCompleted = m[1];
    m = text.match(/Personal Completed\s*([\d,]+)/i);
    if (m) out.stats.personalCompleted = m[1];

    const percent = (value) => {
      const match = String(value || "").match(/^([\d.]+)%$/);
      return match ? match[1] : null;
    };
    const specialStart = clean.findIndex((line) => /^Special Requests\s*\(/i.test(line));
    const activeStart = clean.findIndex((line) => /^Active Requests\s*\(/i.test(line));
    if (specialStart >= 0 && activeStart > specialStart) {
      for (let i = specialStart + 1; i + 1 < activeStart; i++) {
        if (!/^Available$/i.test(clean[i + 1]) || clean[i].length < 3 || clean[i].length > 80 || /^\d/.test(clean[i])) continue;
        const availability = clean[i + 2] && /^(?:[A-Za-z]{3}\s+\d{1,2}|Available)/i.test(clean[i + 2]) ? clean[i + 2] : null;
        const progressPercent = percent(clean[i + (availability ? 3 : 2)]);
        out.quests.push({
          title: clean[i], giver: null, status: "available", availability,
          progressPercent, requiredItems: [], rewards: [], prerequisites: null,
          chain: "Special Request", confidence: "visible-label",
        });
      }
    }

    const personalStart = clean.findIndex((line, i) => i > activeStart && /^Personal Requests\s*\(/i.test(line));
    if (activeStart >= 0) {
      const end = personalStart > activeStart ? personalStart : clean.length;
      for (let i = activeStart + 1; i + 1 < end; i++) {
        if (!/^Request from\s+/i.test(clean[i + 1]) || clean[i].length < 3 || clean[i].length > 80 || /^\d/.test(clean[i])) continue;
        const giver = clean[i + 1].replace(/^Request from\s+/i, "").replace(/\s*-\s*$/, "").trim();
        const side = clean[i + 2] && /^Side Request$/i.test(clean[i + 2]);
        const progressPercent = percent(clean[i + (side ? 3 : 2)]);
        out.quests.push({
          title: clean[i], giver, status: "active", availability: null,
          progressPercent, requiredItems: [], rewards: [], prerequisites: null,
          chain: side ? "Side Request" : null, confidence: "visible-label",
        });
      }
    }
    return out;
  }

  /** Parse the Quest Diary completed-history list. Incomplete final rows are ignored. */
  function parseCompletedQuestPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = {
      stats: { completedListed: null, completedCaptured: 0, completedHistoryTruncated: /\[…truncated\]/.test(text) },
      quests: [],
    };
    const start = clean.findIndex((line) => /^Completed Requests\s*\([\d,]+\)$/i.test(line));
    if (start < 0) return out;
    const listed = clean[start].match(/\(([\d,]+)\)/);
    if (listed) out.stats.completedListed = listed[1];
    let boundary = start;
    for (let i = start + 1; i < clean.length; i++) {
      if (/^check$/i.test(clean[i])) { boundary = i; continue; }
      if (!/^Request from\s+/i.test(clean[i])) continue;
      const titleParts = clean.slice(boundary + 1, i);
      if (!titleParts.length || titleParts.some((line) => /^Completed on\s+/i.test(line))) continue;
      const giver = clean[i].replace(/^Request from\s+/i, "").replace(/\s*-\s*$/, "").trim();
      let cursor = i + 1;
      let chain = null;
      if (!/^Completed on\s+/i.test(clean[cursor] || "") && /^Completed on\s+/i.test(clean[cursor + 1] || "")) {
        chain = clean[cursor++];
      }
      const completed = (clean[cursor] || "").match(/^Completed on\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})$/i);
      if (!completed) continue;
      const community = (clean[cursor + 1] || "").match(/^([\d,]+)\s+players(?:\s*\(([\d.]+)%\))?\s+have completed$/i);
      out.quests.push({
        title: titleParts.join(" "), giver, status: "completed",
        requiredItems: [], rewards: [], prerequisites: null, chain,
        completionDate: completed[1],
        communityCompletions: community ? community[1] : null,
        communityCompletionPercent: community && community[2] ? community[2] : null,
        confidence: "visible-label",
      });
    }
    out.stats.completedCaptured = out.quests.length;
    return out;
  }

  const PERK_CATALOG = {
    "Farming Perks": ["Farming Primer", "Farming Primer II", "Quicker Farming I", "Quicker Farming II", "Quicker Farming III", "Quicker Farming IV", "Double Prizes I", "Double Prizes II", "Quicker Corn I", "Quicker Corn II"],
    "Fishing Perks": ["Fishing Primer", "Fishing Primer II", "Bait Saver I", "Bait Saver II", "Bait Saver III", "Bait Saver IV", "Double Hooks", "Crazy Hooks I", "Stamina Lure I", "Stamina Lure II"],
    "Crafting Perks": ["Crafting Primer", "Crafting Primer II", "Artisan I", "Artisan II", "Artisan III", "Artisan IV", "Resource Saver I"],
    "Exploring Perks": ["Exploring Primer", "Exploring Primer II", "Wanderer I", "Wanderer II", "Wanderer III", "Wanderer IV", "Energy Drink"],
    "Cooking Perks": ["Cooking Primer", "Cooking Primer II", "Quicker Cooking I", "Quicker Cooking II", "Please Recycle III", "Induction Burner I"],
    "Mining Perks": ["Mining Primer", "Mining Primer II", "Pickaxe Saver I", "Effective Mining I", "Deposit Detector I"],
    "Profit Perks": ["Negotiator I", "Negotiator II", "Negotiator III", "Negotiator IV"],
    "Miscellaneous Perks": ["Animal Lover", "Please Recycle I", "Forester I", "Forester II", "Bottle Warmer", "Vault Plans", "Raptor Sofa", "Millions of Peaches", "Friendship Primer", "O.M.G I", "Double Rewards I", "Double Rewards II", "Free Spin I", "Keymaster I"],
    "Artifact Perks": ["Enriched Soil", "Gift of Persuasion", "Steady Hands", "Animal Charmer", "Eagle Eye", "Fishing Trawl", "Charming Personality", "Bonus Crops"],
  };

  /** Parse the canonical Perks page list. Ownership stays unknown when it is styling-only. */
  function parsePerkPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = {
      stats: { pointsLeft: null, pointsUsed: null, perksAvailable: null, timesReset: null, activeSetId: null, activeSetName: null },
      perks: [],
    };
    for (const [key, re] of [
      ["pointsLeft", /([\d,]+)\s*Points Left/i],
      ["pointsUsed", /([\d,]+)\s*Points Used/i],
      ["perksAvailable", /([\d,]+)\s*Perks Avail/i],
      ["timesReset", /([\d,]+)\s*Times Reset/i],
    ]) {
      const match = text.match(re);
      if (match) out.stats[key] = match[1];
    }
    const setIndex = clean.findIndex((line) => /^My Perk Sets$/i.test(line));
    if (setIndex >= 0) {
      if (/^\d+$/.test(clean[setIndex + 1] || "")) out.stats.activeSetId = clean[setIndex + 1];
      if (clean[setIndex + 2] && !/Perks$/i.test(clean[setIndex + 2])) out.stats.activeSetName = clean[setIndex + 2];
    }
    const allNames = new Set(Object.values(PERK_CATALOG).flat());
    const headings = new Set(Object.keys(PERK_CATALOG));
    const listStart = clean.findIndex((line) => /^Farming Perks$/i.test(line));
    const end = clean.findIndex((line, i) => i > listStart && /^Mastery Progress$/i.test(line));
    for (const [category, names] of Object.entries(PERK_CATALOG)) {
      for (const name of names) {
        const index = clean.findIndex((line, i) => i > listStart && line === name);
        if (index < 0 || (end >= 0 && index > end)) continue;
        const description = [];
        let towerRequirement = null;
        for (let i = index + 1; i < clean.length; i++) {
          const line = clean[i];
          if (allNames.has(line) || headings.has(line) || (end >= 0 && i >= end)) break;
          if (/^[\d,]+(?:\/[\d,.]+[KMBT]?)?$/i.test(line)) break;
          const requirement = line.match(/^Requires Tower Level\s*([\d,]+)$/i);
          if (requirement) towerRequirement = requirement[1];
          else description.push(line);
        }
        out.perks.push({
          name, category, owned: null, description: description.join(" ") || null,
          towerRequirement, confidence: "visible-label",
        });
      }
    }
    return out;
  }

  function inferPerkOwnership(domEvidence) {
    if (!domEvidence) return null;
    let evidence = domEvidence;
    if (typeof evidence === "string") {
      try { evidence = JSON.parse(evidence); } catch (err) { return null; }
    }
    if (!evidence || typeof evidence !== "object") return null;
    const controls = Array.isArray(evidence.controls) ? evidence.controls.map(String) : [];
    if (controls.some((value) => /^Unlocked$/i.test(value.trim()))) return true;
    if (controls.some((value) => /^\d[\d,]*\s+Points?$/i.test(value.trim()))) return false;
    return null;
  }

  /** Parse production/capacity values visible on the combined Farm + Supply page. */
  function parseFarmSupplyOverview(lines, text) {
    const out = {
      capacityMax: null, staminaMax: null,
      supplyStats: { maxMailbox: null, activeMealEffects: null },
      infrastructure: {},
    };
    let m = text.match(/\+50 Inventory Cap\s+Current Cap is\s*([\d,]+)/i);
    if (m) out.capacityMax = m[1];
    m = text.match(/\+25 Max Stamina\s+Current Max is\s*([\d,]+)/i);
    if (m) out.staminaMax = m[1];
    m = text.match(/\+15 Max Mailbox\s+Current Max is\s*([\d,]+)/i);
    if (m) out.supplyStats.maxMailbox = m[1];
    m = text.match(/\+1 Active Meal Effect\s+Current Max is\s*([\d,]+)/i);
    if (m) out.supplyStats.activeMealEffects = m[1];
    const set = (building, values) => { out.infrastructure[building] = values; };
    m = text.match(/Storehouse\s+Work to increase max inventory\s*([\d,]+)\s+Inventory\s+Increase Per Day/i);
    if (m) set("storehouse", { inventoryPerDay: m[1] });
    m = text.match(/Farmhouse\s+Rest to increase max stamina\s*([\d,]+)\s+Stamina\s+Increase Per Day/i);
    if (m) set("farmhouse", { staminaPerDay: m[1] });
    m = text.match(/Orchard\s+Plant trees to produce fruit daily\s*([\d,]+)\s+Apples\s*([\d,]+)\s+Oranges\s*([\d,]+)\s+Lemons/i);
    if (m) set("orchard", { applesPerDay: m[1], orangesPerDay: m[2], lemonsPerDay: m[3] });
    m = text.match(/Vineyard\s+Grow grapes for wine making\s*([\d,]+)\s+Grapes\s+Every Day/i);
    if (m) set("vineyard", { grapesPerDay: m[1] });
    m = text.match(/Sawmill\s+Produces Boards\/Wood hourly\s*([\d,]+)\s+Boards\s*([\d,]+)\s+Wood\s*([\d,]+)\s+Oak/i);
    if (m) set("sawmill", { boardsPerHour: m[1], woodPerHour: m[2], oakPerHour: m[3] });
    m = text.match(/Ironworks\s+Produces Iron\/Nails every 3 mins\s*([\d,]+)\s+Iron\s*([\d,]+)\s+Nails/i);
    if (m) set("ironworks", { ironPer3Minutes: m[1], nailsPer3Minutes: m[2] });
    m = text.match(/Steelworks\s+Produces Steel\/Wire hourly\s*([\d,]+)\s+Steel\s*([\d,]+)\s+Wire/i);
    if (m) set("steelworks", { steelPerHour: m[1], wirePerHour: m[2] });
    m = text.match(/Hay Field\s+Produces Straw every 10 mins\s*([\d,]+)\s+Straw\s*([\d,]+)\s+Hourly/i);
    if (m) set("hayField", { strawPer10Minutes: m[1], strawPerHour: m[2] });
    m = text.match(/Quarry\s+Stone\/Gems every 10 mins\s*([\d,]+)\s+Stone\s*([\d,]+)\s+Stone Hourly\s*([\d,]+)\s+Coal Hourly/i);
    if (m) set("quarry", { stonePer10Minutes: m[1], stonePerHour: m[2], coalPerHour: m[3] });
    m = text.match(/Trout \/ Bait Farm\s+Produces Trout & Bait daily\s*([\d,]+)\s+Trout\s*([\d,]+)\s+Grubs\s*([\d,]+)\s+Minnows/i);
    if (m) set("troutFarm", { troutPerDay: m[1], grubsPerDay: m[2], minnowsPerDay: m[3] });
    m = text.match(/Worm Habitat\s+Produces bait hourly\s*([\d,]+)\s+Worms\s*([\d,]+)\s+Gummies\s*([\d,]+)\s+Mealworms/i);
    if (m) set("wormHabitat", { wormsPerHour: m[1], gummiesPerHour: m[2], mealwormsPerHour: m[3] });
    return out;
  }

  function parseFriendshipPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { townsfolkOfDay: null, friendships: [] };
    const start = clean.findIndex((line) => /^Current Levels$/i.test(line));
    const end = clean.findIndex((line, index) => index > start && /^Drink Baba Cola$/i.test(line));
    if (start === -1) return out;
    const dayMatch = text.match(/Current Levels\s+([^\r\n]+?)\s+is the Townsfolk of the Day!/i);
    if (dayMatch) out.townsfolkOfDay = dayMatch[1].trim();
    for (let i = start + 1; i < (end === -1 ? clean.length : end) - 1; i++) {
      const levelMatch = clean[i + 1].match(/^Level\s+([\d,]+)$/i);
      if (!levelMatch) continue;
      const name = clean[i];
      if (/^Next Rewards at$/i.test(name)) continue;
      let nextRewardLevel = null;
      if (/^Next Rewards at$/i.test(clean[i + 2] || "")) {
        const rewardMatch = (clean[i + 3] || "").match(/^Level\s+([\d,]+)$/i);
        if (rewardMatch) nextRewardLevel = rewardMatch[1];
      }
      out.friendships.push({
        name, level: levelMatch[1], nextRewardLevel,
        townsfolkOfDay: out.townsfolkOfDay === name,
        confidence: "visible-label",
      });
    }
    return out;
  }

  function parseKitchenPage(lines, text) {
    const out = {
      cookingLevel: null, ovensOwned: null, emptyOvens: null,
      maximumOvensAvailable: null, nextOvenCookingLevel: null, fruitPunchLeft: null,
    };
    let match = text.match(/Your Cooking Skill Level is\s*([\d,]+)/i);
    if (match) out.cookingLevel = match[1];
    const ovenNumbers = Array.from(text.matchAll(/Oven\s*#\s*(\d+)/gi)).map((item) => Number(item[1]));
    if (ovenNumbers.length) out.ovensOwned = String(Math.max.apply(null, ovenNumbers));
    const emptyMatches = text.match(/Empty\s+Oven\s*#\s*\d+/gi);
    if (emptyMatches) out.emptyOvens = String(emptyMatches.length);
    match = text.match(/Max ovens currently:\s*([\d,]+)/i);
    if (match) out.maximumOvensAvailable = match[1];
    match = text.match(/Add an Oven\s+Cooking Level\s+([\d,]+)\s+Required/i);
    if (match) out.nextOvenCookingLevel = match[1];
    match = text.match(/Drink Fruit Punch\s*\(([\d,]+)\s+left\)/i);
    if (match) out.fruitPunchLeft = match[1];
    return out;
  }

  return {
    NOISE_LINES: NOISE_LINES,
    isNoise: isNoise,
    isPlainQty: isPlainQty,
    isPlausibleName: isPlausibleName,
    looksLikeInventoryPage: looksLikeInventoryPage,
    parseInventoryPage: parseInventoryPage,
    parseProfilePage: parseProfilePage,
    parseTowerPage: parseTowerPage,
    parseMasteryPage: parseMasteryPage,
    parseQuestDashboard: parseQuestDashboard,
    parseCompletedQuestPage: parseCompletedQuestPage,
    parsePerkPage: parsePerkPage,
    inferPerkOwnership: inferPerkOwnership,
    parseFarmSupplyOverview: parseFarmSupplyOverview,
    parseFriendshipPage: parseFriendshipPage,
    parseKitchenPage: parseKitchenPage,
    PERK_CATALOG: PERK_CATALOG,
  };
});

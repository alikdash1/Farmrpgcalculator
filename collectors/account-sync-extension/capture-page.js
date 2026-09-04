/* ============================================================================
 * Farm RPG — visible page capture (read-only)
 * ----------------------------------------------------------------------------
 * HOW TO USE
 *   1. Log in to Farm RPG normally and manually open ONE account page.
 *   2. Open browser developer tools (F12) and go to the Console tab.
 *   3. Paste this whole file, press Enter.
 *   4. A JSON capture of the currently visible page downloads automatically.
 *   5. Repeat on other pages, then import all files into the local importer
 *      (collectors/account-importer/index.html).
 *
 * SAFETY
 *   - Reads only what is visible on the current page. It never clicks,
 *     never navigates, never submits forms, never sends anything anywhere.
 *   - It does not read cookies, passwords, hidden inputs, localStorage,
 *     tokens or authorization headers. The URL is recorded without query
 *     parameters. Long token-like text is redacted.
 *   - Extraction is PROVISIONAL: it is generic label/table/text parsing, not
 *     tuned to Farm RPG's live markup. Anything it cannot confidently read
 *     stays null and the raw visible text is kept for later parsing.
 * ========================================================================== */
(() => {
  "use strict";

  const COLLECTOR_VERSION = "1.2.0";
  const CAPTURE_SCHEMA = "farmrpg-page-capture-v1";
  const TEXT_LIMIT = 500000;

  /* ---------------- tiny helpers ---------------- */

  const SUFFIX_EXP = { K: 3, M: 6, B: 9, T: 12 };
  const MAX_SAFE_BIG = BigInt(Number.MAX_SAFE_INTEGER);

  function parseQty(input) {
    if (input === null || input === undefined) return null;
    const raw = String(input).trim();
    if (!raw) return null;
    const m = raw.match(/^(-?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([KMBT])?$/i);
    if (!m) return null;
    const neg = m[1] === "-";
    const mantissa = m[2].replace(/,/g, "");
    const exp = m[3] ? SUFFIX_EXP[m[3].toUpperCase()] : 0;
    const dot = mantissa.indexOf(".");
    const intDigits = dot === -1 ? mantissa : mantissa.slice(0, dot);
    const fracDigits = dot === -1 ? "" : mantissa.slice(dot + 1);
    let num;
    try { num = BigInt((intDigits || "0") + fracDigits); } catch (err) { return null; }
    const den = 10n ** BigInt(fracDigits.length);
    const mult = 10n ** BigInt(exp);
    const scaled = num * mult;
    let valueBig;
    let approximate = false;
    if (scaled % den === 0n) {
      valueBig = scaled / den;
    } else {
      const f = (Number(mantissa) || 0) * Math.pow(10, exp);
      if (!Number.isFinite(f)) return null;
      if (Math.abs(f) <= Number.MAX_SAFE_INTEGER) return { raw, value: neg ? -f : f, approximate: true };
      valueBig = BigInt(Math.round(f));
      approximate = true;
    }
    if (neg) valueBig = -valueBig;
    const abs = valueBig < 0n ? -valueBig : valueBig;
    return abs <= MAX_SAFE_BIG
      ? { raw, value: Number(valueBig), approximate }
      : { raw, value: valueBig.toString(), approximate };
  }

  function scalar(value, raw, confidence) {
    if (value === null || value === undefined || value === "") return null;
    return { value, raw: raw !== undefined ? raw : String(value), confidence: confidence || "unknown" };
  }

  function qtyScalar(text, confidence) {
    const q = parseQty(text);
    return q ? scalar(q.value, q.raw, confidence) : null;
  }

  function sanitizeUrl(raw) {
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "unknown";
      let out = u.origin + u.pathname;
      let decodedHash = "";
      try { decodedHash = decodeURIComponent(u.hash || ""); } catch (err) { decodedHash = ""; }
      if (/^#!?\/[A-Za-z0-9_\-\/.]*$/.test(decodedHash) &&
          !/[?=&]|token|session|auth|secret|password/i.test(decodedHash)) out += decodedHash;
      return out;
    } catch (err) {
      return "unknown";
    }
  }

  function redact(s) {
    return s
      .replace(/(\b(?:access_?token|auth(?:orization)?|session(?:_?id)?|sess|sid|token|jwt|api[_-]?key|password|passwd|pwd|cookie|secret)\b)\s*[:=]\s*[^\s&;]+/gi, "$1=[redacted]")
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted-jwt]")
      .replace(/\b[A-Za-z0-9+/=_-]{48,}\b/g, "[redacted]");
  }

  function cleanWhitespace(s) {
    return s
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /** Visible text only: skips scripts, styles, forms, inputs and hidden nodes. */
  function getVisibleText() {
    const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "INPUT", "SELECT", "TEXTAREA", "OPTION", "FORM", "BUTTON"]);
    const chunks = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let el = node.parentElement;
        while (el) {
          if (SKIP.has(el.tagName)) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let node;
    while ((node = walker.nextNode())) chunks.push(node.nodeValue);
    let text = cleanWhitespace(redact(chunks.join("\n")));
    if (text.length > TEXT_LIMIT) text = text.slice(0, TEXT_LIMIT) + "\n[…truncated]";
    return text;
  }

  function banner(message, ok) {
    const div = document.createElement("div");
    div.textContent = message;
    div.style.cssText =
      "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
      "padding:10px 16px;border-radius:6px;font:14px/1.4 sans-serif;color:#fff;" +
      "background:" + (ok ? "#1b7f3b" : "#b3261e") + ";box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:90vw;";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 10000);
  }

  function downloadJson(filename, obj) {
    chrome.runtime.sendMessage({ type: "farmrpg-account-capture", filename, capture: obj })
      .then((result) => window.dispatchEvent(new CustomEvent("farmrpg-account-captured", { detail: result || { ok: true, pageType: obj.pageType } })))
      .catch((error) => window.dispatchEvent(new CustomEvent("farmrpg-account-capture-error", { detail: String(error && error.message || error) })));
  }

  /* ---------------- page type detection ---------------- */

  function pageTypeFromRoute(rawHref) {
    let route;
    try {
      const u = new URL(rawHref);
      route = decodeURIComponent((u.hash || "") + " " + u.pathname).toLowerCase();
    } catch (err) {
      return null;
    }
    const routes = [
      [/questscomp/, "quests-completed", "Completed Requests"],
      [/completed(?:help|quest)|completedquests?/, "quests-completed", "Completed Help Requests"],
      [/available(?:help|quest)|availablequests?/, "quests-available", "Available Help Requests"],
      [/inventory/, "inventory", "Inventory"],
      [/master(?:y|ies)/, "mastery", "Mastery"],
      [/(?:the)?tower/, "tower", "Tower"],
      [/(?:helprequests?|quests?)/, "quests", "Quests / Help Requests"],
      [/(?:pets?\.php|pet[-_ ]?shop)/, "pets", "Pets"],
      [/(?:npclevels|friendship)/, "friendships", "Friendship Levels"],
      [/(?:kitchen|cooking\.php)/, "kitchen", "My Kitchen"],
      [/(?:farm[-_ ]?supply|supply\.php)/, "farm-supply", "Farm Supply"],
      [/craftworks?/, "craftworks", "Craftworks"],
      [/artifacts?/, "artifacts", "Artifacts"],
      [/sawmill/, "sawmill", "Sawmill"],
      [/quarry/, "quarry", "Quarry"],
      [/storehouse/, "storehouse", "Storehouse"],
      [/perks?/, "perks", "Perks"],
      [/profile/, "profile", "Profile"],
      [/fishing|fish\.php/, "fishing", "Fishing"],
      [/explor/, "exploring", "Exploring"],
    ];
    for (const [pattern, type, label] of routes) {
      if (pattern.test(route)) return [type, label];
    }
    return null;
  }

  function detectPageType(text, headings) {
    const head = headings.join(" \n ").toLowerCase();
    const hay = (head + "\n" + text.slice(0, 4000)).toLowerCase();
    const has = (re) => re.test(hay);
    if (has(/\bgrand mastery\b|\bmasteries\b/) && has(/\bmastery\b/)) return ["mastery", "Mastery"];
    // "The Tower" appears in the nav cards of every page; only call it the
    // tower page when a heading says Tower AND floor/tower-level text exists.
    if (/\btower\b/.test(head) && has(/\bfloor\s*\d|\btower\s+level\s*\d/)) return ["tower", "Tower"];
    if (has(/\bcompleted\b/) && has(/\bhelp request|\bquest/)) return ["quests-completed", "Completed Help Requests"];
    if (has(/\bhelp request|\bquest/) && has(/\bavailable\b/)) return ["quests-available", "Available Help Requests"];
    if (has(/\bhelp request|\bquest/)) return ["quests", "Quests / Help Requests"];
    if (has(/\babout pets\b/) && has(/\bmy pets\b/)) return ["pets", "Pets"];
    if (has(/\bfriendship levels\b/) && has(/\bcurrent levels\b/)) return ["friendships", "Friendship Levels"];
    if (has(/\bmy kitchen\b/) && has(/\boven\b|\bmy cookbook\b/)) return ["kitchen", "My Kitchen"];
    if (has(/\bfarm supply\b/)) return ["farm-supply", "Farm Supply"];
    if (has(/\bin craftworks\b|\bcraftworks\b/) && has(/\bremove\b|\bout of\b/)) return ["craftworks", "Craftworks"];
    if (has(/\bartifact/)) return ["artifacts", "Artifacts"];
    if (has(/\bsawmill\b/)) return ["sawmill", "Sawmill"];
    if (has(/\bquarry\b/)) return ["quarry", "Quarry"];
    if (has(/\bstorehouse\b/)) return ["storehouse", "Storehouse"];
    if (has(/\binventory\b/)) return ["inventory", "Inventory"];
    if (has(/\bperk/)) return ["perks", "Perks"];
    if (has(/\bprofile\b|\bplayer id\b|\bmember since\b/)) return ["profile", "Profile"];
    if (has(/\bfishing\b/) && has(/\bnet/)) return ["fishing", "Fishing"];
    if (has(/\bexplor/)) return ["exploring", "Exploring"];
    return ["other", "Other / unrecognized page"];
  }

  /* ---------------- generic extractors ---------------- */

  const SKILLS = ["farming", "fishing", "crafting", "exploring", "cooking", "mining"];

  function extractLevels(lines, fields, warnings) {
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const skill of SKILLS) {
        if (fields.levels[skill]) continue;
        const re = new RegExp("^" + skill + "(?:\\s+(?:level|lvl))?\\s*[:#\\-]?\\s*(\\d[\\d,]*)$", "i");
        let m = line.match(re);
        // Two-line layout used by the "My skills" panel: "Farming" / "Level 99"
        if (!m && new RegExp("^" + skill + "$", "i").test(line) && i + 1 < lines.length) {
          const next = lines[i + 1].match(/^level\s*(\d[\d,]*)$/i);
          if (next) m = next;
        }
        if (m) {
          const s = qtyScalar(m[1], "visible-label");
          if (s) { fields.levels[skill] = s; found++; }
        }
      }
      const tm = line.match(/^tower(?:\s+(?:level|floor))?\s*[:#\-]?\s*(\d[\d,]*)$/i);
      if (tm && !fields.levels.tower) {
        fields.levels.tower = qtyScalar(tm[1], "visible-label");
        found++;
      }
      // Nav card layout: "The Tower" ... "Level 275" within a few lines.
      if (/^the tower$/i.test(line) && !fields.levels.tower) {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const lm = lines[j].match(/^level\s*(\d[\d,]*)$/i);
          if (lm) {
            fields.levels.tower = qtyScalar(lm[1], "inferred-page-section");
            found++;
            break;
          }
        }
      }
    }
    return found;
  }

  function extractBalances(lines, fields) {
    for (const line of lines) {
      let m = line.match(/^silver\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)$/i);
      if (m && !fields.balances.silver) fields.balances.silver = qtyScalar(m[1], "visible-label");
      m = line.match(/^gold\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)$/i);
      if (m && !fields.balances.gold) fields.balances.gold = qtyScalar(m[1], "visible-label");
      m = line.match(/^stamina\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?)$/i);
      if (m) {
        if (!fields.balances.staminaCurrent) fields.balances.staminaCurrent = qtyScalar(m[1], "visible-label");
        if (!fields.balances.staminaMaximum) fields.balances.staminaMaximum = qtyScalar(m[2], "visible-label");
      } else {
        m = line.match(/^stamina\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)$/i);
        if (m && !fields.balances.staminaCurrent) fields.balances.staminaCurrent = qtyScalar(m[1], "visible-label");
      }
      m = line.match(/^inventory(?:\s+(?:capacity|space|slots))?\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?)$/i);
      if (m) {
        if (!fields.capacity.inventoryCurrent) fields.capacity.inventoryCurrent = qtyScalar(m[1], "visible-label");
        if (!fields.capacity.inventoryMaximum) fields.capacity.inventoryMaximum = qtyScalar(m[2], "visible-label");
      }
    }
  }

  const KNOWN_CONSUMABLES = [
    "Ancient Coin", "Arnold Palmer", "Apple Cider", "Orange Juice",
    "Lemonade", "Fishing Net", "Large Net",
  ];

  function extractConsumables(lines, fields) {
    const seen = new Set();
    for (const line of lines) {
      for (const name of KNOWN_CONSUMABLES) {
        if (seen.has(name)) continue;
        const esc = name.replace(/ /g, "\\s+");
        let m = line.match(new RegExp("^" + esc + "s?\\s*[:x×\\-]?\\s*([\\d,.]+\\s*[KMBT]?)$", "i"));
        if (!m) m = line.match(new RegExp("^([\\d,.]+\\s*[KMBT]?)\\s*[x×]?\\s+" + esc + "s?$", "i"));
        if (m) {
          const s = qtyScalar(m[1], "visible-label");
          if (s) {
            fields.consumables.push({ name, quantity: s, confidence: "visible-label" });
            seen.add(name);
          }
        }
      }
    }
  }

  function extractPlayer(lines, fields) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m = line.match(/^(?:player\s*name|username|farmer)\s*[:#\-]?\s*(.{2,40})$/i);
      if (m && !fields.player.name) { fields.player.name = scalar(m[1].trim(), m[1].trim(), "visible-label"); continue; }
      m = line.match(/^player\s*id\s*[:#]?\s*(\d+)$/i);
      if (m && !fields.player.playerId) { fields.player.playerId = scalar(m[1], m[1], "visible-label"); continue; }
      m = line.match(/^(?:joined|member since|account created|farm established)\s*[:#\-]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})$/i);
      if (m && !fields.player.accountCreated) {
        fields.player.accountCreated = scalar(m[1].trim(), m[1].trim(), "visible-label");
        continue;
      }
      m = line.match(/^welcome\s*,\s*(?:back\s*,?\s*)?(.{2,40})$/i);
      if (m && !fields.player.name && !/card$/i.test(m[1].trim())) {
        fields.player.name = scalar(m[1].trim(), m[1].trim(), "inferred-page-section");
      }
    }
  }

  function parseProfilePage(lines) {
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
        out.activeEffects.push({ name: canonical, uses: usesLine ? usesLine.match(/^([\d,]+)/)[1] : null, remaining: timeLine ? timeLine.replace(/^for\s+/i, "") : null });
      }
    }
    return out;
  }

  function applyProfilePage(fields, parsed) {
    if (parsed.player.name) fields.player.name = scalar(parsed.player.name, parsed.player.name, "inferred-page-section");
    if (parsed.player.farmName) fields.player.farmName = scalar(parsed.player.farmName, parsed.player.farmName, "visible-label");
    if (parsed.player.accountCreated) fields.player.accountCreated = scalar(parsed.player.accountCreated, parsed.player.accountCreated, "inferred-page-section");
    fields.activeEffects = parsed.activeEffects.map((effect) => ({
      name: effect.name,
      uses: effect.uses ? qtyScalar(effect.uses, "visible-label") : null,
      remaining: effect.remaining,
      confidence: "visible-label",
    }));
  }

  function parseTowerPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { currentLevel: null, ascensionKnowledge: null, dailySilver: null, nextLevel: null, nextAkCost: null, nextSilverCost: null, nextMegaMasteries: null, nextRewards: [], history: [] };
    let m = text.match(/You currently have\s*([\d,]+)\s*Ascension Knowledge/i);
    if (m) out.ascensionKnowledge = m[1];
    m = text.match(/Currently, you are at\s*([\d,]+)\s*Silver generated daily/i);
    if (m) out.dailySilver = m[1];
    const progress = clean.findIndex((line) => /^Tower Progress$/i.test(line));
    if (progress < 0) return out;
    const levels = [];
    for (let i = progress + 1; i + 1 < clean.length; i++) {
      if (/^Level$/i.test(clean[i]) && /^\d+$/.test(clean[i + 1])) levels.push(i);
      if (/^Ground Floor$/i.test(clean[i])) break;
    }
    if (!levels.length) return out;
    const rewards = (start, end) => {
      const result = [];
      for (let i = start; i + 1 < end; i++) {
        const q = clean[i + 1].match(/^\(x([\d,]+)\)$/i);
        if (q && NAME_RE.test(clean[i]) && !isNoise(clean[i])) {
          result.push({ name: clean[i], quantity: q[1] });
          i++;
        }
      }
      return result;
    };
    const nextStart = levels[0], nextEnd = levels[1] || clean.length;
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
    const rewardLabel = clean.findIndex((line, i) => i > nextStart && i < nextEnd && /^Level Rewards:$/i.test(line));
    if (rewardLabel >= 0) out.nextRewards = rewards(rewardLabel + 1, nextEnd);
    for (let n = 1; n < levels.length; n++) {
      const start = levels[n];
      const ground = clean.findIndex((line, i) => i > start && /^Ground Floor$/i.test(line));
      const end = levels[n + 1] || ground;
      const safeEnd = end > start ? end : clean.length;
      const block = clean.slice(start + 2, safeEnd);
      const got = block.findIndex((line) => /^You got:$/i.test(line));
      if (got < 0) continue;
      const entry = {
        level: clean[start + 1],
        date: block.find((line) => /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(line)) || null,
        current: block.some((line) => /^You are here\b/i.test(line)),
        rewards: rewards(start + 2 + got + 1, safeEnd),
      };
      out.history.push(entry);
      if (entry.current) out.currentLevel = entry.level;
    }
    if (!out.currentLevel && out.history.length) out.currentLevel = out.history[0].level;
    return out;
  }

  function applyTowerPage(fields, parsed) {
    fields.towerProgress = {
      currentLevel: qtyScalar(parsed.currentLevel, "visible-label"),
      ascensionKnowledge: qtyScalar(parsed.ascensionKnowledge, "visible-label"),
      dailySilver: qtyScalar(parsed.dailySilver, "visible-label"),
      nextLevel: qtyScalar(parsed.nextLevel, "visible-label"),
      nextAkCost: qtyScalar(parsed.nextAkCost, "visible-label"),
      nextSilverCost: qtyScalar(parsed.nextSilverCost, "visible-label"),
      nextMegaMasteries: qtyScalar(parsed.nextMegaMasteries, "visible-label"),
      nextRewards: parsed.nextRewards.map((reward) => ({ name: reward.name, quantity: qtyScalar(reward.quantity, "visible-label") })),
      history: parsed.history.map((entry) => ({
        level: qtyScalar(entry.level, "visible-label"),
        date: entry.date,
        current: entry.current,
        rewards: entry.rewards.map((reward) => ({ name: reward.name, quantity: qtyScalar(reward.quantity, "visible-label") })),
      })),
    };
    if (fields.towerProgress.currentLevel) fields.levels.tower = fields.towerProgress.currentLevel;
  }

  function parseMasteryPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { stats: { mastered: null, grandMastered: null, megaMastered: null }, masteries: [] };
    const summary = text.match(/So far, you have\s*([\d,]+)\s*items Mastered,\s*([\d,]+)\s*items Grand Mastered and\s*([\d,]+)\s*items Mega Mastered/i);
    if (summary) {
      out.stats.mastered = summary[1];
      out.stats.grandMastered = summary[2];
      out.stats.megaMastered = summary[3];
    }
    const start = clean.findIndex((line) => /^Mastery(?: In-Progress| Progress)$/i.test(line));
    if (start < 0) return out;
    let tier = null;
    const seen = new Set();
    for (let i = start + 1; i < clean.length; i++) {
      const heading = clean[i].match(/^(Tier V \(MM\)|Tier IV \(GM\)|Tier III \(M\)|Tier II|Tier I|No Tier|Mega Mastered)$/i);
      if (heading) { tier = heading[1]; continue; }
      const progress = clean[i].match(/^([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?|∞)\s*Progress$/i);
      if (!progress || i === 0) continue;
      let nameIndex = i - 1;
      while (nameIndex > start && (/^chevron_/i.test(clean[nameIndex]) || /^\d+(?:\.\d+)?%$/.test(clean[nameIndex]))) nameIndex--;
      const name = clean[nameIndex];
      if (!NAME_RE.test(name) || isNoise(name) || seen.has(name.toLowerCase())) continue;
      const currentParsed = parseQty(progress[1]);
      const targetParsed = progress[2] === "∞" ? null : parseQty(progress[2]);
      const currentNumber = currentParsed ? Number(currentParsed.value) : NaN;
      const targetNumber = targetParsed ? Number(targetParsed.value) : null;
      if (!Number.isFinite(currentNumber) || (targetNumber !== null && !Number.isFinite(targetNumber))) continue;
      const mega = progress[2] === "∞" || currentNumber >= 1000000;
      const grand = mega || currentNumber >= 100000;
      const mastered = grand || currentNumber >= 10000;
      seen.add(name.toLowerCase());
      out.masteries.push({
        itemName: name, masteryCount: progress[1], masteryLevel: tier,
        mastered, grandMastery: grand, megaMastery: mega, completed: mega,
        progressCurrent: progress[1], progressTarget: targetNumber === null ? null : progress[2],
        progressPercent: targetNumber ? (currentNumber / targetNumber) * 100 : null,
        confidence: "visible-label",
      });
    }
    return out;
  }

  function applyMasteryPage(fields, parsed) {
    fields.masteryStats = {
      mastered: qtyScalar(parsed.stats.mastered, "visible-label"),
      grandMastered: qtyScalar(parsed.stats.grandMastered, "visible-label"),
      megaMastered: qtyScalar(parsed.stats.megaMastered, "visible-label"),
    };
    fields.masteries = parsed.masteries.map((entry) => ({
      itemName: entry.itemName,
      masteryCount: qtyScalar(entry.masteryCount, "visible-label"),
      masteryLevel: entry.masteryLevel,
      mastered: entry.mastered,
      grandMastery: entry.grandMastery,
      megaMastery: entry.megaMastery,
      towerRequirement: null,
      progressCurrent: qtyScalar(entry.progressCurrent, "visible-label"),
      progressTarget: qtyScalar(entry.progressTarget, "visible-label"),
      progressPercent: scalar(entry.progressPercent, entry.progressPercent, "visible-label"),
      completed: entry.completed,
      confidence: "visible-label",
    }));
  }

  function parseQuestDashboard(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { stats: { specialAvailable: null, active: null, personalAvailable: null, requestsCompleted: null, personalCompleted: null }, quests: [] };
    for (const [key, re] of [
      ["specialAvailable", /Special Requests\s*\(([\d,]+)\)/i],
      ["active", /Active Requests\s*\(([\d,]+)\)/i],
      ["personalAvailable", /Personal Requests\s*\(([\d,]+)\)/i],
      ["requestsCompleted", /Requests Completed\s*([\d,]+)/i],
      ["personalCompleted", /Personal Completed\s*([\d,]+)/i],
    ]) {
      const match = text.match(re);
      if (match) out.stats[key] = match[1];
    }
    const pct = (value) => {
      const match = String(value || "").match(/^([\d.]+)%$/);
      return match ? match[1] : null;
    };
    const special = clean.findIndex((line) => /^Special Requests\s*\(/i.test(line));
    const active = clean.findIndex((line) => /^Active Requests\s*\(/i.test(line));
    if (special >= 0 && active > special) {
      for (let i = special + 1; i + 1 < active; i++) {
        if (!/^Available$/i.test(clean[i + 1]) || clean[i].length < 3 || clean[i].length > 80 || /^\d/.test(clean[i])) continue;
        const availability = clean[i + 2] && /^(?:[A-Za-z]{3}\s+\d{1,2}|Available)/i.test(clean[i + 2]) ? clean[i + 2] : null;
        out.quests.push({ title: clean[i], giver: null, status: "available", availability, progressPercent: pct(clean[i + (availability ? 3 : 2)]), requiredItems: [], rewards: [], prerequisites: null, chain: "Special Request", confidence: "visible-label" });
      }
    }
    const personal = clean.findIndex((line, i) => i > active && /^Personal Requests\s*\(/i.test(line));
    if (active >= 0) {
      const end = personal > active ? personal : clean.length;
      for (let i = active + 1; i + 1 < end; i++) {
        if (!/^Request from\s+/i.test(clean[i + 1]) || clean[i].length < 3 || clean[i].length > 80 || /^\d/.test(clean[i])) continue;
        const giver = clean[i + 1].replace(/^Request from\s+/i, "").replace(/\s*-\s*$/, "").trim();
        const side = clean[i + 2] && /^Side Request$/i.test(clean[i + 2]);
        out.quests.push({ title: clean[i], giver, status: "active", availability: null, progressPercent: pct(clean[i + (side ? 3 : 2)]), requiredItems: [], rewards: [], prerequisites: null, chain: side ? "Side Request" : null, confidence: "visible-label" });
      }
    }
    return out;
  }

  function applyQuestDashboard(fields, parsed) {
    fields.questStats = {};
    for (const key of Object.keys(parsed.stats)) {
      const value = qtyScalar(parsed.stats[key], "visible-label");
      if (value) fields.questStats[key] = value;
    }
    fields.quests = parsed.quests.map((quest) => ({
      ...quest,
      progressPercent: quest.progressPercent === null ? null : scalar(Number(quest.progressPercent), quest.progressPercent + "%", "visible-label"),
    }));
  }

  function parseCompletedQuestPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { stats: { completedListed: null, completedCaptured: 0, completedHistoryTruncated: /\[…truncated\]/.test(text) }, quests: [] };
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

  function applyCompletedQuestPage(fields, parsed) {
    fields.questStats = {};
    for (const key of Object.keys(parsed.stats)) {
      const raw = parsed.stats[key];
      const value = typeof raw === "boolean" ? scalar(raw, String(raw), "visible-label") : qtyScalar(raw, "visible-label");
      if (value) fields.questStats[key] = value;
    }
    fields.quests = parsed.quests;
    if (parsed.stats.completedHistoryTruncated) {
      fields.warnings.push("Completed request history was truncated by the collector; missing older titles must remain unknown.");
    }
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

  function parsePerkPage(lines, text) {
    const clean = lines.map((line) => line.trim()).filter(Boolean);
    const out = { stats: { pointsLeft: null, pointsUsed: null, perksAvailable: null, timesReset: null, activeSetId: null, activeSetName: null }, perks: [] };
    for (const [key, re] of [
      ["pointsLeft", /([\d,]+)\s*Points Left/i], ["pointsUsed", /([\d,]+)\s*Points Used/i],
      ["perksAvailable", /([\d,]+)\s*Perks Avail/i], ["timesReset", /([\d,]+)\s*Times Reset/i],
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
        out.perks.push({ name, category, owned: null, description: description.join(" ") || null, towerRequirement, confidence: "visible-label" });
      }
    }
    return out;
  }

  function perkDomEvidence(perks) {
    const targets = new Map(perks.map((perk) => [perk.name, perk]));
    const exact = new Map();
    document.querySelectorAll("body *").forEach((element) => {
      const value = cleanWhitespace(element.innerText || "");
      if (targets.has(value) && (!exact.has(value) || element.querySelectorAll("*").length < exact.get(value).querySelectorAll("*").length)) exact.set(value, element);
    });
    for (const perk of perks) {
      const element = exact.get(perk.name);
      if (!element) continue;
      let container = element;
      for (let depth = 0; depth < 5 && container.parentElement; depth++) {
        if (container.querySelector("button,input,a,[role=button]")) break;
        container = container.parentElement;
      }
      const controls = Array.from(container.querySelectorAll("button,a,[role=button],input")).map((node) =>
        cleanWhitespace(node.innerText || node.value || node.getAttribute("aria-label") || node.title || "")
      ).filter(Boolean).slice(0, 8);
      const icons = Array.from(container.querySelectorAll("i,img")).map((node) =>
        cleanWhitespace(node.innerText || node.alt || node.title || "")
      ).filter(Boolean).slice(0, 8);
      const style = getComputedStyle(element);
      const evidence = {
        elementClass: String(element.className || "").slice(0, 180),
        containerClass: String(container.className || "").slice(0, 240),
        controls, icons,
        color: style.color, backgroundColor: style.backgroundColor,
        opacity: style.opacity, textDecoration: style.textDecorationLine,
      };
      const semantic = (evidence.elementClass + " " + evidence.containerClass + " " + controls.join(" ") + " " + icons.join(" ")).toLowerCase();
      if (/\b(owned|purchased|unlocked|already owned)\b/.test(semantic)) perk.owned = true;
      else if (controls.some((value) => /^\d[\d,]*\s+Points?$/i.test(value.trim()))) perk.owned = false;
      else if (/\b(locked|purchase|buy|unlock|available)\b/.test(semantic)) perk.owned = false;
      perk.domEvidence = JSON.stringify(evidence);
    }
  }

  function applyPerkPage(fields, parsed) {
    perkDomEvidence(parsed.perks);
    fields.perkStats = {};
    for (const key of Object.keys(parsed.stats)) {
      const raw = parsed.stats[key];
      const value = key === "activeSetName" ? scalar(raw, raw, "visible-label") : qtyScalar(raw, "visible-label");
      if (value) fields.perkStats[key] = value;
    }
    fields.perks = parsed.perks.map((perk) => ({
      ...perk,
      towerRequirement: qtyScalar(perk.towerRequirement, "visible-label"),
    }));
  }

  function parseFarmSupplyOverview(lines, text) {
    const out = { capacityMax: null, staminaMax: null, supplyStats: { maxMailbox: null, activeMealEffects: null }, infrastructure: {} };
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
      if (/^Next Rewards at$/i.test(clean[i])) continue;
      let nextRewardLevel = null;
      if (/^Next Rewards at$/i.test(clean[i + 2] || "")) {
        const rewardMatch = (clean[i + 3] || "").match(/^Level\s+([\d,]+)$/i);
        if (rewardMatch) nextRewardLevel = rewardMatch[1];
      }
      out.friendships.push({
        name: clean[i], level: levelMatch[1], nextRewardLevel,
        townsfolkOfDay: out.townsfolkOfDay === clean[i], confidence: "visible-label",
      });
    }
    return out;
  }

  function applyFriendshipPage(fields, parsed) {
    fields.friendships = parsed.friendships.map((entry) => ({
      name: entry.name,
      level: qtyScalar(entry.level, entry.confidence),
      nextRewardLevel: entry.nextRewardLevel ? qtyScalar(entry.nextRewardLevel, entry.confidence) : null,
      townsfolkOfDay: entry.townsfolkOfDay,
      confidence: entry.confidence,
    }));
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

  function applyKitchenPage(fields, parsed) {
    if (parsed.cookingLevel) fields.levels.cooking = qtyScalar(parsed.cookingLevel, "visible-label");
    fields.kitchenStats = {};
    for (const key of ["ovensOwned", "emptyOvens", "maximumOvensAvailable", "nextOvenCookingLevel", "fruitPunchLeft"]) {
      if (parsed[key]) fields.kitchenStats[key] = qtyScalar(parsed[key], "visible-label");
    }
  }

  function applyFarmSupplyOverview(fields, parsed) {
    if (parsed.capacityMax) fields.capacity.inventoryMaximum = qtyScalar(parsed.capacityMax, "visible-label");
    if (parsed.staminaMax) fields.balances.staminaMaximum = qtyScalar(parsed.staminaMax, "visible-label");
    fields.supplyStats = {};
    for (const key of Object.keys(parsed.supplyStats)) {
      const value = qtyScalar(parsed.supplyStats[key], "visible-label");
      if (value) fields.supplyStats[key] = value;
    }
    for (const [building, values] of Object.entries(parsed.infrastructure)) {
      fields.infrastructure[building] ||= {};
      for (const [key, raw] of Object.entries(values)) fields.infrastructure[building][key] = qtyScalar(raw, "visible-label");
    }
  }

  function extractFarmSupplyRows() {
    const rows = [];
    const seen = new Set();
    document.querySelectorAll(".item-inner").forEach((container) => {
      const titleElement = container.querySelector(".item-title");
      // Some Farm Supply cards put the current cap on a second line inside
      // .item-title. Only the first visual line is the upgrade's real name.
      const rawTitle = String(titleElement && titleElement.innerText || "");
      const name = cleanWhitespace(rawTitle.split(/\r?\n/)[0] || "");
      if (!name || name.length > 80 || seen.has(name.toLowerCase())) return;
      const controls = Array.from(container.querySelectorAll("button,a,[role=button],input")).map((node) =>
        cleanWhitespace(node.innerText || node.value || node.getAttribute("aria-label") || node.title || "")
      ).filter(Boolean);
      const semantic = controls.join(" ");
      if (!/^Unlocked$/im.test(semantic) && !/\bGold\b/i.test(semantic)) return;
      const descriptionElements = Array.from(container.querySelectorAll(".item-subtitle,.item-text,.item-after")).filter((node) => node !== titleElement);
      const description = descriptionElements.map((node) => cleanWhitespace(node.innerText || "")).filter((value) => value && !controls.includes(value)).join(" ");
      let owned = null;
      if (controls.some((value) => /^Unlocked$/i.test(value))) owned = true;
      else if (controls.some((value) => /\bGold\b/i.test(value))) owned = false;
      const costText = controls.find((value) => /\bGold\b/i.test(value)) || "";
      const costMatch = costText.match(/([\d,]+)\s*Gold/i);
      const style = getComputedStyle(titleElement);
      rows.push({
        name, owned, description: description || null,
        goldCost: costMatch ? qtyScalar(costMatch[1], "visible-label") : null,
        domEvidence: JSON.stringify({
          containerClass: String(container.className || "").slice(0, 240), controls: controls.slice(0, 8),
          color: style.color, opacity: style.opacity, textDecoration: style.textDecorationLine,
        }),
        confidence: "visible-label",
      });
      seen.add(name.toLowerCase());
    });
    return rows;
  }

  function extractCraftworksRows() {
    const rows = [];
    const seen = new Set();
    document.querySelectorAll(".item-inner").forEach((container) => {
      const titleElement = container.querySelector(".item-title");
      const rawTitle = String(titleElement && titleElement.innerText || "");
      const itemName = cleanWhitespace(rawTitle.split(/\r?\n/)[0] || "");
      const text = String(container.innerText || "");
      if (!itemName || itemName.length > 80 || !/\bRemove\b/i.test(text)) return;
      const key = itemName.toLowerCase();
      if (seen.has(key)) return;
      const inventoryMatch = text.match(/Inventory\s*:\s*([\d,]+)/i);
      const outMatch = text.match(/Out of\s*:\s*([^\r\n]+)/i);
      const controls = Array.from(container.querySelectorAll("button,a,[role=button]")).map((node) =>
        cleanWhitespace(node.innerText || node.getAttribute("aria-label") || node.title || "")
      ).filter(Boolean);
      rows.push({
        itemName,
        order: rows.length + 1,
        inventoryQuantity: inventoryMatch ? qtyScalar(inventoryMatch[1], "visible-label") : null,
        blockedBy: outMatch ? cleanWhitespace(outMatch[1]) : null,
        paused: controls.some((value) => /resume|play/i.test(value)) ? true
          : (controls.some((value) => /pause/i.test(value)) ? false : null),
        confidence: "visible-label",
      });
      seen.add(key);
    });
    return rows;
  }

  function extractPetRows() {
    const rows = [];
    const seen = new Set();
    // Pet cards do not consistently use Framework7's .item-inner layout.
    // Start at exact leaf-level labels, then climb to the compact card that
    // contains the pet image and title.
    const levelNodes = Array.from(document.querySelectorAll("body *")).filter((node) =>
      node.children.length === 0 && /^Level\s+\d+$/i.test(cleanWhitespace(node.innerText || ""))
    );
    levelNodes.forEach((levelNode) => {
      const levelMatch = cleanWhitespace(levelNode.innerText || "").match(/^Level\s+(\d+)$/i);
      let container = levelNode.parentElement;
      let steps = 0;
      while (container && steps < 8) {
        const cardText = cleanWhitespace(container.innerText || "");
        if (container.querySelector("img") && cardText.length <= 500) break;
        container = container.parentElement;
        steps++;
      }
      if (!container || !container.querySelector("img")) return;
      const titleElement = container.querySelector(".item-title,.pet-name,h3,h4,strong");
      const fallbackName = String(container.innerText || "").split(/\r?\n/).map(cleanWhitespace)
        .find((line) => line && !/^Level\s+\d+$/i.test(line));
      const displayName = cleanWhitespace(String(titleElement && titleElement.innerText || "").split(/\r?\n/)[0] || fallbackName || "");
      const imageElement = container.querySelector("img");
      const imageAlt = cleanWhitespace(imageElement && (imageElement.alt || imageElement.title) || "");
      const imageSrc = imageElement ? String(imageElement.getAttribute("src") || "").split(/[?#]/)[0] : "";
      const petAnchorElement = container.closest("a[href]") || container.querySelector("a[href]");
      const href = String(petAnchorElement && petAnchorElement.getAttribute("href") || "");
      const idMatch = href.match(/[?&](?:id|petid)=(\d+)/i);
      const petKey = idMatch ? "pet-" + idMatch[1]
        : (imageSrc ? "image-" + imageSrc.toLowerCase() + "-" + rows.length : "row-" + rows.length);
      if (seen.has(petKey)) return;
      rows.push({
        petKey,
        displayName: displayName || null,
        species: imageAlt && !/^(pet|unnamed)$/i.test(imageAlt) ? imageAlt : null,
        level: qtyScalar(levelMatch[1], "visible-label"),
        imageAlt: imageAlt || null,
        imageSrc: imageSrc || null,
        domEvidence: JSON.stringify({ href: href.slice(0, 300), containerClass: String(container.className || "").slice(0, 200) }),
        confidence: "visible-label",
      });
      seen.add(petKey);
    });
    if (!rows.length) {
      const pageLines = String(document.body && document.body.innerText || "").split(/\r?\n/).map(cleanWhitespace).filter(Boolean);
      const start = pageLines.findIndex((line) => /^My Pets$/i.test(line));
      const end = pageLines.findIndex((line, index) => index > start && /^Available Pets$/i.test(line));
      for (let i = Math.max(0, start + 1); i >= 0 && i < (end === -1 ? pageLines.length : end) - 1; i++) {
        const levelMatch = pageLines[i + 1].match(/^Level\s+(\d+)$/i);
        if (!levelMatch) continue;
        rows.push({
          petKey: "visible-row-" + rows.length,
          displayName: pageLines[i], species: null,
          level: qtyScalar(levelMatch[1], "visible-label"),
          imageAlt: null, imageSrc: null, domEvidence: null,
          confidence: "visible-label",
        });
        i++;
      }
      const canonicalSpecies = [
        "Cat", "Dog", "Squirrel", "Owl", "Boar", "Python", "Lemur", "Baboon", "Frog",
        "Hedgehog", "Fox", "Armadillo", "Tarantula", "Rock", "Parrot", "Penguin",
        "Green Dragon", "Red Dragon", "Blue Dragon", "Bear", "Capybara", "Onion", "Seal",
        "Skunk", "Polar Bear", "Hummingbird", "Tiger Shark",
      ];
      const wolfOnlyAvailable = /Available Pets[\s\S]*?\bWolf\b/i.test(pageLines.join("\n"));
      if (rows.length === canonicalSpecies.length && wolfOnlyAvailable) {
        rows.forEach((pet, index) => { pet.species = canonicalSpecies[index]; });
      }
    }
    return rows;
  }

  /** Table rows: first text cell + numeric cells. Returns generic records. */
  function extractTableRows() {
    const rows = [];
    document.querySelectorAll("table tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("th,td")).map((c) => cleanWhitespace(c.innerText || ""));
      if (cells.length < 2) return;
      const name = cells[0];
      if (!name || name.length > 80 || parseQty(name)) return;
      const numbers = [];
      for (let i = 1; i < cells.length; i++) {
        const q = parseQty(cells[i].replace(/^[x×]\s*/, ""));
        if (q) numbers.push({ index: i, raw: cells[i], parsed: q });
      }
      const tableAnchorElement = tr.querySelector('a[href*="id="]');
      let itemId = null;
      if (tableAnchorElement) {
        const im = String(tableAnchorElement.getAttribute("href") || "").match(/[?&]id=(\d+)/);
        if (im) itemId = Number(im[1]);
      }
      const rowText = cells.join(" ");
      rows.push({ name, numbers, cells, itemId, locked: /\blocked\b|🔒/.test(rowText) ? true : null });
    });
    return rows;
  }

  /** Icon-grid items: img[alt] with a sibling quantity badge (provisional). */
  function extractIconItems() {
    const out = [];
    const seen = new Set();
    document.querySelectorAll("img[alt]").forEach((img) => {
      const name = cleanWhitespace(img.getAttribute("alt") || "");
      if (!name || name.length > 60) return;
      const currency = /^(silver|gold)$/i.test(name);
      // Inventory contents come from the evidence-based inventory parser or
      // confirmed tables, never arbitrary icons elsewhere on the page.
      if (!currency) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      const box = img.closest("div,li,td,a,span") || img.parentElement;
      if (!box) return;
      const txt = cleanWhitespace(box.innerText || "");
      const m = txt.match(/^(?:[x×]\s*)?([\d,.]+\s*[KMBT]?)$/i);
      if (!m) return;
      const q = parseQty(m[1]);
      if (!q) return;
      seen.add(key);
      out.push({
        name,
        quantity: scalar(q.value, q.raw, "inferred-page-section"),
        capacity: null,
        locked: null,
        itemId: null,
        confidence: "inferred-page-section",
      });
    });
    return out;
  }

  function extractInventory(fields, warnings) {
    const rows = extractTableRows();
    const byName = new Map();
    for (const row of rows) {
      const key = row.name.toLowerCase();
      if (byName.has(key)) continue;
      if (!row.numbers.length) continue;
      byName.set(key, {
        name: row.name,
        quantity: scalar(row.numbers[0].parsed.value, row.numbers[0].parsed.raw, "visible-table"),
        capacity: row.numbers[1] ? scalar(row.numbers[1].parsed.value, row.numbers[1].parsed.raw, "visible-table") : null,
        locked: row.locked,
        itemId: row.itemId,
        confidence: "visible-table",
      });
    }
    for (const item of extractIconItems()) {
      const key = item.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, item);
    }
    fields.inventory = Array.from(byName.values());
    if (!fields.inventory.length) {
      warnings.push("Inventory page: no item/quantity pairs recognized in tables or item grids; see visibleText.");
    }
  }

  const REQ_NAME_FIRST = /^(.{2,60}?)\s+([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?)$/;
  const REQ_NUM_FIRST = /^([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?)\s+(.{2,60})$/;

  function parseRequirement(line) {
    let m = line.match(REQ_NAME_FIRST);
    if (m) {
      const have = parseQty(m[2]); const need = parseQty(m[3]);
      if (have && need) return { name: m[1].trim(), have: { value: have.value, raw: have.raw }, need: { value: need.value, raw: need.raw } };
    }
    m = line.match(REQ_NUM_FIRST);
    if (m) {
      const have = parseQty(m[1]); const need = parseQty(m[2]);
      if (have && need) return { name: m[3].trim(), have: { value: have.value, raw: have.raw }, need: { value: need.value, raw: need.raw } };
    }
    return null;
  }

  function extractQuests(blocks, pageType, fields) {
    const quests = [];
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const reqs = [];
      let title = null, giver = null, rewards = [], chain = null;
      let inRewards = false;
      for (const line of lines) {
        const req = parseRequirement(line);
        if (req) { reqs.push(req); inRewards = false; continue; }
        let m = line.match(/^(?:from|quest\s*giver|giver|by)\s*[:\-]\s*(.+)$/i);
        if (m) { giver = m[1].trim(); continue; }
        m = line.match(/^(?:chain|series|section|part)\s*[:\-]\s*(.+)$/i);
        if (m) { chain = m[1].trim(); continue; }
        m = line.match(/^rewards?\s*[:\-]?\s*(.*)$/i);
        if (m) { inRewards = true; if (m[1]) rewards.push(m[1].trim()); continue; }
        if (inRewards) { rewards.push(line); inRewards = false; continue; }
        if (!title && line.length >= 3 && line.length <= 80 && !parseQty(line) && !/^\d/.test(line)) {
          title = line;
        }
      }
      if (!title) continue;
      if (!reqs.length && !/quest|help request/i.test(block)) continue;
      let status = "available";
      if (pageType === "quests-completed") status = "completed";
      else if (/\b(turn in|claim reward|ready to complete)\b/i.test(block)) status = "ready";
      else if (/\blocked\b/i.test(block) && !reqs.length) status = "locked";
      else if (pageType === "quests-active") status = "active";
      else if (reqs.length && reqs.every((r) => {
        const h = Number(r.have.value), n = Number(r.need.value);
        return Number.isFinite(h) && Number.isFinite(n) && h >= n;
      })) status = "ready";
      quests.push({
        title,
        giver,
        status,
        requiredItems: reqs,
        rewards,
        prerequisites: null,
        chain,
        confidence: pageType === "quests-completed" ? "inferred-page-section" : "unparsed-text",
      });
    }
    fields.quests = quests;
  }

  function extractMasteries(blocks, fields) {
    const out = [];
    for (const block of blocks) {
      if (!/mastery|mastered/i.test(block)) continue;
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      let itemName = null;
      for (const line of lines) {
        if (/mastery|mastered|grand|mega|tower/i.test(line)) continue;
        if (parseQty(line) || REQ_NAME_FIRST.test(line)) continue;
        if (line.length >= 2 && line.length <= 60) { itemName = line; break; }
      }
      if (!itemName) continue;
      let count = null;
      let m = block.match(/([\d,.]+\s*[KMBT]?)\s*(?:times\s+)?(?:mastered|mastery)/i);
      if (!m) m = block.match(/mastery\s*(?:count)?\s*[:\-]?\s*([\d,.]+\s*[KMBT]?)/i);
      if (m) count = qtyScalar(m[1], "visible-label");
      const tower = block.match(/tower\s*(?:requirement|requires?|req|floor)?\s*[:\-]?\s*(\d[\d,]*)/i);
      const progress = block.match(/([\d,.]+\s*[KMBT]?)\s*\/\s*([\d,.]+\s*[KMBT]?)/);
      out.push({
        itemName,
        masteryCount: count,
        masteryLevel: null,
        grandMastery: /grand\s*master(?:y|ed)[^\n]*(✓|✔|complete|achieved)/i.test(block) ||
          /(✓|✔|complete|achieved)[^\n]*grand\s*master/i.test(block) ? true : null,
        megaMastery: /mega\s*master(?:y|ed)[^\n]*(✓|✔|complete|achieved)/i.test(block) ||
          /(✓|✔|complete|achieved)[^\n]*mega\s*master/i.test(block) ? true : null,
        towerRequirement: tower ? qtyScalar(tower[1], "visible-label") : null,
        progress: progress ? { current: progress[1], next: progress[2], raw: progress[0] } : null,
        completed: null,
        confidence: "unparsed-text",
      });
    }
    fields.masteries = out;
  }

  function extractBonuses(blocks, targetKey, fields) {
    const out = [];
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const name = lines[0];
      if (name.length < 2 || name.length > 60 || parseQty(name)) continue;
      const rest = lines.slice(1).join(" ");
      const owned = /(✓|✔|\bowned\b|\bactive\b|\bunlocked\b|\bpurchased\b)/i.test(block) ? true
        : /(not owned|\blocked\b|🔒)/i.test(block) ? false : null;
      out.push({ name, owned, description: rest || null, confidence: "unparsed-text" });
    }
    fields[targetKey] = out;
  }

  function extractInfrastructure(lines, pageType, text, fields) {
    const infra = fields.infrastructure;
    const building = pageType === "sawmill" ? "sawmill" : pageType === "quarry" ? "quarry" : pageType === "storehouse" ? "storehouse" : null;
    if (building) {
      const sub = infra[building];
      for (const line of lines) {
        let m = line.match(/^(?:[a-z]+\s+)?level\s*[:#\-]?\s*(\d[\d,]*)$/i);
        if (m && sub.level === undefined) sub.level = qtyScalar(m[1], "visible-label");
        m = line.match(/^(?:capacity|storage|maximum)\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)$/i);
        if (m && sub.capacity === undefined) sub.capacity = qtyScalar(m[1], "visible-label");
        m = line.match(/^([\d,.]+\s*[KMBT]?)\s*(wood|board|stone|coal)s?\s*(?:per\s*hour|\/\s*(?:hr|hour)|hourly|\/h)$/i) ||
              line.match(/^(wood|board|stone|coal)s?\s*[:#\-]?\s*([\d,.]+\s*[KMBT]?)\s*(?:per\s*hour|\/\s*(?:hr|hour)|hourly|\/h)$/i);
        if (m) {
          const qtyText = parseQty(m[1]) ? m[1] : m[2];
          const resource = (parseQty(m[1]) ? m[2] : m[1]).toLowerCase();
          const key = resource + "PerHour";
          if (sub[key] === undefined) sub[key] = qtyScalar(qtyText, "visible-label");
        }
      }
      if (!Object.keys(sub).length) {
        fields.warnings.push(pageType + " page: no level/production/capacity labels recognized; see visibleText.");
      }
    }
    if (/\biron depot\b/i.test(text) && infra.ironDepot === null) {
      const owned = text.match(/\biron depot\b[^\n]{0,100}\b(owned|active|enabled)\b/i);
      const notOwned = text.match(/\biron depot\b[^\n]{0,100}\b(not owned|locked|disabled)\b/i);
      if (notOwned) {
        infra.ironDepot = scalar(false, notOwned[0], "visible-label");
      } else if (owned) {
        infra.ironDepot = scalar(true, owned[0], "visible-label");
      } else {
        fields.warnings.push("Iron Depot was mentioned, but ownership was not explicit; left unknown.");
      }
    }
    for (const extra of ["orchard", "vineyard"]) {
      const re = new RegExp("\\b" + extra + "\\b", "i");
      if (re.test(text) && !Object.keys(infra[extra]).length) {
        const lm = text.match(new RegExp(extra + "\\s*level\\s*[:#\\-]?\\s*(\\d[\\d,]*)", "i"));
        if (lm) infra[extra] = { level: qtyScalar(lm[1], "visible-label") };
      }
    }
  }

  /* -------- inventory-page layout parser (evidence-based; keep in sync
     with shared/textparse.js) -------- */

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

  function looksLikeInventoryPage(lines, text) {
    const hasCapacitySentence = /cannot have more than\s*[\d,]+\s*of any single thing/i.test(text);
    const lower = lines.map((l) => l.trim().toLowerCase());
    return hasCapacitySentence || (lower.includes("meals") && lower.includes("items"));
  }

  /** Parse the real "My Inventory" layout: craftable list + capacity
      sentence + Meals and Items sections. Raw strings only. */
  function parseInventoryPage(lines, text) {
    const out = { capacityMax: null, craftingLevel: null, inventoryStats: { uniqueItems: null, totalItems: null }, inventory: [], consumables: [], masteries: [] };

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
      let m = line.match(REQ_INLINE);
      if (m) {
        addInventory(m[3], m[1], "inferred-page-section", null);
        continue;
      }
      m = line.match(REQ_SPLIT_A);
      if (m && i + 2 < craftEnd && isPlainQty(clean[i + 1]) && isPlausibleName(clean[i + 2])) {
        addInventory(clean[i + 2], m[1], "inferred-page-section", null);
        i += 2;
        continue;
      }
    }

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
          if (desc.length > 6) break;
        }
        if (count !== null) {
          onEntry({ name: name, count: count, status: status, atCapacity: atCapacity, description: desc.join(" ") || null });
          i = j + 1;
        } else {
          i++;
        }
      }
    }

    if (idxMeals !== -1 && idxItems !== -1) {
      scanEntries(idxMeals + 1, idxItems, (e) => {
        out.consumables.push({ name: e.name, quantity: e.count, confidence: "visible-label", kind: "meal" });
        if (e.status) out.masteries.push({ itemName: e.name, status: e.status, confidence: "visible-label" });
      });
    }
    if (idxItems !== -1) {
      scanEntries(idxItems + 1, idxStats === -1 ? clean.length : idxStats, (e) => {
        addInventory(e.name, e.count, "visible-label", e.atCapacity ? { atCapacity: true } : null);
        if (e.status) out.masteries.push({ itemName: e.name, status: e.status, confidence: "visible-label" });
      });
    }

    return out;
  }

  /** Fold parseInventoryPage output into capture fields with typed scalars. */
  function applyInventoryPage(fields, parsed) {
    if (parsed.capacityMax && !fields.capacity.inventoryMaximum) {
      fields.capacity.inventoryMaximum = qtyScalar(parsed.capacityMax, "visible-label");
    }
    if (parsed.craftingLevel && !fields.levels.crafting) {
      fields.levels.crafting = qtyScalar(parsed.craftingLevel, "visible-label");
    }
    if (parsed.inventoryStats.uniqueItems) fields.inventoryStats.uniqueItems = qtyScalar(parsed.inventoryStats.uniqueItems, "visible-label");
    if (parsed.inventoryStats.totalItems) fields.inventoryStats.totalItems = qtyScalar(parsed.inventoryStats.totalItems, "visible-label");
    const capScalar = parsed.capacityMax ? qtyScalar(parsed.capacityMax, "visible-label") : null;
    const existing = new Set(fields.inventory.map((i) => i.name.trim().toLowerCase()));
    for (const item of parsed.inventory) {
      const key = item.name.trim().toLowerCase();
      if (existing.has(key)) continue;
      existing.add(key);
      fields.inventory.push({
        name: item.name,
        quantity: qtyScalar(item.quantity, item.confidence),
        capacity: item.atCapacity && capScalar ? capScalar : null,
        locked: null,
        itemId: null,
        confidence: item.confidence,
      });
    }
    const existingCons = new Set(fields.consumables.map((c) => c.name.trim().toLowerCase()));
    for (const c of parsed.consumables) {
      const key = c.name.trim().toLowerCase();
      if (existingCons.has(key)) continue;
      existingCons.add(key);
      fields.consumables.push({
        name: c.name,
        quantity: qtyScalar(c.quantity, c.confidence),
        kind: c.kind || null,
        confidence: c.confidence,
      });
    }
    const existingMast = new Set(fields.masteries.map((m2) => m2.itemName.trim().toLowerCase()));
    for (const mst of parsed.masteries) {
      const key = mst.itemName.trim().toLowerCase();
      if (existingMast.has(key)) continue;
      existingMast.add(key);
      fields.masteries.push({
        itemName: mst.itemName,
        masteryCount: null,
        masteryLevel: mst.status,
        grandMastery: /^grand mastered$/i.test(mst.status) ? true : null,
        megaMastery: /^mega mastered$/i.test(mst.status) ? true : null,
        towerRequirement: null,
        progress: null,
        completed: null,
        confidence: mst.confidence,
      });
    }
  }

  /* ---------------- main ---------------- */

  function main() {
    const capturedAt = new Date().toISOString();
    const title = document.title || "Farm RPG page";
    const url = sanitizeUrl(location.href);
    const visibleText = getVisibleText();
    const lines = visibleText.split("\n").map((l) => l.trim()).filter(Boolean);
    const blocks = visibleText.split(/\n\n+/);
    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .map((h) => cleanWhitespace(h.innerText || ""))
      .filter(Boolean);
    const routePage = pageTypeFromRoute(location.href);
    let [pageType, pageLabel] = routePage || detectPageType(visibleText, headings);
    if (looksLikeInventoryPage(lines, visibleText)) {
      // The real "My Inventory" layout wins over keyword guessing (the nav
      // cards mention Tower, Quests, etc. on every page).
      pageType = "inventory";
      pageLabel = "Inventory";
    }

    const fields = {
      player: { name: null, farmName: null, playerId: null, accountCreated: null },
      levels: { farming: null, fishing: null, crafting: null, exploring: null, cooking: null, tower: null },
      balances: { silver: null, gold: null, staminaCurrent: null, staminaMaximum: null },
      capacity: { inventoryCurrent: null, inventoryMaximum: null },
      inventoryStats: { uniqueItems: null, totalItems: null },
      towerProgress: null,
      masteryStats: { mastered: null, grandMastered: null, megaMastered: null },
      questStats: {
        specialAvailable: null, active: null, personalAvailable: null,
        requestsCompleted: null, personalCompleted: null,
        completedListed: null, completedCaptured: null, completedHistoryTruncated: null,
      },
      perkStats: { pointsLeft: null, pointsUsed: null, perksAvailable: null, timesReset: null, activeSetId: null, activeSetName: null },
      supplyStats: { maxMailbox: null, activeMealEffects: null },
      kitchenStats: { ovensOwned: null, emptyOvens: null, maximumOvensAvailable: null, nextOvenCookingLevel: null, fruitPunchLeft: null },
      consumables: [],
      inventory: [],
      masteries: [],
      quests: [],
      perks: [],
      farmSupply: [],
      craftworks: [],
      pets: [],
      friendships: [],
      artifacts: [],
      activeEffects: [],
      infrastructure: { ironDepot: null, sawmill: {}, quarry: {}, storehouse: {}, orchard: {}, vineyard: {}, farmhouse: {}, ironworks: {}, steelworks: {}, hayField: {}, troutFarm: {}, wormHabitat: {} },
      warnings: [],
    };

    // Navigation labels and unlock requirements on other pages can resemble
    // player names or skill levels. Profile is the authoritative source.
    if (pageType === "profile") {
      extractPlayer(lines, fields);
      extractLevels(lines, fields, fields.warnings);
    }
    extractBalances(lines, fields);
    extractConsumables(lines, fields);
    extractInfrastructure(lines, pageType, visibleText, fields);
    if (pageType === "profile") applyProfilePage(fields, parseProfilePage(lines));
    if (pageType === "tower") applyTowerPage(fields, parseTowerPage(lines, visibleText));

    // Top-bar Silver/Gold are icon images with alt text, not text labels —
    // read them on every page; other icon+quantity pairs join the inventory.
    for (const item of extractIconItems()) {
      const lname = item.name.trim().toLowerCase();
      if (lname === "silver" && !fields.balances.silver) {
        fields.balances.silver = item.quantity;
        continue;
      }
      if (lname === "gold" && !fields.balances.gold) {
        fields.balances.gold = item.quantity;
        continue;
      }
      if (!fields.inventory.some((x) => x.name.trim().toLowerCase() === lname)) {
        fields.inventory.push(item);
      }
    }

    if (pageType !== "craftworks" && looksLikeInventoryPage(lines, visibleText)) {
      // Real "My Inventory" layout: craftable list + Meals/Items sections.
      applyInventoryPage(fields, parseInventoryPage(lines, visibleText));
    } else if (pageType === "inventory" || pageType === "storehouse") {
      extractInventory(fields, fields.warnings);
    }
    if (pageType === "mastery") applyMasteryPage(fields, parseMasteryPage(lines, visibleText));
    if (pageType.startsWith("quests")) {
      const completed = parseCompletedQuestPage(lines, visibleText);
      if (completed.quests.length) applyCompletedQuestPage(fields, completed);
      else {
        const dashboard = parseQuestDashboard(lines, visibleText);
        if (dashboard.quests.length) applyQuestDashboard(fields, dashboard);
        else extractQuests(blocks, pageType, fields);
      }
    }
    if (pageType === "perks") applyPerkPage(fields, parsePerkPage(lines, visibleText));
    if (pageType === "farm-supply") {
      applyFarmSupplyOverview(fields, parseFarmSupplyOverview(lines, visibleText));
      fields.farmSupply = extractFarmSupplyRows();
    }
    if (pageType === "craftworks") fields.craftworks = extractCraftworksRows();
    if (pageType === "pets") fields.pets = extractPetRows();
    if (pageType === "friendships") applyFriendshipPage(fields, parseFriendshipPage(lines, visibleText));
    if (pageType === "kitchen") applyKitchenPage(fields, parseKitchenPage(lines, visibleText));
    if (pageType === "artifacts") extractBonuses(blocks, "artifacts", fields);

    // Drop empty scaffolding so captures stay small.
    for (const k of Object.keys(fields.player)) if (fields.player[k] === null) delete fields.player[k];
    if (!Object.keys(fields.player).length) delete fields.player;
    for (const section of ["levels", "balances", "capacity", "inventoryStats", "masteryStats", "questStats", "perkStats", "supplyStats", "kitchenStats"]) {
      for (const k of Object.keys(fields[section])) if (fields[section][k] === null) delete fields[section][k];
      if (!Object.keys(fields[section]).length) delete fields[section];
    }
    if (fields.towerProgress) {
      for (const k of ["currentLevel", "ascensionKnowledge", "dailySilver", "nextLevel", "nextAkCost", "nextSilverCost", "nextMegaMasteries"]) {
        if (fields.towerProgress[k] === null) delete fields.towerProgress[k];
      }
      if (!fields.towerProgress.nextRewards.length) delete fields.towerProgress.nextRewards;
      if (!fields.towerProgress.history.length) delete fields.towerProgress.history;
    } else delete fields.towerProgress;
    for (const arr of ["consumables", "inventory", "masteries", "quests", "perks", "farmSupply", "craftworks", "pets", "friendships", "artifacts", "activeEffects"]) {
      if (!fields[arr].length) delete fields[arr];
    }
    const infra = fields.infrastructure;
    for (const b of ["sawmill", "quarry", "storehouse", "orchard", "vineyard", "farmhouse", "ironworks", "steelworks", "hayField", "troutFarm", "wormHabitat"]) {
      if (!Object.keys(infra[b]).length) delete infra[b];
    }
    if (infra.ironDepot === null) delete infra.ironDepot;
    if (!Object.keys(infra).length) delete fields.infrastructure;

    const warnings = fields.warnings.slice();
    delete fields.warnings;
    const structuredCount = Object.keys(fields).length;
    if (!structuredCount) {
      warnings.push("No structured fields recognized on this page; only fallback visibleText was stored.");
    }
    // Only call a capture provisional when it really fell back to generic text
    // parsing. Saying it about every page made pages that were parsed properly
    // look untrustworthy, which is worse than saying nothing.
    if (!structuredCount) {
      warnings.push("Extraction is provisional (generic label/table/text parsing). Verify values against the page before relying on them.");
    }

    const payload = {
      schema: CAPTURE_SCHEMA,
      collectorVersion: COLLECTOR_VERSION,
      parserStatus: structuredCount ? "parsed" : "provisional",
      capturedAt,
      pageType,
      pageLabel,
      title: cleanWhitespace(title),
      url,
      fields,
      visibleText,
      warnings,
    };

    const stamp = capturedAt.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const filename = "farmrpg-capture-" + pageType + "-" + stamp + ".json";
    downloadJson(filename, payload);
    const msg =
      "Farm RPG capture saved: " + filename + " (" + structuredCount +
      " structured section" + (structuredCount === 1 ? "" : "s") + ", " +
      visibleText.length.toLocaleString() + " text characters). Nothing was sent anywhere.";
    console.log(msg);
    window.dispatchEvent(new CustomEvent("farmrpg-account-capture-built", { detail: { pageType, filename } }));
  }

  globalThis.__farmRpgCaptureNow = function () {
    try {
      if (!document.body) throw new Error("document.body is not available yet");
      main();
      return true;
    } catch (err) {
      console.error("Farm RPG account sync capture failed:", err);
      window.dispatchEvent(new CustomEvent("farmrpg-account-capture-error", { detail: String(err && err.message || err) }));
      return false;
    }
  };
})();


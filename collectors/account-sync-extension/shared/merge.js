/* Farm RPG account importer — capture merging engine.
   Loaded as a classic script in the browser (exposes window.ImporterShared)
   and via require() in Node tests. No dependencies, no network access.

   Merge rules (per the project brief):
   - Newest capture wins for the same field; a null/empty value never
     overwrites a known value.
   - Inventory and consumables match by normalized exact item name.
   - Quests match by normalized exact quest title.
   - A quest is never guessed "completed" because it disappeared from a list.
   - Ties or disagreements become warnings instead of silent choices.
   - Provenance (source page, capture time, confidence, raw string) is kept
     for every merged value. */
(function (root, factory) {
  const deps =
    typeof module === "object" && module.exports
      ? {
          numbers: require("./numbers.js"),
          sanitize: require("./sanitize.js"),
          schema: require("./schema.js"),
        }
      : { numbers: root.ImporterShared, sanitize: root.ImporterShared, schema: root.ImporterShared };
  const api = factory(deps);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImporterShared = Object.assign(root.ImporterShared || {}, api);
})(typeof self !== "undefined" ? self : globalThis, function (deps) {
  "use strict";

  const QUEST_BUCKETS = ["available", "active", "ready", "completed", "locked"];

  function getPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  /** Accept null, primitives, or { value, raw, confidence } wrappers. */
  function readScalar(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "object" && !Array.isArray(v)) {
      if (v.value === null || v.value === undefined || v.value === "") return null;
      return {
        value: v.value,
        raw: typeof v.raw === "string" ? v.raw : String(v.value),
        confidence: typeof v.confidence === "string" ? v.confidence : "unknown",
      };
    }
    return { value: v, raw: String(v), confidence: "unknown" };
  }

  function isNewer(candidate, existing) {
    if (!existing) return true;
    if (candidate.capturedAt !== existing.capturedAt) return candidate.capturedAt > existing.capturedAt;
    return candidate.seq > existing.seq;
  }

  function makeMerger(snapshot, warnings, captureLabel) {
    function provenanceWrite(path, cand) {
      snapshot.provenance[path] = {
        sourcePage: cand.sourcePage,
        capturedAt: cand.capturedAt,
        confidence: cand.confidence || "unknown",
        raw: cand.raw,
        seq: cand.seq,
      };
    }

    /** Merge one scalar into a snapshot dotted path with provenance. */
    function scalar(path, rawValue, cand) {
      const s = readScalar(rawValue);
      if (!s) return; // null never overwrites, never creates
      const existingMeta = snapshot.provenance[path];
      const existingValue = getPath(snapshot, path);
      const candMeta = {
        capturedAt: cand.capturedAt,
        seq: cand.seq,
        sourcePage: cand.sourcePage,
        confidence: s.confidence,
        raw: s.raw,
      };
      if (existingValue === null || existingValue === undefined) {
        setPath(snapshot, path, s.value);
        provenanceWrite(path, candMeta);
        return;
      }
      if (isNewer(candMeta, existingMeta)) {
        if (String(existingValue) !== String(s.value) && existingMeta && existingMeta.capturedAt === candMeta.capturedAt) {
          warnings.push(
            "Conflict at " + path + ": " + captureLabel(existingMeta) + " had " +
            JSON.stringify(existingValue) + ", " + captureLabel(candMeta) + " has " +
            JSON.stringify(s.value) + " (same capture time; kept newer import)."
          );
        }
        setPath(snapshot, path, s.value);
        provenanceWrite(path, candMeta);
      }
    }

    /** Merge one entry into a keyed collection (inventory, masteries, ...). */
    function collectionEntry(map, keyField, entry, fields, cand, collectionName) {
      const rawKey = entry[keyField];
      const key = deps.sanitize.normalizeName(rawKey);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { __key: key, __fieldMeta: {} });
      }
      const target = map.get(key);
      for (const field of fields) {
        let v = entry[field];
        if (v === undefined || v === null || v === "") continue;
        const s = field === keyField || typeof v === "boolean" || Array.isArray(v) ? { value: v, raw: undefined, confidence: entry.confidence } : readScalar(v);
        if (!s && typeof v !== "boolean" && !Array.isArray(v)) continue;
        const value = s ? s.value : v;
        const prevMeta = target.__fieldMeta[field];
        const candMeta = { capturedAt: cand.capturedAt, seq: cand.seq };
        if (!prevMeta || isNewer(candMeta, prevMeta)) {
          target[field] = value;
          target.__fieldMeta[field] = candMeta;
          snapshot.provenance[collectionName + "." + key + "." + field] = {
            sourcePage: cand.sourcePage,
            capturedAt: cand.capturedAt,
            confidence: (s && s.confidence) || entry.confidence || "unknown",
            raw: s ? s.raw : undefined,
          };
        } else if (prevMeta.capturedAt === cand.capturedAt && String(target[field]) !== String(value)) {
          warnings.push(
            "Conflict in " + collectionName + ' entry "' + rawKey + '" field "' + field +
            '": two captures from the same time disagree (' +
            JSON.stringify(target[field]) + " vs " + JSON.stringify(value) + "); kept first import."
          );
        }
      }
      target.sourcePage = cand.sourcePage;
      target.capturedAt = cand.capturedAt;
    }

    return { scalar: scalar, collectionEntry: collectionEntry };
  }

  const SCALAR_SECTIONS = {
    player: { name: "player.name", farmName: "player.farmName", playerId: "player.playerId", accountCreated: "player.accountCreated" },
    levels: {
      farming: "levels.farming", fishing: "levels.fishing", crafting: "levels.crafting",
      exploring: "levels.exploring", cooking: "levels.cooking", tower: "levels.tower",
      mining: "levels.mining",
    },
    balances: {
      silver: "balances.silver", gold: "balances.gold",
      staminaCurrent: "balances.staminaCurrent", staminaMaximum: "balances.staminaMaximum",
    },
    capacity: {
      inventoryCurrent: "capacity.inventoryCurrent", inventoryMaximum: "capacity.inventoryMaximum",
    },
    inventoryStats: {
      uniqueItems: "inventoryStats.uniqueItems", totalItems: "inventoryStats.totalItems",
    },
    towerProgress: {
      currentLevel: "towerProgress.currentLevel",
      ascensionKnowledge: "towerProgress.ascensionKnowledge",
      dailySilver: "towerProgress.dailySilver",
      nextLevel: "towerProgress.nextLevel",
      nextAkCost: "towerProgress.nextAkCost",
      nextSilverCost: "towerProgress.nextSilverCost",
      nextMegaMasteries: "towerProgress.nextMegaMasteries",
    },
    masteryStats: {
      mastered: "masteryStats.mastered",
      grandMastered: "masteryStats.grandMastered",
      megaMastered: "masteryStats.megaMastered",
    },
    questStats: {
      specialAvailable: "questStats.specialAvailable",
      active: "questStats.active",
      personalAvailable: "questStats.personalAvailable",
      requestsCompleted: "questStats.requestsCompleted",
      personalCompleted: "questStats.personalCompleted",
      completedListed: "questStats.completedListed",
      completedCaptured: "questStats.completedCaptured",
      completedHistoryTruncated: "questStats.completedHistoryTruncated",
    },
    perkStats: {
      pointsLeft: "perkStats.pointsLeft",
      pointsUsed: "perkStats.pointsUsed",
      perksAvailable: "perkStats.perksAvailable",
      timesReset: "perkStats.timesReset",
      activeSetId: "perkStats.activeSetId",
      activeSetName: "perkStats.activeSetName",
    },
    supplyStats: {
      maxMailbox: "supplyStats.maxMailbox",
      activeMealEffects: "supplyStats.activeMealEffects",
    },
    kitchenStats: {
      ovensOwned: "kitchenStats.ovensOwned",
      emptyOvens: "kitchenStats.emptyOvens",
      maximumOvensAvailable: "kitchenStats.maximumOvensAvailable",
      nextOvenCookingLevel: "kitchenStats.nextOvenCookingLevel",
      fruitPunchLeft: "kitchenStats.fruitPunchLeft",
    },
  };

  function mergeInfrastructure(snapshot, infra, cand, mergerWarnings) {
    if (!infra || typeof infra !== "object") return;
    const prov = snapshot.provenance;
    function leaf(path, v) {
      const s = readScalar(v);
      const isBool = typeof v === "boolean";
      if (!s && !isBool) return;
      const value = isBool ? v : s.value;
      const existingMeta = prov[path];
      const existingValue = getPath(snapshot, path);
      const candMeta = { capturedAt: cand.capturedAt, seq: cand.seq };
      if (existingValue === null || existingValue === undefined || isNewer(candMeta, existingMeta)) {
        setPath(snapshot, path, value);
        prov[path] = {
          sourcePage: cand.sourcePage,
          capturedAt: cand.capturedAt,
          confidence: (s && s.confidence) || "unknown",
          raw: s ? s.raw : undefined,
          seq: cand.seq,
        };
      }
    }
    if (infra.ironDepot !== undefined && infra.ironDepot !== null) {
      leaf("infrastructure.ironDepot", infra.ironDepot);
    }
    for (const building of ["sawmill", "quarry", "storehouse", "orchard", "vineyard", "farmhouse", "ironworks", "steelworks", "hayField", "troutFarm", "wormHabitat"]) {
      const sub = infra[building];
      if (!sub || typeof sub !== "object") continue;
      for (const k of Object.keys(sub)) {
        leaf("infrastructure." + building + "." + k, sub[k]);
      }
    }
  }

  /**
   * Merge validated captures into one account snapshot.
   * captures: array of validated capture objects (from validateCapture),
   *           each may carry _fileName for display.
   * options.now: ISO timestamp used as generatedAt (defaults to current time).
   */
  function mergeCaptures(captures, options) {
    const now = options && typeof options.now === "string" ? options.now : new Date().toISOString();
    const snapshot = deps.schema.emptySnapshot();
    snapshot.generatedAt = now;
    const warnings = snapshot.warnings;

    const sorted = captures
      .map(function (c, i) { return { c: c, seq: i }; })
      .sort(function (a, b) {
        if (a.c.capturedAt !== b.c.capturedAt) return a.c.capturedAt < b.c.capturedAt ? -1 : 1;
        return a.seq - b.seq;
      });

    const captureLabel = function (meta) {
      return (meta.sourcePage || "unknown page") + " @ " + (meta.capturedAt || "unknown time");
    };
    const merger = makeMerger(snapshot, warnings, captureLabel);

    const inventoryMap = new Map();
    const consumableMap = new Map();
    const masteryMap = new Map();
    const questMap = new Map();
    const perkMap = new Map();
    const farmSupplyMap = new Map();
    const craftworksMap = new Map();
    const petMap = new Map();
    const friendshipMap = new Map();
    const artifactMap = new Map();
    const activeEffectMap = new Map();

    for (const { c, seq } of sorted) {
      const cand = { capturedAt: c.capturedAt, seq: seq, sourcePage: c.pageType };
      snapshot.captures.push({
        pageType: c.pageType,
        pageLabel: c.pageLabel,
        capturedAt: c.capturedAt,
        url: c.url,
        title: c.title,
        fileName: c._fileName || null,
        legacy: !!c.legacy,
      });
      for (const w of c.warnings || []) {
        warnings.push("[" + c.pageType + " @ " + c.capturedAt + "] " + w);
      }
      const f = c.fields || {};

      for (const section of Object.keys(SCALAR_SECTIONS)) {
        const sub = f[section];
        if (!sub || typeof sub !== "object") continue;
        for (const key of Object.keys(SCALAR_SECTIONS[section])) {
          if (sub[key] !== undefined) merger.scalar(SCALAR_SECTIONS[section][key], sub[key], cand);
        }
      }

      mergeInfrastructure(snapshot, f.infrastructure, cand, warnings);

      if (f.towerProgress && typeof f.towerProgress === "object") {
        const detailMeta = snapshot.provenance["towerProgress.details"];
        if (!detailMeta || isNewer(cand, detailMeta)) {
          const unwrap = (value) => {
            const s = readScalar(value);
            return s ? s.value : null;
          };
          const rewards = (f.towerProgress.nextRewards || []).map((reward) => ({
            name: reward.name,
            quantity: unwrap(reward.quantity),
          })).filter((reward) => reward.name && reward.quantity !== null);
          const history = (f.towerProgress.history || []).map((entry) => ({
            level: unwrap(entry.level),
            date: entry.date || null,
            current: entry.current === true,
            rewards: (entry.rewards || []).map((reward) => ({ name: reward.name, quantity: unwrap(reward.quantity) }))
              .filter((reward) => reward.name && reward.quantity !== null),
          })).filter((entry) => entry.level !== null);
          if (rewards.length) snapshot.towerProgress.nextRewards = rewards;
          if (history.length) snapshot.towerProgress.history = history;
          snapshot.provenance["towerProgress.details"] = {
            sourcePage: cand.sourcePage, capturedAt: cand.capturedAt,
            confidence: "visible-label", seq: cand.seq,
          };
        }
      }

      for (const item of f.consumables || []) {
        merger.collectionEntry(consumableMap, "name", item, ["name", "quantity", "kind"], cand, "consumables");
      }
      for (const item of f.inventory || []) {
        merger.collectionEntry(
          inventoryMap, "name", item,
          ["name", "quantity", "capacity", "locked", "itemId"], cand, "inventory"
        );
      }
      for (const m of f.masteries || []) {
        merger.collectionEntry(
          masteryMap, "itemName", m,
          ["itemName", "masteryCount", "masteryLevel", "mastered", "grandMastery", "megaMastery", "towerRequirement", "progressCurrent", "progressTarget", "progressPercent", "completed"],
          cand, "masteries"
        );
      }
      for (const q of f.quests || []) {
        mergeQuest(questMap, q, cand, snapshot, warnings);
      }
      for (const p of f.perks || []) {
        merger.collectionEntry(perkMap, "name", p, ["name", "category", "owned", "description", "towerRequirement", "domEvidence"], cand, "perks");
      }
      for (const p of f.farmSupply || []) {
        merger.collectionEntry(farmSupplyMap, "name", p, ["name", "category", "owned", "description", "goldCost", "domEvidence"], cand, "farmSupply");
      }
      for (const item of f.craftworks || []) {
        merger.collectionEntry(craftworksMap, "itemName", item, ["itemName", "order", "inventoryQuantity", "blockedBy", "paused"], cand, "craftworks");
      }
      for (const pet of f.pets || []) {
        merger.collectionEntry(petMap, "petKey", pet, ["petKey", "displayName", "species", "level", "imageAlt", "imageSrc", "domEvidence"], cand, "pets");
      }
      for (const person of f.friendships || []) {
        merger.collectionEntry(friendshipMap, "name", person, ["name", "level", "nextRewardLevel", "townsfolkOfDay"], cand, "friendships");
      }
      for (const a of f.artifacts || []) {
        merger.collectionEntry(artifactMap, "name", a, ["name", "owned", "description"], cand, "artifacts");
      }
      for (const effect of f.activeEffects || []) {
        merger.collectionEntry(activeEffectMap, "name", effect, ["name", "uses", "remaining"], cand, "activeEffects");
      }
    }

    finalizeCollections(snapshot, {
      inventoryMap: inventoryMap,
      consumableMap: consumableMap,
      masteryMap: masteryMap,
      questMap: questMap,
      perkMap: perkMap,
      farmSupplyMap: farmSupplyMap,
      craftworksMap: craftworksMap,
      petMap: petMap,
      friendshipMap: friendshipMap,
      artifactMap: artifactMap,
      activeEffectMap: activeEffectMap,
    });
    computeUnknownFields(snapshot);
    return snapshot;
  }

  function mergeQuest(questMap, q, cand, snapshot, warnings) {
    const key = deps.sanitize.normalizeName(q.title);
    if (!key) return;
    const status = QUEST_BUCKETS.indexOf(q.status) !== -1 ? q.status : "available";
    if (!questMap.has(key)) {
      questMap.set(key, {
        title: String(q.title).trim(),
        giver: null,
        status: status,
        requiredItems: [],
        rewards: [],
        prerequisites: null,
        chain: null,
        history: [],
        __statusMeta: null,
        __reqMeta: null,
        __detailMeta: null,
      });
    }
    const t = questMap.get(key);
    const candMeta = { capturedAt: cand.capturedAt, seq: cand.seq };
    t.history.push({ status: status, capturedAt: cand.capturedAt, sourcePage: cand.sourcePage });

    if (!t.__statusMeta || isNewer(candMeta, t.__statusMeta)) {
      if (
        t.__statusMeta &&
        t.__statusMeta.capturedAt === cand.capturedAt &&
        t.status !== status
      ) {
        warnings.push(
          'Quest "' + t.title + '" has conflicting statuses ("' + t.status + '" vs "' + status +
          '") in two captures from ' + cand.capturedAt + "; kept first import."
        );
      } else {
        t.status = status;
        t.__statusMeta = candMeta;
        snapshot.provenance["quests." + key + ".status"] = {
          sourcePage: cand.sourcePage,
          capturedAt: cand.capturedAt,
          confidence: q.confidence || "inferred-page-section",
        };
      }
    }
    if (!t.__detailMeta || isNewer(candMeta, t.__detailMeta)) {
      let anyDetail = false;
      for (const field of ["giver", "prerequisites", "chain", "availability", "progressPercent", "completionDate", "communityCompletions", "communityCompletionPercent"]) {
        if (q[field] !== undefined && q[field] !== null && q[field] !== "") {
          t[field] = q[field];
          anyDetail = true;
        }
      }
      if (Array.isArray(q.rewards) && q.rewards.length) {
        t.rewards = q.rewards.slice();
        anyDetail = true;
      }
      if (anyDetail) t.__detailMeta = candMeta;
    }
    if (Array.isArray(q.requiredItems) && q.requiredItems.length) {
      if (!t.__reqMeta || isNewer(candMeta, t.__reqMeta)) {
        t.requiredItems = q.requiredItems.map(function (r) {
          const have = readScalar(r.have);
          const need = readScalar(r.need);
          return {
            name: r.name,
            have: have ? have.value : null,
            need: need ? need.value : null,
            haveRaw: have ? have.raw : null,
            needRaw: need ? need.raw : null,
          };
        });
        t.__reqMeta = candMeta;
      }
    }
    t.sourcePage = cand.sourcePage;
    t.capturedAt = cand.capturedAt;
  }

  function stripMeta(entry) {
    const out = {};
    for (const k of Object.keys(entry)) {
      if (k.startsWith("__")) continue;
      out[k] = entry[k];
    }
    return out;
  }

  function byName(a, b) {
    const an = String(a.name || a.itemName || a.title || "").toLowerCase();
    const bn = String(b.name || b.itemName || b.title || "").toLowerCase();
    return an < bn ? -1 : an > bn ? 1 : 0;
  }

  function finalizeCollections(snapshot, maps) {
    for (const entry of maps.consumableMap.values()) {
      const clean = stripMeta(entry);
      snapshot.consumables[clean.name] = {
        quantity: clean.quantity !== undefined ? clean.quantity : null,
        kind: clean.kind !== undefined ? clean.kind : null,
        capturedAt: entry.capturedAt,
        sourcePage: entry.sourcePage,
      };
    }
    snapshot.inventory = Array.from(maps.inventoryMap.values()).map(stripMeta).sort(byName);
    snapshot.masteries = Array.from(maps.masteryMap.values()).map(stripMeta).sort(byName);
    snapshot.perks = Array.from(maps.perkMap.values()).map(stripMeta).sort(byName);
    snapshot.farmSupply = Array.from(maps.farmSupplyMap.values()).map(stripMeta).sort(byName);
    snapshot.craftworks = Array.from(maps.craftworksMap.values()).map(stripMeta).sort(function (a, b) {
      return Number(a.order || 0) - Number(b.order || 0);
    });
    snapshot.pets = Array.from(maps.petMap.values()).map(stripMeta).sort(byName);
    snapshot.friendships = Array.from(maps.friendshipMap.values()).map(stripMeta).sort(byName);
    snapshot.artifacts = Array.from(maps.artifactMap.values()).map(stripMeta).sort(byName);
    snapshot.activeEffects = Array.from(maps.activeEffectMap.values()).map(stripMeta).sort(byName);
    for (const q of maps.questMap.values()) {
      const clean = stripMeta(q);
      delete clean.__statusMeta;
      delete clean.__reqMeta;
      const bucket = QUEST_BUCKETS.indexOf(clean.status) !== -1 ? clean.status : "available";
      snapshot.quests[bucket].push(clean);
    }
    for (const b of QUEST_BUCKETS) snapshot.quests[b].sort(byName);
  }

  function computeUnknownFields(snapshot) {
    const unknown = snapshot.unknownFields;
    for (const path of deps.schema.expectedScalarPaths()) {
      const v = getPath(snapshot, path);
      if (v === null || v === undefined) unknown.push(path);
    }
    const norm = deps.sanitize.normalizeName;
    const haveConsumables = new Set(Object.keys(snapshot.consumables).map(norm));
    for (const item of snapshot.inventory) haveConsumables.add(norm(item.name));
    for (const name of deps.schema.EXPECTED_CONSUMABLES) {
      if (!haveConsumables.has(norm(name))) unknown.push("consumables." + name);
    }
    if (!snapshot.inventory.length) unknown.push("inventory (no items captured)");
    if (!snapshot.masteries.length) unknown.push("masteries (none captured)");
    const questCount = QUEST_BUCKETS.reduce(function (n, b) { return n + snapshot.quests[b].length; }, 0);
    if (!questCount) unknown.push("quests (none captured)");
    if (!snapshot.perks.length) unknown.push("perks (none captured)");
    if (!snapshot.farmSupply.length) unknown.push("farmSupply (none captured)");
    if (!snapshot.artifacts.length) unknown.push("artifacts (none captured)");
    const infra = snapshot.infrastructure;
    if (infra.ironDepot === null || infra.ironDepot === undefined) unknown.push("infrastructure.ironDepot");
    for (const b of ["sawmill", "quarry", "storehouse", "orchard", "vineyard"]) {
      if (!infra[b] || !Object.keys(infra[b]).length) unknown.push("infrastructure." + b);
    }
  }

  /**
   * Compatibility bridge: the same data in the older farmrpg-account-v1
   * template shape used by collectors/account-snapshot.template.json.
   */
  function buildLegacyV1(snapshot) {
    const inventory = {};
    for (const item of snapshot.inventory) {
      if (item.quantity !== null && item.quantity !== undefined) inventory[item.name] = item.quantity;
    }
    const masteries = {};
    for (const m of snapshot.masteries) {
      if (m.masteryCount !== null && m.masteryCount !== undefined) masteries[m.itemName] = m.masteryCount;
    }
    const consumables = snapshot.consumables || {};
    function consumableQty(name) {
      for (const k of Object.keys(consumables)) {
        if (deps.sanitize.normalizeName(k) === deps.sanitize.normalizeName(name)) {
          return consumables[k].quantity;
        }
      }
      // Craftable consumables (Cider, Nets, ...) live in inventory entries.
      for (const item of snapshot.inventory) {
        if (deps.sanitize.normalizeName(item.name) === deps.sanitize.normalizeName(name)) {
          return item.quantity !== undefined ? item.quantity : null;
        }
      }
      return null;
    }
    const ownedNames = function (list) {
      // Unknown ownership must never become enabled in the calculator.
      return list.filter(function (x) { return x.owned === true; }).map(function (x) { return x.name; });
    };
    return {
      schema: "farmrpg-account-v1",
      capturedAt: snapshot.generatedAt,
      towerLevel: snapshot.levels.tower,
      skills: {
        farming: snapshot.levels.farming,
        fishing: snapshot.levels.fishing,
        crafting: snapshot.levels.crafting,
        exploring: snapshot.levels.exploring,
        cooking: snapshot.levels.cooking,
        mining: snapshot.levels.mining !== undefined ? snapshot.levels.mining : null,
      },
      inventoryCapacity: snapshot.capacity.inventoryMaximum,
      inventory: inventory,
      activeQuests: snapshot.quests.active.concat(snapshot.quests.ready).map(function (q) { return q.title; }),
      completedQuestIds: [],
      completedQuestTitles: snapshot.quests.completed.map(function (q) { return q.title; }),
      masteries: masteries,
      pets: {},
      buildings: {
        sawmill: snapshot.infrastructure.sawmill || {},
        quarry: snapshot.infrastructure.quarry || {},
        orchard: snapshot.infrastructure.orchard || {},
      },
      perks: ownedNames(snapshot.perks),
      artifacts: ownedNames(snapshot.artifacts),
      availableMeals: [],
      dailyIncome: {
        "Large Net": consumableQty("Large Net"),
        "Apple Cider": consumableQty("Apple Cider"),
        "Arnold Palmer": consumableQty("Arnold Palmer"),
        "Orange Juice": consumableQty("Orange Juice"),
        "Lemonade": consumableQty("Lemonade"),
      },
      notes: "Bridged from " + snapshot.schemaVersion + ". Unknown values stay null. completedQuestIds cannot be recovered from visible pages, so completed quest titles are listed instead.",
    };
  }

  return {
    mergeCaptures: mergeCaptures,
    buildLegacyV1: buildLegacyV1,
    readScalar: readScalar,
    getPath: getPath,
    setPath: setPath,
    QUEST_BUCKETS: QUEST_BUCKETS,
  };
});

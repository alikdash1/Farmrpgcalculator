/* Farm RPG account importer — capture schema, validation, snapshot factory.
   Loaded as a classic script in the browser (exposes window.ImporterShared)
   and via require() in Node tests. No dependencies, no network access. */
(function (root, factory) {
  const deps =
    typeof module === "object" && module.exports
      ? { sanitize: require("./sanitize.js") }
      : { sanitize: root.ImporterShared };
  const api = factory(deps);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImporterShared = Object.assign(root.ImporterShared || {}, api);
})(typeof self !== "undefined" ? self : globalThis, function (deps) {
  "use strict";

  const CAPTURE_SCHEMA = "farmrpg-page-capture-v1";
  const LEGACY_VISIBLE_SCHEMA = "farmrpg-visible-page-v1";
  const SNAPSHOT_SCHEMA = "farmrpg-account-snapshot-v1";
  const COLLECTOR_VERSION = "1.0.0";
  const MAX_CAPTURE_BYTES = 5 * 1024 * 1024;
  const MAX_VISIBLE_TEXT = 500000;

  const KNOWN_PAGE_TYPES = [
    "profile",
    "farm-overview",
    "inventory",
    "mastery",
    "tower",
    "quests-available",
    "quests-active",
    "quests-completed",
    "quests",
    "perks",
    "farm-supply",
    "craftworks",
    "pets",
    "friendships",
    "kitchen",
    "artifacts",
    "sawmill",
    "quarry",
    "storehouse",
    "fishing",
    "exploring",
    "other",
    "unknown",
  ];

  const SKILL_KEYS = ["farming", "fishing", "crafting", "exploring", "cooking", "tower", "mining"];

  const EXPECTED_CONSUMABLES = [
    "Ancient Coin",
    "Arnold Palmer",
    "Apple Cider",
    "Orange Juice",
    "Lemonade",
    "Fishing Net",
    "Large Net",
  ];

  const CONFIDENCE_LEVELS = [
    "visible-label",
    "visible-table",
    "inferred-page-section",
    "unparsed-text",
    "unknown",
  ];

  /** Empty snapshot matching the agreed farmrpg-account-snapshot-v1 shape. */
  function emptySnapshot() {
    return {
      schemaVersion: SNAPSHOT_SCHEMA,
      generatedAt: null,
      collectorVersion: COLLECTOR_VERSION,
      player: { name: null, farmName: null, playerId: null, accountCreated: null },
      levels: { farming: null, fishing: null, crafting: null, exploring: null, cooking: null, tower: null, mining: null },
      balances: { silver: null, gold: null, staminaCurrent: null, staminaMaximum: null },
      capacity: { inventoryCurrent: null, inventoryMaximum: null },
      inventoryStats: { uniqueItems: null, totalItems: null },
      towerProgress: {
        currentLevel: null, ascensionKnowledge: null, dailySilver: null,
        nextLevel: null, nextAkCost: null, nextSilverCost: null, nextMegaMasteries: null,
        nextRewards: [], history: [],
      },
      masteryStats: { mastered: null, grandMastered: null, megaMastered: null },
      questStats: {
        specialAvailable: null, active: null, personalAvailable: null,
        requestsCompleted: null, personalCompleted: null,
        completedListed: null, completedCaptured: null, completedHistoryTruncated: null,
      },
      perkStats: { pointsLeft: null, pointsUsed: null, perksAvailable: null, timesReset: null, activeSetId: null, activeSetName: null },
      supplyStats: { maxMailbox: null, activeMealEffects: null },
      kitchenStats: { ovensOwned: null, emptyOvens: null, maximumOvensAvailable: null, nextOvenCookingLevel: null, fruitPunchLeft: null },
      consumables: {},
      // Item name to /img/items/… path, collected from the pages themselves so
      // the planner can draw items its own data has never seen.
      itemArt: {},
      inventory: [],
      masteries: [],
      quests: { available: [], active: [], ready: [], completed: [], locked: [] },
      perks: [],
      farmSupply: [],
      craftworks: [],
      pets: [],
      friendships: [],
      artifacts: [],
      activeEffects: [],
      infrastructure: {
        ironDepot: null,
        sawmill: {},
        quarry: {},
        storehouse: {},
        orchard: {},
        vineyard: {},
        farmhouse: {},
        ironworks: {},
        steelworks: {},
        hayField: {},
        troutFarm: {},
        wormHabitat: {},
      },
      captures: [],
      warnings: [],
      unknownFields: [],
      provenance: {},
    };
  }

  /** Scalar snapshot paths checked for the "missing information" list. */
  function expectedScalarPaths() {
    const paths = ["player.name", "player.playerId"];
    for (const k of SKILL_KEYS) paths.push("levels." + k);
    paths.push(
      "balances.silver",
      "balances.gold",
      "balances.staminaCurrent",
      "balances.staminaMaximum",
      "capacity.inventoryCurrent",
      "capacity.inventoryMaximum"
    );
    return paths;
  }

  function isValidIso(value) {
    if (typeof value !== "string" || !value) return false;
    const t = Date.parse(value);
    return Number.isFinite(t);
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function validateFields(fields, errors) {
    const objectSections = ["player", "levels", "balances", "capacity", "inventoryStats", "towerProgress", "masteryStats", "questStats", "perkStats", "supplyStats", "kitchenStats", "infrastructure"];
    const arraySections = ["consumables", "inventory", "masteries", "quests", "perks", "farmSupply", "craftworks", "pets", "friendships", "artifacts", "activeEffects"];
    for (const key of objectSections) {
      if (fields[key] !== undefined && !isPlainObject(fields[key])) {
        errors.push("fields." + key + " must be an object when present.");
      }
    }
    for (const key of arraySections) {
      if (fields[key] === undefined) continue;
      if (!Array.isArray(fields[key])) {
        errors.push("fields." + key + " must be an array when present.");
        continue;
      }
      if (fields[key].some(function (entry) { return !isPlainObject(entry); })) {
        errors.push("Every fields." + key + " entry must be an object.");
      }
    }
    for (const section of ["player", "levels", "balances", "capacity", "inventoryStats", "masteryStats", "questStats", "perkStats", "supplyStats", "kitchenStats"]) {
      if (!isPlainObject(fields[section])) continue;
      for (const key of Object.keys(fields[section])) {
        const scalar = fields[section][key];
        if (scalar === null || scalar === undefined) continue;
        if (!isPlainObject(scalar) || !("value" in scalar) ||
            (scalar.value !== null && !["string", "number", "boolean"].includes(typeof scalar.value))) {
          errors.push("fields." + section + "." + key + " must be a scalar evidence object.");
        }
      }
    }
  }

  /**
   * Validate one parsed capture object. Returns:
   *   { ok, errors, warnings, capture }
   * `capture` is a normalized copy safe to store; null when ok is false.
   * Legacy farmrpg-visible-page-v1 exports are accepted as raw-text-only
   * captures with pageType "unknown".
   */
  // Names to same-origin /img/items/ paths only. Anything else is discarded
  // rather than trusted: this ends up as an <img src> on the planner's pages.
  function sanitizeItemArt(value) {
    const out = {};
    if (!value || typeof value !== "object") return out;
    let kept = 0;
    for (const name of Object.keys(value)) {
      if (kept >= 4000) break;
      const path = value[name];
      if (typeof name !== "string" || typeof path !== "string") continue;
      if (!name.trim() || name.length > 60) continue;
      if (!/^\/img\/items\/[A-Za-z0-9_.\-]{1,120}$/.test(path)) continue;
      out[name.trim()] = path;
      kept += 1;
    }
    return out;
  }

  function validateCapture(parsed, rawBytes) {
    const errors = [];
    const warnings = [];

    if (typeof rawBytes === "number" && rawBytes > MAX_CAPTURE_BYTES) {
      errors.push("File is larger than 5 MB; capture files should be small JSON documents.");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push("File is not a JSON object.");
      return { ok: false, errors: errors, warnings: warnings, capture: null };
    }

    const schema = parsed.schema;
    const isLegacy = schema === LEGACY_VISIBLE_SCHEMA;
    if (schema !== CAPTURE_SCHEMA && !isLegacy) {
      errors.push(
        'Unrecognized schema "' + String(schema) + '". Expected "' + CAPTURE_SCHEMA + '".'
      );
    }
    if (!isValidIso(parsed.capturedAt)) {
      errors.push("capturedAt is missing or is not a valid timestamp.");
    }
    if (parsed.title !== undefined && typeof parsed.title !== "string") {
      errors.push("title must be a string when present.");
    }
    if (parsed.url !== undefined && typeof parsed.url !== "string") {
      errors.push("url must be a string when present.");
    }
    if (parsed.fields !== undefined && (parsed.fields === null || typeof parsed.fields !== "object" || Array.isArray(parsed.fields))) {
      errors.push("fields must be an object when present.");
    }
    if (isPlainObject(parsed.fields)) validateFields(parsed.fields, errors);
    if (parsed.visibleText !== undefined && typeof parsed.visibleText !== "string") {
      errors.push("visibleText must be a string when present.");
    }
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, capture: null };

    const pageType = typeof parsed.pageType === "string" && parsed.pageType.trim() ? parsed.pageType.trim() : "unknown";
    if (KNOWN_PAGE_TYPES.indexOf(pageType) === -1) {
      warnings.push('Unrecognized page type "' + pageType + '"; imported as "unknown".');
    }
    if (isLegacy) {
      warnings.push(
        "Legacy raw-text export (" + LEGACY_VISIBLE_SCHEMA + "): no structured fields, fallback text only."
      );
    }
    if (!parsed.url) warnings.push("Capture has no URL recorded.");
    const fields = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {};
    const visibleText = deps.sanitize.sanitizeVisibleText(parsed.visibleText || "", MAX_VISIBLE_TEXT);
    if (!Object.keys(fields).length && !visibleText) {
      warnings.push("Capture contains neither structured fields nor fallback text.");
    }

    const capture = {
      schema: CAPTURE_SCHEMA,
      collectorVersion: typeof parsed.collectorVersion === "string" ? parsed.collectorVersion : "unknown",
      capturedAt: new Date(parsed.capturedAt).toISOString(),
      pageType: KNOWN_PAGE_TYPES.indexOf(pageType) === -1 ? "unknown" : pageType,
      pageLabel: typeof parsed.pageLabel === "string" ? parsed.pageLabel : pageType,
      title: typeof parsed.title === "string" ? parsed.title : "",
      url: deps.sanitize.sanitizeUrl(typeof parsed.url === "string" ? parsed.url : ""),
      fields: fields,
      // Item artwork read off the page itself. It is how the planner learns
      // pictures for items its own data files have never heard of.
      itemArt: sanitizeItemArt(parsed.itemArt),
      visibleText: visibleText,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(function (w) { return typeof w === "string"; }) : [],
      legacy: isLegacy,
    };
    return { ok: true, errors: errors, warnings: warnings.concat(capture.warnings), capture: capture };
  }

  return {
    CAPTURE_SCHEMA: CAPTURE_SCHEMA,
    LEGACY_VISIBLE_SCHEMA: LEGACY_VISIBLE_SCHEMA,
    SNAPSHOT_SCHEMA: SNAPSHOT_SCHEMA,
    COLLECTOR_VERSION: COLLECTOR_VERSION,
    MAX_CAPTURE_BYTES: MAX_CAPTURE_BYTES,
    MAX_VISIBLE_TEXT: MAX_VISIBLE_TEXT,
    KNOWN_PAGE_TYPES: KNOWN_PAGE_TYPES,
    SKILL_KEYS: SKILL_KEYS,
    EXPECTED_CONSUMABLES: EXPECTED_CONSUMABLES,
    CONFIDENCE_LEVELS: CONFIDENCE_LEVELS,
    emptySnapshot: emptySnapshot,
    expectedScalarPaths: expectedScalarPaths,
    validateCapture: validateCapture,
  };
});




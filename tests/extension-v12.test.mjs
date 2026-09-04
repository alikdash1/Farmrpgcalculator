import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "collectors", "account-sync-extension");
const require = createRequire(import.meta.url);

test("validator keeps every supported account page distinct", () => {
  const schema = require(path.join(root, "shared/schema.js"));
  for (const pageType of ["craftworks", "pets", "friendships", "kitchen"]) {
    const checked = schema.validateCapture({
      schema: schema.CAPTURE_SCHEMA,
      capturedAt: "2026-09-01T10:00:00.000Z",
      pageType,
      pageLabel: pageType,
      fields: {},
      visibleText: "loaded"
    }, 100);
    assert.equal(checked.ok, true);
    assert.equal(checked.capture.pageType, pageType);
  }
});

function backgroundHarness() {
  let listener;
  const storage = {};
  const chrome = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of keys) if (key in storage) out[key] = storage[key];
          return out;
        },
        async set(value) { Object.assign(storage, value); },
        async remove(keys) { for (const key of keys) delete storage[key]; }
      }
    },
    runtime: { onMessage: { addListener(fn) { listener = fn; } } },
    tabs: { async query() { return []; }, async sendMessage() { return {}; } }
  };
  const ImporterShared = {
    validateCapture(capture) { return { ok: true, errors: [], capture: structuredClone(capture) }; },
    mergeCaptures(captures) { return { schemaVersion: "farmrpg-account-snapshot-v1", captures: captures.map((c) => c.pageType) }; },
    buildLegacyV1() { return {}; }
  };
  const context = { chrome, ImporterShared, importScripts() {}, TextEncoder, URL, Set, Object, String, JSON, Date, console, structuredClone };
  vm.runInNewContext(fs.readFileSync(path.join(root, "background.js"), "utf8"), context);
  const send = (message) => new Promise((resolve) => listener(message, {}, resolve));
  return { storage, send };
}

test("loading-shell mastery capture cannot replace complete mastery data", async () => {
  const { storage, send } = backgroundHarness();
  const oldCapture = {
    capturedAt: "2026-09-01T10:00:00.000Z",
    pageType: "mastery",
    pageLabel: "Mastery",
    fields: { masteries: [{ itemName: "Crossbow", masteryCount: { value: 1000000 } }] },
    visibleText: "Mastery In-Progress Crossbow"
  };
  const first = await send({ type: "farmrpg-account-capture", capture: oldCapture });
  assert.equal(first.ok, true);

  const shell = {
    capturedAt: "2026-09-01T10:05:00.000Z",
    pageType: "mastery",
    pageLabel: "Mastery",
    fields: {},
    visibleText: "Loading Mastery"
  };
  const second = await send({ type: "farmrpg-account-capture", capture: shell });
  assert.equal(second.ok, false);
  assert.equal(second.retained, true);
  assert.equal(second.retryable, true);
  assert.equal(storage.captures.mastery.fields.masteries.length, 1);
});

test("old unknown captures migrate back to their real account page type", async () => {
  const { storage, send } = backgroundHarness();
  storage.captures = {
    unknown: {
      capturedAt: "2026-08-27T10:00:00.000Z",
      pageType: "unknown",
      pageLabel: "Pets",
      title: "My Pets",
      fields: { pets: [{ petKey: "owl", displayName: "Owl" }] },
      visibleText: "My Pets"
    }
  };
  const result = await send({ type: "farmrpg-account-status" });
  assert.equal(result.ok, true);
  assert.ok(result.captured.includes("pets"));
  assert.equal(storage.captures.pets.pageType, "pets");
  assert.equal(storage.captures.unknown, undefined);
});

test("manifest stays narrowly scoped and popup supports complete export", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.permissions.sort(), ["downloads", "storage", "tabs"]);
  assert.ok(manifest.host_permissions.every((value) => /farmrpg|127\.0\.0\.1|localhost/.test(value)));
  assert.equal(manifest.optional_host_permissions, undefined);
  const popup = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  assert.match(popup, /farmrpg-account-save-file/);
  // The filename now lives in the service worker, which does the writing;
  // the popup only reports back whatever was saved.
  const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
  assert.match(background, /lantern-ledger-account-snapshot\.json/);
  assert.match(popup, /saved\.filename/);
});


test("snapshot is saved to a single overwritten file, never a growing pile", () => {
  const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
  // One stable name plus conflictAction overwrite is what stops Brave from
  // keeping the old copy and appending "(1)", "(2)" to each new export.
  assert.match(background, /lantern-ledger-account-snapshot\.json/);
  assert.match(background, /conflictAction:\s*"overwrite"/);
  assert.match(background, /saveAs:\s*false/);
  const popup = fs.readFileSync(path.join(root, "popup.js"), "utf8");
  assert.doesNotMatch(popup, /createObjectURL/);
});

test("a capture is only called provisional when it really fell back", () => {
  const capture = fs.readFileSync(path.join(root, "capture-page.js"), "utf8");
  assert.match(capture, /parserStatus: structuredCount \? "parsed" : "provisional"/);
});

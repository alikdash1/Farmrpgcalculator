import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, 'collectors/account-sync-extension');
const read = (name) => fs.readFileSync(path.join(ext, name), 'utf8');

test('extension is read-only and locally scoped', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  // 'downloads' is deliberate: the snapshot is written to one file that gets
  // overwritten, instead of a blob link that piles up '(1)', '(2)' copies.
  assert.deepEqual(manifest.permissions.sort(), ['downloads', 'storage', 'tabs']);
  assert.ok(manifest.host_permissions.every((url) => /farmrpg|127\.0\.0\.1|localhost/.test(url)));
  assert.ok(!manifest.permissions.includes('scripting'));
  assert.ok(!manifest.permissions.includes('webRequest'));
});

test('capture parser sends data to local extension storage instead of downloading', () => {
  const source = read('capture-page.js');
  assert.match(source, /farmrpg-account-capture/);
  assert.match(source, /__farmRpgCaptureNow/);
  assert.doesNotMatch(source, /anchor\.click\(\)/);
});

test('calculator bridge and Tower listener share the same message contract', () => {
  const bridge = read('calculator-bridge.js');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(bridge, /source: "farmrpg-account-sync"/);
  assert.match(app, /message\.source !== "farmrpg-account-sync"/);
  assert.match(app, /validAccountSnapshot\(message\.snapshot\)/);
});

test('personal Tower page uses the authoritative mastery-history snapshot', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const personalSource = fs.readFileSync(path.join(root, 'data/personal-tower.js'), 'utf8');
  const payload = JSON.parse(personalSource.slice(personalSource.indexOf('{'), personalSource.lastIndexOf(';')));
  assert.equal(payload.startFloor, 277);
  assert.equal(payload.goalFloor, 340);
  assert.equal(payload.source, 'Farm RPG Mastery History.csv');
  assert.equal(payload.authoritativeMasteries, true);
  assert.equal(Object.keys(payload.masteries).length, 514);
  assert.equal(payload.masteries['Butter Churn'], 1000000);
  assert.equal(payload.masteries.Crossbow, 1000000);
  // Snapshot of 2026-09-04: Looking Glass finished its Mega Mastery, Wizard
  // Hat is still short. Values are clamped at 1m because that is the cap.
  assert.equal(payload.masteries['Looking Glass'], 1000000);
  assert.equal(payload.masteries['Wizard Hat'], 832170);
  assert.equal(payload.masteries['Mulberry Snapper'], 1000000);
  assert.match(index, /id="towerRail"/);
  // Assert the manual-import control exists, not the wording around it —
  // player-facing copy is rewritten often and shouldn't break the suite.
  assert.match(index, /id="accountFile"[^>]*type="file"/);
});

test("the popup lists sections without controls that overlap the labels", () => {
  const js = fs.readFileSync(path.join(ext, "popup.js"), "utf8");
  const css = fs.readFileSync(path.join(ext, "popup.css"), "utf8");
  const html = fs.readFileSync(path.join(ext, "popup.html"), "utf8");

  // A button in the section list inherited the global `button{width:100%}` and
  // printed straight over the section name.
  assert.doesNotMatch(js, /createElement\("button"\)/);
  assert.doesNotMatch(js, /FALLBACK_URL/);
  assert.match(css, /\.sections li \{[\s\S]*?grid-template-columns/);

  // Downloading a copy of every capture is opt-in; the player asked for that.
  assert.match(js, /prefs\.autoSaveFile === true/);
  assert.doesNotMatch(html, /id="autoSave" type="checkbox" checked/);

  // The list refreshes itself when a capture lands, rather than only on reopen.
  assert.match(js, /chrome\.storage\.onChanged\.addListener/);
});

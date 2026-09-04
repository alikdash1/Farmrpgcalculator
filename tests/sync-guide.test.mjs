import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("the setup guide is on the page, not only in the repo README", () => {
  const html = read("index.html");
  assert.match(html, /id="syncGuide"/);
  assert.match(html, /id="saveGuide"/);
  assert.match(html, /id="goGuide"/);
  assert.match(html, /<script src="sync-guide\.js/);
  // The old link opened a raw markdown file in the browser; it must stay gone.
  assert.doesNotMatch(html, /href="collectors\/account-sync-extension\/README\.md"/);
});

test("the guide lists every site the extension actually asks for", () => {
  const html = read("index.html");
  const manifest = JSON.parse(read("collectors/account-sync-extension/manifest.json"));
  const shown = [...html.matchAll(/<li><code>([^<]+)<\/code><span>/g)].map((m) => m[1]);
  const asked = manifest.host_permissions.slice();
  // file:///* is granted by a switch rather than host_permissions, so it is
  // listed on the page but never appears in the manifest.
  assert.ok(shown.includes("file:///*"), "the file URL switch is explained");
  for (const host of asked) {
    assert.ok(shown.includes(host), `${host} is explained on the page`);
  }
  assert.equal(shown.length, asked.length + 1, "no site is listed that the extension does not request");
});

test("the saved copy is built from the page and drops its own buttons", () => {
  const js = read("sync-guide.js");
  assert.match(js, /guide\.cloneNode\(true\)/, "the download mirrors what is on screen");
  assert.match(js, /querySelectorAll\("button"\)[\s\S]{0,60}remove\(\)/);
  assert.match(js, /download = "lantern-ledger-account-sync-setup\.html"/);
  // Inlined styles: the file has to read correctly with the planner absent.
  assert.match(js, /<style>/);
  assert.doesNotMatch(js, /<link rel="stylesheet"/);
});

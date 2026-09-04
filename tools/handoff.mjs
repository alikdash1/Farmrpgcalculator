#!/usr/bin/env node
// Shared guard rail for the two agents working on this repo (Claude Code and
// Codex). The point is that neither has to spend usage re-checking the other's
// basics: run `node tools/handoff.mjs check` and the objective failures that
// have actually broken this app before are caught in under a second.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const html = read("index.html");

// Every browser-loaded script, in load order.
const localScripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const localStyles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const bare = (ref) => ref.split("?")[0];

function fail(list, title, hint) {
  if (!list.length) return 0;
  console.log(`\n  ${title}`);
  for (const line of list.slice(0, 12)) console.log(`    - ${line}`);
  if (list.length > 12) console.log(`    … and ${list.length - 12} more`);
  if (hint) console.log(`    ${hint}`);
  return list.length;
}

function check() {
  let problems = 0;

  // 1. Cache busting. Without it the user reloads and sees the old file, then
  //    reports the change "did not work".
  problems += fail(
    [...localScripts, ...localStyles].filter((ref) => !/^https?:/.test(ref) && !ref.includes("?v=")),
    "Loaded without a ?v= cache buster",
    "Add ?v=YYYYMMDD-N, and bump it whenever you edit the file.",
  );

  // 2. The app killer: a listener bound to an element that no longer exists
  //    throws at load and takes down every tab, not just its own.
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const missing = [];
  const dead = [];
  for (const ref of localScripts.map(bare)) {
    if (/^https?:/.test(ref) || !existsSync(path.join(root, ref))) continue;
    const js = read(ref);
    for (const m of js.matchAll(/(?:getElementById|\$)\(\s*"([A-Za-z][\w-]*)"\s*\)\s*\./g)) {
      const id = m[1];
      if (ids.has(id)) continue;
      // `if ($("id")) $("id").on…` is dead code, not a crash. Say so quietly.
      const guarded = js.includes(`if ($("${id}"))`)
        || js.includes(`if (document.getElementById("${id}"))`)
        || js.includes(`"${id}")?.`);
      (guarded ? dead : missing).push(`${ref}: #${id} is not in index.html`);
    }
  }
  problems += fail(missing, "Reference to an element that does not exist", "This throws on load and breaks the whole app.");
  fail(dead, "Guarded reference to an element that is gone (not fatal, just dead code)");

  // 3. This site runs from file://. Anything needing a server is wrong here.
  const serverOnly = [];
  for (const ref of localScripts.map(bare)) {
    if (/^https?:/.test(ref) || !existsSync(path.join(root, ref))) continue;
    const js = read(ref);
    if (/\bfetch\s*\(/.test(js)) serverOnly.push(`${ref}: uses fetch()`);
    if (/^\s*(import|export)\s/m.test(js)) serverOnly.push(`${ref}: uses ES module syntax`);
  }
  problems += fail(serverOnly, "Will not work from file://", "No fetch, no modules — the user opens index.html by double-clicking it.");

  // 4. --paper is a surface colour. Used as text on the dark theme it renders
  //    dark-on-dark and the text silently disappears.
  const invisible = [];
  for (const sheet of localStyles.map(bare)) {
    if (!existsSync(path.join(root, sheet))) continue;
    for (const m of read(sheet).matchAll(/(^|[;{])\s*color:\s*var\(--paper2?\)/g)) {
      invisible.push(`${sheet}: color: var(--paper) is invisible on the dark theme`);
    }
  }
  fail(invisible, "Text painted in a surface colour — check it on screen", "Use var(--text) or var(--muted).");

  // 5. Edited a loaded file but left its ?v= alone.
  let stale = [];
  try {
    const changed = execSync("git diff --name-only HEAD", { cwd: root }).toString().trim().split("\n").filter(Boolean);
    const versionChanged = execSync("git diff -U0 HEAD -- index.html", { cwd: root }).toString();
    stale = changed.filter((file) => {
      const ref = [...localScripts, ...localStyles].find((r) => bare(r) === file);
      if (!ref) return false;
      return !versionChanged.includes(bare(ref));
    }).map((file) => `${file} changed but its ?v= in index.html did not`);
  } catch { /* not a git checkout, or nothing staged — not a failure */ }
  problems += fail(stale, "Edited without bumping the cache buster");

  return problems;
}

function status() {
  const git = (cmd) => { try { return execSync(cmd, { cwd: root }).toString().trim(); } catch { return ""; } };
  console.log("Branch      ", git("git rev-parse --abbrev-ref HEAD"));
  console.log("Last commit ", git("git log --oneline -1"));
  const dirty = git("git status --short");
  console.log("Uncommitted ", dirty ? `\n${dirty}` : "nothing");
  const others = git("git branch --format=%(refname:short)").split("\n").filter((b) => b && b !== git("git rev-parse --abbrev-ref HEAD"));
  console.log("Other work  ", others.length ? others.join(", ") : "none");
  const tests = readdirSync(path.join(root, "tests")).filter((f) => f.endsWith(".mjs"));
  console.log("Test files  ", tests.length);
  if (existsSync(path.join(root, "handoff/STATE.md"))) {
    console.log("\n--- handoff/STATE.md ---");
    console.log(read("handoff/STATE.md").trim());
  }
}

const command = process.argv[2] || "check";
if (command === "status") {
  status();
} else if (command === "check") {
  const problems = check();
  if (problems) {
    console.log(`\n${problems} problem${problems === 1 ? "" : "s"}. Fix these before handing the work over.\n`);
    process.exit(1);
  }
  console.log("check: clean — cache busters, element references, file:// rules, contrast.");
} else {
  console.log("usage: node tools/handoff.mjs [check|status]");
  process.exit(1);
}

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

// The shared gate between the two agents working on this repo. If it fails,
// one of the failures that has actually shipped here is back.
test("tools/handoff.mjs check passes on the current tree", () => {
  const out = execFileSync("node", ["tools/handoff.mjs", "check"], { cwd: root }).toString();
  assert.match(out, /check: clean/);
});

test("the working agreement points at the files it promises", () => {
  const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
  for (const file of ["CLAUDE.md", "handoff/STATE.md", "handoff/TASKS.md", "tools/handoff.mjs"]) {
    assert.ok(agents.includes(file), `AGENTS.md names ${file}`);
    readFileSync(path.join(root, file), "utf8"); // throws if it is not there
  }
});

// Screenshot pages of the planner with a real browser, at an exact size.
//
//   node tools/screenshot.mjs http://localhost:8777 home places tower
//   node tools/screenshot.mjs http://localhost:8777 places --width 390 --height 844
//
// Writes docs/screenshots/<view>.png. Drives Edge or Chrome over the DevTools
// protocol rather than using their --screenshot switch, which miscounts the
// window in the new headless mode and shifts the page under the sticky header.
// Needs Node 22 or later for the built-in WebSocket; nothing to install.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d; };
const width = flag("--width", 1440);
const height = flag("--height", 900);
const base = (argv[0] || "").replace(/\/+$/, "");
const views = argv.slice(1).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
if (!base || !views.length) {
  console.log("Usage: node tools/screenshot.mjs <url> <view> [view ...] [--width 1440 --height 900]");
  process.exit(1);
}

const browsers = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const exe = browsers.find((p) => fs.existsSync(p));
if (!exe) { console.log("No Edge or Chrome found. Set BROWSER to one."); process.exit(1); }

const port = 9300 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "frpg-shot-"));
const proc = spawn(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error("The browser did not open its DevTools port.");
}

let ws;
let seq = 0;
const waiting = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = (seq += 1);
  waiting.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

try {
  ws = new WebSocket(await target());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const w = msg.id && waiting.get(msg.id);
    if (!w) return;
    waiting.delete(msg.id);
    if (msg.error) w.reject(new Error(msg.error.message)); else w.resolve(msg.result);
  };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const out = path.join(root, "docs", "screenshots");
  fs.mkdirSync(out, { recursive: true });
  for (const view of views) {
    const url = view === "home" ? base + "/" : `${base}/#${view}`;
    await send("Page.navigate", { url });
    await sleep(1200);
    // Every picture on screen must have finished, or failed, before the shot:
    // a half-loaded image renders as a broken-picture box. Lazy images are
    // told to load now. Item art is hotlinked, so cap the wait.
    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `Promise.race([
        new Promise((r) => setTimeout(r, 8000)),
        Promise.all([...document.images].map((img) => {
          img.loading = "eager";
          return img.complete ? 0 : new Promise((r) => { img.onload = img.onerror = r; });
        })),
      ])`,
    });
    await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const file = path.join(out, view + ".png");
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(`${view} -> docs/screenshots/${view}.png`);
  }
} finally {
  try { ws && ws.close(); } catch { /* closing */ }
  proc.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold it */ }
}

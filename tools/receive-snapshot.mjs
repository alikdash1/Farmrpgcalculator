// Catch one account snapshot sent from the planner page in your own browser,
// and save it where every tool looks for it.
//
//   node tools/receive-snapshot.mjs          waits on http://127.0.0.1:8791 for one POST
//
// Then, on the planner page (alikdash1.github.io/Farmrpgcalculator or a local
// copy), run the snippet in docs/PULL_LIVE_ACCOUNT.md. It reads the snapshot the
// extension left in that page's localStorage, compacts it to
// { capturedAt, towerFloor, masteries: {name: count}, inventory: {name: qty} }
// and posts it here. It is written to raw/account-captures/live-<date>.json,
// which is gitignored - account data never reaches the public repo.
//
// Listens on 127.0.0.1 only, accepts one request, then exits.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "raw", "account-captures");
const PORT = Number(process.env.PORT || 8791);
const LIMIT = 8 * 1024 * 1024;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Chrome and Brave ask this before a public page may talk to localhost.
  "Access-Control-Allow-Private-Network": "true",
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
  if (req.method !== "POST") { res.writeHead(405, headers); res.end("POST only"); return; }
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > LIMIT) { res.writeHead(413, headers); res.end("too big"); req.destroy(); }
  });
  req.on("end", () => {
    let data;
    try { data = JSON.parse(body); } catch { res.writeHead(400, headers); res.end("not JSON"); return; }
    const ok = data && typeof data.masteries === "object" && typeof data.inventory === "object";
    if (!ok) { res.writeHead(400, headers); res.end("expected masteries and inventory"); return; }
    fs.mkdirSync(outDir, { recursive: true });
    const day = String(data.capturedAt || new Date().toISOString()).slice(0, 10);
    const file = path.join(outDir, `live-${day}.json`);
    fs.writeFileSync(file, JSON.stringify(data));
    res.writeHead(200, headers);
    res.end("saved");
    console.log(`Saved ${Object.keys(data.masteries).length} masteries and ${Object.keys(data.inventory).length} inventory rows to ${path.relative(root, file)}`);
    server.close();
  });
});
server.listen(PORT, "127.0.0.1", () => console.log(`Waiting for one snapshot on http://127.0.0.1:${PORT} ...`));
setTimeout(() => { console.log("No snapshot arrived within 5 minutes."); process.exit(1); }, 5 * 60 * 1000).unref();

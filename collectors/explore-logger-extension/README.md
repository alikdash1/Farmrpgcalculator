# Farm RPG Exploration Logger

A read-only local Chromium extension that records responses from exploration actions the player manually triggers. It never clicks, sends game requests, reads cookies, or uploads data.

## Install once

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Choose this folder: `explore-logger-extension`.
5. Refresh Farm RPG.

## Record one location

1. Open the exploring location.
2. Enter its name in the small **Explore Logger** panel.
3. Clear/record Hide and consumable counters as usual.
4. Click **Start clean run**.
5. Perform the normal 100-AP test manually.
6. Click **Stop**, then **Export JSON**.
7. Send the downloaded `farmrpg-exploration-log-*.json` file to Codex.

The response log can reveal the full generated drop vector even when inventory items are capped or Craftworks consumes them. This depends on what the Farm RPG endpoint returns, so the first exported file must be inspected before relying on it.

## Privacy

Only same-host Farm RPG responses observed while recording are saved. Request bodies, headers, cookies, and credentials are not captured. Response text receives best-effort secret redaction and stays in local extension storage until cleared.

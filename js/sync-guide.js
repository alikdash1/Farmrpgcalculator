(function () {
  const guide = document.getElementById("syncGuide");
  const save = document.getElementById("saveGuide");
  const jump = document.getElementById("goGuide");
  if (!guide) return;

  // The website address the extension may talk to. It must match
  // collectors/account-sync-extension/manifest.json, which lists exactly these.
  const KNOWN_SITES = ["https://alikdash1.github.io/Farmrpgcalculator/"];
  const DOWNLOAD = KNOWN_SITES[0] + "downloads/farm-rpg-account-sync.zip";

  // Show the address this planner was actually opened from, so nobody reads the
  // row as "link it to someone else's page". Opened from disk or localhost, the
  // public site stays listed, because those have rows of their own.
  const onWeb = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const siteRow = guide.querySelector("[data-site-row]");
  if (onWeb && siteRow) {
    const here = location.origin + location.pathname.replace(/[^/]*$/, "");
    siteRow.querySelector("code").textContent = here + "*";
    siteRow.querySelector("span").textContent = "this planner — the address in your address bar right now. Only this one site, nothing else on the same host";
    if (!KNOWN_SITES.includes(here)) {
      // A copy hosted somewhere else. The extension cannot reach it until its
      // manifest names this address - say exactly what to change.
      const note = document.createElement("p");
      note.className = "sync-note";
      note.innerHTML = "This copy of the planner is at an address the extension does not know yet. " +
        "Open the extension's <code>manifest.json</code>, add <code></code> to <code>host_permissions</code> " +
        "and to the second <code>content_scripts</code> entry's <code>matches</code>, then press the reload arrow on its card.";
      note.querySelectorAll("code")[1].textContent = here + "*";
      siteRow.parentElement.after(note);
    }
  }

  if (jump) {
    jump.addEventListener("click", () => {
      guide.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // The saved copy is built from the guide that is on screen, so the file can
  // never drift from what the page says. Styles are inlined because the point
  // of the download is to still be readable with the planner nowhere in sight.
  function buildFile() {
    const body = guide.cloneNode(true);
    body.querySelectorAll("button").forEach((node) => node.remove());
    body.querySelectorAll("details").forEach((node) => { node.open = true; });
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Farm RPG Calculator — account sync setup</title>
<style>
:root{color-scheme:dark}
body{margin:0;padding:44px 22px 80px;background:#151619;color:#e8eae7;
  font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{width:min(760px,100%);margin:0 auto}
h1{font-size:1.5rem;margin:0 0 4px}
h2{font-size:1.25rem;margin:0 0 6px}
h3{font-size:1.02rem;margin:3px 0 8px}
p{margin:0 0 8px}
.eyebrow{display:block;color:#9aa09a;font-size:.72rem;letter-spacing:.09em;text-transform:uppercase}
.sync-guide-head{padding-bottom:14px;margin-bottom:24px;border-bottom:1px solid #2e3036}
.sync-guide-head p{color:#9aa09a}
.sync-steps{list-style:none;counter-reset:sync;margin:0;padding:0;display:grid;gap:26px}
.sync-steps>li{counter-increment:sync;display:grid;grid-template-columns:34px minmax(0,1fr);gap:0 16px}
.sync-steps>li::before{content:counter(sync);grid-row:1/span 99;width:30px;height:30px;display:grid;
  place-items:center;border:1px solid #2e3036;border-radius:50%;color:#5cc08d}
code{padding:1px 5px;border:1px solid #2e3036;border-radius:4px;background:#1c1d21;font-size:.86em;overflow-wrap:anywhere}
code.path{display:inline-block;padding:5px 9px}
.sync-note{color:#9aa09a}
.sync-sites{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:5px}
.sync-sites li{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.sync-sites span{color:#9aa09a;font-size:.84rem}
.sync-guide-split{display:grid;gap:22px;margin-top:30px;padding-top:24px;border-top:1px solid #2e3036}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #2e3036;color:#9aa09a;font-size:.84rem}
</style></head>
<body><main>${body.innerHTML}
<footer>Saved from Farm RPG Calculator on ${new Date().toLocaleDateString()}. Download the extension from
<code>${DOWNLOAD}</code>.</footer>
</main></body></html>`;
  }

  if (save) {
    save.addEventListener("click", () => {
      const blob = new Blob([buildFile()], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "farm-rpg-calculator-account-sync-setup.html";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }
})();

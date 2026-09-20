(function () {
  // Mega Masteries between where you stand and a floor you name — T300 by
  // default. One card each, big percentage first, because this page exists to
  // be screenshotted and read at a glance.
  const grid = document.getElementById("mmGrid");
  const summary = document.getElementById("mmSummary");
  const floorInput = document.getElementById("mmFloor");
  if (!grid || !summary || !floorInput) return;

  const ART = window.FRPG_ITEM_ART_HELPER;
  const MM_GOAL = 1000000;
  const DUPLICATE_YIELD = 1.45;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const esc = (text) => String(text == null ? "" : text).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.00$/, "") + "m" : n >= 1000 ? Math.round(n / 1000) + "k" : String(Math.round(n)));

  function art(name) {
    const url = ART && ART.urlFor ? ART.urlFor(name) : "";
    return url ? `<img src="${esc(url)}" alt="" width="40" height="40" loading="lazy">` : `<span class="mm-noart">${esc(name.slice(0, 1))}</span>`;
  }

  function rows(topFloor) {
    const needs = window.FRPG_TOWER_NEEDS || [];
    return needs
      .filter((row) => row.tier === "mm" && row.floor <= topFloor && !row.complete)
      .sort((a, b) => a.floor - b.floor || b.current - a.current || a.name.localeCompare(b.name));
  }

  function render() {
    const topFloor = Number(floorInput.value) || 300;
    const list = rows(topFloor);
    document.querySelectorAll("[data-mm-floor]").forEach((node) => { node.textContent = "T" + topFloor; });

    if (!list.length) {
      summary.innerHTML = "";
      grid.innerHTML = `<p class="mm-none">No Mega Mastery is outstanding up to T${topFloor}.</p>`;
      return;
    }

    const left = list.reduce((sum, row) => sum + row.remaining, 0);
    const held = list.reduce((sum, row) => sum + Math.min(row.current, MM_GOAL), 0);
    const done = held / (list.length * MM_GOAL) * 100;
    summary.innerHTML = [
      ["Masteries left", fmt(list.length), `of the Mega Masteries up to T${topFloor}`],
      ["Mastery to go", short(left), `${done.toFixed(1)}% of the way through these`],
      ["Items to make", short(left / DUPLICATE_YIELD), "at your 1.45× duplicate chance"],
      ["Nearest floor", "T" + list[0].floor, `${list.filter((row) => row.floor === list[0].floor).length} left on it`],
    ].map(([label, value, note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join("");

    grid.innerHTML = list.map((row) => {
      const percent = Math.min(100, row.current / MM_GOAL * 100);
      return `<article class="mm-card">
        <header>${art(row.name)}<div><b>${esc(row.name)}</b><small>T${row.floor}</small></div><em>${percent.toFixed(1)}%</em></header>
        <div class="mm-bar"><i style="width:${percent.toFixed(2)}%"></i></div>
        <footer><span>${fmt(row.current)} / 1,000,000</span><b>${short(row.remaining)} left</b></footer>
      </article>`;
    }).join("");
  }

  floorInput.addEventListener("change", render);
  floorInput.addEventListener("input", render);
  window.addEventListener("load", render);
  window.FRPG_renderMM = render;
  render();
})();

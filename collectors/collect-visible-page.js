(() => {
  const capturedAt = new Date().toISOString();
  const title = document.title || "Farm RPG page";
  const visibleText = String(document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
  const payload = {
    schema: "farmrpg-visible-page-v1",
    capturedAt,
    title,
    url: location.href,
    visibleText,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `farmrpg-${safeTitle}-${capturedAt.slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  console.log(`Farm RPG export saved: ${visibleText.length.toLocaleString()} visible characters. Review the JSON before sharing it.`);
})();


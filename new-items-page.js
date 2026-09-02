(() => {
  "use strict";

  const data = window.FRPG_NEW_ITEMS;
  const intel = window.FRPG_LOCATION_INTEL || { itemSources: {}, locations: {}, mining: { pickaxes: {}, bags: {} } };
  const root = document.getElementById("newItemsGroups");
  if (!data || !root) return;

  const search = document.getElementById("newItemSearch");
  const count = document.getElementById("newItemCount");
  const stats = document.getElementById("newItemStats");
  const filterButtons = [...document.querySelectorAll("[data-ni-filter]")];
  const releaseByName = new Map(data.items.map(item => [item.name, item]));
  const baseItems = new Map((window.FRPG_DATA?.items?.items || []).map(item => [item.name, item]));
  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  let activeFilter = "craft";
  let query = "";

  const groupMeta = {
    craft: { kicker: "Workshop", title: "40 New Crafts", copy: "Recipes, sources, and the items each craft unlocks next." },
    mining: { kicker: "Mining", title: "Mining Items & Equipment", copy: "Mine drops, bags, pickaxes, and support items." },
    other: { kicker: "Other", title: "Other New Items", copy: "Release items that sit outside the Mining chain." }
  };

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const absoluteArt = value => !value ? "" : value.startsWith("http") || value.startsWith("assets/") ? value : `https://farmrpg.com${value}`;

  function artFor(name) {
    const item = releaseByName.get(name) || data.connected[name] || baseItems.get(name);
    return absoluteArt(item?.image || item?.img || "");
  }

  function imageMarkup(item, className = "", size = 64) {
    return `<img class="${className}" src="${escapeHtml(absoluteArt(item.image || item.img))}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" onerror="this.classList.add('ni-image-missing');this.removeAttribute('src')">`;
  }

  function fallbackSource(name, fallbackSource) {
    const release = releaseByName.get(name);
    const connected = data.connected[name];
    const source = release?.sources?.[0] || connected?.sources?.[0];
    if (source) return source;
    if (fallbackSource && fallbackSource !== "unknown") return { type: fallbackSource, label: fallbackSource === "workshop" ? "Workshop" : fallbackSource, confidence: "partial" };
    return { type: "unknown", label: "Source not listed yet", confidence: "unknown" };
  }

  function locationSources(name) {
    return [...(intel.itemSources?.[name] || [])].sort((a, b) => {
      const rank = { mining: 0, fishing: 1, explore: 2 };
      const typeDiff = (rank[a.type] ?? 9) - (rank[b.type] ?? 9);
      if (typeDiff) return typeDiff;
      if (a.rate == null) return 0;
      if (b.rate == null) return -1;
      return a.rate - b.rate;
    });
  }

  function sourceMarkup(name, fallback, compact = false) {
    const places = locationSources(name);
    if (places.length) {
      const place = places[0];
      const extra = places.length > 1 ? ` +${places.length - 1}` : "";
      const rate = place.rate == null ? "" : ` · ~${number.format(place.rate)} ${place.rateUnit}`;
      return `<span class="ni-place-source${compact ? " compact" : ""}" title="${escapeHtml(`${place.location}${rate}${extra}`)}">
        <img src="${escapeHtml(place.image)}" alt="" width="28" height="28" loading="lazy">
        <span><b>${escapeHtml(place.location)}${extra}</b><small>${escapeHtml(place.type === "mining" ? "Mining" : place.type === "fishing" ? `Fishing${rate}` : `Explore${rate}`)}</small></span>
      </span>`;
    }
    const source = fallbackSource(name, fallback);
    return `<span class="ni-text-source ${source.confidence === "unknown" ? "unknown" : ""}">${escapeHtml(source.label)}</span>`;
  }

  function ingredientMarkup(ingredient) {
    const linked = releaseByName.get(ingredient.name) || data.connected[ingredient.name];
    const isJump = releaseByName.has(ingredient.name);
    const tag = isJump ? "button" : "a";
    const action = isJump
      ? `type="button" data-ni-jump="${escapeHtml(ingredient.name)}"`
      : `href="${escapeHtml(linked?.buddyUrl || `https://buddy.farm/i/${slug(ingredient.name)}/`)}" target="_blank" rel="noreferrer"`;
    return `<${tag} class="ni-ingredient" ${action}>
      <span class="ni-ingredient-art-wrap">${imageMarkup(ingredient, "ni-ingredient-art", 36)}</span>
      <span class="ni-ingredient-copy"><b><em>${escapeHtml(ingredient.quantity)}×</em> ${escapeHtml(ingredient.name)}</b>${sourceMarkup(ingredient.name, ingredient.source, true)}</span>
      <span class="ni-link-mark" aria-hidden="true">${isJump ? "→" : "↗"}</span>
    </${tag}>`;
  }

  function usedInMarkup(item) {
    if (!item.usedIn?.length) return "";
    return `<div class="ni-used"><span class="ni-section-label">Used Next In</span><div class="ni-next-list">${item.usedIn.map(next => `<button type="button" class="ni-next-item" data-ni-jump="${escapeHtml(next.name)}">${imageMarkup(next, "ni-next-art", 28)}<span><b>${escapeHtml(next.name)}</b><small>${escapeHtml(next.quantity)}× ${escapeHtml(item.name)}</small></span></button>`).join("")}</div></div>`;
  }

  function equipmentMarkup(item) {
    const pickaxe = intel.mining?.pickaxes?.[item.name];
    const bag = intel.mining?.bags?.[item.name];
    const blocks = [];
    if (pickaxe?.usedAt) {
      const location = intel.locations?.[`mining:${pickaxe.usedAt}`];
      blocks.push(`<div class="ni-equipment-note"><span>Used At</span>${location ? `<img src="${escapeHtml(location.image)}" alt="" width="32" height="32">` : ""}<strong>${escapeHtml(pickaxe.usedAt)}</strong></div>`);
    }
    if (bag) {
      const contents = bag.outputs.map(output => `<span class="ni-bag-output"><img src="${escapeHtml(artFor(output.name))}" alt="" width="24" height="24"><b>${escapeHtml(output.name)}</b><small>${output.min === output.max ? number.format(output.min) : `${number.format(output.min)}–${number.format(output.max)}`}</small></span>`).join("");
      blocks.push(`<div class="ni-bag"><span class="ni-section-label">Bag Contents</span><div>${contents}</div></div>`);
    }
    return blocks.join("");
  }

  function cardMarkup(item) {
    const primary = item.sources?.[0] || { label: "Source not listed yet", confidence: "unknown" };
    const recipe = item.recipe?.length
      ? `<div class="ni-recipe"><span class="ni-section-label">Recipe</span><div class="ni-ingredients">${item.recipe.map(ingredientMarkup).join("")}</div></div>`
      : `<div class="ni-empty-recipe"><span>No Workshop Recipe</span><small>Drop, reward, container, or support item.</small></div>`;
    return `<article class="ni-card" id="ni-${item.id}" data-ni-name="${escapeHtml(item.name)}">
      <header class="ni-item-head"><div class="ni-art-shell">${imageMarkup(item, "ni-item-art", 64)}</div><div class="ni-item-title"><span>#${escapeHtml(item.id)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "")}</p></div><a class="ni-buddy-link" href="${escapeHtml(item.buddyUrl)}" target="_blank" rel="noreferrer">Buddy <span aria-hidden="true">↗</span></a></header>
      <div class="ni-origin"><span>Source</span><strong>${sourceMarkup(item.name, primary.type || primary.label)}</strong></div>
      ${equipmentMarkup(item)}${recipe}${usedInMarkup(item)}
    </article>`;
  }

  function matches(item) {
    if (activeFilter !== "all" && item.group !== activeFilter) return false;
    if (!query) return true;
    return [item.name, item.description, ...(item.recipe || []).map(row => row.name), ...(item.usedIn || []).map(row => row.name), ...locationSources(item.name).map(row => row.location)].join(" ").toLowerCase().includes(query);
  }

  function render() {
    const visible = data.items.filter(matches);
    count.textContent = `${visible.length} ${visible.length === 1 ? "item" : "items"}`;
    const grouped = ["craft", "mining", "other"].map(group => ({ group, items: visible.filter(item => item.group === group) })).filter(section => section.items.length);
    root.innerHTML = grouped.length ? grouped.map(section => {
      const meta = groupMeta[section.group];
      return `<section class="ni-group" data-ni-group="${section.group}"><header class="ni-group-head"><div><span>${meta.kicker}</span><h2>${meta.title}</h2><p>${meta.copy}</p></div><strong>${section.items.length}</strong></header><div class="ni-grid">${section.items.map(cardMarkup).join("")}</div></section>`;
    }).join("") : `<div class="ni-no-results"><strong>No Matching Item</strong><span>Search by item, ingredient, or location.</span></div>`;
  }

  function setFilter(filter) {
    activeFilter = filter;
    filterButtons.forEach(button => {
      const selected = button.dataset.niFilter === filter;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    render();
  }

  function jumpToItem(name) {
    query = "";
    search.value = "";
    setFilter("all");
    requestAnimationFrame(() => {
      const item = releaseByName.get(name);
      const card = item && document.getElementById(`ni-${item.id}`);
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.remove("ni-pulse");
      requestAnimationFrame(() => card.classList.add("ni-pulse"));
    });
  }

  stats.innerHTML = `<div><strong>${data.meta.releaseItems}</strong><span>Mapped Items</span></div><div><strong>${data.meta.newCrafts}</strong><span>New Crafts</span></div><div><strong>${Object.values(intel.locations || {}).length}</strong><span>Mapped Locations</span></div>`;
  filterButtons.forEach(button => button.addEventListener("click", () => setFilter(button.dataset.niFilter)));
  search.addEventListener("input", event => { query = event.target.value.trim().toLowerCase(); if (query && activeFilter !== "all") setFilter("all"); else render(); });
  root.addEventListener("click", event => { const trigger = event.target.closest("[data-ni-jump]"); if (trigger) jumpToItem(trigger.dataset.niJump); });
  setFilter("craft");
})();


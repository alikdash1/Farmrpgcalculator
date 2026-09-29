// Whose farm is this page showing?
//
// data/personal-tower.js, data/personal-quests.js and parts of
// data/player-facts.js are one player's real account - the author's. They make
// the page useful on a first visit, but they must never be blended into anyone
// else's numbers. Before this switch existed, a visitor's captures were laid on
// top of the author's: the Tower floor was the higher of the two, masteries they
// had not captured kept the author's counts, the planner hid quests the author
// had finished, and every visitor was credited the author's chests.
//
// So, three modes, decided once before any page script reads those globals:
//
//   example  Nothing of the visitor's is here yet. Show the author's farm, and
//            say plainly that it is an example.
//   visitor  The visitor has brought their own account (extension or file).
//            The author's account files are replaced with empty ones, so every
//            number on the page is theirs or unknown - never borrowed.
//   owner    The author's own browser. One click on the Account page, stored
//            locally, keeps the bundled files as the real account.
//
// Must load after data/*.js and before every other script in js/.
(function () {
  const OWNER_KEY = "frpg_bundled_account_v1";
  const SNAPSHOT_KEY = "frpg_account_snapshot_v1";

  let isOwner = false;
  let hasOwn = false;
  try {
    isOwner = localStorage.getItem(OWNER_KEY) === "mine";
    hasOwn = !!localStorage.getItem(SNAPSHOT_KEY);
  } catch (error) {
    // Storage blocked: nothing of the visitor's can be here, so it is an example.
  }

  const mode = isOwner ? "owner" : hasOwn ? "visitor" : "example";
  window.FRPG_ACCOUNT_MODE = mode;

  if (mode === "visitor") {
    const tower = window.FRPG_PERSONAL_TOWER || {};
    window.FRPG_PERSONAL_TOWER = {
      schema: tower.schema,
      masteries: {},
      startFloor: 0,
      towerAtCapture: 0,
      goalFloor: tower.goalFloor,
      // Not authoritative: every mastery row the visitor captures is applied.
      authoritativeMasteries: false,
      capturedAt: null,
    };
    window.FRPG_PERSONAL_QUESTS = { completed: [] };
    // Game rules stay (the Temple, the Wishing Well cap). What only describes
    // the author's farm goes.
    const facts = window.FRPG_PLAYER_FACTS || {};
    window.FRPG_PLAYER_FACTS = Object.assign({}, facts, {
      containersHeld: {},
      inventoryCap: null,
      farm: {},
    });
  }

  // Switching modes means re-reading those globals, which only a reload does.
  window.FRPG_ACCOUNT_SOURCE = {
    mode,
    // Called when the visitor's own account arrives or is forgotten.
    accountChanged(hasAccount) {
      const next = isOwner ? "owner" : hasAccount ? "visitor" : "example";
      if (next !== mode) location.reload();
    },
    setOwner(mine) {
      try {
        if (mine) localStorage.setItem(OWNER_KEY, "mine");
        else localStorage.removeItem(OWNER_KEY);
      } catch (error) {
        return;
      }
      location.reload();
    },
  };

  // The author's checkbox on the Account page.
  const wireOwner = () => {
    const box = document.getElementById("ownerFarm");
    if (!box) return;
    box.checked = isOwner;
    box.addEventListener("change", () => window.FRPG_ACCOUNT_SOURCE.setOwner(box.checked));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireOwner);
  else wireOwner();

  if (mode !== "example") return;
  const show = () => {
    const main = document.querySelector("main") || document.body;
    if (!main || document.getElementById("exampleFarm")) return;
    const note = document.createElement("aside");
    note.id = "exampleFarm";
    note.className = "example-farm";
    note.innerHTML = "<p><b>You are looking at an example farm.</b> " +
      "Every count on this page belongs to the author until you bring your own.</p>" +
      '<a class="quiet-button" href="#account">Use my farm</a>';
    main.prepend(note);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show);
  else show();
})();

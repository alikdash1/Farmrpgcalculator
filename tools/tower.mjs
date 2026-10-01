// Every Tower floor the planner knows, in one list - the same two sources the
// Tower page merges.
//
// data/tower-floors.js only covers T300-T350. Floors below that come from the
// mastery records in data/data.js (FRPG_PROGRESSION.items[name].mastery
// .towerRequirement), and those are all Mega Masteries. For weeks every tool
// read only the first list, so the floors the owner was actually standing on -
// T289 to T299, with Fancy Guitar, Fancy Drum, Red Dye and Red Trunk - did not
// exist to any plan. Use this instead of reading FRPG_TOWER_FLOORS directly.
//
// Needs data/data.js and data/tower-floors.js loaded into the window.

//
// Floors below the one the player stands on are cleared in game whatever their
// mastery numbers say - the Tower page treats them that way, so this does too.
// A towerRequirement of 0 means "no floor", not floor zero.
export function currentFloor(W) {
  const tower = W.FRPG_PERSONAL_TOWER || {};
  return Number(tower.towerAtCapture || tower.startFloor) || 0;
}

export function towerFloors(W, from = currentFloor(W)) {
  const wiki = ((W.FRPG_TOWER_FLOORS || {}).floors) || [];
  const have = new Set(wiki.map((row) => row.floor));
  const extra = new Map();
  const items = ((W.FRPG_PROGRESSION || {}).items) || {};
  for (const [name, row] of Object.entries(items)) {
    const floor = Number(row && row.mastery && row.mastery.towerRequirement);
    if (!Number.isFinite(floor) || floor < 1 || have.has(floor)) continue;
    if (!extra.has(floor)) extra.set(floor, { floor, gms: [], mms: [] });
    extra.get(floor).mms.push({ name });
  }
  return [...wiki, ...extra.values()]
    .filter((row) => row.floor >= from)
    .sort((a, b) => a.floor - b.floor);
}

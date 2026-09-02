import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESEARCH = process.argv[2] || "C:/Users/user/Desktop/FarmRPG Calculator Research";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));

function parseCells(path) {
  const rows = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cell = JSON.parse(line);
    const match = /^([A-Z]+)(\d+)$/.exec(cell.cell);
    if (!match) continue;
    const row = Number(match[2]);
    if (!rows.has(row)) rows.set(row, {});
    rows.get(row)[match[1]] = cell.value;
  }
  return rows;
}

const itemsFile = join(ROOT, "data", "items.json");
const recipesFile = join(ROOT, "data", "recipes.json");
const items = readJson(itemsFile).items;
const recipes = readJson(recipesFile).craft;
const byId = new Map(items.map((item) => [item.id, item]));
const facts = {};
const ensure = (name) => facts[name] ||= {
  questSteps: 0,
  questLines: [],
  questTotal: 0,
  maxQuestAsk: 0,
  usedInCrafts: 0,
  mastery: null,
};

const usedIn = new Map();
for (const row of recipes) {
  if (!usedIn.has(row.reqId)) usedIn.set(row.reqId, new Set());
  usedIn.get(row.reqId).add(row.itemId);
}
for (const [id, outputs] of usedIn) {
  const item = byId.get(id);
  if (item) ensure(item.name).usedInCrafts = outputs.size;
}

const questPath = join(RESEARCH, "web", "raw", "questlines.json");
const questlines = readJson(questPath);
for (const [lineName, line] of Object.entries(questlines)) {
  for (const quest of line.quests || []) {
    for (const req of quest.requirements || []) {
      const fact = ensure(req.item);
      fact.questSteps += 1;
      fact.questTotal += Number(req.qty || 0);
      fact.maxQuestAsk = Math.max(fact.maxQuestAsk, Number(req.qty || 0));
      if (!fact.questLines.includes(lineName)) fact.questLines.push(lineName);
    }
  }
}

const masteryPath = join(
  RESEARCH,
  "workbooks",
  "FarmRPG Most Masteries (Last Update 27 May 2026)",
  "20251125 Ranked by Tower, MM.cells.jsonl"
);
for (const [row, cells] of parseCells(masteryPath)) {
  if (row === 1 || !cells.B) continue;
  const towerReq = Number(cells.I);
  ensure(String(cells.B)).mastery = {
    masteredPlayers: Number(cells.D) || 0,
    grandMasteredPlayers: Number(cells.E) || 0,
    megaMasteredPlayers: Number(cells.F) || 0,
    communityRating: Number(cells.G) || null,
    towerRequirement: Number.isFinite(towerReq) && towerReq > 0 ? towerReq : null,
    score: Number(cells.J) || 0,
    methods: [
      cells.L === "Yes" && "fish",
      cells.M === "Yes" && "craft",
      cells.N === "Yes" && "explore",
      cells.O === "Yes" && "farm",
      cells.P === "Yes" && "cook",
      cells.Q === "Yes" && "event",
    ].filter(Boolean),
  };
}

for (const fact of Object.values(facts)) {
  fact.questLines.sort();
  const masteryWeight = fact.mastery?.towerRequirement ? 4 : fact.mastery ? 2 : 0;
  const questWeight = Math.min(4, Math.log10(fact.questTotal + 1));
  const craftWeight = Math.min(3, Math.log10(fact.usedInCrafts + 1) * 2);
  fact.relevance = Math.round((masteryWeight + questWeight + craftWeight) * 10) / 10;
  fact.hoard = fact.questTotal >= 10000 || fact.maxQuestAsk >= 1000 || fact.relevance >= 7;
}

const progression = {
  _meta: {
    questSource: "farm-rpg-quest-tracker.pages.dev snapshot",
    questUpdated: "2026-08-15",
    masterySource: "FarmRPG Most Masteries community workbook",
    masterySheet: "20251125 Ranked by Tower, MM",
    generatedAt: new Date().toISOString(),
  },
  items: facts,
  routeRules: {
    "Glass Orb": {
      action: "farm",
      location: "Ember Lagoon",
      confidence: "community",
      why: "Fast direct drop with useful Emberstone, Ancient Coin and Large Chest 01 co-drops; avoids consuming Shimmer Stone for routine supply.",
      source: "Buddy's Almanac plus experienced-player strategy note",
    },
  },
  locationNotes: {
    "Ember Lagoon": {
      identity: "Glass Orb supply and long-term Emberstone mastery route",
      prizedCoDrops: ["Emberstone", "Ancient Coin", "Large Chest 01", "Prism Shard", "Magicite"],
    },
  },
};

writeFileSync(join(ROOT, "data", "progression.json"), JSON.stringify(progression));
console.log(`wrote data/progression.json (${(JSON.stringify(progression).length / 1024).toFixed(0)} KB, ${Object.keys(facts).length} item profiles)`);

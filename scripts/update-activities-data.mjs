#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const destination = join(root, "site", "data", "activities.json");
const SOURCE_REVISION = "cf9ecbe832e3a2a9e2d78d6579a082d968b68f17";
const SOURCE_REPOSITORY = "https://github.com/beliarance/palworld-kb";
const RAW_BASE = `https://raw.githubusercontent.com/beliarance/palworld-kb/${SOURCE_REVISION}/data`;

const EXPEDITION_NAMES_KO = Object.freeze({
  "Verdant Hollow": "초록빛 공동",
  "Secret Realm of the Forest": "숲의 비경",
  "Blazing Cavern": "작열하는 동굴",
  "Hidden Sanctum of the Desert": "사막의 숨겨진 성역",
  "Astral Frost Cavern": "별빛 서리 동굴",
  "Celestial Sakura Cavern": "천상의 벚꽃 동굴",
  "Dark Cave of Feybreak": "페이브레이크의 어두운 동굴",
  "Sunreach Isle": "선리치섬",
  "World Tree Subterrenean City Ruins": "세계수 지하 도시 유적",
  "Rayne Syndicate Smuggling Warehouse": "레인 밀렵단 밀수 창고",
  "Free Pal Alliance Illicit Trading Post": "팰 애호 단체 불법 교역소",
  "Eternal Pyre's Forbidden Market": "영원한 불꽃 동지회의 금단 시장",
  "PIDF Illegal Factory": "팰파고스섬 자경단 불법 공장",
  "PAL Genetic Research Laboratory": "팰 유전자 연구부대 연구소",
  "Moonflower's Secret Hideout": "달빛 꽃의 비밀 은신처",
  "Ancient Feybreak Ruins": "페이브레이크 고대 유적",
  "Sunreach Dragon Husk": "선리치 용의 잔해",
  "The World Tree's Forbidden Area": "세계수 금단 구역",
});

function stableId(prefix, value) {
  return `${prefix}:${String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

async function fetchJson(file) {
  const response = await fetch(`${RAW_BASE}/${file}`, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${file}`);
  return response.json();
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const [sourceBosses, sourceExpeditions, sourceLocations] = await Promise.all([
  fetchJson("bosses.json"), fetchJson("expeditions.json"), fetchJson("pal_locations.json"),
]);
if (sourceBosses.game_version !== "1.0" || sourceExpeditions.game_version !== "1.0" || sourceLocations.game_version !== "1.0") {
  throw new Error("activity source game version mismatch");
}

const bosses = [
  ...sourceBosses.tower_bosses.map((boss) => ({
    id: stableId("boss:tower", `${boss.order}-${boss.leader}-${boss.pal}`),
    type: "tower",
    order: boss.order,
    leader: boss.leader,
    pal: boss.pal,
    faction: boss.faction,
    level: boss.boss_pal_level,
    recommendedPlayerLevel: boss.recommended_player_level,
    elements: boss.elements,
    counterElements: boss.counter_elements,
    preliminary: Boolean(boss.preliminary),
  })),
  ...sourceBosses.raid_bosses.map((boss) => ({
    id: stableId("boss:raid", boss.pal), type: "raid", order: null, leader: null, pal: boss.pal, faction: null,
    level: Number(boss.notes?.match(/Lv\.?\s*(\d+)/i)?.[1]) || null, recommendedPlayerLevel: null,
    elements: boss.elements, counterElements: boss.counter_elements, preliminary: Boolean(boss.preliminary),
  })),
  ...sourceBosses.world_bosses.map((boss) => ({
    id: stableId("boss:world", boss.pal), type: "world", order: null, leader: null, pal: boss.pal, faction: null,
    level: Number(`${boss.notes} ${boss.arena}`.match(/Lv\.?\s*(\d+)/i)?.[1]) || null, recommendedPlayerLevel: null,
    elements: boss.elements, counterElements: boss.counter_elements, preliminary: Boolean(boss.preliminary),
  })),
];

const expeditions = sourceExpeditions.missions.map((mission) => ({
  id: stableId("expedition", mission.name),
  name: mission.name,
  nameKo: EXPEDITION_NAMES_KO[mission.name] ?? null,
  category: mission.category,
  durationMinutes: mission.duration_minutes,
  difficulty: mission.difficulty ?? null,
  requiredLevel: mission.required_level,
  requiredFirepower: mission.required_firepower,
  elementRequirement: mission.element_requirement ? { element: mission.element_requirement.element, palsRequired: mission.element_requirement.pals_required } : null,
  unlock: mission.unlock,
  rewards: mission.rewards.map((reward) => ({
    slot: reward.slot,
    item: reward.item,
    itemId: stableId("item", reward.item),
    quantity: reward.quantity,
    chancePct: reward.chance_pct,
    certainty: reward.chance_pct === 100 ? "guaranteed" : "chance",
  })),
  preliminary: Boolean(mission.preliminary),
}));
if (!expeditions.every(({ nameKo }) => nameKo)) throw new Error("Korean expedition label missing");

const fishingPals = Object.entries(sourceLocations.pals).flatMap(([pal, location]) => {
  const source = (location.other_sources ?? []).find((value) => /fishing/i.test(value));
  if (!source) return [];
  const levels = source.match(/Lv\.?\s*(\d+)(?:-(\d+))?/i);
  return [{ pal, minLevel: levels ? Number(levels[1]) : null, maxLevel: levels ? Number(levels[2] ?? levels[1]) : null, evidence: source }];
});

const checkedAt = new Date().toISOString();
const data = {
  schemaVersion: 1,
  gameVersion: "1.0",
  latestPatchApplied: "1.0.3",
  updatedAt: checkedAt,
  counts: { bosses: bosses.length, expeditions: expeditions.length, fishingPals: fishingPals.length },
  bosses,
  expeditions,
  fishing: {
    pals: fishingPals,
    baitItemIds: ["item:simple-bait", "item:high-quality-bait", "item:deluxe-bait", "item:alluring-bait", "item:beginner-bait", "item:sweet-bait", "item:lucky-bait", "item:quick-bait", "item:risky-bait"],
    rodItemIds: ["item:beginner-fishing-rod-chillet", "item:beginner-fishing-rod-gumoss", "item:intermediate-fishing-rod-cattiva", "item:intermediate-fishing-rod-croajiro", "item:advanced-fishing-rod-pengullet", "item:advanced-fishing-rod-depresso"],
    patch103: {
      itemId: "item:world-tree-holy-water",
      changesKo: ["세계수 원정 보상에 추가", "세계수 낚시 보상에 추가", "대형 낚시터 보상에 추가", "무게 1에서 0.1로 감소", "효과 지속 시간 연장"],
      sourceUrl: "https://steamcommunity.com/ogg/1623730/announcements/detail/695395286786244642",
      evidenceLevel: "official",
    },
  },
  provenance: {
    sourceId: "beliarance-palworld-kb-activities",
    sourceUrl: SOURCE_REPOSITORY,
    sourceRevision: SOURCE_REVISION,
    checkedAt,
    gameVersion: "1.0",
    evidenceLevel: "community-verified",
    license: null,
    sourceFiles: ["data/bosses.json", "data/expeditions.json", "data/pal_locations.json"],
  },
};

await atomicWrite(destination, data);
console.log(`activities: bosses=${bosses.length} expeditions=${expeditions.length} fishingPals=${fishingPals.length}`);

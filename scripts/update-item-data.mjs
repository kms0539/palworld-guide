#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const destination = join(root, "site", "data", "items.json");
const SOURCE_REVISION = "cf9ecbe832e3a2a9e2d78d6579a082d968b68f17";
const SOURCE_REPOSITORY = "https://github.com/beliarance/palworld-kb";
const RAW_BASE = `https://raw.githubusercontent.com/beliarance/palworld-kb/${SOURCE_REVISION}/data`;

function stableId(prefix, name) {
  return `${prefix}:${String(name).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

async function fetchJson(file) {
  const response = await fetch(`${RAW_BASE}/${file}`, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${file}`);
  return response.json();
}

function outputQuantity(notes) {
  const match = String(notes ?? "").match(/Crafts x(\d+) per batch/i);
  return match ? Number(match[1]) : 1;
}

function stations(recipe, notes) {
  if (!recipe) return [];
  const result = [recipe.station].filter(Boolean);
  const alternatives = String(notes ?? "").match(/Also craftable at: ([^;]+)/i)?.[1];
  if (alternatives) result.push(...alternatives.split(",").map((item) => item.trim()).filter(Boolean));
  return [...new Set(result)];
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const [sourceItems, sourceStructures] = await Promise.all([fetchJson("items.json"), fetchJson("base_building.json")]);
if (sourceItems.game_version !== "1.0" || sourceStructures.game_version !== "1.0") throw new Error("source game version mismatch");
if (sourceItems.items.length !== 1_195) throw new Error(`expected 1195 items, got ${sourceItems.items.length}`);
if (sourceStructures.structures.length !== 125) throw new Error(`expected 125 structures, got ${sourceStructures.structures.length}`);

const checkedAt = new Date().toISOString();
const items = sourceItems.items.map((item) => ({
  id: stableId("item", item.name),
  name: item.name,
  category: item.category,
  techLevel: item.tech_level === null ? null : Number(item.tech_level),
  ancientTechPoints: null,
  recipe: item.recipe ? {
    outputQuantity: outputQuantity(item.notes),
    stations: stations(item.recipe, item.notes),
    materials: Object.entries(item.recipe.materials).map(([name, quantity]) => ({ itemId: stableId("item", name), name, quantity: Number(quantity) })),
  } : null,
  obtainedFrom: Array.isArray(item.obtained_from) ? item.obtained_from : [],
  schematicSources: Array.isArray(item.schematic_sources) ? item.schematic_sources : [],
  dataVersion: "1.0",
  patchOverride: null,
}));

const aquatic = items.find((item) => item.name === "Aquatic Construction Kit");
if (!aquatic) throw new Error("Aquatic Construction Kit is missing");
aquatic.techLevel = 23;
aquatic.ancientTechPoints = 1;
aquatic.recipe = {
  outputQuantity: 1,
  stations: ["High Quality Workbench", "Production Assembly Line"],
  materials: [
    { itemId: stableId("item", "Cement"), name: "Cement", quantity: 30 },
    { itemId: stableId("item", "Ingot"), name: "Ingot", quantity: 10 },
    { itemId: stableId("item", "Wooden Board"), name: "Wooden Board", quantity: 15 },
  ],
};
aquatic.dataVersion = "1.0.3";
aquatic.patchOverride = {
  sourceUrl: "https://steamcommunity.com/ogg/1623730/announcements/detail/695395286786244642",
  detailSourceUrl: "https://palworld.wiki.gg/wiki/Aquatic_Construction_Kit",
  checkedAt,
  evidenceLevel: "community-verified",
  noteKo: "공식 v1.0.3 변경 공지와 현행 위키의 게임 내 수치로 보정",
};

const jetragonGear = items.find((item) => item.name === "Jetragon's Missile Launcher");
if (!jetragonGear) throw new Error("Jetragon's Missile Launcher is missing");
jetragonGear.techLevel = 70;
jetragonGear.dataVersion = "1.0.3";
jetragonGear.patchOverride = {
  sourceUrl: "https://steamcommunity.com/ogg/1623730/announcements/detail/695395286786244642",
  checkedAt,
  evidenceLevel: "official",
  noteKo: "공식 v1.0.3 변경 공지에 따라 해금 요구 레벨을 79에서 70으로 보정",
};

const itemIds = new Set(items.map((item) => item.id));
if (itemIds.size !== items.length) throw new Error("duplicate item ID");
for (const item of items) {
  for (const material of item.recipe?.materials ?? []) {
    if (!itemIds.has(material.itemId)) throw new Error(`${item.name} references an unknown material: ${material.name}`);
  }
}

const structures = sourceStructures.structures.map((structure) => ({
  id: stableId("structure", structure.name),
  name: structure.name,
  techLevel: structure.tech_level === null ? null : Number(structure.tech_level),
  ancientTech: Boolean(structure.ancient_tech),
  ancientTechPoints: null,
  materials: Object.entries(structure.materials ?? {}).map(([name, quantity]) => ({ itemId: stableId("item", name), name, quantity: Number(quantity) })),
  workers: structure.workers ?? null,
  capacity: structure.capacity ?? null,
  requiresPower: Boolean(structure.power),
  energyPerSecond: structure.energy_per_sec ?? null,
  workerSlots: structure.worker_slots ?? null,
  dataVersion: "1.0",
}));
for (const structure of structures) {
  for (const material of structure.materials) {
    if (!itemIds.has(material.itemId)) throw new Error(`${structure.name} references an unknown material: ${material.name}`);
  }
}

const data = {
  schemaVersion: 1,
  gameVersion: "1.0",
  latestPatchApplied: "1.0.3",
  dataCompatibility: "1.0.x",
  updatedAt: checkedAt,
  counts: {
    items: items.length,
    recipes: items.filter((item) => item.recipe).length,
    technologies: items.filter((item) => item.techLevel !== null).length,
    structures: structures.length,
    patchOverrides: items.filter((item) => item.patchOverride).length,
  },
  items,
  structures,
  provenance: {
    gameVersion: "1.0",
    sourceId: "beliarance-palworld-kb-items",
    sourceUrl: SOURCE_REPOSITORY,
    sourceRevision: SOURCE_REVISION,
    checkedAt,
    evidenceLevel: "community-verified",
    license: null,
    usageNoteKo: "원본 코드와 설명문을 복제하지 않고 구조화된 사실 필드만 정규화",
    sourceFiles: ["data/items.json", "data/base_building.json"],
  },
};

await atomicWrite(destination, data);
console.log(`item data: items=${items.length} recipes=${data.counts.recipes} structures=${structures.length} overrides=${data.counts.patchOverrides}`);

#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const destination = join(root, "site", "data", "breeding.json");
const detailsPath = join(root, "site", "data", "pal-details.json");

const SOURCE_REVISION = "4120331a454842e8f91b8d83cc7b21e64b4a7ade";
const SOURCE_REPOSITORY = "https://github.com/helios57/palworld";
const RAW_BASE = `https://raw.githubusercontent.com/helios57/palworld/${SOURCE_REVISION}/data`;

function stableId(name) {
  return `breed-pal:${String(name).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

async function fetchJson(file) {
  const url = `${RAW_BASE}/${file}`;
  const response = await fetch(url, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const [sourcePals, sourceCombos, sourceMechanics, details] = await Promise.all([
  fetchJson("pals.json"),
  fetchJson("special_combos.json"),
  fetchJson("breeding_mechanics.json"),
  readFile(detailsPath, "utf8").then(JSON.parse),
]);

if (Object.keys(sourcePals).length !== 299) throw new Error(`expected 299 breeding records, got ${Object.keys(sourcePals).length}`);
if (sourceCombos.length !== 164) throw new Error(`expected 164 special combos, got ${sourceCombos.length}`);
if (sourceMechanics.game_version !== "1.0") throw new Error(`unsupported game version: ${sourceMechanics.game_version}`);

const detailsByName = new Map(Object.values(details.pals).map((pal) => [pal.name, pal]));
const excludedCategories = new Map();
for (const [category, names] of Object.entries(sourceMechanics.excluded_from_generic_pool.categories)) {
  for (const name of names) {
    if (!excludedCategories.has(name)) excludedCategories.set(name, []);
    excludedCategories.get(name).push(category);
  }
}

const pals = Object.entries(sourcePals).map(([name, record]) => {
  const detail = detailsByName.get(name);
  return {
    id: stableId(name),
    entityId: detail?.entityId ?? null,
    slug: detail?.slug ?? null,
    name,
    paldex: String(record.paldeck),
    elements: record.elements.length ? record.elements : null,
    combiRank: Number(record.combi_rank),
    inGenericPool: Boolean(record.in_generic_pool),
    excludedCategories: excludedCategories.get(name) ?? [],
    maleProbability: detail?.breeding?.maleProbability ?? null,
  };
}).sort((a, b) => a.combiRank - b.combiRank || a.name.localeCompare(b.name));

const knownIds = new Set(pals.map((pal) => pal.id));
const specialCombos = sourceCombos.map((combo) => ({
  parentAId: stableId(combo.parent_a),
  parentBId: stableId(combo.parent_b),
  childId: stableId(combo.child),
  parentA: combo.parent_a,
  parentB: combo.parent_b,
  child: combo.child,
}));
for (const combo of specialCombos) {
  for (const id of [combo.parentAId, combo.parentBId, combo.childId]) {
    if (!knownIds.has(id)) throw new Error(`special combo references an unknown Pal: ${id}`);
  }
}

const checkedAt = new Date().toISOString();
const data = {
  schemaVersion: 1,
  gameVersion: "1.0",
  dataCompatibility: "1.0.x",
  updatedAt: checkedAt,
  counts: {
    pals: pals.length,
    genericPool: pals.filter((pal) => pal.inGenericPool).length,
    excludedFromGenericPool: sourceMechanics.excluded_from_generic_pool.count,
    specialCombos: specialCombos.length,
  },
  mechanics: {
    formula: "floor((rankA + rankB + 1) / 2)",
    closestGenericRankWins: true,
    tieBreak: "higher-combi-rank",
    tieBreakStatus: "conflicting-community-sources",
    tieBreakNoteKo: "동일 거리 타이브레이크는 현행 자료끼리 설명이 충돌합니다. 이 계산기는 고정 데이터셋의 1.0 검증 사례에 따라 더 높은 CombiRank를 선택합니다.",
    orderInsensitive: Boolean(sourceMechanics.order_insensitive),
    genderRequirementKo: "수컷 1마리와 암컷 1마리가 필요하며 성별은 자식 종을 바꾸지 않습니다.",
    sameSpeciesKo: "같은 종끼리 번식하면 같은 종이 태어납니다.",
    passiveInheritance: {
      inheritedCountProbabilities: { "1": 0.4, "2": 0.3, "3": 0.2, "4": 0.1 },
      exactAllParentPassivesNoRandom: { "1": 0.4, "2": 0.24, "3": 0.12, "4": 0.1 },
      duplicateParentPassivesCountOnce: true,
      evidenceLevel: "community-verified",
      sourceUrl: "https://palworld.wiki.gg/wiki/Breeding",
      checkedAt,
    },
    ivInheritance: {
      confirmed: true,
      exactProbabilities: null,
      evidenceLevel: "community-verified",
      noteKo: "부모의 개체값 계승은 확인됐지만 1.0의 정확한 확률은 현재 채택한 원본에서 확정되지 않아 표시하지 않습니다.",
      sourceUrl: "https://palworld.wiki.gg/wiki/Breeding",
      checkedAt,
    },
    mutation: {
      available: true,
      baseChance: null,
      separateSpeciesBranch: true,
      exclusivePassives: true,
      chanceModifiers: ["Mushroom Cake", "Deluxe Vegetable Cake"],
      evidenceLevel: "community-verified",
      noteKo: "변이와 케이크의 영향은 확인됐지만 정확한 발생 확률은 고정 원본에 없어 추정하지 않습니다.",
    },
    cakes: [
      { id: "cake", name: "Cake", effectKo: "번식에 필요한 기본 케이크" },
      { id: "mushroom-cake", name: "Mushroom Cake", effectKo: "더 좋은 능력치가 나올 확률 증가" },
      { id: "vegetable-cake", name: "Vegetable Cake", effectKo: "알 2개 생산" },
      { id: "deluxe-vegetable-cake", name: "Deluxe Vegetable Cake", effectKo: "변이와 능력치 성장 확률 증가" },
      { id: "special-cake", name: "Special Cake", effectKo: "여러 패시브 계승 확률 증가" },
    ],
  },
  pals,
  specialCombos,
  provenance: {
    gameVersion: "1.0",
    sourceId: "helios57-palworld-breeding",
    sourceUrl: SOURCE_REPOSITORY,
    sourceRevision: SOURCE_REVISION,
    checkedAt,
    evidenceLevel: "community-verified",
    license: "MIT",
    sourceFiles: ["data/pals.json", "data/special_combos.json", "data/breeding_mechanics.json"],
  },
};

await atomicWrite(destination, data);
console.log(`breeding data: pals=${pals.length} generic=${data.counts.genericPool} combos=${specialCombos.length}`);

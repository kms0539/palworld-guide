#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const itemsPath = join(root, "site", "data", "items.json");
const reportPath = join(root, "site", "data", "item-localization-report.json");
const missingImagesDocPath = join(root, "docs", "missing-item-images.md");
const SOURCE_REVISION = "63fb57b4619605f80f17abc4fb6fc62e80ed7142";
const SOURCE_REPOSITORY = "https://github.com/oMaN-Rod/palworld-save-pal";
const RAW_BASE = `https://raw.githubusercontent.com/oMaN-Rod/palworld-save-pal/${SOURCE_REVISION}`;
const DATA_BASE = `${RAW_BASE}/data/json`;
const IMAGE_BASE = `${RAW_BASE}/ui/src/lib/assets/img`;
const MAX_IMAGE_BYTES = 2_000_000;

// These labels fill source records whose Korean localization is literally absent
// ("ko Text", English, or no record). They are intentionally marked editorial.
const EDITORIAL_KO = Object.freeze({
  "Animal Skin": "동물 가죽",
  Scales: "비늘",
  Claw: "발톱",
  Fang: "송곳니",
  Flint: "부싯돌",
  Sand: "모래",
  Silicon: "규소",
  "Raw Meat": "생고기",
  Corn: "옥수수",
  Pumpkin: "호박",
  Grape: "포도",
  Hop: "홉",
  Potage: "포타주",
  Curry: "카레",
  Sandwich: "샌드위치",
  "Corn Soup": "옥수수 수프",
  Stew: "스튜",
  "Grilled Fish": "생선구이",
  "Seafood Soup": "해산물 수프",
  Beer: "맥주",
  Wine: "와인",
  Flamethrower: "화염방사기",
  "Lightz Helmet": "라이트즈 헬멧",
  "Night Vision Goggles": "야간 투시경",
  "Quadruple Air Dash Boots": "쿼드 에어 대시 부츠",
  "Sunreach Rapid-Fire Ammo": "선리치 속사 탄약",
  "Sunreach Single-Shot Ammo": "선리치 단발 탄약",
  "Dragostrophe's Shotgun": "드라고스트로피의 산탄총",
  "Boltmane Saddle": "볼트메인의 안장",
});

const ITEM_ALIASES = Object.freeze({ "Raw Meat": "Meat", Flamethrower: "FlameThrower" });
const STRUCTURE_ALIASES = Object.freeze({
  "High Quality Workbench": "High-Quality Workbench",
  "Coal Mine": "Coal Quarry",
  "Sulfur Mine": "Sulfur Quarry",
  WoodCreator: "Logging Site",
  "Refrigerated Crusher": "Cryogenic Crusher",
});

function hasHangul(value) {
  return /[가-힣]/.test(value ?? "");
}

function safeIconName(icon) {
  const value = String(icon ?? "").toLocaleLowerCase("en-US");
  return /^[a-z0-9_-]+$/.test(value) ? value : "";
}

function candidateRows(data, english, korean) {
  return Object.entries(english).map(([sourceKey, value]) => ({
    sourceKey,
    name: value?.localized_name,
    nameKo: korean[sourceKey]?.localized_name,
    icon: data[sourceKey]?.icon,
    disabled: Boolean(data[sourceKey]?.disabled),
  })).filter((row) => row.name);
}

function chooseCandidate(candidates) {
  return [...candidates].sort((a, b) =>
    Number(a.disabled) - Number(b.disabled)
    || Number(!hasHangul(a.nameKo)) - Number(!hasHangul(b.nameKo))
    || Number(/\d$/.test(a.sourceKey)) - Number(/\d$/.test(b.sourceKey))
    || a.sourceKey.localeCompare(b.sourceKey),
  )[0] ?? null;
}

function localizeEntries(entries, rows, aliases, kind, conflicts) {
  const byEnglishName = new Map();
  for (const row of rows) byEnglishName.set(row.name, [...(byEnglishName.get(row.name) ?? []), row]);
  return entries.map((entry) => {
    const lookupName = aliases[entry.name] ?? entry.name;
    const candidates = byEnglishName.get(lookupName) ?? [];
    const selected = chooseCandidate(candidates);
    if (candidates.length > 1) {
      conflicts.push({ kind, id: entry.id, name: entry.name, selectedSourceKey: selected.sourceKey, candidateSourceKeys: candidates.map(({ sourceKey }) => sourceKey) });
    }
    const sourceKorean = hasHangul(selected?.nameKo) ? selected.nameKo : "";
    const nameKo = sourceKorean || EDITORIAL_KO[entry.name] || "";
    const icon = safeIconName(selected?.icon);
    return {
      ...entry,
      nameKo,
      localizationStatus: sourceKorean ? "game-data" : nameKo ? "editorial" : "missing",
      localizationSourceKey: selected?.sourceKey ?? null,
      image: icon ? `./assets/${kind === "item" ? "items" : "structures"}/${icon}.webp` : null,
      imageSourceKey: icon || null,
      disabled: selected ? selected.disabled : null,
    };
  });
}

async function fetchJson(path) {
  const response = await fetch(`${DATA_BASE}/${path}`, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
  return response.json();
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function atomicWriteText(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, value, "utf8");
  await rename(temporary, path);
}

function isWebp(buffer) {
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

async function downloadImage(asset) {
  const destination = join(root, "site", "assets", asset.kind === "item" ? "items" : "structures", `${asset.icon}.webp`);
  try {
    const existing = await readFile(destination);
    if (isWebp(existing)) return { ...asset, status: "existing", bytes: existing.length, sha256: createHash("sha256").update(existing).digest("hex") };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const response = await fetch(`${IMAGE_BASE}/${asset.icon}.webp`, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { ...asset, status: "missing-upstream", httpStatus: response.status };
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_IMAGE_BYTES) return { ...asset, status: "rejected-size", bytes: declaredLength };
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES || !isWebp(buffer)) return { ...asset, status: "rejected-format", bytes: buffer.length };
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp.${process.pid}`;
  await writeFile(temporary, buffer);
  await rename(temporary, destination);
  return { ...asset, status: "downloaded", bytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
}

async function mapLimit(values, limit, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await operation(values[index]);
    }
  }));
  return results;
}

const data = JSON.parse(await readFile(itemsPath, "utf8"));
const [sourceItems, itemEn, itemKo, sourceStructures, structureEn, structureKo] = await Promise.all([
  fetchJson("items.json"),
  fetchJson("l10n/en/items.json"),
  fetchJson("l10n/ko/items.json"),
  fetchJson("buildings.json"),
  fetchJson("l10n/en/buildings.json"),
  fetchJson("l10n/ko/buildings.json"),
]);

const conflicts = [];
data.items = localizeEntries(data.items, candidateRows(sourceItems, itemEn, itemKo), ITEM_ALIASES, "item", conflicts);
data.structures = localizeEntries(data.structures, candidateRows(sourceStructures, structureEn, structureKo), STRUCTURE_ALIASES, "structure", conflicts);
const missingTranslations = [...data.items, ...data.structures].filter((entry) => !hasHangul(entry.nameKo));
if (missingTranslations.length) throw new Error(`Korean labels missing: ${missingTranslations.map(({ name }) => name).join(", ")}`);

const uniqueAssets = new Map();
for (const [kind, entries] of [["item", data.items], ["structure", data.structures]]) {
  for (const entry of entries) {
    if (entry.imageSourceKey) uniqueAssets.set(`${kind}:${entry.imageSourceKey}`, { kind, icon: entry.imageSourceKey });
  }
}
const assets = await mapLimit([...uniqueAssets.values()], 12, downloadImage);
const failedAssets = new Set(assets.filter(({ status }) => !["downloaded", "existing"].includes(status)).map(({ kind, icon }) => `${kind}:${icon}`));
for (const [kind, entries] of [["item", data.items], ["structure", data.structures]]) {
  for (const entry of entries) {
    if (entry.imageSourceKey && failedAssets.has(`${kind}:${entry.imageSourceKey}`)) entry.image = null;
  }
}

const checkedAt = new Date().toISOString();
const missingItemImages = data.items.filter(({ image }) => !image).map(({ id, name, nameKo, localizationSourceKey, imageSourceKey }) => ({
  id, name, nameKo, localizationSourceKey, imageSourceKey, reason: imageSourceKey ? "원본 이미지 파일 미확인" : "연결 가능한 원본 이미지 키 없음",
}));
const missingStructureImages = data.structures.filter(({ image }) => !image).map(({ id, name, nameKo, localizationSourceKey, imageSourceKey }) => ({
  id, name, nameKo, localizationSourceKey, imageSourceKey, reason: imageSourceKey ? "원본 이미지 파일 미확인" : "연결 가능한 원본 이미지 키 없음",
}));
data.counts.itemImages = data.items.length - missingItemImages.length;
data.counts.structureImages = data.structures.length - missingStructureImages.length;
data.counts.gameDataKoreanNames = [...data.items, ...data.structures].filter(({ localizationStatus }) => localizationStatus === "game-data").length;
data.counts.editorialKoreanNames = [...data.items, ...data.structures].filter(({ localizationStatus }) => localizationStatus === "editorial").length;
data.localization = {
  sourceId: "palworld-save-pal-l10n-assets",
  sourceUrl: SOURCE_REPOSITORY,
  sourceRevision: SOURCE_REVISION,
  checkedAt,
  evidenceLevel: "game-data",
  codeLicense: "GPL-3.0",
  gameAssetRights: "Pocketpair",
  usageNoteKo: "고정 리비전의 한국어 게임 데이터와 아이콘 키를 이름으로 대조했으며, 원본에 한국어가 없는 항목은 편집 번역으로 구분",
};

const report = {
  schemaVersion: 1,
  generatedAt: checkedAt,
  source: data.localization,
  counts: {
    items: data.items.length,
    structures: data.structures.length,
    itemImages: data.counts.itemImages,
    structureImages: data.counts.structureImages,
    missingItemImages: missingItemImages.length,
    missingStructureImages: missingStructureImages.length,
    editorialTranslations: data.counts.editorialKoreanNames,
    matchConflicts: conflicts.length,
  },
  missingItemImages,
  missingStructureImages,
  editorialTranslations: [...data.items, ...data.structures].filter(({ localizationStatus }) => localizationStatus === "editorial").map(({ id, name, nameKo }) => ({ id, name, nameKo })),
  matchConflicts: conflicts,
  assets,
};

await atomicWrite(itemsPath, data);
await atomicWrite(reportPath, report);
const missingImagesMarkdown = `# 이미지 미확인 아이템·구조물\n\n자동 생성: ${checkedAt}\n\n확인된 원본 이미지 키 또는 실제 WebP 파일이 없는 항목만 기록합니다. 임의로 비슷한 이미지를 대체하지 않습니다.\n\n## 아이템 (${missingItemImages.length})\n\n${missingItemImages.map((entry) => `- ${entry.nameKo} (${entry.name}) — ${entry.reason}`).join("\n") || "- 없음"}\n\n## 구조물 (${missingStructureImages.length})\n\n${missingStructureImages.map((entry) => `- ${entry.nameKo} (${entry.name}) — ${entry.reason}`).join("\n") || "- 없음"}\n`;
await atomicWriteText(missingImagesDocPath, missingImagesMarkdown);
console.log(`item localization: Korean=${data.items.length + data.structures.length} itemImages=${data.counts.itemImages}/${data.items.length} structureImages=${data.counts.structureImages}/${data.structures.length} missing=${missingItemImages.length + missingStructureImages.length}`);

#!/usr/bin/env node

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const publicMode = args.includes("--public");
const workDirectory = join(root, ".work");
const outputPath = join(workDirectory, "guide-data.json");
const historyDir = join(workDirectory, "history");
const logPath = join(workDirectory, "guide-update.log");
const now = new Date();
const checkedAt = now.toISOString();

const SOURCE = {
  tiers: "https://www.palworld.tools/tier-list",
  editorial: "https://palcompass.com/guides/best-pals",
  orserk: "https://palcompass.com/pals/orserk",
  bakemi: "https://palcompass.com/pals/bakemi",
  map: "https://palworld-map.com/map",
  resources: "https://github.com/miapuffia/MapCollectablesMod",
};

const ROLE_SECTIONS = {
  combat: "combat",
  base: "base-work",
  ranch: "ranch",
  early: "early-game",
  groundMount: "ground-mounts",
  flyingMount: "flying-mounts",
  waterMount: "water-mounts",
};

const RESOURCE_FILES = {
  coal: "CoalLocations.json",
  copper: "CopperLocations.json",
  quartz: "QuartzLocations.json",
  sulfur: "SulfurLocations.json",
  oil: "OilLocations.json",
  hexolite: "HexoliteLocations.json",
};

const RESOURCE_LABELS = {
  coal: "석탄",
  copper: "금속 광석",
  quartz: "순수한 석영",
  sulfur: "유황",
  oil: "원유",
  hexolite: "헥솔라이트 석영",
};

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function text(value) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "kms0539-palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseTables(html) {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((table) =>
    [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => text(cell[1])))
      .filter((row) => row.length),
  );
}

function parsePalAnchors(html) {
  const result = [];
  const seen = new Set();
  const pattern = /<a[^>]+href="\/pals\/([^"?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    const content = text(match[2]);
    const scoreMatch = content.match(/^(.*?)\s+(\d{1,3}(?:\.\d+)?)$/);
    const name = (scoreMatch?.[1] ?? content).trim();
    if (!name || name.length > 80) continue;
    seen.add(slug);
    result.push({ slug, name, score: scoreMatch ? Number(scoreMatch[2]) : null });
  }
  return result;
}

function parseTierSections(html) {
  const indices = [...html.matchAll(/<div id="([^"]+)" class="hidden">/g)].map((match) => ({ id: match[1], index: match.index }));
  const roles = {};
  for (const [role, sectionId] of Object.entries(ROLE_SECTIONS)) {
    const startIndex = indices.findIndex((entry) => entry.id === sectionId);
    if (startIndex < 0) {
      roles[role] = [];
      continue;
    }
    const start = indices[startIndex].index;
    const end = indices[startIndex + 1]?.index ?? html.length;
    roles[role] = parsePalAnchors(html.slice(start, end)).map((pal, index) => ({ ...pal, rank: index + 1 }));
  }
  return roles;
}

function rowsToRecommendations(rows, type) {
  return rows.slice(1).filter((row) => row.length >= 3).map((row, index) => {
    if (type === "combat") {
      return { rank: Number(row[0]) || index + 1, pal: row[1], role: row[2], reason: row[3] ?? "", evidence: row[4] ?? "편집형 추천" };
    }
    if (type === "base") {
      return { rank: index + 1, workType: row[0], pal: row[1], reason: row[2] ?? "", alternative: row[3] ?? "" };
    }
    if (type === "support") {
      return { rank: index + 1, pal: row[0], role: row[1], reason: row[2] ?? "", limitation: row[3] ?? "" };
    }
    if (type === "travel") {
      return { rank: Number(row[0]) || index + 1, pal: row[1], role: row[2], limitation: row[3] ?? "" };
    }
    return { rank: index + 1, pal: row[0], role: row[1], reason: row[2] ?? "", note: row[3] ?? "" };
  });
}

function parseBuildCards(html, pal) {
  const cards = [];
  const sections = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)];
  for (const section of sections) {
    if (!/Suggested passives/i.test(section[1]) || !/How to use this build/i.test(section[1])) continue;
    const heading = section[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const summary = section[1].match(/<h3[^>]*>[\s\S]*?<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    const version = text(section[1]).match(/Palworld\s+([0-9.]+)/i)?.[1] ?? "1.0";
    const blocks = [...section[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)];
    const values = new Map(blocks.map((block) => [text(block[1]).toLowerCase(), block[2]]));
    const list = (key) => {
      const value = values.get(key) ?? "";
      const items = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((item) => text(item[1]));
      return items.length ? items : (text(value) ? [text(value)] : []);
    };
    cards.push({
      id: `${slugify(pal)}-${slugify(text(heading?.[1] ?? "build"))}`,
      pal,
      title: text(heading?.[1] ?? "추천 빌드"),
      summary: text(summary?.[1] ?? ""),
      passives: list("suggested passives"),
      skills: list("suggested skills"),
      usage: text(values.get("how to use this build") ?? ""),
      gameVersion: version,
      kind: /base|work/i.test(text(heading?.[1] ?? "")) ? "base" : "combat",
      confidence: "editorial",
      sourceUrl: pal === "Orserk" ? SOURCE.orserk : SOURCE.bakemi,
    });
  }
  return cards;
}

function parseMapProjection(moduleText) {
  const marker = "JSON.parse(`";
  const start = moduleText.indexOf(marker);
  if (start < 0) throw new Error("map projection payload not found");
  const payloadStart = start + marker.length;
  const end = moduleText.indexOf("`),t=", payloadStart);
  if (end < 0) throw new Error("map projection payload end not found");
  return JSON.parse(moduleText.slice(payloadStart, end));
}

function normalizeMapPoint(point) {
  const world = point.coords?.world;
  if (!world || !Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;
  return {
    id: point.id,
    label: point.label,
    category: point.category,
    mapId: point.map_id ?? "main",
    x: Math.round(world.x * 10) / 10,
    y: Math.round(world.y * 10) / 10,
    z: Number.isFinite(world.z) ? Math.round(world.z * 10) / 10 : null,
    level: point.level ?? null,
    gameVersion: point.game_version ?? "unknown",
    versionStatus: point.version_status ?? "unknown",
    confidence: point.confidence ?? "unknown",
    verifiedAt: point.verified_at ?? null,
    source: Array.isArray(point.source) ? point.source.map((source) => ({ name: source.name, url: source.url, license: source.license ?? null })) : [],
  };
}

function clusterResources(locations, resource, gridSize = 22_000) {
  const cells = new Map();
  for (const location of locations) {
    if (!Number.isFinite(location.x) || !Number.isFinite(location.y)) continue;
    const key = `${Math.round(location.x / gridSize)}:${Math.round(location.y / gridSize)}`;
    const cell = cells.get(key) ?? { x: 0, y: 0, z: 0, count: 0 };
    cell.x += location.x;
    cell.y += location.y;
    cell.z += Number(location.z) || 0;
    cell.count += 1;
    cells.set(key, cell);
  }
  return [...cells.entries()].map(([key, cell]) => ({
    id: `resource-${resource}-${key.replace(":", "-")}`,
    label: `${RESOURCE_LABELS[resource]} 밀집 지점 (${cell.count})`,
    category: `resource_${resource}`,
    mapId: "main",
    x: Math.round(cell.x / cell.count),
    y: Math.round(cell.y / cell.count),
    z: Math.round(cell.z / cell.count),
    count: cell.count,
    gameVersion: "pre-1.0-community",
    versionStatus: "legacy_unverified",
    confidence: "low",
    verifiedAt: "2025-02-04",
    source: [{ name: "MapCollectablesMod", url: SOURCE.resources, license: null }],
  }));
}

function assertGuide(data) {
  if (data.schemaVersion !== 1) throw new Error("invalid schema version");
  if (data.pals.length < 250) throw new Error(`pal roster unexpectedly small: ${data.pals.length}`);
  if (data.roles.combat.length < 100) throw new Error(`combat tier unexpectedly small: ${data.roles.combat.length}`);
  if (data.editorial.combat.length < 4 || data.editorial.base.length < 5 || data.editorial.support.length < 3) throw new Error("editorial recommendations incomplete");
  if (data.builds.length < 3) throw new Error(`build cards unexpectedly small: ${data.builds.length}`);
  if (data.map.points.length < 200) throw new Error(`map payload unexpectedly small: ${data.map.points.length}`);
  if (!data.sources.every((source) => source.url.startsWith("https://"))) throw new Error("invalid source URL");
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function log(message) {
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, `${new Date().toISOString()} ${message}\n`, { encoding: "utf8", flag: "a" });
}

async function pruneHistory() {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(historyDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith("guide-data-") && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  await Promise.all(files.slice(7).map((file) => rm(join(historyDir, file), { force: true })));
}

async function main() {
  await log("guide update started");
  const [tierHtml, editorialHtml, orserkHtml, bakemiHtml, mapHtml] = await Promise.all([
    fetchText(SOURCE.tiers), fetchText(SOURCE.editorial), fetchText(SOURCE.orserk), fetchText(SOURCE.bakemi), fetchText(SOURCE.map),
  ]);

  const palRoster = parsePalAnchors(tierHtml);
  const roles = parseTierSections(tierHtml);
  const tables = parseTables(editorialHtml);
  if (tables.length < 6) throw new Error(`editorial table count changed: ${tables.length}`);

  const mapAsset = mapHtml.match(/\/assets\/map-projection-[^"']+\.js/)?.[0];
  if (!mapAsset) throw new Error("map projection asset not found");
  const mapModule = await fetchText(new URL(mapAsset, SOURCE.map).href, { timeoutMs: 60_000 });
  const mapSourcePoints = parseMapProjection(mapModule);
  const allowedMapCategories = new Set(["fast_travel", "alpha_pal", "boss_tower", "bounty_target", "predator_pal", "oil_rig", "world_tree", "sunreach"]);
  const mapPoints = mapSourcePoints.filter((point) => allowedMapCategories.has(point.category)).map(normalizeMapPoint).filter(Boolean);

  const resourceBase = "https://raw.githubusercontent.com/miapuffia/MapCollectablesMod/main/Content/Mods/MapCollectablesMod/Data/";
  const resourceResults = publicMode ? [] : await Promise.all(Object.entries(RESOURCE_FILES).map(async ([resource, file]) => {
    const raw = await fetchText(`${resourceBase}${file}`);
    const parsed = JSON.parse(raw);
    return { resource, rawCount: parsed.Locations?.length ?? 0, points: clusterResources(parsed.Locations ?? [], resource) };
  }));

  const resourcePoints = resourceResults.flatMap((result) => result.points);
  const builds = [...parseBuildCards(orserkHtml, "Orserk"), ...parseBuildCards(bakemiHtml, "Bakemi")];
  const guide = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    gameVersion: "1.0",
    freshness: { status: "current", nextScheduledUpdateLocal: "매일 05:00", staleAfterHours: 36 },
    notices: [
      "종결 빌드와 순위는 공식 정답이 아닌 외부 편집형 추천이며 패치·월드 설정·보유 패시브에 따라 달라집니다.",
      "광석 밀집 지점은 1.0 이전 커뮤니티 좌표를 묶어 표시한 참고값이므로 게임 안에서 재확인해야 합니다.",
      "외부 사이트의 본문·이미지는 복제하지 않고 짧은 구조화 사실과 원문 링크만 보관합니다.",
    ],
    sources: [
      { id: "palworld-tools", name: "palworld.tools 1.0 computed tier lists", url: SOURCE.tiers, checkedAt, gameVersion: "1.0", kind: "computed", license: null },
      { id: "palcompass", name: "PalCompass best Pals editorial", url: SOURCE.editorial, checkedAt, gameVersion: "1.0.1", kind: "editorial", license: null },
      { id: "palworld-map", name: "Palworld Interactive Map 1.0 Beta", url: SOURCE.map, checkedAt, gameVersion: "1.0", kind: "map-aggregation", license: "per-record" },
      ...(!publicMode ? [{ id: "map-collectables", name: "MapCollectablesMod community coordinates", url: SOURCE.resources, checkedAt, gameVersion: "pre-1.0", kind: "private-cache-factual", license: null }] : []),
    ],
    pals: palRoster.map((pal) => ({ ...pal, sourceUrl: `${SOURCE.tiers.replace(/\/tier-list$/, "")}/pals/${pal.slug}` })),
    roles,
    editorial: {
      combat: rowsToRecommendations(tables[0], "combat"),
      base: rowsToRecommendations(tables[1], "base"),
      early: rowsToRecommendations(tables[2], "early"),
      travel: rowsToRecommendations(tables[3], "travel"),
      support: rowsToRecommendations(tables[4], "support"),
      breeding: rowsToRecommendations(tables[5], "breeding"),
    },
    builds,
    map: {
      bounds: { minX: -480000, maxX: 480000, minY: -480000, maxY: 480000 },
      points: [...mapPoints, ...resourcePoints],
      counts: {
        sourcePoints: mapPoints.length,
        resourceRaw: Object.fromEntries(resourceResults.map((result) => [result.resource, result.rawCount])),
        resourceClusters: Object.fromEntries(resourceResults.map((result) => [result.resource, result.points.length])),
      },
    },
  };

  assertGuide(guide);
  await mkdir(historyDir, { recursive: true });
  try {
    await stat(outputPath);
    const previous = await readFile(outputPath, "utf8");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    await writeFile(join(historyDir, `guide-data-${stamp}.json`), previous, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await atomicWrite(outputPath, guide);
  await pruneHistory();
  await log(`guide update completed pals=${guide.pals.length} builds=${guide.builds.length} points=${guide.map.points.length}`);
  process.stdout.write(`${JSON.stringify({ ok: true, outputPath, pals: guide.pals.length, builds: guide.builds.length, points: guide.map.points.length })}\n`);
}

main().catch(async (error) => {
  await log(`guide update failed: ${error.stack ?? error.message}`).catch(() => {});
  process.stderr.write(`Guide update failed: ${error.message}\n`);
  process.exitCode = 1;
});

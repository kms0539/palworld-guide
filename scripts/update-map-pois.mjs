#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const destination = join(root, "site", "data", "map-pois.json");
const PALMAP_REVISION = "af430c078675083b59408a00efb9c4bd911db5d4";
const KNOWLEDGE_REVISION = "cf9ecbe832e3a2a9e2d78d6579a082d968b68f17";
const PALMAP_URL = `https://raw.githubusercontent.com/voidpossum/PalMap/${PALMAP_REVISION}/app/data/markers.json`;
const PALDB_URL = "https://paldb.cc/js/map_data_en.js";
const LOCATIONS_URL = `https://raw.githubusercontent.com/beliarance/palworld-kb/${KNOWLEDGE_REVISION}/data/pal_locations.json`;

const CATEGORY_MAP = Object.freeze({
  effigy: "collectible",
  ancientRuin: "schematic",
  note: "journal",
  towerBoss: "boss_tower",
  dungeon: "dungeon",
  cagedBoss: "caged_pal",
  watchtower: "watchtower",
  treasureMap: "treasure_map",
  warpPoint: "warp_point",
  skillFruit: "skill_fruit",
  bounty: "bounty_target",
});

const RESOURCE_TYPES = new Set([
  "Ore", "Coal", "Sulfur", "Pure Quartz", "Hexolite Quartz", "Chromite", "Soralite", "Crude Oil",
  "Nightstar Sand", "Beautiful Flower", "Kinship Peach", "Ancient Lava", "Ancient Bark", "Ancient Bone",
]);
const MERCHANT_TYPES = new Set(["Wandering Merchant", "Black Marketeer"]);
const FISHING_TYPES = new Set(["Fishing Spot", "Rare Fishing Spot"]);
const WORLD_TREE_BOUNDS = { minX: 347351.5, maxX: 689148.5, minY: -818197, maxY: -476400 };
const SUNREACH_BOUNDS = { minX: -850000, maxX: -730000, minY: -105000, maxY: 75000 };

function inBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function mapId(point) {
  if (inBounds(point, WORLD_TREE_BOUNDS)) return "world_tree";
  if (inBounds(point, SUNREACH_BOUNDS)) return "sunreach";
  return "main";
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function point(id, label, category, coordinates, source, extras = {}) {
  const normalized = {
    id,
    label: stripHtml(label) || category,
    category,
    mapId: "main",
    x: Math.round(Number(coordinates.X) * 10) / 10,
    y: Math.round(Number(coordinates.Y) * 10) / 10,
    z: Number.isFinite(Number(coordinates.Z)) ? Math.round(Number(coordinates.Z) * 10) / 10 : null,
    level: Number.isFinite(Number(extras.level)) ? Number(extras.level) : null,
    gameVersion: "1.0",
    versionStatus: "current_1_0",
    confidence: source === "palmap" ? "high" : "medium",
    verifiedAt: "2026-08-28",
    deferred: Boolean(extras.deferred),
    count: extras.count ?? null,
    source: [{
      name: source === "palmap" ? "PalMap game-file markers" : "PalDB game-file map data",
      url: source === "palmap" ? `https://github.com/voidpossum/PalMap/tree/${PALMAP_REVISION}` : "https://paldb.cc/en/Map",
      license: source === "palmap" ? "GPL-3.0" : null,
    }],
  };
  normalized.mapId = mapId(normalized);
  return normalized;
}

function parsePaldbArray(source) {
  const marker = "var fixedDungeon = ";
  const start = source.indexOf(marker);
  const end = source.indexOf(";var regionData", start);
  if (start < 0 || end < 0) throw new Error("PalDB map array was not found");
  return JSON.parse(source.slice(start + marker.length, end));
}

function stableCoordinateId(prefix, entry, index) {
  const pos = entry.pos;
  return `${prefix}:${String(entry.type).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}:${Math.round(pos.X)}:${Math.round(pos.Y)}:${index}`;
}

function clusterResources(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const gridX = Math.floor(entry.pos.X / 25_000);
    const gridY = Math.floor(entry.pos.Y / 25_000);
    const key = `${entry.type}:${gridX}:${gridY}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const coordinates = {
      X: group.reduce((sum, entry) => sum + entry.pos.X, 0) / group.length,
      Y: group.reduce((sum, entry) => sum + entry.pos.Y, 0) / group.length,
      Z: group.reduce((sum, entry) => sum + Number(entry.pos.Z ?? 0), 0) / group.length,
    };
    return point(`resource:${key}`, group[0].type, "resource", coordinates, "paldb", { deferred: true, count: group.length });
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

const [palmapText, paldbText, locationsText] = await Promise.all([fetchText(PALMAP_URL), fetchText(PALDB_URL), fetchText(LOCATIONS_URL)]);
const palmap = JSON.parse(palmapText);
const paldb = parsePaldbArray(paldbText);
const locations = JSON.parse(locationsText);

const palmapPoints = palmap.markers.filter((entry) => CATEGORY_MAP[entry.category] && Number.isFinite(entry.x) && Number.isFinite(entry.y)).map((entry) =>
  point(`palmap:${entry.id}`, entry.label, CATEGORY_MAP[entry.category], { X: entry.x, Y: entry.y, Z: entry.z }, "palmap", { level: entry.label.match(/Lv\.?\s*(\d+)/i)?.[1], deferred: ["collectible", "dungeon"].includes(CATEGORY_MAP[entry.category]) }),
);
const paldbWithPosition = paldb.filter((entry) => Number.isFinite(entry.pos?.X) && Number.isFinite(entry.pos?.Y));
const resourcePoints = clusterResources(paldbWithPosition.filter((entry) => RESOURCE_TYPES.has(entry.type)));
const merchantPoints = paldbWithPosition.filter((entry) => MERCHANT_TYPES.has(entry.type)).map((entry, index) =>
  point(stableCoordinateId("merchant", entry, index), entry.item || entry.type, "merchant", entry.pos, "paldb", { level: entry.lv }),
);
const fishingPoints = paldbWithPosition.filter((entry) => FISHING_TYPES.has(entry.type)).map((entry, index) =>
  point(stableCoordinateId("fishing", entry, index), entry.type, entry.type === "Rare Fishing Spot" ? "rare_fishing" : "fishing", entry.pos, "paldb", { deferred: true }),
);
const points = [...palmapPoints, ...resourcePoints, ...merchantPoints, ...fishingPoints];
const ids = new Set(points.map(({ id }) => id));
if (ids.size !== points.length) throw new Error("duplicate map POI ID");
if (!points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))) throw new Error("invalid map coordinates");

const habitats = Object.entries(locations.pals).map(([name, value]) => ({
  pal: name,
  regions: value.regions ?? [],
  dayNight: value.day_night ?? null,
  alphaLocations: value.alpha_locations ?? [],
  otherSources: value.other_sources ?? [],
}));
const checkedAt = new Date().toISOString();
const data = {
  schemaVersion: 1,
  gameVersion: "1.0.x",
  updatedAt: checkedAt,
  counts: {
    points: points.length,
    habitats: habitats.length,
    categories: Object.fromEntries(Object.entries(Object.groupBy(points, ({ category }) => category)).map(([category, entries]) => [category, entries.length])),
  },
  points,
  habitats,
  provenance: [
    { sourceId: "palmap-markers", sourceUrl: `https://github.com/voidpossum/PalMap/tree/${PALMAP_REVISION}`, sourceRevision: PALMAP_REVISION, checkedAt, gameVersion: "1.0", evidenceLevel: "game-data", license: "GPL-3.0" },
    { sourceId: "paldb-map", sourceUrl: "https://paldb.cc/en/Map", sourceRevision: createHash("sha256").update(paldbText).digest("hex"), checkedAt, gameVersion: "1.0.x", evidenceLevel: "game-data", license: null },
    { sourceId: "palworld-kb-locations", sourceUrl: "https://github.com/beliarance/palworld-kb", sourceRevision: KNOWLEDGE_REVISION, checkedAt, gameVersion: "1.0", evidenceLevel: "community-verified", license: null },
  ],
};

await atomicWrite(destination, data);
console.log(`map POIs: points=${points.length} habitats=${habitats.length} categories=${Object.keys(data.counts.categories).length}`);

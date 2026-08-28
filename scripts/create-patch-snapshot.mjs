import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootIndex = process.argv.indexOf("--root");
const root = path.resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : ".");
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const registry = await readJson("site/data/data-registry.json");
const version = registry.latestVerifiedPatch;
const details = await readJson("site/data/pal-details.json");
const breeding = await readJson("site/data/breeding.json");
const items = await readJson("site/data/items.json");
const guide = await readJson("site/data/guide-data.json");
const mapPois = await readJson("site/data/map-pois.json");

const pick = (value, fields) => Object.fromEntries(fields.map((field) => [field, value?.[field] ?? null]));
const snapshot = {
  schemaVersion: 1,
  gameVersion: version,
  createdAt: new Date().toISOString(),
  sections: {
    pals: Object.fromEntries(Object.values(details.pals).map((pal) => [pal.entityId, pick(pal, ["name", "paldex", "elements", "stats", "work", "obtainable"])])),
    breeding: Object.fromEntries(breeding.pals.map((pal) => [pal.id, pick(pal, ["combiRank", "inGenericPool", "maleProbability"])])),
    items: Object.fromEntries(items.items.map((item) => [item.id, pick(item, ["nameKo", "category", "techLevel", "recipe"])])),
    structures: Object.fromEntries(items.structures.map((item) => [item.id, pick(item, ["nameKo", "techLevel", "materials", "workers"])])),
    map: Object.fromEntries([...guide.map.points, ...mapPois.points].map((point) => [point.id, pick(point, ["category", "mapId", "x", "y", "level"])])),
  },
};
const snapshotDir = path.join(root, "site/data/patch-snapshots");
await mkdir(snapshotDir, { recursive: true });
await writeFile(path.join(snapshotDir, `${version}.json`), `${JSON.stringify(snapshot)}\n`);
const report = {
  schemaVersion: 1,
  gameVersion: version,
  status: "awaiting-baseline",
  publishApproved: false,
  messageKo: "비교할 이전 버전 스냅샷이 없어 1.0.3 기준선을 생성했습니다. 다음 공식 버전부터 차이를 검수할 수 있습니다.",
  currentSnapshot: `./patch-snapshots/${version}.json`,
  rollbackSnapshot: `./patch-snapshots/${version}.json`,
  generatedAt: snapshot.createdAt,
};
await writeFile(path.join(root, "site/data/patch-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`patch snapshot ${version}: ${Object.keys(snapshot.sections.map).length} map records`);

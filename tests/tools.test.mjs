import test from "node:test";
import assert from "node:assert/strict";
import { parseMapState, createMapSearch } from "../site/map-state.js";
import { recommendBossPals } from "../site/boss-engine.js";
import { validateProgress, toggleProgress, importProgress } from "../site/progress-store.js";
import { inspectSaveContainer } from "../site/save-analyzer.js";
import { analyzeSave } from "../site/save-analyzer.js";
import { diffRecords, createPatchReport } from "../site/patch-diff.js";
import { createItemIndex } from "../site/item-engine.js";
import { productionPlan } from "../site/base-planner.js";
import { readFile } from "node:fs/promises";

test("지도 URL은 허용된 지역과 레이어만 복원한다", () => {
  const parsed = parseMapState("?tab=map&region=main&layers=resource,bad&q=ore", ["resource"], ["main"]);
  assert.deepEqual(parsed, { tab: "map", region: "main", layers: ["resource"], query: "ore" });
  assert.equal(createMapSearch({ region: "main", layers: ["resource"], query: "ore" }), "?tab=map&region=main&layers=resource&q=ore");
});

test("보스 후보는 확인된 상성 및 능력치 합으로만 정렬한다", () => {
  const pals = { a: { name: "A", elements: ["Water"], stats: { hp: 100, shot: 90, defense: 80 } }, b: { name: "B", elements: ["Fire"], stats: { hp: 999 } } };
  assert.equal(recommendBossPals({ counterElements: ["Water"] }, pals)[0].pal.name, "A");
  assert.equal(recommendBossPals({ counterElements: ["Water"] }, pals, ["B"]).length, 0);
});

test("진행 데이터는 허용 ID만 보존하고 잘못된 가져오기를 거부한다", () => {
  const valid = validateProgress({ schemaVersion: 0, completed: ["a", "x"] }, ["a"]);
  assert.deepEqual(valid.completed, { a: true });
  assert.deepEqual(toggleProgress(valid, "a").completed, {});
  assert.throws(() => importProgress("[]", ["a"]));
});

test("세이브 컨테이너는 PlZ만 지원하고 PlM은 이유를 제공한다", () => {
  const plz = new Uint8Array(12); plz.set([80, 108, 90, 0x31], 8);
  assert.equal(inspectSaveContainer(plz.buffer).supported, true);
  const plm = new Uint8Array(12); plm.set([80, 108, 77, 0x31], 8);
  assert.match(inspectSaveContainer(plm.buffer).reason, /Oodle Kraken/);
});

test("PlZ 세이브는 브라우저 내부에서 풀고 확인된 펠 ID만 연결한다", async () => {
  const payload = new TextEncoder().encode("CharacterID WorldTreeDragon");
  const compressed = new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const bytes = new Uint8Array(12 + compressed.length);
  new DataView(bytes.buffer).setUint32(0, payload.length, true);
  new DataView(bytes.buffer).setUint32(4, compressed.length, true);
  bytes.set([80, 108, 90, 0x31], 8); bytes.set(compressed, 12);
  const result = await analyzeSave(bytes.buffer, [{ name: "Astralym", speciesId: "WorldTreeDragon" }, { name: "Other", speciesId: "OtherPal" }]);
  assert.deepEqual(result.pals, ["Astralym"]);
});

test("생산 플래너는 제작 수량과 확인된 작업 적성을 연결한다", () => {
  const data = { items: [{ id: "ore", recipe: null }, { id: "ingot", recipe: { outputQuantity: 2, stations: ["Primitive Furnace"], materials: [{ itemId: "ore", quantity: 3 }] } }], structures: [] };
  const plan = productionPlan("item", "ingot", 3, createItemIndex(data), { fox: { name: "Fox", work: [{ work: "Kindling", label: "불 피우기", level: 2 }] } });
  assert.equal(plan.expansion.rawMaterials.get("ore"), 6);
  assert.equal(plan.workers[0].candidates[0].pal.name, "Fox");
});

test("확장 지도와 활동 데이터는 현재 1.0 계약을 지킨다", async () => {
  const map = JSON.parse(await readFile(new URL("../site/data/map-pois.json", import.meta.url), "utf8"));
  const activities = JSON.parse(await readFile(new URL("../site/data/activities.json", import.meta.url), "utf8"));
  assert.equal(map.points.length, 2687);
  assert.ok(map.points.every((point) => ["main", "world_tree", "sunreach"].includes(point.mapId) && Number.isFinite(point.x) && Number.isFinite(point.y) && point.versionStatus === "current_1_0"));
  assert.ok(map.points.filter((point) => point.deferred).length > 2000);
  assert.equal(activities.bosses.length, 15);
  assert.equal(activities.expeditions.length, 18);
  assert.equal(activities.fishing.pals.length, 39);
  assert.ok(activities.expeditions.flatMap((mission) => mission.rewards).every((reward) => ["guaranteed", "chance"].includes(reward.certainty)));
});

test("패치 비교는 추가·삭제·변경을 분리하고 검수 대기로 둔다", () => {
  assert.deepEqual(diffRecords({ a: 1, b: 2 }, { b: 3, c: 4 }), { added: ["c"], removed: ["a"], changed: ["b"] });
  const report = createPatchReport("1.0.2", "1.0.3", { pals: { before: { a: 1 }, after: { a: 2 } } });
  assert.equal(report.publishApproved, false); assert.equal(report.totalChanges, 1);
});

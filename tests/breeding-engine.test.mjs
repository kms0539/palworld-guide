import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { breed, createBreedingIndex, findParentPairs, findShortestPath } from "../site/breeding-engine.js";

const root = new URL("../", import.meta.url);
const data = JSON.parse(await readFile(new URL("site/data/breeding.json", root), "utf8"));
const index = createBreedingIndex(data);
const id = (name) => data.pals.find((pal) => pal.name === name)?.id;

test("1.0 breeding dataset preserves counts, exclusions and conflict metadata", () => {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.gameVersion, "1.0");
  assert.equal(data.pals.length, 299);
  assert.equal(data.specialCombos.length, 164);
  assert.equal(data.counts.genericPool, 182);
  assert.equal(data.counts.excludedFromGenericPool, 118);
  assert.equal(new Set(data.pals.map((pal) => pal.id)).size, data.pals.length);
  assert.equal(data.mechanics.tieBreakStatus, "conflicting-community-sources");
  assert.equal(data.mechanics.mutation.baseChance, null);
  assert.equal(data.provenance.license, "MIT");
  assert.equal(data.provenance.sourceRevision, "4120331a454842e8f91b8d83cc7b21e64b4a7ade");
});

test("special, same-species, dual-child and verified tie examples resolve", () => {
  assert.deepEqual(breed(id("Relaxaurus"), id("Sparkit"), index).childIds, [id("Relaxaurus Lux")]);
  assert.deepEqual(breed(id("Jetragon"), id("Jetragon"), index).childIds, [id("Jetragon")]);
  assert.deepEqual(new Set(breed(id("Katress"), id("Wixen"), index).childIds), new Set([id("Wixen Noct"), id("Katress Ignis")]));

  const tie = breed(id("Turtacle"), id("Aegidron"), index);
  assert.deepEqual(tie.childIds, [id("Nitemary")]);
  assert.equal(tie.targetRank, 1220);
  assert.equal(tie.disputedTie, true);
});

test("all parent outcomes are symmetric and formula children stay in the generic pool", () => {
  for (let left = 0; left < data.pals.length; left += 1) {
    for (let right = left; right < data.pals.length; right += 1) {
      const forward = breed(data.pals[left].id, data.pals[right].id, index);
      const reverse = breed(data.pals[right].id, data.pals[left].id, index);
      assert.deepEqual(forward, reverse);
      if (forward.kind === "formula") {
        assert.ok(forward.childIds.every((childId) => index.byId.get(childId).inGenericPool));
      }
    }
  }
});

test("reverse lookup and owned-Pal shortest path use the same engine", () => {
  const target = id("Relaxaurus Lux");
  const pairs = findParentPairs(target, index);
  assert.ok(pairs.some((pair) => pair.parentAId === id("Relaxaurus") && pair.parentBId === id("Sparkit") && pair.kind === "special"));

  const path = findShortestPath([id("Relaxaurus"), id("Sparkit")], target, index);
  assert.equal(path.reachable, true);
  assert.equal(path.generations, 1);
  assert.deepEqual(path.steps.map((step) => step.childId), [target]);
});

test("breeding UI exposes all three calculators and browser-only owned storage", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.js", root), "utf8"),
    readFile(new URL("site/enhancements.css", root), "utf8"),
  ]);
  assert.match(html, /data-tab="breeding"/);
  assert.match(html, /type="module"/);
  for (const label of ["부모 → 자식", "목표 → 부모", "보유 펠 → 최단 경로", "계승·변이·케이크"]) assert.ok(app.includes(label));
  assert.match(app, /localStorage\.setItem\(BREEDING_STORAGE_KEY/);
  assert.match(app, /이 브라우저에만 저장되며 서버로 전송되지 않습니다/);
  assert.match(app, /타이브레이크에 출처 이견/);
  assert.match(app, /role="combobox"/);
  assert.match(app, /data-breeding-picker/);
  assert.match(app, /한국어·영문·도감 번호로 목표 검색/);
  assert.match(app, /event\.key === "ArrowDown"/);
  assert.doesNotMatch(app, /<select id="breed-/);
  assert.match(css, /\.breeding-calculator/);
  assert.match(css, /\.breeding-path/);
  assert.match(css, /\.breeding-picker-list/);
});

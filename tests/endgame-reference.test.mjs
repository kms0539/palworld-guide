import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const reference = JSON.parse(await readFile(new URL("site/data/endgame-reference.json", root), "utf8"));
const app = await readFile(new URL("site/app.js", root), "utf8");

test("Korean 1.0.3 reference publishes the complete approved patch checklist", () => {
  assert.equal(reference.schemaVersion, 1);
  assert.equal(reference.gameVersion, "1.0.3");
  assert.equal(reference.patchChanges.length, 8);
  assert.equal(new Set(reference.patchChanges.map(({ id }) => id)).size, 8);
  assert.ok(reference.patchChanges.every(({ titleKo, changeKo, evidenceLevel, sourceUrl }) =>
    titleKo && changeKo && evidenceLevel === "official" && new URL(sourceUrl).protocol === "https:"));
  assert.ok(reference.patchChanges.some(({ entityId }) => entityId === "item:jetragon-s-missile-launcher"));
  assert.ok(reference.patchChanges.some(({ id }) => id === "enemy-camp-near-base-setting"));
});

test("endgame reference fills combat, base, travel and progression gaps", () => {
  const byKind = Object.groupBy(reference.builds, ({ kind }) => kind);
  assert.equal(byKind.combat.length, 2);
  assert.equal(byKind.base.length, 8);
  assert.equal(byKind.travel.length, 3);
  assert.equal(reference.systems.length, 3);
  assert.ok(reference.systems.some(({ summary }) => /116마리/.test(summary)));
  assert.ok(reference.systems.some(({ summary }) => /최대 30%/.test(summary)));
  assert.ok(!JSON.stringify(reference).match(/더블 드롭|돌연변이 확률|던전 우수법/));
});

test("guide UI merges reference builds and renders official patch details", () => {
  assert.match(app, /endgame-reference\.json/);
  assert.match(app, /function allBuilds/);
  assert.match(app, /이동·탐험/);
  assert.match(app, /종결 육성/);
  assert.match(app, /function renderRelatedPatch/);
  assert.match(app, /공개 반영 항목/);
});

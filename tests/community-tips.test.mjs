import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("community tips keep provenance, patch warnings and valid related entities", async () => {
  const [tips, items, registry] = await Promise.all([
    readJson("site/data/community-tips.json"),
    readJson("site/data/items.json"),
    readJson("site/data/data-registry.json"),
  ]);
  const evidenceLevels = new Set(registry.evidenceLevels.map(({ id }) => id));
  const itemIds = new Set(items.items.map(({ id }) => id));
  const structureIds = new Set(items.structures.map(({ id }) => id));
  const ids = new Set();

  assert.equal(tips.schemaVersion, 1);
  assert.equal(tips.gameVersion, "1.0.3");
  assert.ok(tips.tips.length >= 4);

  for (const tip of tips.tips) {
    assert.ok(!ids.has(tip.id), `duplicate tip id: ${tip.id}`);
    ids.add(tip.id);
    assert.ok(evidenceLevels.has(tip.evidenceLevel), `unknown evidence: ${tip.id}`);
    assert.equal(new URL(tip.sourceUrl).protocol, "https:");
    assert.ok(Number.isFinite(Date.parse(tip.checkedAt)), `invalid date: ${tip.id}`);
    assert.ok(tip.titleKo && tip.summaryKo && tip.cautionKo);
    assert.ok(tip.stepsKo.length >= 2);
    assert.ok(tip.contexts.length >= 1);
    assert.ok(tip.sources.length >= 1);
    assert.ok(tip.sources.every(({ url }) => new URL(url).protocol === "https:"));
    assert.ok(tip.related.itemIds.every((id) => itemIds.has(id)), `unknown related item: ${tip.id}`);
    assert.ok(tip.related.structureIds.every((id) => structureIds.has(id)), `unknown related structure: ${tip.id}`);
  }

  assert.equal(tips.tips.find(({ id }) => id === "food-sort-expiration-reset").patchSensitive, true);
  assert.equal(tips.tips.find(({ id }) => id === "grappling-overweight-movement").patchSensitive, true);
  assert.ok(!tips.tips.some(({ id }) => /double|slaughter|mutation|dungeon-rule/.test(id)));
});

test("community tips are reused by the guide UI", async () => {
  const app = await readFile(new URL("site/app.js", root), "utf8");

  assert.match(app, /community-tips\.json/);
  assert.match(app, /renderTipsTool/);
  assert.match(app, /renderRelatedTips/);
  assert.match(app, /공략 팁/);
  assert.match(app, /패치 민감/);
});

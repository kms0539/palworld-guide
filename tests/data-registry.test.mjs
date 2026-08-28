import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const site = new URL("site/", root);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

test("data registry declares the verified patch and evidence contract", async () => {
  const registry = await readJson(new URL("data/data-registry.json", site));

  assert.equal(registry.schemaVersion, 1);
  assert.match(registry.releaseLine, /^\d+\.\d+$/);
  assert.match(registry.latestVerifiedPatch, /^\d+\.\d+\.\d+$/);
  assert.equal(registry.dataCompatibility, `${registry.releaseLine}.x`);
  assert.equal(new URL(registry.officialPatchUrl).protocol, "https:");
  assert.ok(Number.isFinite(Date.parse(registry.versionCheckedAt)));
  assert.ok(Date.parse(registry.versionCheckedAt) <= Date.now());

  assert.deepEqual(
    registry.evidenceLevels.map(({ id }) => id),
    ["official", "game-data", "computed", "community-verified", "editorial"],
  );
  assert.deepEqual(
    registry.requiredProvenanceFields,
    ["gameVersion", "sourceId", "sourceUrl", "checkedAt", "evidenceLevel"],
  );
  assert.equal(registry.conflictPolicy, "preserve-conflict-and-require-review");
});

test("every registered public dataset exists and matches its schema contract", async () => {
  const registry = await readJson(new URL("data/data-registry.json", site));
  const ids = new Set();
  const paths = new Set();

  assert.deepEqual(
    registry.datasets.map(({ id }) => id).sort(),
    ["activities", "breeding", "community-tips", "guide", "item-localization-report", "items", "map-pois", "pal-details", "patch-report", "trait-names-ko", "traits", "visual-assets"],
  );

  for (const dataset of registry.datasets) {
    assert.match(dataset.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(dataset.path, /^data\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/);
    assert.ok(!ids.has(dataset.id), `duplicate dataset id: ${dataset.id}`);
    assert.ok(!paths.has(dataset.path), `duplicate dataset path: ${dataset.path}`);
    assert.ok(["scheduled", "manual-on-patch"].includes(dataset.updateMode));
    assert.equal(typeof dataset.required, "boolean");

    ids.add(dataset.id);
    paths.add(dataset.path);
    const contents = await readJson(new URL(dataset.path, site));
    assert.equal(contents.schemaVersion, dataset.schemaVersion, `${dataset.id} schema mismatch`);
  }
});

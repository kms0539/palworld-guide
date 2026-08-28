import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createItemIndex, expandItemMaterials, expandStructureMaterials, RecipeCycleError } from "../site/item-engine.js";

const root = new URL("../", import.meta.url);
const data = JSON.parse(await readFile(new URL("site/data/items.json", root), "utf8"));
const localizationReport = JSON.parse(await readFile(new URL("site/data/item-localization-report.json", root), "utf8"));
const index = createItemIndex(data);
const app = await readFile(new URL("site/app.js", root), "utf8");
const html = await readFile(new URL("site/index.html", root), "utf8");
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

test("item dataset preserves recipes, structures and the verified 1.0.3 override", () => {
  assert.equal(data.items.length, 1_195);
  assert.equal(data.counts.recipes, 647);
  assert.equal(data.structures.length, 125);
  assert.equal(new Set(data.items.map((item) => item.id)).size, data.items.length);
  assert.equal(data.provenance.sourceRevision, "cf9ecbe832e3a2a9e2d78d6579a082d968b68f17");
  assert.equal(data.provenance.license, null);
  assert.ok(data.items.every((item) => (item.recipe?.stations ?? []).every((station) => typeof station === "string" && station.length > 0)));
  assert.match(pkg.scripts["items:refresh"], /update-item-data\.mjs/);
  assert.match(pkg.scripts["items:refresh"], /sync-item-localization\.mjs/);
  assert.doesNotMatch(pkg.scripts.refresh, /update-item-data\.mjs/);

  const aquatic = index.items.get("item:aquatic-construction-kit");
  assert.equal(aquatic.dataVersion, "1.0.3");
  assert.equal(aquatic.techLevel, 23);
  assert.equal(aquatic.ancientTechPoints, 1);
  assert.deepEqual(Object.fromEntries(aquatic.recipe.materials.map((item) => [item.name, item.quantity])), {
    Cement: 30, Ingot: 10, "Wooden Board": 15,
  });
});

test("every item and structure has a Korean primary label and image coverage is reported", () => {
  const entries = [...data.items, ...data.structures];
  assert.ok(entries.every((entry) => /[가-힣]/.test(entry.nameKo)));
  assert.ok(entries.every((entry) => ["game-data", "editorial"].includes(entry.localizationStatus)));
  assert.equal(data.counts.itemImages, 1_185);
  assert.equal(data.counts.structureImages, 124);
  assert.equal(localizationReport.counts.missingItemImages, 10);
  assert.equal(localizationReport.counts.missingStructureImages, 1);
  assert.equal(localizationReport.counts.editorialTranslations, 29);
  assert.equal(data.items.filter(({ image }) => image).length, data.counts.itemImages);
  assert.equal(data.structures.filter(({ image }) => image).length, data.counts.structureImages);
  assert.ok(entries.filter(({ image }) => image).every(({ image }) => /^\.\/assets\/(items|structures)\/[a-z0-9_-]+\.webp$/.test(image)));
});

test("every referenced item image exists locally and is a real WebP file", async () => {
  const images = [...new Set([...data.items, ...data.structures].map(({ image }) => image).filter(Boolean))];
  assert.equal(images.length, localizationReport.assets.filter(({ status }) => ["existing", "downloaded"].includes(status)).length);
  assert.ok(images.length >= 970);
  await Promise.all(images.map(async (image) => {
    const buffer = await readFile(new URL(`site/${image.slice(2)}`, root));
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF", image);
    assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP", image);
  }));
  assert.equal(localizationReport.source.sourceRevision, "63fb57b4619605f80f17abc4fb6fc62e80ed7142");
  assert.ok(localizationReport.assets.every(({ status, sha256 }) => ["existing", "downloaded", "missing-upstream"].includes(status) && (status === "missing-upstream" || /^[a-f0-9]{64}$/.test(sha256))));
});

test("recursive material totals honor batch output quantities", () => {
  const cement = expandItemMaterials("item:cement", 11, index);
  assert.deepEqual(Object.fromEntries(cement.rawMaterials), {
    "item:stone": 40,
    "item:bone": 2,
    "item:aquatic-pal-fluids": 2,
  });
  assert.deepEqual(cement.crafts[0], { itemId: "item:cement", required: 11, batches: 2, produced: 20 });

  const aquatic = expandItemMaterials("item:aquatic-construction-kit", 1, index);
  assert.deepEqual(Object.fromEntries(aquatic.rawMaterials), {
    "item:stone": 60,
    "item:bone": 3,
    "item:aquatic-pal-fluids": 3,
    "item:ore": 26,
    "item:wood": 188,
  });
});

test("structure materials expand through item recipes", () => {
  const campfire = expandStructureMaterials("structure:campfire", 3, index);
  assert.deepEqual(Object.fromEntries(campfire.rawMaterials), { "item:wood": 30 });
});

test("cyclic recipes fail with a trace instead of recursing forever", () => {
  const cycleData = {
    items: [
      { id: "item:a", recipe: { outputQuantity: 1, materials: [{ itemId: "item:b", quantity: 1 }] } },
      { id: "item:b", recipe: { outputQuantity: 1, materials: [{ itemId: "item:a", quantity: 1 }] } },
    ],
    structures: [],
  };
  const cycleIndex = createItemIndex(cycleData);
  assert.throws(() => expandItemMaterials("item:a", 1, cycleIndex), (error) => {
    assert.ok(error instanceof RecipeCycleError);
    assert.deepEqual(error.path, ["item:a", "item:b", "item:a"]);
    return true;
  });
});

test("item UI exposes search, recursive totals and verified cross-navigation", () => {
  assert.match(html, /data-tab="items">아이템·제작/);
  assert.match(app, /function renderItems\(\)/);
  assert.match(app, /id="item-search"/);
  assert.match(app, /id="item-category"/);
  assert.match(app, /id="item-sort"/);
  assert.match(app, /data-item-quick/);
  assert.match(app, /data-item-more/);
  assert.match(app, /itemImage\(entry/);
  assert.match(app, /localizedItemName\(entry\)/);
  assert.match(app, /이미지 미확인/);
  assert.match(app, /최종 원재료 합계/);
  assert.match(app, /v1\.0\.3 확인 보정/);
  assert.match(app, /data-related-pal/);
  assert.match(app, /data-related-map/);
  assert.match(app, /data-station-link/);
  assert.match(app, /#item-quantity"\)\?\.addEventListener\("input"/);
});

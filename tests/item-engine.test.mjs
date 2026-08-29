import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCraftTree, buildStructureCraftTree, createItemIndex, expandItemMaterials, expandStructureMaterials, RecipeCycleError, summarizeCraftTree } from "../site/item-engine.js";

const root = new URL("../", import.meta.url);
const data = JSON.parse(await readFile(new URL("site/data/items.json", root), "utf8"));
const localizationReport = JSON.parse(await readFile(new URL("site/data/item-localization-report.json", root), "utf8"));
const index = createItemIndex(data);
const app = await readFile(new URL("site/app.js", root), "utf8");
const html = await readFile(new URL("site/index.html", root), "utf8");
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const itemName = (id) => index.items.get(id)?.name ?? index.structures.get(id)?.name ?? id;

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
  const jetragonGear = index.items.get("item:jetragon-s-missile-launcher");
  assert.equal(jetragonGear.dataVersion, "1.0.3");
  assert.equal(jetragonGear.techLevel, 70);
  assert.equal(jetragonGear.patchOverride.evidenceLevel, "official");
  assert.equal(data.counts.patchOverrides, 2);
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

test("the craft tree expands every craftable material down to gathered goods", () => {
  const tree = buildCraftTree("item:aquatic-construction-kit", 1, index);
  assert.equal(tree.craftable, true);
  assert.equal(tree.required, 1);
  assert.deepEqual(tree.children.map((child) => [itemName(child.itemId), child.required, child.craftable]), [
    ["Cement", 30, true], ["Ingot", 10, true], ["Wooden Board", 15, true],
  ]);

  const cement = tree.children[0];
  assert.equal(cement.batches, 3);
  assert.equal(cement.produced, 30);
  assert.equal(cement.surplus, 0);
  assert.deepEqual(cement.children.map((child) => [itemName(child.itemId), child.required, child.craftable]), [
    ["Stone", 60, false], ["Bone", 3, false], ["Aquatic Pal Fluids", 3, false],
  ]);
  // Gathered goods end a branch instead of being listed with an empty recipe.
  assert.ok(cement.children.every((child) => child.children.length === 0));

  // A craftable material keeps expanding, and rounding up to whole batches is
  // visible on the tree itself rather than only in the totals.
  const board = tree.children[2];
  assert.deepEqual(board.children.map((child) => [itemName(child.itemId), child.required, child.craftable]), [
    ["Wood", 150, false], ["Fiber", 75, true], ["Nail", 15, true],
  ]);
  const fiber = board.children[1];
  assert.equal(fiber.batches, 38);
  assert.equal(fiber.produced, 76);
  assert.equal(fiber.surplus, 1);
  assert.deepEqual(board.children[2].children.map((child) => itemName(child.itemId)), ["Ingot"]);
});

test("tree totals agree with the flat expansion and add intermediate craft counts", () => {
  for (const [itemId, quantity] of [["item:aquatic-construction-kit", 1], ["item:cement", 11], ["item:nail", 9]]) {
    const summary = summarizeCraftTree(buildCraftTree(itemId, quantity, index));
    assert.deepEqual(Object.fromEntries(summary.rawMaterials), Object.fromEntries(expandItemMaterials(itemId, quantity, index).rawMaterials), itemId);
  }

  const summary = summarizeCraftTree(buildCraftTree("item:aquatic-construction-kit", 1, index));
  // Ingot is needed by the kit and again by the nails inside its wooden boards,
  // so the from-scratch total has to add both branches up.
  assert.deepEqual(Object.fromEntries([...summary.crafts].map(([id, totals]) => [itemName(id), totals])), {
    Cement: { required: 30, batches: 3, produced: 30 },
    Ingot: { required: 13, batches: 13, produced: 13 },
    "Wooden Board": { required: 15, batches: 15, produced: 15 },
    Fiber: { required: 75, batches: 38, produced: 76 },
    Nail: { required: 15, batches: 3, produced: 15 },
  });
  // The target itself is reported above the totals, so it stays out of them.
  assert.ok(![...summary.crafts.keys()].includes("item:aquatic-construction-kit"));
});

test("structure craft trees expand each build material and total the crafts", () => {
  const tree = buildStructureCraftTree("structure:campfire", 3, index);
  assert.equal(tree.structure, true);
  assert.deepEqual(tree.children.map((child) => [itemName(child.itemId), child.required, child.craftable]), [["Wood", 30, false]]);

  const summary = summarizeCraftTree(tree);
  assert.deepEqual(Object.fromEntries(summary.rawMaterials), Object.fromEntries(expandStructureMaterials("structure:campfire", 3, index).rawMaterials));
  assert.equal(summary.crafts.size, 0);
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
  assert.throws(() => buildCraftTree("item:a", 1, cycleIndex), (error) => {
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
  assert.match(app, /단계별 재료 상세/);
  assert.match(app, /중간 제작물 총 수량/);
  assert.match(app, /function craftTreeNode/);
  assert.match(app, /summarizeCraftTree/);
  assert.match(app, /v1\.0\.3 확인 보정/);
  assert.match(app, /data-related-pal/);
  assert.match(app, /data-related-map/);
  assert.match(app, /data-station-link/);
  assert.match(app, /#item-quantity"\)\?\.addEventListener\("input"/);
});

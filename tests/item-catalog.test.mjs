import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortItems, itemAssetPath, itemEnglishAlias, localizedItemName, localizedStructureValue } from "../site/item-catalog.js";

const entries = [
  { id: "item:cement", name: "Cement", nameKo: "시멘트", category: "material", techLevel: 19, image: "./assets/items/cement.webp", recipe: { stations: ["High Quality Workbench"] } },
  { id: "item:wood", name: "Wood", nameKo: "목재", category: "material", techLevel: null, image: null },
  { id: "item:wing-pack", name: "Wing Pack", nameKo: "윙 팩", category: "technology", techLevel: 60, image: null },
  { id: "item:ai-core", name: "AI Core", nameKo: "AI 코어", category: "material", techLevel: null, image: null },
];

test("Korean names are primary and English remains an explicit alias", () => {
  assert.equal(localizedItemName(entries[0]), "시멘트");
  assert.equal(itemEnglishAlias(entries[0]), "Cement");
  assert.equal(localizedItemName({ name: "Fallback" }), "Fallback");
});

test("search accepts Korean, English and crafting-station terms", () => {
  assert.deepEqual(filterAndSortItems(entries, { query: "시멘트" }).map(({ id }) => id), ["item:cement"]);
  assert.deepEqual(filterAndSortItems(entries, { query: "wood" }).map(({ id }) => id), ["item:wood"]);
  assert.deepEqual(filterAndSortItems(entries, { query: "workbench" }).map(({ id }) => id), ["item:cement"]);
  assert.deepEqual(filterAndSortItems(entries, { query: "윙팩" }).map(({ id }) => id), ["item:wing-pack"]);
  assert.deepEqual(filterAndSortItems(entries, { query: "ai코어" }).map(({ id }) => id), ["item:ai-core"]);
});

test("only local allow-listed WebP paths are accepted", () => {
  assert.equal(itemAssetPath(entries[0]), "./assets/items/cement.webp");
  assert.equal(itemAssetPath({ image: "https://example.com/item.webp" }), "");
  assert.equal(itemAssetPath({ image: "./assets/items/../secret.webp" }), "");
});

test("verified structure metadata is shown in Korean without leaking unknown English", () => {
  assert.equal(localizedStructureValue("Generating Electricity", "workers"), "발전");
  assert.equal(localizedStructureValue("2 pals", "capacity"), "팰 2마리");
  assert.equal(localizedStructureValue("unexpected source value", "workers"), "한국어 설명 미확인");
});

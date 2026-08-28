import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("Pal detail catalogue has stable form IDs and complete provenance", async () => {
  const data = await readJson("site/data/pal-details.json");
  const pals = Object.values(data.pals);

  assert.equal(data.schemaVersion, 2);
  assert.equal(data.gameVersion, "1.0");
  assert.equal(data.sourceRevision, "24088745");
  assert.equal(pals.length, 288);
  assert.equal(new Set(pals.map((pal) => pal.entityId)).size, pals.length);

  for (const pal of pals) {
    assert.equal(pal.entityId, `pal:${pal.formId}`);
    assert.ok(pal.speciesId && pal.formId && pal.slug && pal.name);
    assert.ok(["base", "variant", "boss", "tower-boss", "raid-boss"].includes(pal.formKind));
    assert.ok(Number.isFinite(pal.paldex.number));
    assert.ok(pal.elements === null || (Array.isArray(pal.elements) && pal.elements.length > 0));
    for (const key of ["hp", "melee", "shot", "defense", "support", "food"]) {
      assert.ok(Number.isFinite(pal.stats[key]), `${pal.slug} has no ${key}`);
    }
    assert.equal(pal.provenance.sourceId, "palworld-tools");
    assert.equal(pal.provenance.sourceRevision, data.sourceRevision);
    assert.match(pal.provenance.sourceUrl, /^https:\/\/www\.palworld\.tools\/pals\//);
    assert.ok(Number.isFinite(Date.parse(pal.provenance.checkedAt)));
    assert.equal(pal.provenance.evidenceLevel, "game-data");
  }
  assert.deepEqual(pals.filter((pal) => pal.elements === null).map((pal) => pal.slug), ["astralym"]);
});

test("level skills resolve without invented fallback names", async () => {
  const data = await readJson("site/data/pal-details.json");
  const skills = Object.values(data.pals).flatMap((pal) => pal.activeSkills);

  assert.ok(skills.length >= 2_000);
  assert.equal(skills.filter((skill) => !skill.name).length, 0);
  for (const skill of skills) {
    assert.ok(skill.id && skill.name && skill.element);
    assert.ok(Number.isFinite(skill.level));
    assert.ok(Number.isFinite(skill.power));
    assert.ok(Number.isFinite(skill.cooldown));
  }
});

test("Paldex UI exposes compound filters, detail view and a three-Pal comparison", async () => {
  const app = await readFile(new URL("site/app.js", root), "utf8");
  const css = await readFile(new URL("site/enhancements.css", root), "utf8");

  for (const id of ["pal-search", "pal-element", "pal-work", "pal-sort"]) assert.ok(app.includes(id));
  assert.match(app, /function renderPalDetail/);
  assert.match(app, /function renderPalComparison/);
  assert.match(app, /state\.palCompare\.size >= 3/);
  assert.match(app, /원본에서 확인되지 않음/);
  assert.match(css, /\.pal-inspector/);
  assert.match(css, /\.pal-comparison/);
});

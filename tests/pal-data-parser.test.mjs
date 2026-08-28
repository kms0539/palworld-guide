import assert from "node:assert/strict";
import test from "node:test";
import { nextPayloadText, parseSkillCatalogue, resolveMoves } from "../scripts/pal-data-parser.mjs";

const skill = {
  id: "StoneShotgun",
  name: "Stone Blast",
  desc: "Fires stones forward.",
  element: "Ground",
  category: "Shot",
  power: 80,
  cooldown: 4,
  range: [500, 4000],
  learnedBy: [{ code: "Anubis", slug: "anubis", name: "Anubis" }],
};
const payload = `91:${JSON.stringify([skill])}`;
const html = `<script>self.__next_f.push(${JSON.stringify([1, payload])})</script>`;

test("Next data payloads expose structured active skill records", () => {
  assert.match(nextPayloadText(html), /StoneShotgun/);
  const catalogue = parseSkillCatalogue(html);
  assert.equal(catalogue.size, 1);
  assert.deepEqual(catalogue.get("StoneShotgun"), {
    id: "StoneShotgun",
    name: "Stone Blast",
    description: "Fires stones forward.",
    element: "Ground",
    category: "Shot",
    power: 80,
    cooldown: 4,
  });
});

test("move resolution preserves unknown IDs instead of inventing data", () => {
  const catalogue = parseSkillCatalogue(html);
  assert.deepEqual(resolveMoves([{ move: "StoneShotgun", level: 1 }, { move: "UnknownMove", level: 7 }], catalogue), [
    { id: "StoneShotgun", level: 1, name: "Stone Blast", description: "Fires stones forward.", element: "Ground", category: "Shot", power: 80, cooldown: 4 },
    { id: "UnknownMove", level: 7, name: null, description: null, element: null, category: null, power: null, cooldown: null },
  ]);
});

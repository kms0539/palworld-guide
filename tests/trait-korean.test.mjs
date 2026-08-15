import assert from "node:assert/strict";
import test from "node:test";
import { translateDescription, translateEffect } from "../scripts/trait-korean.mjs";

test("정형 효과 문구를 한국어로 옮긴다", () => {
  const cases = [
    ["Work speed +50%", "작업 속도 +50%"],
    ["Attack +30%, Work speed -50%", "공격 +30%, 작업 속도 -50%"],
    ["Defense +20%", "방어 +20%"],
    ["Movement Speed increases 20%", "이동 속도 20%"],
    ["SAN drops +15.0% faster.", "SAN 감소 +15.0% 빨라짐"],
    ["Hunger decreases +10.0% faster.", "포만도 감소 +10.0% 빨라짐"],
    ["30% increase in Lightning attack damage.", "번개 공격 피해 30% 증가"],
    ["20% decrease in incoming Fire damage.", "받는 불 피해 20% 감소"],
    ["Immune to Knockback", "넉백 면역"],
    ["25% increase in Player Work Speed.", "플레이어 작업 속도 25% 증가"],
    ["Decrease the value of items when sold by 10%", "판매 가격 10% 감소"],
    ["Pacifist.", "비전투 성향"],
  ];
  for (const [english, korean] of cases) {
    assert.equal(translateEffect(english), korean, `failed: ${english}`);
  }
});

test("규칙이 없는 문구는 조용히 통과시키지 않는다", () => {
  assert.equal(translateEffect("Grants an entirely new and unseen effect"), null);
  const result = translateDescription("Work speed +50% · Grants an entirely new and unseen effect");
  assert.deepEqual(result.untranslated, ["Grants an entirely new and unseen effect"]);
  // The English text is kept so nothing disappears from the page.
  assert.match(result.description, /Grants an entirely new and unseen effect/);
  assert.match(result.description, /작업 속도 \+50%/);
});

test("여러 효과는 구분자를 유지한 채 각각 옮긴다", () => {
  const result = translateDescription("Attack +40% · Defense +20% · Immune to Flinch");
  assert.deepEqual(result.untranslated, []);
  assert.equal(result.description, "공격 +40% · 방어 +20% · 경직 면역");
});

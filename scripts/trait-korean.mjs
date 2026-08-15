// Trait effects are formulaic, so they translate deterministically instead of
// depending on a fragile cross-site join. Every published effect must match a
// rule here; the collector fails when coverage drops so new wording is noticed.

const ELEMENTS = {
  Neutral: "무속성", Dragon: "드래곤", Earth: "땅", Fire: "불", Ice: "얼음",
  Lightning: "번개", Water: "물", Dark: "어둠", Grass: "풀",
};

const PLAYER_STATS = {
  "Work Speed": "작업 속도", Attack: "공격", Defense: "방어",
  "Logging Efficiency": "벌목 효율", "Mining Efficiency": "채굴 효율",
};

const IMMUNITIES = {
  Flinch: "경직", Knockback: "넉백", "Explosion Damage": "폭발 피해",
  "Poison Damage": "독 피해", "Burn Damage": "화상 피해",
};

const DROP_SCALE = {
  Slightly: "약간", "": "", Greatly: "크게", Significantly: "상당히", Massively: "대폭",
};

const RESOURCES = {
  Wood: "나무", "Stone and Ore": "돌과 광석", "Wood, Stone, and Ore": "나무·돌·광석",
};

const RULES = [
  [/^Attack (.+), Defense (.+)$/, (m) => `공격 ${m[1]}, 방어 ${m[2]}`],
  [/^Attack (.+), Work speed (.+)$/i, (m) => `공격 ${m[1]}, 작업 속도 ${m[2]}`],
  [/^Work speed (.+), Attack (.+)$/i, (m) => `작업 속도 ${m[1]}, 공격 ${m[2]}`],
  [/^Attack (.+)$/, (m) => `공격 ${m[1]}`],
  [/^Defense \+\{EffectValue.*\}%$/, () => "방어 증가"],
  [/^Defense (.+)$/, (m) => `방어 ${m[1]}`],
  [/^Work speed (.+)$/i, (m) => `작업 속도 ${m[1]}`],
  [/^Movement speed(?: increases)? (.+)$/i, (m) => `이동 속도 ${m[1]}`],
  [/^Max stamina (.+)$/i, (m) => `최대 스태미나 ${m[1]}`],
  [/^Max Health (.+)$/, (m) => `최대 HP ${m[1]}`],
  [/^HP (.+)$/, (m) => `HP ${m[1]}`],
  [/^SAN drops (.+) slower\.?$/, (m) => `SAN 감소 ${m[1]} 느려짐`],
  [/^SAN d(?:rops|receases) (.+) faster\.?$/, (m) => `SAN 감소 ${m[1]} 빨라짐`],
  [/^SAN depletion rate (.+)$/, (m) => `SAN 감소율 ${m[1]}`],
  [/^Hunger decreases (.+) slower\.?$/, (m) => `포만도 감소 ${m[1]} 느려짐`],
  [/^Hunger decreases (.+) faster\.?$/, (m) => `포만도 감소 ${m[1]} 빨라짐`],
  [/^Increases Hunger depletion rate by (.+)$/, (m) => `포만도 감소율 ${m[1]} 증가`],
  [/^Decrease Hunger depletion rate by (.+)$/, (m) => `포만도 감소율 ${m[1]} 감소`],
  [/^(.+) increase (?:in|to) (\w+) attack damage\.?$/, (m) => `${ELEMENTS[m[2]] ?? m[2]} 공격 피해 ${m[1]} 증가`],
  [/^(.+) decrease in incoming (\w+) damage\.?$/, (m) => `받는 ${ELEMENTS[m[2]] ?? m[2]} 피해 ${m[1]} 감소`],
  [/^(\w+) damage reduction (.+)$/, (m) => `받는 ${ELEMENTS[m[1]] ?? m[1]} 피해 ${m[2]} 감소`],
  [/^(.+) increase to defense\.?$/, (m) => `방어 ${m[1]} 증가`],
  [/^(.+) increase in Player (.+?)\.?$/, (m) => `플레이어 ${PLAYER_STATS[m[2]] ?? m[2]} ${m[1]} 증가`],
  [/^Immune to (.+?)\.?$/, (m) => `${IMMUNITIES[m[1]] ?? m[1]} 면역`],
  [/^Aerial Dash (.+)$/, (m) => `공중 대시 ${m[1]}`],
  [/^Swimming speed (.+)$/i, (m) => `수영 속도 ${m[1]}`],
  [/^Jump Count Increase (.+)$/, (m) => `점프 횟수 ${m[1]}`],
  [/^Mounted Jump Count (.+)$/, (m) => `탑승 중 점프 횟수 ${m[1]}`],
  [/^Jump Power Boost$/, () => "점프력 상승"],
  [/^Active skill cooldown reduction (.+)$/, (m) => `액티브 스킬 쿨타임 ${m[1]} 감소`],
  [/^Active skill cooldown extension (.+)$/, (m) => `액티브 스킬 쿨타임 ${m[1]} 증가`],
  [/^Life Steal (.+)$/, (m) => `흡혈 ${m[1]}`],
  [/^Player HP regen (.+)$/, (m) => `플레이어 HP 재생 ${m[1]}`],
  [/^Pal and Player Auto Health Regeneration Rate (.+)$/, (m) => `펠·플레이어 HP 자동 재생 ${m[1]}`],
  [/^Pal Auto Health Regeneration Rate (.+)$/, (m) => `펠 HP 자동 재생 ${m[1]}`],
  [/^Player reload speed (.+)$/, (m) => `플레이어 재장전 속도 ${m[1]}`],
  [/^Player stamina drain (.+)$/, (m) => `플레이어 스태미나 소모 ${m[1]}`],
  [/^Increases the value of items when sold by (.+)$/, (m) => `판매 가격 ${m[1]} 증가`],
  [/^Decrease the value of items when sold by (.+)$/, (m) => `판매 가격 ${m[1]} 감소`],
  [/^(Slightly |Greatly |Significantly |Massively )?[Ii]ncreases the drop amount of (.+?)\.?$/,
    (m) => `${RESOURCES[m[2]] ?? m[2]} 획득량 ${DROP_SCALE[(m[1] ?? "").trim()] ?? ""} 증가`.replace(/\s+/g, " ")],
  [/^World Tree resources will not vanish when approached\.?$/, () => "세계수 자원이 접근해도 사라지지 않음"],
  [/^World Tree harvestables won't vanish when approached\.?$/, () => "세계수 채집물이 접근해도 사라지지 않음"],
  [/^\*This effect is only valid for rideable pals\.?$/, () => "※ 탑승 가능한 펠에게만 적용"],
  [/^Does not sleep(?: at night)? and continues to work(?: even at night)?\.?$/, () => "밤에도 자지 않고 계속 작업"],
  [/^Tends to nap through the day, due to being nocturnal\.?$/, () => "야행성이라 낮에는 주로 잠"],
  [/^Pacifist\.?$/, () => "비전투 성향"],
  [/^Will not reduce the target's Health below (.+?)\.?$/, (m) => `대상 HP를 ${m[1]} 아래로 떨어뜨리지 않음`],
  [/^While at a base, increases egg production speed by (.+) and incubation speed by (.+) for Pals assigned to a Breeding Farm\.?$/,
    (m) => `거점 번식장 배치 시 알 생산 속도 ${m[1]}, 부화 속도 ${m[2]} 증가`],
  [/^Absorbs a portion of the damage dealt to restore COMMON_STATUS_HP\.?$/, () => "입힌 피해의 일부를 HP로 회복"],
];

export function translateEffect(effect) {
  const text = String(effect ?? "").trim();
  if (!text) return null;
  for (const [pattern, render] of RULES) {
    const match = text.match(pattern);
    if (match) return render(match);
  }
  return null;
}

// Returns the Korean description plus the effects that had no rule, so callers
// can fail loudly rather than silently publishing English.
export function translateDescription(description) {
  const effects = String(description ?? "").split(" · ").map((part) => part.trim()).filter(Boolean);
  const translated = [];
  const untranslated = [];
  for (const effect of effects) {
    const korean = translateEffect(effect);
    if (korean) translated.push(korean);
    else { translated.push(effect); untranslated.push(effect); }
  }
  return { description: translated.join(" · "), untranslated };
}

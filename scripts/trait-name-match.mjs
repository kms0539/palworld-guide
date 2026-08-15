// palworld.gg publishes the same 60 breedable traits in English and Korean, but
// each list is alphabetised in its own language and the cards carry no shared
// id. Matching therefore has to be semantic: reduce both descriptions to the
// same canonical (stat, value) signature and require a 1:1 pairing.

const TOKENS = [
  // [token, English pattern, Korean pattern]
  ["worldtree", /World Tree (?:resources|harvestables)/i, /세계수/],
  ["ride_only", /only valid for rideable pals/i, /탑승 가능한 팰에게만/],
  ["water_move", /movement speed on water/i, /물 위 이동 속도/],
  ["move", /movement speed/i, /이동 속도 상승/],
  ["san_slow", /SAN drops .* slower|SAN depletion rate/i, /SAN 수치 쉽게 내려가지 않음/],
  ["san_fast", /SAN d(?:rops|receases) .* faster/i, /SAN 수치 쉽게 내려감/],
  ["hunger_slow", /Hunger decreases .* slower|Decrease Hunger depletion/i, /포만도 쉽게 내려가지 않음/],
  ["hunger_fast", /Hunger decreases .* faster|Increases Hunger depletion/i, /포만도 쉽게 내려감/],
  ["egg", /egg production speed/i, /알 생산 속도/],
  ["breed", /breeding speed is increased/i, /배합 목장에 배치된 동안/],
  ["farming", /Farming's Work Suitability/i, /목장의 작업 적성/],
  ["drop", /Your Dropped Items/i, /자신의 드롭 아이템/],
  ["sell", /value of items when sold/i, /거래 가격 향상/],
  ["cd", /Active skill cooldown/i, /액티브 스킬 쿨타임/],
  ["lifesteal", /Life Steal/i, /생명 흡수/],
  ["absorb", /Absorbs a portion of the damage/i, /흡수하여 HP를 회복/],
  ["nosleep", /Does not sleep/i, /잠들지 않고 계속 일한다/],
  ["both_regen", /Pal and Player Auto Health Regeneration/i, /팰과 플레이어의 HP 자연 회복량/],
  ["player_regen", /Player Auto Health Regeneration/i, /플레이어의 HP 자연 회복/],
  ["pal_regen", /Pal Auto Health Regeneration/i, /팰 HP 자연 회복량/],
  ["mining", /Player Mining Efficiency/i, /플레이어의 채굴 효율/],
  ["logging", /Player Logging Efficiency/i, /플레이어의 벌목 효율/],
  ["player_work", /Player Work Speed/i, /플레이어의 작업 속도/],
  ["player_atk", /Player Attack/i, /플레이어의 공격/],
  ["player_def", /Player Defense/i, /플레이어의 방어/],
  ["reload", /Player Reload Speed/i, /플레이어의 재장전 속도/],
  ["stamina_drain", /Player Stamina Consumption/i, /플레이어의 기력 감소량/],
  ["stamina", /Max stamina/i, /최대 기력/],
  ["mount_jump", /Mounted Jump Count/i, /탑승 중 점프 횟수/],
  ["imm_flinch", /Immune to Flinch/i, /피격 경직 무효/],
  ["imm_knock", /Immune to Knockback/i, /넉백 무효/],
  ["imm_explosion", /Immune to Explosion/i, /폭발 피해 무효/],
  ["imm_poison", /Immune to Poison/i, /독 상태 이상 피해 무효/],
  ["imm_burn", /Immune to Burn/i, /화상 상태 이상 피해 무효/],
  ["elem_neutral", /Neutral attack damage/i, /무속성 공격 피해/],
  ["elem_grass", /Grass attack damage/i, /풀 속성 공격 피해/],
  ["elem_dark", /Dark attack damage/i, /어둠 속성 공격 피해/],
  ["elem_ice", /Ice attack damage/i, /얼음 속성 공격 피해/],
  ["elem_fire", /Fire attack damage/i, /화염 속성 공격 피해/],
  ["elem_lightning", /Lightning attack damage/i, /번개 속성 공격 피해/],
  ["elem_dragon", /Dragon attack damage/i, /용 속성 공격 피해/],
  ["elem_water", /Water attack damage/i, /물 속성 공격 피해/],
  ["elem_earth", /Earth attack damage/i, /땅 속성 공격 피해/],
  ["def_generic", /increase to defense/i, null],
  ["hp", /Max Health|^HP /i, /최대 HP|^HP/],
  ["work", /Work Speed/i, /작업 속도/],
  ["def", /Defense/i, /방어/],
  ["atk", /Attack/i, /공격/],
];

function classify(effect, language) {
  for (const [token, english, korean] of TOKENS) {
    const pattern = language === "ko" ? korean : english;
    if (pattern && pattern.test(effect)) return token;
  }
  return "?";
}

// Values carry the meaning that survives translation; signs are normalised away
// because the two sites disagree on where the minus sign sits.
function values(effect) {
  return (effect.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
}

export function signature(card, language) {
  const parts = card.descr
    .map((effect) => `${classify(effect, language)}:${values(effect)}`)
    .sort();
  return `r${card.rank}|${parts.join("|")}`;
}

// Returns { pairs, unmatched, ambiguous } so callers can fail on an incomplete
// mapping rather than shipping a half-translated catalogue.
export function matchBySignature(english, korean) {
  const koBySignature = new Map();
  for (const card of korean) {
    const key = signature(card, "ko");
    if (!koBySignature.has(key)) koBySignature.set(key, []);
    koBySignature.get(key).push(card);
  }
  const enBySignature = new Map();
  for (const card of english) {
    const key = signature(card, "en");
    if (!enBySignature.has(key)) enBySignature.set(key, []);
    enBySignature.get(key).push(card);
  }

  const pairs = new Map();
  const unmatched = [];
  const ambiguous = [];
  for (const card of english) {
    const key = signature(card, "en");
    const koreanHits = koBySignature.get(key) ?? [];
    const englishHits = enBySignature.get(key) ?? [];
    if (koreanHits.length === 1 && englishHits.length === 1) pairs.set(card.name, koreanHits[0].name);
    else if (koreanHits.length === 0) unmatched.push(card.name);
    else ambiguous.push(`${card.name} (en×${englishHits.length}, ko×${koreanHits.length})`);
  }
  return { pairs, unmatched, ambiguous };
}

#!/usr/bin/env node

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const workDirectory = join(root, ".work");
const outputPath = join(workDirectory, "guide-data.json");
const historyDir = join(workDirectory, "history");
const logPath = join(workDirectory, "guide-update.log");
const now = new Date();
const checkedAt = now.toISOString();

const SOURCE = {
  official: "https://store.steampowered.com/app/1623730/Palworld/",
  officialPatch: "https://store.steampowered.com/news/app/1623730/view/695395286786244641?l=english",
  serverDocs: "https://docs.palworldgame.com/",
  tiers: "https://www.palworld.tools/tier-list",
  editorial: "https://palcompass.com/guides/best-pals",
  orserk: "https://palcompass.com/pals/orserk",
  bakemi: "https://palcompass.com/pals/bakemi",
  combatMeta: "https://www.palmods.gg/blog/palworld-1-0-strongest-pals",
  elementTeams: "https://www.palmods.gg/guides/teams",
  combatBuilds: "https://allthings.how/palworld-1-0-the-best-combat-pals-and-damage-party-builds/",
  map: "https://palworld-map.com/map",
};

const ROLE_SECTIONS = {
  combat: "combat",
  base: "base-work",
  ranch: "ranch",
  early: "early-game",
  groundMount: "ground-mounts",
  flyingMount: "flying-mounts",
  waterMount: "water-mounts",
};

const CURATED_COMBAT_BUILDS = [
  {
    id: "universal-raid-frame", pal: "Neptilius", title: "범용 레이드 프레임", kind: "combat", archetype: "범용·안정형",
    summary: "상대 속성을 모를 때도 작동하는 공격 강화·회복·추가타 중심 5인 파티입니다.", elements: ["Water"], strongAgainst: ["Fire"], weakAgainst: ["Electric"],
    stats: { attack: 145, defense: 125, hp: 105 },
    party: [
      { pal: "Neptilius", role: "주력 공격", effect: "플레이어 공격 뒤에 물 창 추가타를 연결합니다." },
      { pal: "Orserk", role: "활성 펠 강화", effect: "사격 적중을 쌓아 활성 펠의 공격·방어를 누적 강화합니다." },
      { pal: "Solenne", role: "플레이어 강화", effect: "서로 다른 종으로 파티를 구성하면 플레이어 공격을 강화합니다." },
      { pal: "Lyleen", role: "회복", effect: "긴 전투에서 플레이어와 파티 전체를 회복하는 안전장치입니다." },
      { pal: "Frostallion", role: "상성 교체 슬롯", effect: "상대 약점에 맞는 공격 펠로 교체하는 자리입니다." },
    ],
    passives: ["불사", "전설", "평온", "속성 피해 또는 마왕"],
    rotation: ["상대 속성을 확인하고 5번 슬롯을 상성 펠로 교체", "연사 무기로 오서크 누적 강화 유지", "큰 피해 직후 릴린 회복 사용", "주력 기술 재사용 대기 중 상성 펠로 교대"],
    swapAdvice: "불 타입에는 넵티오스를 유지하고, 용에는 빙천마, 물에는 번개 공격수를 넣습니다.", warning: "모노크로나의 서로 다른 종 조건을 깨는 중복 편성은 피하세요.",
  },
  {
    id: "electric-status-chain", pal: "Helzephyr Lux", title: "번개 상태이상 연쇄", kind: "combat", archetype: "물 속성·레이드 공략",
    summary: "플레이어 공격을 번개로 바꾸고 감전과 방전을 연달아 터뜨리는 조합입니다.", elements: ["Electric"], strongAgainst: ["Water"], weakAgainst: ["Ground"],
    stats: { attack: 125, defense: 100, hp: 105 },
    party: [
      { pal: "Helzephyr Lux", role: "속성 변환", effect: "탑승 중 플레이어 공격을 번개 속성으로 바꾸고 공격을 강화합니다." },
      { pal: "Snock", role: "감전 부여", effect: "플레이어 공격에 감전을 부여해 적을 마비시키는 시동 역할입니다." },
      { pal: "Slowatt", role: "추가 방전", effect: "감전된 적을 때릴 때 주변으로 추가 방전 피해를 연결합니다." },
      { pal: "Ophydia", role: "젖음 부여", effect: "젖음 상태로 번개 피해가 잘 들어갈 조건을 만듭니다." },
      { pal: "Orserk", role: "활성 펠 강화", effect: "빠른 사격과 함께 주력 펠 공격·방어 누적을 담당합니다." },
    ],
    passives: ["불사", "전설", "평온", "뇌제 또는 마왕"],
    rotation: ["연미르로 젖음 부여", "라이가루다에 탑승해 무기 공격을 번개로 변환", "감전과 방전이 유지되는 동안 연사", "상태 저항이 오르면 주력 펠 기술로 마무리"],
    swapAdvice: "땅 속성·감전 면역 상대에게는 이 조합을 쓰지 말고 풀 속성 공격 조합으로 교체합니다.", warning: "상태이상 저항이 누적되는 장기전에서는 첫 사이클 이후 효율이 내려갈 수 있습니다.",
  },
  {
    id: "dragon-cyclone", pal: "Eidrolon Ignis", title: "용 속성 공중 편대", kind: "combat", archetype: "어둠 속성 공략·기동형",
    summary: "용 타입 동료 수에 따라 주력 탈것이 강해지고, 파트너 스킬과 누적 강화를 함께 쓰는 공중 조합입니다.", elements: ["Dragon", "Fire"], strongAgainst: ["Dark"], weakAgainst: ["Ice"],
    stats: { attack: 130, defense: 120, hp: 115 },
    party: [
      { pal: "Eidrolon Ignis", role: "주력 탈것", effect: "용·불 동료 수에 따라 공격과 이동 속도가 증가합니다." },
      { pal: "Jetragon", role: "용 화력·기동", effect: "높은 공격 종족값과 미사일, 빠른 이동을 제공합니다." },
      { pal: "Xenolord", role: "파트너 스킬 증폭", effect: "무기를 사용하는 펠의 파트너 스킬 피해를 강화합니다." },
      { pal: "Orserk", role: "누적 강화", effect: "용 타입 슬롯을 채우면서 활성 펠을 사격으로 강화합니다." },
      { pal: "Blazamut Ryu", role: "불·용 보조 딜러", effect: "용 편성 조건을 유지하며 얼음 이외 상대로 화염 대응을 보탭니다." },
    ],
    passives: ["불사", "전설", "평온", "용 속성 피해"],
    rotation: ["헬번을 주력으로 두고 동료 4칸의 타입 조건 확인", "연사로 오서크 누적 강화", "강한 기술 사용 후 제트래곤·제노드란으로 교대", "긴 공격을 피할 때 다시 탑승해 위치 조정"],
    swapAdvice: "얼음 속성 보스에는 편대 전체가 불리하므로 불 속성 전문 조합이나 다른 상성 파티로 바꿉니다.", warning: "타입 조건을 벗어난 회복 펠을 넣으면 헬번의 파티 비례 강화가 줄어듭니다.",
  },
  {
    id: "dark-blackout", pal: "Frostallion Noct", title: "어둠 블랙아웃 파티", kind: "combat", archetype: "무 속성 보스 특화",
    summary: "어둠 속성 변환·실명·고위험 공격 증폭을 겹쳐 무 속성 대상을 빠르게 처리합니다.", elements: ["Dark"], strongAgainst: ["Neutral"], weakAgainst: ["Dragon"],
    stats: { attack: 140, defense: 135, hp: 140 },
    party: [
      { pal: "Frostallion Noct", role: "주력·속성 변환", effect: "탑승 중 공격을 어둠으로 바꾸고 실명과 공격 강화를 제공합니다." },
      { pal: "Celesdir Noct", role: "고위험 증폭", effect: "활성 펠의 체력을 지속 소모하는 대신 공격을 크게 높입니다." },
      { pal: "Solenne", role: "플레이어 강화", effect: "서로 다른 종 조건으로 플레이어 공격을 강화합니다." },
      { pal: "Necromus", role: "마무리 공격", effect: "높은 공격력과 쌍창 소환으로 짧은 화력 공백을 메웁니다." },
      { pal: "Lyleen", role: "체력 복구", effect: "코스모디얼의 체력 소모와 보스 광역 피해를 복구합니다." },
    ],
    passives: ["불사", "전설", "평온", "어둠 속성 피해"],
    rotation: ["흑천마 탑승으로 어둠 변환과 실명 적용", "코스모디얼 증폭은 회복이 준비됐을 때 활성화", "주력 기술 후 켄타나이트로 교대", "위험 체력에서 릴린 회복 후 다시 전개"],
    swapAdvice: "용 속성 상대에게는 쓰지 말고 얼음 속성 공격 조합으로 교체합니다.", warning: "코스모디얼의 강화는 활성 펠 체력을 소모하므로 자동 방치형 운용에 맞지 않습니다.",
  },
  {
    id: "fire-burn-engine", pal: "Jormuntide Ignis", title: "화염·연소 증폭 파티", kind: "combat", archetype: "풀·얼음 속성 공략",
    summary: "연소를 먼저 건 뒤 불 속성 피해와 연소 대상 추가 피해를 집중시키는 조합입니다.", elements: ["Fire", "Dragon"], strongAgainst: ["Grass", "Ice"], weakAgainst: ["Water"],
    party: [
      { pal: "Jormuntide Ignis", role: "주력 공격", effect: "연소된 대상에 추가 피해를 얻는 핵심 공격 펠입니다." },
      { pal: "Renjishi", role: "연소 부여", effect: "연소 상태를 안정적으로 시작하는 시동 펠입니다." },
      { pal: "Finsider Ignis", role: "불 약점 증폭", effect: "불 속성 약점 피해를 보조하는 파티 슬롯입니다." },
      { pal: "Kelpsea Ignis", role: "불 공격 보조", effect: "불 속성 펠의 공격 화력을 보탭니다." },
      { pal: "Lyleen", role: "회복·교체 슬롯", effect: "장기전 회복을 담당하며 짧은 전투에는 추가 불 공격수로 교체 가능합니다." },
    ],
    passives: ["불사", "전설", "평온", "염제 또는 화염 피해"],
    rotation: ["업화무로 연소 부여", "아그니드라의 고위력 기술 집중", "긴 재사용 대기 중 다른 불 공격수로 교대", "연소가 풀리면 다시 상태 부여부터 반복"],
    swapAdvice: "물 속성 보스에는 번개 조합으로 교체합니다.", warning: "연소 면역·저항이 높은 상대에게는 핵심 추가 피해 조건이 무너집니다.",
  },
  {
    id: "ice-anti-dragon", pal: "Frostallion", title: "빙결 대용족 파티", kind: "combat", archetype: "용 속성 공략",
    summary: "얼음 변환과 빙결을 이용해 용 속성을 끊어가며 상대하는 안전형 파티입니다.", elements: ["Ice"], strongAgainst: ["Dragon"], weakAgainst: ["Fire"],
    stats: { attack: 140, defense: 135, hp: 140 },
    party: [
      { pal: "Frostallion", role: "주력·얼음 변환", effect: "탑승 공격을 얼음으로 바꾸고 빙결을 부여합니다." },
      { pal: "Moldron Cryst", role: "얼음 약점 증폭", effect: "얼음 속성 약점을 찌를 때 피해를 보조합니다." },
      { pal: "Foxcicle", role: "얼음 공격 보조", effect: "얼음 주력 펠의 공격 화력을 보완합니다." },
      { pal: "Rayhound Cryst", role: "방어·기동", effect: "얼음 파티의 방어와 이동 보조 슬롯입니다." },
      { pal: "Lyleen", role: "회복", effect: "빙결이 빗나간 구간의 피해를 회복합니다." },
    ],
    passives: ["불사", "전설", "평온", "빙제 또는 얼음 피해"],
    rotation: ["빙천마 탑승으로 얼음 변환", "빙결이 걸린 동안 고위력 기술 집중", "보스가 해빙되면 거리를 벌리고 짧은 기술로 재빙결", "광역 피해 후 릴린 회복"],
    swapAdvice: "불 속성 상대에게는 물 속성 조합으로 바꿉니다.", warning: "빙결은 반복할수록 저항 때문에 덜 안정적일 수 있어 무한 제어를 전제로 삼지 마세요.",
  },
  {
    id: "ground-muddy-breaker", pal: "Hartalis", title: "땅·진흙 브레이커", kind: "combat", archetype: "번개 속성 공략",
    summary: "진흙 상태와 땅 속성 보조 효과를 엮어 번개 적을 안정적으로 압박합니다.", elements: ["Ground"], strongAgainst: ["Electric", "Fire"], weakAgainst: ["Grass"],
    party: [
      { pal: "Hartalis", role: "주력 공격·기동", effect: "높은 땅 속성 전투 성능과 지상 기동을 담당합니다." },
      { pal: "Surfent Terra", role: "진흙 부여", effect: "진흙 상태를 걸어 후속 피해 조건을 만듭니다." },
      { pal: "Pierdon", role: "상태 대상 증폭", effect: "진흙 상태인 대상에 대한 피해를 보조합니다." },
      { pal: "Turtacle Terra", role: "땅 약점 증폭", effect: "땅 속성으로 약점을 찌를 때 피해를 보탭니다." },
      { pal: "Dumud", role: "땅 공격 보조", effect: "땅 속성 주력 펠의 공격 화력을 보완합니다." },
    ],
    passives: ["불사", "전설", "평온", "지제 또는 땅 피해"],
    rotation: ["샌무기로 진흙 부여", "지오르돈의 상태 대상 보조를 유지", "레젠디얼 고위력 기술 집중", "풀 속성 기술이 보이면 즉시 회피·교대"],
    swapAdvice: "풀 속성 상대에게는 불 속성 파티로 교체합니다.", warning: "진흙 상태가 통하지 않으면 지오르돈의 조건부 가치가 내려갑니다.",
  },
  {
    id: "poison-control", pal: "Bakemi", title: "중독 약화·장기전 조합", kind: "combat", archetype: "고화력 보스 억제",
    summary: "중독을 유지해 적 공격을 낮추고, 주력 펠이 안전하게 누적 화력을 내도록 돕습니다.", elements: ["Dark"], strongAgainst: ["Neutral"], weakAgainst: ["Dragon", "Poison immune"],
    party: [
      { pal: "Bakemi", role: "중독·공격 약화", effect: "중독된 대상의 공격을 낮춰 파티 생존을 돕습니다." },
      { pal: "Prixter", role: "중독 압박", effect: "중독된 적을 상대로 추가 전투 압박을 제공합니다." },
      { pal: "Orserk", role: "주력 강화", effect: "활성 공격 펠의 공격과 방어를 누적 강화합니다." },
      { pal: "Lyleen", role: "회복", effect: "상태 유지 중 받은 누적 피해를 복구합니다." },
      { pal: "Necromus", role: "주력 마무리", effect: "무 속성 대상에 강한 어둠 속성 고화력 슬롯입니다." },
    ],
    passives: ["평온", "불사", "흡혈귀", "방어 또는 어둠 피해"], skills: ["독 안개(계승)", "다크 레이저", "다크 위스프"],
    rotation: ["우라미로 중독 부여", "중독 확인 후 스콜피어스와 주력 펠 전개", "오서크 누적 강화 유지", "중독이 풀리면 무리하게 딜하지 말고 다시 부여"],
    swapAdvice: "중독 면역이나 강한 저항을 가진 상대에게는 순수 상성 공격 파티로 교체합니다.", warning: "상태이상 면역이면 우라미와 스콜피어스 두 슬롯의 가치가 동시에 크게 내려갑니다.",
  },
].map((build) => ({
  ...build,
  gameVersion: "1.0.3 확인",
  confidence: "1.0 게임 데이터·복수 공략 교차 검토",
  sourceUrls: [SOURCE.officialPatch, SOURCE.combatMeta, SOURCE.elementTeams, SOURCE.combatBuilds],
}));

function decodeHtml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function text(value) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "kms0539-palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseTables(html) {
  return [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((table) =>
    [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => text(cell[1])))
      .filter((row) => row.length),
  );
}

function parsePalAnchors(html) {
  const result = [];
  const seen = new Set();
  const pattern = /<a[^>]+href="\/pals\/([^"?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const slug = match[1];
    if (seen.has(slug)) continue;
    const content = text(match[2]);
    const scoreMatch = content.match(/^(.*?)\s+(?:Lv\s*)?(\d+(?:\.\d+)?)\s*(?:g)?$/i);
    const name = (scoreMatch?.[1] ?? content).trim();
    if (!name || name.length > 80) continue;
    seen.add(slug);
    result.push({ slug, name, score: scoreMatch ? Number(scoreMatch[2]) : null });
  }
  return result;
}

function parseTierSections(html) {
  const indices = [...html.matchAll(/<div id="([^"]+)" class="hidden">/g)].map((match) => ({ id: match[1], index: match.index }));
  const roles = {};
  for (const [role, sectionId] of Object.entries(ROLE_SECTIONS)) {
    const startIndex = indices.findIndex((entry) => entry.id === sectionId);
    if (startIndex < 0) {
      roles[role] = [];
      continue;
    }
    const start = indices[startIndex].index;
    const end = indices[startIndex + 1]?.index ?? html.length;
    roles[role] = parsePalAnchors(html.slice(start, end)).map((pal, index) => ({ ...pal, rank: index + 1 }));
  }
  return roles;
}

function rowsToRecommendations(rows, type) {
  return rows.slice(1).filter((row) => row.length >= 3).map((row, index) => {
    if (type === "combat") {
      return { rank: Number(row[0]) || index + 1, pal: row[1], role: row[2], reason: row[3] ?? "", evidence: row[4] ?? "편집형 추천" };
    }
    if (type === "base") {
      return { rank: index + 1, workType: row[0], pal: row[1], reason: row[2] ?? "", alternative: row[3] ?? "" };
    }
    if (type === "support") {
      return { rank: index + 1, pal: row[0], role: row[1], reason: row[2] ?? "", limitation: row[3] ?? "" };
    }
    if (type === "travel") {
      return { rank: Number(row[0]) || index + 1, pal: row[1], role: row[2], limitation: row[3] ?? "" };
    }
    return { rank: index + 1, pal: row[0], role: row[1], reason: row[2] ?? "", note: row[3] ?? "" };
  });
}

function parseBuildCards(html, pal) {
  const cards = [];
  const sections = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)];
  for (const section of sections) {
    if (!/Suggested passives/i.test(section[1]) || !/How to use this build/i.test(section[1])) continue;
    const heading = section[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const summary = section[1].match(/<h3[^>]*>[\s\S]*?<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    const version = text(section[1]).match(/Palworld\s+([0-9.]+)/i)?.[1] ?? "1.0";
    const blocks = [...section[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)];
    const values = new Map(blocks.map((block) => [text(block[1]).toLowerCase(), block[2]]));
    const list = (key) => {
      const value = values.get(key) ?? "";
      const items = [...value.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((item) => text(item[1]));
      return items.length ? items : (text(value) ? [text(value)] : []);
    };
    cards.push({
      id: `${slugify(pal)}-${slugify(text(heading?.[1] ?? "build"))}`,
      pal,
      title: text(heading?.[1] ?? "추천 빌드"),
      summary: text(summary?.[1] ?? ""),
      passives: list("suggested passives"),
      skills: list("suggested skills"),
      usage: text(values.get("how to use this build") ?? ""),
      gameVersion: version,
      kind: /base|work/i.test(text(heading?.[1] ?? "")) ? "base" : "combat",
      confidence: "editorial",
      sourceUrl: pal === "Orserk" ? SOURCE.orserk : SOURCE.bakemi,
    });
  }
  return cards;
}

function parseMapProjection(moduleText) {
  const marker = "JSON.parse(`";
  const start = moduleText.indexOf(marker);
  if (start < 0) throw new Error("map projection payload not found");
  const payloadStart = start + marker.length;
  const end = moduleText.indexOf("`),t=", payloadStart);
  if (end < 0) throw new Error("map projection payload end not found");
  return JSON.parse(moduleText.slice(payloadStart, end));
}

function normalizeMapPoint(point) {
  const world = point.coords?.world;
  if (!world || !Number.isFinite(world.x) || !Number.isFinite(world.y)) return null;
  return {
    id: point.id,
    label: point.label,
    category: point.category,
    mapId: point.map_id ?? "main",
    x: Math.round(world.x * 10) / 10,
    y: Math.round(world.y * 10) / 10,
    z: Number.isFinite(world.z) ? Math.round(world.z * 10) / 10 : null,
    level: point.level ?? null,
    gameVersion: point.game_version ?? "unknown",
    versionStatus: point.version_status ?? "unknown",
    confidence: point.confidence ?? "unknown",
    verifiedAt: point.verified_at ?? null,
    source: Array.isArray(point.source) ? point.source.map((source) => ({ name: source.name, url: source.url, license: source.license ?? null })) : [],
  };
}

function assertGuide(data) {
  if (data.schemaVersion !== 1) throw new Error("invalid schema version");
  if (data.pals.length < 250) throw new Error(`pal roster unexpectedly small: ${data.pals.length}`);
  if (data.roles.combat.length < 100) throw new Error(`combat tier unexpectedly small: ${data.roles.combat.length}`);
  if (data.editorial.combat.length < 4 || data.editorial.base.length < 5 || data.editorial.support.length < 3) throw new Error("editorial recommendations incomplete");
  if (data.builds.length < 12) throw new Error(`build cards unexpectedly small: ${data.builds.length}`);
  if (!data.builds.some((build) => build.party?.length === 5 && build.strongAgainst?.length && build.weakAgainst?.length)) throw new Error("rich combat builds are missing");
  if (data.map.points.length < 200) throw new Error(`map payload unexpectedly small: ${data.map.points.length}`);
  if (!data.map.points.every((point) => point.versionStatus === "current_1_0")) throw new Error("legacy map points must not be published");
  if (!data.sources.every((source) => source.url.startsWith("https://"))) throw new Error("invalid source URL");
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function log(message) {
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, `${new Date().toISOString()} ${message}\n`, { encoding: "utf8", flag: "a" });
}

async function pruneHistory() {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(historyDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith("guide-data-") && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  await Promise.all(files.slice(7).map((file) => rm(join(historyDir, file), { force: true })));
}

async function main() {
  await log("guide update started");
  const [tierHtml, editorialHtml, orserkHtml, bakemiHtml, mapHtml] = await Promise.all([
    fetchText(SOURCE.tiers), fetchText(SOURCE.editorial), fetchText(SOURCE.orserk), fetchText(SOURCE.bakemi), fetchText(SOURCE.map),
  ]);

  const palRoster = parsePalAnchors(tierHtml);
  const roles = parseTierSections(tierHtml);
  const tables = parseTables(editorialHtml);
  if (tables.length < 6) throw new Error(`editorial table count changed: ${tables.length}`);

  const mapAsset = mapHtml.match(/\/assets\/map-projection-[^"']+\.js/)?.[0];
  if (!mapAsset) throw new Error("map projection asset not found");
  const mapModule = await fetchText(new URL(mapAsset, SOURCE.map).href, { timeoutMs: 60_000 });
  const mapSourcePoints = parseMapProjection(mapModule);
  const allowedMapCategories = new Set(["fast_travel", "alpha_pal", "boss_tower", "bounty_target", "predator_pal", "oil_rig", "world_tree", "sunreach"]);
  const mapPoints = mapSourcePoints
    .filter((point) => allowedMapCategories.has(point.category))
    .map(normalizeMapPoint)
    .filter((point) => point?.versionStatus === "current_1_0");
  const builds = [...CURATED_COMBAT_BUILDS, ...parseBuildCards(orserkHtml, "Orserk"), ...parseBuildCards(bakemiHtml, "Bakemi")];
  const guide = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    gameVersion: "1.0.x",
    freshness: { status: "current", nextScheduledUpdateLocal: "매일 05:00", staleAfterHours: 36 },
    notices: [
      "종결 빌드와 순위는 공식 정답이 아닌 외부 편집형 추천이며 패치·월드 설정·보유 패시브에 따라 달라집니다.",
      "전투 조합은 공식 v1.0.3 노트까지 확인했습니다. v1.0.3은 오서크 파트너 스킬의 효과 표시 문제를 수정했으며 전투 수치 변경은 별도로 기재하지 않았습니다.",
      "지도에는 1.0 현행으로 검증된 지점만 표시하며 이전 버전·미검증·무효화 지점은 공개 데이터에서 제외합니다.",
      "펠 아이콘과 지도는 MIT 공개 프로젝트 PalDex를 출처와 함께 사용하고, 상단 이미지는 Pocketpair 공식 홍보 자료만 사용합니다.",
    ],
    sources: [
      { id: "palworld-official", name: "Palworld official Steam page", url: SOURCE.official, checkedAt, gameVersion: "1.0.x", kind: "official", license: null },
      { id: "palworld-official-1-0-3", name: "Palworld official v1.0.3 patch notes", url: SOURCE.officialPatch, checkedAt, gameVersion: "1.0.3", kind: "official", license: null },
      { id: "palworld-server-docs", name: "Official Palworld Server Guide", url: SOURCE.serverDocs, checkedAt, gameVersion: "1.0.0", kind: "official-docs", license: null },
      { id: "palworld-tools", name: "palworld.tools 1.0 computed tier lists", url: SOURCE.tiers, checkedAt, gameVersion: "1.0", kind: "computed", license: null },
      { id: "palcompass", name: "PalCompass best Pals editorial", url: SOURCE.editorial, checkedAt, gameVersion: "1.0.1", kind: "editorial", license: null },
      { id: "palmods-combat-meta", name: "PalMods 1.0 combat data and synergy circuits", url: SOURCE.combatMeta, checkedAt, gameVersion: "1.0.3 checked", kind: "computed", license: null },
      { id: "palmods-element-teams", name: "PalMods element team templates and stacking rules", url: SOURCE.elementTeams, checkedAt, gameVersion: "1.0.3 checked", kind: "computed", license: null },
      { id: "allthings-combat-builds", name: "All Things How 1.0 combat builds and elemental matchups", url: SOURCE.combatBuilds, checkedAt, gameVersion: "1.0", kind: "editorial", license: null },
      { id: "palworld-map", name: "Palworld Interactive Map 1.0 Beta", url: SOURCE.map, checkedAt, gameVersion: "1.0", kind: "map-aggregation", license: "per-record" },
      { id: "paldex-assets", name: "PalDex open-source map and icons", url: "https://github.com/catrenelle/PalDex", checkedAt, gameVersion: "1.0", kind: "visual-assets", license: "MIT" },
      { id: "pocketpair-official-media", name: "Pocketpair official Palworld media", url: "https://www.pocketpair.jp/games/palworld/", checkedAt, gameVersion: "1.0", kind: "official-media", license: "Pocketpair copyright" },
      { id: "palworld-gg-korean-names", name: "Palworld.gg Korean Paldeck", url: "https://palworld.gg/ko/pals", checkedAt, gameVersion: "1.0", kind: "localization", license: null },
    ],
    pals: palRoster.map((pal) => ({ ...pal, sourceUrl: `${SOURCE.tiers.replace(/\/tier-list$/, "")}/pals/${pal.slug}` })),
    roles,
    editorial: {
      combat: rowsToRecommendations(tables[0], "combat"),
      base: rowsToRecommendations(tables[1], "base"),
      early: rowsToRecommendations(tables[2], "early"),
      travel: rowsToRecommendations(tables[3], "travel"),
      support: rowsToRecommendations(tables[4], "support"),
      breeding: rowsToRecommendations(tables[5], "breeding"),
    },
    builds,
    map: {
      bounds: { minX: -1099400, maxX: 349400, minY: -724400, maxY: 724400 },
      regions: {
        main: {
          label: "Palpagos",
          terrain: true,
          bounds: { minX: -1099400, maxX: 349400, minY: -724400, maxY: 724400 },
        },
        world_tree: {
          label: "World Tree",
          terrain: true,
          bounds: { minX: 347351.5, maxX: 689148.5, minY: -818197, maxY: -476400 },
        },
        sunreach: {
          label: "Sunreach",
          terrain: false,
          bounds: null,
        },
      },
      points: mapPoints,
      counts: {
        sourcePoints: mapPoints.length,
      },
    },
  };

  assertGuide(guide);
  await mkdir(historyDir, { recursive: true });
  try {
    await stat(outputPath);
    const previous = await readFile(outputPath, "utf8");
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    await writeFile(join(historyDir, `guide-data-${stamp}.json`), previous, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await atomicWrite(outputPath, guide);
  await pruneHistory();
  await log(`guide update completed pals=${guide.pals.length} builds=${guide.builds.length} points=${guide.map.points.length}`);
  process.stdout.write(`${JSON.stringify({ ok: true, outputPath, pals: guide.pals.length, builds: guide.builds.length, points: guide.map.points.length })}\n`);
}

main().catch(async (error) => {
  await log(`guide update failed: ${error.stack ?? error.message}`).catch(() => {});
  process.stderr.write(`Guide update failed: ${error.message}\n`);
  process.exitCode = 1;
});

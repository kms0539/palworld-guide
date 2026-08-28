export const itemCategoryLabels = Object.freeze({
  accessory: "장신구",
  ammo: "탄약",
  armor: "방어구",
  consumable: "소모품",
  ingredient: "식재료",
  key_item: "핵심 아이템",
  material: "재료",
  medicine: "의약품",
  other: "기타",
  sphere: "팰 스피어",
  technology: "기술",
  weapon: "무기",
});

const structureWorkerLabels = Object.freeze({
  Cooling: "냉각",
  "Farming (pal partner skill determines produce)": "목장 (팰 파트너 스킬에 따라 생산물 결정)",
  "Generating Electricity": "발전",
  "Generating Electricity (min Lv6)": "발전 (최소 Lv.6)",
  Handiwork: "수작업",
  "Handiwork (workload)": "수작업 (작업량 적용)",
  "Handiwork + Medicine Production": "수작업 + 제약",
  Kindling: "불 피우기",
  "Kindling + Cooling": "불 피우기 + 냉각",
  Lumbering: "벌목",
  "Medicine Production": "제약",
  Mining: "채광",
  "Mining + Lumbering (1 пал)": "채광 + 벌목 (팰 1마리)",
  "Planting + Watering + Gathering": "파종 + 관개 + 채집",
  Watering: "관개",
  "any 1 male + 1 female pal pair (not a work suitability)": "수컷·암컷 팰 각 1마리 (작업 적성 아님)",
  "any pal (converts labor to power, drains SAN)": "아무 팰 (노동력을 전력으로 변환하며 SAN 소모)",
});

const structureCapacityLabels = Object.freeze({
  "1 egg": "알 1개",
  "1 pal": "팰 1마리",
  "1 pal (fits large pals)": "팰 1마리 (대형 팰 가능)",
  "1 worker slots": "작업 슬롯 1개",
  "10 eggs": "알 10개",
  "2 pals": "팰 2마리",
  "2 pals (1 male + 1 female)": "팰 2마리 (수컷 1 + 암컷 1)",
  "2 pals (pair) + 10 egg slots, auto-incubates": "팰 한 쌍 + 알 슬롯 10개, 자동 부화",
  "4 pals assigned": "팰 4마리 배치",
  "defines base area; base pal slots managed via Palbox (15 base workers by default, expandable via base missions)": "거점 범위 지정; 팰 상자에서 작업 팰 슬롯 관리 (기본 15마리, 거점 미션으로 확장)",
});

export function localizedStructureValue(value, kind) {
  if (!value) return "자료 없음";
  const labels = kind === "capacity" ? structureCapacityLabels : structureWorkerLabels;
  return labels[value] ?? "한국어 설명 미확인";
}

export function localizedItemName(entry) {
  return entry?.nameKo || entry?.name || "명칭 미확인";
}

export function itemEnglishAlias(entry) {
  const localized = localizedItemName(entry);
  return entry?.name && entry.name !== localized ? entry.name : "";
}

export function itemAssetPath(entry) {
  return /^\.\/assets\/(?:items|structures)\/[a-z0-9_-]+\.webp$/.test(entry?.image ?? "") ? entry.image : "";
}

export function filterAndSortItems(entries, { query = "", category = "all", sort = "tech", isStructure = false } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  return entries.filter((entry) => {
    const searchable = [
      localizedItemName(entry),
      entry.name,
      ...(entry.recipe?.stations ?? []),
      entry.workers,
    ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesCategory = isStructure || category === "all" || entry.category === category;
    return matchesQuery && matchesCategory;
  }).sort((a, b) => {
    const nameOrder = localizedItemName(a).localeCompare(localizedItemName(b), "ko-KR");
    if (sort === "name") return nameOrder;
    if (sort === "category") return String(a.category ?? "structure").localeCompare(String(b.category ?? "structure")) || nameOrder;
    return (a.techLevel ?? Number.MAX_SAFE_INTEGER) - (b.techLevel ?? Number.MAX_SAFE_INTEGER) || nameOrder;
  });
}

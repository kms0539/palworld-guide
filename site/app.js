import { breed, createBreedingIndex, findParentPairs, findShortestPath } from "./breeding-engine.js?v=1.12.0";
import { createItemIndex, expandItemMaterials, expandStructureMaterials, RecipeCycleError } from "./item-engine.js?v=1.12.0";
import { filterAndSortItems, itemAssetPath, itemCategoryLabels, itemEnglishAlias, localizedItemName, localizedStructureValue } from "./item-catalog.js?v=1.13.0";
import { parseMapState, createMapSearch } from "./map-state.js?v=1.13.0";
import { bossTypeLabels, recommendBossPals } from "./boss-engine.js?v=1.13.0";
import { productionPlan } from "./base-planner.js?v=1.13.0";
import { emptyProgress, loadProgress, saveProgress, toggleProgress, importProgress } from "./progress-store.js?v=1.13.0";
import { analyzeSave } from "./save-analyzer.js?v=1.13.0";

const defaultLayers = [
  "fast_travel", "alpha_pal", "boss_tower", "bounty_target", "predator_pal", "oil_rig", "world_tree", "sunreach",
];

const state = {
  data: null, assets: null, traits: null, traitIndex: null, details: null, detailIndex: null, breeding: null, breedingIndex: null, items: null, itemIndex: null, itemReport: null, mapPois: null, activities: null, patchReport: null,
  tab: "recommendations", role: "combat", palRole: "all",
  palQuery: "", palElement: "all", palWork: "all", palSort: "paldex", palSelected: null, palCompare: new Set(),
  breedingMode: "pair", breedParentA: "", breedParentB: "", breedTarget: "", breedOwnedAdd: "", breedOwned: new Set(),
  itemKind: "item", itemQuery: "", itemCategory: "all", itemSort: "tech", itemSelected: "", itemQuantity: 1, itemLimit: 60,
  mapQuery: "", mapId: "main", buildKind: "combat", progressionStage: "early", progressionKind: "combat",
  traitQuery: "", traitUsage: "all",
  layers: new Set(defaultLayers), selected: null,
  toolMode: "boss", bossSelected: "", baseTarget: "", baseKind: "item", baseQuery: "", baseQuantity: 1,
  progress: emptyProgress(), progressKind: "pals", activityMode: "fishing", saveResult: null,
};

const progressionKinds = {
  combat: { label: "전투형", description: "전투·탐험·탑승과 파티 지원에 우선할 펠입니다." },
  base: { label: "거점형", description: "생산·채집·목장과 거점 작업에 우선할 펠입니다." },
};

const progressionStages = [
  {
    id: "early", label: "초반", levels: "Lv 1–15", checkpoint: "바람이 부는 언덕 · 첫 번째 타워",
    summary: "운반과 포획 재료, 첫 화력과 지상 이동을 먼저 해결하는 구간입니다.",
    pals: [
      { pal: "Cattiva", kind: "base", role: "운반·초기 거점", reason: "소지 중량과 여러 기초 작업을 한 번에 보완합니다.", replace: "운반 전용 펠과 작업 전문 펠이 갖춰질 때" },
      { pal: "Foxparks", kind: "combat", role: "전투·불 피우기", reason: "하네스로 화염방사기처럼 쓰면서 화로도 전담할 수 있습니다.", replace: "헬고트나 적토조처럼 상위 불 펠을 확보할 때" },
      { pal: "Vixy", kind: "base", role: "목장·포획 재료", reason: "목장에서 팰 스피어와 화살, 골드를 보충해 초반 채집 부담을 줄입니다.", replace: "팰 스피어를 대량 생산할 수 있을 때" },
      { pal: "Daedream", kind: "combat", role: "전투 보조", reason: "전용 장비를 갖추면 플레이어와 함께 추가 공격해 포획 중에도 화력을 냅니다.", replace: "파트너 장비 피해가 주력 전투에 부족해질 때" },
      { pal: "Chillet", kind: "combat", role: "초기 전투·탑승", reason: "초반 알파로 확보하기 쉽고 얼음·용 상성을 함께 준비할 수 있습니다.", replace: "상대 속성별 전투 주력과 빠른 탈것이 생길 때" },
      { pal: "Direhowl", kind: "combat", role: "지상 이동", reason: "낮은 기술 레벨부터 빠르게 탈 수 있어 탐험 시간을 즉시 줄여줍니다.", replace: "파이린·라이버드 또는 실용적인 비행 펠을 얻을 때" },
    ],
  },
  {
    id: "early_mid", label: "초중반", levels: "Lv 16–30", checkpoint: "팰 애호단체 · 화산 진입 준비",
    summary: "첫 비행과 채광, 번식 재료 생산을 시작하며 거점을 역할별로 나누는 구간입니다.",
    pals: [
      { pal: "Penking", kind: "base", role: "다목적 거점", reason: "관개·냉각·채광·수작업·운반을 넓게 맡아 빈 작업을 줄입니다.", replace: "각 작업 레벨이 높은 전문 펠을 배치할 때" },
      { pal: "Digtoise", kind: "base", role: "채광", reason: "광석 수요가 급증하는 시점에 전용 채광 인력으로 효율이 좋습니다.", replace: "아누비스·아스테곤 계열 채광 라인이 갖춰질 때" },
      { pal: "Mossanda", kind: "base", role: "거점·전투", reason: "파종·벌목·수작업·운반과 유탄 전투를 함께 처리합니다.", replace: "거점 전문화 후 단일 작업 고레벨 펠을 쓸 때" },
      { pal: "Elphidran", kind: "combat", role: "첫 실용 비행", reason: "나이트윙 다음 단계에서 체감 속도가 좋은 비행 선택지입니다.", replace: "라이버드나 적토조 안장을 사용할 수 있을 때" },
      { pal: "Beakon", kind: "combat", role: "비행·번개 전투", reason: "레벨 30 전후에 확보 가능한 빠르고 안정적인 중반 비행 펠입니다.", replace: "적토조·호루스·셀레문 등 상위 비행 펠을 얻을 때" },
      { pal: "Grintale", kind: "combat", role: "알 수집 보조", reason: "전용 장비 장착 시 필드 알을 추가로 획득할 확률을 제공합니다.", replace: "교체보다 알 수집 경로를 돌 때만 파티에 투입" },
    ],
  },
  {
    id: "mid", label: "중반", levels: "Lv 31–45", checkpoint: "화산 · 사막 · 생산 거점 전문화",
    summary: "비행 속도와 전투 상성을 올리고 제작·발전·채광을 전문화하는 구간입니다.",
    pals: [
      { pal: "Ragnahawk", kind: "combat", role: "비행·화염", reason: "빠른 비행과 화염 속성 부여, 불 피우기·운반까지 겸합니다.", replace: "호루스·셀레문 또는 종결 비행 펠을 확보할 때" },
      { pal: "Warsect", kind: "combat", role: "전투 탱커", reason: "높은 내구와 방어 보조 덕분에 종결 전까지 안정적인 주력으로 쓸 수 있습니다.", replace: "고난도 보스별 속성 주력 펠을 완성할 때" },
      { pal: "Quivern", kind: "combat", role: "용 전투·탑승", reason: "용 속성 대응과 탑승 전투, 거점 보조를 한 슬롯에서 해결합니다.", replace: "레이번·제트래곤 등 상위 용 비행 펠을 얻을 때" },
      { pal: "Anubis", kind: "base", role: "수작업·채광", reason: "제작 속도와 채광, 운반을 모두 맡고 전투에서도 오랫동안 유효합니다.", replace: "교체하지 않고 종반에는 세크메트 조합이나 전문 펠과 병행" },
      { pal: "Omascul", kind: "combat", role: "경험치 육성", reason: "파티 경험치 보조로 새 전투 펠과 후보군을 빠르게 따라오게 합니다.", replace: "교체보다 집중 육성할 때만 파티에 투입" },
      { pal: "Grizzbolt", kind: "base", role: "발전·전투", reason: "발전 거점과 중반 총기형 전투를 동시에 맡기 좋은 연결 펠입니다.", replace: "세계수 발전 전문 펠을 확보할 때" },
    ],
  },
  {
    id: "mid_late", label: "중후반", levels: "Lv 46–60", checkpoint: "설산 · 사쿠라지마 · 페이브레이크",
    summary: "회복과 고속 비행, 고레벨 생산을 갖추고 레이드 준비를 시작하는 구간입니다.",
    pals: [
      { pal: "Shadowbeak", kind: "combat", role: "어둠 전투", reason: "높은 전투 성능과 기동성을 갖춰 후반 보스 진입 전 주력으로 좋습니다.", replace: "약점 상성에 맞춘 전설·세계수 펠을 완성할 때" },
      { pal: "Lyleen", kind: "base", role: "회복·파종", reason: "파티 회복과 높은 파종·제약 작업으로 전투와 거점 양쪽에 가치가 있습니다.", replace: "회복이 필요하면 계속 사용하고 거점에서는 세계수 전문 펠과 교대" },
      { pal: "Selyne", kind: "combat", role: "전투·비행", reason: "사쿠라지마 단계에서 전투와 이동을 함께 끌어올리는 선택지입니다.", replace: "순수 이동은 레이번·제트래곤, 전투는 보스별 종결 펠로 교체" },
      { pal: "Faleris", kind: "combat", role: "고속 비행·화염", reason: "중후반 장거리 이동과 화염 대응을 안정적으로 담당합니다.", replace: "선리치·세계수 단계의 최상위 비행 펠을 확보할 때" },
      { pal: "Jormuntide Ignis", name: "아그니드라", kind: "base", role: "불 피우기·화염 전투", reason: "고급 제련과 대량 조리의 병목을 줄이면서 화염 전투에도 투입할 수 있습니다.", replace: "종반 전문 불 피우기 펠을 확보해도 보조 인력으로 유지" },
      { pal: "Astegon", kind: "base", role: "채광·어둠 전투", reason: "고급 광석 생산과 어둠·용 전투를 함께 준비할 수 있습니다.", replace: "세계수 채광·운반 전문 펠이 확보될 때" },
      { pal: "Dogen", kind: "combat", role: "귀환 편의", reason: "탐험 중 거점으로 돌아가는 시간을 줄여 장거리 파밍에 유용합니다.", replace: "교체하지 않고 장거리 채집 시 선택적으로 투입" },
    ],
  },
  {
    id: "late", label: "후반", levels: "Lv 61–80", checkpoint: "선리치 · 세계수 · 종결 레이드",
    summary: "최고속 이동, 보스별 속성 파티와 세계수 전문 작업 펠을 완성하는 구간입니다.",
    pals: [
      { pal: "Eidrolon", kind: "combat", role: "종결 비행·용/어둠", reason: "용·어둠 파티 구성과 결합하면 최상위 이동과 전투를 함께 노릴 수 있습니다.", replace: "파티 조건 없는 단순 최고속 이동이 필요하면 제트래곤과 비교" },
      { pal: "Jetragon", kind: "combat", role: "최고속 이동·용 전투", reason: "장거리 왕복을 가장 단순하게 줄여주는 종결급 비행 선택지입니다.", replace: "교체 대상이 아니라 파티 조건과 전투 목적에 따라 레이번과 선택" },
      { pal: "Frostallion", kind: "combat", role: "얼음 전투", reason: "용 속성 보스 대응과 생존, 비행을 함께 맡는 종결급 얼음 펠입니다.", replace: "교체보다 적의 약점과 파티 속성에 맞춰 순환" },
      { pal: "Necromus", kind: "combat", role: "어둠 전투·지상 이동", reason: "높은 공격력과 내구, 빠른 지상 이동을 함께 제공합니다.", replace: "교체보다 보스 속성에 따라 다른 종결 펠과 순환" },
      { pal: "Shaolong", kind: "combat", role: "용 전투", reason: "1.0 후반 콘텐츠에서 강력한 용 속성 주력 후보입니다.", replace: "보스 내성이나 약점에 따라 넵티오스·빙천마 계열과 교대" },
      { pal: "Neptilius", kind: "combat", role: "물 전투", reason: "높은 종족값과 물 속성 화력으로 화염 보스와 종반 전투에 적합합니다.", replace: "교체하지 않고 화염 약점 전투의 주력으로 유지" },
      { pal: "Orserk", kind: "base", role: "전투 지원·발전", reason: "전투 파티 강화와 고부하 발전 설비에 모두 가치가 높은 후반 핵심 펠입니다.", replace: "역할을 나눠 전투 개체와 작업 개체를 별도로 육성" },
      { pal: "Solenne", kind: "base", role: "수작업·파티 지원", reason: "세계수 단계의 높은 수작업 성능과 서로 다른 종의 파티 지원을 제공합니다.", replace: "종결 작업·지원 펠이므로 목적별 개체를 유지" },
    ],
  },
];

const basePlans = {
  early: {
    title: "첫 생활 거점",
    purpose: "먹이·기초 재료·초기 장비를 한곳에서 해결하는 소형 생활 거점입니다.",
    location: "시작 지역에서 넓고 평평하며 큰 펠이 걸리지 않는 곳을 고릅니다. 천연 광맥보다 짧은 작업 동선과 한쪽으로 모이는 습격 진입로를 우선하세요.",
    install: ["팰 상자를 중앙에 놓고 건축 가능 범위를 먼저 확인", "먹이 상자·침대·온천을 가까운 생활 구역으로 묶기", "작업대 옆에 재료 창고, 채석장·벌목장 옆에 산출물 창고 배치", "농장과 먹이 상자 사이를 비우고 넓은 통로 확보"],
    staff: [
      { job: "운반·수작업", workers: [{ pal: "Cattiva", count: 2 }], note: "제작 보조와 드롭 수거" },
      { job: "불 피우기", workers: [{ pal: "Foxparks", count: 1 }], note: "조리와 제련 전담" },
      { job: "관개·냉각", workers: [{ pal: "Pengullet", count: 1 }], note: "농장과 식량 보존" },
      { job: "파종·채집", workers: [{ pal: "Tanzee", count: 1 }], note: "초기 식량 순환" },
      { job: "목장", workers: [{ pal: "Vixy", count: 1 }], note: "스피어 재료 보충" },
    ],
    tip: "초반에는 다목적 펠이 효율적입니다. 작업이 자주 멈추면 새 펠을 늘리기 전에 먹이와 침대, 이동 경로부터 확인하세요.",
  },
  early_mid: {
    title: "자원·목장 보조 거점",
    purpose: "본진의 채광과 목장 병목을 분리해 금속·교배 재료를 안정적으로 공급합니다.",
    location: "두 번째 거점은 평지와 접근성을 우선하고, 천연 광맥을 쓸 경우 팰 상자 범위 안에 광맥과 운반로가 모두 들어오게 배치합니다. 광맥 위에는 시설을 놓지 마세요.",
    install: ["채광 또는 목장 중 거점의 주목적을 하나 선택", "채광 시설과 산출물 창고를 붙이고 운반 통로를 직선으로 확보", "목장은 생산 구역과 분리하고 먹이 상자를 가까이 배치", "발전기와 생산 설비를 추가한 뒤 감시대에서 작업을 고정"],
    staff: [
      { job: "다목적 작업", workers: [{ pal: "Penking", count: 2 }], note: "관개·냉각·운반 보완" },
      { job: "채광", workers: [{ pal: "Digtoise", count: 2 }], note: "광석 생산 집중" },
      { job: "파종·운반", workers: [{ pal: "Mossanda", count: 1 }], note: "빈 작업 보완" },
      { job: "발전", workers: [{ pal: "Sparkit", count: 1 }], note: "초기 전력 유지" },
      { job: "목장", workers: [{ pal: "Beegarde", count: 1 }, { pal: "Mozzarina", count: 1 }], note: "꿀·우유 생산" },
    ],
    tip: "채광과 목장을 한곳에 모두 넣어 동선이 꼬이면 두 번째 거점의 목적을 더 좁히세요. 길드 상자는 거점 간 자재를 옮기는 허브로 활용할 수 있습니다.",
  },
  mid: {
    title: "전문화 생산 거점",
    purpose: "광석을 받아 제련·제작·농업을 연속 처리하는 주 생산 캠퍼스입니다.",
    location: "넓은 평지나 완만한 고지대를 선택합니다. 1.0의 채광 시설을 활용하면 천연 광맥이 없어도 되므로, 방어와 확장 공간을 더 높은 우선순위로 두세요.",
    install: ["원재료·생산·식량의 세 구역으로 바닥 동선을 나누기", "작업대와 제련 시설을 중앙 창고 주변에 배치", "발전·냉각 시설은 담당 펠이 다른 일로 새지 않게 독립 구역화", "외곽에는 방벽과 방어 시설, 내부에는 온천과 여유 침대 확보"],
    staff: [
      { job: "수작업·운반", workers: [{ pal: "Anubis", count: 3 }], note: "제작 병목과 운반 처리" },
      { job: "불 피우기", workers: [{ pal: "Ragnahawk", count: 1 }], note: "제련과 조리" },
      { job: "관개", workers: [{ pal: "Azurobe", count: 1 }], note: "농장·분쇄기 전담" },
      { job: "파종·채집", workers: [{ pal: "Verdash", count: 2 }], note: "식량 생산 순환" },
      { job: "발전", workers: [{ pal: "Grizzbolt", count: 1 }], note: "생산 설비 전력" },
      { job: "벌목·운반", workers: [{ pal: "Wumpo", count: 2 }], note: "목재와 대량 운반" },
    ],
    tip: "생산량이 낮으면 모든 작업자를 늘리기보다 가장 오래 대기하는 시설의 적성 펠을 먼저 교체하세요. 높은 작업 적성 펠은 짧은 시간에 더 많은 일을 처리합니다.",
  },
  mid_late: {
    title: "다거점 생산망",
    purpose: "본진·자원·목장 거점을 분리하고 길드 창고를 중심으로 고급 생산을 연결합니다.",
    location: "원유가 필요하면 선릿 섬 일대처럼 접근하기 쉬운 유전 후보를 보조 거점으로 검토합니다. 고압 원유 추출기를 해금한 뒤에는 자원 노드보다 평지와 방어를 우선해도 됩니다.",
    install: ["본진은 제작, 보조 거점은 자원 또는 목장으로 역할 고정", "각 거점 출입구 가까이에 길드 창고와 일반 분류 창고 배치", "대형 펠용 넓은 통로와 계단 없는 생산 동선을 우선", "진료소·감시대·상급 온천을 생활 구역에 모아 SAN 관리"],
    staff: [
      { job: "불 피우기", workers: [{ pal: "Jormuntide Ignis", count: 2 }], note: "고급 제련·대량 조리" },
      { job: "채광", workers: [{ pal: "Astegon", count: 2 }], note: "고급 광물 생산" },
      { job: "파종·제약", workers: [{ pal: "Lyleen", count: 2 }], note: "식량·약품 공급" },
      { job: "수작업", workers: [{ pal: "Anubis", count: 2 }], note: "생산 라인 마무리" },
      { job: "불·운반 보조", workers: [{ pal: "Faleris", count: 1 }], note: "산출물 회수 보완" },
      { job: "냉각·발전", workers: [{ pal: "Foxcicle", count: 1 }, { pal: "Grizzbolt", count: 1 }], note: "상시 설비 유지" },
    ],
    tip: "작업 고정 후에도 멈춘다면 시설 앞 적재물, 좁은 문, 급한 계단을 먼저 제거하세요. 운반 펠은 1.0에서 적성이 높을수록 주변의 같은 아이템을 더 넓게 모읍니다.",
  },
  late: {
    title: "종결 전문 거점 네트워크",
    purpose: "한 거점에 모든 설비를 넣지 않고 생산·자원·목장·습격 대응을 각각 전문화합니다.",
    location: "선리치 수정 연못(-540, -1361)은 넓은 얕은 물 지형, 소랄라이트 능선(583, 144)은 자원 접근성이 장점인 1.0 후보입니다. 월드 보스와 건축 제한 여부를 현장에서 먼저 확인하세요.",
    install: ["거점마다 핵심 생산물 하나와 보조 생산물 하나만 지정", "고급 시설 주변에 전담 작업자·산출물 창고·운반 펠을 한 묶음으로 구성", "고급 감시대와 진료소로 고정 배치와 SAN 손실 관리", "습격 대응 거점은 생산 거점과 분리하고 방어 시설의 사선을 확보"],
    staff: [
      { job: "불·관개·파종", workers: [{ pal: "Renjishi", count: 1 }, { pal: "Shaolong", count: 1 }, { pal: "Dandilord", count: 1 }], note: "각 최고 적성 전담" },
      { job: "발전·수작업", workers: [{ pal: "Orserk", count: 1 }, { pal: "Solenne", count: 2 }], note: "전력과 최종 제작" },
      { job: "채광", workers: [{ pal: "Aegidron", count: 2 }], note: "종결 광물 생산" },
      { job: "제약·냉각", workers: [{ pal: "Silvance", count: 1 }, { pal: "Bastigor", count: 1 }], note: "대형 거점 유지" },
      { job: "운반", workers: [{ pal: "Knocklem Ignis", count: 2 }], note: "대량 산출물 회수" },
    ],
    tip: "표의 인원은 12자리 안팎 예시입니다. 실제 슬롯과 서버 설정에 맞춰 핵심 작업자는 유지하고, 가장 덜 쓰는 생산 라인부터 줄이세요. 고레벨 작업자를 늘릴 때는 습격 방어도 함께 강화합니다.",
  },
};

const baseGuideSources = [
  { label: "공식 1.0 변경 내역", url: "https://steamcommunity.com/ogg/1623730/announcements/detail/686383649529010624" },
  { label: "공식 서버 거점 설정", url: "https://docs.palworldgame.com/settings-and-operation/configuration/" },
  { label: "1.0.3 작업 적성표", url: "https://genshinlab.com/palworld/best-craft-base-work-pals/" },
  { label: "1.0 거점 위치 후보", url: "https://allthings.how/palworld-1-0-best-base-locations-with-coordinates/" },
  { label: "1.0 거점·습격 운용", url: "https://www.palmods.gg/guides/whats-new/base-and-raids" },
];

const fallbackMapRegions = {
  main: { label: "Palpagos", terrain: true, bounds: { minX: -992817, maxX: 446607, minY: -737574, maxY: 707817 } },
  world_tree: { label: "World Tree", terrain: true, bounds: { minX: 347351.5, maxX: 689148.5, minY: -818197, maxY: -476400 } },
  sunreach: { label: "Sunreach", terrain: true, bounds: { minX: -850000, maxX: -730000, minY: -105000, maxY: 75000 } },
};

const mapRegionLabels = { main: "팰파고스", world_tree: "세계수", sunreach: "선리치" };

const labels = {
  combat: "전투", base: "거점", support: "지원", travel: "이동", breeding: "교배", early: "초반",
  ranch: "목장", groundMount: "지상 이동", flyingMount: "비행", waterMount: "수상 이동",
  fast_travel: "빠른 이동", alpha_pal: "알파 펠", boss_tower: "보스 타워", bounty_target: "현상수배",
  predator_pal: "포식자 펠", oil_rig: "오일 리그", world_tree: "세계수", sunreach: "선리치",
  collectible: "리프몽 석상", schematic: "설계도", journal: "일지", dungeon: "던전", caged_pal: "우리 속 펠",
  watchtower: "감시탑", treasure_map: "보물 지도", warp_point: "워프 지점", skill_fruit: "기술 열매",
  resource: "자원", merchant: "상인", fishing: "낚시터", rare_fishing: "희귀 낚시터",
  official: "공식", "official-docs": "공식 문서", computed: "계산 자료", editorial: "편집형 공략",
  "map-aggregation": "지도 자료", "community-factual": "커뮤니티 좌표", "visual-assets": "시각 자료",
  "official-media": "공식 이미지",
  localization: "한글 명칭",
};

const sourceNames = {
  "palworld-official": "팰월드 공식 Steam 페이지",
  "palworld-official-1-0-3": "팰월드 공식 v1.0.3 패치 노트",
  "palworld-server-docs": "팰월드 공식 서버 안내서",
  "palworld-tools": "palworld.tools 역할별 계산 순위",
  palcompass: "PalCompass 추천 펠 공략",
  "palworld-map": "팰월드 인터랙티브 지도",
  "paldex-assets": "PalDex 오픈소스 지도·펠 아이콘",
  "pocketpair-official-media": "Pocketpair 공식 Palworld 이미지",
  "palworld-gg-korean-names": "Palworld.gg 한국어 펠 도감",
  "palmods-combat-meta": "PalMods 1.0 전투 데이터와 조합",
  "palmods-element-teams": "PalMods 속성 파티와 중첩 규칙",
  "allthings-combat-builds": "All Things How 1.0 전투 빌드",
};

const koText = new Map(Object.entries({
  "Endgame damage": "종반 공격수", "Combat utility": "전투 보조", "Electric / Dragon": "번개·용 속성",
  "Dark damage": "어둠 속성 공격수", "Dragon damage": "용 속성 공격수", Electricity: "발전", Cooling: "냉각",
  Handiwork: "수작업", Medicine: "제약", Mining: "채굴", Planting: "파종", Utility: "범용 보조",
  "Combat support": "전투 지원", "Ground mount": "지상 탈것", "Multi-work utility": "다목적 거점 작업",
  "Mining / combat": "채굴·전투", "Fast endgame travel": "종반 고속 이동", "1.0 exploration": "1.0 탐험용",
  "Travel plus Fire coverage": "이동과 화염 속성 대응", "Accessible mid-to-late flight": "중후반 비행 탈것",
  "Poisoned-target Attack reduction": "중독 대상 공격력 감소", "Poison-team pressure": "중독 조합 화력 보조",
  "Active-fighter support": "주력 전투 펠 지원", Sustain: "생존 유지", "Passive planning": "패시브 설계",
  "Breeding coverage": "교배 조합 확장", "1.0 progression": "1.0 성장 구간", "Utility lineage": "범용 교배 계보",
  "A current high-end carry candidate for damage-focused teams.": "화력 중심 파티에서 주력으로 쓰기 좋은 현행 종반 후보입니다.",
  "Strong endgame value when its role and team support match the encounter.": "전투 상황과 파티 지원이 맞으면 종반에서 높은 가치를 냅니다.",
  "High attack, powerful exclusive skills, and value outside combat.": "높은 공격력과 강력한 전용기, 거점 활용도를 함께 갖췄습니다.",
  "A proven late-game option when a Dark attacker fits the target.": "어둠 속성 공격이 필요한 종반 전투에서 검증된 선택입니다.",
  "Combines combat pressure with excellent world traversal.": "전투 화력과 뛰어난 월드 이동 성능을 동시에 제공합니다.",
  "Late-game power specialist with exceptional electricity work.": "종반 발전 설비에 특화된 최고 수준의 전기 작업 펠입니다.",
  "A specialist pick for demanding cold-storage and cooling tasks.": "대형 냉장 시설과 고부하 냉각 작업에 적합합니다.",
  "Fast production support when crafting is the base bottleneck.": "제작 속도가 병목인 거점에서 생산 시간을 크게 줄여줍니다.",
  "A focused medicine worker for advanced production queues.": "고급 의약품 생산 대기열을 맡기기 좋은 전문 작업 펠입니다.",
  "A late-game specialist for high-volume ore processing loops.": "대량 광석 처리 순환을 위한 종반 채굴 전문 펠입니다.",
  "A specialist choice for farms that need planting throughput.": "파종 처리량이 부족한 대형 농장에 적합합니다.",
  "A low-friction addition that gives a new save immediate practical value.": "초반에 쉽게 확보하면서 바로 실용적인 도움을 받을 수 있습니다.",
  "Adds early pressure while the player handles capture and survival.": "플레이어가 포획과 생존에 집중하는 동안 초반 전투를 보조합니다.",
  "Improves movement before late-game flying routes are realistic.": "종반 비행 펠을 얻기 전 이동 시간을 크게 줄여줍니다.",
  "Covers several useful jobs while the worker roster is still small.": "작업 펠이 적은 초반에 여러 필수 작업을 한 번에 담당합니다.",
  "Combines useful base work with respectable early fighting value.": "유용한 거점 작업과 준수한 초반 전투력을 함께 제공합니다.",
  "Late acquisition and a high setup cost.": "획득 시기가 늦고 준비 비용이 큽니다.",
  "Current movement comparisons remain patch-sensitive.": "이동 성능 비교는 패치에 따라 달라질 수 있습니다.",
  "Not the final pure-speed option.": "순수 최고 속도 선택지는 아닙니다.",
  "Eventually replaced for maximum travel speed.": "최고 이동 속도를 노리면 이후 교체됩니다.",
  "A poison team can apply and maintain the status.": "중독 조합에서 상태 이상을 안정적으로 유지할 때 좋습니다.",
  "Poison resistance or immunity can disable the plan.": "중독 저항이나 면역인 적에게는 효율이 크게 떨어집니다.",
  "You are already building around poisoned targets.": "중독 대상을 중심으로 파티를 구성할 때 효율적입니다.",
  "Needs the same reliable status setup as Bakemi.": "Bakemi와 마찬가지로 안정적인 중독 부여가 필요합니다.",
  "You want Electric coverage and party value together.": "번개 속성 대응과 파티 보조를 함께 원할 때 선택합니다.",
  "Current Partner Skill behavior is version-sensitive.": "파트너 스킬 작동은 버전에 따라 달라질 수 있습니다.",
  "Healing and safer attrition matter more than burst.": "순간 화력보다 회복과 안정적인 장기전을 중시할 때 좋습니다.",
  "Lower value when the encounter rewards short burst windows.": "짧은 순간 화력이 중요한 전투에서는 가치가 낮아집니다.",
  "Useful when targeting trait inheritance across later capture projects.": "후속 포획·교배에서 원하는 특성을 물려줄 때 유용합니다.",
  "Build a clean passive set.": "불필요한 패시브가 섞이지 않도록 정리하세요.",
  "A practical parent project for expanding future combinations.": "이후 교배 조합을 넓히기 위한 실용적인 부모 펠입니다.",
  "Keep both sexes with useful traits.": "유용한 특성을 가진 암수를 모두 보관하세요.",
  "Worth preparing when its descendant routes match your target roster.": "목표 펠로 이어지는 교배 경로가 맞을 때 준비할 가치가 있습니다.",
  "Confirm the current calculator result.": "현재 버전 교배 계산기로 결과를 다시 확인하세요.",
  "A useful intermediate parent in broader breeding plans.": "넓은 교배 계획에서 유용한 중간 부모 펠입니다.",
  "Preserve transferable work passives.": "전승 가능한 작업 패시브를 보존하세요.",
}));

const buildKo = {
  "orserk-combat-burst": { title: "순간 화력 전투 빌드", summary: "높은 공격력과 번개 폭딜, 짧은 스킬 공백을 노립니다.", passives: ["마왕", "운동 바보", "평온", "뇌제"], skills: ["케라우노스", "라이트닝 볼트", "폴리케라우노스"], usage: "전용기로 정체성과 순간 화력을 살리세요. 긴 재사용 대기시간 때문에 쉬는 시간이 길다면 짧은 쿨타임 기술 하나로 교체합니다." },
  "orserk-base-power": { title: "거점 발전 빌드", summary: "종반 전력망의 작업 속도와 가동 시간을 높입니다.", passives: ["악마의 손", "장인 기질", "일 노예", "야행성"], skills: ["거점 작업 중에는 전투 스킬이 중요하지 않음"], usage: "발전 작업을 최우선으로 지정하고 다른 작업에 빠지지 않도록 배치하세요. 세계수 패시브는 더 강할 수 있지만 SAN과 포만도 손해를 확인해야 합니다." },
  "bakemi-poison-support": { title: "중독 지원 빌드", summary: "안정적인 중독 부여와 생존력으로 주력 펠을 지원합니다.", passives: ["평온", "불사", "흡혈귀", "방어형 패시브 1개"], skills: ["독 안개(계승)", "다크 레이저", "다크 위스프"], usage: "독 안개를 먼저 걸고 중독된 대상을 공격해 파트너 효과를 활성화하세요. 중독 추가 압박이 필요하면 Prixter와 조합합니다." },
  "bakemi-base-medicine": { title: "거점 제약 빌드", summary: "제약 레벨 4와 안정적인 작업 지속 시간을 활용합니다.", passives: ["장인 기질", "일 노예", "성실함", "야행성"], skills: ["거점 작업 중에는 전투 스킬이 중요하지 않음"], usage: "제약 작업에 고정 배치하고 전투용 교배 목표와 작업 패시브를 섞지 마세요. 제약 대기열이 비었을 때만 수작업과 운반을 보조하게 합니다." },
};

const content = document.querySelector("#content");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const safeUrl = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; }
};
const localAsset = (value) => /^\.\/assets\/[a-z0-9_./-]+$/i.test(String(value)) ? value : "";
const categoryClass = (category) => `category-${String(category).replace(/[^a-z0-9_-]/gi, "")}`;
const cleanPalName = (value) => String(value ?? "").replace(/\s+(?:Lv\s*)?\d+(?:\.\d+)?\s*g?$/i, "").trim();
const ko = (value) => koText.get(String(value)) ?? String(value ?? "");

const travelReasons = {
  Jetragon: "현행 비행 이동 지표 1위로, 장거리 왕복과 탐험 시간을 가장 크게 줄여줍니다.",
  Eidrolon: "최상위권 비행 속도와 전투 성능을 함께 갖춰 1.0 지역 탐험에 유용합니다.",
  Faleris: "비행 이동과 화염 속성 전투를 한 슬롯에서 해결해 중후반 탐험 편성이 편해집니다.",
  Ragnahawk: "획득 난도와 비행 속도의 균형이 좋아 최고급 탈것을 얻기 전까지 쓰기 좋습니다.",
};

const metricLabels = {
  combat: "전투 지표", base: "거점 지표", early: "초반 획득 Lv",
  groundMount: "지상 속도", flyingMount: "비행 속도", waterMount: "수상 속도",
};

const mapStatusLabels = {
  current_1_0: "1.0 현행 자료",
};
const confidenceLabels = { high: "높음", medium: "보통", low: "낮음", unknown: "확인 필요" };
const towerLabels = {
  "Tower of the Brothers of the Eternal Pyre": "영원한 불꽃의 동지 탑",
  "Tower of the PIDF": "PIDF 탑", "Tower of the PAL Genetic Research Unit": "PAL 유전자 연구부대 탑",
  "Moonflower Tower": "달꽃 탑", "Feybreak Tower": "페이브레이크 탑",
  "Tower of the Rayne Syndicate": "레인 밀렵단 탑", "Tower of the Free Pal Alliance": "팰 애호단체 탑",
};
const mapResourceLabels = {
  "Crude Oil": "원유", "Beautiful Flower": "예쁜 꽃", "Kinship Peach": "유대의 복숭아", "Hexolite Quartz": "헥소라이트 석영",
  "Ancient Lava": "고대 용암", "Ancient Bark": "고대 나무 껍질", Soralite: "솔라이트", "Nightstar Sand": "밤별 모래",
  Coal: "석탄", Ore: "금속 광석", Sulfur: "유황", "Pure Quartz": "순수한 석영", Chromite: "크로마이트", Palkisite: "팰키사이트",
};
const elementLabels = {
  Fire: "불", Water: "물", Grass: "풀", Electric: "번개", Ice: "얼음", Ground: "땅",
  Dark: "어둠", Dragon: "용", Neutral: "무", "Poison immune": "중독 면역",
};
const leaderLabels = { Zoe: "조이", Lily: "릴리", Axel: "액슬", Marcus: "마커스", Victor: "빅터", Saya: "사야", Bjorn: "비요른", Auri: "아우리", Zanara: "자나라" };
const specialBossLabels = { "Bellanoir / Bellanoir Libero": "벨라누아르 / 벨라루주", "Moon Lord": "달의 군주" };

function bossDisplayName(name) {
  return specialBossLabels[name] || displayPalName(name);
}

function displayPalName(value) {
  const pal = palRecord(value);
  return pal ? (state.assets.koreanNames?.[pal.slug] || cleanPalName(pal.name)) : cleanPalName(value);
}

function palRecord(name) {
  const target = cleanPalName(name).toLocaleLowerCase();
  return state.data.pals.find((pal) => cleanPalName(pal.name).toLocaleLowerCase() === target) ?? null;
}

function palImage(name, className = "pal-image") {
  const pal = palRecord(name);
  const asset = pal ? state.assets.pals[pal.slug] : null;
  const path = localAsset(asset?.path);
  return path ? `<img class="${className}" src="${path}" alt="${escapeHtml(displayPalName(name))}" loading="lazy" decoding="async">` : `<div class="${className} placeholder" aria-hidden="true">PAL</div>`;
}

function roleEntry(role, palName) {
  const target = cleanPalName(palName).toLocaleLowerCase();
  return (state.data.roles[role] ?? []).find((pal) => cleanPalName(pal.name).toLocaleLowerCase() === target) ?? null;
}

function recommendationMetric(palName) {
  const preferred = state.role === "travel" ? ["flyingMount", "groundMount", "waterMount"]
    : state.role === "early" ? ["early"] : state.role === "base" ? ["base"] : state.role === "combat" ? ["combat"] : [];
  for (const role of preferred) {
    const entry = roleEntry(role, palName);
    if (entry && Number.isFinite(entry.score)) return `${metricLabels[role]} ${Number(entry.score).toLocaleString()} · 역할 순위 #${entry.rank}`;
  }
  return "";
}

function recommendationReason(item) {
  if (state.role === "early" && item.note) return ko(item.note);
  if (item.reason) return ko(item.reason);
  if (state.role === "travel" && travelReasons[item.pal]) return travelReasons[item.pal];
  return `${displayPalName(item.pal || item.role)}의 ${ko(item.workType || item.role || labels[state.role])} 활용도를 기준으로 고른 추천입니다.`;
}

function mapLabel(point) {
  const raw = String(point.label ?? "").trim();
  if (!raw) return labels[point.category] || "지도 지점";
  if (point.category.startsWith("resource_")) return raw;
  if (point.category === "boss_tower") return towerLabels[raw] || "보스 타워";
  if (point.category === "fast_travel") return raw ? `빠른 이동 · ${raw}` : "빠른 이동 지점";
  if (point.category === "sunreach") return `선리치 · ${raw}`;
  if (point.category === "world_tree") return `세계수 · ${raw}`;
  if (point.category === "bounty_target") return `현상수배 대상${raw.match(/Lv\s*\d+/i)?.[0] ? ` · ${raw.match(/Lv\s*\d+/i)[0]}` : ""}`;
  if (point.category === "oil_rig") {
    const level = raw.match(/Lv\s*(\d+)/i)?.[1];
    return `${level ? `Lv ${level} ` : ""}레인 밀렵단 오일 리그`;
  }
  if (point.category === "alpha_pal" || point.category === "predator_pal") {
    const englishName = raw.replace(/^(Alpha|Predator)\s+/i, "");
    const localized = displayPalName(englishName);
    return `${point.category === "alpha_pal" ? "알파" : "포식자"} ${localized}`;
  }
  if (point.category === "collectible") return `${displayPalName(raw.replace(/\s+Effigy$/i, ""))} 리프몽 석상`;
  if (point.category === "caged_pal") return `우리 속 ${displayPalName(raw.replace(/\s*\(.*$/, ""))}${raw.match(/Lv\s*\d+/i)?.[0] ? ` · ${raw.match(/Lv\s*\d+/i)[0]}` : ""}`;
  if (point.category === "resource") return mapResourceLabels[raw] || "자원 지점";
  if (point.category === "merchant") return raw === "Black Marketeer" ? "암시장 상인" : "방랑 상인";
  if (point.category === "fishing") return "낚시터";
  if (point.category === "rare_fishing") return "희귀 낚시터";
  if (point.category === "watchtower") return "감시탑";
  if (point.category === "treasure_map") return "보물 지도";
  if (point.category === "warp_point") return raw === "Dimensional Warp" ? "차원 워프" : "워프 지점";
  if (point.category === "skill_fruit") return "기술 열매 나무";
  if (point.category === "journal") return "탐험 일지";
  if (point.category === "dungeon") return `던전${raw.match(/Lv\s*\d+/i)?.[0] ? ` · ${raw.match(/Lv\s*\d+/i)[0]}` : ""}`;
  if (point.category === "schematic") {
    const english = raw.replace(/\s+Schematic(?:\s+\d+)?$/i, "");
    const item = state.items?.items.find((entry) => entry.name === english);
    return item ? `${localizedItemName(item)} 설계도` : "설계도";
  }
  return raw || labels[point.category] || "지도 지점";
}

function pointSourceName(source) {
  if (/interactive map/i.test(source.name)) return "팰월드 인터랙티브 지도";
  if (/MapCollectablesMod/i.test(source.name)) return "MapCollectablesMod 공개 좌표";
  if (/PalMap/i.test(source.name)) return "PalMap 게임 파일 지도 자료";
  if (/PalDB/i.test(source.name)) return "PalDB 지도 자료";
  return source.name;
}

function buildSourceLabel(url) {
  if (/store\.steampowered\.com\/news/.test(url)) return "공식 v1.0.3 패치 확인";
  if (/strongest-pals/.test(url)) return "전투 종족값·파트너 스킬";
  if (/guides\/teams/.test(url)) return "속성 파티·중첩 규칙";
  if (/damage-party-builds/.test(url)) return "상성·패시브 공략";
  return "근거 자료";
}

function sectionHeading(number, title, note) {
  return `<div class="heading"><div><span>${number}</span><h2>${title}</h2></div><p>${note}</p></div>`;
}

// Work suitability levels and innate traits are what actually justify a base
// recommendation, so they are looked up by the Pal name the editorial uses.
function palDetail(name) {
  const key = String(name ?? "").trim().toLocaleLowerCase();
  if (!key) return null;
  if (!state.detailIndex) {
    state.detailIndex = new Map(Object.values(state.details?.pals ?? {}).map((detail) => [String(detail.name).toLocaleLowerCase(), detail]));
  }
  return state.detailIndex.get(key) ?? null;
}

function palDetailBySlug(slug) {
  return state.details?.pals?.[slug] ?? null;
}

const WORK_ICONS = {
  kindling: `<svg viewBox="0 0 24 24" class="work-icon work-icon-kindling" fill="currentColor" aria-hidden="true"><path d="M12 2c-.4 2.5-2.2 4.5-4 6.5C6.2 10.6 5 13 5 15.5 5 19.1 7.9 22 11.5 22c3.9 0 7.5-3.1 7.5-7.5 0-3.2-1.8-6.1-3.5-8.5-.5-.7-1-1.3-1.5-2C13.6 3.1 13 2 12 2zm0 16c-1.7 0-3-1.3-3-3 0-1.4 1.1-2.7 2-3.8.3-.4.7-.8 1-1.2.3.5.7 1 1 1.5.8 1 2 2.2 2 3.5 0 1.7-1.3 3-3 3z"/></svg>`,
  watering: `<svg viewBox="0 0 24 24" class="work-icon work-icon-watering" fill="currentColor" aria-hidden="true"><path d="M12 2.5C12 2.5 5 11 5 16a7 7 0 0 0 14 0c0-5-7-13.5-7-13.5zm0 16a4.5 4.5 0 0 1-4.5-4.5c0-1.5 1-3.8 2.5-5.8.5.7 1.2 1.5 2 2.3 0 0 .5.5.8.9.5.6.8 1.3.8 2a1.6 1.6 0 0 1-1.6 1.6z"/></svg>`,
  planting: `<svg viewBox="0 0 24 24" class="work-icon work-icon-planting" fill="currentColor" aria-hidden="true"><path d="M12 22a1 1 0 0 1-1-1v-8c-3.5 0-6.5-2.5-7-6a7 7 0 0 1 7-4c3.5 0 6.5 2.5 7 6a7 7 0 0 1-5 6.9V21a1 1 0 0 1-1 1zm-1-11v-4a5 5 0 0 0-4.9 4c.6 0 3.3 0 4.9 0zm2 0c1.6 0 4.3 0 4.9 0a5 5 0 0 0-4.9-4v4z"/></svg>`,
  generatingelectricity: `<svg viewBox="0 0 24 24" class="work-icon work-icon-electricity" fill="currentColor" aria-hidden="true"><path d="M13 2 4 13.5h6L9 22l11-12.5h-6.5L15 2h-2z"/></svg>`,
  handiwork: `<svg viewBox="0 0 24 24" class="work-icon work-icon-handiwork" fill="currentColor" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm8.5-3.5a7.3 7.3 0 0 0-.1-1.3l2.2-1.7-2-3.5-2.7.9a7.3 7.3 0 0 0-2.2-1.3L15.3 2h-4.6l-.4 2.8a7.3 7.3 0 0 0-2.2 1.3l-2.7-.9-2 3.5 2.2 1.7a7.3 7.3 0 0 0-.1 1.3c0 .4 0 .9.1 1.3L1.4 16.7l2 3.5 2.7-.9a7.3 7.3 0 0 0 2.2 1.3l.4 2.8h4.6l.4-2.8a7.3 7.3 0 0 0 2.2-1.3l2.7.9 2-3.5-2.2-1.7c.1-.4.1-.9.1-1.3z"/></svg>`,
  gathering: `<svg viewBox="0 0 24 24" class="work-icon work-icon-gathering" fill="currentColor" aria-hidden="true"><path d="M19.5 7.5A6.5 6.5 0 0 0 13 1c-4.5 0-7 3.5-7 8 0 2 .7 3.8 2 5.1L4.5 17.6a1 1 0 0 0 1.4 1.4L9.4 15.5c1.1.6 2.3.9 3.6.9 4.5 0 8-3.5 8-8 0-.3 0-.6-.1-.9h-1.4zM13 14.4c-1.8 0-3.3-.9-4.3-2.3l4.8-4.8a1 1 0 0 0-1.4-1.4L7.3 10.7c-.2-.5-.3-1.1-.3-1.7 0-3.3 1.8-6 5-6a5 5 0 0 1 5 5c0 3.5-2 6.4-4 6.4z"/></svg>`,
  lumbering: `<svg viewBox="0 0 24 24" class="work-icon work-icon-lumbering" fill="currentColor" aria-hidden="true"><path d="M4.5 3.5a1 1 0 0 0-1 1.4l1.2 2.4C3.6 8.5 3 10.2 3 12c0 4.4 3.6 8 8 8s8-3.6 8-8c0-1.8-.6-3.5-1.7-4.7l1.2-2.4a1 1 0 0 0-1.4-1.3L15.3 5C14.3 4.4 13.2 4 12 4s-2.3.4-3.3 1L6.9 3.6a1 1 0 0 0-.4-.1h-2zm6.5 3.5a5 5 0 0 1 2 0v10a5 5 0 0 1-2 0V7zm-3 1.2c.6-.4 1.3-.8 2-1v9.6c-.7-.2-1.4-.6-2-1V8.2zm8 0v7.6c-.6.4-1.3.8-2 1V7.2c.7.2 1.4.6 2 1z"/></svg>`,
  mining: `<svg viewBox="0 0 24 24" class="work-icon work-icon-mining" fill="currentColor" aria-hidden="true"><path d="M21.7 6.3a1 1 0 0 0-.2-1.1L18.8 2.5a1 1 0 0 0-1.1-.2C13 3.8 8.6 7.4 5.8 12.3l1.9 1.9c4.9-2.8 8.5-7.2 10.1-11.9l2.7 2.7a1 1 0 0 0 1.2 1.3zM2.3 19.3l7-7 2.4 2.4-7 7a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4z"/></svg>`,
  medicineproduction: `<svg viewBox="0 0 24 24" class="work-icon work-icon-medicine" fill="currentColor" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v2.5a6.5 6.5 0 0 1-3.5 5.8V19h2a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h2v-3.7A6.5 6.5 0 0 1 6.5 9.5V7H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm2 6.5A4.5 4.5 0 0 0 12.5 14a4.5 4.5 0 0 0 4.5-4.5V7H8v2.5z"/></svg>`,
  cooling: `<svg viewBox="0 0 24 24" class="work-icon work-icon-cooling" fill="currentColor" aria-hidden="true"><path d="M11 2v4.1l-2.6-1.5a1 1 0 0 0-1 1.7L10 7.8V11H6.8L5.3 8.4a1 1 0 1 0-1.7 1L5.1 12l-1.5 2.6a1 1 0 1 0 1.7 1L6.8 13H10v3.2l-2.6 1.5a1 1 0 1 0 1 1.7L11 17.9V22h2v-4.1l2.6 1.5a1 1 0 0 0 1-1.7L14 16.2V13h3.2l1.5 2.6a1 1 0 1 0 1.7-1L18.9 12l1.5-2.6a1 1 0 0 0-1.7-1L17.2 11H14V7.8l2.6-1.5a1 1 0 0 0-1-1.7L13 6.1V2h-2z"/></svg>`,
  transporting: `<svg viewBox="0 0 24 24" class="work-icon work-icon-transporting" fill="currentColor" aria-hidden="true"><path d="M21 7.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5l9-4.5 9 4.5zm-10 1.7L5.5 6.4 4 7.2v.3l7 3.5V9.2zm2 0v1.8l7-3.5v-.3l-1.5-.8-5.5 2.8zM5 18h6v-6.2L5 8.9V18zm8 0h6V8.9l-6 2.9V18z"/></svg>`,
  farming: `<svg viewBox="0 0 24 24" class="work-icon work-icon-farming" fill="currentColor" aria-hidden="true"><path d="M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12zm0 16a5.5 5.5 0 0 1-5.5-5.5c0-3.5 2.5-7.5 5.5-9.5 3 2 5.5 6 5.5 9.5A5.5 5.5 0 0 1 12 18z"/></svg>`,
};

const WORK_KEY_MAP = {
  "불피우기": "kindling", "불 피우기": "kindling", "kindling": "kindling",
  "관개": "watering", "watering": "watering",
  "파종": "planting", "planting": "planting",
  "발전": "generatingelectricity", "generatingelectricity": "generatingelectricity", "electricity": "generatingelectricity", "전력": "generatingelectricity",
  "수작업": "handiwork", "손재주": "handiwork", "handiwork": "handiwork", "제작": "handiwork",
  "채집": "gathering", "gathering": "gathering",
  "벌목": "lumbering", "lumbering": "lumbering",
  "채굴": "mining", "채광": "mining", "mining": "mining",
  "제약": "medicineproduction", "medicineproduction": "medicineproduction", "medicine": "medicineproduction", "약품": "medicineproduction",
  "냉각": "cooling", "cooling": "cooling",
  "운반": "transporting", "transporting": "transporting",
  "목장": "farming", "farming": "farming", "ranch": "farming",
};

function workSuitabilityIcon(workType) {
  const text = String(workType ?? "").trim();
  const normalized = text.toLowerCase().replace(/[\s_-]/g, "");
  const mapped = WORK_KEY_MAP[text] || WORK_KEY_MAP[normalized];
  if (mapped && WORK_ICONS[mapped]) return WORK_ICONS[mapped];
  for (const [key, slug] of Object.entries(WORK_KEY_MAP)) {
    if (text.includes(key) && WORK_ICONS[slug]) return WORK_ICONS[slug];
  }
  return "";
}

function workSuitabilityRow(name, workType) {
  const detail = palDetail(name);
  if (!detail || detail.work.length === 0) return "";
  // Lead with the work the recommendation is actually about.
  const wanted = String(workType ?? "").toLocaleLowerCase();
  const ordered = detail.work.slice().sort((a, b) => {
    const aMatch = a.work.toLocaleLowerCase().includes(wanted) || a.label.includes(workType ?? "");
    const bMatch = b.work.toLocaleLowerCase().includes(wanted) || b.label.includes(workType ?? "");
    return (bMatch ? 1 : 0) - (aMatch ? 1 : 0) || b.level - a.level;
  });
  return `<div class="work-row">${ordered.map((entry) => `<span class="work-pill" data-work="${escapeHtml(entry.work)}">${workSuitabilityIcon(entry.work || entry.label)}<strong>${escapeHtml(entry.label)}</strong><em>${entry.level}</em></span>`).join("")}</div>`;
}

function innateTraitRow(name) {
  const detail = palDetail(name);
  if (!detail || detail.innateTraits.length === 0) return "";
  return `<div class="trait-row"><span class="trait-row-label">고유 패시브</span>${detail.innateTraits.map((trait) => traitChip(trait.name)).join("")}</div>`;
}

// Traits worth breeding onto any base Pal, ranked by the catalogue.
function recommendedWorkTraits() {
  const catalogue = (state.traits?.traits ?? []).filter((trait) => /work speed/i.test(trait.description) && trait.polarity === "positive");
  const top = catalogue.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);
  if (top.length === 0) return "";
  return `<div class="trait-row trait-row-wide"><span class="trait-row-label">거점 작업에 추천하는 특성</span>${top.map((trait) => traitChip(trait.name)).join("")}</div>`;
}

function renderRecommendations() {
  const items = state.data.editorial[state.role] ?? [];
  content.innerHTML = `${sectionHeading("01", "목적별 추천 펠", "외부 공략을 한글로 요약한 참고 순위")}
    <div class="roles">${["combat", "base", "support", "travel", "breeding", "early"].map((role) =>
      `<button type="button" data-role="${role}" class="${state.role === role ? "active" : ""}">${labels[role]}</button>`).join("")}</div>
    <div class="cards">${items.map((item) => {
      const palName = state.role === "early" ? item.role : item.pal;
      const metric = recommendationMetric(palName);
      return `<article><div class="card-visual">${palImage(palName)}<span>#${Number(item.rank) || 1}</span></div>
        <div class="card-body"><p class="card-kicker">${escapeHtml(ko(item.workType || item.role || labels[state.role]))}</p>
        <h3>${escapeHtml(displayPalName(palName))}</h3>
        ${metric ? `<div class="card-metric">${escapeHtml(metric)}</div>` : ""}
        <p><strong>추천 사유</strong> · ${escapeHtml(recommendationReason(item))}</p>
        ${workSuitabilityRow(palName, item.workType)}
        ${innateTraitRow(palName)}
        ${item.limitation ? `<small>주의 · ${escapeHtml(ko(item.limitation))}</small>` : ""}
        ${item.alternative ? `<small>대안 · ${escapeHtml(displayPalName(item.alternative))}</small>` : ""}</div></article>`;
    }).join("")}</div>
    ${state.role === "base" ? recommendedWorkTraits() : ""}`;
  content.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    state.role = button.dataset.role; renderRecommendations();
  }));
}

function progressionPalName(item) {
  return item.name || displayPalName(item.pal);
}

function renderBasePlan(stage) {
  const plan = basePlans[stage.id];
  if (!plan) return "";
  const staff = plan.staff.map((item) => `<article class="base-staff-card"><strong>${escapeHtml(item.job)}</strong><span>${item.workers.map((worker) => `${escapeHtml(displayPalName(worker.pal))}${worker.count > 1 ? ` ×${worker.count}` : ""}`).join(" · ")}</span><small>${escapeHtml(item.note)}</small></article>`).join("");
  return `<section class="base-install-guide" aria-labelledby="base-plan-title">
    <header class="base-guide-header"><div><span>PALWORLD 1.0</span><h3 id="base-plan-title">${escapeHtml(plan.title)} 설치·팰 배치</h3><p>${escapeHtml(plan.purpose)}</p></div><strong>${escapeHtml(stage.levels)}</strong></header>
    <div class="base-guide-layout"><article class="base-guide-card"><span>01 · 위치 선정</span><h4>어디에 설치할까</h4><p>${escapeHtml(plan.location)}</p></article><article class="base-guide-card"><span>02 · 설치 순서</span><h4>막힘 없는 배치</h4><ol>${plan.install.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></article></div>
    <div class="base-staffing"><div><span>03 · 팰 배치 예시</span><h4>작업 적성별 최소 구성</h4></div><div class="base-staff-grid">${staff}</div></div>
    <p class="base-guide-tip"><strong>운영 팁</strong>${escapeHtml(plan.tip)}</p>
    <div class="base-guide-sources"><strong>확인 자료</strong>${baseGuideSources.map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ↗</a>`).join("")}</div>
  </section>`;
}

function renderProgression() {
  const stage = progressionStages.find((item) => item.id === state.progressionStage) || progressionStages[0];
  const kind = progressionKinds[state.progressionKind] || progressionKinds.combat;
  const pals = stage.pals.filter((item) => item.kind === state.progressionKind);
  content.innerHTML = `${sectionHeading("02", "성장 단계별 추천", "획득 시점·역할·다음 교체 시점을 함께 확인")}
    <div class="stage-timeline" role="tablist" aria-label="성장 단계 선택">${progressionStages.map((item, index) => `<button type="button" role="tab" data-stage="${item.id}" aria-selected="${stage.id === item.id}" class="${stage.id === item.id ? "active" : ""}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${item.label}</strong><small>${item.levels}</small></button>`).join("")}</div>
    <div class="progression-kind-tabs" role="tablist" aria-label="성장 추천 유형 선택">${Object.entries(progressionKinds).map(([id, item]) => `<button type="button" role="tab" data-progression-kind="${id}" aria-selected="${state.progressionKind === id}" class="${state.progressionKind === id ? "active" : ""}">${item.label}<span>${stage.pals.filter((pal) => pal.kind === id).length}</span></button>`).join("")}</div>
    <section class="stage-summary"><div><span>${escapeHtml(stage.levels)}</span><h3>${escapeHtml(stage.label)} ${escapeHtml(kind.label)} 추천 펠</h3><p>${escapeHtml(stage.summary)} ${escapeHtml(kind.description)}</p></div><strong>${escapeHtml(stage.checkpoint)}</strong></section>
    ${state.progressionKind === "base" ? renderBasePlan(stage) : ""}
    <div class="progression-grid">${pals.map((item) => `<article><div class="progression-visual">${palImage(item.pal, "progression-pal-image")}<span>${escapeHtml(item.role)}</span></div><div class="progression-body"><h3>${escapeHtml(progressionPalName(item))}</h3><p><strong>추천 이유</strong>${escapeHtml(item.reason)}</p><p class="replace"><strong>교체 기준</strong>${escapeHtml(item.replace)}</p></div></article>`).join("")}</div>
    <div class="progression-notes"><p><strong>분류 기준</strong> 공식 1.0 최고 레벨 80과 타워·지역 진행 순서, 실제 안장 및 파트너 장비 활용 시점을 기준으로 나눴습니다.</p><div><a href="https://steamcommunity.com/games/1623730/announcements/detail/686383649529010624" target="_blank" rel="noopener noreferrer">공식 1.0 변경 내역 ↗</a><a href="https://www.palmods.gg/guides/best-early-game-pals" target="_blank" rel="noopener noreferrer">초반 추천 근거 ↗</a><a href="https://www.palmods.gg/blog/palworld-mid-game-guide" target="_blank" rel="noopener noreferrer">중반 진행 근거 ↗</a><a href="https://mobalytics.gg/gamebase/guides/palworld-best-mounts" target="_blank" rel="noopener noreferrer">탈것 비교 ↗</a></div></div>`;
  content.querySelectorAll("[data-stage]").forEach((button) => button.addEventListener("click", () => {
    state.progressionStage = button.dataset.stage;
    renderProgression();
  }));
  content.querySelectorAll("[data-progression-kind]").forEach((button) => button.addEventListener("click", () => {
    state.progressionKind = button.dataset.progressionKind;
    renderProgression();
  }));
}

function rolePals() {
  const source = state.palRole === "all"
    ? state.data.pals.map((pal) => ({ ...pal, rank: null, score: null }))
    : state.data.roles[state.palRole] ?? [];
  const query = state.palQuery.trim().toLocaleLowerCase();
  return source.filter((pal) => {
    const detail = palDetailBySlug(pal.slug);
    const matchesQuery = !query
      || cleanPalName(pal.name).toLocaleLowerCase().includes(query)
      || (state.assets.koreanNames?.[pal.slug] || "").toLocaleLowerCase().includes(query)
      || String(detail?.paldex?.display ?? "").includes(query);
    const matchesElement = state.palElement === "all" || detail?.elements?.includes(state.palElement);
    const matchesWork = state.palWork === "all" || detail?.work?.some((entry) => entry.work === state.palWork);
    return matchesQuery && matchesElement && matchesWork;
  }).sort((a, b) => {
    const detailA = palDetailBySlug(a.slug);
    const detailB = palDetailBySlug(b.slug);
    if (state.palSort === "name") return displayPalName(a.name).localeCompare(displayPalName(b.name), "ko");
    if (state.palSort === "rarity") return (detailB?.rarity ?? -1) - (detailA?.rarity ?? -1) || cleanPalName(a.name).localeCompare(cleanPalName(b.name));
    if (state.palSort === "hp") return (detailB?.stats?.hp ?? -1) - (detailA?.stats?.hp ?? -1) || cleanPalName(a.name).localeCompare(cleanPalName(b.name));
    if (state.palSort === "attack") return (detailB?.stats?.shot ?? -1) - (detailA?.stats?.shot ?? -1) || cleanPalName(a.name).localeCompare(cleanPalName(b.name));
    return (detailA?.paldex?.number ?? Number.MAX_SAFE_INTEGER) - (detailB?.paldex?.number ?? Number.MAX_SAFE_INTEGER)
      || String(detailA?.paldex?.suffix ?? "").localeCompare(String(detailB?.paldex?.suffix ?? ""));
  });
}

function palFormLabel(kind) {
  return ({ base: "기본형", variant: "아종·변형", boss: "보스형", "tower-boss": "타워 보스형", "raid-boss": "레이드 보스형" })[kind] || "형태 미확인";
}

function dataValue(value) {
  return value === null || value === undefined || value === "" ? "자료 없음" : Number.isFinite(value) ? Number(value).toLocaleString() : String(value);
}

function palElementBadges(detail) {
  return `<div class="element-badges">${(detail?.elements ?? []).map((element) => `<b>${escapeHtml(elementLabels[element] || element)}</b>`).join("") || "<span>속성 자료 없음</span>"}</div>`;
}

function palStatRows(detail) {
  const stats = [
    ["HP", detail.stats?.hp], ["근접 공격", detail.stats?.melee], ["원거리 공격", detail.stats?.shot],
    ["방어", detail.stats?.defense], ["지원", detail.stats?.support], ["식사량", detail.stats?.food],
  ];
  return stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${dataValue(value)}</dd></div>`).join("");
}

function palWorkRows(detail) {
  if (!detail.work?.length) return `<p class="empty-data">작업 적성 자료가 없습니다.</p>`;
  return `<div class="work-row">${detail.work.map((entry) => `<span class="work-pill" data-work="${escapeHtml(entry.work)}">${workSuitabilityIcon(entry.work)}<strong>${escapeHtml(entry.label)}</strong><em>${entry.level}</em></span>`).join("")}</div>`;
}

function renderPalComparison() {
  const details = [...state.palCompare].map(palDetailBySlug).filter(Boolean);
  if (details.length === 0) return "";
  const rows = [
    ["도감", (pal) => `#${dataValue(pal.paldex?.display)}`],
    ["속성", (pal) => (pal.elements ?? []).map((element) => elementLabels[element] || element).join(" · ") || "자료 없음"],
    ["HP", (pal) => dataValue(pal.stats?.hp)], ["원거리 공격", (pal) => dataValue(pal.stats?.shot)],
    ["방어", (pal) => dataValue(pal.stats?.defense)], ["달리기", (pal) => dataValue(pal.speed?.run)],
    ["탑승 질주", (pal) => dataValue(pal.speed?.rideSprint)], ["희귀도", (pal) => dataValue(pal.rarity)],
    ["최고 작업", (pal) => pal.work?.[0] ? `${pal.work[0].label} Lv.${pal.work[0].level}` : "자료 없음"],
  ];
  return `<section class="pal-comparison" aria-labelledby="pal-comparison-title"><header><div><span>최대 3마리</span><h3 id="pal-comparison-title">펠 수치 비교</h3></div><button type="button" data-compare-clear>비교 비우기</button></header>
    <div class="comparison-scroll"><table><thead><tr><th scope="col">항목</th>${details.map((pal) => `<th scope="col">${escapeHtml(displayPalName(pal.name))}<button type="button" data-compare-remove="${escapeHtml(pal.slug)}" aria-label="${escapeHtml(displayPalName(pal.name))} 비교에서 제거">×</button></th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${details.map((pal) => `<td>${escapeHtml(value(pal))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}

function renderPalDetail() {
  const detail = palDetailBySlug(state.palSelected);
  if (!detail) return "";
  const compared = state.palCompare.has(detail.slug);
  const compareFull = state.palCompare.size >= 3 && !compared;
  return `<section class="pal-inspector" aria-labelledby="pal-detail-title">
    <header class="pal-inspector-hero">${palImage(detail.name, "pal-detail-image")}<div><span>#${escapeHtml(dataValue(detail.paldex?.display))} · ${escapeHtml(palFormLabel(detail.formKind))}</span><h3 id="pal-detail-title">${escapeHtml(displayPalName(detail.name))}</h3><p>${escapeHtml(detail.name)} · ${escapeHtml(detail.genus || "분류 자료 없음")} · 크기 ${escapeHtml(dataValue(detail.size))}</p>${palElementBadges(detail)}</div><button type="button" data-detail-close aria-label="상세 정보 닫기">닫기</button></header>
    <div class="pal-detail-actions"><button type="button" data-compare-toggle="${escapeHtml(detail.slug)}" ${compareFull ? "disabled" : ""}>${compared ? "비교에서 제거" : compareFull ? "비교는 3마리까지" : "비교에 담기"}</button><a href="${safeUrl(detail.sourceUrl)}" target="_blank" rel="noopener noreferrer">원본 데이터 확인 ↗</a></div>
    <div class="pal-detail-grid"><article><h4>기본 능력치</h4><dl class="pal-stat-list">${palStatRows(detail)}</dl></article><article><h4>이동 속도</h4><dl class="pal-stat-list"><div><dt>걷기</dt><dd>${dataValue(detail.speed?.walk)}</dd></div><div><dt>달리기</dt><dd>${dataValue(detail.speed?.run)}</dd></div><div><dt>탑승 질주</dt><dd>${dataValue(detail.speed?.rideSprint)}</dd></div><div><dt>운반</dt><dd>${dataValue(detail.speed?.transport)}</dd></div></dl></article></div>
    <article class="pal-detail-section"><h4>작업 적성</h4>${palWorkRows(detail)}</article>
    <div class="pal-detail-grid"><article><h4>파트너 스킬</h4>${detail.partnerSkill ? `<strong>${escapeHtml(detail.partnerSkill.name)}</strong><p>${escapeHtml(detail.partnerSkill.description)}</p>` : `<p class="empty-data">자료 없음</p>`}</article><article><h4>고유 패시브</h4>${detail.innateTraits?.length ? detail.innateTraits.map((trait) => `<div class="innate-detail"><strong>${escapeHtml(trait.name)}</strong><p>${escapeHtml(trait.description)}</p></div>`).join("") : `<p class="empty-data">없음 또는 자료 없음</p>`}</article></div>
    <article class="pal-detail-section"><h4>레벨별 액티브 스킬</h4>${detail.activeSkills?.length ? `<div class="skill-table-scroll"><table class="pal-skill-table"><thead><tr><th>Lv</th><th>스킬</th><th>속성</th><th>위력</th><th>CT</th></tr></thead><tbody>${detail.activeSkills.map((skill) => `<tr><td>${dataValue(skill.level)}</td><td><strong>${escapeHtml(skill.name || skill.id)}</strong><small>${escapeHtml(skill.description || "설명 자료 없음")}</small></td><td>${escapeHtml(elementLabels[skill.element] || skill.element || "자료 없음")}</td><td>${dataValue(skill.power)}</td><td>${dataValue(skill.cooldown)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-data">자료 없음</p>`}</article>
    <footer class="pal-data-note"><span>게임 데이터 ${escapeHtml(detail.provenance?.gameVersion || "자료 없음")} · 빌드 ${escapeHtml(detail.provenance?.sourceRevision || "자료 없음")}</span><span>획득 가능 여부: ${detail.obtainable === null ? "원본에서 확인되지 않음" : detail.obtainable ? "가능" : "불가"}</span></footer>
  </section>`;
}

function renderPals() {
  const items = rolePals();
  const roleOptions = ["all", "combat", "base", "ranch", "early", "groundMount", "flyingMount", "waterMount"];
  const details = Object.values(state.details?.pals ?? {});
  const elements = [...new Set(details.flatMap((pal) => pal.elements ?? []))].sort();
  const works = [...new Map(details.flatMap((pal) => pal.work ?? []).map((entry) => [entry.work, entry.label])).entries()].sort((a, b) => a[1].localeCompare(b[1], "ko"));
  content.innerHTML = `${sectionHeading("02", "상세 펠 도감", `${items.length}마리 검색 · 필터 · 정렬 · 최대 3마리 비교`)}
    <div class="pal-filters"><div class="search-row"><label for="pal-search">이름·도감 번호 검색</label><input id="pal-search" type="search" value="${escapeHtml(state.palQuery)}" placeholder="예: 제트래곤, Jetragon, 111" autocomplete="off"></div><label>속성<select id="pal-element"><option value="all">전체 속성</option>${elements.map((element) => `<option value="${escapeHtml(element)}" ${state.palElement === element ? "selected" : ""}>${escapeHtml(elementLabels[element] || element)}</option>`).join("")}</select></label><label>작업 적성<select id="pal-work"><option value="all">전체 작업</option>${works.map(([work, label]) => `<option value="${escapeHtml(work)}" ${state.palWork === work ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label><label>정렬<select id="pal-sort"><option value="paldex" ${state.palSort === "paldex" ? "selected" : ""}>도감 번호</option><option value="name" ${state.palSort === "name" ? "selected" : ""}>이름</option><option value="rarity" ${state.palSort === "rarity" ? "selected" : ""}>희귀도</option><option value="hp" ${state.palSort === "hp" ? "selected" : ""}>HP</option><option value="attack" ${state.palSort === "attack" ? "selected" : ""}>원거리 공격</option></select></label></div>
    <div class="roles">${roleOptions.map((role) => `<button type="button" data-pal-role="${role}" class="${state.palRole === role ? "active" : ""}">${role === "all" ? "전체" : labels[role]}</button>`).join("")}</div>
    ${renderPalComparison()}${renderPalDetail()}
    <div class="pal-grid">${items.slice(0, 160).map((pal) => { const detail = palDetailBySlug(pal.slug); const compared = state.palCompare.has(pal.slug); return `<article class="pal-card ${state.palSelected === pal.slug ? "selected" : ""}"><button type="button" class="pal-card-open" data-pal-detail="${escapeHtml(pal.slug)}">${palImage(pal.name)}<span class="sr-only">${escapeHtml(displayPalName(pal.name))} 상세 보기</span></button><div><span>#${escapeHtml(dataValue(detail?.paldex?.display))} · ${escapeHtml(palFormLabel(detail?.formKind))}</span><h3>${escapeHtml(displayPalName(pal.name))}</h3><p>${escapeHtml(cleanPalName(pal.name))} · ${(detail?.elements ?? []).map((element) => escapeHtml(elementLabels[element] || element)).join(" · ") || "속성 자료 없음"}</p><div class="pal-card-actions"><button type="button" data-pal-detail="${escapeHtml(pal.slug)}">상세 보기</button><button type="button" data-compare-toggle="${escapeHtml(pal.slug)}" ${(state.palCompare.size >= 3 && !compared) ? "disabled" : ""}>${compared ? "비교 제거" : "비교 담기"}</button></div></div></article>`; }).join("")}</div>
    ${items.length > 160 ? `<p class="result-note">화면 성능을 위해 첫 160마리만 표시합니다. 검색과 필터는 전체 ${items.length}마리에 적용됩니다.</p>` : ""}`;
  content.querySelectorAll("[data-pal-role]").forEach((button) => button.addEventListener("click", () => { state.palRole = button.dataset.palRole; renderPals(); }));
  content.querySelectorAll("[data-pal-detail]").forEach((button) => button.addEventListener("click", () => { state.palSelected = button.dataset.palDetail; renderPals(); content.querySelector(".pal-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  content.querySelectorAll("[data-compare-toggle]").forEach((button) => button.addEventListener("click", () => {
    const slug = button.dataset.compareToggle;
    if (state.palCompare.has(slug)) state.palCompare.delete(slug); else if (state.palCompare.size < 3) state.palCompare.add(slug);
    renderPals();
  }));
  content.querySelectorAll("[data-compare-remove]").forEach((button) => button.addEventListener("click", () => { state.palCompare.delete(button.dataset.compareRemove); renderPals(); }));
  content.querySelector("[data-compare-clear]")?.addEventListener("click", () => { state.palCompare.clear(); renderPals(); });
  content.querySelector("[data-detail-close]")?.addEventListener("click", () => { state.palSelected = null; renderPals(); });
  document.querySelector("#pal-search").addEventListener("input", (event) => {
    state.palQuery = event.target.value; renderPals(); const input = document.querySelector("#pal-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  });
  document.querySelector("#pal-element").addEventListener("change", (event) => { state.palElement = event.target.value; renderPals(); });
  document.querySelector("#pal-work").addEventListener("change", (event) => { state.palWork = event.target.value; renderPals(); });
  document.querySelector("#pal-sort").addEventListener("change", (event) => { state.palSort = event.target.value; renderPals(); });
}

const BREEDING_STORAGE_KEY = "palworld-guide:breeding-owned:v1";

function breedingPal(id) {
  return state.breedingIndex?.byId.get(id) ?? null;
}

function breedingName(id) {
  const pal = breedingPal(id);
  if (!pal) return "자료 없음";
  return pal.slug ? (state.assets.koreanNames?.[pal.slug] || pal.name) : pal.name;
}

function breedingOptionLabel(pal) {
  const localized = breedingName(pal.id);
  return localized === pal.name ? `${localized} · #${pal.paldex}` : `${localized} (${pal.name}) · #${pal.paldex}`;
}

function breedingOptions(selected, placeholder = "펠을 선택하세요") {
  return `<option value="">${placeholder}</option>${state.breeding.pals.map((pal) => `<option value="${escapeHtml(pal.id)}" ${selected === pal.id ? "selected" : ""}>${escapeHtml(breedingOptionLabel(pal))}</option>`).join("")}`;
}

function breedingResultCard(childId, result) {
  const child = breedingPal(childId);
  if (!child) return "";
  const kind = result.kind === "special" ? "특수 고정 조합" : result.kind === "same-species" ? "동종 번식" : "CombiRank 공식";
  return `<article class="breeding-result-card">${palImage(child.name, "breeding-pal-image")}<div><span>${escapeHtml(kind)}</span><h4>${escapeHtml(breedingName(child.id))}</h4><p>${escapeHtml(child.name)} · #${escapeHtml(child.paldex)} · Rank ${child.combiRank.toLocaleString()}</p>${palElementBadges(child)}${result.targetRank === null ? "" : `<small>계산 목표 Rank ${result.targetRank.toLocaleString()}</small>`}${result.disputedTie ? `<strong class="breeding-warning">동일 거리 타이브레이크에 출처 이견 있음</strong>` : ""}</div></article>`;
}

function renderPairCalculator() {
  const result = state.breedParentA && state.breedParentB ? breed(state.breedParentA, state.breedParentB, state.breedingIndex) : null;
  const parentA = breedingPal(state.breedParentA);
  const parentB = breedingPal(state.breedParentB);
  return `<div class="breeding-select-grid"><label>부모 A<select id="breed-parent-a">${breedingOptions(state.breedParentA, "첫 번째 부모")}</select>${parentA ? `<small>수컷 확률 ${dataValue(parentA.maleProbability)}%</small>` : ""}</label><span>＋</span><label>부모 B<select id="breed-parent-b">${breedingOptions(state.breedParentB, "두 번째 부모")}</select>${parentB ? `<small>수컷 확률 ${dataValue(parentB.maleProbability)}%</small>` : ""}</label></div>
    ${result ? `<div class="breeding-results"><h3>예상 자식 ${result.childIds.length > 1 ? `${result.childIds.length}종 후보` : ""}</h3>${result.childIds.map((childId) => breedingResultCard(childId, result)).join("")}</div>` : `<p class="breeding-empty">부모 두 종을 선택하면 1.0 조합 결과를 계산합니다.</p>`}`;
}

function renderTargetCalculator() {
  const pairs = state.breedTarget ? findParentPairs(state.breedTarget, state.breedingIndex, 500) : [];
  return `<label class="breeding-target-select">목표 자식<select id="breed-target">${breedingOptions(state.breedTarget, "만들고 싶은 펠")}</select></label>
    ${state.breedTarget ? `<div class="parent-pair-list"><header><h3>${escapeHtml(breedingName(state.breedTarget))} 부모 조합</h3><span>${pairs.length.toLocaleString()}쌍${pairs.length === 500 ? " 이상" : ""}</span></header>${pairs.slice(0, 160).map((pair) => `<article><div><strong>${escapeHtml(breedingName(pair.parentAId))}</strong><span>＋</span><strong>${escapeHtml(breedingName(pair.parentBId))}</strong></div><small>${pair.kind === "special" ? "특수 고정 조합" : pair.kind === "same-species" ? "동종 번식" : "일반 공식"}${pair.disputedTie ? " · 타이브레이크 이견" : ""}</small></article>`).join("") || `<p class="breeding-empty">확인된 부모 조합이 없습니다.</p>`}${pairs.length > 160 ? `<p class="result-note">첫 160쌍을 표시합니다.</p>` : ""}</div>` : `<p class="breeding-empty">목표 펠을 선택하면 가능한 부모 쌍을 역검색합니다.</p>`}`;
}

function saveBreedOwned() {
  localStorage.setItem(BREEDING_STORAGE_KEY, JSON.stringify([...state.breedOwned]));
}

function loadBreedOwned() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BREEDING_STORAGE_KEY) || "[]");
    state.breedOwned = new Set(Array.isArray(parsed) ? parsed.filter((id) => state.breedingIndex.byId.has(id)) : []);
  } catch {
    state.breedOwned = new Set();
  }
}

function renderPathCalculator() {
  const path = state.breedTarget && state.breedOwned.size
    ? findShortestPath([...state.breedOwned], state.breedTarget, state.breedingIndex, 8)
    : null;
  return `<div class="owned-pal-panel"><header><div><h3>내가 보유한 펠</h3><p>이 목록은 이 브라우저에만 저장되며 서버로 전송되지 않습니다.</p></div><strong>${state.breedOwned.size}종</strong></header><div class="owned-pal-add"><select id="breed-owned-add">${breedingOptions(state.breedOwnedAdd, "보유 펠 추가")}</select><button type="button" data-owned-add>추가</button><button type="button" data-owned-clear ${state.breedOwned.size ? "" : "disabled"}>전체 비우기</button></div><div class="owned-pal-chips">${[...state.breedOwned].map((id) => `<button type="button" data-owned-remove="${escapeHtml(id)}">${escapeHtml(breedingName(id))} ×</button>`).join("") || `<span>아직 등록한 펠이 없습니다.</span>`}</div></div>
    <label class="breeding-target-select">목표 펠<select id="breed-target">${breedingOptions(state.breedTarget, "경로를 찾을 목표")}</select></label>
    ${path ? path.reachable ? `<section class="breeding-path"><header><h3>최단 경로 · ${path.generations}세대</h3><span>${path.steps.length}회 번식</span></header>${path.steps.length ? `<ol>${path.steps.map((step) => `<li><span>${escapeHtml(breedingName(step.parentAId))} ＋ ${escapeHtml(breedingName(step.parentBId))}</span><strong>→ ${escapeHtml(breedingName(step.childId))}</strong><small>${step.kind === "special" ? "특수 조합" : "일반 공식"}${step.disputedTie ? " · 타이브레이크 이견" : ""}</small></li>`).join("")}</ol>` : `<p>목표 펠을 이미 보유하고 있습니다.</p>`}</section>` : `<p class="breeding-empty breeding-warning">보유 목록만으로 8세대 안에 도달하는 경로를 찾지 못했습니다.</p>` : `<p class="breeding-empty">보유 펠과 목표를 선택하면 최대 8세대의 최단 경로를 계산합니다.</p>`}
    <p class="breeding-caveat">경로 계산은 보유 “종”을 기준으로 합니다. 실제 번식에는 각 단계마다 수컷·암컷 한 쌍과 케이크가 필요하며, 필요한 개체 수와 성별 보유 여부는 별도로 확인해야 합니다.</p>`;
}

function renderBreedingKnowledge() {
  const mechanics = state.breeding.mechanics;
  return `<section class="breeding-knowledge"><header><span>확인된 범위와 한계</span><h3>계승·변이·케이크</h3></header><div><article><h4>패시브 계승</h4><p>부모 양쪽의 중복을 뺀 패시브 중 1~4개를 계승합니다.</p><dl>${Object.entries(mechanics.passiveInheritance.inheritedCountProbabilities).map(([count, probability]) => `<div><dt>${count}개 계승</dt><dd>${Math.round(probability * 100)}%</dd></div>`).join("")}</dl><small>커뮤니티 검증 · 무작위 패시브가 추가될 수 있음</small></article><article><h4>개체값(IV)</h4><p>${escapeHtml(mechanics.ivInheritance.noteKo)}</p><strong>정확한 1.0 확률: 자료 없음</strong></article><article><h4>변이</h4><p>${escapeHtml(mechanics.mutation.noteKo)}</p><strong>발생 확률: 자료 없음</strong></article></div><div class="cake-grid">${mechanics.cakes.map((cake) => `<article><strong>${escapeHtml(cake.name)}</strong><span>${escapeHtml(cake.effectKo)}</span></article>`).join("")}</div></section>`;
}

function renderBreeding() {
  if (!state.breedingIndex) {
    content.innerHTML = `<div class="error">번식 데이터를 불러오지 못했습니다.</div>`;
    return;
  }
  const modes = [{ id: "pair", label: "부모 → 자식" }, { id: "target", label: "목표 → 부모" }, { id: "path", label: "보유 펠 → 최단 경로" }];
  content.innerHTML = `${sectionHeading("03", "1.0 번식 계산기", `${state.breeding.counts.pals}종 · 특수 조합 ${state.breeding.counts.specialCombos}개 · 데이터 리비전 고정`)}
    <div class="breeding-notice"><strong>계산 기준</strong><span>일반 조합은 두 CombiRank의 중간값에 가장 가까운 일반 풀 펠을 선택합니다. 동일 거리 규칙은 현행 출처 간 이견이 있어 결과에 경고를 표시합니다.</span></div>
    <div class="breeding-modes" role="tablist">${modes.map((mode) => `<button type="button" role="tab" data-breeding-mode="${mode.id}" aria-selected="${state.breedingMode === mode.id}" class="${state.breedingMode === mode.id ? "active" : ""}">${mode.label}</button>`).join("")}</div>
    <section class="breeding-calculator">${state.breedingMode === "target" ? renderTargetCalculator() : state.breedingMode === "path" ? renderPathCalculator() : renderPairCalculator()}</section>
    ${renderBreedingKnowledge()}
    <div class="breeding-source"><span>Palworld ${escapeHtml(state.breeding.gameVersion)} · ${escapeHtml(state.breeding.provenance.evidenceLevel)} · MIT</span><a href="${safeUrl(state.breeding.provenance.sourceUrl)}" target="_blank" rel="noopener noreferrer">고정 원본 ${escapeHtml(state.breeding.provenance.sourceRevision.slice(0, 8))} ↗</a></div>`;
  content.querySelectorAll("[data-breeding-mode]").forEach((button) => button.addEventListener("click", () => { state.breedingMode = button.dataset.breedingMode; renderBreeding(); }));
  content.querySelector("#breed-parent-a")?.addEventListener("change", (event) => { state.breedParentA = event.target.value; renderBreeding(); });
  content.querySelector("#breed-parent-b")?.addEventListener("change", (event) => { state.breedParentB = event.target.value; renderBreeding(); });
  content.querySelector("#breed-target")?.addEventListener("change", (event) => { state.breedTarget = event.target.value; renderBreeding(); });
  content.querySelector("#breed-owned-add")?.addEventListener("change", (event) => { state.breedOwnedAdd = event.target.value; });
  content.querySelector("[data-owned-add]")?.addEventListener("click", () => { if (state.breedingIndex.byId.has(state.breedOwnedAdd)) { state.breedOwned.add(state.breedOwnedAdd); state.breedOwnedAdd = ""; saveBreedOwned(); renderBreeding(); } });
  content.querySelectorAll("[data-owned-remove]").forEach((button) => button.addEventListener("click", () => { state.breedOwned.delete(button.dataset.ownedRemove); saveBreedOwned(); renderBreeding(); }));
  content.querySelector("[data-owned-clear]")?.addEventListener("click", () => { state.breedOwned.clear(); saveBreedOwned(); renderBreeding(); });
}

function itemDataValue(value) {
  return value === null || value === undefined ? "자료 없음" : dataValue(value);
}

function itemDisplayName(id) {
  const entry = state.itemIndex.items.get(id) ?? state.itemIndex.structures.get(id);
  return entry ? localizedItemName(entry) : id;
}

function itemImage(entry, className = "item-thumb") {
  const path = itemAssetPath(entry);
  return path
    ? `<img class="${className}" src="${path}" alt="${escapeHtml(localizedItemName(entry))}" loading="lazy" width="96" height="96">`
    : `<span class="${className} item-image-placeholder" role="img" aria-label="${escapeHtml(localizedItemName(entry))} 이미지 미확인">?</span>`;
}

function itemResults() {
  const source = state.itemKind === "structure" ? state.items.structures : state.items.items;
  return filterAndSortItems(source, {
    query: state.itemQuery,
    category: state.itemCategory,
    sort: state.itemSort,
    isStructure: state.itemKind === "structure",
  });
}

function directMaterials(materials, multiplier = 1) {
  if (!materials?.length) return `<p class="empty-data">제작 재료 자료 없음</p>`;
  return `<ul class="direct-materials">${materials.map((material) => {
    const entry = state.itemIndex.items.get(material.itemId);
    return `<li><button type="button" data-item-link="${escapeHtml(material.itemId)}">${itemImage(entry, "material-thumb")}<span><strong>${escapeHtml(itemDisplayName(material.itemId))}</strong>${itemEnglishAlias(entry) ? `<small>${escapeHtml(itemEnglishAlias(entry))}</small>` : ""}</span></button><strong>×${(material.quantity * multiplier).toLocaleString()}</strong></li>`;
  }).join("")}</ul>`;
}

function rawMaterialPanel(result) {
  return `<section class="raw-material-panel"><header><div><span>하위 제작법 재귀 계산</span><h4>최종 원재료 합계</h4></div><strong>${result.rawMaterials.size}종</strong></header><div>${[...result.rawMaterials.entries()].sort((a, b) => itemDisplayName(a[0]).localeCompare(itemDisplayName(b[0]))).map(([id, quantity]) => {
    const entry = state.itemIndex.items.get(id);
    return `<button type="button" data-item-link="${escapeHtml(id)}">${itemImage(entry, "raw-material-thumb")}<span>${escapeHtml(itemDisplayName(id))}</span><strong>×${quantity.toLocaleString()}</strong></button>`;
  }).join("")}</div>${result.crafts.length ? `<details><summary>중간 제작 ${result.crafts.length}단계 보기</summary><ol>${result.crafts.map((step) => `<li><span>${escapeHtml(itemDisplayName(step.itemId))}</span><strong>${step.batches}회 · ${step.produced.toLocaleString()}개 생산${step.produced > step.required ? ` · 잉여 ${(step.produced - step.required).toLocaleString()}` : ""}</strong></li>`).join("")}</ol></details>` : ""}</section>`;
}

function stationLinks(stations = []) {
  if (!stations.filter(Boolean).length) return "자료 없음";
  const structuresByName = new Map(state.items.structures.map((structure) => [structure.name, structure]));
  return stations.filter(Boolean).map((station) => {
    const structure = structuresByName.get(station);
    return structure
      ? `<button type="button" data-station-link="${escapeHtml(structure.id)}">${escapeHtml(localizedItemName(structure))}</button>`
      : `<span>${escapeHtml(station)}</span>`;
  }).join("");
}

function relatedDropPals(item) {
  const related = Object.values(state.details?.pals ?? {}).filter((pal) => pal.drops?.some((drop) => drop.itemId === item.name)).slice(0, 18);
  if (!related.length) return "";
  const mapPointsByLabel = new Map(state.data.map.points.map((point) => [point.label, point]));
  return `<section class="item-related-pals"><h4>이 아이템을 드롭하는 펠</h4><div>${related.map((pal) => {
    const point = mapPointsByLabel.get(`Alpha ${cleanPalName(pal.name)}`);
    return `<span><button type="button" data-related-pal="${escapeHtml(pal.slug)}">${palImage(pal.name, "related-pal-thumb")}<span>${escapeHtml(displayPalName(pal.name))}</span></button>${point ? `<button type="button" data-related-map="${escapeHtml(point.id)}" aria-label="${escapeHtml(displayPalName(pal.name))} 알파 위치를 지도에서 보기">지도</button>` : ""}</span>`;
  }).join("")}</div></section>`;
}

function renderItemDetail() {
  if (!state.itemSelected) return "";
  const isStructure = state.itemKind === "structure";
  const entry = isStructure ? state.itemIndex.structures.get(state.itemSelected) : state.itemIndex.items.get(state.itemSelected);
  if (!entry) return "";
  let expanded = null;
  let expansionError = null;
  try {
    expanded = isStructure
      ? expandStructureMaterials(entry.id, state.itemQuantity, state.itemIndex)
      : entry.recipe ? expandItemMaterials(entry.id, state.itemQuantity, state.itemIndex) : null;
  } catch (error) {
    expansionError = error instanceof RecipeCycleError ? `순환 제작법 감지: ${error.path.map(itemDisplayName).join(" → ")}` : "재료 계산을 완료하지 못했습니다.";
  }
  const materials = isStructure ? entry.materials : entry.recipe?.materials;
  return `<section class="item-inspector"><header><div class="item-inspector-title">${itemImage(entry, "item-detail-thumb")}<div><span>${isStructure ? "구조물" : escapeHtml(itemCategoryLabels[entry.category] || entry.category)} · ${entry.dataVersion === "1.0.3" ? "v1.0.3 보정" : "v1.0 데이터"}</span><h3>${escapeHtml(localizedItemName(entry))}</h3>${itemEnglishAlias(entry) ? `<small>영문명 · ${escapeHtml(itemEnglishAlias(entry))}</small>` : ""}<p>기술 Lv.${itemDataValue(entry.techLevel)}${entry.ancientTech || entry.ancientTechPoints !== null ? ` · 고대 기술${entry.ancientTechPoints !== null ? ` ${entry.ancientTechPoints}점` : ""}` : ""}</p></div></div><button type="button" data-item-close aria-label="상세 정보 닫기">닫기</button></header>
    <div class="item-quantity"><label for="item-quantity">필요 수량</label><input id="item-quantity" type="number" min="1" max="999" step="1" value="${state.itemQuantity}"><span>${isStructure ? "채" : "개"}</span></div>
    <div class="item-detail-grid"><article><h4>직접 필요한 재료</h4>${directMaterials(materials, state.itemQuantity)}</article><article><h4>${isStructure ? "시설 정보" : "제작 정보"}</h4>${isStructure ? `<dl><div><dt>담당 작업</dt><dd>${escapeHtml(localizedStructureValue(entry.workers, "workers"))}</dd></div><div><dt>수용량</dt><dd>${escapeHtml(localizedStructureValue(entry.capacity, "capacity"))}</dd></div><div><dt>전력</dt><dd>${entry.requiresPower ? `필요${entry.energyPerSecond ? ` · 초당 ${entry.energyPerSecond}` : ""}` : "불필요"}</dd></div></dl>` : entry.recipe ? `<dl><div><dt>한 번에 생산</dt><dd>${entry.recipe.outputQuantity.toLocaleString()}개</dd></div><div><dt>제작 시설</dt><dd class="item-station-links">${stationLinks(entry.recipe.stations)}</dd></div></dl>` : `<p class="empty-data">확인된 제작법이 없습니다.</p>`}</article></div>
    ${expansionError ? `<p class="item-error">${escapeHtml(expansionError)}</p>` : expanded ? rawMaterialPanel(expanded) : ""}
    ${!isStructure && entry.patchOverride ? `<aside class="item-patch-note"><strong>v1.0.3 확인 보정</strong><span>${escapeHtml(entry.patchOverride.noteKo)}</span><a href="${safeUrl(entry.patchOverride.sourceUrl)}" target="_blank" rel="noopener noreferrer">공식 패치 ↗</a></aside>` : ""}
    ${!isStructure ? relatedDropPals(entry) : ""}
    ${!isStructure && entry.obtainedFrom?.length ? `<details class="item-obtained"><summary>영문 원문 획득처 ${entry.obtainedFrom.length}개</summary><p>출처에 한국어 문장이 없어 원문을 접어서 보관합니다.</p><ul lang="en">${entry.obtainedFrom.slice(0, 80).map((source) => `<li>${escapeHtml(source)}</li>`).join("")}</ul>${entry.obtainedFrom.length > 80 ? `<p>첫 80개 획득처를 표시합니다.</p>` : ""}</details>` : ""}
  </section>`;
}

function renderMissingItemImages() {
  const report = state.itemReport;
  if (!report) return "";
  const missing = state.itemKind === "structure" ? report.missingStructureImages : report.missingItemImages;
  if (!missing.length) return `<p class="item-image-complete">현재 목록의 이미지를 모두 확인했습니다.</p>`;
  return `<details class="item-missing-images"><summary>이미지 미확인 ${missing.length}개</summary><p>원본 이미지 키나 실제 파일을 확인하지 못해 임의 이미지를 넣지 않은 목록입니다.</p><ul>${missing.map((entry) => `<li><strong>${escapeHtml(entry.nameKo)}</strong><small>${escapeHtml(entry.name)}</small><span>${escapeHtml(entry.reason)}</span></li>`).join("")}</ul></details>`;
}

function renderItems() {
  if (!state.itemIndex) {
    content.innerHTML = `<div class="error">아이템 데이터를 불러오지 못했습니다.</div>`;
    return;
  }
  const results = itemResults();
  const categories = [...new Set(state.items.items.map((item) => item.category))].sort();
  const visible = results.slice(0, state.itemLimit);
  const quickSearches = state.itemKind === "structure" ? ["작업대", "화로", "농원", "채굴장", "발전기"] : ["팰 스피어", "주괴", "케이크", "안장", "작업대"];
  content.innerHTML = `${sectionHeading("04", "아이템·제작·기술 탐색기", `아이템 이미지 ${state.items.counts.itemImages.toLocaleString()}/${state.items.counts.items.toLocaleString()} · 구조물 이미지 ${state.items.counts.structureImages}/${state.items.counts.structures}`)}
    <div class="item-data-notice"><strong>한글·이미지 기준</strong><span>한글명을 먼저 표시하고 영문명도 함께 검색합니다. 아이콘은 고정된 게임 데이터 출처에서 확인된 파일만 사용하며, 없는 이미지는 별도 목록에 남깁니다.</span></div>
    <div class="item-kind-tabs"><button type="button" data-item-kind="item" class="${state.itemKind === "item" ? "active" : ""}">아이템·제작법</button><button type="button" data-item-kind="structure" class="${state.itemKind === "structure" ? "active" : ""}">구조물</button></div>
    <div class="item-quick-search" aria-label="빠른 찾기"><span>빠른 찾기</span>${quickSearches.map((query) => `<button type="button" data-item-quick="${query}" class="${state.itemQuery === query ? "active" : ""}">${query}</button>`).join("")}</div>
    <div class="item-filters"><div class="search-row"><label for="item-search">한글명·영문명·제작 시설 검색</label><input id="item-search" type="search" value="${escapeHtml(state.itemQuery)}" placeholder="예: 시멘트, Cement, 작업대" autocomplete="off"></div>${state.itemKind === "item" ? `<label>분류<select id="item-category"><option value="all">전체 분류</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${state.itemCategory === category ? "selected" : ""}>${escapeHtml(itemCategoryLabels[category] || category)}</option>`).join("")}</select></label>` : ""}<label>정렬<select id="item-sort"><option value="tech" ${state.itemSort === "tech" ? "selected" : ""}>기술 레벨</option><option value="name" ${state.itemSort === "name" ? "selected" : ""}>한글 이름</option><option value="category" ${state.itemSort === "category" ? "selected" : ""}>분류</option></select></label></div>
    <div class="item-result-status" aria-live="polite"><strong>${results.length.toLocaleString()}개</strong><span>검색 결과 · ${Math.min(visible.length, results.length).toLocaleString()}개 표시</span></div>
    ${renderItemDetail()}
    <div class="item-catalogue">${visible.map((entry) => `<button type="button" data-item-open="${escapeHtml(entry.id)}" class="${state.itemSelected === entry.id ? "selected" : ""}">${itemImage(entry)}<span class="item-card-copy"><small class="item-card-kind">${state.itemKind === "structure" ? (entry.ancientTech ? "고대 구조물" : "구조물") : escapeHtml(itemCategoryLabels[entry.category] || entry.category)}</small><strong>${escapeHtml(localizedItemName(entry))}</strong>${itemEnglishAlias(entry) ? `<span class="item-english-name">${escapeHtml(itemEnglishAlias(entry))}</span>` : ""}<small>기술 Lv.${itemDataValue(entry.techLevel)}${entry.recipe ? ` · 재료 ${entry.recipe.materials.length}종` : entry.materials ? ` · 재료 ${entry.materials.length}종` : " · 제작법 없음"}${entry.dataVersion === "1.0.3" ? " · v1.0.3" : ""}</small></span></button>`).join("") || `<p class="breeding-empty">검색 결과가 없습니다.</p>`}</div>
    ${results.length > visible.length ? `<button type="button" class="item-load-more" data-item-more>다음 ${Math.min(60, results.length - visible.length)}개 더 보기</button>` : ""}
    ${renderMissingItemImages()}
    <div class="item-source"><span>${escapeHtml(state.items.localization.usageNoteKo)} · 게임 이미지 권리 Pocketpair</span><a href="${safeUrl(state.items.localization.sourceUrl)}" target="_blank" rel="noopener noreferrer">한글·아이콘 출처 ${escapeHtml(state.items.localization.sourceRevision.slice(0, 8))} ↗</a></div>`;
  content.querySelectorAll("[data-item-kind]").forEach((button) => button.addEventListener("click", () => { state.itemKind = button.dataset.itemKind; state.itemQuery = ""; state.itemSelected = ""; state.itemLimit = 60; renderItems(); }));
  content.querySelectorAll("[data-item-open]").forEach((button) => button.addEventListener("click", () => { state.itemSelected = button.dataset.itemOpen; renderItems(); content.querySelector(".item-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  content.querySelectorAll("[data-item-link]").forEach((button) => button.addEventListener("click", () => { state.itemKind = "item"; state.itemSelected = button.dataset.itemLink; state.itemQuery = ""; state.itemCategory = "all"; renderItems(); }));
  content.querySelectorAll("[data-station-link]").forEach((button) => button.addEventListener("click", () => { state.itemKind = "structure"; state.itemSelected = button.dataset.stationLink; state.itemQuery = ""; renderItems(); }));
  content.querySelectorAll("[data-related-pal]").forEach((button) => button.addEventListener("click", () => { state.palQuery = ""; state.palSelected = button.dataset.relatedPal; selectTab("pals"); }));
  content.querySelectorAll("[data-related-map]").forEach((button) => button.addEventListener("click", () => {
    const point = state.data.map.points.find((candidate) => candidate.id === button.dataset.relatedMap);
    if (!point) return;
    state.mapId = point.mapId; state.mapQuery = point.label; state.layers.add(point.category); state.selected = point; selectTab("map");
  }));
  content.querySelector("[data-item-close]")?.addEventListener("click", () => { state.itemSelected = ""; renderItems(); });
  content.querySelectorAll("[data-item-quick]").forEach((button) => button.addEventListener("click", () => { state.itemQuery = state.itemQuery === button.dataset.itemQuick ? "" : button.dataset.itemQuick; state.itemLimit = 60; renderItems(); }));
  content.querySelector("#item-search")?.addEventListener("input", (event) => { state.itemQuery = event.target.value; state.itemLimit = 60; renderItems(); const input = content.querySelector("#item-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
  content.querySelector("#item-category")?.addEventListener("change", (event) => { state.itemCategory = event.target.value; state.itemSelected = ""; state.itemLimit = 60; renderItems(); });
  content.querySelector("#item-sort")?.addEventListener("change", (event) => { state.itemSort = event.target.value; state.itemLimit = 60; renderItems(); });
  content.querySelector("#item-quantity")?.addEventListener("input", (event) => { state.itemQuantity = Math.max(1, Math.min(999, Number.parseInt(event.target.value, 10) || 1)); renderItems(); });
  content.querySelector("[data-item-more]")?.addEventListener("click", () => { state.itemLimit += 60; renderItems(); content.querySelector("[data-item-more]")?.focus(); });
}

function renderBuilds() {
  const builds = state.data.builds.filter((build) => build.kind === state.buildKind);
  content.innerHTML = `${sectionHeading("03", "추천 빌드", "상성·서포트 펠·파티 운용까지 확인하는 실전 구성")}
    <div class="roles"><button type="button" data-build-kind="combat" class="${state.buildKind === "combat" ? "active" : ""}">전투 파티</button><button type="button" data-build-kind="base" class="${state.buildKind === "base" ? "active" : ""}">거점 작업</button></div>
    ${state.buildKind === "combat" ? `<div class="build-guide-note"><strong>읽는 법</strong><span>강점은 공격 속성 기준이며, 약점은 주력 펠이 받는 상성입니다. 같은 종의 지원 효과는 대개 중복되지 않으므로 서로 다른 서포트 펠을 우선합니다.</span></div>` : ""}
    <div class="builds">${builds.map((build) => {
      const translated = buildKo[build.id] ?? build;
      if (build.party?.length) {
        return `<article class="team-build"><div class="build-hero">${palImage(build.pal, "build-pal-image")}<div><span>${escapeHtml(build.archetype)} · ${escapeHtml(build.gameVersion)}</span><h3>${escapeHtml(translated.title)}</h3><p>${escapeHtml(translated.summary)}</p>
          <div class="element-badges">${(build.elements ?? []).map((element) => `<b>${escapeHtml(elementLabels[element] || element)}</b>`).join("")}</div></div></div>
          <div class="matchup-grid"><div><small>강한 상대</small><strong>${(build.strongAgainst ?? []).map((element) => elementLabels[element] || element).join(" · ")}</strong></div><div><small>피해야 할 상대</small><strong>${(build.weakAgainst ?? []).map((element) => elementLabels[element] || element).join(" · ")}</strong></div>${build.stats ? `<div><small>주력 종족값</small><strong>공 ${build.stats.attack} · 방 ${build.stats.defense} · 체 ${build.stats.hp}</strong></div>` : ""}</div>
          <section class="party-section"><h4>추천 5인 파티와 채용 사유</h4><div class="party-grid">${build.party.map((member, index) => `<article>${palImage(member.pal, "party-pal-image")}<div><span>${index === 0 ? "주력" : `서포트 ${index}`}</span><h5>${escapeHtml(displayPalName(member.pal))}</h5><b>${escapeHtml(member.role)}</b><p>${escapeHtml(member.effect)}</p></div></article>`).join("")}</div></section>
          <div class="build-grid rich"><div><h4>추천 패시브</h4><ul>${(translated.passives ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h4>실전 운용 순서</h4><ol>${(build.rotation ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div></div>
          ${translated.skills?.length ? `<div class="skill-line"><strong>추천 기술</strong><span>${translated.skills.map(escapeHtml).join(" · ")}</span></div>` : ""}
          <div class="build-advice"><p><strong>교체 기준</strong> ${escapeHtml(build.swapAdvice || "보스 속성과 보유 펠에 맞춰 교체하세요.")}</p><p><strong>주의</strong> ${escapeHtml(build.warning || "패치와 월드 설정에 따라 효율이 달라질 수 있습니다.")}</p></div>
          <div class="build-sources">${(build.sourceUrls ?? [build.sourceUrl]).filter(Boolean).map((url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(buildSourceLabel(url))} ↗</a>`).join("")}<small>${escapeHtml(build.confidence)}</small></div></article>`;
      }
      return `<article><div class="build-hero">${palImage(build.pal, "build-pal-image")}<div><span>${build.kind === "base" ? "거점 작업" : "개별 전투"} · v${escapeHtml(build.gameVersion)}</span><h3>${escapeHtml(displayPalName(build.pal))} · ${escapeHtml(translated.title)}</h3><p>${escapeHtml(translated.summary)}</p></div></div>
        <div class="build-grid"><div><h4>추천 패시브</h4><ul>${(translated.passives ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h4>추천 스킬</h4><ul>${(translated.skills ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>
        <p class="usage">${escapeHtml(translated.usage)}</p><a href="${safeUrl(build.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문 공략 확인 ↗</a></article>`;
    }).join("")}</div>`;
  content.querySelectorAll("[data-build-kind]").forEach((button) => button.addEventListener("click", () => { state.buildKind = button.dataset.buildKind; renderBuilds(); }));
}

// The source map publishes the projection its coordinates were produced with:
// world -> in-game coordinates, then in-game coordinates -> image pixels. Using
// it keeps markers aligned with the terrain instead of stretching world values
// across the frame, which drifted the vertical axis by about 7%.
function mapPosition(point, bounds) {
  const projection = state.data?.map?.projection;
  if ((!state.mapId || state.mapId === "main") && projection?.transform && projection?.imageTransform && projection?.size) {
    const { translateWorldX, translateWorldY, scale } = projection.transform;
    const game = { x: (point.y - translateWorldY) / scale, y: (point.x + translateWorldX) / scale };
    const { xScale, xOffset, yScale, yOffset } = projection.imageTransform;
    const pixelX = xScale * game.x + xOffset;
    const pixelY = projection.size - (yScale * -game.y + yOffset);
    return {
      x: Math.max(0.5, Math.min(99.5, (pixelX / projection.size) * 100)),
      y: Math.max(0.5, Math.min(99.5, (pixelY / projection.size) * 100)),
    };
  }
  const currentBounds = bounds || (state.data?.map?.regions?.[state.mapId]?.bounds) || fallbackMapRegions[state.mapId]?.bounds || state.data?.map?.bounds;
  if (!currentBounds || currentBounds.maxX === currentBounds.minX || currentBounds.maxY === currentBounds.minY) {
    return { x: 50, y: 50 };
  }
  const screenX = (point.y - currentBounds.minY) / (currentBounds.maxY - currentBounds.minY);
  const screenY = (currentBounds.maxX - point.x) / (currentBounds.maxX - currentBounds.minX);
  return {
    x: Math.max(0.5, Math.min(99.5, screenX * 100)),
    y: Math.max(0.5, Math.min(99.5, screenY * 100)),
  };
}

function pointWithinBounds(point, bounds) {
  if (!bounds) return true;
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function hudCoordinate(point) {
  const transform = state.data?.map?.projection?.transform;
  const translateWorldX = transform?.translateWorldX ?? 123930;
  const translateWorldY = transform?.translateWorldY ?? 157935;
  const scale = transform?.scale || 459;
  return {
    x: Math.round((point.y - translateWorldY) / scale),
    y: Math.round((point.x + translateWorldX) / scale),
  };
}

function pointDetail() {
  const point = state.selected;
  if (!point) return `<span>지점 정보</span><h3>지도에서 마커를 선택하세요</h3><p>좌표와 자료 상태, 원문 출처를 확인할 수 있습니다.</p>`;
  const hud = hudCoordinate(point);
  return `<span>${escapeHtml(labels[point.category] || point.category)}</span><h3>${escapeHtml(mapLabel(point))}</h3>
    <p>게임 지도 좌표 X ${hud.x.toLocaleString()} · Y ${hud.y.toLocaleString()}${point.count ? ` · ${Number(point.count)}개 묶음` : ""}</p>
    <p>지역 ${escapeHtml(mapRegionLabels[point.mapId] || point.mapId)} · 자료 상태 ${escapeHtml(mapStatusLabels[point.versionStatus] || "1.0 현행 자료")} · 신뢰도 ${escapeHtml(confidenceLabels[point.confidence] || "보통")}</p>
    ${(point.source ?? []).map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pointSourceName(source))} ↗</a>`).join("")}`;
}

function allMapPoints() {
  return [...(state.data?.map?.points ?? []), ...(state.mapPois?.points ?? [])];
}

function syncMapUrl() {
  const search = createMapSearch({ region: state.mapId, layers: [...state.layers], query: state.mapQuery });
  history.replaceState(null, "", `${location.pathname}${search}`);
}

function filteredMapPoints() {
  const query = state.mapQuery.trim().toLocaleLowerCase();
  return allMapPoints().filter((point) => point.versionStatus === "current_1_0" && point.mapId === state.mapId && state.layers.has(point.category)
    && (!query || point.label.toLocaleLowerCase().includes(query) || mapLabel(point).toLocaleLowerCase().includes(query) || (labels[point.category] || "").includes(query)));
}

function renderMap() {
  const regions = state.data.map.regions ?? fallbackMapRegions;
  const region = regions[state.mapId] ?? fallbackMapRegions.main;
  const allPoints = allMapPoints();
  const regionIds = ["main", "world_tree", "sunreach"].filter((mapId) => allPoints.some((point) => point.mapId === mapId));
  const regionPoints = allPoints.filter((point) => point.mapId === state.mapId);
  const categories = [...new Set(regionPoints.map((point) => point.category))].sort((a, b) => (labels[a] || a).localeCompare(labels[b] || b, "ko"));
  const points = filteredMapPoints();
  const bounds = region.bounds ?? fallbackMapRegions[state.mapId]?.bounds ?? state.data.map.bounds;
  const plottedPoints = points.filter((point) => pointWithinBounds(point, bounds));
  const mapContent = `<div class="map map-${escapeHtml(state.mapId)}" aria-label="${escapeHtml(mapRegionLabels[state.mapId] || region.label)} 1.0 현행 지형 지도"><svg class="map-markers" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="1.0 현행 지도 지점">${plottedPoints.map((point) => { const position = mapPosition(point, bounds); const label = mapLabel(point); return `<circle class="marker ${categoryClass(point.category)}" cx="${position.x.toFixed(3)}" cy="${position.y.toFixed(3)}" r="0.48" data-point="${escapeHtml(point.id)}" tabindex="0" role="button" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title></circle>`; }).join("")}</svg><span>1.0 현행 지형 · 검증 지점 ${plottedPoints.length}개</span></div>`;
  content.innerHTML = `${sectionHeading("04", "Palworld 1.0 현행 지도", `검증된 보스·이동 지점 ${points.length}개 표시`)}
    <div class="map-region-tabs" role="group" aria-label="지도 지역">${regionIds.map((mapId) => `<button type="button" data-map-region="${escapeHtml(mapId)}" aria-pressed="${state.mapId === mapId}">${escapeHtml(mapRegionLabels[mapId] || regions[mapId]?.label || mapId)}<small>${allPoints.filter((point) => point.mapId === mapId).length}</small></button>`).join("")}</div>
    <div class="search-row map-search"><label for="map-search">장소 검색</label><input id="map-search" type="search" value="${escapeHtml(state.mapQuery)}" placeholder="예: 석탄, 보스, Jetragon" autocomplete="off"></div>
    <div class="map-layout"><aside class="layer-panel"><div class="layer-actions"><button type="button" data-layer-action="default">기본 레이어</button><button type="button" data-layer-action="none">모두 해제</button></div>
      ${categories.map((category) => { const deferred = regionPoints.some((point) => point.category === category && point.deferred); return `<label><input type="checkbox" data-layer="${escapeHtml(category)}" ${state.layers.has(category) ? "checked" : ""}><i class="${categoryClass(category)}"></i><strong>${escapeHtml(labels[category] || category)}</strong>${deferred ? `<small>선택 시 표시</small>` : ""}</label>`; }).join("")}</aside>
      ${mapContent}
      <aside id="point-detail">${pointDetail()}</aside></div>
    <div class="point-list">${points.slice(0, 80).map((point) => { const hud = hudCoordinate(point); return `<button type="button" data-point="${escapeHtml(point.id)}"><i class="${categoryClass(point.category)}"></i><span>${escapeHtml(mapLabel(point))}</span><small>X ${Math.round(hud.x).toLocaleString()} · Y ${Math.round(hud.y).toLocaleString()}</small></button>`; }).join("")}</div>
    ${points.length > 80 ? `<p class="result-note">목록은 80개까지만 표시하지만 지도에는 검색 결과 전체가 표시됩니다.</p>` : ""}`;
  content.querySelectorAll("[data-layer]").forEach((input) => input.addEventListener("change", () => { input.checked ? state.layers.add(input.dataset.layer) : state.layers.delete(input.dataset.layer); syncMapUrl(); renderMap(); }));
  content.querySelectorAll("[data-layer-action]").forEach((button) => button.addEventListener("click", () => { state.layers = button.dataset.layerAction === "default" ? new Set(defaultLayers.filter((category) => categories.includes(category))) : new Set(); syncMapUrl(); renderMap(); }));
  content.querySelectorAll("[data-map-region]").forEach((button) => button.addEventListener("click", () => { state.mapId = button.dataset.mapRegion; state.selected = null; syncMapUrl(); renderMap(); }));
  content.querySelectorAll("[data-point]").forEach((button) => button.addEventListener("click", () => { state.selected = allPoints.find((point) => point.id === button.dataset.point) || null; document.querySelector("#point-detail").innerHTML = pointDetail(); }));
  content.querySelectorAll("circle[data-point]").forEach((marker) => marker.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); marker.dispatchEvent(new MouseEvent("click", { bubbles: true })); } }));
  document.querySelector("#map-search").addEventListener("input", (event) => { state.mapQuery = event.target.value; syncMapUrl(); renderMap(); const input = document.querySelector("#map-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
}

// Recommendations name traits without explaining them. Resolving a name against
// the catalogue lets every mention carry its effect inline.
function traitByName(name) {
  const key = String(name ?? "").trim().toLocaleLowerCase();
  if (!key) return null;
  if (!state.traitIndex) {
    state.traitIndex = new Map();
    for (const trait of state.traits?.traits ?? []) {
      state.traitIndex.set(trait.name.toLocaleLowerCase(), trait);
      // Recommendations may name a trait in either language.
      if (trait.nameKo) state.traitIndex.set(trait.nameKo.toLocaleLowerCase(), trait);
    }
  }
  return state.traitIndex.get(key) ?? null;
}

// Korean where the source provides it, English otherwise — never a guess.
function traitLabel(trait) {
  return trait.nameKo || trait.name;
}

// Traits are graded -3..5 matching in-game Palworld tiers and colors:
// Legend/Tier 4 (전설), Tier 3 (+3 골드), Tier 2 (+2 실버), Tier 1 (+1 브론즈),
// Negative Tiers (-1, -2, -3 페널티 레드)
function traitTier(trait) {
  const rating = trait.rating;
  if (rating === null || rating === undefined || rating === 0) return "none";
  if (rating <= -3) return "neg3";
  if (rating === -2) return "neg2";
  if (rating === -1) return "neg1";
  if (rating >= 4) return "legend";
  if (rating === 3) return "tier3";
  if (rating === 2) return "tier2";
  return "tier1";
}

const tierLabels = {
  legend: "전설",
  tier3: "3단계",
  tier2: "2단계",
  tier1: "1단계",
  neg1: "-1단계",
  neg2: "-2단계",
  neg3: "-3단계",
  none: "일반",
};

// Which traits are worth breeding onto a fighter versus onto a base worker.
// A trait can serve both, so this returns a set rather than one label.
const BASE_EFFECTS = /작업 속도|작업 적성|알 생산|부화|채굴 효율|벌목 효율|획득량|판매 가격|SAN|포만도|계속 작업|야행성/;
const COMBAT_EFFECTS = /공격|방어|HP|피해|면역|쿨타임|흡혈|스태미나|이동 속도|점프|대시|수영|재장전/;

function traitUsage(trait) {
  const text = trait.descriptionKo || trait.description || "";
  const usage = new Set();
  if (BASE_EFFECTS.test(text)) usage.add("base");
  if (COMBAT_EFFECTS.test(text)) usage.add("combat");
  return usage;
}

const usageLabels = { all: "전체", combat: "전투용", base: "거점용", avoid: "피해야 할 특성" };

// Renders a trait name as a button that reveals its effect, falling back to
// plain text when the catalogue does not know the name.
function traitChip(name) {
  const trait = traitByName(name);
  if (!trait) return `<span class="trait-chip trait-chip-unknown">${escapeHtml(String(name ?? ""))}</span>`;
  return `<button type="button" class="trait-chip tier-${traitTier(trait)}" data-trait="${escapeHtml(trait.name)}" aria-expanded="false"><span>${escapeHtml(traitLabel(trait))}</span>${trait.rating === null ? "" : `<small>${trait.rating > 0 ? "+" : ""}${trait.rating}</small>`}</button>`;
}


function renderTraits() {
  const catalogue = state.traits?.traits ?? [];
  if (catalogue.length === 0) {
    content.innerHTML = `${sectionHeading("05", "특성 사전", "자료를 불러오지 못했습니다")}<div class="error">특성 자료를 불러오지 못했습니다.</div>`;
    return;
  }
  const query = state.traitQuery.trim().toLocaleLowerCase();
  const filtered = catalogue.filter((trait) => {
    if (state.traitUsage === "all") return true;
    // Penalties are worth browsing on their own, so they get their own filter
    // and are kept out of the two "what should I breed" lists.
    if (state.traitUsage === "avoid") return trait.polarity === "negative";
    return trait.polarity !== "negative" && traitUsage(trait).has(state.traitUsage);
  }).filter((trait) => !query || trait.name.toLocaleLowerCase().includes(query) || String(trait.nameKo ?? "").includes(query)
    || String(trait.descriptionKo || trait.description).toLocaleLowerCase().includes(query));
  const usages = ["all", "combat", "base", "avoid"];
  const tiers = ["legend", "tier3", "tier2", "tier1", "neg1", "neg2", "neg3"];

  content.innerHTML = `${sectionHeading("05", "특성 사전", `${catalogue.length}종 · 번식으로 붙이는 특성`)}
    <div class="roles" role="group" aria-label="특성 용도">${usages.map((id) => `<button type="button" data-trait-usage="${escapeHtml(id)}" class="${state.traitUsage === id ? "active" : ""}${id === "avoid" ? " usage-avoid" : ""}">${escapeHtml(usageLabels[id])}</button>`).join("")}</div>
    <div class="tier-legend">${tiers.map((tier) => `<span class="tier-key tier-${tier}"><i></i>${escapeHtml(tierLabels[tier])}</span>`).join("")}</div>
    <div class="search-row"><label for="trait-search">특성 검색</label><input id="trait-search" type="search" value="${escapeHtml(state.traitQuery)}" placeholder="예: 장인, 작업 속도, Artisan" autocomplete="off"></div>
    <div class="trait-grid">${filtered.map((trait) => {
      const usage = [...traitUsage(trait)].map((id) => usageLabels[id]);
      return `<article class="trait-card tier-${traitTier(trait)}">
      <div class="trait-card-head"><h3>${escapeHtml(traitLabel(trait))}</h3>${trait.rating === null ? "" : `<span class="trait-rating">${trait.rating > 0 ? `+${trait.rating}` : trait.rating}</span>`}</div>
      ${trait.nameKo ? `<span class="trait-alias">${escapeHtml(trait.name)}</span>` : ""}
      <p>${escapeHtml(trait.descriptionKo || trait.description)}</p>
      <small>${escapeHtml(tierLabels[traitTier(trait)])}${usage.length ? ` · ${escapeHtml(usage.join("·"))}` : ""}${trait.stacks ? " · 중첩 가능" : ""}</small>
    </article>`;
    }).join("")}</div>
    ${filtered.length === 0 ? `<p class="result-note">조건에 맞는 특성이 없습니다.</p>` : ""}
    <div class="attribution"><h3>출처</h3><p>특성 명칭과 효과는 팰월드 공식 한국어 표기를 기준으로 하며, 영문 원문 명칭을 함께 표기합니다.</p></div>`;

  content.querySelectorAll("[data-trait-usage]").forEach((button) => button.addEventListener("click", () => { state.traitUsage = button.dataset.traitUsage; renderTraits(); }));
  document.querySelector("#trait-search").addEventListener("input", (event) => {
    state.traitQuery = event.target.value; renderTraits();
    const input = document.querySelector("#trait-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  });
}

const toolLabels = { boss: "보스 대응", base: "생산 플래너", progress: "진행 체크", activities: "낚시·원정", save: "세이브 분석", patch: "패치 비교" };

function toolNav() {
  return `<div class="tool-nav" role="tablist" aria-label="공략 도구">${Object.entries(toolLabels).map(([id, label]) => `<button type="button" data-tool="${id}" class="${state.toolMode === id ? "active" : ""}">${label}</button>`).join("")}</div>`;
}

function renderBossTool() {
  const bosses = state.activities?.bosses ?? [];
  if (!state.bossSelected) state.bossSelected = bosses[0]?.id ?? "";
  const boss = bosses.find((entry) => entry.id === state.bossSelected);
  const ownedNames = [...state.breedOwned].map((id) => state.breedingIndex?.byId.get(id)?.name).filter(Boolean);
  const candidates = boss ? recommendBossPals(boss, state.details?.pals, ownedNames) : [];
  return `<div class="tool-panel"><div class="tool-controls"><label>보스 선택<select id="boss-select">${bosses.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === state.bossSelected ? "selected" : ""}>${escapeHtml(bossTypeLabels[entry.type] || entry.type)} · ${escapeHtml(bossDisplayName(entry.pal))}</option>`).join("")}</select></label></div>${boss ? `<article class="tool-summary"><span>${escapeHtml(bossTypeLabels[boss.type] || boss.type)} · 1.0${boss.preliminary ? " · 예비 자료" : ""}</span><h3>${boss.leader ? `${escapeHtml(leaderLabels[boss.leader] || boss.leader)} &amp; ` : ""}${escapeHtml(bossDisplayName(boss.pal))}</h3><p>레벨 ${boss.level ?? "확인 필요"} · 권장 레벨 ${boss.recommendedPlayerLevel ?? "확인 필요"}</p><p>유효 속성: ${(boss.counterElements ?? []).map((element) => escapeHtml(elementLabels[element] || element)).join(" · ") || "자료 없음"}</p></article><p class="tool-note">후보 점수는 확인된 HP + 원거리 공격 + 방어력의 단순 합입니다.${ownedNames.length ? " 번식 도구의 보유 펠만 사용했습니다." : " 보유 펠이 비어 있어 전체 펠에서 찾았습니다."}</p><div class="tool-card-grid">${candidates.map(({ pal, score, matchedElements }) => `<article>${palImage(pal.name, "tool-pal-image")}<h4>${escapeHtml(displayPalName(pal.name))}</h4><p>${matchedElements.map((element) => escapeHtml(elementLabels[element] || element)).join(" · ")} · ${score}</p><button type="button" data-open-pal="${escapeHtml(pal.name)}">도감에서 보기</button></article>`).join("") || `<p class="empty-data">조건에 맞는 확인된 후보가 없습니다.</p>`}</div>` : ""}</div>`;
}

function renderBaseTool() {
  if (!state.items) return `<p class="empty-data">아이템 데이터를 불러오지 못했습니다.</p>`;
  const entries = state.baseKind === "structure" ? state.items.structures : state.items.items;
  if (!entries.some((entry) => entry.id === state.baseTarget)) state.baseTarget = entries[0]?.id ?? "";
  const entryLabel = (entry) => state.baseKind === "structure" ? (entry.nameKo || entry.name) : localizedItemName(entry);
  const query = state.baseQuery.trim().toLocaleLowerCase();
  const matches = entries.filter((entry) => !query || entryLabel(entry).toLocaleLowerCase().includes(query) || entry.name.toLocaleLowerCase().includes(query)).slice(0, 40);
  let plan = null; let error = "";
  try { plan = productionPlan(state.baseKind, state.baseTarget, state.baseQuantity, state.itemIndex, state.details?.pals); } catch (nextError) { error = nextError.message; }
  const stationLabel = (name) => state.items.structures.find((structure) => structure.name === name)?.nameKo || name;
  return `<div class="tool-panel"><div class="tool-controls"><div class="roles"><button type="button" data-base-kind="item" class="${state.baseKind === "item" ? "active" : ""}">아이템</button><button type="button" data-base-kind="structure" class="${state.baseKind === "structure" ? "active" : ""}">시설</button></div><label>목표 검색<input id="base-search" type="search" value="${escapeHtml(state.baseQuery)}" placeholder="한글명 또는 영문명"></label><label>수량<input id="base-quantity" type="number" min="1" max="9999" value="${state.baseQuantity}"></label></div><div class="target-results">${matches.map((entry) => `<button type="button" data-base-target="${escapeHtml(entry.id)}" class="${entry.id === state.baseTarget ? "active" : ""}">${escapeHtml(entryLabel(entry))}</button>`).join("")}</div>${error ? `<p class="error">${escapeHtml(error)}</p>` : plan ? `<article class="tool-summary item-visual-heading">${plan.entry.image ? `<img src="${localAsset(plan.entry.image)}" alt="" class="item-detail-image">` : ""}<div><span>확인된 제작법 기준</span><h3>${escapeHtml(entryLabel(plan.entry))} × ${state.baseQuantity}</h3><p>생산 속도와 최소 인원은 검증 자료가 없어 계산하지 않습니다.</p></div></article><div class="tool-split"><article><h4>최종 원재료</h4><ul>${[...plan.expansion.rawMaterials].map(([id, amount]) => `<li><button type="button" data-open-item="${escapeHtml(id)}">${escapeHtml(localizedItemName(state.itemIndex.items.get(id)))} × ${amount.toLocaleString()}</button></li>`).join("") || "<li>추가 원재료 없음</li>"}</ul></article><article><h4>제작 시설과 작업 후보</h4><p>${plan.stations.map((name) => escapeHtml(stationLabel(name))).join(" · ") || "구조물 직접 건축"}</p>${plan.workers.map((group) => `<p><strong>${escapeHtml(group.candidates[0]?.suitability.label || group.work)}</strong> · ${group.candidates.map((candidate) => `${escapeHtml(displayPalName(candidate.pal.name))} Lv.${candidate.suitability.level}`).join(" · ") || "후보 없음"}</p>`).join("") || `<p>시설 명칭만으로 작업 적성을 확정할 수 없어 후보를 제시하지 않습니다.</p>`}</article></div>` : ""}</div>`;
}

function progressGroups() {
  const points = allMapPoints();
  return {
    pals: (state.data?.pals ?? []).map((pal) => ({ id: palDetail(pal.name)?.entityId || `pal:${pal.slug}`, label: displayPalName(pal.name), image: palImage(pal.name, "check-image") })),
    bosses: (state.activities?.bosses ?? []).map((boss) => ({ id: boss.id, label: `${bossTypeLabels[boss.type] || boss.type} · ${bossDisplayName(boss.pal)}` })),
    fast: points.filter((point) => point.category === "fast_travel").map((point) => ({ id: point.id, label: mapLabel(point) })),
    collectible: points.filter((point) => point.category === "collectible").map((point) => ({ id: point.id, label: mapLabel(point) })),
    dungeon: points.filter((point) => point.category === "dungeon").map((point) => ({ id: point.id, label: mapLabel(point) })),
    schematic: points.filter((point) => point.category === "schematic").map((point) => ({ id: point.id, label: mapLabel(point) })),
  };
}

function renderProgressTool() {
  const groups = progressGroups(); const groupLabels = { pals: "펠 도감", bosses: "보스", fast: "빠른 이동", collectible: "수집물", dungeon: "던전", schematic: "설계도" };
  const entries = groups[state.progressKind] ?? []; const done = entries.filter((entry) => state.progress.completed[entry.id]).length;
  return `<div class="tool-panel"><div class="roles tool-kind-tabs">${Object.entries(groupLabels).map(([id, label]) => `<button type="button" data-progress-kind="${id}" class="${state.progressKind === id ? "active" : ""}>${label}</button>`).join("")}</div><div class="progress-actions"><strong>${done.toLocaleString()} / ${entries.length.toLocaleString()} 완료</strong><button type="button" data-progress-export>내보내기</button><label class="button-label">가져오기<input id="progress-import" type="file" accept="application/json"></label><button type="button" data-progress-reset>백업 후 초기화</button></div><div class="check-grid">${entries.slice(0, 500).map((entry) => `<label>${entry.image ?? ""}<input type="checkbox" data-progress-id="${escapeHtml(entry.id)}" ${state.progress.completed[entry.id] ? "checked" : ""}><span>${escapeHtml(entry.label)}</span></label>`).join("")}</div>${entries.length > 500 ? `<p class="result-note">성능을 위해 이 화면에는 500개까지 표시합니다.</p>` : ""}<p class="tool-note">진행 상태는 이 브라우저의 로컬 저장소에만 보관되며 서버로 전송되지 않습니다.</p></div>`;
}

function renderActivitiesTool() {
  const activities = state.activities;
  if (!activities) return `<p class="empty-data">활동 데이터를 불러오지 못했습니다.</p>`;
  const rewardLabel = (reward) => localizedItemName(state.itemIndex?.items.get(reward.itemId)) || reward.item;
  const difficultyLabels = { Easy: "쉬움", Normal: "보통", Hard: "어려움", VeryHard: "매우 어려움" };
  return `<div class="tool-panel"><div class="roles"><button type="button" data-activity="fishing" class="${state.activityMode === "fishing" ? "active" : ""}">낚시</button><button type="button" data-activity="expedition" class="${state.activityMode === "expedition" ? "active" : ""}">원정</button></div>${state.activityMode === "fishing" ? `<article class="tool-summary"><span>1.0.3 반영</span><h3>낚시 펠 ${activities.fishing.pals.length}종</h3><p>${escapeHtml(activities.fishing.patch103?.changesKo?.join(" · ") || "세계수 낚시 성수 획득처를 반영했습니다.")}</p><button type="button" data-open-fishing-map>낚시터 지도 보기</button></article><div class="tool-card-grid fishing-grid">${activities.fishing.pals.map((entry) => `<article>${palImage(entry.pal, "tool-pal-image")}<h4>${escapeHtml(displayPalName(entry.pal))}</h4><p>낚시 레벨 ${entry.minLevel}–${entry.maxLevel}</p></article>`).join("")}</div>` : `<div class="expedition-list">${activities.expeditions.map((mission) => `<article><span>${escapeHtml(difficultyLabels[mission.difficulty] || mission.difficulty)} · ${mission.durationMinutes}분</span><h3>${escapeHtml(mission.nameKo)}</h3><p>요구 화력 ${mission.requiredFirepower.toLocaleString()}${mission.elementRequirement ? ` · ${escapeHtml(elementLabels[mission.elementRequirement.element] || mission.elementRequirement.element)} 속성 펠 ${mission.elementRequirement.palsRequired}마리` : ""}</p><div><strong>확정</strong> ${mission.rewards.filter((reward) => reward.certainty === "guaranteed").map((reward) => `${escapeHtml(rewardLabel(reward))} ${escapeHtml(reward.quantity)}`).join(" · ") || "없음"}</div><div><strong>확률</strong> ${mission.rewards.filter((reward) => reward.certainty !== "guaranteed").map((reward) => `${escapeHtml(rewardLabel(reward))} ${reward.chancePct}%`).join(" · ") || "없음"}</div></article>`).join("")}</div>`}</div>`;
}

function renderSaveTool() {
  const result = state.saveResult;
  return `<div class="tool-panel"><article class="tool-summary"><span>읽기 전용 · 브라우저 내부 처리</span><h3>Palworld 1.0 세이브 분석</h3><p>원본 파일을 수정하거나 업로드하지 않습니다. 현재 PlZ(zlib)만 분석하며 PlM(Oodle)과 CNK는 이유를 표시하고 거부합니다.</p><label class="button-label">.sav 파일 선택<input id="save-file" type="file" accept=".sav"></label></article>${result ? `<article class="save-result"><h4>${escapeHtml(result.format || "분석 결과")}</h4><p>${escapeHtml(result.reason || result.error || `압축 해제 ${Number(result.decompressedSize).toLocaleString()}바이트 · 펠 후보 ${result.pals.length}종`)}</p>${result.pals?.length ? `<div class="tool-card-grid">${result.pals.map((name) => `<article>${palImage(name, "tool-pal-image")}<h4>${escapeHtml(displayPalName(name))}</h4></article>`).join("")}</div><button type="button" data-apply-save-pals>번식 보유 펠에 반영</button>` : ""}</article>` : ""}</div>`;
}

function renderPatchTool() {
  const report = state.patchReport;
  return `<div class="tool-panel"><article class="tool-summary"><span>공식 확인 패치 ${escapeHtml(report?.gameVersion || "1.0.3")}</span><h3>패치 데이터 검수 게이트</h3><p>${escapeHtml(report?.messageKo || "패치 비교 보고서를 불러오지 못했습니다.")}</p></article><div class="tool-split"><article><h4>현재 상태</h4><p>${report?.status === "awaiting-baseline" ? "1.0.3 기준선 저장 완료 · 다음 버전 대기" : escapeHtml(report?.status || "확인 필요")}</p></article><article><h4>공개 안전장치</h4><p>검수 승인: ${report?.publishApproved ? "완료" : "미승인"} · 롤백 스냅샷: ${escapeHtml(report?.rollbackSnapshot || "없음")}</p></article></div><p class="tool-note">공식 버전이 바뀌지 않으면 전체 외부 수집을 실행하지 않습니다. 다음 버전에서 추가·삭제·변경을 분리한 뒤 검수 승인 전까지 공개하지 않습니다.</p></div>`;
}

function downloadProgress() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.progress, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "palworld-guide-progress.json"; link.click(); URL.revokeObjectURL(url);
}

function renderTools() {
  const panels = { boss: renderBossTool, base: renderBaseTool, progress: renderProgressTool, activities: renderActivitiesTool, save: renderSaveTool, patch: renderPatchTool };
  content.innerHTML = `${sectionHeading("도구", "한 화면에서 이어 쓰는 공략 도구", "계산 결과와 출처 상태를 분리하고 개인 데이터는 브라우저에만 저장합니다.")}${toolNav()}${panels[state.toolMode]()}`;
  content.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => { state.toolMode = button.dataset.tool; renderTools(); }));
  document.querySelector("#boss-select")?.addEventListener("change", (event) => { state.bossSelected = event.target.value; renderTools(); });
  content.querySelectorAll("[data-open-pal]").forEach((button) => button.addEventListener("click", () => { state.palQuery = button.dataset.openPal; selectTab("pals"); }));
  content.querySelectorAll("[data-base-kind]").forEach((button) => button.addEventListener("click", () => { state.baseKind = button.dataset.baseKind; state.baseTarget = ""; renderTools(); }));
  document.querySelector("#base-search")?.addEventListener("input", (event) => { state.baseQuery = event.target.value; renderTools(); const input = document.querySelector("#base-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
  content.querySelectorAll("[data-base-target]").forEach((button) => button.addEventListener("click", () => { state.baseTarget = button.dataset.baseTarget; renderTools(); }));
  document.querySelector("#base-quantity")?.addEventListener("change", (event) => { state.baseQuantity = Math.max(1, Math.min(9999, Number.parseInt(event.target.value, 10) || 1)); renderTools(); });
  content.querySelectorAll("[data-open-item]").forEach((button) => button.addEventListener("click", () => { state.itemKind = "item"; state.itemSelected = button.dataset.openItem; selectTab("items"); }));
  content.querySelectorAll("[data-progress-kind]").forEach((button) => button.addEventListener("click", () => { state.progressKind = button.dataset.progressKind; renderTools(); }));
  content.querySelectorAll("[data-progress-id]").forEach((input) => input.addEventListener("change", () => { state.progress = toggleProgress(state.progress, input.dataset.progressId); saveProgress(localStorage, "palworld-guide-progress", state.progress); renderTools(); }));
  content.querySelector("[data-progress-export]")?.addEventListener("click", downloadProgress);
  document.querySelector("#progress-import")?.addEventListener("change", async (event) => { try { state.progress = importProgress(await event.target.files[0].text(), Object.values(progressGroups()).flat().map((entry) => entry.id)); saveProgress(localStorage, "palworld-guide-progress", state.progress); renderTools(); } catch (error) { alert(`가져오기 실패: ${error.message}`); } });
  content.querySelector("[data-progress-reset]")?.addEventListener("click", () => { if (!confirm("현재 진행 상태를 백업한 뒤 모두 초기화할까요?")) return; downloadProgress(); state.progress = emptyProgress(); saveProgress(localStorage, "palworld-guide-progress", state.progress); renderTools(); });
  content.querySelectorAll("[data-activity]").forEach((button) => button.addEventListener("click", () => { state.activityMode = button.dataset.activity; renderTools(); }));
  content.querySelector("[data-open-fishing-map]")?.addEventListener("click", () => { state.layers = new Set(["fishing", "rare_fishing"]); state.mapId = "main"; syncMapUrl(); selectTab("map"); });
  document.querySelector("#save-file")?.addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; if (file.size > 512 * 1024 * 1024) { state.saveResult = { error: "512MB를 초과하는 파일은 브라우저 메모리 보호를 위해 거부했습니다." }; renderTools(); return; } try { state.saveResult = await analyzeSave(await file.arrayBuffer(), Object.values(state.details?.pals ?? {})); } catch (error) { state.saveResult = { error: error.message }; } renderTools(); });
  content.querySelector("[data-apply-save-pals]")?.addEventListener("click", () => { for (const name of state.saveResult.pals) { const match = state.breeding?.pals.find((pal) => pal.name === name); if (match) state.breedOwned.add(match.id); } localStorage.setItem(BREEDING_STORAGE_KEY, JSON.stringify([...state.breedOwned])); renderTools(); });
}

// Sources moved out of the tab bar into a panel at the foot of every page, so
// attribution stays one click away without competing with the guide content.
function renderSources() {
  const panel = document.querySelector("#sources-body");
  if (!panel) return;
  panel.innerHTML = `<div class="sources">${state.data.sources.map((source) => `<article><span>${escapeHtml(labels[source.kind] || source.kind)}</span><h3>${escapeHtml(sourceNames[source.id] || source.name)}</h3><p>기준 ${escapeHtml(source.gameVersion)} · 확인 ${new Date(source.checkedAt).toLocaleDateString("ko-KR")}${source.license ? ` · ${escapeHtml(source.license)}` : ""}</p><a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">출처 열기 ↗</a></article>`).join("")}</div>
    <div class="attribution"><h3>이미지 저작권과 출처</h3>${state.assets.attribution.map((item) => `<p><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.usage)} · ${escapeHtml(item.license)} <a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">출처 ↗</a></p>`).join("")}<p>이 페이지는 비상업적 팬 공략집이며 Pocketpair의 공식 서비스가 아닙니다.</p></div>
    <div class="security"><h3>공개 보안 경계</h3><p>${state.data.publication.excludes.map((item) => ({ "server status": "서버 상태", players: "사용자 정보", "IP addresses": "IP 주소", credentials: "인증 정보", "Discord configuration": "Discord 설정" })[item] || item).join(" · ")}</p><p>GitHub Actions가 홈 서버와 분리된 환경에서 자료를 갱신합니다.</p></div>`;
}

function render() {
  if (state.tab === "progression") renderProgression(); else if (state.tab === "pals") renderPals();
  else if (state.tab === "breeding") renderBreeding();
  else if (state.tab === "items") renderItems();
  else if (state.tab === "builds") renderBuilds(); else if (state.tab === "traits") renderTraits();
  else if (state.tab === "map") renderMap(); else if (state.tab === "tools") renderTools(); else renderRecommendations();
  bindTraitChips();
}

// One delegated handler covers every trait mention on the page, whichever tab
// rendered it.
function bindTraitChips() {
  content.querySelectorAll("[data-trait]").forEach((button) => {
    button.addEventListener("click", () => {
      const existing = button.nextElementSibling;
      const open = existing?.classList.contains("trait-tip");
      content.querySelectorAll(".trait-tip").forEach((tip) => tip.remove());
      content.querySelectorAll("[data-trait]").forEach((item) => item.setAttribute("aria-expanded", "false"));
      if (open) return;
      const trait = traitByName(button.dataset.trait);
      if (!trait) return;
      const tip = document.createElement("span");
      tip.className = `trait-tip tier-${traitTier(trait)}`;
      tip.setAttribute("role", "note");
      tip.textContent = `${trait.descriptionKo || trait.description}${trait.stacks ? " (중첩 가능)" : ""}`;
      button.setAttribute("aria-expanded", "true");
      button.after(tip);
    });
  });
}

function selectTab(tab) {
  if (!["recommendations", "progression", "pals", "breeding", "items", "builds", "traits", "map", "tools"].includes(tab)) return;
  document.querySelectorAll("#tabs button").forEach((item) => item.classList.toggle("active", item.dataset.tab === tab));
  state.tab = tab; render(); document.querySelector("#tabs").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFreshness(data) {
  const generated = new Date(data.generatedAt); const ageHours = (Date.now() - generated.getTime()) / 3_600_000;
  const stale = !Number.isFinite(ageHours) || ageHours > (data.freshness?.staleAfterHours ?? 36);
  const freshness = document.querySelector("#freshness");
  freshness.textContent = `${stale ? "갱신 지연" : "최근 갱신"} · ${generated.toLocaleString("ko-KR")}`; freshness.classList.toggle("stale", stale);
  document.querySelector("#freshness-panel").innerHTML = data.notices.map((notice) => `<p>${escapeHtml(notice)}</p>`).join("");
}

document.querySelectorAll("#tabs button").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.tab)));
document.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.jump)));

Promise.all([
  fetch("./data/guide-data.json?v=1.12.0", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); }),
  fetch("./data/visual-assets.json?v=1.12.0", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); }),
  // The trait catalogue only powers explanations, so a failure must not blank
  // the whole guide.
  fetch("./data/traits.json?v=1.12.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/pal-details.json?v=1.12.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/breeding.json?v=1.12.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/items.json?v=1.13.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/item-localization-report.json?v=1.13.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/map-pois.json?v=1.13.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/activities.json?v=1.13.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/patch-report.json?v=1.13.0", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
]).then(([data, assets, traits, details, breeding, items, itemReport, mapPois, activities, patchReport]) => {
  state.data = data; state.assets = assets; state.traits = traits; state.details = details; state.breeding = breeding;
  if (breeding) { state.breedingIndex = createBreedingIndex(breeding); loadBreedOwned(); }
  state.items = items; state.itemReport = itemReport; state.mapPois = mapPois; state.activities = activities; state.patchReport = patchReport; if (items) state.itemIndex = createItemIndex(items);
  const validProgressIds = Object.values(progressGroups()).flat().map((entry) => entry.id);
  state.progress = loadProgress(localStorage, "palworld-guide-progress", validProgressIds);
  const mapState = parseMapState(location.search, [...new Set(allMapPoints().map((point) => point.category))], ["main", "world_tree", "sunreach"]);
  if (mapState.region) state.mapId = mapState.region;
  if (mapState.layers.length) state.layers = new Set(mapState.layers);
  state.mapQuery = mapState.query;
  if (mapState.tab) state.tab = mapState.tab;
  renderFreshness(data); renderSources();
  document.querySelectorAll("#tabs button").forEach((item) => item.classList.toggle("active", item.dataset.tab === state.tab));
  document.querySelector("#metrics").innerHTML = `<div><dt>등록 펠</dt><dd>${data.pals.length}</dd></div><div><dt>추천 빌드</dt><dd>${data.builds.length}</dd></div><div><dt>지도 지점</dt><dd>${allMapPoints().length.toLocaleString()}</dd></div><div><dt>이미지 펠</dt><dd>${Object.keys(assets.pals).length}</dd></div>`;
  render();
}).catch(() => { content.innerHTML = `<div class="error">공략 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>`; });

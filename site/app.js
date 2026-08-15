const defaultLayers = [
  "fast_travel", "alpha_pal", "boss_tower", "bounty_target", "predator_pal", "oil_rig", "world_tree", "sunreach",
];

const state = {
  data: null, assets: null, traits: null, traitIndex: null, details: null, detailIndex: null,
  tab: "recommendations", role: "combat", palRole: "combat",
  palQuery: "", mapQuery: "", mapId: "main", buildKind: "combat", progressionStage: "early", progressionKind: "combat",
  traitQuery: "", traitPolarity: "all",
  layers: new Set(defaultLayers), selected: null,
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
  main: { label: "Palpagos", terrain: true, bounds: { minX: -1099400, maxX: 349400, minY: -724400, maxY: 724400 } },
  world_tree: { label: "World Tree", terrain: true, bounds: { minX: 347351.5, maxX: 689148.5, minY: -818197, maxY: -476400 } },
  sunreach: { label: "Sunreach", terrain: false, bounds: null },
};

const mapRegionLabels = { main: "팰파고스", world_tree: "세계수", sunreach: "선리치" };

const labels = {
  combat: "전투", base: "거점", support: "지원", travel: "이동", breeding: "교배", early: "초반",
  ranch: "목장", groundMount: "지상 이동", flyingMount: "비행", waterMount: "수상 이동",
  fast_travel: "빠른 이동", alpha_pal: "알파 펠", boss_tower: "보스 타워", bounty_target: "현상수배",
  predator_pal: "포식자 펠", oil_rig: "오일 리그", world_tree: "세계수", sunreach: "선리치",
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
const elementLabels = {
  Fire: "불", Water: "물", Grass: "풀", Electric: "번개", Ice: "얼음", Ground: "땅",
  Dark: "어둠", Dragon: "용", Neutral: "무", "Poison immune": "중독 면역",
};

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
  if (point.category === "boss_tower") return towerLabels[raw] || "보스 탑";
  if (point.category === "fast_travel") return "빠른 이동 지점";
  if (point.category === "sunreach") return `선리치 · ${raw}`;
  if (point.category === "world_tree") return `세계수 · ${raw}`;
  if (point.category === "bounty_target") return "현상수배 대상";
  if (point.category === "oil_rig") {
    const level = raw.match(/Lv\s*(\d+)/i)?.[1];
    return `${level ? `Lv ${level} ` : ""}레인 밀렵단 오일 리그`;
  }
  if (point.category === "alpha_pal" || point.category === "predator_pal") {
    const englishName = raw.replace(/^(Alpha|Predator)\s+/i, "");
    const localized = displayPalName(englishName);
    return `${point.category === "alpha_pal" ? "알파" : "포식자"} ${localized}`;
  }
  return labels[point.category] || "지도 지점";
}

function pointSourceName(source) {
  if (/interactive map/i.test(source.name)) return "팰월드 인터랙티브 지도";
  if (/MapCollectablesMod/i.test(source.name)) return "MapCollectablesMod 공개 좌표";
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
  return `<div class="work-row">${ordered.map((entry) => `<span class="work-pill"><strong>${escapeHtml(entry.label)}</strong><em>${entry.level}</em></span>`).join("")}</div>`;
}

function innateTraitRow(name) {
  const detail = palDetail(name);
  if (!detail || detail.innateTraits.length === 0) return "";
  return `<div class="trait-row"><span class="trait-row-label">고유 특성</span>${detail.innateTraits.map((trait) => traitChip(trait.name)).join("")}</div>`;
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
  const source = state.data.roles[state.palRole] ?? [];
  const query = state.palQuery.trim().toLocaleLowerCase();
  return source.filter((pal) => !query || cleanPalName(pal.name).toLocaleLowerCase().includes(query) || (state.assets.koreanNames?.[pal.slug] || "").includes(query));
}

function renderPals() {
  const items = rolePals();
  const roleOptions = ["combat", "base", "ranch", "early", "groundMount", "flyingMount", "waterMount"];
  content.innerHTML = `${sectionHeading("02", "역할별 펠 도감", `${items.length}마리 검색 · 이미지를 눌러 상세 정보 확인`)}
    <div class="search-row"><label for="pal-search">펠 이름 검색</label><input id="pal-search" type="search" value="${escapeHtml(state.palQuery)}" placeholder="예: Jetragon, Orserk" autocomplete="off"></div>
    <div class="roles">${roleOptions.map((role) => `<button type="button" data-pal-role="${role}" class="${state.palRole === role ? "active" : ""}">${labels[role]}</button>`).join("")}</div>
    <div class="pal-grid">${items.slice(0, 120).map((pal) => `<article>${palImage(pal.name)}<div><span>#${Number(pal.rank) || "—"}</span><h3>${escapeHtml(displayPalName(pal.name))}</h3><p>${escapeHtml(cleanPalName(pal.name))} · ${labels[state.palRole]} 평가 · ${Number.isFinite(pal.score) ? `지표 ${Number(pal.score).toLocaleString()}` : "참고 자료"}</p><a href="${safeUrl(`https://www.palworld.tools/pals/${pal.slug}`)}" target="_blank" rel="noopener noreferrer">상세 자료 보기 ↗</a></div></article>`).join("")}</div>
    ${items.length > 120 ? `<p class="result-note">화면 성능을 위해 상위 120마리만 표시합니다. 검색하면 전체 자료에서 다시 찾습니다.</p>` : ""}`;
  content.querySelectorAll("[data-pal-role]").forEach((button) => button.addEventListener("click", () => { state.palRole = button.dataset.palRole; renderPals(); }));
  document.querySelector("#pal-search").addEventListener("input", (event) => {
    state.palQuery = event.target.value; renderPals(); const input = document.querySelector("#pal-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  });
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
  if (projection?.transform && projection?.imageTransform && projection?.size) {
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
  const screenX = (point.y - bounds.minY) / (bounds.maxY - bounds.minY);
  const screenY = (point.x - bounds.minX) / (bounds.maxX - bounds.minX);
  return { x: Math.max(0.5, Math.min(99.5, screenX * 100)), y: Math.max(0.5, Math.min(99.5, screenY * 100)) };
}

function pointWithinBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function hudCoordinate(point) {
  const transform = state.data?.map?.projection?.transform;
  const translateWorldX = transform?.translateWorldX ?? 123930;
  const translateWorldY = transform?.translateWorldY ?? 157935;
  const scale = transform?.scale || 459;
  return { x: (point.y - translateWorldY) / scale, y: (point.x + translateWorldX) / scale };
}

function pointDetail() {
  const point = state.selected;
  if (!point) return `<span>지점 정보</span><h3>지도에서 마커를 선택하세요</h3><p>좌표와 자료 상태, 원문 출처를 확인할 수 있습니다.</p>`;
  const hud = hudCoordinate(point);
  return `<span>${escapeHtml(labels[point.category] || point.category)}</span><h3>${escapeHtml(mapLabel(point))}</h3>
    <p>게임 지도 좌표 X ${Math.round(hud.x).toLocaleString()} · Y ${Math.round(hud.y).toLocaleString()}${point.count ? ` · ${Number(point.count)}개 묶음` : ""}</p>
    <p>자료 상태 ${escapeHtml(mapStatusLabels[point.versionStatus] || "확인 필요")} · 신뢰도 ${escapeHtml(confidenceLabels[point.confidence] || "확인 필요")}</p>
    ${(point.source ?? []).map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pointSourceName(source))} ↗</a>`).join("")}`;
}

function filteredMapPoints() {
  const query = state.mapQuery.trim().toLocaleLowerCase();
  return state.data.map.points.filter((point) => point.versionStatus === "current_1_0" && point.mapId === state.mapId && state.layers.has(point.category)
    && (!query || point.label.toLocaleLowerCase().includes(query) || mapLabel(point).toLocaleLowerCase().includes(query) || (labels[point.category] || "").includes(query)));
}

function renderMap() {
  const regions = state.data.map.regions ?? fallbackMapRegions;
  const region = regions[state.mapId] ?? fallbackMapRegions.main;
  const regionIds = ["main", "world_tree", "sunreach"].filter((mapId) => state.data.map.points.some((point) => point.mapId === mapId));
  const regionPoints = state.data.map.points.filter((point) => point.mapId === state.mapId);
  const categories = [...new Set(regionPoints.map((point) => point.category))].sort((a, b) => (labels[a] || a).localeCompare(labels[b] || b, "ko"));
  const points = filteredMapPoints();
  const bounds = region.bounds ?? state.data.map.bounds;
  const plottedPoints = region.terrain ? points.filter((point) => pointWithinBounds(point, bounds)) : [];
  const mapContent = region.terrain
    ? `<div class="map map-${escapeHtml(state.mapId)}" aria-label="${escapeHtml(mapRegionLabels[state.mapId] || region.label)} 1.0 현행 지형 지도"><svg class="map-markers" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="1.0 현행 지도 지점">${plottedPoints.map((point) => { const position = mapPosition(point, bounds); const label = mapLabel(point); return `<circle class="marker ${categoryClass(point.category)}" cx="${position.x.toFixed(3)}" cy="${position.y.toFixed(3)}" r="0.48" data-point="${escapeHtml(point.id)}" tabindex="0" role="button" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title></circle>`; }).join("")}</svg><span>1.0 현행 지형 · 검증 지점 ${plottedPoints.length}개</span></div>`
    : `<div class="map map-coordinates-only" aria-label="${escapeHtml(mapRegionLabels[state.mapId] || region.label)} 1.0 좌표 목록"><div><strong>1.0 현행 좌표</strong><p>검증된 지형 이미지가 없는 지역은 현행 좌표 목록만 제공합니다.</p></div></div>`;
  content.innerHTML = `${sectionHeading("04", "Palworld 1.0 현행 지도", `검증된 보스·이동 지점 ${points.length}개 표시`)}
    <div class="map-region-tabs" role="group" aria-label="지도 지역">${regionIds.map((mapId) => `<button type="button" data-map-region="${escapeHtml(mapId)}" aria-pressed="${state.mapId === mapId}">${escapeHtml(mapRegionLabels[mapId] || regions[mapId]?.label || mapId)}<small>${state.data.map.points.filter((point) => point.mapId === mapId).length}</small></button>`).join("")}</div>
    <div class="search-row map-search"><label for="map-search">장소 검색</label><input id="map-search" type="search" value="${escapeHtml(state.mapQuery)}" placeholder="예: 석탄, 보스, Jetragon" autocomplete="off"></div>
    <div class="map-layout"><aside class="layer-panel"><div class="layer-actions"><button type="button" data-layer-action="all">전체 선택</button><button type="button" data-layer-action="none">모두 해제</button></div>
      ${categories.map((category) => `<label><input type="checkbox" data-layer="${escapeHtml(category)}" ${state.layers.has(category) ? "checked" : ""}><i class="${categoryClass(category)}"></i><strong>${escapeHtml(labels[category] || category)}</strong></label>`).join("")}</aside>
      ${mapContent}
      <aside id="point-detail">${pointDetail()}</aside></div>
    <div class="point-list">${points.slice(0, 80).map((point) => { const hud = hudCoordinate(point); return `<button type="button" data-point="${escapeHtml(point.id)}"><i class="${categoryClass(point.category)}"></i><span>${escapeHtml(mapLabel(point))}</span><small>X ${Math.round(hud.x).toLocaleString()} · Y ${Math.round(hud.y).toLocaleString()}</small></button>`; }).join("")}</div>
    ${points.length > 80 ? `<p class="result-note">목록은 80개까지만 표시하지만 지도에는 검색 결과 전체가 표시됩니다.</p>` : ""}`;
  content.querySelectorAll("[data-layer]").forEach((input) => input.addEventListener("change", () => { input.checked ? state.layers.add(input.dataset.layer) : state.layers.delete(input.dataset.layer); renderMap(); }));
  content.querySelectorAll("[data-layer-action]").forEach((button) => button.addEventListener("click", () => { state.layers = button.dataset.layerAction === "all" ? new Set(categories) : new Set(); renderMap(); }));
  content.querySelectorAll("[data-map-region]").forEach((button) => button.addEventListener("click", () => { state.mapId = button.dataset.mapRegion; state.selected = null; renderMap(); }));
  content.querySelectorAll("[data-point]").forEach((button) => button.addEventListener("click", () => { state.selected = state.data.map.points.find((point) => point.id === button.dataset.point) || null; document.querySelector("#point-detail").innerHTML = pointDetail(); }));
  content.querySelectorAll("circle[data-point]").forEach((marker) => marker.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); marker.dispatchEvent(new MouseEvent("click", { bubbles: true })); } }));
  document.querySelector("#map-search").addEventListener("input", (event) => { state.mapQuery = event.target.value; renderMap(); const input = document.querySelector("#map-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
}

// Recommendations name traits without explaining them. Resolving a name against
// the catalogue lets every mention carry its effect inline.
function traitByName(name) {
  const key = String(name ?? "").trim().toLocaleLowerCase();
  if (!key) return null;
  if (!state.traitIndex) {
    state.traitIndex = new Map((state.traits?.traits ?? []).map((trait) => [trait.name.toLocaleLowerCase(), trait]));
  }
  return state.traitIndex.get(key) ?? null;
}

// Renders a trait name as a button that reveals its effect, falling back to
// plain text when the catalogue does not know the name.
function traitChip(name) {
  const trait = traitByName(name);
  const safeName = escapeHtml(String(name ?? ""));
  if (!trait) return `<span class="trait-chip trait-chip-unknown">${safeName}</span>`;
  return `<button type="button" class="trait-chip trait-${trait.polarity}" data-trait="${escapeHtml(trait.name)}" aria-expanded="false"><span>${safeName}</span>${trait.rating === null ? "" : `<small>${trait.rating > 0 ? "+" : ""}${trait.rating}</small>`}</button>`;
}

function traitPolarityLabel(polarity) {
  return { positive: "유용", negative: "불리", neutral: "중립" }[polarity] ?? polarity;
}

function renderTraits() {
  const catalogue = state.traits?.traits ?? [];
  if (catalogue.length === 0) {
    content.innerHTML = `${sectionHeading("05", "특성·패시브 사전", "자료를 불러오지 못했습니다")}<div class="error">특성 자료를 불러오지 못했습니다.</div>`;
    return;
  }
  const query = state.traitQuery.trim().toLocaleLowerCase();
  const filtered = catalogue.filter((trait) => state.traitPolarity === "all" || trait.polarity === state.traitPolarity)
    .filter((trait) => !query || trait.name.toLocaleLowerCase().includes(query) || String(trait.descriptionKo || trait.description).toLocaleLowerCase().includes(query));
  const groups = [["positive", "유용한 특성"], ["negative", "피해야 할 특성"], ["neutral", "중립 특성"]];

  content.innerHTML = `${sectionHeading("05", "특성·패시브 사전", `${catalogue.length}종 · 등급이 높을수록 유용`)}
    <div class="roles" role="group" aria-label="특성 분류">${[["all", "전체"], ...groups.map(([id, label]) => [id, label])].map(([id, label]) => `<button type="button" data-trait-polarity="${escapeHtml(id)}" class="${state.traitPolarity === id ? "active" : ""}">${escapeHtml(label)}</button>`).join("")}</div>
    <div class="search-row"><label for="trait-search">특성 검색</label><input id="trait-search" type="search" value="${escapeHtml(state.traitQuery)}" placeholder="예: 근면, work speed, attack" autocomplete="off"></div>
    <div class="trait-grid">${filtered.map((trait) => `<article class="trait-card trait-${trait.polarity}">
      <div class="trait-card-head"><h3>${escapeHtml(trait.name)}</h3>${trait.rating === null ? "" : `<span class="trait-rating">${trait.rating > 0 ? "+" : ""}${trait.rating}</span>`}</div>
      <p>${escapeHtml(trait.descriptionKo || trait.description)}</p>
      <small>${escapeHtml(traitPolarityLabel(trait.polarity))}${trait.stacks ? " · 중첩 가능" : ""}</small>
    </article>`).join("")}</div>
    ${filtered.length === 0 ? `<p class="result-note">조건에 맞는 특성이 없습니다.</p>` : ""}
    <div class="attribution"><h3>출처</h3><p>특성 효과는 <a href="${safeUrl(state.traits.sourceUrl)}" target="_blank" rel="noopener noreferrer">palworld.tools 특성 목록 ↗</a>에서 가져와 한국어로 옮깁니다. 특성 이름은 게임 내 영문 표기를 그대로 씁니다.</p></div>`;

  content.querySelectorAll("[data-trait-polarity]").forEach((button) => button.addEventListener("click", () => { state.traitPolarity = button.dataset.traitPolarity; renderTraits(); }));
  document.querySelector("#trait-search").addEventListener("input", (event) => {
    state.traitQuery = event.target.value; renderTraits();
    const input = document.querySelector("#trait-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  });
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
  else if (state.tab === "builds") renderBuilds(); else if (state.tab === "traits") renderTraits();
  else if (state.tab === "map") renderMap(); else renderRecommendations();
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
      tip.className = `trait-tip trait-${trait.polarity}`;
      tip.setAttribute("role", "note");
      tip.textContent = `${trait.descriptionKo || trait.description}${trait.stacks ? " (중첩 가능)" : ""}`;
      button.setAttribute("aria-expanded", "true");
      button.after(tip);
    });
  });
}

function selectTab(tab) {
  if (!["recommendations", "progression", "pals", "builds", "traits", "map"].includes(tab)) return;
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
  fetch("./data/guide-data.json", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); }),
  fetch("./data/visual-assets.json", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(response.status); return response.json(); }),
  // The trait catalogue only powers explanations, so a failure must not blank
  // the whole guide.
  fetch("./data/traits.json", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch("./data/pal-details.json", { cache: "no-store" }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
]).then(([data, assets, traits, details]) => {
  state.data = data; state.assets = assets; state.traits = traits; state.details = details; renderFreshness(data); renderSources();
  document.querySelector("#metrics").innerHTML = `<div><dt>등록 펠</dt><dd>${data.pals.length}</dd></div><div><dt>추천 빌드</dt><dd>${data.builds.length}</dd></div><div><dt>지도 지점</dt><dd>${data.map.points.length.toLocaleString()}</dd></div><div><dt>이미지 펠</dt><dd>${Object.keys(assets.pals).length}</dd></div>`;
  render();
}).catch(() => { content.innerHTML = `<div class="error">공략 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>`; });

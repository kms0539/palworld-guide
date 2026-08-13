const defaultLayers = [
  "fast_travel", "alpha_pal", "boss_tower", "resource_copper", "resource_coal",
  "resource_quartz", "resource_sulfur", "resource_oil", "resource_hexolite",
];

const state = {
  data: null, assets: null, tab: "recommendations", role: "combat", palRole: "combat",
  palQuery: "", mapQuery: "", layers: new Set(defaultLayers), selected: null,
};

const labels = {
  combat: "전투", base: "거점", support: "지원", travel: "이동", breeding: "교배", early: "초반",
  ranch: "목장", groundMount: "지상 이동", flyingMount: "비행", waterMount: "수상 이동",
  fast_travel: "빠른 이동", alpha_pal: "알파 펠", boss_tower: "보스 타워", bounty_target: "현상수배",
  predator_pal: "포식자 펠", oil_rig: "오일 리그", world_tree: "세계수", sunreach: "선리치",
  resource_copper: "금속 광석", resource_coal: "석탄", resource_quartz: "순수한 석영",
  resource_sulfur: "유황", resource_oil: "원유", resource_hexolite: "헥솔라이트 석영",
  official: "공식", "official-docs": "공식 문서", computed: "계산 자료", editorial: "편집형 공략",
  "map-aggregation": "지도 자료", "community-factual": "커뮤니티 좌표", "visual-assets": "시각 자료",
  "official-media": "공식 이미지",
  localization: "한글 명칭",
};

const sourceNames = {
  "palworld-official": "팰월드 공식 Steam 페이지",
  "palworld-server-docs": "팰월드 공식 서버 안내서",
  "palworld-tools": "palworld.tools 역할별 계산 순위",
  palcompass: "PalCompass 추천 펠 공략",
  "palworld-map": "팰월드 인터랙티브 지도",
  "map-collectables": "MapCollectablesMod 공개 좌표",
  "paldex-assets": "PalDex 오픈소스 지도·펠 아이콘",
  "pocketpair-official-media": "Pocketpair 공식 Palworld 이미지",
  "palworld-gg-korean-names": "Palworld.gg 한국어 펠 도감",
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

function sectionHeading(number, title, note) {
  return `<div class="heading"><div><span>${number}</span><h2>${title}</h2></div><p>${note}</p></div>`;
}

function renderRecommendations() {
  const items = state.data.editorial[state.role] ?? [];
  content.innerHTML = `${sectionHeading("01", "목적별 추천 펠", "외부 공략을 한글로 요약한 참고 순위")}
    <div class="roles">${["combat", "base", "support", "travel", "breeding", "early"].map((role) =>
      `<button type="button" data-role="${role}" class="${state.role === role ? "active" : ""}">${labels[role]}</button>`).join("")}</div>
    <div class="cards">${items.map((item) => {
      const palName = state.role === "early" ? item.role : item.pal;
      return `<article><div class="card-visual">${palImage(palName)}<span>#${Number(item.rank) || 1}</span></div>
        <div class="card-body"><p class="card-kicker">${escapeHtml(ko(item.workType || item.role || labels[state.role]))}</p>
        <h3>${escapeHtml(displayPalName(palName))}</h3><p>${escapeHtml(ko(item.reason || item.note || ""))}</p>
        ${item.limitation ? `<small>주의 · ${escapeHtml(ko(item.limitation))}</small>` : ""}
        ${item.alternative ? `<small>대안 · ${escapeHtml(item.alternative)}</small>` : ""}</div></article>`;
    }).join("")}</div>`;
  content.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    state.role = button.dataset.role; renderRecommendations();
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
  content.innerHTML = `${sectionHeading("03", "추천 빌드", "출처가 확인된 빌드만 한글로 요약")}
    <div class="builds">${state.data.builds.map((build) => {
      const translated = buildKo[build.id] ?? build;
      return `<article><div class="build-hero">${palImage(build.pal, "build-pal-image")}<div><span>${build.kind === "base" ? "거점 작업" : "전투"} · v${escapeHtml(build.gameVersion)}</span><h3>${escapeHtml(displayPalName(build.pal))} · ${escapeHtml(translated.title)}</h3><p>${escapeHtml(translated.summary)}</p></div></div>
        <div class="build-grid"><div><h4>추천 패시브</h4><ul>${translated.passives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h4>추천 스킬</h4><ul>${translated.skills.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>
        <p class="usage">${escapeHtml(translated.usage)}</p><a href="${safeUrl(build.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문 공략 확인 ↗</a></article>`;
    }).join("")}</div>`;
}

function mapPosition(point, bounds) {
  const screenX = (point.y - bounds.minY) / (bounds.maxY - bounds.minY);
  const screenY = (point.x - bounds.minX) / (bounds.maxX - bounds.minX);
  return { x: Math.max(0.5, Math.min(99.5, screenX * 100)), y: Math.max(0.5, Math.min(99.5, screenY * 100)) };
}

function hudCoordinate(point) {
  return { x: (point.y - 158000) / 459, y: (point.x + 123888) / 459 };
}

function pointDetail() {
  const point = state.selected;
  if (!point) return `<span>지점 정보</span><h3>지도에서 마커를 선택하세요</h3><p>좌표와 자료 상태, 원문 출처를 확인할 수 있습니다.</p>`;
  const hud = hudCoordinate(point);
  return `<span>${escapeHtml(labels[point.category] || point.category)}</span><h3>${escapeHtml(point.label)}</h3>
    <p>게임 지도 좌표 X ${Math.round(hud.x).toLocaleString()} · Y ${Math.round(hud.y).toLocaleString()}${point.count ? ` · ${Number(point.count)}개 묶음` : ""}</p>
    <p>자료 상태 ${escapeHtml(point.versionStatus || "확인 필요")} · 신뢰도 ${escapeHtml(point.confidence || "확인 필요")}</p>
    ${(point.source ?? []).map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)} ↗</a>`).join("")}`;
}

function filteredMapPoints() {
  const query = state.mapQuery.trim().toLocaleLowerCase();
  return state.data.map.points.filter((point) => point.mapId === "main" && state.layers.has(point.category)
    && (!query || point.label.toLocaleLowerCase().includes(query) || (labels[point.category] || "").includes(query)));
}

function renderMap() {
  const categories = [...new Set(state.data.map.points.map((point) => point.category))].sort((a, b) => (labels[a] || a).localeCompare(labels[b] || b, "ko"));
  const points = filteredMapPoints();
  const bounds = state.data.map.bounds;
  content.innerHTML = `${sectionHeading("04", "실제 지형 탐험 지도", `보스·이동·광석 ${points.length}개 표시`)}
    <div class="search-row map-search"><label for="map-search">장소 검색</label><input id="map-search" type="search" value="${escapeHtml(state.mapQuery)}" placeholder="예: 석탄, 보스, Jetragon" autocomplete="off"></div>
    <div class="map-layout"><aside class="layer-panel"><div class="layer-actions"><button type="button" data-layer-action="all">전체 선택</button><button type="button" data-layer-action="none">모두 해제</button></div>
      ${categories.map((category) => `<label><input type="checkbox" data-layer="${escapeHtml(category)}" ${state.layers.has(category) ? "checked" : ""}><i class="${categoryClass(category)}"></i><strong>${escapeHtml(labels[category] || category)}</strong></label>`).join("")}</aside>
      <div class="map" aria-label="팰월드 실제 지형 지도"><svg class="map-markers" viewBox="0 0 100 100" aria-label="지도 지점">${points.map((point) => { const position = mapPosition(point, bounds); return `<circle class="marker ${categoryClass(point.category)}" cx="${position.x.toFixed(3)}" cy="${position.y.toFixed(3)}" r="0.48" data-point="${escapeHtml(point.id)}" tabindex="0" role="button" aria-label="${escapeHtml(point.label)}"><title>${escapeHtml(point.label)}</title></circle>`; }).join("")}</svg><span>실제 지형 텍스처 · 좌표는 참고용</span></div>
      <aside id="point-detail">${pointDetail()}</aside></div>
    <div class="point-list">${points.slice(0, 80).map((point) => { const hud = hudCoordinate(point); return `<button type="button" data-point="${escapeHtml(point.id)}"><i class="${categoryClass(point.category)}"></i><span>${escapeHtml(point.label)}</span><small>X ${Math.round(hud.x).toLocaleString()} · Y ${Math.round(hud.y).toLocaleString()}</small></button>`; }).join("")}</div>
    ${points.length > 80 ? `<p class="result-note">목록은 80개까지만 표시하지만 지도에는 검색 결과 전체가 표시됩니다.</p>` : ""}`;
  content.querySelectorAll("[data-layer]").forEach((input) => input.addEventListener("change", () => { input.checked ? state.layers.add(input.dataset.layer) : state.layers.delete(input.dataset.layer); renderMap(); }));
  content.querySelectorAll("[data-layer-action]").forEach((button) => button.addEventListener("click", () => { state.layers = button.dataset.layerAction === "all" ? new Set(categories) : new Set(); renderMap(); }));
  content.querySelectorAll("[data-point]").forEach((button) => button.addEventListener("click", () => { state.selected = state.data.map.points.find((point) => point.id === button.dataset.point) || null; document.querySelector("#point-detail").innerHTML = pointDetail(); }));
  content.querySelectorAll("circle[data-point]").forEach((marker) => marker.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); marker.dispatchEvent(new MouseEvent("click", { bubbles: true })); } }));
  document.querySelector("#map-search").addEventListener("input", (event) => { state.mapQuery = event.target.value; renderMap(); const input = document.querySelector("#map-search"); input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
}

function renderSources() {
  content.innerHTML = `${sectionHeading("05", "자료 출처와 이용 범위", "공식 자료·계산 자료·이미지 출처를 구분")}
    <div class="sources">${state.data.sources.map((source) => `<article><span>${escapeHtml(labels[source.kind] || source.kind)}</span><h3>${escapeHtml(sourceNames[source.id] || source.name)}</h3><p>기준 ${escapeHtml(source.gameVersion)} · 확인 ${new Date(source.checkedAt).toLocaleDateString("ko-KR")}${source.license ? ` · ${escapeHtml(source.license)}` : ""}</p><a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">출처 열기 ↗</a></article>`).join("")}</div>
    <div class="attribution"><h3>이미지 저작권과 출처</h3>${state.assets.attribution.map((item) => `<p><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.usage)} · ${escapeHtml(item.license)} <a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">출처 ↗</a></p>`).join("")}<p>이 페이지는 비상업적 팬 공략집이며 Pocketpair의 공식 서비스가 아닙니다.</p></div>
    <div class="security"><h3>공개 보안 경계</h3><p>${state.data.publication.excludes.map((item) => ({ "server status": "서버 상태", players: "사용자 정보", "IP addresses": "IP 주소", credentials: "인증 정보", "Discord configuration": "Discord 설정" })[item] || item).join(" · ")}</p><p>GitHub Actions가 홈 서버와 분리된 환경에서 자료를 갱신합니다.</p></div>`;
}

function render() {
  if (state.tab === "recommendations") renderRecommendations(); else if (state.tab === "pals") renderPals();
  else if (state.tab === "builds") renderBuilds(); else if (state.tab === "map") renderMap(); else renderSources();
}

function selectTab(tab) {
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
]).then(([data, assets]) => {
  state.data = data; state.assets = assets; renderFreshness(data);
  document.querySelector("#metrics").innerHTML = `<div><dt>등록 펠</dt><dd>${data.pals.length}</dd></div><div><dt>추천 빌드</dt><dd>${data.builds.length}</dd></div><div><dt>지도 지점</dt><dd>${data.map.points.length.toLocaleString()}</dd></div><div><dt>이미지 펠</dt><dd>${Object.keys(assets.pals).length}</dd></div>`;
  render();
}).catch(() => { content.innerHTML = `<div class="error">공략 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>`; });

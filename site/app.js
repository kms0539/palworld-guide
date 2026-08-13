const defaultLayers = [
  "fast_travel", "alpha_pal", "boss_tower", "resource_copper", "resource_coal",
  "resource_quartz", "resource_sulfur", "resource_oil", "resource_hexolite",
];

const state = {
  data: null,
  tab: "recommendations",
  role: "combat",
  palRole: "combat",
  palQuery: "",
  mapQuery: "",
  layers: new Set(defaultLayers),
  selected: null,
};

const labels = {
  combat: "전투", base: "거점", support: "서포트", travel: "이동", breeding: "교배", early: "초반",
  ranch: "목장", groundMount: "지상 이동", flyingMount: "비행", waterMount: "수상 이동",
  fast_travel: "빠른 이동", alpha_pal: "알파 팰", boss_tower: "보스 타워", bounty_target: "현상수배",
  predator_pal: "포식자 팰", oil_rig: "오일 리그", world_tree: "월드 트리", sunreach: "선리치",
  resource_copper: "금속 광석", resource_coal: "석탄", resource_quartz: "순수한 석영",
  resource_sulfur: "유황", resource_oil: "원유", resource_hexolite: "헥솔라이트 석영",
};

const content = document.querySelector("#content");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
};
const categoryClass = (category) => `category-${String(category).replace(/[^a-z0-9_-]/gi, "")}`;

function renderRecommendations() {
  const items = state.data.editorial[state.role] ?? [];
  content.innerHTML = `
    <div class="heading"><div><span>01</span><h2>목적별 추천</h2></div><p>외부 편집형 추천 · 공식 순위 아님</p></div>
    <div class="roles">${["combat", "base", "support", "travel", "breeding", "early"].map((role) =>
      `<button type="button" data-role="${role}" class="${state.role === role ? "active" : ""}">${labels[role]}</button>`).join("")}</div>
    <div class="cards">${items.map((item) => `<article>
      <span>#${Number(item.rank) || 1}</span><h3>${escapeHtml(item.pal)}</h3>
      <strong>${escapeHtml(item.workType || item.role || "추천")}</strong>
      <p>${escapeHtml(item.reason || item.note || "")}</p>
      ${item.limitation ? `<small>주의: ${escapeHtml(item.limitation)}</small>` : ""}
      ${item.alternative ? `<small>대안: ${escapeHtml(item.alternative)}</small>` : ""}
    </article>`).join("")}</div>`;
  content.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    state.role = button.dataset.role;
    renderRecommendations();
  }));
}

function rolePals() {
  const source = state.data.roles[state.palRole] ?? [];
  const query = state.palQuery.trim().toLocaleLowerCase();
  return source.filter((pal) => !query || pal.name.toLocaleLowerCase().includes(query));
}

function renderPals() {
  const items = rolePals();
  const roleOptions = ["combat", "base", "ranch", "early", "groundMount", "flyingMount", "waterMount"];
  content.innerHTML = `
    <div class="heading"><div><span>02</span><h2>역할별 펠 도감</h2></div><p>계산형 순위 · ${items.length}마리 검색됨</p></div>
    <div class="search-row">
      <label for="pal-search">펠 이름 검색</label>
      <input id="pal-search" type="search" value="${escapeHtml(state.palQuery)}" placeholder="예: Jetragon, Orserk" autocomplete="off">
    </div>
    <div class="roles">${roleOptions.map((role) =>
      `<button type="button" data-pal-role="${role}" class="${state.palRole === role ? "active" : ""}">${labels[role]}</button>`).join("")}</div>
    <div class="pal-grid">${items.slice(0, 120).map((pal) => `<article>
      <span>#${Number(pal.rank) || "—"}</span>
      <h3>${escapeHtml(pal.name)}</h3>
      <strong>${escapeHtml(labels[state.palRole])}</strong>
      <p>${Number.isFinite(pal.score) ? `지표 ${Number(pal.score).toLocaleString()}` : "역할별 평가 자료"}</p>
      <a href="${safeUrl(`https://www.palworld.tools/pals/${pal.slug}`)}" target="_blank" rel="noopener noreferrer">상세 정보 ↗</a>
    </article>`).join("")}</div>
    ${items.length > 120 ? `<p class="result-note">검색 성능을 위해 상위 120마리만 표시합니다. 이름을 입력하면 전체 데이터에서 다시 찾습니다.</p>` : ""}`;

  content.querySelectorAll("[data-pal-role]").forEach((button) => button.addEventListener("click", () => {
    state.palRole = button.dataset.palRole;
    renderPals();
  }));
  document.querySelector("#pal-search").addEventListener("input", (event) => {
    state.palQuery = event.target.value;
    renderPals();
    const input = document.querySelector("#pal-search");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

function renderBuilds() {
  content.innerHTML = `
    <div class="heading"><div><span>03</span><h2>검증된 빌드</h2></div><p>수집 가능한 원문이 있는 빌드만 표시</p></div>
    <div class="builds">${state.data.builds.map((build) => `<article>
      <header><span>${escapeHtml(build.kind.toUpperCase())} · v${escapeHtml(build.gameVersion)}</span>
      <h3>${escapeHtml(build.pal)} · ${escapeHtml(build.title)}</h3><p>${escapeHtml(build.summary)}</p></header>
      <div class="build-grid"><div><h4>추천 패시브</h4><ul>${build.passives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><h4>추천 스킬</h4><ul>${build.skills.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>
      <p class="usage">${escapeHtml(build.usage)}</p><a href="${safeUrl(build.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문 공략 ↗</a>
    </article>`).join("")}</div>`;
}

function mapPosition(point, bounds) {
  const x = (point.x - bounds.minX) / (bounds.maxX - bounds.minX);
  const y = 1 - ((point.y - bounds.minY) / (bounds.maxY - bounds.minY));
  return {
    x: Math.max(1, Math.min(48, Math.round(x * 47) + 1)),
    y: Math.max(1, Math.min(48, Math.round(y * 47) + 1)),
  };
}

function pointDetail() {
  const point = state.selected;
  if (!point) return `<span>POINT INSPECTOR</span><h3>지점을 선택하세요</h3><p>마커나 목록을 누르면 좌표와 원문 출처를 표시합니다.</p>`;
  return `<span>${escapeHtml(labels[point.category] || point.category)}</span>
    <h3>${escapeHtml(point.label)}</h3>
    <p>X ${Number(point.x).toLocaleString()} · Y ${Number(point.y).toLocaleString()}${point.count ? ` · ${Number(point.count)}개 묶음` : ""}</p>
    <p>자료 상태: ${escapeHtml(point.versionStatus || "unknown")} · 신뢰도 ${escapeHtml(point.confidence || "unknown")}</p>
    ${(point.source ?? []).map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)} ↗</a>`).join("")}`;
}

function filteredMapPoints() {
  const query = state.mapQuery.trim().toLocaleLowerCase();
  return state.data.map.points.filter((point) => point.mapId === "main"
    && state.layers.has(point.category)
    && (!query || point.label.toLocaleLowerCase().includes(query) || (labels[point.category] || "").includes(query)));
}

function renderMap() {
  const categories = [...new Set(state.data.map.points.map((point) => point.category))].sort((a, b) =>
    (labels[a] || a).localeCompare(labels[b] || b, "ko"));
  const points = filteredMapPoints();
  const bounds = state.data.map.bounds;
  content.innerHTML = `
    <div class="heading"><div><span>04</span><h2>좌표형 탐험 지도</h2></div><p>보스·이동·광석 · ${points.length}개 표시</p></div>
    <div class="search-row map-search"><label for="map-search">지점 검색</label><input id="map-search" type="search" value="${escapeHtml(state.mapQuery)}" placeholder="예: 석탄, 보스, Jetragon" autocomplete="off"></div>
    <div class="map-layout">
      <aside class="layer-panel"><div class="layer-actions"><button type="button" data-layer-action="all">전체</button><button type="button" data-layer-action="none">해제</button></div>
        ${categories.map((category) => `<label><input type="checkbox" data-layer="${escapeHtml(category)}" ${state.layers.has(category) ? "checked" : ""}>
        <i class="${categoryClass(category)}"></i><strong>${escapeHtml(labels[category] || category)}</strong></label>`).join("")}</aside>
      <div class="map" aria-label="Palworld 좌표 참고 지도">${points.map((point) => {
        const position = mapPosition(point, bounds);
        return `<button type="button" class="marker gx-${position.x} gy-${position.y} ${categoryClass(point.category)}" data-point="${escapeHtml(point.id)}" title="${escapeHtml(point.label)}" aria-label="${escapeHtml(point.label)}"></button>`;
      }).join("")}<span>SCHEMATIC MAP · NOT TERRAIN</span></div>
      <aside id="point-detail">${pointDetail()}</aside>
    </div>
    <div class="point-list">${points.slice(0, 80).map((point) => `<button type="button" data-point="${escapeHtml(point.id)}"><i class="${categoryClass(point.category)}"></i><span>${escapeHtml(point.label)}</span><small>X ${Math.round(point.x).toLocaleString()} · Y ${Math.round(point.y).toLocaleString()}</small></button>`).join("")}</div>
    ${points.length > 80 ? `<p class="result-note">목록은 80개까지만 표시하지만 지도에는 검색 결과 전체가 표시됩니다.</p>` : ""}`;

  content.querySelectorAll("[data-layer]").forEach((input) => input.addEventListener("change", () => {
    input.checked ? state.layers.add(input.dataset.layer) : state.layers.delete(input.dataset.layer);
    renderMap();
  }));
  content.querySelectorAll("[data-layer-action]").forEach((button) => button.addEventListener("click", () => {
    state.layers = button.dataset.layerAction === "all" ? new Set(categories) : new Set();
    renderMap();
  }));
  content.querySelectorAll("[data-point]").forEach((button) => button.addEventListener("click", () => {
    state.selected = state.data.map.points.find((point) => point.id === button.dataset.point) || null;
    document.querySelector("#point-detail").innerHTML = pointDetail();
  }));
  document.querySelector("#map-search").addEventListener("input", (event) => {
    state.mapQuery = event.target.value;
    renderMap();
    const input = document.querySelector("#map-search");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

function renderSources() {
  content.innerHTML = `<div class="heading"><div><span>05</span><h2>출처·공개 범위</h2></div><p>구조화된 사실과 원문 링크만 표시</p></div>
    <div class="sources">${state.data.sources.map((source) => `<article><span>${escapeHtml(source.kind)}</span><h3>${escapeHtml(source.name)}</h3>
    <p>대상 ${escapeHtml(source.gameVersion)} · ${new Date(source.checkedAt).toLocaleDateString("ko-KR")}</p><a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">출처 열기 ↗</a></article>`).join("")}</div>
    <div class="security"><h3>공개 보안 경계</h3><p>${state.data.publication.excludes.map(escapeHtml).join(" · ")}</p><p>GitHub Actions가 홈 서버와 분리된 환경에서 자료를 갱신합니다.</p></div>`;
}

function render() {
  if (state.tab === "recommendations") renderRecommendations();
  else if (state.tab === "pals") renderPals();
  else if (state.tab === "builds") renderBuilds();
  else if (state.tab === "map") renderMap();
  else renderSources();
}

function renderFreshness(data) {
  const generated = new Date(data.generatedAt);
  const ageHours = (Date.now() - generated.getTime()) / 3_600_000;
  const stale = !Number.isFinite(ageHours) || ageHours > (data.freshness?.staleAfterHours ?? 36);
  const freshness = document.querySelector("#freshness");
  freshness.textContent = `${stale ? "갱신 지연" : "최근 갱신"} · ${generated.toLocaleString("ko-KR")}`;
  freshness.classList.toggle("stale", stale);
  document.querySelector("#freshness-panel").innerHTML = data.notices.map((notice) => `<p>${escapeHtml(notice)}</p>`).join("");
}

document.querySelectorAll("#tabs button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("#tabs button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  state.tab = button.dataset.tab;
  render();
}));

fetch("./data/guide-data.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(response.status);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    renderFreshness(data);
    document.querySelector("#metrics").innerHTML = `<div><dt>등록 펠</dt><dd>${data.pals.length}</dd></div><div><dt>추천 빌드</dt><dd>${data.builds.length}</dd></div><div><dt>지도 지점</dt><dd>${data.map.points.length}</dd></div><div><dt>자료 기준</dt><dd>${escapeHtml(data.gameVersion)}</dd></div>`;
    render();
  })
  .catch(() => {
    content.innerHTML = `<div class="error">공략 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>`;
  });

# MS 팰월드 공략집

매일 갱신되는 공개 팰월드 공략집과 GitHub Pages 배포만 포함하는 독립 저장소입니다.

추천 빌드는 단일 펠의 패시브뿐 아니라 속성 상성, 5인 파티, 서포트 펠 채용 사유, 실전 운용 순서와 교체 조건을 함께 제공합니다.

지도 확장, 보스 상성 후보, 생산 플래너, 로컬 진행 체크리스트, 낚시·원정, 읽기 전용 세이브 분석과 패치 비교 도구를 한글 UI로 제공합니다.

- 공개 사이트: https://kms0539.github.io/palworld-guide/
- 화면: `site/`
- 자료 수집·정제: `scripts/update-guide-data.mjs`
- 펠 상세 수집: `scripts/update-pal-details.mjs`
- 번식 데이터 수집: `scripts/update-breeding-data.mjs`
- 아이템·제작 데이터 수집: `scripts/update-item-data.mjs`
- 아이템 한글명·이미지 동기화: `scripts/sync-item-localization.mjs`
- 공개 데이터 생성: `scripts/build-public-guide.mjs`
- 이미지 검증·동기화: `scripts/sync-visual-assets.mjs`
- 공개 범위 검사: `tests/guide.test.mjs`
- 데이터 확장 로드맵: `docs/implementation-roadmap.md`
- 공개 데이터 계약: `site/data/data-registry.json`
- 이미지 미확인 목록: `docs/missing-item-images.md`

## 화면 스타일 구조

CSS는 아래 순서로 불러오며, 뒤 파일이 앞 파일을 덮어씁니다.

| 파일 | 역할 |
| --- | --- |
| `site/styles.css` | 페이지 골격(머리말·히어로·격자 배치) |
| `site/components.css` | **공통 토큰과 재사용 컴포넌트** — 글자 크기 척도, 여백·모서리, 포커스 링, 탭·칩·패널·입력 필드 |
| `site/progression.css` | 성장 단계 화면 전용 |
| `site/enhancements.css` | 화면별 세부 스타일 |
| `site/map-markers.css` | 지도·마커 전용 |

- 글자 크기는 `--fs-2xs`(11px)~`--fs-lg`(16px) 토큰만 사용합니다. 화면마다 7~11px가 흩어져 있으면 한글이 읽기 어려워지므로 px를 직접 쓰지 않습니다.
- "여러 개 중 하나 고르기" 줄은 `site/app.js`의 `tabGroup()`으로 만듭니다. 선택 상태는 `.active`와 `aria-pressed`가 항상 함께 바뀝니다(`syncTabState()`).
- 알약형 버튼은 `.chip`, 분리형 탭은 `.segmented`, 제목+본문 상자는 `.panel`을 씁니다.
- 누르는 영역은 `--tap`(40px)을 최소로 둡니다.

## 로컬 갱신

```powershell
pnpm run refresh
pnpm run breeding:refresh
pnpm run items:refresh
pnpm run items:localize
pnpm run map:refresh
pnpm run activities:refresh
pnpm run patch:snapshot
pnpm run assets:sync
pnpm test
```

번식·아이템 데이터는 검증된 원본 리비전에 고정되어 있으므로 일일 `refresh`에 포함하지 않습니다. 출처 리비전을 검수해 변경할 때 각각의 전용 명령으로 다시 생성합니다.

## 이미지 출처

- 펠 아이콘과 실제 월드 지도는 MIT로 공개된 [PalDex](https://github.com/catrenelle/PalDex) 자료를 우선 사용합니다.
- PalDex에 아직 반영되지 않은 최신 펠 아이콘은 [Palworld.gg 펠 도감](https://palworld.gg/ko/pals)에서 보완하며, 게임 이미지 권리는 Pocketpair에 있습니다.
- 상단 소개 이미지는 [Pocketpair 공식 Palworld 사이트](https://www.pocketpair.jp/games/palworld/)의 홍보 자료를 사용합니다.
- 한글 펠 명칭은 [Palworld.gg 한국어 도감](https://palworld.gg/ko/pals)과 대조합니다.
- Palworld, 캐릭터, 지도 및 게임 자산의 권리는 Pocketpair에 있습니다.
- 출처와 자산 SHA-256은 `site/data/visual-assets.json`에 기록합니다.
- 아이템·구조물 한글명과 아이콘은 고정 리비전의 `palworld-save-pal` 게임 데이터에서 대조하며, 원본에 한국어가 없는 명칭은 편집 번역으로 구분합니다.
- 아이템 이미지 SHA-256과 누락 사유는 `site/data/item-localization-report.json`에 기록합니다.

## 공개 보안 경계

이 저장소와 공개 사이트에는 다음 내용을 포함하지 않습니다.

- 홈 서버 상태 및 내부 API
- 사용자·접속 기록
- 사설 IP와 포트 설정
- 비밀번호·토큰·인증 정보
- Discord 서버 및 봇 설정

대시보드와 서버 운영 코드는 별도 저장소에서 관리합니다.

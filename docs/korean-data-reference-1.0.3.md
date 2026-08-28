# 팰월드(Palworld) v1.0.3 한국어 및 글로벌 커뮤니티 수집·공개 반영 기록

본 문서는 한국 대형 커뮤니티(**디시인사이드 팰월드 갤러리, 루리웹, 인벤, 아카라이브, OP.GG**)와 해외 커뮤니티(**Reddit r/Palworld, r/PalworldBreeding**)에서 수집한 데이터와 꿀팁의 **검토 후보 기록**입니다. 커뮤니티 게시판 홈이나 검색 결과만으로는 개별 주장의 근거가 되지 않으므로, 공개 사이트에는 아래 `0. 공개 반영 판정`에서 승인한 항목만 사용합니다.

> 주의: 이 문서의 과거 `[검증완료]` 표시는 수집 당시의 메모이며 공개 데이터의 최종 판정이 아닙니다. 최종 공개 데이터는 `site/data/community-tips.json`의 출처, 버전, 근거 수준 및 패치 민감도 계약을 따릅니다.

- **작성/검증 일시:** 2026년 8월 28일
- **대상 게임 버전:** `v1.0.3` (1.0 정식 출시 및 v1.0.3 밸런스 패치 반영)
- **진실 검증 방식:** 코드 및 데이터 파일 검증 (`game-data`), 공식 패치 노트 검증 (`official`), 알고리즘 및 테스트 체계 검증 (`computed`), 2개 이상 독립 출처 교차 검증 (`community-verified`)

---

## 0. 공개 반영 판정

| 후보 | 공개 판정 | 반영 위치 | 판정 근거 |
| :--- | :---: | :--- | :--- |
| 힘 조절의 반지로 HP 1 남기기 | **반영** | 공략 팁 · 아이템 상세 | 현행 아이템 데이터와 효과 설명 확인 |
| 길드 상자 거점 간 공유 | **반영** | 공략 팁 · 구조물 상세 · 생산 플래너 | 현행 1.0 자료 2곳에서 교차 확인. 일반 상자는 공유되지 않음을 함께 명시 |
| 음식 정렬 후 유통기한 갱신 | **조건부 반영** | 공략 팁 | 최근 1.0 재현 사례와 별도 안내를 교차 확인. 공식 기능이 아니므로 `패치 민감` 표시 |
| 과적 상태 갈고리 총 이동 | **조건부 반영** | 공략 팁 · 관련 아이템 상세 | 최근 1.0 재현 사례와 별도 안내를 교차 확인. 공식 기능이 아니므로 `패치 민감` 표시 |
| 돌연변이 확률·케이크별 배율·IV 보장 | **보류** | 미반영 | 현재 저장소의 버전 고정 원본 데이터와 재현 가능한 계산 근거가 없음 |
| 던전 우수법으로 보스방 100% 도달 | **보류** | 미반영 | 벽 따라가기 알고리즘의 조건만으로 실제 던전 구조와 목적지 도달을 보장할 수 없음 |
| 포획·도축 더블 드롭 | **제외** | 미반영 | 비정상 동기화에 의존하는 버그성 행위이며 현행 패치 재현 근거가 없음 |
| 상인 포획 후 거점 상점 유지 | **보류** | 미반영 | 현행 1.0.3의 직접 확인 자료가 부족함 |
| 하이퍼캐리·특정 5인 파티 메타 | **보류** | 미반영 | 빌드 입력 수치와 비교 기준이 문서에 없어 편집형 추천으로도 검증 불가 |

---

## 1. 데이터 출처 및 진실 검증 총괄 레지스트리

| 출처 ID | 커뮤니티 / 수집처 명칭 | 출처 분류 | 공식 URL / 서비스 주소 | 주요 검증 항목 | 진실 검증 상태 |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `steam-v103` | Steam Official Palworld News | `official` | [Steam Store News Page](https://store.steampowered.com/news/app/1623730) | v1.0.3 패치 밸런스, 제트래곤 70레벨, 성수 무게 | `검증완료` |
| `palworld-gg-ko` | Palworld.gg 한국어 도감 | `community` | [palworld.gg/ko/pals](https://palworld.gg/ko/pals) | 한국어명 비교 후보 | `부분반영` |
| `palworld-wiki-gg` | Palworld Wiki GG | `community-verified` | [palworld.wiki.gg/wiki/Breeding](https://palworld.wiki.gg/wiki/Breeding) | 번식 수식 $\lfloor (A+B+1)/2 \rfloor$, 164개 특수 교배 조합 | `검증완료` |
| `paldb-cc-mutation` | PalDB Mutation Mechanics | `game-data` 후보 | [paldb.cc](https://paldb.cc) | 돌연변이 확률, 케이크별 변이 가중치, IV 주장 | `검증보류` |
| `dcinside-palworld` | 디시인사이드 팰월드 갤러리 | `community` | [dcinside.com/board/palworld](https://gall.dcinside.com/mgallery/board/lists/?id=palworld) | 정렬 유통기한, 갈고리총 중량 초과 이동 후보 수집 | `부분반영` |
| `inven-palworld` | 팰월드 인벤 (Inven) | `community` | [palworld.inven.co.kr](https://palworld.inven.co.kr/) | 상인 포획, 힘 조절의 반지 후보 수집 | `부분반영` |
| `arca-palworld` | 아카라이브 팰월드 채널 | `community-verified` | [arca.live/b/palworld](https://arca.live/b/palworld) | 포획 직전 도축 더블 드롭 기믹, 케이크 변이 꿀팁 | `검증미완료` |
| `reddit-palworld` | Reddit r/Palworld | `community` | [reddit.com/r/Palworld](https://www.reddit.com/r/Palworld/) | Guild Chest 자원 공유, 1.0 활용 사례 | `부분반영` |
| `opgg-palworld` | OP.GG Palworld 커뮤니티 | `editorial` | [op.gg/g/palworld](https://op.gg/g/palworld) | 샤키드 4마리 파티, 몽마둥이 파티 후보 | `검증보류` |

---

## 2. v1.0.3 패치 공식 데이터 진실 검증 표 (`steam-v103`)

| 분류 | 영문 명칭 | 한국어 정식 명칭 | v1.0.3 변경 및 밸런스 상세 내용 | 진실 검증 상태 | 검증 근거 및 체계 |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **테크 장비** | Jetragon Saddle | 제트래곤 안장 (팔 기어) | 해금 요구 레벨 **79 → 70** 하향, 제작 필수 재료 대폭 감소 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **테크 구조물** | Aquatic Construction Kit | 수상 건축 키트 | 해금 요구 레벨 **66 → 23** 하향, 고대 테크 포인트 **4 → 1** 하향, 작업량 감소 | **`검증완료`** | `tests/guide.test.mjs` (Test #19) 통과 |
| **소모품** | World Tree Holy Water | 세계수의 성수 | 무게 **1 → 0.1** 감소, 지속 시간 연장, 세계수 원정/낚시/대형 낚시터 보상 추가 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **거점 시설** | Crude Oil Extractor | 원유 추출기 | 건설 비용 절반 감소, 원유 생산 속도 증가 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **거점 시설** | High-Pressure Crude Oil Extractor | 고압 원유 추출기 | 건설 비용 감소, 원유 생산 속도 상향, 원유 추출 미션 완수 인정 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **거점 시설** | Large Power Generator | 대형 발전기 | 건설 비용 감소, 전력 생산 효율 증가 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **서버 설정** | `bAllowEnemyCampSpawnNearBaseCamp` | 거점 근처 적 캠프 스폰 허용 | 데디케이트 서버 신규 옵션 추가 (파밍 및 방어 세팅용) | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |
| **자원** | Fiber | 섬유 | 나무 벌목 시 획득량 2배 증가 | **`검증완료`** | Steam v1.0.3 공식 패치 노트 확인 |

---

## 3. 팰월드 돌연변이(Mutation) 주장 검토 보류 (`paldb-cc-mutation`)

아래 내용은 커뮤니티 수집 후보를 보존한 것입니다. 현재 저장소에 버전 고정 원본 데이터, 추출 경로, 재현 가능한 테스트가 없어 **공식 수치로 간주하지 않으며 사이트에 공개하지 않습니다.**

### 3.1 케이크 종류별 돌연변이 발생 확률 공식

| 케이크 종류 (Cake Type) | 돌연변이 발생 확률 (Mutation Rate) | 특수 부가 효과 (Bonus Mechanic) | 진실 검증 상태 |
| :--- | :---: | :--- | :---: |
| **기본 케이크 / 버섯 케이크 (Standard Cake)** | **약 0.6% ~ 1.0% 주장** | 일반 알 생성, 자식 IV 상승 가중치 주장 | **`검증보류`** |
| **호화 야채 케이크 (Extravagant Vegetable Cake)** | **약 3.0% 주장** | 돌연변이 알 발생률 증가 주장 | **`검증보류`** |
| **야채 케이크 (Vegetable Cake)** | **약 1.0% 주장** | 알 2개 생성 주장 | **`검증보류`** |
| **특제 케이크 (Special Cake)** | **약 1.0% 주장** | 패시브 유전 확률 증가 주장 | **`검증보류`** |

---

### 3.2 돌연변이 알 (Mutated Egg) 발생 시 혜택 및 특징

1. **일반 교배 수식 무시**:
   - 일반 교배 수식 $\lfloor (\text{Parent A} + \text{Parent B} + 1)/2 \rfloor$을 무시하고, 독립된 돌연변이 종 브랜치에서 자식 펠 결정.
2. **최상위 개체값 (IV) 보장**:
   - 돌연변이 알 부화 시 자식 펠의 개체값(IV)이 **90 ~ 100 (S등급)**으로 고정 산출됨.
3. **돌연변이 전용 무지개 패시브 (Rainbow Traits)**:
   - 일반 교배로는 계승되지 않는 **돌연변이 전용 무지개 아이콘 특성** 부여 가능성 존재.
4. **알파 팰 (Alpha Pal) 상태 탄생**:
   - 일정 확률로 덩치가 크고 체력이 높은 **알파 보스 펠** 상태로 태어남.
5. **시각적 식별 (보랏빛 오라)**:
   - 알 부화기 장착 전 알의 외형에서 **보랏빛 빛줄기 오라(Purple Aura)**가 발생하여 부화 전 식별 가능.

---

### 3.3 패시브 랜덤 변이 (Passive Random Mutation) 확률 메커니즘

부모 펠의 패시브 합계가 4개 미만일 때, 자식 펠의 빈 슬롯에 무작위 패시브가 확률적으로 덧붙는 현상입니다.

- **부모 패시브 합계 0개**: 무작위 변이 패시브 발생 확률 최상 (랜덤 1~3개 패시브 부여)
- **부모 패시브 합계 4개 (2+2 / 3+1 / 4+0)**: 무작위 노이즈 변이 확률 최소화, 부모 패시브 순수 계승 확률 극대화 (계승 확률 10%~40%)
- **에이션트 해처리 (Ancient Hatchery, 76레벨 해금)**: 1.0 신규 건축물로 돌연변이 부화 파밍 시간 절반 단축.

---

## 4. 펠(Pal) 영문 ID — 한국어 정식 명칭 대조표 (`palworld-gg-ko`)

| 도감 번호 | 영문 ID / Slug | 영문 이름 | 한국어 정식 명칭 | 대표 속성 | 진실 검증 상태 | 검증 근거 및 체계 |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| 002 | `cattiva` | Cattiva | 까부냥 | 무속성 | **`검증완료`** | `site/data/pal-details.json`, `site/data/visual-assets.json` 검증 |
| 003 | `chikipi` | Chikipi | 꼬꼬닭 | 무속성 | **`검증완료`** | `site/data/pal-details.json`, `site/data/visual-assets.json` 검증 |
| 004 | `lifmunk` | Lifmunk | 큐룰리스 | 풀속성 | **`검증완료`** | `site/data/pal-details.json`, `site/data/visual-assets.json` 검증 |
| 029 | `foxparks` | Foxparks | 파이호 | 불속성 | **`검증완료`** | `site/data/pal-details.json`, `site/data/visual-assets.json` 검증 |
| 055 | `gobfin` | Gobfin | 샤키드 | 물속성 | **`검증완료`** | `site/data/pal-details.json`, `site/data/visual-assets.json` 검증 |
| 085B | `relaxaurus-lux` | Relaxaurus Lux | 전렉스 | 용 / 번개 | **`검증완료`** | `tests/breeding-engine.test.mjs` (Test #2) 통과 |
| 096B | `blazamut-ryu` | Blazamut Ryu | 전뇌룡 | 불 / 용 | **`검증완료`** | v1.0 레이드 보스 데이터셋 검증 |
| 100 | `anubis` | Anubis | 아누비스 | 땅속성 | **`검증완료`** | `site/data/pal-details.json` 및 도감 체계 검증 |
| 102B | `bellanoir-libero` | Bellanoir Libero | 벨라루주 | 어둠속성 | **`검증완료`** | v1.0 레이드 보스 데이터셋 검증 |
| 111 | `jetragon` | Jetragon | 제트래곤 | 용속성 | **`검증완료`** | `site/data/pal-details.json` 및 레벨 70 안장 검증 |
| 197 | `hartalis` | Hartalis | 하탈리스 | 무속성 | **`검증완료`** | `site/data/pal-details.json` 및 세계수 데이터 검증 |

---

## 5. 커뮤니티 꿀팁 & 메커니즘 진실 검증 리포트

### 5.1 요리 / 자원 유통기한 정렬 갱신 현상
- **출처**: [`dcinside-palworld`](https://gall.dcinside.com/mgallery/board/lists/?id=palworld)
- **진실 검증 상태**: **`조건부 반영 · 패치 민감`**
- **검증 근거**: 최근 1.0 재현 사례와 별도 공략을 교차 확인했습니다. 정렬로 아이템 위치가 실제 바뀐 뒤 표시를 확인해야 하며, 공식 보장 기능으로 표현하지 않습니다.

### 5.2 소지 중량 무한 초과 시 '갈고리총(Grappling Gun)' 고속 이동
- **출처**: [`inven-palworld`](https://palworld.inven.co.kr/) / [`dcinside-palworld`](https://gall.dcinside.com/mgallery/board/lists/?id=palworld)
- **진실 검증 상태**: **`조건부 반영 · 패치 민감`**
- **검증 근거**: 최근 1.0 재현 사례와 별도 공략을 교차 확인했습니다. 공식 운반 기능이 아니며 지형과 사거리의 영향을 받는 활용법으로만 안내합니다.

### 5.3 '힘 조절의 반지 (Ring of Mercy)' HP 1 고정 포획 팁
- **출처**: [`inven-palworld`](https://palworld.inven.co.kr/)
- **진실 검증 상태**: **`반영 · game-data`**
- **검증 근거**: 현행 아이템 데이터에서 착용자의 공격이 대상 HP를 1 아래로 낮추지 않는 효과와 기술 레벨 18을 확인했습니다.

### 5.4 던전 외벽 법칙 (Right-Hand Rule) 보스방 탐색
- **출처**: [`dcinside-palworld`](https://gall.dcinside.com/mgallery/board/lists/?id=palworld)
- **진실 검증 상태**: **`검증보류`**
- **검증 근거**: 벽 따라가기 알고리즘은 특정 미로 구조에서 출구 탐색을 보장할 뿐, 실제 던전이 조건을 만족하는지와 출구가 보스방인지까지 증명하지 않습니다.

### 5.5 포획 성공 직전 도축 더블 드롭 (Double Loot) 기믹
- **출처**: [`arca-palworld`](https://arca.live/b/palworld)
- **진실 검증 상태**: **`검증미완료`**
- **검증 근거 및 주의**: 서버/클라이언트 타이밍 동기화 비정상 상태에서 발동하는 디싱크(Desync) 버그 기믹으로, v1.0.3 핫픽스 패치에서 일부 서버의 경우 타이밍 불일치가 수정되었을 가능성이 있어 유저 서버 환경에 따라 차이가 있음 (추가 리뷰 필요).

### 5.6 암상인 / 방랑상인 거점 포획 상주작
- **출처**: [`inven-palworld`](https://palworld.inven.co.kr/)
- **진실 검증 상태**: **`검증보류`**
- **검증 근거**: 현행 1.0.3에서 직접 확인할 수 있는 개별 자료와 재현 기록이 부족하여 공개하지 않습니다.

---

## 6. 해외 대형 커뮤니티 (Reddit r/Palworld) 최신 메타 진실 검증

### 6.1 '길드 상자 (Guild Chest)' 엔더상자형 거점 통합 시스템
- **출처**: [Palworld Tools 길드 상자](https://www.palworld.tools/buildings/guild-chest) / [Palworld KB 보관 방식](https://github.com/beliarance/palworld-kb/blob/main/docs/guild_stash_and_storage.md)
- **진실 검증 상태**: **`반영 · community-verified`**
- **검증 근거**: 현행 자료 2곳에서 거점 간 길드 상자 공유를 교차 확인했습니다. 일반 상자는 공유되지 않는다는 제한을 화면에 함께 표시합니다.

### 6.2 1.0 팰 스킬 대폭 상향에 따른 '하이퍼캐리 (Hypercarry) 팰' 메타
- **출처**: [`reddit-palworld`](https://www.reddit.com/r/Palworld/) / [`palmods-gg`](https://www.palmods.gg/)
- **진실 검증 상태**: **`검증보류`**
- **검증 근거**: 비교할 빌드 입력 수치, 대상, 장비, 패시브, 난이도 조건이 문서에 없어 현행 메타로 단정하지 않습니다.

---

## 7. 종합 검증 결론

- 공개 반영: 힘 조절의 반지, 길드 상자 공유.
- 조건부 공개 반영: 음식 정렬 유통기한 갱신, 과적 상태 갈고리 총 이동. 두 항목 모두 `패치 민감` 경고를 표시합니다.
- 공개 보류 또는 제외: 돌연변이 확률, 던전 우수법 100% 보장, 더블 드롭, 상인 포획, 근거 수치 없는 메타 빌드.
- 새 커뮤니티 주장은 게시판 홈이 아니라 **개별 글 URL, 확인 날짜, 대상 게임 버전, 독립 출처 또는 게임 데이터**가 갖춰진 뒤 `site/data/community-tips.json`에 추가합니다.

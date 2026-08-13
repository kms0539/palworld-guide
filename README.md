# MS 팰월드 공략집

매일 갱신되는 공개 팰월드 공략집과 GitHub Pages 배포만 포함하는 독립 저장소입니다.

추천 빌드는 단일 펠의 패시브뿐 아니라 속성 상성, 5인 파티, 서포트 펠 채용 사유, 실전 운용 순서와 교체 조건을 함께 제공합니다.

- 공개 사이트: https://kms0539.github.io/palworld-guide/
- 화면: `site/`
- 자료 수집·정제: `scripts/update-guide-data.mjs`
- 공개 데이터 생성: `scripts/build-public-guide.mjs`
- 이미지 검증·동기화: `scripts/sync-visual-assets.mjs`
- 공개 범위 검사: `tests/guide.test.mjs`

## 로컬 갱신

```powershell
pnpm run refresh
pnpm run assets:sync
pnpm test
```

## 이미지 출처

- 펠 아이콘과 실제 월드 지도는 MIT로 공개된 [PalDex](https://github.com/catrenelle/PalDex) 자료를 우선 사용합니다.
- PalDex에 아직 반영되지 않은 최신 펠 아이콘은 [Palworld.gg 펠 도감](https://palworld.gg/ko/pals)에서 보완하며, 게임 이미지 권리는 Pocketpair에 있습니다.
- 상단 소개 이미지는 [Pocketpair 공식 Palworld 사이트](https://www.pocketpair.jp/games/palworld/)의 홍보 자료를 사용합니다.
- 한글 펠 명칭은 [Palworld.gg 한국어 도감](https://palworld.gg/ko/pals)과 대조합니다.
- Palworld, 캐릭터, 지도 및 게임 자산의 권리는 Pocketpair에 있습니다.
- 출처와 자산 SHA-256은 `site/data/visual-assets.json`에 기록합니다.

## 공개 보안 경계

이 저장소와 공개 사이트에는 다음 내용을 포함하지 않습니다.

- 홈 서버 상태 및 내부 API
- 사용자·접속 기록
- 사설 IP와 포트 설정
- 비밀번호·토큰·인증 정보
- Discord 서버 및 봇 설정

대시보드와 서버 운영 코드는 별도 저장소에서 관리합니다.

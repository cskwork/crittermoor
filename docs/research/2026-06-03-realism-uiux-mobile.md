# Crittermoor → RimWorld급 사실적 시뮬 + UI/UX + 모바일

> deep-research 결과 (2026-06-03). 5각도 / 23소스 / 104주장 추출 → 25검증 → 20확정·5기각.
> 모든 확정 항목은 적대적 3표 검증 통과(3-0). 출처는 각 항목 말미 참조.

## 적용 우선순위 (현재 코드 기준)

현재 상태: `Pawn.mood`는 needs 평균으로 드리프트만 함. thoughts/traits/관계/mental-break/storyteller 부재. UI 패널은 있으나 모바일 터치/뷰포트 없음.

| # | 작업 | 영향 | 노력 | 근거 신뢰도 |
|---|------|------|------|------------|
| 1 | pixi-viewport 도입 (터치 팬/핀치줌) | 모바일 핵심 | 소 | high (primary) |
| 2 | Thought 기반 mood + mental-break 임계 | 창발 서사 핵심 | 중 | high |
| 3 | RimWorld식 inspect/alert 정보구조 | UI/UX 핵심 | 중 | high |
| 4 | AI Storyteller (적응형 난이도) | 페이싱 | 중 | high |
| 5 | 화재/전파 = 확률적 셀룰러 오토마타 | 생태 깊이 | 중 | high (peer-reviewed) |
| 6 | bitECS 워커 + 고정 timestep 보간 | 성능/규모 | 대 | high (primary) |
| 7 | PixiJS 배칭/컬링 모바일 최적화 | 모바일 성능 | 소~중 | high (primary) |

---

## 1. 창발적 캐릭터 서사 (RimWorld 검증 메커니즘)

### 1-1. Mood = Base Mood + 순(thoughts), 3단 break 임계
검증된 모델 (3-0):
- **Mood 0~100** = 난이도별 Base Mood + (긍정 thought − 부정 thought 합)
- Base Mood 예: Peaceful 42 … Strive 32 … Losing is Fun 22 → **storyteller가 직접 미는 동적 난이도 레버**
- **break 위험 임계 3단**: 35% minor / 20% major / 5% extreme — "위험선"이지 확정 발동 아님(확률적). trait(Steadfast/Nervous)가 임계 이동.

크리터무어 매핑:
- 현재 `Pawn.mood`(i8 -100..100)는 needs 평균 드리프트. → **Thought 누적 모델로 교체**.
- 신규 컴포넌트 `Trait`(비트플래그), 외부 맵 `thoughts: Map<eid, Thought[]>` (배열은 bitECS 부적합, `HasPath`처럼 외부 보관 패턴 재사용).
- `systems/needs.ts:updateMood`를 `Mood = baseMood + sum(thoughts)`로 변경. baseMood는 storyteller(4번)가 공급.
- 신규 `systems/mentalBreak.ts`: 임계 교차 시 확률 롤 → behavior를 플레이어 제어 해제 상태로.

기각된 항목(하드코딩 금지):
- mood 평활 상수 +12/−8 per hour (1-2 기각) → 특정 보간율 복제하지 말 것.

출처: rimworldwiki.com/wiki/Mood, /wiki/AI_Storytellers (게임 데이터 MentalBreakThreshold·Alerts.xml로 교차확인)

### 1-2. AI Storyteller = 러버밴드 적응형 난이도
검증된 모델 (3-0):
- **adaptation score**: 0에서 시작, ~30일차부터 상승(초반 빠르고 후반 느림), 다운/사망 시 하락(~20–30pt/kill).
- 분리된 2개 슬라이더: 시간/적응일수 factor, 난이도 스케일 factor = "성장률·영향 배수".
- 뉘앙스: 주로 고전 시 난이도를 **완화**하는 방향(성공 처벌보다).

크리터무어 매핑:
- 신규 `Sim/storyteller.ts`(순수): `adaptation: number`를 `SimWorld`에 보관, 세이브 v4 추가 필드(`save-v3-additive-fields` 패턴).
- `raid.ts` 스케줄러가 현재 4–8일 고정 → adaptation으로 간격/규모 조절.
- baseMood도 storyteller 설정에서 공급(1-1과 연결).

기각된 항목(미해결 — 자체 설계 필요):
- storyteller 입력셋(wealth/colonist count 등) (1-2 기각)
- raid-points 통화 + threat scale 0~500% 모델 (0-3 기각)
→ 실제 이벤트 선택 알고리즘은 미확인. 자체 규칙으로 설계하고 위 러버밴드만 차용.

출처: rimworldwiki.com/wiki/AI_Storytellers (+ Steam 커뮤니티 다수 교차확인)

---

## 2. 생태·환경 시뮬 (확률적 셀룰러 오토마타)

검증된 모델 (3-0, peer-reviewed PROPAGATOR, MDPI Fire 2020):
- 화재 = 격자 위 **확률적 셀룰러 오토마타**. 불타는 셀 → 이웃 셀로 확률 전파.
- 셀당 전파확률 = f(식생종류, 경사, 풍향·풍속, 죽은 미세연료 수분). 결정론적 규칙 아님.
- 전파속도는 Rate-of-Spread 모델.

크리터무어 매핑:
- 96×96 타일맵 + 8종 terrain 이미 존재 → CA가 깔끔히 안착.
- 신규 `systems/fire.ts`: 타일별 burn 상태, 이웃 확률 전파. forest=높음, water=0, stone=낮음.
- **동일 패턴 재사용**: 질병 전염(엔티티 그래프), 야생 개체수(predator-prey) — 단 화재만 깊이 검증됨.

미해결(추가 조사 필요): 질병 역학·야생 생태계·날씨·계절/온도-부패·전력망의 검증된 격자/에이전트 모델. (open question)

출처: mdpi.com/2571-6255/3/3/26 (생산체인·온도·부패는 rimworldwiki Temperature/Deterioration/Food_production 보조 참조)

---

## 3. 복합 시뮬 UI/UX 정보구조

검증된 패턴 (3-0):
- **좌하단 context-sensitive inspect pane**: 무엇을 선택하든 표시. 같은 타입 다중선택 시 수량 자동 집계.
- **우측 alert/notification 스택**: 긴급 상태(임박한 mental break, 구조 필요) + 팁. 영속 상세(좌하)와 일시 긴급(우측) 분리 → 인지부하 감소.

크리터무어 매핑:
- `SelectionPanel.tsx` 이미 존재 → 다중선택 **수량 집계** 추가.
- `EventsLog.tsx` 존재 → 우측 **우선순위 alert 스택**(BreakRiskMinor/Major/Extreme 류)으로 승격. 클릭 시 해당 엔티티로 카메라 이동.
- `Tooltip.tsx` 재사용해 정보 밀도 보강.

보조 출처: RTS UI 인터뷰(Dave Pottinger), Halo Wars 2 GDC, gamedeveloper.com strategy UI do/don't.
출처: rimworldwiki.com/wiki/User_interface (RimHUD 모드·Alerts.xml 교차확인)

---

## 4. 모바일 프렌들리 웹 (터치 + 반응형)

### 4-1. pixi-viewport — 핵심 도입
검증된 사실 (3-0):
- pixi-viewport는 **공식 pixijs-userland**, v8 호환. `app.renderer.events`에서 이벤트 수신.
- 플러그인 체이닝 한 줄로: `viewport.drag().pinch().wheel().decelerate()` = 드래그팬 + 2손가락 핀치줌 + 휠줌 + 관성.
- **주의**: Safari 핀치는 비표준 GestureEvent라 보조 플러그인(pixi-viewport-gesture-pinch) 필요.

크리터무어 매핑: `Renderer.ts` 뷰포트를 pixi-viewport로 교체. 현재 카메라 로직 대체.

### 4-2. 터치 입력
검증된 사실 (3-0, MDN/W3C): 4개 표준 DOM 이벤트(touchstart/move/end/cancel)를 canvas에 리스닝, `e.touches[]`에서 좌표(멀티핑거는 index>0 순회).

기각(주의): **preventDefault()는 필수 아님** (0-3 기각). 스크롤 차단 목적의 무조건 호출 금지 — 필요한 곳만.

### 4-3. PixiJS v8 카메라 = render groups
검증된 사실 (3-0): render groups가 컨테이너 변환(위치/스케일/회전/틴트/알파)을 GPU 단일 연산으로 오프로드 → 거의 0 CPU 비용의 2D 카메라. 단 **정적/안정 서브트리에 적합**(게임월드 vs HUD 분리). 과용 시 성능 저하.

출처: npmjs.com/package/pixi-viewport, pixijs.com/blog/pixi-v8-launches, /8.x/guides/concepts/render-groups, MDN Mobile_touch

---

## 5. 대규모 ECS 성능·아키텍처

### 5-1. 고정 timestep + 보간 (즉시 적용 가능)
검증된 사실 (3-0): bitECS 시스템은 world를 받는 순수 함수. tick rate를 render rate와 **고정 timestep 누산기**로 분리:
```
while (accumulator >= FIXED_STEP) { physics(world, FIXED_STEP); accumulator -= FIXED_STEP }
render(world, alpha = accumulator / FIXED_STEP)
```
크리터무어 매핑: `Game.ts` tick loop + `PositionPrev` 컴포넌트가 이미 존재 → 렌더 보간(alpha)에 바로 활용. ADR 0003(tick-loop) 갱신.

### 5-2. 워커 병렬화 (대규모일 때만)
검증된 사실 (3-0): bitECS는 명시적 멀티스레딩 API 없음. 컴포넌트를 **SharedArrayBuffer TypedArray**로 백업하면 복사 없이 워커 공유. 단 **수만 엔티티·CPU 바운드 시스템**(physics/pathfinding/AI)에서 측정된 병목이 있을 때만. postMessage 직렬화 비용이 작은 워크로드선 역효과.

크리터무어 현황: A* pathfinding이 이미 워커에 있음(`Pathing/worker.ts`) → 패턴 정합.

기각(주의): "모든 구조적 ops(addEntity/addComponent/query)는 메인스레드 전용" (0-3 기각) → bitECS 0.4 문서로 실제 워커 가능 범위 재확인 후 의존할 것.

### 5-3. PixiJS 배칭·컬링 (모바일 예산)
검증된 사실 (3-0):
- 스프라이트 배칭: 드로우콜당 최대 **16 텍스처**(GPU 의존, 모바일은 더 적음) → 스프라이트시트로 텍스처 최소화.
- 드로우 순서 중요: 같은 종류 묶기(sprite/sprite/graphic/graphic) > 교차배치.
- **컬링은 v8 기본 비활성**. GPU 바운드일 때 도움, CPU 바운드일 때 역효과 → 앱 레벨에서 선택 적용(`cullable=true`/CullerPlugin).

크리터무어 현황: `SpriteAtlas.ts`/청크 타일맵 존재 → 배칭 정합. 모바일에선 텍스처 수·드로우순서 점검.

성능 수치(참고, 벤더 자가보고·비독립감사): PixiJS v8가 100k 스프라이트에서 CPU ~50→15ms, GPU ~9→2ms. 실제 모바일 이득은 가변.

출처: bitecs.dev/docs/system, /docs/multithreading, pixijs.com/8.x/guides/concepts/performance-tips, pixijs.com/blog/pixi-v8-launches

---

## 주의·한계 (caveats)

- RimWorld 메커니즘은 커뮤니티 위키(secondary)지만 게임 데이터파일·다중 커뮤니티로 교차확인 → 설계 패턴엔 high-confidence. 단 정확한 수치는 버전마다 드리프트 가능.
- PixiJS 성능 수치는 특정 Bunnymark·하드웨어 벤더 자가보고.
- 일부 primary 페이지가 직접 fetch 시 403 → 검색 스니펫·독립 교차확인으로 보강.
- PixiJS v8·bitECS 0.4는 2026 중반 기준 최신이나 활발히 개발 중 → 구현 전 API 재확인.

## 미해결 질문 (추가 조사 대상)

1. RimWorld Storyteller의 실제 raid 스케줄/규모 공식 (입력셋·threat 통화 모두 기각됨).
2. 버전 정확한 mood 평활 모델(+12/−8 기각).
3. bitECS 0.4에서 워커 안전 구조적 ops 경계.
4. 화재 외 검증된 격자/에이전트 모델: 질병 역학·야생 생태·날씨·계절/부패·전력망.

# 파운데이션 — 색상 · 타이포 · 엘리베이션 · 스페이싱

디자인 토큰의 **단일 출처**다. 이 저장소에서 hex 값이 문자로 적히는 곳은 이 파일뿐이다.
다른 문서와 코드는 토큰명으로만 참조한다. → [문서 관리 규칙](README.md#문서-관리-규칙)

상태 표기(✅/🚧)의 의미는 [README](README.md)에 있다.

---

## 1. 색상 & 서페이스

### 🚧 팔레트 토큰

| 토큰                        | 값        | 역할                            |
| --------------------------- | --------- | ------------------------------- |
| `surface`                   | `#f8f9fa` | 기본 캔버스                     |
| `surface_container_lowest`  | `#ffffff` | 들린 카드, 인풋 배경            |
| `surface_container_low`     | `#f1f4f6` | 사이드바·내비게이션, hover 배경 |
| `surface_container`         | `#eaeff1` | 카드를 얹을 섹션 바닥           |
| `surface_container_high`    | `#e2e9ec` | Secondary 버튼 배경             |
| `surface_container_highest` | `#dbe4e7` | 선택 상태, Knowledge Token 배경 |
| `on_surface`                | `#2b3437` | 본문 강조 텍스트                |
| `on_surface_variant`        | `#586064` | 장문 본문, 메타데이터 텍스트    |
| `outline_variant`           | `#abb3b7` | Ghost Border 전용 (15% opacity) |
| `tertiary`                  | `#0053dc` | 단일 액센트 — CTA, 포커스 링    |
| `tertiary_container`        | `#3e76fe` | 액센트 그라디언트 끝점          |
| `on_tertiary`               | `#faf8ff` | 액센트 위 텍스트                |

### 🚧 The "No-Line" Rule

**영역을 나누는 용도의 1px 실선은 금지한다.** 경계는 오직 배경색 전환으로만 정의한다.

사이드바에 `surface_container_low`를 쓰고 본문에 `surface`를 두면, 경계는 **보이는 게 아니라 느껴진다**. 이것이 이 시스템의 가장 눈에 띄는 시그니처다.

### 🚧 서페이스 중첩 위계

UI를 물리적 재질이 쌓인 것으로 다룬다. 깊이는 `surface-container` 단계를 중첩해서 만든다.

| 레이어    | 토큰                       | 쓰임                     |
| --------- | -------------------------- | ------------------------ |
| 바닥      | `surface`                  | 기본 캔버스              |
| 보조 영역 | `surface_container_low`    | 사이드바, 내비 배경      |
| 들린 요소 | `surface_container_lowest` | 최우선 카드, 활성 작업면 |

### 🚧 Glass & Gradient

부유 요소(모달, 드롭다운, 떠 있는 브레드크럼)에는 **글래스모피즘**을 쓴다.

```css
/* 부유 요소 — surface 80% + blur */
background: color-mix(in srgb, #f8f9fa 80%, transparent);
backdrop-filter: blur(12px);

/* Primary CTA — 단일 액센트에 "보석 같은" 깊이를 준다 */
background: linear-gradient(to bottom, #0053dc, #3e76fe);
```

### Do

- 사이드바는 `surface_container_low`를 `surface` 위에 놓아 경계를 **느끼게** 한다.
- 사이드바 선택 상태는 `surface_container_highest`를 쓴다.
- 카드를 띄우고 싶으면 그림자가 아니라 **한 단계 밝은 서페이스**를 쓴다.

### Don't

- 순수 검정 `#000000` 텍스트 금지 — `on_surface`로 부드러운 고급감을 유지한다.
- 사이드바에 `border-r` 같은 구분선을 넣지 않는다.
- `tertiary`를 장식용으로 뿌리지 않는다. 의도가 있는 행동에만 쓴다.
- 원시 Tailwind 색상(`bg-gray-100`, `text-slate-500`)을 직접 쓰지 않는다.

---

## 2. 타이포그래피

### 🚧 스케일

| 역할                | 토큰          | 크기    | 규칙                                      |
| ------------------- | ------------- | ------- | ----------------------------------------- |
| Display (선언)      | `display-lg`  | 3.5rem  | `letter-spacing: -0.02em`, 랜딩 순간 전용 |
| Headline (인사이트) | `headline-md` | 1.75rem | `line-height: 1.4`, 노트 제목             |
| Body (지식)         | `body-lg`     | 1rem    | 주력. 장문은 `on_surface_variant`         |
| Label (메타데이터)  | `label-md`    | 0.75rem | `uppercase` + `letter-spacing: +0.05em`   |

장문 본문은 눈의 피로를 줄이기 위해 `on_surface_variant`를 쓰고, 결정적 강조만 `on_surface`로 올린다.

### ✅ 서체 — Stitch에서 의도적으로 일탈

Stitch 원문은 **Inter 단일 서체**를 명시하지만, 이 프로젝트는 이를 따르지 않는다.

- 이 앱의 UI 문구는 전부 한국어다 (`CLAUDE.md` 「네이밍 패턴」 — "사용자 문구: 전부 한국어").
- Inter에는 한글 글리프가 없어 한국어가 전부 시스템 폴백 서체로 떨어진다. 자간·웨이트 규칙이 무의미해지고 렌더링이 깨진다.

따라서:

| 용도           | 서체                  | 토큰             |
| -------------- | --------------------- | ---------------- |
| 본문 · UI 전체 | `Pretendard Variable` | `--font-sans`    |
| 브랜드 로고    | `Boogaloo`            | `--font-display` |

**Stitch의 스케일·자간·웨이트 규칙은 그대로 적용하고, 서체 파일만 교체한다.**

`Boogaloo`는 헤더 로고에만 허용한다. 본문·버튼·라벨에는 금지. 현재 `src/components/Layout.tsx:16`이 인라인 `style={{ fontFamily: 'Boogaloo, sans-serif' }}`로 하드코딩하고 있는데, 이는 `--font-display` 토큰 경유(`font-display` 유틸리티)로 올려야 한다 — `CLAUDE.md` 「알려진 불일치」 3번.

### Do

- 메타데이터(날짜, 섹션 라벨)는 항상 `label-md` + `uppercase`로 기능 텍스트임을 구분한다.
- 로고 서체는 `--font-display` 토큰을 경유한다.
- 장문 본문에는 `on_surface_variant`를 기본으로 쓴다.

### Don't

- 위계를 색으로 만들지 않는다 — 크기와 굵기로 만든다.
- `Boogaloo`를 본문·버튼·라벨에 쓰지 않는다.
- 서체를 인라인 `style`로 지정하지 않는다.
- `Inter`를 도입하지 않는다 (위 일탈 근거 참조).

---

## 3. 엘리베이션 & 깊이

### 🚧 톤 레이어링 원칙

**일반 카드에는 그림자를 쓰지 않는다.** `surface_container_lowest` 카드를 `surface_container` 섹션 위에 얹어 "부드럽게 들린" 느낌을 만든다. 종이가 겹친 자연스러운 상태를 흉내내는 방식이다.

### 🚧 Ambient Shadow

정말로 부유해야 할 때(예: "새 노트" 팝오버)만 쓴다.

| 항목    | 값                                    |
| ------- | ------------------------------------- |
| Blur    | 24px ~ 40px                           |
| Opacity | `on_surface`의 6%                     |
| 색조    | 액센트를 살짝 섞어 팔레트 일관성 유지 |

```css
box-shadow: 0 8px 32px rgba(43, 52, 55, 0.06);
```

### 🚧 Ghost Border (예외 수단)

배경이 비슷해서 컨테이너를 반드시 구분해야 할 때(접근성 사유)만 쓴다.

- `outline_variant` @ **15% opacity**
- 경계가 아니라 **선의 암시**여야 한다.

### Do

- 부유가 필요 없으면 그림자를 아예 빼고 톤 차이로 해결한다.
- 그림자를 쓸 땐 하나의 Ambient Shadow 규격만 쓴다.
- Ghost Border는 접근성 근거가 있을 때만 꺼낸다.

### Don't

- 기본 `shadow-md` / `shadow-lg` 류를 쓰지 않는다 — "designed"가 아니라 "engineered"하게 보인다.
- 그림자 값을 arbitrary value로 직접 적지 않는다. 현재 코드에 4종이 흩어져 있는 게 정확히 이 안티패턴이다 (`CLAUDE.md` 「알려진 불일치」 4번).
- Ghost Border를 영역 구분 용도로 쓰지 않는다 — 그건 No-Line Rule 위반이다.

---

## 4. 스페이싱

**1.4rem(`spacing.4`) 리듬**을 엄격히 따른다.

| 토큰         | 값      | 쓰임                         |
| ------------ | ------- | ---------------------------- |
| `spacing.1`  | 0.35rem | 라벨 ↔ 인풋 간격             |
| `spacing.2`  | 0.7rem  | 헤드라인 ↔ 본문 수직 리듬    |
| `spacing.4`  | 1.4rem  | 리스트 항목 간격 (기준 단위) |
| `spacing.10` | 3.5rem  | 레이아웃 블록 사이 섹션 갭   |

`spacing.10`의 큰 갭이 이 디자인의 "대기감(atmospheric quality)"을 유지하는 핵심이다.

### Do

- 헤드라인 → 본문은 `spacing.2`, 큰 레이아웃 블록 사이는 `spacing.10`을 쓴다.
- 간격이 애매하면 스케일에서 **한 단계 큰 쪽**을 고른다.

### Don't

- 임의 픽셀값(`p-[13px]`, `mt-[22px]`)으로 간격을 맞추지 않는다.
- 리스트 간격을 구분선으로 대체하지 않는다 — 간격 자체가 구분자다.

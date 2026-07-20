# 전환 매핑 & 적용 로드맵

> **이 문서는 만료 문서다.**
> 아래 로드맵 체크박스가 전부 채워지면 이 파일을 **삭제**하고 [`README.md`](README.md)의 파일 지도에서 행을 지운다.
> 영구 규칙은 [`foundations.md`](foundations.md)와 [`components/`](components/README.md)에 있다. 이 파일에 규칙을 추가하지 않는다.

현재 `src/index.css`의 토큰 체계와 정본 사이의 차이다. 코드는 아직 구버전이며, 아래가 마이그레이션 대상 목록이다.

---

## 1. 토큰 매핑

| 현재                                       | 정본                       | 조치                            |
| ------------------------------------------ | -------------------------- | ------------------------------- |
| `--color-background` `hsl(0 0% 94%)`       | `surface`                  | 토큰 값 교체                    |
| `--color-card` `hsl(0 0% 100%)`            | `surface_container_lowest` | 이름·역할 재정의                |
| `--color-muted` `hsl(0 0% 90%)`            | `surface_container_high`   | 이름·값 교체                    |
| `--color-foreground` `hsl(220 35% 14%)`    | `on_surface`               | 값 교체                         |
| `--color-muted-foreground` `hsl(0 0% 42%)` | `on_surface_variant`       | 값 교체                         |
| `--color-border` + `border-border` 사용처  | 없음 (No-Line Rule)        | 배경 전환으로 대체              |
| 액센트 없음 (`bg-foreground` 버튼)         | `tertiary` 그라디언트      | Primary 버튼 신규 정의          |
| `shadow-[...]` arbitrary 4종               | Ambient Shadow 1종         | 토큰화 후 대부분 제거           |
| `--radius: 0.75rem` (미사용)               | `md` / `full`              | 라운드 스케일 재정의            |
| `Pretendard Variable`                      | ~~Inter~~                  | **일탈 확정** — Pretendard 유지 |
| `Boogaloo` 인라인 `style`                  | `--font-display` 토큰      | 로고 전용 한정, 토큰 경유       |

정본 토큰의 실제 값은 [`foundations.md`](foundations.md#-팔레트-토큰)에 있다. 이 표에 hex를 복사해 오지 않는다.

## 2. 코드 상의 해당 지점

| 파일                            | 위치          | 내용                                                     |
| ------------------------------- | ------------- | -------------------------------------------------------- |
| `src/index.css`                 | `@theme` 3–16 | 토큰 전체                                                |
| `src/components/Layout.tsx`     | 13, 16, 31    | 헤더 그림자·`border-b`, 인라인 폰트, 사이드바 `border-r` |
| `src/components/NoteItem.tsx`   | 14, 16, 17    | 카드 `border`, 선택/hover 그림자 2종                     |
| `src/components/NoteEditor.tsx` | 63            | 편집 패널 그림자                                         |

## 3. 적용 로드맵

- [ ] `src/index.css` `@theme`에 Stitch 팔레트 토큰 12종 정의
- [ ] 스페이싱 스케일(`spacing.1/2/4/10`)과 라운드 스케일 토큰 추가
- [ ] Ambient Shadow를 단일 토큰으로 정의하고 arbitrary value 4종 제거
- [ ] No-Line Rule 적용 — `Layout.tsx`의 `border-b`/`border-r`, `NoteItem.tsx`의 카드 `border` 제거 후 배경 전환으로 대체
- [ ] `Layout.tsx:16` 인라인 폰트 `style`을 `font-display` 유틸리티로 교체
- [ ] Primary 버튼을 `tertiary` 그라디언트로 전환 ([button.md](components/button.md))
- [ ] 리스트 간격을 `space-y-2` → `spacing.4`로 확대 ([card-list.md](components/card-list.md))
- [ ] 인풋에 Ghost Border + `tertiary` 포커스 도입 ([input.md](components/input.md))
- [ ] 타이포 스케일(`display-lg`/`headline-md`/`body-lg`/`label-md`)을 컴포넌트에 반영
- [ ] 태그 칩을 Knowledge Token 규격으로 신규 구현 ([knowledge-token.md](components/knowledge-token.md))
- [ ] `npm run typecheck`
- [ ] `npm run lint`

# 카드 & 리스트

토큰 정의는 [`../foundations.md`](../foundations.md) 참조.

## 🚧 구분선 금지 규칙

**리스트 항목을 선으로 나누지 않는다. 스페이싱 스케일로 나눈다.** 항목 간 `spacing.4`(1.4rem)가 기본이다.

이 시스템에서 간격은 여백이 아니라 **구분자**다. 선을 지우고 간격을 좁히면 규칙을 절반만 지킨 것이다.

## 🚧 상태별 배경

| 상태  | 배경                        |
| ----- | --------------------------- |
| 기본  | `surface_container_lowest`  |
| Hover | `surface_container_low`     |
| 선택  | `surface_container_highest` |

카드가 "들려 보이는" 것은 그림자가 아니라 **`surface_container` 섹션 위에 `surface_container_lowest` 카드를 얹은 톤 대비**에서 나온다 ([톤 레이어링](../foundations.md#-톤-레이어링-원칙)).

## 현재 코드와의 차이

`NoteItem.tsx:14-18`은 지금 세 가지를 다르게 하고 있다:

- 카드에 `border` + `border-border` — No-Line Rule 위반
- 선택 상태를 `border-foreground` + 진한 그림자로 표현 — 배경 톤이어야 함
- hover에 arbitrary 그림자 — 배경 톤 이동이어야 함

리스트 간격도 `space-y-2`(0.5rem)로 `spacing.4`보다 훨씬 좁다. 전부 [마이그레이션](../migration.md) 대상이다.

## 접근성 메모

`NoteItem`의 카드는 `div` + `onClick`이라 키보드 포커스가 안 된다 (`CLAUDE.md` 「알려진 불일치」 5번). 포커스 링을 도입할 때 `tertiary`를 쓰되, 카드 안에 삭제 `button`이 중첩돼 있어 카드 자체를 `button`으로 바꿀 수는 없다 — `role`/`tabIndex`로 접근한다.

## Do

- 항목 사이는 `spacing.4` 간격으로 벌린다.
- 상태 변화는 전부 배경 톤 이동으로 표현한다.
- 카드 안 버튼은 `e.stopPropagation()` 후 자기 동작을 수행한다 (현재 코드 관례 유지).

## Don't

- `<hr>`이나 `border-b`로 리스트 항목을 나누지 않는다.
- 카드에 테두리를 두르지 않는다.
- 선택 상태를 테두리 색이나 그림자로 표현하지 않는다.
- 간격을 좁히는 대신 구분선을 넣는 절충을 하지 않는다.

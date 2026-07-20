# 인풋 필드

토큰 정의는 [`../foundations.md`](../foundations.md) 참조.

## 🚧 규격

| 항목   | 값                                                            |
| ------ | ------------------------------------------------------------- |
| 배경   | `surface_container_lowest`                                    |
| 테두리 | 1px [Ghost Border](../foundations.md#-ghost-border-예외-수단) |
| 포커스 | 1px `tertiary`로 전환                                         |
| 라벨   | `label-md`, 인풋 **위**에 `spacing.1` 간격                    |

포커스 전에는 선이 거의 보이지 않고, 포커스 시에만 액센트 1px로 또렷해진다. 이 전환 자체가 상태 피드백이다.

## 현재 코드와의 차이

`NoteEditor.tsx`의 인풋은 지금 `bg-transparent border-none outline-none`으로 **완전히 무테두리**다. 포커스 표시가 아예 없다.

정본은 무테두리가 아니라 **Ghost Border → `tertiary`** 전환이므로, 이 항목은 "선을 지우는" 방향이 아니라 **선을 되살리는** 방향의 변경이다. [마이그레이션](../migration.md) 항목 중 유일하게 시각 요소가 늘어나는 건이다.

라벨도 현재는 없다. 섹션 라벨(`text-xs font-semibold tracking-widest uppercase`)이 `NoteEditor.tsx:65`에 있지만 인풋 라벨과는 별개 역할이다.

## Do

- 포커스는 `tertiary` 1px 테두리로만 알린다.
- 라벨은 항상 인풋 위에 `label-md`로 둔다.
- placeholder는 보조 설명이 아니라 예시로 쓴다. 라벨을 대체하지 않는다.

## Don't

- 인풋에 상시 표시되는 진한 테두리를 넣지 않는다 — 포커스 전엔 Ghost Border다.
- `outline-none`만 주고 대체 포커스 표시를 안 만드는 상태로 두지 않는다.
- 포커스 링에 브라우저 기본 파랑을 쓰지 않는다. `tertiary`를 쓴다.
- 라벨을 placeholder로 대체하지 않는다.

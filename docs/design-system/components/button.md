# 버튼

토큰 정의는 [`../foundations.md`](../foundations.md) 참조.

## 🚧 종류별 규격

| 종류             | 배경                                         | 텍스트        | 라운드          | Hover                |
| ---------------- | -------------------------------------------- | ------------- | --------------- | -------------------- |
| Primary          | `tertiary` → `tertiary_container` 그라디언트 | `on_tertiary` | `md` (0.375rem) | 그라디언트 밝기 조정 |
| Secondary        | `surface_container_high`                     | `on_surface`  | `md`            | 한 단계 어두운 톤    |
| Tertiary (Ghost) | 없음                                         | `tertiary`    | `md`            | 액센트 2% opacity    |

Primary의 그라디언트는 단일 액센트 색에 "보석 같은" 깊이를 주기 위한 장치다. 평평한 단색 파랑은 이 시스템에서 쓰지 않는다.

Secondary 버튼에는 **테두리가 없다.** 배경 톤만으로 Primary와 구분한다.

## 현재 코드와의 차이

`Layout.tsx:22`와 `NoteEditor.tsx`의 Primary 버튼은 지금 `bg-foreground text-card`(검정 배경)다. 이 앱에는 액센트 컬러가 아직 없다. `tertiary` 그라디언트 도입이 [마이그레이션](../migration.md) 항목이다.

패딩이 `px-4`(Layout)와 `px-5`(NoteEditor)로 갈려 있는데, 전환 시 하나로 통일한다.

## Do

- Primary는 화면당 하나만 둔다. 주된 의도가 두 개일 수 없다.
- 부차적 행동(취소, 닫기)은 Secondary나 Ghost로 내린다.
- 비활성 상태는 `disabled:opacity-40`으로 표현한다 (현재 코드 관례 유지).

## Don't

- Secondary 버튼에 테두리를 넣지 않는다.
- Primary를 단색으로 칠하지 않는다 — 그라디언트가 규격이다.
- 파괴적 행동(삭제)에 Primary를 쓰지 않는다. 삭제는 Ghost + `destructive` 텍스트다.
- 버튼에 `Boogaloo`를 쓰지 않는다 ([서체 규칙](../foundations.md#-서체--stitch에서-의도적으로-일탈)).

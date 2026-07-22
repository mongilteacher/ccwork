# Issue #14 — TF-3: 필터에서 빠져나오는 모든 경로

> 출처: GitHub 이슈 #14(`mongilteacher/ccwork`) · [`prd.md`](./prd.md) ADR-1·ADR-3·ADR-4 · [`issue.md`](./issue.md) · 선행 [`issue-12.md`](./issue-12.md)·[`issue-13.md`](./issue-13.md)

필터를 **끄는** 두 경로를 완성한다.

1. **사용자가 직접** — 선택된 칩 재클릭 → 선택 해제(토글)
2. **저절로** — 선택 태그가 태그 목록에서 사라지면 선택되지 않은 것으로 본다 (ADR-3, `useEffect` 금지)

## 확정 시그니처

```ts
// src/domain/tagFilter.ts (기존 파일에 추가 — countTags는 TF-1, isHighlighted는 TF-2)
import { Note } from '../types/note';

// 칩 클릭 결과를 계산한다. 같은 태그를 다시 누르면 해제(null), 다른 태그면 갈아탄다.
// 동일성 기준은 countTags·isHighlighted와 같다(normalizeTag 후 소문자 완전 일치, ADR-4).
// clicked가 정규화 후 빈 값이면 null(= 전체 보기). throw하지 않는다.
export function toggleSelectedTag(current: string | null, clicked: string): string | null;

// ADR-3: 선택 태그의 자동 해제를 state 동기화가 아니라 "파생값"으로 계산한다.
//   태그 목록(countTags 결과)에 없는 선택 태그는 선택되지 않은 것으로 본다.
// 반환은 목록에 있으면 그 태그의 "표기 태그"(TagCount.tag), 없으면 null.
//
// 주의(ADR-3 Consequences): selectedTag state에는 이미 세상에서 사라진 태그 문자열이
//   그대로 남아 있을 수 있다. 화면은 항상 이 함수의 결과를 기준으로 그리므로
//   디버깅할 때 state 값만 보고 "아직 선택돼 있다"고 판단하면 헷갈린다.
//   사라진 태그가 나중에 다시 생기면 선택이 되살아나는 것도 의도된 동작이다.
export function resolveSelectedTag(notes: Note[], selectedTag: string | null): string | null;
```

```tsx
// src/App.tsx — 토글로 교체 (props·타입 변화 없음)
const handleSelectTag = (tag: string) => setSelectedTag((prev) => toggleSelectedTag(prev, tag));
```

```tsx
// src/components/NoteList.tsx — 강조 판정을 "태그 목록 기준"으로 통과시킨다 (props 변화 없음)
const effectiveTag = resolveSelectedTag(notes, selectedTag);
// ... isHighlighted(note, effectiveTag)
```

**바뀌지 않는 것**: `NoteListProps` / `TagFilterBarProps` / `NoteItemProps`는 TF-2 그대로다.
`src/api/notes.ts`·`src/context/NotesContext.tsx`도 손대지 않는다(ADR-1).

### 시그니처 결정 메모

- `resolveSelectedTag`를 **`NoteList`에만** 적용한다. `TagFilterBar`는 목록에 없는 태그면 칩 자체가 렌더되지 않아 적용이 무의미하다(no-op). 이슈 본문의 "강조 판정을 태그 목록 기준으로 통과시켜"를 그대로 옮긴 배치다.
- `resolveSelectedTag`가 `boolean`이 아니라 `string | null`을 돌려주는 이유: 그대로 `isHighlighted`의 두 번째 인자로 흘려보낼 수 있고, 표기 태그를 돌려주므로 이후 "선택 태그 라벨 표시" 같은 요구가 와도 시그니처가 바뀌지 않는다.
- 토글을 `App`의 인라인 조건문이 아니라 도메인 순수 함수로 뺀 이유: 재클릭 판정도 **정규화 후 소문자 비교**여야 한다(ADR-4). 판정 기준이 도메인 한 곳에만 있어야 `countTags`/`isHighlighted`와 어긋나지 않는다.

### 에러 케이스

두 함수 모두 순수 판정이라 **throw하지 않는다.** 도메인 계층 규약대로 값으로 답한다.

`toggleSelectedTag(current, clicked)`

| 입력                                               | 반환                         |
| -------------------------------------------------- | ---------------------------- |
| `current === null`                                 | `clicked`                    |
| `current`와 `clicked`가 정규화 후 같음             | `null` (해제)                |
| 대소문자만 다름 (`React` vs `react`)               | `null` (해제)                |
| NFC/NFD 표기만 다름                                | `null` (해제)                |
| `current`에 앞뒤 공백 (`' 회의 '` vs `'회의'`)     | `null` (해제)                |
| 서로 다른 태그                                     | `clicked` (갈아타기)         |
| 부분 문자열 (`current='회의'`, `clicked='회의록'`) | `clicked` (완전 일치만 해제) |
| `clicked`가 정규화 후 `''`                         | `null` (전체 보기)           |

`resolveSelectedTag(notes, selectedTag)`

| 입력                                       | 반환                                    |
| ------------------------------------------ | --------------------------------------- |
| `selectedTag === null`                     | `null`                                  |
| `notes === []`                             | `null`                                  |
| 선택 태그를 가진 노트가 있음               | 그 태그의 **표기 태그**(`TagCount.tag`) |
| 대소문자만 다른 표기가 목록에 있음         | 목록의 표기 태그 (ADR-4)                |
| 선택 태그를 가진 노트가 **하나도 없음**    | `null` — 자동 해제의 실체               |
| 선택 태그가 정규화 후 `''`                 | `null`                                  |
| 선택 태그가 다른 태그의 부분 문자열일 뿐임 | `null`                                  |

## 테스트 시나리오

### 정상

- [x] [정상] toggleSelectedTag — should return null when clicked가 current와 같은 태그다
- [x] [정상] toggleSelectedTag — should return clicked when current가 다른 태그다
- [x] [정상] toggleSelectedTag — should return clicked when current가 null이다
- [x] [정상] resolveSelectedTag — should return 선택 태그 when 그 태그를 가진 노트가 있다
- [x] [정상] resolveSelectedTag — should return 목록의 표기 태그 when selectedTag와 표기가 대소문자만 다르다
- [x] [정상] App 통합 — should 선택이 해제되고 아무 노트도 강조되지 않는다 when 선택된 칩을 다시 클릭한다
- [x] [정상] App 통합 — should 그 칩이 선택 해제 표시(`aria-pressed=false`)로 돌아간다 when 선택된 칩을 다시 클릭한다
- [x] [정상] App 통합 — should 이전 선택이 풀리고 새 태그만 강조된다 when 다른 칩을 클릭한다 (토글 도입 회귀 방어)
- [x] [정상] App 통합 — should 칩과 강조가 함께 사라진다 when 선택 태그를 가진 마지막 노트를 삭제한다
- [x] [정상] App 통합 — should 다시 강조된다 when 해제 후 같은 칩을 또 클릭한다

### 경계

- [x] [경계] toggleSelectedTag — should return null when clicked와 current가 대소문자만 다르다
- [x] [경계] toggleSelectedTag — should return null when current에 앞뒤 공백이 있고 정규화하면 clicked와 같다
- [x] [경계] toggleSelectedTag — should return null when clicked와 current가 NFC/NFD 표기만 다르다
- [x] [경계] resolveSelectedTag — should return null when selectedTag가 null이다
- [x] [경계] resolveSelectedTag — should return null when notes가 빈 배열이다
- [x] [경계] resolveSelectedTag — should return null when selectedTag가 정규화 후 빈 문자열이다
- [x] [경계] resolveSelectedTag — should return 선택 태그 when 그 태그를 가진 노트가 3개 중 2개로 줄었다 (선택 유지)
- [x] [경계] NoteList — should 남은 노트만 강조하고 강조 개수가 줄어든다 when 3개 중 1개에서 선택 태그가 빠진 notes로 다시 렌더한다
- [x] [경계] TagFilterBar — should 그 칩을 렌더하지 않는다 when 선택 태그를 가진 노트가 하나도 남지 않았다

### 예외

- [x] [예외] toggleSelectedTag — should return clicked when clicked가 current의 부분 문자열 관계다 (`회의` → `회의록`)
- [x] [예외] toggleSelectedTag — should return null when clicked가 정규화 후 빈 값이다
- [x] [예외] resolveSelectedTag — should return null when 어떤 노트도 갖고 있지 않은 태그가 selectedTag로 남아 있다
- [x] [예외] resolveSelectedTag — should return null when selectedTag가 다른 태그의 부분 문자열일 뿐이다
- [x] [예외] NoteList — should 어떤 노트도 강조하지 않는다 when selectedTag prop은 그대로인 채 그 태그를 가진 노트가 사라진 notes로 다시 렌더한다 (ADR-3 파생 경로: 선택 state를 건드리지 않고 강조가 사라진다)

### E2E 시나리오 (`e2e/tag-filter.spec.ts`)

`e2e-write` 스킬의 **중복 금지** 원칙에 따라, **실제 브라우저 + 실제 json-server 왕복(또는 새로고침)이 있어야만 증명되는 여정만** 남긴다.
토글·정규화·강조 판정 규칙은 위 단위/컴포넌트 시나리오가 이미 덮으므로 E2E에서 반복하지 않는다.

- [ ] [E2E] 태그 선택 → 그 태그를 가진 **유일한** 노트에서 태그를 지우고 **저장** → 칩이 사라지고 강조도 사라진다
      (단위가 못 보는 것: 편집기 저장이 실제 PATCH로 나가 `notes`가 갱신되고 그 결과가 사이드바 집계·강조까지 관통하는지)
- [ ] [E2E] 태그 선택 → 그 태그를 가진 **마지막 노트를 삭제** → 칩이 사라지고 강조도 사라진다
      (단위가 못 보는 것: 실제 DELETE 왕복 후 태그 목록이 다시 계산되는지)
- [ ] [E2E] 같은 태그를 가진 노트 **3개 중 1개**에서 태그를 지우고 저장 → 칩 카운트가 `2`로 줄고 **선택은 유지**되며 남은 2개만 강조된다
- [ ] [E2E] 태그를 선택한 상태에서 **새로고침** → 선택이 해제된 전체 보기로 시작한다 (localStorage·URL 저장 없음, PRD Out of Scope)

**E2E 작성 시 제약** (기존 `e2e/tag.spec.ts`·`e2e/fixtures/test.ts`에서 이어지는 것)

- 태그 칩은 **db 전체에서 집계**되므로 다른 테스트·기존 db 노트와 충돌하지 않도록 **고유 태그 문자열**을 써야 한다. `uniqueTitle()` 결과는 20자를 넘어(`MAX_TAG_LENGTH`) 태그로 재사용할 수 없다 — 20자 이하의 짧은 고유 태그 헬퍼가 따로 필요하다.
- 사이드바 칩 조준: `getByRole('button', { name: '<태그> <카운트>' })`. 편집기 안의 태그 칩(`'<태그> 삭제'`)과 이름이 달라 충돌하지 않는다.
- 강조 확인: `[data-highlighted="true"]` (TF-2에서 못 박은 접점). 선택 칩 확인: `aria-pressed`.
- 노트 정리는 `uniqueTitle` fixture의 teardown이 담당한다 — 테스트가 만든 노트만 지운다.

### AC 커버리지

| #   | Acceptance Criteria                                         | 커버하는 시나리오                                                                                  |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | 선택된 칩 재클릭 → 선택 해제, 아무 노트도 강조 안 됨        | toggleSelectedTag 정상 3종 + 경계 3종 / App 통합 재클릭 해제 · `aria-pressed` 복귀                 |
| 2   | 유일한 노트에서 태그 제거·저장 → 칩·강조 소멸               | resolveSelectedTag 자동 해제 / NoteList 파생 경로(예외) / TagFilterBar 칩 미렌더 / **E2E 1**       |
| 3   | 마지막 노트 삭제 → 칩·강조 소멸                             | App 통합 마지막 노트 삭제 / resolveSelectedTag 빈 배열·미보유 태그 / **E2E 2**                     |
| 4   | 3개 중 1개에서 태그 제거 → 칩 `회의 2`, 선택 유지, 2개 강조 | resolveSelectedTag 3→2 선택 유지(경계) / NoteList 남은 노트만 강조(경계) / **E2E 3**               |
| 5   | 새로고침하면 선택 해제된 전체 보기로 시작                   | **E2E 4** (초기 state가 `null`임은 새로고침 = 재마운트로만 실제 증명된다)                          |
| 6   | 선택 해제에 `useEffect` + `setSelectedTag`를 쓰지 않는다    | NoteList 파생 경로(예외 — 선택 prop 불변 상태로 강조 소멸) / resolveSelectedTag 단위 시나리오 전부 |
| 7   | E2E가 선택 → 태그 제거 저장 → 강조·칩 소멸을 서버 왕복 검증 | **E2E 1** (+ E2E 2·3이 같은 여정의 다른 경로)                                                      |

미커버 AC 없음.

AC 6은 "무엇을 하지 않는가"라서 실행 테스트로 직접 찍히지 않는다. 대신 **파생 경로가 실제로 동작함**을 두 각도에서 고정한다: (a) `selectedTag` prop을 고정한 채 `notes`만 바꿔 다시 렌더했을 때 강조가 사라지는지(= state 수정 없이 해제된다), (b) `resolveSelectedTag`가 순수 함수로 그 판정을 전담하는지. 소스에 `useEffect`가 실제로 없는지는 `ac-verifier` 단계의 정적 확인으로 마무리한다.

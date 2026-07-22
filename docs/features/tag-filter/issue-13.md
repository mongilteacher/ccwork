# Issue #13 — TF-2: 태그를 클릭하면 노트가 강조됨

> 출처: GitHub 이슈 #13(`mongilteacher/ccwork`) · [`prd.md`](./prd.md) ADR-1·ADR-2·ADR-4 · [`issue.md`](./issue.md) · 선행 [`issue-12.md`](./issue-12.md)

## 확정 시그니처

```ts
// src/domain/tagFilter.ts (기존 파일에 추가 — countTags는 TF-1)
import { Note } from '../types/note';

// 선택 태그를 가진 노트인지 판정한다. 동일성 기준은 countTags와 같다
// (normalizeTag → 소문자 비교, ADR-4). 부분 일치는 강조하지 않는다.
// selectedTag가 null이거나 정규화 후 빈 값이면 항상 false(= 전체 보기).
// 주: 선택 태그가 태그 목록에서 사라졌을 때의 자동 해제는 TF-3(#14) 범위다.
//     이 함수는 노트가 그 태그를 갖고 있지 않으므로 자연히 false를 반환한다.
export function isHighlighted(note: Note, selectedTag: string | null): boolean;
```

```tsx
// src/components/TagFilterBar.tsx (props 추가)
interface TagFilterBarProps {
  selectedTag: string | null;
  onSelectTag: (tag: string) => void; // 인자는 칩의 "표기 태그"(TagCount.tag)
}
export function TagFilterBar({ selectedTag, onSelectTag }: TagFilterBarProps);
```

```tsx
// src/components/NoteList.tsx (props 추가)
interface NoteListProps {
  selectedNoteId: string | null;
  selectedTag: string | null; // 강조 판정용 — NoteList가 isHighlighted를 호출한다
  onSelect: (id: string) => void;
}
```

```tsx
// src/components/NoteItem.tsx (props 추가)
interface NoteItemProps {
  note: Note;
  isSelected: boolean; // 지금 편집 중인 노트
  isHighlighted: boolean; // 선택 태그를 가진 노트
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}
```

```tsx
// src/App.tsx (로컬 state 추가 — ADR-1)
const [selectedTag, setSelectedTag] = useState<string | null>(null);
const handleSelectTag = (tag: string) => setSelectedTag(tag);
// TF-2에서는 "다른 태그로 갈아타기"만 한다. 같은 칩 재클릭 토글(null 복귀)은 TF-3(#14).
```

### 상태 표현 계약 (테스트가 의존하는 접점)

시각 토큰(배경·굵기·불투명도)은 Green 단계에서 `design-system` 스킬로 정본을 확인해 정한다.
그와 무관하게 **테스트가 붙잡을 접점만** 여기서 못 박는다 — 클래스 문자열에 테스트를 묶으면 스타일을 바꿀 때마다 테스트가 깨진다.

| 대상               | 접점                                                    | 이유                                       |
| ------------------ | ------------------------------------------------------- | ------------------------------------------ |
| 선택된 태그 칩     | `aria-pressed={선택 여부}`                              | 토글 버튼의 표준 접근성 속성. 시맨틱하다   |
| 강조된 노트 카드   | `data-highlighted={isHighlighted ? 'true' : undefined}` | 강조에 대응하는 ARIA role이 없다           |
| 편집 중인 노트카드 | `data-selected={isSelected ? 'true' : undefined}`       | 두 상태가 **독립적으로** 켜짐을 검증하려면 |

두 상태는 서로 다른 속성이므로 동시에 켜져도 각각 확인된다(AC 8). 시각적 구분은 No-Line Rule을 지켜 테두리가 아닌 수단으로 표현한다(ADR §3).

### 에러 케이스

`isHighlighted`는 순수 판정이라 **throw하지 않는다.** 도메인 계층 규약대로 값으로 답한다.

| 입력                                    | 반환                                    |
| --------------------------------------- | --------------------------------------- |
| `selectedTag === null`                  | `false` (전체 보기)                     |
| `selectedTag`가 정규화 후 `''` (공백만) | `false`                                 |
| `note.tags === []`                      | `false`                                 |
| 대소문자만 다름 (`React` vs `react`)    | `true`                                  |
| NFC/NFD 표기만 다름                     | `true` (`normalizeTag`의 NFC 정규화)    |
| 부분 문자열 (`회의` vs `회의록`)        | `false` (완전 일치만)                   |
| `selectedTag`에 앞뒤 공백 (`' 회의 '`)  | `true` (정규화 후 비교)                 |
| 태그 목록에 더는 없는 선택 태그         | `false` — 별도 코드 없이 자연히 (ADR-3) |

## 테스트 시나리오

### 정상

- [x] [정상] isHighlighted — should return true when 노트가 선택 태그를 그대로 갖고 있다
- [x] [정상] isHighlighted — should return false when 노트가 선택 태그를 갖고 있지 않다
- [x] [정상] isHighlighted — should return true when 선택 태그가 노트의 여러 태그 중 하나와 일치한다
- [x] [정상] isHighlighted — should return true when 선택 태그와 노트 태그가 대소문자만 다르다
- [x] [정상] TagFilterBar — should 그 칩을 선택 상태로 표시한다 when selectedTag가 칩의 태그와 같다
- [x] [정상] TagFilterBar — should 나머지 칩은 선택 상태가 아니다 when 한 칩이 선택돼 있다
- [x] [정상] TagFilterBar — should onSelectTag를 그 칩의 표기 태그로 호출한다 when 사용자가 칩을 클릭한다
- [x] [정상] NoteList — should 선택 태그를 가진 노트만 강조한다 when selectedTag가 주어진다
- [x] [정상] NoteList — should 강조되지 않은 노트도 목록에 그대로 렌더한다 when selectedTag가 주어진다
- [x] [정상] NoteList — should 노트 순서를 selectedTag가 없을 때와 동일하게 유지한다 when selectedTag가 주어진다
- [x] [정상] NoteList — should "노트 N개"를 전체 개수로 렌더한다 when selectedTag가 주어진다
- [x] [정상] NoteList — should 두 노트를 모두 강조한다 when 대소문자만 다른 같은 태그가 서로 다른 노트에 있다
- [x] [정상] NoteItem — should 강조 표시를 렌더한다 when isHighlighted가 true다
- [x] [정상] NoteItem — should 강조 표시와 편집 중 표시를 각각 따로 나타낸다 when isSelected와 isHighlighted가 둘 다 true다
- [x] [정상] App 통합 — should 클릭한 태그의 노트가 강조된다 when 사용자가 칩을 클릭한다
- [x] [정상] App 통합 — should 이전 태그 강조가 풀리고 새 태그 노트만 강조된다 when 사용자가 다른 칩을 클릭한다

### 경계

- [x] [경계] isHighlighted — should return false when selectedTag가 null이다
- [x] [경계] isHighlighted — should return false when 노트의 tags가 빈 배열이다
- [x] [경계] isHighlighted — should return false when selectedTag가 정규화 후 빈 문자열이다
- [x] [경계] isHighlighted — should return true when 선택 태그와 노트 태그가 NFC/NFD 표기만 다르다
- [x] [경계] isHighlighted — should return true when selectedTag에 앞뒤 공백이 있다
- [x] [경계] isHighlighted — should return false when 태그 목록에 더는 없는 태그가 selectedTag로 남아 있다
- [x] [경계] TagFilterBar — should 어떤 칩도 선택 상태가 아니다 when selectedTag가 null이다
- [x] [경계] TagFilterBar — should 그 칩을 선택 상태로 표시한다 when selectedTag와 칩 표기가 대소문자만 다르다
- [x] [경계] NoteList — should 어떤 노트도 강조하지 않는다 when selectedTag가 null이다
- [x] [경계] NoteItem — should 편집 중 표시만 나타내고 강조 표시는 없다 when isSelected만 true다

### 예외

- [x] [예외] isHighlighted — should return false when 선택 태그가 노트 태그의 부분 문자열이다 (`회의` vs `회의록`)
- [x] [예외] NoteList — should 어떤 노트도 강조하지 않는다 when 어떤 노트도 갖고 있지 않은 태그가 selectedTag다

### AC 커버리지

| #   | Acceptance Criteria                               | 커버하는 시나리오                                                       |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `#회의` 칩 클릭 시 그 태그를 가진 노트 2개가 강조 | isHighlighted true 2종 / NoteList 선택 태그 노트만 강조 / App 통합 클릭 |
| 2   | 강조 안 된 노트도 목록에 그대로 남음              | NoteList 비대상 노트도 그대로 렌더                                      |
| 3   | 노트 순서가 클릭 전과 동일                        | NoteList 노트 순서 유지                                                 |
| 4   | "노트 N개"가 전체 개수 그대로                     | NoteList "노트 N개" 전체 개수                                           |
| 5   | 다른 칩 클릭 시 이전 선택이 풀리고 새 태그만 강조 | App 통합 다른 칩 클릭 / TagFilterBar onSelectTag 호출                   |
| 6   | 아무 태그도 선택 안 하면 어떤 노트도 강조 안 됨   | isHighlighted null / NoteList selectedTag null / TagFilterBar null      |
| 7   | 선택된 칩이 나머지 칩과 시각적으로 구분           | TagFilterBar 선택 칩 표시 / 나머지 칩 비선택 / 대소문자 차이 칩         |
| 8   | `isSelected`와 강조가 서로 구분됨                 | NoteItem 둘 다 true 각각 표시 / NoteItem isSelected만 true              |
| 9   | `React`/`react` 두 노트가 모두 강조               | isHighlighted 대소문자 / NoteList 대소문자 두 노트 모두 강조            |

우발 케이스(NFC/NFD, 공백, 부분 문자열, 사라진 태그)는 AC에 직접 대응하지 않지만 TF-1의 집계 기준(ADR-4)과 강조 기준이 어긋나지 않음을 고정하는 회귀 방어선이다.

### 범위 밖 (TF-3 / #14)

- 같은 칩 재클릭 → 선택 해제(토글)
- 태그가 세상에서 사라졌을 때 칩 소멸 + 강조 소멸의 **UI 여정** (도메인 판정만 여기서 방어)
- E2E (`e2e/tag-filter.spec.ts`)

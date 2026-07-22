# Issue #12 — TF-1: 사이드바에 태그 목록 표시

> 출처: GitHub 이슈 #12(`mongilteacher/ccwork`) · [`prd.md`](./prd.md) ADR-1·ADR-4 · [`issue.md`](./issue.md)

## 확정 시그니처

```ts
// src/domain/tagFilter.ts (신규)
import { Note } from '../types/note';

export interface TagCount {
  tag: string; // 표기 태그 — 먼저 등장한 표기 (ADR-4)
  count: number; // 그 태그를 가진 노트 수
}

// 전체 노트에서 태그를 집계한다. normalizeTag 후 소문자 비교로 병합.
// 정렬: count 내림차순 → 동점이면 tag 가나다순(localeCompare)
export function countTags(notes: Note[]): TagCount[];
```

```tsx
// src/components/TagFilterBar.tsx (신규)
// props 없음 — notes·loading·error를 useNotes()로 직접 소비한다(NoteList와 같은 방식).
// TF-2에서 selectedTag·onSelectTag props가 추가된다.
export function TagFilterBar();
```

`src/App.tsx`는 Layout의 `sidebar` slot을 프래그먼트로 조합한다. **`Layout.tsx`는 수정하지 않는다** — 간격은 사이드바의 `space-y-2`가 처리한다.

```tsx
sidebar={
  <>
    <TagFilterBar />
    <NoteList selectedNoteId={selectedNoteId} onSelect={handleSelectNote} />
  </>
}
```

### 에러 케이스

`countTags`는 순수 집계라 **throw하지 않는다.** 도메인 계층 규약대로 실패 대신 값으로 답한다.

| 입력                            | 반환·동작                                         |
| ------------------------------- | ------------------------------------------------- |
| `[]` (노트 없음)                | `[]`                                              |
| 모든 노트가 `tags: []`          | `[]`                                              |
| 태그가 공백만 / 빈 문자열       | `normalizeTag` 후 빈 값이면 집계에서 **제외**     |
| 한 노트에 `["React","react"]`   | 그 태그의 count는 **1** (노트 수 기준, 태그 수 X) |
| 같은 한글이 NFC/NFD로 섞여 저장 | `normalizeTag`의 NFC 정규화로 **하나로 합침**     |

`TagFilterBar`는 렌더할 게 없으면 `null`을 반환한다(빈 상태 문구 없음).

## 테스트 시나리오

### 정상

- [x] [정상] countTags — should return 태그별 카운트 when 여러 노트가 태그를 갖고 있다
- [x] [정상] countTags — should sort by count 내림차순 when 카운트가 서로 다르다
- [x] [정상] countTags — should sort by 가나다순 when 카운트가 같다
- [x] [정상] countTags — should 하나의 TagCount로 합친다 when 대소문자만 다른 태그가 서로 다른 노트에 있다
- [x] [정상] countTags — should 먼저 등장한 표기를 tag로 쓴다 when 대소문자가 다른 표기가 섞여 있다
- [x] [정상] TagFilterBar — should 태그 칩과 카운트를 렌더한다 when 태그를 가진 노트가 있다
- [x] [정상] TagFilterBar — should 칩을 button 요소로 렌더한다 when 태그가 있다
- [x] [정상] TagFilterBar — should 카운트 내림차순으로 칩을 배치한다 when 카운트가 서로 다르다
- [ ] [정상] TagFilterBar — should 칩이 tab 키로 포커스를 받는다 when 칩이 렌더돼 있다
- [ ] [정상] NoteList — should "노트 N개"를 노트 개수대로 렌더한다 when 노트가 여러 개 있다
- [ ] [정상] 사이드바 조합 — should TagFilterBar와 NoteList를 함께 렌더한다 when 같은 slot에 들어간다

### 경계

- [x] [경계] countTags — should return 빈 배열 when notes가 빈 배열이다
- [x] [경계] countTags — should return 빈 배열 when 모든 노트의 tags가 빈 배열이다
- [x] [경계] countTags — should count를 1로 센다 when 한 노트가 대소문자만 다른 같은 태그를 둘 갖고 있다
- [x] [경계] countTags — should 그 태그를 제외한다 when 정규화 후 빈 값이 되는 태그가 저장돼 있다
- [x] [경계] countTags — should 하나로 합친다 when 같은 한글 태그가 NFC/NFD로 다르게 저장돼 있다
- [x] [경계] TagFilterBar — should 아무것도 렌더하지 않는다 when 태그를 가진 노트가 하나도 없다

### 예외

- [x] [예외] TagFilterBar — should 아무것도 렌더하지 않는다 when loading이 true다
- [x] [예외] TagFilterBar — should 아무것도 렌더하지 않는다 when error가 있다

### AC 커버리지

| #   | Acceptance Criteria                                   | 커버하는 시나리오                                            |
| --- | ----------------------------------------------------- | ------------------------------------------------------------ |
| 1   | 사이드바 상단에 모든 태그가 칩으로 표시               | TagFilterBar 태그 칩과 카운트를 렌더                         |
| 2   | 칩에 카운트가 함께 표시                               | countTags 태그별 카운트 / TagFilterBar 칩과 카운트를 렌더    |
| 3   | 카운트 내림차순 정렬                                  | countTags count 내림차순 / TagFilterBar 카운트 내림차순 배치 |
| 4   | 동점이면 가나다순                                     | countTags 가나다순                                           |
| 5   | `React`/`react`는 칩 하나, 카운트 2, 표기는 먼저 등장 | countTags 대소문자 병합 / countTags 먼저 등장한 표기         |
| 6   | 태그가 없으면 영역 자체를 렌더하지 않음               | TagFilterBar 태그 없음 / countTags 빈 배열 2종               |
| 7   | 로딩·에러일 때 태그 영역 렌더 안 함                   | TagFilterBar loading / TagFilterBar error                    |
| 8   | 칩이 `button`이며 키보드 포커스 가능                  | TagFilterBar button 요소로 렌더 + **tab 포커스**             |
| 9   | 노트 목록과 "노트 N개"는 이전과 동일                  | **NoteList 노트 N개 + 사이드바 조합** (AC 검증 후 보강)      |

### AC 검증(4단계) 후 보강 기록

최초 계획은 "AC 9는 기존 `NoteList` 테스트가 초록으로 남는지로 확인"이었으나, **`NoteList.test.tsx`가 애초에 존재하지 않아** 그 전제가 성립하지 않았다(CLAUDE.md 「알려진 불일치」 6번의 잔여물). `NoteList.tsx`·`Layout.tsx`는 무변경이라 실제 회귀 위험은 낮지만 자동화된 안전망이 없었다.

TF-2·TF-3이 사이드바를 계속 건드리므로 여기서 안전망을 깔아 둔다. 위 시나리오 3개가 그 보강분이다:

- 칩 tab 포커스 — AC 8 문장의 후반부를 직접 검증
- NoteList "노트 N개" — AC 9의 회귀 기준선을 처음으로 만든다
- 사이드바 조합 — `TagFilterBar` 삽입이 `NoteList`를 밀어내지 않음을 확인

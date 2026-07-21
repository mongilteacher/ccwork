# Issue #2 — TAG-2: Enter로 태그 추가 후 저장

> 출처: GitHub 이슈 #2(`mongilteacher/ccwork`) · `docs/features/tag/prd.md` ADR-2·3·4 · 코드베이스
> 슬라이스 성격: **쓰기 왕복 완성** — Enter로 확정 → 로컬 state → 저장 버튼으로 1회 전송
> 선행: TAG-1 · 관통 계층: domain · hook · context · component

## 확정 시그니처

```ts
// ── src/domain/tag.ts — 신규, 순수 규칙(React·fetch·DOM 무의존) ──────
export function addTag(tags: string[], raw: string): string[];
//  trim → 빈 값이면 원본 그대로 반환(무시) → 아니면 끝에 추가한 새 배열 반환
//  반환 타입은 string[] (GATE-1 안 A). error 객체는 TAG-4에서 도입.
//  ⚠️ TAG-2 범위 밖(하지 않음): 중복 판정·길이/개수 제한(TAG-4), 정규화·NFC·IME(TAG-5)

// ── src/hooks/useTagInput.ts — 신규, 입력 동작(표현과 분리) ──────────
export function useTagInput(
  tags: string[],
  onChange: (tags: string[]) => void,
): {
  value: string; // 현재 입력 문자열
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // 타이핑 반영
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void; // Enter로 확정
};
//  Enter → addTag(tags, value) 결과를 onChange로 올리고 입력을 비운다. 포커스는 유지(Enter는 blur 아님).
//  ⚠️ IME 가드(isComposing) 없음 — TAG-5 몫

// ── src/components/TagInput.tsx — 입력 필드 추가 + onChange prop ─────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void; // ← 추가 (TAG-1은 표시 전용이라 없었음)
}
//  기존 칩 목록 + <input> 렌더, useTagInput 연결.
//  ⚠️ TAG-1의 "빈 배열이면 return null"을 제거한다 — 빈 배열이어도 입력 필드는 떠 있어야 한다.

// ── src/components/NoteEditor.tsx — 저장 배관 + onChange 연결 ────────
//  <TagInput tags={tags} onChange={setTags} />
//  handleSave의 updateNote 호출에 tags 추가: updateNote(selectedNoteId, { title, content, tags })
//  (createNote는 TAG-1에서 이미 tags 전달 중)

// ── src/context/NotesContext.tsx — 변경 없음 ───────────────────────
//  createNote는 이미 tags 있음(TAG-1). updateNote는 Partial<Note>라 tags를 자동 수용.
```

### 에러 케이스 (TAG-2 범위)

- `addTag` — **throw 없음, 에러 코드 없음.** trim 후 빈 문자열이면 조용히 무시(원본 배열 반환). 그 외엔 끝에 추가.
- `useTagInput` — Enter인데 값이 비면 확정 안 함(onChange 미호출). Enter 외 키는 확정 안 함. IME 조합 중 Enter는 **구분하지 않음**(TAG-5).
- 검증 실패 인라인 문구(ADR-4)·중복/길이/개수 판정은 **TAG-2에 없음** — TAG-4에서 등장.

### 설계 메모

- `addTag` 반환 타입은 `string[]`(GATE-1 안 A). TAG-4에서 `{ tags, error }`로 확장하며 호출부를 함께 고친다.
- `addTag`는 **입력 배열을 변형하지 않고** 새 배열을 반환한다(프로젝트의 함수형 업데이트 관례와 일치).
- TAG-2는 중복을 걸러내지 않는다 — 같은 값이 이미 있어도 그대로 추가된다(중복 판정은 TAG-4).

### ⚠️ TAG-1 테스트에 미치는 영향 (TAG-2 Red 단계에서 갱신)

TagInput의 계약이 바뀌므로 TAG-1의 `src/components/TagInput.test.tsx`를 **Red 단계에서 갱신**해야 한다(구현이 아니라 테스트를 먼저 고치는 지점):

1. `onChange`가 필수가 되어, 기존 `<TagInput tags={...} />` 렌더 테스트에 `onChange={() => {}}`를 더해야 타입이 맞는다.
2. `[경계] TagInput — 빈 배열이면 완전히 빈 DOM`(`toBeEmptyDOMElement`) 단언은 **더 이상 성립하지 않는다** — 이제 빈 배열이어도 입력 필드가 렌더된다. 아래 「경계」의 "빈 배열이어도 입력 필드는 렌더한다"로 **대체**한다.

## 테스트 시나리오

> 형식: `[정상|경계|예외] 대상 — should [기대동작] when [조건]`
> 1순위 대상은 **도메인 함수 `addTag`**(jsdom 불필요). 훅·컴포넌트·저장 배관이 뒤따른다.

### 정상

- `[정상] addTag — should raw를 끝에 추가한 새 배열을 반환한다 when 비어있지 않은 값이다`
- `[정상] addTag — should 기존 순서를 유지하고 끝에 붙인다 when 이미 태그가 있다`
- `[정상] useTagInput — should value를 갱신한다 when handleChange가 입력 변경을 받는다`
- `[정상] useTagInput — should addTag 결과로 onChange를 호출한다 when 값이 있는 상태로 Enter를 누른다`
- `[정상] useTagInput — should 입력값을 빈 문자열로 비운다 when Enter로 확정한 뒤다`
- `[정상] TagInput — should 타이핑한 값이 onChange로 확정 전달된다 when 사용자가 입력 후 Enter를 누른다`
- `[정상] TagInput — should 입력 필드가 비워진다 when Enter로 확정한 뒤다`
- `[정상] TagInput — should 입력 필드에 포커스가 유지된다 when Enter로 확정한 뒤다`
- `[정상] NoteEditor 저장 — should createNote를 tags를 포함해 호출한다 when 새 노트를 저장한다`
- `[정상] NoteEditor 저장 — should updateNote를 { title, content, tags }로 호출한다 when 기존 노트를 저장한다`

### 경계

- `[경계] addTag — should 앞뒤 공백을 trim한 값을 추가한다 when raw에 공백이 섞여 있다`
- `[경계] addTag — should 빈 tags에 첫 원소로 추가한다 when tags가 []다`
- `[경계] addTag — should 원본과 내용이 같은 배열을 반환한다(추가 없음) when trim 후 빈 문자열이다`
- `[경계] addTag — should 입력 배열을 변형하지 않는다 when 태그를 추가한다` (불변성 — 새 배열 반환)
- `[경계] addTag — should 중복이어도 그대로 추가한다 when 같은 값이 이미 존재한다` (중복 판정은 TAG-4)
- `[경계] useTagInput — should onChange를 호출하지 않는다 when 값이 빈/공백인 채로 Enter를 누른다`
- `[경계] useTagInput — should 확정하지 않는다 when Enter가 아닌 키를 누른다`
- `[경계] TagInput — should 칩과 입력 필드를 함께 렌더한다 when tags가 비어있지 않다` (TAG-1 칩 표시 유지)
- `[경계] TagInput — should 빈 배열이어도 입력 필드를 렌더한다 when tags가 []다` (TAG-1 "완전히 빈 DOM" 단언 대체)
- `[경계] 로컬 전용 — should 서버 호출(api) 없이 로컬 tags만 바뀐다 when 칩을 추가한다` (저장 전까지 미전송)
- `[경계] NoteEditor 저장 — should 저장이 에러로 끝나도 tags 로컬 state가 유지된다 when 저장에 실패한다` (재시도 가능, US-10)

### 예외

- `[예외] TagInput — should 스타일 검사를 통과한다(원시 색상·테두리 없음) when design-system 훅이 diff를 검사한다` (입력 필드 추가분 포함)

> 참고 — 런타임 테스트로 만들지 않는 것:
>
> - "저장 후 새로고침하면 태그가 유지된다"(AC 6)는 e2e 영역이라 단위 테스트 밖이다. **저장 호출이 tags를 실어 보내는지**(위 createNote/updateNote 시나리오)로 대체 검증한다.
> - IME 중복 방지(US-6)는 TAG-2 범위 밖 → TAG-5.

## AC 커버리지

| #   | Acceptance Criteria (이슈 #2)                 | 커버 시나리오                                                                                      |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Enter → 칩 추가·입력 비움·포커스 유지         | `[정상] useTagInput…Enter로 onChange` + `…입력값 비움` + `[정상] TagInput…포커스 유지`·`…비워진다` |
| 2   | 빈/공백 Enter → 아무것도 추가 안 됨           | `[경계] addTag…빈 문자열` + `[경계] useTagInput…빈/공백 Enter`                                     |
| 3   | 앞뒤 공백 → trim되어 추가                     | `[경계] addTag…trim한 값을 추가`                                                                   |
| 4   | 칩 추가 시 서버 호출 없이 로컬 state만        | `[경계] 로컬 전용…서버 호출 없이`                                                                  |
| 5   | 저장 버튼 → 본문과 1회 요청으로 전송          | `[정상] NoteEditor 저장…createNote`·`…updateNote { title, content, tags }`                         |
| 6   | 저장 후 새로고침해도 태그 유지                | (e2e) → `[정상] NoteEditor 저장…` 두 건이 tags를 실어 보냄으로 대체 검증                           |
| 7   | 새 노트 + 태그 → 태그 포함 생성               | `[정상] NoteEditor 저장…createNote를 tags를 포함해 호출`                                           |
| 8   | 저장 실패 → 태그 로컬 state 유지(재시도 가능) | `[경계] NoteEditor 저장…에러로 끝나도 tags 유지`                                                   |
| 9   | `src/domain/tag.ts` 단위 테스트 통과          | `addTag` 정상/경계 시나리오 전부                                                                   |

**모든 AC(9개)가 최소 1개 시나리오로 커버됨.** (AC 6은 단위 테스트 범위 밖이라 저장 호출의 tags 포함으로 대체 검증 — 위 참고 참조.)

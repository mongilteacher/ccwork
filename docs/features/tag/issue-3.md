# Issue #3 — TAG-3: 칩 × 로 태그 삭제

> 출처: GitHub 이슈 #3(`mongilteacher/ccwork`) · `docs/features/tag/prd.md` ADR-2 · 코드베이스
> 슬라이스 성격: **삭제 동작 완성** — 칩 × 클릭 → 로컬 tags에서 즉시 제거(서버 미전송)
> 선행: TAG-1 (TAG-2 이후 병렬 가능) · 관통 계층: domain · hook · component · 관련 US: US-2·8

## 확정 시그니처

> GATE-1 승인: **안 A(도메인 분리)** — `addTag`와 대칭인 순수 `removeTag`를 도메인에 둔다.

```ts
// ── src/domain/tag.ts — removeTag 추가 (addTag의 대칭, 순수 규칙) ──────────
export function removeTag(tags: string[], tag: string): string[];
//  tag와 일치하지 않는 원소만 남긴 새 배열 반환. 원본 배열 불변(함수형 관례).
//  삭제엔 규칙이 없다 → 정규화·검증·throw 없음. TagError와 무관.
//  값(value) 기준 filter. 존재하지 않는 tag면 원본과 내용이 같은 배열(no-op).

// ── src/hooks/useTagInput.ts — handleRemove 추가 ───────────────────────────
export function useTagInput(
  tags: string[],
  onChange: (tags: string[]) => void,
): {
  value: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleRemove: (tag: string) => void; // ← 추가: onChange(removeTag(tags, tag)) 호출
};
//  onChange 오케스트레이션을 훅에 유지 → TagInput은 표현 전용(PRD ADR-3) 유지.

// ── src/components/TagInput.tsx — 칩에 × 버튼 추가 ──────────────────────────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void; // ← 변경 없음 (TAG-2에서 이미 도입)
}
//  각 칩 <span> 안에 삭제용 <button>(×) 추가.
//  onClick: e.stopPropagation() 후 handleRemove(tag) — 카드 버튼 이벤트 규약 준수.
//  서버 호출 없음(로컬 state만). 확인 다이얼로그 없음.

// ── src/context/NotesContext.tsx · NoteEditor.tsx — 변경 없음 ──────────────
//  삭제도 로컬 tags state만 바꾼다. 저장 배관(TAG-2)·취소 롤백이 그대로 처리.
```

### 에러 케이스 (TAG-3 범위)

- `removeTag` — **throw 없음, 에러 코드 없음.** 존재하지 않는 `tag`를 주면 원본과 내용이 같은 배열 반환(no-op).
- 확인 다이얼로그·`confirm()` 없음 (ADR-2 · CLAUDE.md 에러 규약).

### 설계 메모

- 삭제는 **값(value) 기준 filter**다. 중복 태그가 있으면 같은 값이 모두 제거된다 — TAG-2는 중복 허용 상태이나, 중복 판정·차단은 TAG-4 몫이라 AC엔 중복 케이스가 없다.
- `removeTag`는 **입력 배열을 변형하지 않고** 새 배열을 반환한다(`addTag`·프로젝트 함수형 업데이트 관례와 일치).
- `TagInputProps`는 변경 없음 — `onChange` 하나로 추가·삭제를 모두 표현한다.
- 삭제 저장은 TAG-2의 저장 배관을 그대로 탄다(Context 변경 없음).
- **취소 롤백은 별도 구현이 필요했다(AC 검증에서 발견).** 기존 `취소`는 `onDone`만 호출해 `isCreating`을 토글했는데, 기존 노트 편집 중엔 `isCreating`이 이미 `false`라 폼 동기화 `useEffect`(deps `[selectedNoteId, isCreating]`)가 재실행되지 않아 로컬 변경이 화면에서 되돌아오지 않았다(제목·내용도 동일한 기존 결함). `NoteEditor.handleCancel`을 추가해 취소 시 로컬 state를 `selectedNote` 원본으로 재동기화한 뒤 `onDone`을 호출하도록 고쳤다. 서버엔 여전히 미전송이다.

## 테스트 시나리오

> 형식: `[정상|경계|예외] 대상 — should [기대동작] when [조건]`
> 1순위 대상은 **도메인 함수 `removeTag`**(jsdom 불필요). 훅·컴포넌트가 뒤따른다.

> ✅ = tdd-green으로 통과 확인 (2026-07-21) · 40/40 통과 (TAG-3 신규 11개)

### 정상

- [x] `[정상] removeTag — should 해당 태그를 뺀 새 배열을 반환한다 when 존재하는 tag를 지운다`
- [x] `[정상] removeTag — should 나머지 태그의 순서를 유지한다 when 중간의 tag를 지운다`
- [x] `[정상] useTagInput — should removeTag 결과로 onChange를 호출한다 when handleRemove(tag)를 부른다`
- [x] `[정상] TagInput — should 클릭한 칩만 빠진 배열이 onChange로 전달된다 when 칩의 × 버튼을 누른다`
- [x] `[정상] TagInput — should React는 남고 공부만 사라진다 when 공부 칩의 ×를 클릭한다` (AC1)

### 경계

- [x] `[경계] removeTag — should 원본과 내용이 같은 배열을 반환한다(no-op) when 존재하지 않는 tag를 지운다`
- [x] `[경계] removeTag — should 빈 배열을 반환한다 when 마지막 하나 남은 tag를 지운다`
- [x] `[경계] removeTag — should 입력 배열을 변형하지 않는다 when 태그를 제거한다` (불변성 — 새 배열 반환)
- [x] `[경계] removeTag — should []를 그대로 반환한다 when tags가 []다` (no-op)
- [x] `[경계] 로컬 전용 — should 서버 호출(api) 없이 로컬 tags만 바뀐다 when 칩을 삭제한다` (저장 전까지 미전송, AC2) — `handleRemove`가 `onChange`만 호출(api 미호출)로 대체 검증
- [x] `[경계] TagInput — should × 클릭이 상위 클릭 핸들러로 전파되지 않는다 when 칩의 × 버튼을 누른다` (e.stopPropagation 규약)
- [x] `[경계] NoteEditor — should 삭제로 줄어든 tags를 updateNote에 전달한다 when 칩을 삭제한 뒤 저장한다` (AC4 직접 검증)

### 예외

- [x] `[예외] TagInput — should confirm 다이얼로그를 띄우지 않는다 when 칩을 삭제한다` (window.confirm 미호출, AC2)
- [x] `[예외] NoteEditor — should 삭제한 칩을 원상 복구한다 when 기존 노트 편집 중 칩을 삭제하고 취소를 누른다` (AC3 — handleCancel 재동기화)
- [ ] `[예외] TagInput — should 스타일 검사를 통과한다(원시 색상·테두리 없음) when design-system 훅이 diff를 검사한다` — 런타임 테스트 아님. PostToolUse ratchet 훅이 커버(× 버튼 추가분 통과 확인)

> 참고 — 런타임 단위 테스트로 만들지 않는 것:
>
> - `[예외] design-system 스타일 검사`는 Vitest 범위 밖 → PostToolUse ratchet 훅이 커버.
> - AC4의 **"새로고침 후 유지"** 부분만 e2e 영역이라 단위 테스트 밖이다. "삭제 후 저장 시 축소된 tags 전송"까지는 위 `[경계] NoteEditor…updateNote에 전달`로 직접 검증한다.
> - 당초 GATE-2에서 AC3·AC4를 "취소 자동 롤백" 전제로 대체 검증하려 했으나, AC 검증에서 그 전제가 틀렸음이 드러나 **직접 검증 + handleCancel 구현**으로 승격했다(아래 AC 커버리지 표 하단 참조).

## AC 커버리지

| #   | Acceptance Criteria (이슈 #3)                      | 커버 시나리오                                                                                   |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `공부` × 클릭 → `공부`만 사라지고 `React`는 남는다 | `[정상] TagInput…React는 남고 공부만 사라진다` + `[정상] removeTag…순서 유지`                   |
| 2   | 확인 다이얼로그 없이 서버 호출 없이 제거           | `[경계] 로컬 전용…서버 호출 없이` + `[예외] TagInput…confirm 미호출`                            |
| 3   | 삭제 후 취소 → 되돌아간다(서버 미전송)             | `[예외] NoteEditor…삭제한 칩을 원상 복구한다`(handleCancel 재동기화, 서버 미전송)               |
| 4   | 삭제 후 저장·새로고침 → 삭제된 태그 다시 안 나타남 | `[경계] NoteEditor…삭제로 줄어든 tags를 updateNote에 전달`(직접 검증). "새로고침 후"는 e2e 영역 |

**모든 AC(4개)가 최소 1개 시나리오로 커버됨.**

> ⚠️ AC 검증(ac-verifier) 지적으로 GATE-2의 "취소 자동 롤백" 전제가 틀렸음이 드러나, AC3(취소 롤백)·AC4(삭제 후 저장)를 **대체 검증에서 직접 검증으로 승격**하고 `NoteEditor.handleCancel`을 구현했다(위 설계 메모 참조). AC3는 태그뿐 아니라 제목·내용에도 있던 편집기 취소 결함을 함께 해소한다. "새로고침 후 유지"(AC4 후반)만 여전히 e2e 영역이라 단위 테스트 밖.

# Issue #1 — TAG-1: 저장된 태그를 칩으로 표시

> 출처: GitHub 이슈 #1(`mongilteacher/ccwork`) · `docs/features/tag/prd.md` ADR-1 · 코드베이스
> 슬라이스 성격: **읽기 전용 표시**(검증·추가·삭제 없음)

## 확정 시그니처

```ts
// ── src/types/note.ts — tags 필수 필드 추가 ────────────────
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[]; // ← 추가 (optional 아님, ADR-1)
  createdAt: string;
  updatedAt: string;
}

// ── src/api/notes.ts — 코드 변경 없음 (자동 반영) ───────────
// Omit<Note, 'id'|'createdAt'|'updatedAt'> 입력 타입이 이제 tags를 필수로 요구
export async function createNote(
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>, // 이제 tags 포함
): Promise<Note>;

// ── src/context/NotesContext.tsx — tags 파라미터 추가 ──────
interface NotesContextType {
  // ...
  createNote: (title: string, content: string, tags: string[]) => Promise<void>;
  // updateNote / deleteNote 변경 없음
}

// ── src/components/TagInput.tsx — 신규, 표시 전용 순수 컴포넌트 ──
interface TagInputProps {
  tags: string[]; // TAG-1은 표시만 → onChange 없음 (TAG-2/3에서 추가)
}
export function TagInput({ tags }: TagInputProps); // 반환타입 생략(기존 컴포넌트 관례)

// ── src/components/NoteEditor.tsx — Props 불변, 로컬 state만 추가 ──
// const [tags, setTags] = useState<string[]>([]);  // 폼 동기화용
```

### 에러 케이스

- **새로운 에러 케이스 없음.** TAG-1은 표시 전용이라 검증·throw가 없다. 도메인 검증(`validateTag` 등)은 TAG-4에서 처음 등장한다.
- `api.createNote`의 기존 `throw new Error('Failed to create note')`는 그대로 유지(TAG-1이 건드리지 않음).

### 설계 메모

- `TagInputProps`에 `onChange`를 넣지 않는다 — 읽기 전용. 지금 넣으면 미사용 파라미터(`noUnusedParameters` 빌드 에러) + YAGNI. TAG-2/3에서 추가.
- `Context.createNote`의 3번째 파라미터 `tags`는 `Note.tags` 필수화로 인한 타입 배관. TAG-1에선 항상 `[]`가 흐르고, 실제 사용자 입력 연결은 TAG-2 몫.

## 테스트 시나리오

> 형식: `[정상|경계|예외] 대상 — should [기대동작] when [조건]`
> TAG-1엔 도메인 함수가 없어 대상은 **타입·컴포넌트·폼 동기화**다.

> ✅ = tdd-green으로 통과 확인 (2026-07-21)

### 정상

- [x] `[정상] Note 타입 — should tags를 string[] 필수 필드로 갖는다 when 타입 정의를 본다` — `tsc` 통과(필수 필드화)
- [x] `[정상] TagInput — should tags 각 원소를 칩으로 렌더한다 when tags가 ["React","공부"]다`
- [x] `[정상] TagInput — should 칩을 tags 배열 순서대로 표시한다 when 다중 태그가 주어진다`
- [x] `[정상] NoteEditor 폼 동기화 — should 선택된 노트의 tags로 로컬 tags를 채운다 when 노트가 선택된다`
- [x] `[정상] NoteEditor 폼 동기화 — should 칩 목록을 B의 tags로 교체한다 when 노트 A에서 노트 B로 전환한다`
- [x] `[정상] createNote — should tags를 포함한 Note를 반환한다 when title·content·tags로 호출한다`

### 경계

- [x] `[경계] TagInput — should 아무 칩도 렌더하지 않고 빈 상태 문구도 없이 비운다 when tags가 []다`
- [x] `[경계] TagInput — should 칩 하나만 렌더한다 when tags 원소가 1개다`
- [x] `[경계] NoteEditor 폼 동기화 — should 로컬 tags를 []로 초기화한다 when isCreating이고 선택된 노트가 없다`
- [x] `[경계] db.json — should 기존 노트 3건이 모두 tags를 갖고 최소 1건은 비어있지 않다 when 시드 데이터를 확인한다`

### 예외

- [x] `[예외] createNote 호출부 — should 컴파일 에러가 난다 when tags 없이 note 객체를 넘긴다` (tags 필수화 검증 — `tsc`가 잡음)
- [x] `[예외] TagInput — should 스타일 검사를 통과한다(원시 색상·테두리 없음) when design-system 훅이 diff를 검사한다` — 신규 `TagInput.tsx`가 ratchet 훅 통과

### AC 커버리지

| #   | Acceptance Criteria (이슈 #1)                     | 커버 시나리오                                                          |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `Note`에 `tags: string[]`가 있고 optional 아님    | `[정상] Note 타입…` + `[예외] createNote 호출부…`                      |
| 2   | `db.json` 3건 모두 `tags`, 최소 1건 비어있지 않음 | `[경계] db.json…`                                                      |
| 3   | `["React","공부"]` 노트 선택 시 칩 2개 표시       | `[정상] TagInput…칩으로 렌더` + `[정상] NoteEditor…선택된 노트의 tags` |
| 4   | `tags: []` 노트 선택 시 칩 영역 비고 문구 없음    | `[경계] TagInput…빈 상태 문구도 없이`                                  |
| 5   | 노트 A→B 전환 시 칩 목록 교체                     | `[정상] NoteEditor…B의 tags로 교체`                                    |
| 6   | 칩 스타일 design-system 훅 통과                   | `[예외] TagInput…스타일 검사를 통과`                                   |

**모든 AC(6개)가 최소 1개 시나리오로 커버됨.**

# Issue #5 — TAG-5: 정규화·한글 IME 견고화

> 출처: GitHub 이슈 #5(`mongilteacher/ccwork`) · `docs/features/tag/prd.md` · `spec-fixed.md` §5.2·§6 · 코드베이스
> 슬라이스 성격: **정규화 파이프라인 확정 + IME 가드** — 붙여넣기·한글 입력 엣지케이스를 막는 마지막 슬라이스
> 선행: TAG-2 (TAG-4 위에 얹음) · 관통 계층: domain · hook · 관련 US: US-6·9
> 작업 브랜치: `feature/tag-5-ime`

## 확정 시그니처

> GATE-1 승인: `normalizeTag` **하나만 신규 export**. `addTag`·`validateTag`는 시그니처 유지, 내부 `trim` → `normalizeTag` 승격. 훅은 IME 가드만 추가. 기존 TAG-2/TAG-4 테스트 불변이 핵심 판단이었다.

```ts
// ── src/domain/tag.ts — 신규: 정규화 파이프라인 (순수, spec §5.2) ──────────────
export function normalizeTag(raw: string): string;
//  순서 고정(바뀌면 결과가 달라짐):
//    1. /[\r\n\t]+/g → ' '   개행·탭 → 공백 (붙여넣기 대응)
//    2. /\s{2,}/g   → ' '   연속 공백 → 1개
//    3. trim()               앞뒤 공백 제거
//    4. normalize('NFC')     유니코드 정규화 (macOS NFD 한글 통일)
//  · throw 없음. 공백만 입력이면 '' 반환. 검증·저장은 항상 이 반환값 기준.

// ── src/domain/tag.ts — 내부 동작만 변경 (시그니처·반환형 불변) ─────────────────
export function addTag(tags: string[], raw: string): string[];
//  raw.trim() → normalizeTag(raw). 빈 값('')이면 원본 그대로(no-op) 유지.

export function validateTag(value: string, tags: string[]): TagError | null;
//  value.trim() → normalizeTag(value). 중복 판정이 NFC 정규화 후 이뤄진다(AC5).

// ── src/hooks/useTagInput.ts — 내부 동작만 변경 (반환 형태 불변) ─────────────────
export function useTagInput(
  tags: string[],
  onChange: (tags: string[]) => void,
): { value: string; error: TagError | null; handleChange; handleKeyDown; handleRemove };
//  handleKeyDown 최상단에 IME 가드:
//    if (e.nativeEvent.isComposing) return;  // 조합 확정용 Enter → 태그 추가 안 함(AC1·2)
//    if (e.key !== 'Enter') return;          // (기존)

// ── 변경 없음 ──────────────────────────────────────────────────────────────────
//  removeTag, TagInput, NoteEditor, NotesContext, api/notes.ts — 손대지 않음.
```

### 에러 케이스

- `normalizeTag` — **throw 없음, 에러 코드 없음.** 순수 문자열 변환. 공백만/빈 값이면 `''` 반환.
- `addTag`/`validateTag` — 시그니처·에러 규약 불변. 정규화 기준만 `trim` → `normalizeTag`로 승격.
- `useTagInput` — IME 조합 중 Enter는 **조용히 무시**(추가·에러 둘 다 없음). throw 없음.

### 설계 메모

- `normalizeTag`가 `addTag`·`validateTag`의 공통 정규화 기준이 된다 — TAG-4 tdd-refactor에서 "범위 밖 제안"으로 남겼던 통합이 이번 슬라이스에서 정식 도입된다.
- 중복 판정의 NFC화는 **입력값만 정규화**하면 충분하다. 저장된 태그는 `addTag`가 이미 `normalizeTag`로 NFC 저장하므로, `validateTag`는 입력값을 NFC화해 비교하면 NFC↔NFC 비교가 성립한다.
- 순서 고정이 핵심이다: trim을 NFC보다 먼저 해야 하고, 연속 공백 축약을 개행 치환 뒤에 해야 여러 줄 붙여넣기가 한 줄로 접힌다.

## 테스트 시나리오

> 형식: `[정상|경계|예외] 대상 — should [기대동작] when [조건]`
> 1순위 대상은 **`normalizeTag`**(순수, jsdom 불필요, spec §6.2 표를 `it.each`로 이관). 통합 지점(addTag/validateTag)·훅 IME 가드가 뒤따른다.

> ✅ = tdd-green으로 통과 확인 (2026-07-21) · 86/86 통과 (TAG-5 신규 18개: normalizeTag 11·addTag 통합 3·validateTag NFC 1·훅 IME 3)

### 정상

- [x] `[정상] normalizeTag — should 원문 그대로 반환한다 when 정규화가 필요 없는 값이다` (`'React'` → `'React'`)
- [x] `[정상] normalizeTag — should 앞뒤 공백을 제거한다 when 값 양쪽에 공백이 있다` (`'  React  '` → `'React'`)
- [x] `[정상] normalizeTag — should 내부 단일 공백을 보존한다 when 태그 중간에 공백이 하나다` (`'React Query'` → `'React Query'`)
- [x] `[정상] useTagInput — should 조합이 끝난 뒤 Enter로 정상 추가된다 when isComposing이 false다` (Red에서도 통과 — 회귀 가드)

### 경계

- [x] `[경계] normalizeTag — should 연속 공백을 하나로 축약한다 when 내부에 공백이 2개 이상이다` (`'React  Query'` → `'React Query'`, AC4)
- [x] `[경계] normalizeTag — should 개행을 공백으로 치환한다 when 여러 줄 텍스트다` (`'line1\nline2'` → `'line1 line2'`, AC3)
- [x] `[경계] normalizeTag — should 빈 줄 포함 여러 줄도 공백 1개로 접는다 when 개행이 2개 이상 연속이다` (`'a\n\nb'` → `'a b'`, AC3 보강 — ac-verifier 제안, 회귀 가드)
- [x] `[경계] normalizeTag — should 탭을 공백으로 치환한다 when 탭 문자가 섞여 있다` (`'a\tb'` → `'a b'`)
- [x] `[경계] normalizeTag — should 빈 문자열을 반환한다 when 공백·개행만 있다` (`'  \n\t '` → `''`)
- [x] `[경계] normalizeTag — should NFD를 NFC로 정규화한다 when 자모 분리형 한글이다` (NFD`한글` → NFC`한글`)
- [x] `[경계] normalizeTag — should 쉼표를 보존한다 when 쉼표 포함 값이다` (`'React, Vue'` → `'React, Vue'`, 분리 안 함, AC6)

### 예외

- [x] `[예외] useTagInput — should 태그를 추가하지 않는다 when 한글 조합 중(isComposing=true) Enter를 누른다` (AC1)
- [x] `[예외] useTagInput — should 이중 추가되지 않는다 when 조합 Enter 직후 확정 Enter가 온다` (AC2 — 조합 Enter 무시 + value 보존, 확정 Enter만 1회 추가)
- [x] `[예외] validateTag — should 'duplicate'를 반환한다 when NFD 한글이 기존 NFC 한글과 정규화 후 같다` (AC5)
- [x] `[예외] addTag — should 개행 포함 값을 한 줄로 정규화해 추가한다 when 여러 줄을 붙여넣는다` (AC3 통합 지점)
- [x] `[예외] addTag — should 쉼표 포함 값을 하나의 태그로 추가한다 when 'React, Vue'를 넣는다` (AC6 통합 지점 · Red에서도 통과 — 회귀 가드)

> 참고 — 런타임 단위 테스트로 만들지 않는 것:
>
> - `it.each` 테이블(AC7)은 위 `normalizeTag` 시나리오들을 spec §5.2·§6.2 표 그대로 `it.each`로 옮겨 충족한다(별도 항목 아님, 구현 방식 지정).
> - IME 가드는 실제 브라우저 `compositionstart/end` 대신 `e.nativeEvent.isComposing` 값을 흉내낸 이벤트 객체로 검증한다(jsdom은 IME를 실제로 발생시키지 못함).

## AC 커버리지

| #   | Acceptance Criteria (이슈 #5)                           | 커버 시나리오                                                                          |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | 한글 조합 중 Enter → 추가 안 됨, 확정 후 Enter로만 추가 | `[예외] useTagInput…조합 중 Enter 추가 안 함` + `[정상] useTagInput…isComposing false` |
| 2   | 한글 태그 → 이중 추가 안 됨                             | `[예외] useTagInput…이중 추가되지 않는다`                                              |
| 3   | 여러 줄 텍스트 → 개행이 공백으로 치환돼 한 줄 태그      | `[경계] normalizeTag…개행 치환` + `[예외] addTag…여러 줄 한 줄로 추가`                 |
| 4   | `React  Query`(연속 공백) → `React Query`               | `[경계] normalizeTag…연속 공백 축약`                                                   |
| 5   | NFC 저장 `한글`에 NFD `한글` 추가 → 정규화 후 중복 거부 | `[경계] normalizeTag…NFD→NFC` + `[예외] validateTag…NFD 중복`                          |
| 6   | `React, Vue` → 쉼표 분리 안 함, 하나의 태그로 저장      | `[경계] normalizeTag…쉼표 보존` + `[예외] addTag…쉼표 하나의 태그`                     |
| 7   | 정규화·엣지케이스 `it.each` 단위 테스트 통과            | 위 `normalizeTag` 정상·경계 시나리오 전체(spec §5.2·§6.2 표를 `it.each`로 이관)        |

**모든 AC(7개)가 최소 1개 시나리오로 커버됨.**

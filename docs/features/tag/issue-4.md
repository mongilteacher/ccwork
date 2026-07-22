# Issue #4 — TAG-4: 입력 검증과 인라인 안내

> 출처: GitHub 이슈 #4(`mongilteacher/ccwork`) · `docs/features/tag/prd.md` ADR-3·ADR-4 · `spec-fixed.md` §5·§6 · 코드베이스
> 슬라이스 성격: **추가 시점 검증 도입** — 우선순위(빈 값 → 길이 → 개수 → 중복) 중 첫 규칙만 적용, 실패를 입력 필드 아래 인라인 한 줄로 노출
> 선행: TAG-2 · 관통 계층: domain · hook · component · 관련 US: US-5·7
> 작업 브랜치: `feature/tag-4-validation`

## 확정 시그니처

> GATE-1 승인: **이슈 본문 채택** — PRD ADR-3의 `addTag→{tags,error}` 스케치 대신, 별도 순수 함수 `validateTag`를 도메인에 두고 `addTag`(→ `string[]`)는 유지한다. 이유: 이미 머지된 TAG-2/TAG-3의 `addTag` 테스트를 깨지 않고, "도메인은 에러 코드만 반환, 훅이 오케스트레이션"(ADR-3) 규약을 지킨다.

```ts
// ── src/domain/tag.ts — 검증 규칙 추가 (순수, React·fetch·DOM 무의존) ──────────
export const MAX_TAG_LENGTH = 20; // 태그 1개 최대 글자 수
export const MAX_TAG_COUNT = 10; // 노트 1개 최대 태그 수

export type TagError = 'duplicate' | 'tooLong' | 'tooMany';

export function validateTag(value: string, tags: string[]): TagError | null;
//  spec §5.3 우선순위대로 "첫 번째로 걸린 것 하나만" 반환:
//    1. 빈 값(trim 후 '')      → null   (조용히 무시, 에러 아님)
//    2. [...value].length > 20  → 'tooLong'
//    3. tags.length >= 10       → 'tooMany'
//    4. 대소문자 무시 중복 존재 → 'duplicate'
//    통과 → null
//  · TAG-4 정규화는 trim까지만(개행치환·NFC 전체 파이프라인은 이후 슬라이스).
//  · 길이는 [...value].length(코드 포인트) — 이모지가 부당하게 거부되지 않음.
//  · 한국어 문구는 반환하지 않는다(UI가 매핑, ADR-3).

// ── src/domain/tag.ts — addTag는 변경 없음 ────────────────────────────────────
export function addTag(tags: string[], raw: string): string[]; // TAG-2 그대로(trim+빈값무시+append)
//  검증은 훅이 addTag 이전에 validateTag로 수행. addTag 반환형 유지 → 기존 테스트 불변.

// ── src/hooks/useTagInput.ts — error state 추가 ───────────────────────────────
export function useTagInput(
  tags: string[],
  onChange: (tags: string[]) => void,
): {
  value: string;
  error: TagError | null; // ← 추가
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // ← onChange 시 setError(null)
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void; // ← validateTag 검사 후 분기
  handleRemove: (tag: string) => void; // 변경 없음(TAG-3)
};
//  handleKeyDown(Enter): const err = validateTag(value, tags);
//    err면 setError(err) 후 return(추가 안 함) / null이면 addTag→onChange→setValue('')→setError(null)
//  handleChange: setValue(...) + setError(null)  (입력값 바뀌면 메시지 즉시 소멸, 타이머 금지)

// ── src/components/TagInput.tsx — Props 불변, 내부에 문구 매핑·disabled 추가 ─────
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void; // 변경 없음
}
//  UI 계층 책임(ADR-3·ADR-4):
//   · TagError → 한국어 문구 매핑 상수(도메인엔 없음):
//       tooLong   → '태그는 20자까지 입력할 수 있습니다'
//       tooMany   → '태그는 최대 10개까지 추가할 수 있습니다'
//       duplicate → '이미 추가된 태그입니다'
//   · error가 있으면 입력 필드 바로 아래 <p className="text-destructive text-xs"> 한 줄
//   · tags.length >= MAX_TAG_COUNT 이면 input `disabled` + placeholder '태그는 최대 10개입니다'

// ── src/context/NotesContext.tsx · NoteEditor.tsx · src/api/notes.ts — 변경 없음 ──
//  검증은 TagInput/훅 내부에서 끝난다. 저장 배관은 TAG-2 그대로.
```

### 에러 케이스

- `validateTag` — **throw 없음.** 검증 실패를 `TagError` 코드로 반환한다(도메인은 사용자 문구를 모른다).
  - 정규화(trim) 후 빈 값이면 `null` — 조용히 무시(에러 아님). 공백만(`"   "`) 입력도 여기에 걸린다.
  - 여러 규칙 동시 위반 시 우선순위상 **첫 규칙 하나만** 반환한다(예: 21자 + 중복 → `'tooLong'`).
- `useTagInput` — 검증 실패를 `error` state에 담고 **추가하지 않는다.** `throw`·`alert`·`confirm` 없음.
  - 입력값이 바뀌는 순간(`handleChange`) `error`를 `null`로 지운다. **타이머로 자동 제거하지 않는다.**
- `TagInput` — `TagError` → 한국어 문구 매핑은 UI 계층 책임. `alert()`·`confirm()` 미사용(CLAUDE.md 에러 규약).

### 설계 메모

- `addTag`와 `validateTag`는 **각각 trim한다.** 중복 책임처럼 보이나 둘 다 순수·독립 테스트 가능하고, 저장값(addTag)과 검증 기준(validateTag)이 같은 trim 규칙을 쓰므로 결과가 어긋나지 않는다.
- **빈 값과 통과는 훅에서 addTag로 구분한다.** `validateTag`는 빈 값·통과 모두 `null`을 반환하므로, 훅은 `validateTag`가 `null`일 때 `addTag`를 호출하고 그 반환이 원본과 같으면(`next === tags`) 빈 값으로 보고 조용히 넘긴다. 에러 state는 `tooLong`/`tooMany`/`duplicate`에만 설정된다.
- **개수 초과는 두 겹으로 막는다.** `validateTag`의 `tooMany`(10개일 때 Enter)와 `TagInput`의 input `disabled`(`tags.length >= MAX_TAG_COUNT`). disabled가 1차 차단, `tooMany`는 disabled를 우회한 경로의 안전망이다.
- `NoteEditor`·`NotesContext`·`api/notes.ts`는 변경 없음 — 검증이 훅/컴포넌트 안에서 끝난다.

## 테스트 시나리오

> 형식: `[정상|경계|예외] 대상 — should [기대동작] when [조건]`
> 1순위 대상은 **도메인 함수 `validateTag`**(jsdom 불필요, spec §5.3·§6.2 표를 `it.each`로 이관). 훅·컴포넌트가 뒤따른다.

> ✅ = tdd-green으로 통과 확인 (2026-07-21) · 68/68 통과 (TAG-4 신규 24개: 도메인 17·훅 3·컴포넌트 4 + 부정 단언 2)

### 정상

- [x] `[정상] validateTag — should null을 반환한다 when 정규화 후 처음 보는 유효한 태그다` (`validateTag('React', [])` → null)
- [x] `[정상] validateTag — should null을 반환한다 when 앞뒤 공백을 뺀 값이 유효하다` (`'  React  '`)
- [x] `[정상] validateTag — should null을 반환한다 when 내부 공백을 포함한 한 태그다` (`'React Query'`)
- [x] `[정상] validateTag — should null을 반환한다 when 특수문자를 포함한다` (`'C++'`, `'#React'`, `'React, Vue'`)
- [x] `[정상] useTagInput — should error가 null이고 onChange로 추가된다 when 유효한 값에서 Enter를 누른다`
- [x] `[정상] TagInput — should 안내 메시지를 렌더하지 않는다 when error가 없다` (부정 단언 — Red에서도 통과, 회귀 가드)

### 경계

- [x] `[경계] validateTag — should null을 반환한다 when 정확히 20자다` (상한 경계, `[...value].length === 20`)
- [x] `[경계] validateTag — should 'tooLong'을 반환한다 when 21자다` (상한 초과, AC2)
- [x] `[경계] validateTag — should 'tooLong'이 아니다 when 이모지 포함 태그를 [...value].length로 센다` (코드 포인트 기준, AC3)
- [x] `[경계] validateTag — should null을 반환한다 when tags가 9개이고 새 값을 넣는다` (개수 하한 경계)
- [x] `[경계] validateTag — should 'tooMany'를 반환한다 when tags가 정확히 10개다` (개수 상한, AC4 근거)
- [x] `[경계] useTagInput — should 입력값을 바꾸면 error가 즉시 null이 된다 when handleChange가 호출된다` (타이머 아님, AC7)
- [x] `[경계] TagInput — should input이 disabled되고 placeholder가 바뀐다 when tags가 10개다` (AC4)
- [x] `[경계] TagInput — should 칩을 하나 삭제하면 input이 다시 활성화된다 when 10개에서 9개가 된다` (AC5)

### 예외

- [x] `[예외] validateTag — should 'duplicate'를 반환한다 when 대소문자만 다른 태그가 이미 있다` (`validateTag('react', ['React'])`, AC1)
- [x] `[예외] validateTag — should null을 반환한다 when 정규화 후 빈 문자열이다` (`''`, 조용히 무시)
- [x] `[예외] validateTag — should null을 반환한다 when 공백만 있다` (`'   '`, trim 후 빈 값 → 무시)
- [x] `[예외] validateTag — should 'tooLong'을 반환한다 when 21자이면서 동시에 중복이다` (우선순위상 첫 규칙만, AC6)
- [x] `[예외] validateTag — should 'tooMany'를 반환한다 when 10개이면서 동시에 중복이다` (우선순위상 개수가 먼저, AC6)
- [x] `[예외] useTagInput — should error를 설정하고 onChange를 호출하지 않는다 when 중복 값에서 Enter를 누른다` (추가 차단, AC1)
- [x] `[예외] TagInput — should '이미 추가된 태그입니다'를 렌더한다 when duplicate로 추가가 거부된다` (문구 매핑, AC1)
- [x] `[예외] TagInput — should '태그는 20자까지 입력할 수 있습니다'를 렌더한다 when tooLong으로 거부된다` (문구 매핑, AC2)
- [x] `[예외] TagInput — should alert()·confirm()을 호출하지 않는다 when 검증에 실패한다` (AC8, 부정 단언 — 회귀 가드)

> 참고 — 런타임 단위 테스트로 만들지 않는 것:
>
> - `it.each` 테이블(AC9)은 위 `validateTag` 시나리오들을 spec §5.3·§6.2 표 그대로 `it.each`로 옮겨 충족한다(별도 항목 아님, 구현 방식 지정).
> - 인라인 메시지의 시각적 위치·스타일(`text-destructive text-xs`)은 design-system PostToolUse ratchet 훅이 커버한다.

## AC 커버리지

| #   | Acceptance Criteria (이슈 #4)                                   | 커버 시나리오                                                                                                             |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | `React` 칩에 `react` 추가 → 거부 + `이미 추가된 태그입니다`     | `[예외] validateTag…대소문자만 다른 중복` + `[예외] useTagInput…중복이면 차단` + `[예외] TagInput…이미 추가된 태그입니다` |
| 2   | 21자 태그 → 거부 + `태그는 20자까지 입력할 수 있습니다`         | `[경계] validateTag…21자 tooLong` + `[예외] TagInput…20자까지…` 문구                                                      |
| 3   | 이모지 포함 태그 → `[...value].length` 기준이라 부당 거부 안 됨 | `[경계] validateTag…이모지 [...value].length`                                                                             |
| 4   | 태그 10개 → input `disabled` + placeholder 안내 문구로 교체     | `[경계] TagInput…10개면 disabled + placeholder` + `[경계] validateTag…10개 tooMany`                                       |
| 5   | 10개로 막힌 상태에서 칩 삭제 → input 다시 활성화                | `[경계] TagInput…9개가 되면 다시 활성화`                                                                                  |
| 6   | 여러 규칙 동시 위반 → 우선순위 첫 규칙 메시지 하나만            | `[예외] validateTag…21자+중복→tooLong` + `[예외] validateTag…10개+중복→tooMany`                                           |
| 7   | 메시지 표시 중 입력값 수정 → 즉시 사라짐(타이머 아님)           | `[경계] useTagInput…handleChange 시 error null`                                                                           |
| 8   | 검증 실패 시 `alert()`·`confirm()` 미사용                       | `[예외] TagInput…alert/confirm 미호출`                                                                                    |
| 9   | 검증 규칙 `it.each` 단위 테스트 통과                            | 위 `validateTag` 정상·경계·예외 시나리오 전체(spec §5.3·§6.2 표를 `it.each`로 이관)                                       |

**모든 AC(9개)가 최소 1개 시나리오로 커버됨.**

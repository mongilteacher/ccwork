---
name: test-scenarios
description: 하나의 GitHub 이슈를 대상으로 "시그니처 확정 → 테스트 시나리오 도출"을 순서대로 처리한다. `/test-scenarios {이슈번호}`로 실행한다. 이슈의 함수 시그니처·에러 케이스·컴포넌트 Props 타입을 먼저 확정하고, 그걸 기반으로 정상/경계/예외 테스트 시나리오를 뽑아 `docs/features/tag/issue-{N}.md`에 기록한 뒤 GitHub AC와 대조한다. "테스트 시나리오", "시그니처 확정", "test scenario", "이슈 시나리오 도출", "AC 커버리지", "/test-scenarios" 관련 요청이면 명시적으로 '스킬'을 언급하지 않아도 반드시 사용한다. 구현 코드도 테스트 코드도 작성하지 않는다(그건 이후 TDD 단계). 두 번의 승인 게이트에서 반드시 멈춘다.
---

# 이슈 단위 테스트 시나리오 도출

하나의 GitHub 이슈를 **"시그니처 확정 → 테스트 시나리오 도출"** 순서로 처리한다. 산출물은 시나리오까지이며, **여기서 나온 시나리오를 씨앗으로 다음 단계에서 TDD(Red→Green→Refactor)로 테스트 코드를 구현**한다.

- **입력**: 이슈 번호 `$ARGUMENTS` (예: `/test-scenarios 1`)
- **산출물**: `docs/features/tag/issue-{N}.md` (상단=시그니처, 하단=시나리오)

## 이 스킬의 두 가지 금지선

이 스킬은 **설계와 시나리오까지만** 만든다. 아래 둘은 절대 하지 않는다 — 이 순서를 지켜야 TDD가 성립한다(시나리오가 있어야 실패하는 테스트를 먼저 쓸 수 있고, 시그니처가 있어야 컴파일되는 골격을 잡는다).

- ❌ **구현 코드를 작성하지 않는다.** 함수 본문·컴포넌트 렌더 로직을 채우지 않는다. 시그니처(선언)까지만.
- ❌ **테스트 코드를 작성하지 않는다.** `it(...)`·`expect(...)`를 쓰지 않는다. 자연어 시나리오까지만.

## 승인 게이트

이 스킬에는 **멈춰야 할 지점이 두 곳** 있다. 게이트에서 산출물을 개발자에게 보여주고 **명시적 승인을 받기 전까지 다음 단계로 넘어가지 않는다.**

| 게이트 | 위치     | 확인 내용                   |
| ------ | -------- | --------------------------- |
| GATE-1 | 2단계 후 | 확정한 시그니처가 맞는가    |
| GATE-2 | 7단계 후 | 시나리오가 AC를 모두 덮는가 |

승인 없이 3~5단계(파일 기록·시나리오 도출)로 달리면 이 스킬을 잘못 실행한 것이다.

---

## 실행 순서

### GitHub 저장소 주의

이 프로젝트에서 태그 이슈는 fork(`mongilteacher/ccwork`)에 있는데, `gh`는 기본값이 upstream(`frongt/ccwork`)이라 그냥 `gh issue view N`을 하면 **다른 저장소의 엉뚱한 이슈**를 읽을 수 있다. 이슈가 어느 저장소에 있는지 먼저 확인하고, 필요하면 `--repo <owner>/<repo>`를 붙인다:

```bash
gh issue view $ARGUMENTS --repo mongilteacher/ccwork
```

### 1단계 — 시그니처 확정

아래 세 소스를 **모두** 참고해 이슈가 요구하는 시그니처를 확정한다:

1. **GitHub 이슈 내용** — `gh issue view $ARGUMENTS --repo <repo>` (설명 + AC)
2. **`docs/features/tag/prd.md`** — ADR로 확정된 데이터 구조·계층 책임·타입 결정
3. **코드베이스** — 확장할 실제 파일(`src/api/notes.ts`, `src/context/NotesContext.tsx`, `src/components/*`, `src/domain/*`)

확정할 것:

- **함수 시그니처** — 이름, 파라미터 타입, 반환 타입
- **에러 케이스** — 어떤 상황에서 무엇을(throw인지 에러 코드 반환인지) 내는지
- **컴포넌트 Props 타입** — `interface XxxProps`

**구현 코드는 절대 작성하지 않는다.** 선언·타입까지만이다.

#### 기존 패턴을 따른다 (이 프로젝트의 규약)

시그니처는 코드베이스의 기존 관습과 일관되어야 한다. `CLAUDE.md`가 정본이며, 요지는:

- **api 계층** — `export async function verbNoun(...): Promise<T>` (화살표 함수 금지). 실패는 `throw new Error('Failed to <동사> <명사>')`. 입력 타입은 `Omit<Note, 'id' | 'createdAt' | 'updatedAt'>`처럼 `Note`에서 파생. 부분 수정은 `PATCH + Partial<Note>`.
- **도메인 계층**(`src/domain/*`) — React·fetch·DOM 무의존 순수 함수. **검증 실패는 throw가 아니라 에러 코드로 반환**한다(예: `validateTag(...): TagError | null`, `TagError = 'duplicate' | 'tooLong' | 'tooMany'`). 사용자 문구는 UI가 매핑한다.
- **Context** — mutation 이름은 api 함수와 동일. Context 값 타입은 `XxxContextType`.
- **컴포넌트** — `interface XxxProps`를 컴포넌트 바로 위에. 데이터는 `useNotes()`로 당겨오고 props로는 선택 상태·콜백만. 콜백 prop은 `on` + 동사, 구현체는 `handle` + 동사.

확신이 안 서는 지점은 추측하지 말고 해당 파일을 직접 읽어 맞춘다.

### 2단계 — 시그니처 승인 (GATE-1)

확정한 시그니처를 개발자에게 **코드 블록으로** 보여주고 검토받는다. 타입·에러 처리 방식(throw vs 코드 반환)·Props 형태가 기존 패턴과 맞는지 함께 짚는다.

```
[GATE-1] 개발자가 시그니처를 승인할 때까지 대기
```

승인 전까지 파일에 쓰지 않는다.

### 3단계 — 시그니처를 파일 상단에 기록

승인된 시그니처를 `docs/features/tag/issue-{N}.md`의 **상단**에 기록한다(파일이 없으면 생성). 예:

```markdown
# Issue #{N} — {이슈 제목}

## 확정 시그니처

\`\`\`ts
// src/domain/tag.ts
export type TagError = 'duplicate' | 'tooLong' | 'tooMany';
export function validateTag(value: string, tags: string[]): TagError | null;

// src/components/TagInput.tsx
interface TagInputProps {
tags: string[];
onChange: (tags: string[]) => void;
}
\`\`\`

### 에러 케이스

- `validateTag` — 정규화 후 빈 값이면 `null`(조용히 무시), ...
```

### 4단계 — 테스트 시나리오 도출

확정된 시그니처를 기반으로 시나리오를 뽑는다. **테스트 코드는 쓰지 않는다** — 자연어 문장이다.

- 각 시나리오를 **정상 / 경계 / 예외**로 분류한다.
  - **정상** — 기대되는 입력에 기대되는 동작
  - **경계** — 상한·하한·빈 값·최대 개수 등 경계값
  - **예외** — 잘못된 입력·에러를 유발하는 조건
- **형식(고정):**

```
[정상|경계|예외] 함수명 — should [기대동작] when [조건]
```

예:

```
[정상] validateTag — should return null when 정규화 후 처음 보는 태그다
[경계] validateTag — should return 'tooLong' when 정규화 값이 20자를 초과한다
[예외] validateTag — should return 'duplicate' when 대소문자만 다른 태그가 이미 있다
```

경계·예외를 빠뜨리지 않는다. 시그니처의 에러 케이스 하나하나가 최소 한 개의 예외 시나리오가 된다.

### 5단계 — 시나리오를 파일 하단에 추가

도출한 시나리오를 `docs/features/tag/issue-{N}.md`의 **하단**에 `## 테스트 시나리오` 섹션으로 추가한다. 정상/경계/예외로 묶어 나열한다.

### 6단계 — AC와 대조 (커버리지 확인)

이슈의 Acceptance Criteria를 다시 읽고 시나리오와 대조한다:

```bash
gh issue view $ARGUMENTS --repo <repo>
```

- AC 목록을 뽑아 **각 AC가 최소 1개 이상의 시나리오로 덮이는지** 표로 확인한다.
- 덮이지 않은 AC가 있으면 그 AC를 커버하는 시나리오를 4단계 형식으로 **추가**한다.
- 모든 AC가 커버될 때까지 반복한다. 커버리지 표를 파일에 함께 남기면 좋다.

### 7단계 — 시나리오 승인 (GATE-2)

최종 시나리오와 AC 커버리지 표를 개발자에게 보여주고 검토받는다.

```
[GATE-2] 개발자가 시나리오를 승인할 때까지 대기 (승인 전까지 종료하지 말 것)
```

승인되면 이 이슈의 시나리오 도출은 끝난다. 다음은 TDD 단계에서 이 시나리오로 실패하는 테스트를 먼저 작성한다.

---

## 산출물 최종 형태

`docs/features/tag/issue-{N}.md` 한 파일:

```
# Issue #{N} — {제목}
## 확정 시그니처        ← 3단계 (상단)
### 에러 케이스
## 테스트 시나리오       ← 5·6단계 (하단)
### 정상 / 경계 / 예외
### AC 커버리지 표
```

## 다른 기능에 쓸 때

경로의 `tag`는 현재 태그 기능 기준이다. 다른 기능의 이슈를 처리하면 `docs/features/{그 기능}/issue-{N}.md`로 바꾼다.

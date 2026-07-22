---
name: tdd-red
description: TDD의 Red 단계 — 승인된 테스트 시나리오를 "실패하는 테스트 코드"로 옮긴다. `/tdd-red {이슈번호}`로 실행한다. `docs/features/{기능}/issue-{N}.md`의 시나리오·시그니처를 읽어 Vitest + React Testing Library 테스트를 한 개씩 작성하고, 매번 실행해 **실패를 확인한 뒤** 다음으로 넘어간다. "실패하는 테스트", "TDD red", "레드 단계", "테스트 코드 작성", "시나리오를 테스트로", "/tdd-red" 관련 요청이면 명시적으로 '스킬'을 언급하지 않아도 반드시 사용한다. **테스트 파일만 생성/수정하며 `src/`의 구현 코드는 절대 건드리지 않는다** — 통과는 다음 Green 단계의 몫이다.
---

# TDD Red — 실패하는 테스트 작성

승인된 테스트 시나리오를 **실패하는 테스트 코드**로 옮긴다. 이 단계의 목표는 "통과"가 아니라 **"올바른 이유로 실패하는 테스트"**를 갖추는 것이다. 통과시키는 구현은 다음 **Green** 단계에서 한다.

- **입력**: 이슈 번호 `$ARGUMENTS` (예: `/tdd-red 1`)
- **읽을 것**: `docs/features/{기능}/issue-{N}.md` (상단 시그니처 + 하단 시나리오)
- **산출물**: 테스트 파일들(`*.test.ts` / `*.test.tsx`)

## `{기능}` 디렉터리 찾기

문서 경로의 `{기능}`은 고정값이 아니다. 이슈 번호에서 다음 순서로 해석한다 — **추측해서 쓰면 다음 단계가 그 파일을 못 찾는다.**

1. `ls docs/features/*/issue-{N}.md` — 이미 있으면 그 디렉터리다(이어서 하는 단계는 거의 여기서 끝난다).
2. 없으면 현재 브랜치에서 유추한다. `feature/tag-filter` → `docs/features/tag-filter/`.
3. 그래도 못 찾으면 `grep -l "#{N}" docs/features/*/issue.md` 로 이슈 분해 문서에서 역추적한다.
4. 끝내 확정되지 않으면 **사용자에게 묻는다.** 새 디렉터리를 임의로 만들지 않는다.

## 절대 규칙

- ✅ **테스트 파일만 생성/수정한다.**
- ❌ **`src/`의 구현 코드는 절대 만들지도 수정하지도 않는다.** 스켈레톤·빈 함수·타입 파일도 만들지 않는다.

왜 중요한가: Red 단계에서 구현이 없어 테스트가 실패하는 것이 **정상이자 목표**다. 지금 `src/`를 건드려 실패를 없애면 Red가 성립하지 않고, Green 단계가 검증할 대상이 사라진다. 구현 부재로 인한 실패(모듈 없음, 함수 정의 안 됨)는 **올바른 Red**다.

## "올바른 이유로 실패"란

- ✅ **올바른 Red** — `src/components/TagInput.tsx`가 없어서 import가 실패하거나, 함수가 아직 정의되지 않아 `expect`가 어긋난다. 즉 **구현이 없어서** 실패한다.
- ❌ **가짜 Red** — 테스트 자체의 버그(import 경로 오타, 문법 오류, 잘못된 matcher)로 실패한다. 이건 고쳐야 할 **테스트의 결함**이다.

실패를 확인할 때 **에러 메시지를 읽고 그 실패가 "구현 부재" 때문인지** 판단한다. 테스트 결함이면 테스트를 고친다 — `src/`가 아니라. 아직 구현이 하나도 없으면 "모듈을 찾을 수 없음"으로 파일 전체가 한꺼번에 실패할 수 있는데, 이 역시 정상적인 Red다(Green 단계에서 모듈이 생기면 개별 테스트로 갈라진다).

---

## 실행 순서

### 1단계 — 시나리오·시그니처 읽기

`docs/features/{기능}/issue-{N}.md`를 읽는다. 상단 **확정 시그니처**로 import 대상·타입·함수 형태를 파악하고, 하단 **테스트 시나리오**(정상/경계/예외)를 테스트로 옮길 목록으로 삼는다. 시나리오 문장의 `should [기대동작] when [조건]` 부분이 그대로 `it(...)` 이름이 된다(앞의 `[정상|경계|예외]` 분류 라벨은 이름에 넣지 않고 그룹/주석으로 쓴다).

### 2단계 — 시나리오를 하나씩 테스트로 작성

시나리오 하나 = `it(...)` 하나. 한 번에 전부 쏟아내지 말고 **하나 쓰고 실행**하는 리듬을 지킨다(3단계).

- **테스트 이름**: `should [기대 동작] when [조건]` (시나리오 문장 그대로)
- **도구**: **Vitest + React Testing Library**
- **`describe` 블록**: 함수/컴포넌트 단위로 묶는다.

```ts
describe('TagInput', () => {
  it('should tags 각 원소를 칩으로 렌더한다 when tags가 ["React","공부"]다', () => {
    // Arrange → Act → Assert
  });
});
```

### 3단계 — 작성 즉시 실행 → 실패 확인 → 다음

방금 쓴 테스트 파일 하나만 실행한다:

```bash
npx vitest run <테스트파일경로>
```

실패를 확인하고(위 "올바른 이유로 실패" 기준으로 판단), 실패가 맞으면 다음 시나리오로 넘어간다. **가짜 Red면 테스트를 고친 뒤** 넘어간다.

### 4단계 — 전체 실행 → 모두 실패 확인

모든 시나리오를 옮긴 뒤 전체를 돌린다:

```bash
npm test
```

이 이슈에서 새로 쓴 테스트가 **전부 실패(또는 구현 부재로 에러)** 하는지 확인한다. 통과하는 테스트가 있으면 둘 중 하나다 — 시나리오가 이미 충족돼 있거나(그럴 리 없으면 테스트가 실제 대상을 검증하지 않는 것), 테스트가 너무 느슨한 것. 개발자에게 보고한다.

완료 후 개발자에게 **작성한 테스트 파일 목록 + 실패 요약(무엇이 왜 실패하는지)**을 보고한다.

---

## 테스트 파일 컨벤션

- **위치**: 테스트 대상 파일과 **같은 디렉터리**(co-location)
  - `src/api/tags.ts` → `src/api/tags.test.ts`
  - `src/components/TagInput.tsx` → `src/components/TagInput.test.tsx`
  - `src/domain/tag.ts` → `src/domain/tag.test.ts`
- **네이밍**: `{파일명}.test.ts` / `{파일명}.test.tsx` (JSX를 렌더하면 `.tsx`)
- **`describe`**: 함수/컴포넌트 단위로 묶는다. 한 파일에 대상이 여럿이면 `describe`도 여럿.

## 이 프로젝트의 테스트 환경 (설정 완료됨)

`vite.config.ts`에 이미 잡혀 있어 추가 설정이 필요 없다:

- `globals: true` — `describe`/`it`/`expect`를 **import 없이** 쓴다. (`expectTypeOf` 등도 전역)
- `environment: 'jsdom'` — DOM이 있으므로 RTL `render`/`screen`이 동작한다.
- `setupFiles: './src/test-setup.ts'` — `@testing-library/jest-dom` 매처(`toBeInTheDocument` 등)가 로드돼 있다.
- 사용 가능한 패키지: `@testing-library/react`(`render`, `screen`), `@testing-library/user-event`(`userEvent`).

컴포넌트 테스트 골격:

```tsx
import { render, screen } from '@testing-library/react';

describe('TagInput', () => {
  it('should …', () => {
    render(<TagInput tags={['React', '공부']} />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });
});
```

## 런타임 테스트로 안 떨어지는 시나리오

시나리오 중 일부는 Vitest `it()`로 표현하기 어렵다. 유형별로 이렇게 처리한다:

- **타입 전용** (예: "Note가 tags를 필수 필드로 갖는다") — 런타임 값이 아니라 타입 계약이다. `expectTypeOf<T>()...` 또는 `// @ts-expect-error`로 표현한다. 예: 필수 필드 위반이 컴파일 에러여야 한다면 `@ts-expect-error`를 단 줄이 **에러가 나야** 통과. (단, `npm test`는 esbuild라 타입체크를 안 하므로, 순수 타입 단언은 `expectTypeOf`처럼 Vitest가 실행하는 형태로 쓴다.)
- **정책/훅 검사** (예: "design-system 훅을 통과한다", "lint 통과") — 이건 Vitest 범위 밖이고 PostToolUse 훅·`npm run lint`가 담당한다. **테스트로 만들지 말고**, 해당 시나리오 옆에 "훅/lint가 커버 — 런타임 테스트 아님"으로 남기고 건너뛴다. 건너뛴 항목을 4단계 보고에 명시한다.
- **데이터 시드** (예: "db.json 노트 3건이 tags를 갖는다") — `db.json`을 import해 값을 assert할 수 있다. 런타임 테스트로 작성한다.

무엇을 런타임 테스트로 만들고 무엇을 건너뛰었는지 개발자에게 투명하게 보고한다 — 조용히 빠뜨리면 커버리지 착시가 생긴다.

## 다른 기능에 쓸 때

경로의 `tag`는 현재 태그 기능 기준이다. 다른 기능이면 `docs/features/{그 기능}/issue-{N}.md`로 바꾼다.

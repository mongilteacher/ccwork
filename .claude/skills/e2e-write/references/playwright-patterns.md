# Playwright 패턴 — 로케이터·단언·독립성

spec을 쓸 때 따르는 구체 패턴. 원칙은 하나다: **사용자가 화면에서 보고 하는 것만 테스트하고, 내부 구현(DOM 구조·CSS 클래스·컴포넌트 state)에는 의존하지 않는다.**

## 로케이터 — 사용자 관점으로만

| 쓴다                                    | 안 쓴다                        | 이유                                                 |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `getByRole('button', { name: '저장' })` | `locator('.save-btn')`         | 사용자는 "저장 버튼"을 보지 CSS 클래스를 보지 않는다 |
| `getByPlaceholder('태그 추가')`         | `locator('input[type=text]')`  | placeholder는 사용자가 읽는 실제 안내 문구           |
| `getByText('이미 추가된 태그입니다')`   | `locator('.text-destructive')` | 검증 문구는 사용자가 읽는 것                         |
| `getByPlaceholder('제목')`              | `locator('#title')`            | 실제 UI 문구로 조준(이 앱은 `<label>`이 없다)        |

- **문구·역할은 반드시 실제 `src/`에서 확인한다.** 위 값들은 이 앱의 실제 구현(`NoteEditor.tsx`·`TagInput.tsx`)에서 뽑았다. 예: 제목은 `<label>`이 없어 `getByLabel`이 아니라 **`getByPlaceholder('제목')`**, 태그 입력은 `태그 입력`이 아니라 **`태그 추가`**. 예제 값을 그대로 믿지 말고 대상 컴포넌트를 열어 맞춘다.
- `data-testid`는 **최후의 수단**이다. 접근 가능한 이름·역할·텍스트로 못 잡을 때만, 그리고 그건 대개 `src/`에 접근성 속성이 빠졌다는 신호다(이 스킬은 `src/`를 안 고치므로 보고만 한다).

### 칩(chip) 조준 — `getByText(짧은 단어)`를 쓰지 않는다

칩 존재 확인에 `getByText('react')` 같은 **짧은 단어 텍스트 매칭은 깨진다.** `getByText`는 기본이 대소문자 무시 **부분 매칭**이라, 노트 본문("**React**와 TypeScript를…")이나 다른 칩과 함께 여러 요소에 걸려 **strict mode 위반**으로 실패한다(실행으로 확인된 실패다).

칩은 **`aria-label="{tag} 삭제"`를 가진 삭제 버튼**으로 조준한다 — 정확한 접근성 이름이라 유일하다:

```ts
import type { Page } from '@playwright/test';

// 칩 하나를 그 삭제 버튼으로 정확히 조준한다. 존재/부재 단언 모두 이걸로.
const chip = (page: Page, tag: string) =>
  page.getByRole('button', { name: `${tag} 삭제`, exact: true });

await expect(chip(page, '업무')).toBeVisible(); // 칩이 있다
await expect(chip(page, '임시')).toBeHidden(); // 칩이 사라졌다
await chip(page, '임시').click(); // 칩을 × 로 삭제
```

`exact: true`로 부분 매칭 사고를 막는다. 목록 카드의 노트 삭제 버튼(이름 `삭제`)과도 겹치지 않는다.

## 단언 — 웹 우선(자동 재시도), sleep 금지

```ts
// ✅ 저장·리렌더가 끝날 때까지 자동으로 재시도(기본 5초)
await expect(page.getByText('업무')).toBeVisible();
await expect(input).toHaveValue('');

// ❌ 임의 대기 — 느리거나(넉넉히 잡으면) 깨진다(모자라면). 절대 쓰지 않는다
await page.waitForTimeout(1000);
```

- 비동기 저장 → 서버 반영 → 리렌더를 기다리는 유일한 방법은 **웹 우선 단언**이다. `expect`가 조건이 참이 될 때까지 폴링한다.
- 새로고침 후 영속성 확인: `await page.reload()` 다음에 다시 `expect(...).toBeVisible()`. reload 자체가 네트워크 재요청을 강제하므로 별도 대기 불필요.

## 테스트 독립성 — 자기 데이터를 스스로 만든다

mock json-server는 **모든 테스트가 공유하는 단일 상태**다. 게다가 `API_URL`이 3001로 하드코딩이라 워커별 포트 분리가 불가능해, **동시 실행하면 json-server `--watch` 리로드와 경쟁해 flaky해진다**(실행으로 확인). 그래서 이 프로젝트의 독립성은 세 가지로 세운다:

- **직렬 실행** — `playwright.config.ts`에 `workers: 1`(harness-setup §1). 단일 공유 백엔드에 동시 쓰기를 몰지 않는다.
- **자기 노트를 스스로 만들고, 고유 제목으로 자기 것만 조준** — 시드/타 테스트 노트에 의존하지 않는다.
- **종료 후 자동 정리** — 고유 제목 fixture(harness-setup §4)가 그 테스트가 만든 노트를 teardown에서 지운다. 잔여물이 쌓이지 않고, 실서버에 붙어도 자기 것만 지운다.
- **전역 개수를 단언하지 않는다** — `expect(notes).toHaveCount(4)`는 시드·재실행 잔여로 깨진다. 대신 "내 제목의 노트가 보인다"만 단언한다.

`uniqueTitle`은 파일 상단 헬퍼가 아니라 **fixture에서 주입**받는다(정리까지 묶으려고). spec은 `async ({ page, uniqueTitle }) => ...`로 받고, `test`/`expect`를 `./fixtures/test`에서 import한다.

## 주석 달린 예제 — 태그 영속성 여정 (US-3 중심, US-1/US-4를 여정에 흡수)

이 하나가 **단위 테스트가 증명 못 하는 것**을 증명한다: 실제 저장 → 서버 반영 → **새로고침 후에도 유지**. 정규화 규칙 20종·중복 판정 표는 여기서 반복하지 않는다 — 도메인 테스트의 몫이다. (아래는 실제로 통과시킨 spec이다.)

```ts
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test'; // 고유 제목 + 자동 정리 fixture

const chip = (page: Page, tag: string) =>
  page.getByRole('button', { name: `${tag} 삭제`, exact: true });

test.describe('태그 영속성', () => {
  test('새 노트에 태그를 넣어 저장하면 새로고침 후에도 유지된다', async ({ page, uniqueTitle }) => {
    const title = uniqueTitle('생성');
    await page.goto('/');

    // 새 노트 작성 (US-4: 생성 시점에 tags가 함께 저장된다)
    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByPlaceholder('제목').fill(title); // label 없음 → placeholder

    // 태그 입력 → Enter로 확정 (US-1: 확정되면 칩이 추가되고 입력 필드가 비워진다)
    const tagInput = page.getByPlaceholder('태그 추가');
    await tagInput.fill('업무');
    await tagInput.press('Enter');
    await expect(chip(page, '업무')).toBeVisible(); // 칩이 떴다(삭제 버튼으로 조준)
    await expect(tagInput).toHaveValue(''); // 필드가 비워졌다

    // 저장 — 여기서 처음으로 서버에 반영된다 (ADR-2). '저장 중...'과 겹치지 않게 exact
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 진짜 검증: 새로고침 = 서버에서 다시 읽기. 로컬 state가 아니라 영속성을 본다 (US-3)
    await page.reload();
    await page.getByText(title).click(); // 목록에서 내 노트를 다시 연다 (컴포넌트 횡단 여정)
    await expect(page.getByPlaceholder('제목')).toHaveValue(title);
    await expect(chip(page, '업무')).toBeVisible(); // 저장된 태그가 그대로 있다
  });
});
```

### 이 예제가 지키는 것

- **로케이터**: 전부 role/text/placeholder. 칩은 삭제 버튼 role. CSS·testid 없음.
- **단언**: 전부 `await expect(...)` 웹 우선. sleep 없음.
- **독립성**: fixture `uniqueTitle`로 자기 노트만 만들고 조준 + 종료 후 자동 정리. 전역 개수 단언 없음.
- **여정**: 생성(US-4) → 확정(US-1) → 저장 → **새로고침 → 재조회**(US-3). 한 여정이 세 스토리를 자연스럽게 흡수한다.
- **중복 금지**: '업무' 태그 하나로 배선을 증명할 뿐, 정규화·길이·개수 표를 반복하지 않는다.

## 검증 실패 여정 예제 — 대표 하나만 (US-5)

중복·길이·개수 규칙은 도메인/컴포넌트 테스트가 표로 덮는다. E2E는 **"검증 실패가 실제 화면에 안내로 뜬다"는 배선**만 대표 하나로 확인한다. 에러 문구는 유일한 텍스트라 `getByText`로 조준해도 안전하지만, **칩은 삭제 버튼 role로** 조준한다.

```ts
test('이미 있는 태그를 다시 넣으면 인라인 안내가 화면에 뜬다', async ({ page, uniqueTitle }) => {
  const title = uniqueTitle('중복');
  await page.goto('/');
  await page.getByRole('button', { name: '새 노트' }).click();
  await page.getByPlaceholder('제목').fill(title);

  const tagInput = page.getByPlaceholder('태그 추가');
  await tagInput.fill('react');
  await tagInput.press('Enter');
  await expect(chip(page, 'react')).toBeVisible(); // getByText('react')는 본문과 충돌 → 삭제 버튼 role

  // 같은 태그 재입력 → 거부 + 안내 (대소문자 무시 판정의 "표"는 도메인 테스트가 덮음)
  await tagInput.fill('React');
  await tagInput.press('Enter');
  await expect(page.getByText('이미 추가된 태그입니다')).toBeVisible();

  // 입력을 바꾸면 안내가 사라진다 (ADR-4의 소멸 시점)
  await tagInput.fill('vue');
  await expect(page.getByText('이미 추가된 태그입니다')).toBeHidden();
});
```

## E2E로 만들지 말 것

- **IME 조합(US-6)**: 브라우저 자동화로 `compositionstart`/`compositionend`를 신뢰성 있게 재현하기 어렵다. `isComposing` 가드는 `useTagInput` 단위 테스트가 정확히 덮는다 → E2E 스킵, 보고에 사유 명시.
- **정규화 20종 표(US-9), 길이·개수 경계 표(US-7)**: 도메인 테스트(`it.each`)의 몫. E2E는 대표 하나를 여정에 흡수하거나 생략.
- **순수 렌더·훅 동작(US-1·US-2의 세부)**: 컴포넌트 테스트가 덮는다. 여정 스텝으로만 지나가고 독립 테스트로 만들지 않는다.

## 셀렉터가 실제 UI와 안 맞을 때

이 예제의 `'새 노트'`·`'저장'`·`'태그 추가'` 같은 문구·역할은 **실제 `src/` 구현에서 확인**해야 한다. spec 쓰기 전에 대상 컴포넌트(`NoteEditor.tsx`·`TagInput.tsx` 등)를 읽어 실제 버튼 라벨·placeholder·`aria-label`·입력 방식을 맞춘다. 구현과 다른 문구로 쓰면 "구현 버그"가 아니라 "테스트 결함"으로 실패한다. (실제로 이 스킬 초안은 `getByLabel('제목')`·`태그 입력`으로 썼다가 실행에서 틀린 게 드러나 위 값으로 고쳤다.)

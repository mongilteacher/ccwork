# Playwright 패턴 — 로케이터·단언·독립성

spec을 쓸 때 따르는 구체 패턴. 원칙은 하나다: **사용자가 화면에서 보고 하는 것만 테스트하고, 내부 구현(DOM 구조·CSS 클래스·컴포넌트 state)에는 의존하지 않는다.**

## 로케이터 — 사용자 관점으로만

| 쓴다                                    | 안 쓴다                        | 이유                                                 |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `getByRole('button', { name: '저장' })` | `locator('.save-btn')`         | 사용자는 "저장 버튼"을 보지 CSS 클래스를 보지 않는다 |
| `getByPlaceholder('태그 입력')`         | `locator('input[type=text]')`  | placeholder는 사용자가 읽는 실제 안내 문구           |
| `getByText('이미 추가된 태그입니다')`   | `locator('.text-destructive')` | 검증 문구는 사용자가 읽는 것                         |
| `getByLabel('제목')`                    | `locator('#title')`            | 접근성 이름으로 조준                                 |

- `data-testid`는 **최후의 수단**이다. 접근 가능한 이름·역할·텍스트로 못 잡을 때만, 그리고 그건 대개 `src/`에 접근성 속성이 빠졌다는 신호다(이 스킬은 `src/`를 안 고치므로 보고만 한다).
- 칩의 삭제 `×`처럼 접근 이름이 모호하면 부모를 좁힌 뒤(`getByText('React').locator('..')`) 그 안에서 역할로 찾는다. 구조 의존을 최소화한다.

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

mock json-server는 **모든 테스트가 공유하는 단일 상태**다. 시드 노트나 다른 테스트가 만든 노트에 의존하면 병렬 실행·재실행에서 깨진다. 그래서:

- 각 테스트는 **자기 노트를 새로 만들고**, **고유한 제목**으로 자기 것만 조준한다.
- **전역 개수를 단언하지 않는다** — `expect(notes).toHaveCount(4)`는 다른 테스트가 노트를 추가하는 순간 깨진다. 대신 "내 제목의 노트가 보인다"만 단언한다.

고유 제목 헬퍼(파일 상단):

```ts
// 테스트마다 충돌하지 않는 제목. Date.now()로 충분하다
const uniqueTitle = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
```

## 주석 달린 예제 — 태그 영속성 여정 (US-3 중심, US-1/US-4를 여정에 흡수)

이 하나가 **단위 테스트가 증명 못 하는 것**을 증명한다: 실제 저장 → 서버 반영 → **새로고침 후에도 유지**. 정규화 규칙 20종·중복 판정 표는 여기서 반복하지 않는다 — 도메인 테스트의 몫이다.

```ts
import { test, expect } from '@playwright/test';

const uniqueTitle = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

test.describe('태그 영속성', () => {
  test('새 노트에 태그를 넣어 저장하면 새로고침 후에도 태그가 유지된다', async ({ page }) => {
    const title = uniqueTitle('E2E-태그');
    await page.goto('/');

    // 새 노트 작성 (US-4: 생성 시점에 tags가 함께 저장된다)
    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByLabel('제목').fill(title);

    // 태그 입력 → Enter로 확정 (US-1: 확정되면 칩이 추가되고 입력 필드가 비워진다)
    const tagInput = page.getByPlaceholder('태그 입력');
    await tagInput.fill('업무');
    await tagInput.press('Enter');
    await expect(page.getByText('업무')).toBeVisible(); // 칩이 떴다
    await expect(tagInput).toHaveValue(''); // 필드가 비워졌다

    // 저장 — 여기서 처음으로 서버에 반영된다 (ADR-2)
    await page.getByRole('button', { name: '저장' }).click();

    // 진짜 검증: 새로고침 = 서버에서 다시 읽기. 로컬 state가 아니라 영속성을 본다 (US-3)
    await page.reload();
    await page.getByText(title).click(); // 목록에서 내 노트를 다시 연다 (컴포넌트 횡단 여정)
    await expect(page.getByText('업무')).toBeVisible(); // 저장된 태그가 그대로 있다
  });
});
```

### 이 예제가 지키는 것

- **로케이터**: 전부 role/label/text/placeholder. CSS·testid 없음.
- **단언**: 전부 `await expect(...)` 웹 우선. sleep 없음.
- **독립성**: `uniqueTitle`로 자기 노트만 만들고 조준. 전역 개수 단언 없음.
- **여정**: 생성(US-4) → 확정(US-1) → 저장 → **새로고침 → 재조회**(US-3). 한 여정이 세 스토리를 자연스럽게 흡수한다.
- **중복 금지**: '업무' 태그 하나로 배선을 증명할 뿐, 정규화·길이·개수 표를 반복하지 않는다.

## 검증 실패 여정 예제 — 대표 하나만 (US-5)

중복·길이·개수 규칙은 도메인/컴포넌트 테스트가 표로 덮는다. E2E는 **"검증 실패가 실제 화면에 안내로 뜬다"는 배선**만 대표 하나로 확인한다.

```ts
test('이미 있는 태그를 다시 넣으면 인라인 안내가 화면에 뜬다', async ({ page }) => {
  const title = uniqueTitle('E2E-중복');
  await page.goto('/');
  await page.getByRole('button', { name: '새 노트' }).click();
  await page.getByLabel('제목').fill(title);

  const tagInput = page.getByPlaceholder('태그 입력');
  await tagInput.fill('react');
  await tagInput.press('Enter');
  await expect(page.getByText('react')).toBeVisible();

  // 같은 태그 재입력 → 거부 + 안내 (대소문자 무시 판정의 "표"는 도메인 테스트가 덮음)
  await tagInput.fill('React');
  await tagInput.press('Enter');
  await expect(page.getByText('이미 추가된 태그입니다')).toBeVisible();

  // 입력을 바꾸면 안내가 사라진다 (ADR-4의 소멸 시점)
  await tagInput.fill('vue');
  await expect(page.getByText('이미 추가된 태그입니다')).not.toBeVisible();
});
```

## E2E로 만들지 말 것

- **IME 조합(US-6)**: 브라우저 자동화로 `compositionstart`/`compositionend`를 신뢰성 있게 재현하기 어렵다. `isComposing` 가드는 `useTagInput` 단위 테스트가 정확히 덮는다 → E2E 스킵, 보고에 사유 명시.
- **정규화 20종 표(US-9), 길이·개수 경계 표(US-7)**: 도메인 테스트(`it.each`)의 몫. E2E는 대표 하나를 여정에 흡수하거나 생략.
- **순수 렌더·훅 동작(US-1·US-2의 세부)**: 컴포넌트 테스트가 덮는다. 여정 스텝으로만 지나가고 독립 테스트로 만들지 않는다.

## 셀렉터가 실제 UI와 안 맞을 때

이 예제의 `'새 노트'`·`'저장'`·`'태그 입력'` 같은 문구·역할은 **실제 `src/` 구현에서 확인**해야 한다. spec 쓰기 전에 대상 컴포넌트(`NoteEditor.tsx`·`TagInput.tsx` 등)를 읽어 실제 버튼 라벨·placeholder·입력 방식을 맞춘다. 구현과 다른 문구로 쓰면 "구현 버그"가 아니라 "테스트 결함"으로 실패한다.

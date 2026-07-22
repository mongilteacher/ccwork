// TF-3 (#14) — 필터에서 빠져나오는 경로 중 "실제 서버 왕복(또는 새로고침)이 있어야만 증명되는" 여정만 남긴다.
// 토글·정규화·완전 일치 같은 판정 규칙은 domain/tagFilter.test.ts와 컴포넌트 테스트가 이미 덮으므로 반복하지 않는다.
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';

// 사이드바 태그 칩 — 접근성 이름이 "{태그} {카운트}"다. 편집기 칩("{태그} 삭제")과 겹치지 않는다.
const sidebarChip = (page: Page, tag: string, count: number) =>
  page.getByRole('button', { name: `${tag} ${count}`, exact: true });

// 편집기 안의 태그 칩(× 역할) — 클릭하면 그 태그가 로컬에서 제거된다.
const editorChip = (page: Page, tag: string) =>
  page.getByRole('button', { name: `${tag} 삭제`, exact: true });

// 강조된 노트 카드 — TF-2에서 못 박은 접점
const highlighted = (page: Page) => page.locator('[data-highlighted="true"]');

// 태그 1개를 가진 노트를 만들어 저장한다(각 테스트가 자기 출발 상태를 스스로 마련한다).
async function createNote(page: Page, title: string, tag: string) {
  await page.getByRole('button', { name: '새 노트' }).click();
  await page.getByPlaceholder('제목').fill(title);
  const tagInput = page.getByPlaceholder('태그 추가');
  await tagInput.fill(tag);
  await tagInput.press('Enter');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();
}

test.describe('태그 필터 해제 E2E', () => {
  // AC 2·7 — 편집기 저장이 실제 PATCH로 나가 notes가 갱신되고, 그 결과가 사이드바 집계·강조까지 관통하는지.
  test('유일한 노트에서 태그를 지우고 저장하면 칩과 강조가 함께 사라진다', async ({
    page,
    uniqueTitle,
    uniqueTag,
  }) => {
    const title = uniqueTitle('제거');
    const tag = uniqueTag('rm');
    await page.goto('/');
    await createNote(page, title, tag);

    // 칩을 선택하면 그 태그를 가진 노트가 강조된다
    await sidebarChip(page, tag, 1).click();
    await expect(highlighted(page).filter({ hasText: title })).toBeVisible();

    // 노트를 열어 태그를 제거하고 저장 — 여기서 처음 서버로 나간다(ADR-2)
    await page.getByText(title).click();
    await editorChip(page, tag).click();
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 태그를 가진 노트가 0개가 되면 칩도, 강조도 남지 않는다
    await expect(sidebarChip(page, tag, 1)).toBeHidden();
    await expect(highlighted(page)).toHaveCount(0);
  });

  // AC 3·7 — 실제 DELETE 왕복 후 태그 목록이 다시 계산되는지.
  test('선택 태그를 가진 마지막 노트를 삭제하면 칩과 강조가 함께 사라진다', async ({
    page,
    uniqueTitle,
    uniqueTag,
  }) => {
    const title = uniqueTitle('삭제');
    const tag = uniqueTag('del');
    await page.goto('/');
    await createNote(page, title, tag);

    await sidebarChip(page, tag, 1).click();
    const card = highlighted(page).filter({ hasText: title });
    await expect(card).toBeVisible();

    // 카드 안의 삭제 버튼 — 실제 DELETE가 나간다
    await card.getByRole('button', { name: '삭제', exact: true }).click();

    await expect(page.getByText(title)).toBeHidden();
    await expect(sidebarChip(page, tag, 1)).toBeHidden();
    await expect(highlighted(page)).toHaveCount(0);
  });

  // AC 4·7 — 하나가 빠져도 선택은 유지되고 카운트만 줄어드는지, 서버 왕복 뒤에도 그런지.
  test('3개 중 1개에서 태그를 지우고 저장하면 카운트가 2로 줄고 선택은 유지된다', async ({
    page,
    uniqueTitle,
    uniqueTag,
  }) => {
    const tag = uniqueTag('cnt');
    const titles = [uniqueTitle('셋1'), uniqueTitle('셋2'), uniqueTitle('셋3')];
    await page.goto('/');
    for (const title of titles) {
      await createNote(page, title, tag);
    }

    await sidebarChip(page, tag, 3).click();
    await expect(highlighted(page)).toHaveCount(3);

    // 세 번째 노트에서만 태그를 제거하고 저장
    await page.getByText(titles[2]).click();
    await editorChip(page, tag).click();
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 칩 카운트는 2로 줄고, 선택은 그대로이며, 남은 2개만 강조된다
    const chip = sidebarChip(page, tag, 2);
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(highlighted(page)).toHaveCount(2);
    await expect(highlighted(page).filter({ hasText: titles[2] })).toHaveCount(0);
  });

  // AC 5 — 선택을 어디에도 저장하지 않는다(localStorage·URL 없음, PRD Out of Scope).
  // 재마운트로만 실제 증명되므로 E2E에만 남는다.
  test('태그를 선택한 뒤 새로고침하면 선택이 해제된 전체 보기로 시작한다', async ({
    page,
    uniqueTitle,
    uniqueTag,
  }) => {
    const title = uniqueTitle('새로고침');
    const tag = uniqueTag('rl');
    await page.goto('/');
    await createNote(page, title, tag);

    await sidebarChip(page, tag, 1).click();
    await expect(sidebarChip(page, tag, 1)).toHaveAttribute('aria-pressed', 'true');
    await expect(highlighted(page)).toHaveCount(1);

    await page.reload();

    // 칩은 그대로 있지만 아무것도 선택돼 있지 않다
    await expect(sidebarChip(page, tag, 1)).toHaveAttribute('aria-pressed', 'false');
    await expect(highlighted(page)).toHaveCount(0);
  });
});

// 고유 제목 + 테스트 종료 후 자기 노트 자동 정리(잔여물 방지)는 fixture가 담당한다.
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';

// 칩은 aria-label "{tag} 삭제"를 가진 삭제 버튼으로 조준한다.
// getByText(짧은 단어)는 노트 본문 등 다른 텍스트와 충돌(strict mode 위반)하므로 칩 확인에 쓰지 않는다.
const chip = (page: Page, tag: string) =>
  page.getByRole('button', { name: `${tag} 삭제`, exact: true });

test.describe('태그 E2E', () => {
  // US-4·1·3 — 생성 시점에 태그가 함께 저장되고, 새로고침(서버 재조회) 후에도 유지된다.
  // 단위 테스트가 못 보는 것: 실제 POST → json-server 반영 → reload 후 영속성.
  test('새 노트에 태그를 넣어 저장하면 새로고침 후에도 유지된다', async ({ page, uniqueTitle }) => {
    const title = uniqueTitle('생성');
    await page.goto('/');

    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByPlaceholder('제목').fill(title);

    // US-1: Enter로 확정하면 칩이 뜨고 입력 필드가 비워진다
    const tagInput = page.getByPlaceholder('태그 추가');
    await tagInput.fill('업무');
    await tagInput.press('Enter');
    await expect(chip(page, '업무')).toBeVisible();
    await expect(tagInput).toHaveValue('');

    // 저장 — 여기서 처음으로 서버에 반영된다(ADR-2)
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 진짜 검증: 새로고침 = 서버에서 다시 읽기. 로컬 state가 아니라 영속성을 본다(US-3)
    await page.reload();
    await page.getByText(title).click(); // 목록에서 내 노트를 다시 연다(컴포넌트 횡단 여정)
    await expect(page.getByPlaceholder('제목')).toHaveValue(title);
    await expect(chip(page, '업무')).toBeVisible();
  });

  // US-2·3 — 기존 노트에서 태그를 추가·삭제한 결과가 저장되고 새로고침 후에도 그대로다.
  // 단위 테스트가 못 보는 것: 삭제로 줄어든 tags가 실제 PATCH되어 서버에 영속된다.
  test('기존 노트에서 태그를 추가·삭제하고 저장하면 새로고침 후 그대로 반영된다', async ({
    page,
    uniqueTitle,
  }) => {
    const title = uniqueTitle('편집');
    await page.goto('/');

    // 준비: 태그 2개를 가진 노트를 하나 만들어 저장(이 테스트의 출발 상태를 스스로 마련)
    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByPlaceholder('제목').fill(title);
    const tagInput = page.getByPlaceholder('태그 추가');
    await tagInput.fill('임시');
    await tagInput.press('Enter');
    await tagInput.fill('보관');
    await tagInput.press('Enter');
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 편집: 노트를 다시 열어 '임시'를 삭제하고 '완료'를 추가
    await page.getByText(title).click();
    await chip(page, '임시').click(); // US-2: × 로 즉시 제거
    await expect(chip(page, '임시')).toBeHidden();
    await tagInput.fill('완료');
    await tagInput.press('Enter');
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 검증: 새로고침 후 '완료'·'보관'은 남고 '임시'는 사라진 채 영속(US-3)
    await page.reload();
    await page.getByText(title).click();
    await expect(chip(page, '완료')).toBeVisible();
    await expect(chip(page, '보관')).toBeVisible();
    await expect(chip(page, '임시')).toBeHidden();
  });

  // US-8 — 취소는 태그 변경을 서버로 보내지 않는다. reload로 "서버에 안 갔다"를 실제로 증명한다.
  // 단위 테스트가 못 보는 것: 로컬 롤백이 아니라 서버 상태가 진짜 그대로인지.
  test('태그를 바꾸다 취소하면 새로고침 후 원래 태그로 돌아간다', async ({ page, uniqueTitle }) => {
    const title = uniqueTitle('취소');
    await page.goto('/');

    // 준비: 태그 1개짜리 노트를 저장
    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByPlaceholder('제목').fill(title);
    const tagInput = page.getByPlaceholder('태그 추가');
    await tagInput.fill('원본');
    await tagInput.press('Enter');
    await page.getByRole('button', { name: '저장', exact: true }).click();

    // 노트를 열어 태그를 바꾼 뒤 취소
    await page.getByText(title).click();
    await tagInput.fill('실수');
    await tagInput.press('Enter');
    await expect(chip(page, '실수')).toBeVisible(); // 로컬로는 반영됨
    await page.getByRole('button', { name: '취소' }).click();

    // 검증: 새로고침 후 '원본'만 있고 '실수'는 서버에 없다(US-8)
    await page.reload();
    await page.getByText(title).click();
    await expect(chip(page, '원본')).toBeVisible();
    await expect(chip(page, '실수')).toBeHidden();
  });

  // US-5 — 검증 실패가 실제 화면에 인라인 안내로 뜨는 "배선"만 대표 하나로 확인한다.
  // 대소문자 무시 판정·다른 에러 종류의 표는 도메인/컴포넌트 단위 테스트의 몫(중복 금지).
  test('이미 있는 태그를 다시 넣으면 인라인 안내가 뜬다', async ({ page, uniqueTitle }) => {
    const title = uniqueTitle('중복');
    await page.goto('/');

    await page.getByRole('button', { name: '새 노트' }).click();
    await page.getByPlaceholder('제목').fill(title);
    const tagInput = page.getByPlaceholder('태그 추가');
    await tagInput.fill('react');
    await tagInput.press('Enter');
    await expect(chip(page, 'react')).toBeVisible();

    // 같은 태그를 대소문자만 바꿔 재입력 → 거부 + 인라인 안내(ADR-4)
    await tagInput.fill('React');
    await tagInput.press('Enter');
    await expect(page.getByText('이미 추가된 태그입니다')).toBeVisible();

    // 입력값을 바꾸면 안내가 사라진다(ADR-4의 소멸 시점)
    await tagInput.fill('vue');
    await expect(page.getByText('이미 추가된 태그입니다')).toBeHidden();
  });
});

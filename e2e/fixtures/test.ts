import { test as base, expect, request } from '@playwright/test';

// 앱이 하드코딩으로 바라보는 mock API. 정리(cleanup)도 같은 곳을 친다.
const API = 'http://localhost:3001';

type Fixtures = {
  // 고유 제목 생성기. 만든 제목을 자동 추적해 테스트 종료 후 삭제한다.
  uniqueTitle: (label: string) => string;
  // 고유 태그 생성기. 태그 칩은 db 전체 집계라 다른 노트와 충돌하면 카운트가 흔들린다.
  // uniqueTitle 결과는 MAX_TAG_LENGTH(20자)를 넘어 태그로 재사용할 수 없어 별도로 둔다.
  uniqueTag: (label: string) => string;
};

export const test = base.extend<Fixtures>({
  uniqueTitle: async ({}, use) => {
    // 이 테스트가 만든 제목만 기록 — 병렬 실행에서 다른 테스트 노트를 건드리지 않기 위해
    const created: string[] = [];

    const make = (label: string) => {
      const title = `E2E-${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      created.push(title);
      return title;
    };

    await use(make);

    // ── teardown: 이 테스트가 만든 제목의 노트만 지운다 ──
    // 잔여물 누적을 막아 재실행 시 db가 깨끗하다. 자기 것만 지우므로 병렬·실서버에도 안전.
    const ctx = await request.newContext();
    try {
      const res = await ctx.get(`${API}/notes`);
      if (res.ok()) {
        const notes: Array<{ id: string; title: string }> = await res.json();
        for (const note of notes) {
          if (created.includes(note.title)) {
            await ctx.delete(`${API}/notes/${note.id}`);
          }
        }
      }
    } finally {
      await ctx.dispose();
    }
  },

  // 20자 이하 고유 태그. 태그 자체는 노트에만 붙으므로 정리는 uniqueTitle의 teardown이 함께 처리한다.
  // 길이 예산: label(권장 3자 이하) + '-' + 36진수 타임스탬프(8자) + 36진수 난수(3자) ≤ 15자.
  uniqueTag: async ({}, use) => {
    const make = (label: string) => {
      const stamp = Date.now().toString(36); // 8자
      const rand = Math.floor(Math.random() * 46656)
        .toString(36)
        .padStart(3, '0'); // 3자
      return `${label}-${stamp}${rand}`;
    };

    await use(make);
  },
});

export { expect };

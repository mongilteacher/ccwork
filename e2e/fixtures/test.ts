import { test as base, expect, request } from '@playwright/test';

// 앱이 하드코딩으로 바라보는 mock API. 정리(cleanup)도 같은 곳을 친다.
const API = 'http://localhost:3001';

type Fixtures = {
  // 고유 제목 생성기. 만든 제목을 자동 추적해 테스트 종료 후 삭제한다.
  uniqueTitle: (label: string) => string;
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
});

export { expect };

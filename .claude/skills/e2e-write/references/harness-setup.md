# 하네스 스캐폴딩 (최초 1회)

`playwright.config.ts`가 없을 때만 실행한다. 목표는 **실제 `db.json`을 절대 건드리지 않고** E2E를 돌리는 것. 이 프로젝트의 제약이 설계를 강제한다:

- `src/api/notes.ts`의 `API_URL`이 `'http://localhost:3001'`로 **하드코딩**돼 있다 → 앱은 무조건 3001로 요청한다. 포트를 바꾸려면 `src/`를 고쳐야 하는데 이 스킬은 `src/`를 건드리지 않는다.
- json-server는 `--watch` 대상 파일을 **직접 수정**한다 → E2E가 노트를 만들고 지우면 그 파일이 오염된다.

**해법**: 3001은 그대로 두되, 그 3001이 바라보는 파일을 **실제 `db.json`이 아니라 시드 사본**으로 바꾼다. E2E 전용 dev 스크립트가 매 실행마다 시드를 사본으로 복사해 띄운다. 실제 `db.json`은 손대지 않는다.

`@playwright/test`와 chromium은 이미 설치돼 있다(설치 안 됐으면 `npm i -D @playwright/test && npx playwright install chromium`).

---

## 1. `playwright.config.ts` (프로젝트 루트)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // API_URL이 3001로 하드코딩 → 모든 테스트가 단일 json-server(단일 db 파일)를 공유한다.
  // 동시 쓰기가 몰리면 json-server의 --watch 리로드와 경쟁해 flaky해지므로 직렬로 실행한다.
  // (워커별 포트 분리는 하드코딩된 API_URL 때문에 불가능하다. 이건 실행으로 확인된 제약이다.)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    // 첫 재시도 때만 trace 남김 — 실패 디버깅용
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Vite(5173) + 시드 사본 json-server(3001)를 자동 기동
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## 2. `e2e/seed-server.mjs` — 시드를 사본으로 복사해 json-server 기동

```js
import { copyFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seed = resolve(here, 'fixtures/db.seed.json');
const tmp = resolve(here, '.tmp/db.e2e.json');

// 매 실행마다 시드를 던져버릴 사본으로 복사 — 실제 db.json은 건드리지 않는다
mkdirSync(dirname(tmp), { recursive: true });
copyFileSync(seed, tmp);

// 앱이 하드코딩으로 바라보는 포트 3001을, 사본을 가리킨 채로 점유
const child = spawn('npx', ['json-server', '--watch', tmp, '--port', '3001'], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
```

## 3. `e2e/fixtures/db.seed.json` — E2E 시드 데이터

`db.json`과 **같은 스키마**를 최소한으로 담는다. 테스트가 자기 노트를 스스로 만들므로 시드는 "앱이 빈 화면이 아니게" 하는 최소 노트 몇 개면 된다. `tags` 필드는 필수다.

```json
{
  "notes": [
    {
      "id": "seed-1",
      "title": "시드 노트",
      "content": "E2E 시드 데이터입니다.",
      "tags": ["React"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

> json-server가 `$schema` 키를 요구하지 않으므로 생략한다. 실제 `db.json`의 스키마(`id`·`title`·`content`·`tags`·`createdAt`·`updatedAt`)와 어긋나지 않게만 맞춘다.

## 4. `e2e/fixtures/test.ts` — 고유 제목 + 자기 노트 자동 정리

`@playwright/test`의 `test`를 확장해 **테스트마다 고유 제목을 주고, 종료 후 그 테스트가 만든 노트만 지우는** fixture다. 두 가지를 동시에 해결한다:

- **잔여물 방지**: 실행이 남긴 노트가 db에 쌓이지 않아 재실행 시 깨끗하다.
- **오염 방어**: 만에 하나 실서버(실제 `db.json`)에 붙어 돌아도 **자기가 만든 제목만** 지우므로 사용자 노트는 무손상이다.

정리를 **전역 삭제가 아니라 "이 테스트가 만든 제목만"**으로 좁히는 게 핵심이다 — 전역 삭제는 병렬(설령 직렬이라도 재실행 잔여)에서 남의 노트를 지운다.

```ts
import { test as base, expect, request } from '@playwright/test';

const API = 'http://localhost:3001';

type Fixtures = {
  uniqueTitle: (label: string) => string; // 고유 제목 생성 + 자동 정리 등록
};

export const test = base.extend<Fixtures>({
  uniqueTitle: async ({}, use) => {
    const created: string[] = []; // 이 테스트가 만든 제목만 기록

    const make = (label: string) => {
      const title = `E2E-${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      created.push(title);
      return title;
    };

    await use(make);

    // ── teardown: 이 테스트가 만든 제목의 노트만 삭제 ──
    const ctx = await request.newContext();
    try {
      const res = await ctx.get(`${API}/notes`);
      if (res.ok()) {
        const notes: Array<{ id: string; title: string }> = await res.json();
        for (const note of notes) {
          if (created.includes(note.title)) await ctx.delete(`${API}/notes/${note.id}`);
        }
      }
    } finally {
      await ctx.dispose();
    }
  },
});

export { expect };
```

spec은 `@playwright/test`가 아니라 **이 파일에서** `test`/`expect`를 import하고, `async ({ page, uniqueTitle }) => ...`로 받아 쓴다.

## 5. `package.json` scripts 추가

기존 `scripts`에 세 줄을 더한다(다른 스크립트는 그대로):

```json
{
  "scripts": {
    "dev:e2e": "concurrently \"vite\" \"npm run server:e2e\"",
    "server:e2e": "node e2e/seed-server.mjs",
    "test:e2e": "playwright test"
  }
}
```

`concurrently`는 이미 devDependency에 있다(기존 `dev` 스크립트가 쓴다).

## 6. `.gitignore` 추가

시드 사본과 Playwright 산출물은 커밋하지 않는다. `.gitignore` 끝에 추가:

```
# E2E (Playwright)
e2e/.tmp/
/test-results/
/playwright-report/
/playwright/.cache/
```

## 7. Vitest에서 e2e 분리 (필수 — 안 하면 `npm test`가 깨진다)

Vitest 기본 `include`는 `**/*.{test,spec}.*`라 **`e2e/*.spec.ts`(Playwright 파일)까지 잡아** 실행하려다 `test.describe() ... did not expect`로 실패한다. Playwright 스펙은 Vitest 러너에서 못 돈다. 유닛 테스트가 `src/`에 co-location돼 있으니 Vitest 범위를 `src/`로 좁힌다. `vite.config.ts`의 `test`에 추가:

```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test-setup.ts',
  // e2e/의 Playwright *.spec.ts는 Vitest가 잡지 않게 범위를 src/로 좁힌다(실행으로 확인된 충돌)
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  // ...기존 coverage 등 유지
},
```

이러면 `npm test`(Vitest, 유닛)와 `npm run test:e2e`(Playwright)가 완전히 분리된다.

---

## 검증

스캐폴딩 후 서버 기동만 한 번 확인한다(테스트 0개여도 설정 자체가 도는지):

```bash
npm run test:e2e -- --list
```

`webServer`가 뜨고 "no tests found"(아직 spec 없음)면 하네스는 정상이다. 이후 3단계에서 spec을 쓰면 실제로 돈다.

그리고 **`npm test`(Vitest)가 여전히 초록불인지** 확인한다 — §7을 빠뜨리면 여기서 e2e 스펙이 Vitest에 걸려 깨진다.

## 알아둘 마찰점 (막히면 참고, 선제 대응은 하지 말 것)

- **실제 dev 서버가 이미 떠 있을 때 (중요)**: `reuseExistingServer: !CI`라, `npm run dev`(실제 `db.json` on 3001)가 이미 떠 있으면 Playwright는 그 5173을 **재사용**하고 `dev:e2e`(시드 사본)를 띄우지 않는다 → 테스트가 **실제 `db.json`에 붙어 돈다.** §4 정리 fixture가 자기 노트만 지워 순효과는 0이지만, **시드 사본 격리 경로는 실행되지 않아 미검증**으로 남는다. 격리 경로까지 확인하려면 실행 전 dev 서버를 내린다(3001을 비워야 시드 사본 서버가 그 포트를 잡는다 — 하드코딩된 단일 포트라 공존 불가). 실행 시 포트 점유 여부를 먼저 확인하고, 실서버에 붙는 상황이면 개발자에게 알린다.
- **ESLint**: `eslint.config.js`가 `**/*.{ts,tsx}`에 `globals.browser`를 적용한다. E2E 파일은 `test`/`expect`를 fixture(§4)나 `@playwright/test`에서 **import**하므로 no-undef 문제는 없다. lint 에러가 실제로 나면 그때 `e2e/**`용 오버라이드를 개발자와 상의해 추가한다 — 미리 건드리지 않는다.
- **pre-commit 훅**: `lint-staged`가 staged `*.ts`에 `eslint --fix` + `prettier --write`를 돌린다. E2E spec도 대상이라 커밋 시 자동 포맷된다(정상).
- **design-system 훅**: `PostToolUse` 훅은 `src/**/*.tsx`와 `src/index.css`만 검사한다. `e2e/**`는 대상이 아니므로 스타일 규칙에 걸리지 않는다.

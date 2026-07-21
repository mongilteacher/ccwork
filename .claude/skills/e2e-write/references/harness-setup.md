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
  // 각 테스트가 고유 노트로 독립적이라 병렬 안전
  fullyParallel: true,
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

## 4. `package.json` scripts 추가

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

## 5. `.gitignore` 추가

시드 사본과 Playwright 산출물은 커밋하지 않는다. `.gitignore` 끝에 추가:

```
# E2E (Playwright)
e2e/.tmp/
/test-results/
/playwright-report/
/playwright/.cache/
```

---

## 검증

스캐폴딩 후 서버 기동만 한 번 확인한다(테스트 0개여도 설정 자체가 도는지):

```bash
npm run test:e2e -- --list
```

`webServer`가 뜨고 "no tests found"(아직 spec 없음)면 하네스는 정상이다. 이후 3단계에서 spec을 쓰면 실제로 돈다.

## 알아둘 마찰점 (막히면 참고, 선제 대응은 하지 말 것)

- **ESLint**: `eslint.config.js`가 `**/*.{ts,tsx}`에 `globals.browser`를 적용한다. E2E 파일은 `test`/`expect`를 `@playwright/test`에서 **import**하므로 no-undef 문제는 없다. lint 에러가 실제로 나면 그때 `e2e/**`용 오버라이드를 개발자와 상의해 추가한다 — 미리 건드리지 않는다.
- **pre-commit 훅**: `lint-staged`가 staged `*.ts`에 `eslint --fix` + `prettier --write`를 돌린다. E2E spec도 대상이라 커밋 시 자동 포맷된다(정상).
- **design-system 훅**: `PostToolUse` 훅은 `src/**/*.tsx`와 `src/index.css`만 검사한다. `e2e/**`는 대상이 아니므로 스타일 규칙에 걸리지 않는다.

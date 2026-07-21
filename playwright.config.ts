import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // API_URL이 3001로 하드코딩 → 모든 테스트가 단일 json-server(단일 db 파일)를 공유한다.
  // 동시 쓰기가 몰리면 json-server의 --watch 리로드와 경쟁해 flaky해지므로 직렬로 실행한다.
  // (워커별 포트 분리는 하드코딩된 API_URL 때문에 불가능하다.)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    // 첫 재시도 때만 trace 남김 — 실패 디버깅용
    trace: 'on-first-retry',
    // 시연용 느린 재생. 기본 0이라 평소·CI엔 영향 없음. 예: SLOWMO=800 npm run test:e2e -- --headed
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
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

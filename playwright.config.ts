import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command:
      'npm run build && npm run test:e2e:reset && npm run test:e2e:seed && npm run test:e2e:serve',
    url: 'http://127.0.0.1:4310/',
    timeout: 60_000,
    reuseExistingServer: false,
  },
});

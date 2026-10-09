import { defineConfig } from '@playwright/test';

/**
 * Android platform suite: the installed APK in an emulator, driven through its WebView. It covers
 * what the browser journeys cannot (native SQLite, forced stop, reinstall, back button) and runs
 * only when platform code changes or on demand (.github/workflows/android.yml).
 */
export default defineConfig({
  testDir: 'android-e2e',
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [
        ['list', { printSteps: true }],
        ['html', { open: 'never' }],
      ]
    : 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 30_000 },
});

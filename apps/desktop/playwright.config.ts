import { defineConfig } from '@playwright/test';

/** Smoke test of the packaged desktop shell (ADR 0011): run `pnpm package` first. */
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  timeout: 60_000,
  use: { trace: 'retain-on-failure' },
});

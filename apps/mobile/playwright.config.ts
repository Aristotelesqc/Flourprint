import { defineConfig, devices } from '@playwright/test';

// Agents sharing one machine each pick their own port (FLOURPRINT_E2E_PORT), so one run never
// reuses another checkout's preview server and tests a foreign build.
const port = Number(process.env.FLOURPRINT_E2E_PORT ?? 4173);

/**
 * Browser journeys on the production web build (memory stores, session-only). They protect UI
 * behavior on every change; SQLite durability and the APK are covered by device checks (#24).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${port}`,
    timezoneId: 'America/Toronto',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Local sandboxes route traffic through a proxy; the preview server is local.
    launchOptions: { args: ['--no-proxy-server'] },
  },
  projects: [
    { name: 'fr', use: { locale: 'fr-CA' }, grepInvert: /@en/ },
    { name: 'en', use: { locale: 'en-US' }, grep: /@en/ },
  ],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});

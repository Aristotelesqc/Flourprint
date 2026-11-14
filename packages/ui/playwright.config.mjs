import { createRequire } from 'node:module';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { defineConfig } = requireMobile('@playwright/test');
const port = Number(process.env.FLOURPRINT_CATALOGUE_PORT ?? 4276);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  outputDir: '../../.agy-runs/foundation-168/playwright-results',
  workers: process.env.CI ? 2 : 4,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--no-proxy-server'] },
  },
  projects: ['light', 'dark', 'amoled'].flatMap((theme) =>
    [
      { width: 393, scale: 100 },
      { width: 360, scale: 130 },
    ].map(({ width, scale }) => ({
      name: `${theme}-${width}-${scale}`,
      metadata: { theme, scale },
      use: { viewport: { width, height: 900 } },
    })),
  ),
  webServer: {
    command: 'node ../../scripts/ui-catalogue.mjs preview',
    env: { FLOURPRINT_CATALOGUE_PORT: String(port) },
    url: `http://127.0.0.1:${port}/catalogue.html`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

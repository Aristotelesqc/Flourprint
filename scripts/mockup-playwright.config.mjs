import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const requireMobile = createRequire(path.join(repo, 'apps/mobile/package.json'));
const { defineConfig } = requireMobile('@playwright/test');
const port = Number(process.env.FLOURPRINT_MOCKUP_PORT ?? 4263);

export default defineConfig({
  testDir: './mockup-tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30000,
  outputDir: path.join(repo, 'docs/mockups/0.3-ux/dist/test-results'),
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 393, height: 852 },
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--no-proxy-server'],
      ...(process.env.FLOURPRINT_TEST_BROWSER
        ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
        : {}),
    },
  },
  webServer: {
    command: 'node scripts/mockup-review.mjs preview',
    cwd: repo,
    url: `http://127.0.0.1:${port}/mockup.html`,
    reuseExistingServer: false,
  },
});

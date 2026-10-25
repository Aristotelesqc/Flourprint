// Run the shared UI journeys against a production build, on an isolated catalogue port.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const requireMobile = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const env = { ...process.env, FLOURPRINT_UI_FIXTURES: 'true' };
const built = spawnSync(
  process.execPath,
  [fileURLToPath(new URL('./ui-catalogue.mjs', import.meta.url)), 'build'],
  { cwd: repo, env, stdio: 'inherit' },
);
if (built.status !== 0) process.exit(built.status ?? 1);
const tested = spawnSync(
  process.execPath,
  [
    requireMobile.resolve('@playwright/test/cli'),
    'test',
    '--config',
    fileURLToPath(new URL('../packages/ui/playwright.config.mjs', import.meta.url)),
    ...process.argv.slice(2),
  ],
  { cwd: repo, env, stdio: 'inherit' },
);
process.exit(tested.status ?? 1);

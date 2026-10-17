import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const requireMobile = createRequire(path.join(repo, 'apps/mobile/package.json'));
const result = spawnSync(
  process.execPath,
  [
    requireMobile.resolve('@playwright/test/cli'),
    'test',
    '-c',
    'scripts/mockup-playwright.config.mjs',
    ...process.argv.slice(2),
  ],
  { cwd: repo, stdio: 'inherit', env: process.env },
);
process.exitCode = result.status ?? 1;

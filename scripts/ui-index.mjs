// Regenerates packages/ui/CATALOGUE.md from the library guides (ADR 0021), on any shell.
import { spawnSync } from 'node:child_process';

const result = spawnSync('vitest', ['run', 'packages/ui/test/catalogue-index.test.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, UPDATE_CATALOGUE: '1' },
});
process.exit(result.status ?? 1);

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@flourprint/core/domain': fileURLToPath(
        new URL('./packages/core/src/domain/index.ts', import.meta.url),
      ),
      '@flourprint/core/application': fileURLToPath(
        new URL('./packages/core/src/application/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'scripts/test/**/*.test.mjs',
      // Dogfood importers; removed with their folder.
      'dogfood/*/importer/test/**/*.test.ts',
    ],
  },
});

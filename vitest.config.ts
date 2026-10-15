import { defineConfig } from 'vitest/config';

export default defineConfig({
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

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ADR 0001: core/domain stays pure. This test backs up the ESLint rule so the boundary
 * holds even if the lint configuration drifts.
 */
const srcDir = fileURLToPath(new URL('../src', import.meta.url));

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const importsOf = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] as string,
  );

describe('core/domain dependency boundary', () => {
  const files = sourceFiles(join(srcDir, 'domain'));

  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s only imports relative domain modules', (file) => {
    for (const specifier of importsOf(file)) {
      expect(specifier, `${file} imports ${specifier}`).toMatch(/^\.\.?\//);
      expect(specifier).not.toMatch(/(^|\/)(application|contracts)(\/|$)/);
    }
  });
});

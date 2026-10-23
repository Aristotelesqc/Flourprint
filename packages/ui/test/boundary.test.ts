import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ADR 0020: the library holds no baking math and no product data, so it never imports
 * @flourprint/core or @flourprint/adapters; it depends on React only. Backs up the ESLint rule.
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

describe('packages/ui dependency boundary', () => {
  const files = sourceFiles(srcDir).filter((file) => /\.(ts|tsx)$/.test(file));

  it.each(files.map((file) => relative(srcDir, file)))(
    '%s imports React or the library only',
    (file) => {
      for (const specifier of importsOf(join(srcDir, file))) {
        expect(specifier, `${file} imports ${specifier}`).toMatch(
          /^(\.\.?\/|react(\/|$)|react-dom(\/|$)|@dnd-kit\/(react|dom)(\/|$))/,
        );
      }
    },
  );

  it('version implementations do not pin versions of their children', () => {
    for (const file of files.filter((file) =>
      /components[\\/]([^\\/]+)[\\/]v\d+\.tsx$/.test(file),
    )) {
      for (const specifier of importsOf(file))
        expect(specifier).not.toMatch(/\.\.\/.*\/v\d+(?:\.tsx?)?$/);
    }
  });

  it('lists every motion version and guide in the motion catalogue', () => {
    const registry = readFileSync(join(srcDir, 'catalogue/motions.ts'), 'utf8');
    const motionsDir = join(srcDir, 'motions');
    for (const entry of readdirSync(motionsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const files = readdirSync(join(motionsDir, entry.name));
      expect(files, `${entry.name} has no guide`).toContain('guide.ts');
      for (const name of files.filter((file) => /^v\d+\.ts$/.test(file))) {
        const version = `motions/${entry.name}/${name.replace(/\.ts$/, '')}`;
        expect(registry, `${version} is missing`).toContain(version);
      }
    }
  });

  it('lists every version file of every component in the catalogue registry', () => {
    const registry = readFileSync(join(srcDir, 'catalogue/registry.ts'), 'utf8');
    const componentsDir = join(srcDir, 'components');
    const versions = readdirSync(componentsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) =>
        readdirSync(join(componentsDir, entry.name))
          .filter((name) => /^v\d+\.tsx$/.test(name))
          .map((name) => `components/${entry.name}/${name.replace(/\.tsx$/, '')}`),
      );
    for (const version of versions) expect(registry, `${version} is missing`).toContain(version);
  });
});

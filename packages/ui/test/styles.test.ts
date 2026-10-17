import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
const root = fileURLToPath(new URL('../src/components', import.meta.url));
const files = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) =>
    readdirSync(join(root, e.name))
      .filter((n) => /^v\d+\.css$/.test(n))
      .map((n) => ({ id: e.name, file: n })),
  );
describe('versioned presentation boundary', () => {
  it.each(files)(
    '$id/$file scopes its internal selectors to its id and version',
    ({ id, file }) => {
      const css = readFileSync(join(root, id, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const keyframe of css.matchAll(/@keyframes\s+([\w-]+)/g))
        expect(keyframe[1]).toMatch(new RegExp(`^fp-${id}-${file.replace('.css', '')}-`));
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!rule[1]) continue;
        const selector = rule[1].trim();
        if (/^(?:from|to|[\d.]+%)(?:\s|,|$)/.test(selector)) continue;
        const version = file.replace('.css', '');
        const component =
          selector.includes(`[data-fp-component='fp.${id}']`) &&
          selector.includes(`[data-fp-version='${version}']`);
        const container =
          selector.includes(`[data-fp-container='fp.${id}']`) &&
          selector.includes(`[data-fp-container-version='${version}']`);
        expect(component || container, selector).toBe(true);
      }
    },
  );
});

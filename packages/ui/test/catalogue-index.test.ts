import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogueMarkdown } from '../src/catalogue/markdown.ts';
import { defaultMotionManifest, motionCatalogue, motionGuides } from '../src/catalogue/motions.ts';
import { catalogue, guides } from '../src/catalogue/registry.ts';
import { checkGuides } from '../src/guides.ts';

/**
 * ADR 0021: CATALOGUE.md, the index agents read first, is generated from the guides and stays
 * current. Regenerate with `pnpm ui:index`.
 */
const file = fileURLToPath(new URL('../CATALOGUE.md', import.meta.url));
const generated = catalogueMarkdown({
  components: catalogue,
  componentGuides: guides,
  motions: motionCatalogue,
  motionGuides,
  motionManifest: defaultMotionManifest,
});

describe('agent index', () => {
  it('has a complete guide for every component id', () => {
    expect(checkGuides(guides, Object.keys(catalogue))).toEqual([]);
  });

  it('is current', () => {
    if (process.env.UPDATE_CATALOGUE === '1') writeFileSync(file, generated);
    expect(readFileSync(file, 'utf8'), 'run pnpm ui:index').toBe(generated);
  });
});

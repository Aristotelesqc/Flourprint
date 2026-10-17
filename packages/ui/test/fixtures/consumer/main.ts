// The documented consumer pattern: the manifest is imported statically; every version is loaded
// only when a build sets VITE_UI_OVERRIDES, so release bundles hold the selected versions only.
import { createUi, parseOverrides, type Manifest } from '../../../src/library.ts';
import type { TestComponents } from '../components.ts';
import { testManifest } from '../manifest.ts';

let overrides: Partial<Manifest<TestComponents>> = {};
if (import.meta.env.VITE_UI_OVERRIDES === 'true') {
  const { testCatalogue } = await import('../catalogue.ts');
  overrides = parseOverrides(window.location.search, testCatalogue).overrides;
}

export const ui = createUi(testManifest, overrides);

// The documented consumer pattern: manifests are imported statically; every version is loaded
// only when a build sets VITE_UI_OVERRIDES, so release bundles hold the selected versions only.
import { createUi, type Manifest } from '../../../src/library.ts';
import { parseUiOverrides, type MotionManifest } from '../../../src/motion.ts';
import type { TestComponents } from '../components.ts';
import { testManifest } from '../manifest.ts';
import { testMotionManifest } from '../motion-manifest.ts';
import type { TestMotion } from '../motions.ts';

let components: Partial<Manifest<TestComponents>> = {};
let motionOverrides: Partial<MotionManifest<TestMotion>> = {};
if (import.meta.env.VITE_UI_OVERRIDES === 'true') {
  const { testCatalogue } = await import('../catalogue.ts');
  const { testMotionCatalogue } = await import('../motion-catalogue.ts');
  const parsed = parseUiOverrides(window.location.search, {
    components: testCatalogue,
    motions: testMotionCatalogue,
  });
  components = parsed.components;
  motionOverrides = parsed.motions;
}

export const ui = createUi(testManifest, components);
export const motions = { ...testMotionManifest, ...motionOverrides };

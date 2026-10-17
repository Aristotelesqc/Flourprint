export {
  checkCatalogue,
  checkVersions,
  createLibrary,
  createUi,
  parseOverrides,
  type Catalogue,
  type CatalogueProblem,
  type ComponentId,
  type ComponentMap,
  type Example,
  type Manifest,
  type ParsedOverrides,
  type UiProps,
  type UiRenderer,
  type Version,
  type VersionName,
} from './library.ts';
export type { FlourprintComponents } from './components.ts';
export {
  checkMotions,
  createMotionLibrary,
  durationMs,
  easingCurve,
  ionicAnimation,
  isReduced,
  parseMotionOverrides,
  playMotion,
  transitionCss,
  type DurationToken,
  type EasingToken,
  type IonicAnimationBuilder,
  type KeyframesMotion,
  type Motion,
  type MotionCatalogue,
  type MotionId,
  type MotionManifest,
  type TransitionMotion,
} from './motion.ts';
export { motionLibrary, type FlourprintMotion } from './motions.ts';
export { MotionProvider, useMotion } from './motion-context.ts';
export {
  checkGuides,
  type ComponentGuide,
  type ComponentGuides,
  type Decision,
  type Guide,
  type GuideProblem,
  type MotionGuides,
} from './guides.ts';
export { tokens, tokensCss, tokensYaml, type Tokens } from './tokens.ts';

import { createLibrary } from './library.ts';
import type { FlourprintComponents } from './components.ts';

/** Typed helpers for Flourprint's own components: `library.version`, `.manifest`, `.catalogue`. */
export const library = createLibrary<FlourprintComponents>();

export {
  checkCatalogue,
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
export { tokens, tokensCss, tokensYaml, type Tokens } from './tokens.ts';

import { createLibrary } from './library.ts';
import type { FlourprintComponents } from './components.ts';

/** Typed helpers for Flourprint's own components: `library.version`, `.manifest`, `.catalogue`. */
export const library = createLibrary<FlourprintComponents>();

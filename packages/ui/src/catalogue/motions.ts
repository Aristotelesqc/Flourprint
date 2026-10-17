/**
 * Every version and the guide of every Flourprint motion (ADR 0021). Like the component
 * catalogue, release builds must not import it; consumers load it behind a build-time flag.
 */
import { motionLibrary } from '../motions.ts';
import pressV1 from '../motions/press/v1.ts';
import pressGuide from '../motions/press/guide.ts';
import pressIconV1 from '../motions/press-icon/v1.ts';
import pressIconGuide from '../motions/press-icon/guide.ts';
import menuEnterV1 from '../motions/menu-enter/v1.ts';
import menuEnterGuide from '../motions/menu-enter/guide.ts';
import menuExitV1 from '../motions/menu-exit/v1.ts';
import menuExitGuide from '../motions/menu-exit/guide.ts';
import checkV1 from '../motions/check/v1.ts';
import checkGuide from '../motions/check/guide.ts';
import highlightV1 from '../motions/highlight/v1.ts';
import highlightGuide from '../motions/highlight/guide.ts';
import chevronV1 from '../motions/chevron/v1.ts';
import chevronGuide from '../motions/chevron/guide.ts';
import disclosureV1 from '../motions/disclosure/v1.ts';
import disclosureGuide from '../motions/disclosure/guide.ts';
import backdropEnterV1 from '../motions/backdrop-enter/v1.ts';
import backdropEnterGuide from '../motions/backdrop-enter/guide.ts';
import backdropExitV1 from '../motions/backdrop-exit/v1.ts';
import backdropExitGuide from '../motions/backdrop-exit/guide.ts';
import sheetEnterV1 from '../motions/sheet-enter/v1.ts';
import sheetEnterGuide from '../motions/sheet-enter/guide.ts';
import sheetExitV1 from '../motions/sheet-exit/v1.ts';
import sheetExitGuide from '../motions/sheet-exit/guide.ts';

export const motionCatalogue = motionLibrary.catalogue({
  'fp.motion.press': [pressV1],
  'fp.motion.press-icon': [pressIconV1],
  'fp.motion.menu-enter': [menuEnterV1],
  'fp.motion.menu-exit': [menuExitV1],
  'fp.motion.check': [checkV1],
  'fp.motion.highlight': [highlightV1],
  'fp.motion.chevron': [chevronV1],
  'fp.motion.disclosure': [disclosureV1],
  'fp.motion.backdrop-enter': [backdropEnterV1],
  'fp.motion.backdrop-exit': [backdropExitV1],
  'fp.motion.sheet-enter': [sheetEnterV1],
  'fp.motion.sheet-exit': [sheetExitV1],
});

export const motionGuides = motionLibrary.guides({
  'fp.motion.press': pressGuide,
  'fp.motion.press-icon': pressIconGuide,
  'fp.motion.menu-enter': menuEnterGuide,
  'fp.motion.menu-exit': menuExitGuide,
  'fp.motion.check': checkGuide,
  'fp.motion.highlight': highlightGuide,
  'fp.motion.chevron': chevronGuide,
  'fp.motion.disclosure': disclosureGuide,
  'fp.motion.backdrop-enter': backdropEnterGuide,
  'fp.motion.backdrop-exit': backdropExitGuide,
  'fp.motion.sheet-enter': sheetEnterGuide,
  'fp.motion.sheet-exit': sheetExitGuide,
});

/** Round 2's motion, the default selection until the owner approves another version. */
export const defaultMotionManifest = motionLibrary.manifest({
  'fp.motion.press': pressV1,
  'fp.motion.press-icon': pressIconV1,
  'fp.motion.menu-enter': menuEnterV1,
  'fp.motion.menu-exit': menuExitV1,
  'fp.motion.check': checkV1,
  'fp.motion.highlight': highlightV1,
  'fp.motion.chevron': chevronV1,
  'fp.motion.disclosure': disclosureV1,
  'fp.motion.backdrop-enter': backdropEnterV1,
  'fp.motion.backdrop-exit': backdropExitV1,
  'fp.motion.sheet-enter': sheetEnterV1,
  'fp.motion.sheet-exit': sheetExitV1,
});

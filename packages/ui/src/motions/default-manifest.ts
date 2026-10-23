/**
 * The motion versions selected by default: round 2's `v1` of every id (#134). Release-safe: it
 * imports only the selected versions, unlike the motion catalogue. A consumer either uses it or
 * writes its own manifest the same way; switching a motion is changing one import line.
 */
import { motionLibrary } from '../motions.ts';
import backdropEnter from './backdrop-enter/v1.ts';
import backdropExit from './backdrop-exit/v1.ts';
import check from './check/v1.ts';
import chevron from './chevron/v1.ts';
import disclosure from './disclosure/v1.ts';
import highlight from './highlight/v1.ts';
import menuEnter from './menu-enter/v1.ts';
import menuExit from './menu-exit/v1.ts';
import press from './press/v1.ts';
import pressIcon from './press-icon/v1.ts';
import sheetEnter from './sheet-enter/v1.ts';
import sheetExit from './sheet-exit/v1.ts';
import stepDrag from './step-drag/v1.ts';
import tabCarousel from './tab-carousel/v1.ts';

export const defaultMotionManifest = motionLibrary.manifest({
  'fp.motion.backdrop-enter': backdropEnter,
  'fp.motion.backdrop-exit': backdropExit,
  'fp.motion.check': check,
  'fp.motion.chevron': chevron,
  'fp.motion.disclosure': disclosure,
  'fp.motion.highlight': highlight,
  'fp.motion.menu-enter': menuEnter,
  'fp.motion.menu-exit': menuExit,
  'fp.motion.press': press,
  'fp.motion.press-icon': pressIcon,
  'fp.motion.sheet-enter': sheetEnter,
  'fp.motion.sheet-exit': sheetExit,
  'fp.motion.step-drag': stepDrag,
  'fp.motion.tab-carousel': tabCarousel,
});

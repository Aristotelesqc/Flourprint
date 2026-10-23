/**
 * Flourprint's motion ids (ADR 0021). Adding a motion adds its id here, then
 * `motions/<name>/v1.ts`, `motions/<name>/guide.ts`, its line in the motion catalogue and in
 * each consumer's motion manifest. `v1` of every id is round 2's motion (`22db386`), kept at
 * the owner's request (#134).
 */
import { createMotionLibrary } from './motion.ts';

export type FlourprintMotion =
  | 'fp.motion.press'
  | 'fp.motion.press-icon'
  | 'fp.motion.menu-enter'
  | 'fp.motion.menu-exit'
  | 'fp.motion.check'
  | 'fp.motion.highlight'
  | 'fp.motion.chevron'
  | 'fp.motion.disclosure'
  | 'fp.motion.backdrop-enter'
  | 'fp.motion.backdrop-exit'
  | 'fp.motion.sheet-enter'
  | 'fp.motion.sheet-exit'
  | 'fp.motion.step-drag'
  | 'fp.motion.tab-carousel';

export const motionLibrary = createMotionLibrary<FlourprintMotion>();

import { testMotionLibrary } from '../motions.ts';

export default testMotionLibrary.motion({
  id: 'fp.motion.fade',
  version: 'v2',
  notes: 'FADE_V2_MARKER',
  kind: 'keyframes',
  standard: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 'effect', easing: 'standard' },
  reduced: 'none',
});

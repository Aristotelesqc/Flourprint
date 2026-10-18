import { testMotionLibrary } from '../motions.ts';

export default testMotionLibrary.motion({
  id: 'fp.motion.fade',
  version: 'v1',
  notes: 'FADE_V1_MARKER',
  kind: 'keyframes',
  standard: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 'effect', easing: 'standard' },
  reduced: 'none',
});

import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.backdrop-enter',
  version: 'v1',
  notes: 'Round 2 (`22db386`) sheet backdrop: fades in with the sheet.',
  kind: 'keyframes',
  standard: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 'sheet', easing: 'standard' },
  reduced: 'none',
});

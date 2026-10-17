import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.backdrop-exit',
  version: 'v1',
  notes: 'Round 2 (`22db386`) sheet backdrop: fades out with the sheet.',
  kind: 'keyframes',
  standard: { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: 'sheet', easing: 'standard' },
  reduced: 'none',
});

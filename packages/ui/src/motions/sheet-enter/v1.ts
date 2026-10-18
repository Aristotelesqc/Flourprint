import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.sheet-enter',
  version: 'v1',
  notes: 'Round 2 (`22db386`) bottom sheet: slides up from the bottom of the screen.',
  kind: 'keyframes',
  standard: {
    keyframes: [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
    duration: 'sheet',
    easing: 'decelerate',
  },
  reduced: 'none',
});

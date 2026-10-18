import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.sheet-exit',
  version: 'v1',
  notes: 'Round 2 (`22db386`) bottom sheet: slides back down.',
  kind: 'keyframes',
  standard: {
    keyframes: [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }],
    duration: 'sheet',
    easing: 'decelerate',
  },
  reduced: 'none',
});

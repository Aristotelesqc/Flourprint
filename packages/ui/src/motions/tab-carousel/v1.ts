import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.tab-carousel',
  version: 'v1',
  notes:
    'Round 2 / L101 tab carousel: horizontal slide between adjacent tabs with finger-follow, flick velocity, and gesture-matched springback.',
  kind: 'keyframes',
  standard: {
    keyframes: [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
    duration: 'spatial',
    easing: 'standard',
  },
  reduced: 'none',
});

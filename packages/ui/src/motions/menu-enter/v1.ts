import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.menu-enter',
  version: 'v1',
  notes:
    'Round 2 (`22db386`) anchored menu opening upward from a bottom anchor: fades in and grows from 0.92, rising 4 px. A top-anchored menu needs its own version (round 2 used -4 px and a top-right origin).',
  kind: 'keyframes',
  standard: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.92) translateY(4px)' },
      { opacity: 1, transform: 'scale(1) translateY(0)' },
    ],
    duration: 'effect',
    easing: 'standard',
  },
  reduced: 'none',
});

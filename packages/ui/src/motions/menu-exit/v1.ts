import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.menu-exit',
  version: 'v1',
  notes: 'Round 2 (`22db386`) anchored menu: the reverse of menu-enter.',
  kind: 'keyframes',
  standard: {
    keyframes: [
      { opacity: 1, transform: 'scale(1) translateY(0)' },
      { opacity: 0, transform: 'scale(0.92) translateY(4px)' },
    ],
    duration: 'effect',
    easing: 'standard',
  },
  reduced: 'none',
});

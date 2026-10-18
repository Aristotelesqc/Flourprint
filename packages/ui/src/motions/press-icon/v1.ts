import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.press-icon',
  version: 'v1',
  notes: 'Round 2 (`22db386`) icon buttons: scale to 0.95 while pressed.',
  kind: 'transition',
  standard: {
    properties: ['background-color', 'transform'],
    duration: 'effect',
    easing: 'standard',
  },
  reduced: 'none',
  demo: { from: { transform: 'scale(1)' }, to: { transform: 'scale(0.95)' } },
});

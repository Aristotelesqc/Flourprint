import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.press',
  version: 'v1',
  notes: 'Round 2 (`22db386`) toolbar and pill buttons: scale to 0.97 while pressed.',
  kind: 'transition',
  standard: {
    properties: ['background-color', 'transform'],
    duration: 'effect',
    easing: 'standard',
  },
  reduced: 'none',
  demo: { from: { transform: 'scale(1)' }, to: { transform: 'scale(0.97)' } },
});

import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.step-drag',
  version: 'v1',
  notes:
    'Settle animation for step drag and drop from release coordinates to target or origin position (L96, L104).',
  kind: 'keyframes',
  standard: {
    keyframes: [{ transform: 'translate3d(32px, -24px, 0)' }, { transform: 'none' }],
    duration: 'spatial',
    easing: 'standard',
  },
  reduced: 'none',
});

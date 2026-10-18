import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.highlight',
  version: 'v1',
  notes: 'Round 2 (`22db386`) ingredient rows: background colour change when weighed or selected.',
  kind: 'transition',
  standard: { properties: ['background-color'], duration: 'effect', easing: 'standard' },
  reduced: 'none',
  demo: {
    from: { 'background-color': 'transparent' },
    to: { 'background-color': 'var(--fp-color-primary-container)' },
  },
});

import { motionLibrary } from '../../motions.ts';

export default motionLibrary.motion({
  id: 'fp.motion.check',
  version: 'v1',
  notes:
    'Round 2 (`22db386`) weighing checkbox: fills with the primary colour and grows to 1.05 when checked.',
  kind: 'transition',
  standard: {
    properties: ['background-color', 'border-color', 'transform'],
    duration: 'effect',
    easing: 'standard',
  },
  reduced: 'none',
  demo: {
    from: {
      transform: 'scale(1)',
      'background-color': 'var(--fp-color-surface)',
      'border-color': 'var(--fp-color-outline)',
    },
    to: {
      transform: 'scale(1.05)',
      'background-color': 'var(--fp-color-primary)',
      'border-color': 'var(--fp-color-primary)',
    },
  },
});

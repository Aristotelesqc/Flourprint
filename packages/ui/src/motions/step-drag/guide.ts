import type { Guide } from '../../guides.ts';

export default {
  purpose:
    'Settle animation for dragged step node cards snapping back to origin or settling into slot (L96, L104).',
  useWhen: [
    'Step drag gesture releases outside valid target, dropped on engine refusal, or cancelled by Escape/Back.',
  ],
  avoidWhen: [
    'Direct active finger tracking (must directly follow finger without lag or transition easing).',
  ],
  accessibility: [
    'Honours prefers-reduced-motion and manual motion reduction (instant settle without duration).',
  ],
  related: ['fp.motion.tab-carousel', 'fp.motion.highlight'],
  decisions: [
    {
      label: 'L96/L104: Step drag and drop settle motion',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
    {
      label: 'ADR 0021: motion items',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
} satisfies Guide;

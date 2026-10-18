import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Closes the anchored overflow menu back toward its trigger.',
  useWhen: ['The overflow menu when it closes, by selection, Escape or a tap outside.'],
  avoidWhen: ['Delaying the chosen action until the animation ends.'],
  accessibility: [
    'Focus returns to the trigger.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.menu-enter'],
  decisions: [
    {
      label: "Owner: keep round 2's motion (#134)",
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659',
    },
    {
      label: 'ADR 0021: motion items',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
} satisfies Guide;

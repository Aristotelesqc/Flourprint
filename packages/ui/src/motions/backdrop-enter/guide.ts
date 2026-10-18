import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Dims the screen behind a sheet or dialog as it opens.',
  useWhen: ['The backdrop of the planned fp.sheet and of dialogs, alongside their enter motion.'],
  avoidWhen: ['Using the backdrop alone as the only sign that something opened.'],
  accessibility: [
    'Content behind is inert while the sheet is open.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.backdrop-exit', 'fp.motion.sheet-enter'],
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

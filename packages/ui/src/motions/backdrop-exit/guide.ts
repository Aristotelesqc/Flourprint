import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Removes the dimming as a sheet or dialog closes.',
  useWhen: ['The backdrop of the planned fp.sheet and of dialogs, alongside their exit motion.'],
  avoidWhen: ['Keeping input blocked after the sheet has closed.'],
  accessibility: [
    'Content behind becomes interactive again when the exit starts.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.backdrop-enter', 'fp.motion.sheet-exit'],
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

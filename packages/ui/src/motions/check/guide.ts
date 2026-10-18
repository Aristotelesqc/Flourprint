import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Confirms that an ingredient was ticked as weighed.',
  useWhen: ['Weighing checkboxes in ingredient rows.'],
  avoidWhen: ["Settings toggles: Ionic's toggle has its own motion."],
  accessibility: [
    'The checked state is also shown by the check mark and the row style, not only by motion.',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.highlight'],
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

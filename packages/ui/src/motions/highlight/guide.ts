import type { Guide } from '../../guides.ts';

export default {
  purpose: "Changes a row's background when its state changes (weighed, selected, active step).",
  useWhen: ['Ingredient rows, step rows, list rows whose state changes in place.'],
  avoidWhen: ['Drawing attention to rows whose state did not change.'],
  accessibility: [
    'Background colours keep text contrast at AA in all three themes.',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.check'],
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

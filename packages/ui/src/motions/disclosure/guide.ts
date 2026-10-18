import type { Guide } from '../../guides.ts';

export default {
  purpose: "Opens and closes a group's content smoothly without measuring heights.",
  useWhen: ['Ingredient groups, totals, step groups and other disclosures.'],
  avoidWhen: [
    'Content whose position others rely on while it moves; collapse it before measuring.',
  ],
  accessibility: [
    'Collapsed content is hidden from assistive technology (inert or hidden), not only clipped.',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.chevron'],
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

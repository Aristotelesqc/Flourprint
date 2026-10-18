import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Shows that a group opens or closes by turning its chevron.',
  useWhen: ['Disclosure and accordion headers, together with fp.motion.disclosure.'],
  avoidWhen: ['Chevrons that navigate to another screen: they do not rotate.'],
  accessibility: [
    'The header exposes aria-expanded; the rotation is decoration.',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.disclosure'],
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

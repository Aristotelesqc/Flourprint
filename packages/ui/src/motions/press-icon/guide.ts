import type { Guide } from '../../guides.ts';

export default {
  purpose:
    'Feedback while an icon-only button is held down: a slightly stronger shrink than text buttons.',
  useWhen: ['Icon buttons in app bars, rows and sheets.'],
  avoidWhen: ['Text buttons: use fp.motion.press.'],
  accessibility: [
    'The touch target stays 48 px; only the drawn icon shrinks.',
    'Reduced motion: no transition; the end state applies at once.',
  ],
  related: ['fp.motion.press'],
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

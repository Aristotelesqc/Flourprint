import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Closes a bottom sheet toward the bottom edge.',
  useWhen: [
    'A bottom sheet without breakpoints (the planned fp.sheet) when it closes: pass it as leaveAnimation through ionicAnimation.',
  ],
  avoidWhen: ["Delaying the result of the sheet's action until the slide ends."],
  accessibility: [
    'Focus returns to the element that opened the sheet.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.sheet-enter', 'fp.motion.backdrop-exit'],
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

import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Opens a bottom sheet from the bottom edge of the viewport.',
  useWhen: [
    "A bottom sheet that is an IonModal without breakpoints (the planned fp.sheet component): pass it as enterAnimation through ionicAnimation(motion, createAnimation, '.modal-wrapper').",
  ],
  avoidWhen: [
    "Sheet modals with breakpoints: Ionic positions them through its own enter animation, which this would replace. Keep Ionic's default there.",
    'Sheets anchored to the bottom of the page content instead of the viewport (a defect found in an earlier mockup, #134).',
  ],
  accessibility: [
    'Focus moves into the sheet; Escape and the back button close it.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.sheet-exit', 'fp.motion.backdrop-enter'],
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

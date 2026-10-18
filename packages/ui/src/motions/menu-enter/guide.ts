import type { Guide } from '../../guides.ts';

export default {
  purpose: 'Opens the anchored overflow menu from the button that triggered it.',
  useWhen: [
    'An overflow menu anchored at the bottom and opening upward, such as from a bottom toolbar. Set transform-origin to the bottom corner of the anchor.',
  ],
  avoidWhen: [
    'Sheets and dialogs: use fp.motion.sheet-enter.',
    'Menus anchored at the top: they need a top-anchored version.',
    'Menus that open without a visible anchor.',
  ],
  accessibility: [
    'Focus moves into the menu when it opens, whatever the motion.',
    'Reduced motion: no animation; the end state applies at once.',
  ],
  related: ['fp.motion.menu-exit'],
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

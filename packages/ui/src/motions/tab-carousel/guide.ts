import type { Guide } from '../../guides.ts';

export default {
  purpose:
    'Horizontal carousel slide between adjacent section tabs (L101), supporting finger-follow gestures, flick velocity, and gesture-matched springback.',
  useWhen: [
    'Recipe section tabs at the top of a screen where swiping horizontally moves between tabs.',
  ],
  avoidWhen: [
    'Vertical scrolling content (touch-action: pan-y must preserve native vertical scroll).',
    'Starts within 24 px of screen edges (Android Back gesture margin).',
    'During active step dragging or within elements with horizontal scrolling.',
  ],
  accessibility: [
    'Panes remain mounted so draft values and form focus are preserved.',
    'Reduced motion: instant transition without sliding animation.',
    '48 px minimum touch targets for all tab controls.',
  ],
  related: ['fp.motion.highlight', 'fp.motion.sheet-enter'],
  decisions: [
    {
      label: 'L101: Navigation is A with swipeable section tabs',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label: 'ADR 0021: motion items',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
} satisfies Guide;

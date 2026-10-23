import type { Guide } from '../../guides.ts';

export default {
  purpose:
    'Horizontal carousel slide between adjacent section tabs (L101, L106, L117), supporting 1:1 finger-follow gestures, flick velocity, momentum continuation without zero-velocity restart, and animated settle.',
  useWhen: [
    'Recipe section tabs at the top of a screen where swiping horizontally moves between tabs.',
    'L106/L117 animated commit and velocity-matched settle continuation.',
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
    'Starting and adjacent panes remain revealed through settle, committing selection exactly once upon completion.',
  ],
  related: ['fp.motion.highlight', 'fp.motion.sheet-enter'],
  decisions: [
    {
      label: 'L101: Navigation is A with swipeable section tabs',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label:
        'L106: Tab carousel motion follows finger 1:1 and continues with release velocity without jumping',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
    {
      label: 'L117: A tab-carousel commit animates to final position',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
    {
      label: 'ADR 0021: motion items',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
} satisfies Guide;

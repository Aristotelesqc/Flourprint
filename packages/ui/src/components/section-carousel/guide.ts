import type { ComponentGuide } from '../../guides.ts';
import type { SectionCarouselProps } from '../../props.ts';

export default {
  purpose:
    'Horizontal swipeable carousel holding screens/panes of a recipe (Ingredients, Steps, Planning, History) with synchronized tab indicator.',
  useWhen: [
    'Navigation between adjacent peer sections within a single screen or recipe.',
    'L101 horizontal gesture navigation with top tappable tabs.',
  ],
  avoidWhen: [
    'Primary screen navigation: use fp.bottom-bar.',
    'Arbitrary multi-step wizard flows with non-linear transitions.',
  ],
  accessibility: [
    'Panes maintain per-panel independent scroll offsets.',
    'Inactive panes are marked inert and aria-hidden to keep offscreen content out of the tab and accessibility trees.',
    'Swipe gestures are excluded within 24px of screen edges to prevent conflicts with OS edge navigation gestures.',
    'Vertical scrolling takes priority unless a horizontal gesture is established.',
    'Under reduced motion, horizontal drag animation is disabled and section transitions complete instantaneously.',
  ],
  related: ['fp.tabs', 'fp.bottom-bar'],
  decisions: [
    {
      label: 'L101: top tappable tabs and horizontal carousel navigation',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
    {
      label: 'ADR 0021: theme builder, component sourcing, motion items and guides',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
    {
      label: 'ADR 0020: versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
  ],
  props: {
    sections: 'Readonly array of section identifiers.',
    activeSection:
      'Optional controlled active section identifier. When omitted, the component is uncontrolled.',
    defaultSection: 'Optional initial section identifier for uncontrolled usage.',
    onChangeSection:
      'Optional callback invoked when section changes due to swipe or external action.',
    label: 'Accessible name for the carousel container.',
    reduced: 'Optional boolean flag indicating reduced motion preference.',
    onGestureProgress: 'Optional callback receiving real-time gesture progress during swipe.',
    targetTabsElement: 'Optional target element for dispatching tab gesture events.',
    children: 'Pane elements corresponding to each section.',
  },
} satisfies ComponentGuide<SectionCarouselProps>;

import type { ComponentGuide } from '../../guides.ts';
import type { SectionCarouselProps } from './props.ts';

export default {
  purpose:
    'Finger-tracked peer sections sharing one external vertical scroller and preserved mounted state.',
  useWhen: ['Recipe, Planning and History top-tab navigation with adjacent-pane previews.'],
  avoidWhen: ['Route navigation or a wizard with gated steps.'],
  accessibility: [
    'Inactive panes remain mounted, inert and hidden from assistive technology.',
    'Vertical scrolling, editable controls, step handles and Android Back edges keep their gestures.',
    'Reduced motion changes the section instantly without sliding.',
    'The caller retains independent panel scroll positions in its existing scroller.',
  ],
  related: ['fp.tabs', 'fp.motion.tab-carousel'],
  decisions: [
    {
      label: 'L101/L106/L117: approved navigation A',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
  ],
  props: {
    className: 'Optional container utilities.',
    sections: 'Ordered section identifiers.',
    activeSection: 'Controlled selected section.',
    onChangeSection: 'Commits selection once the slide has settled.',
    label: 'Localized accessible carousel label.',
    children: 'One mounted child for each section.',
    disabled: 'Prevents carousel gestures while another interaction owns them.',
    control: 'Optional imperative section-selection and cancellation handle.',
    scrollElement: 'The existing external vertical scroller.',
    getScrollPosition: 'Reads the remembered scroll position of an incoming section.',
    onGestureProgress: 'Links the measured tab indicator to tracking and settling.',
    onBeforeChange: 'Commits the caller’s active input through its existing blur path.',
  },
} satisfies ComponentGuide<SectionCarouselProps>;

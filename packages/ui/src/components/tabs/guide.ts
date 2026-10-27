import type { ComponentGuide } from '../../guides.ts';
import type { TabsProps } from './props.ts';

const guide: ComponentGuide<TabsProps> = {
  purpose:
    'Accessible tabbed navigation strip that switches between alternate views while keeping all tab panels mounted.',
  useWhen: [
    'Partitioning related content into parallel views such as Ingredients, Timeline, and Baker Percentages.',
    'Retaining uncontrolled form input or scroll position across tab switches without remounting.',
    'Switching views within a single screen without changing routes or page URL.',
  ],
  avoidWhen: [
    'Step-by-step sequential wizards where previous steps must be completed before advancing.',
    'Top-level application navigation across distinct screen routes.',
  ],
  accessibility: [
    'Full WAI-ARIA tablist, tab, and tabpanel roles with roving tabIndex on tabs.',
    'Left and Right arrow keys wrap through enabled tabs with automatic selection and focus management.',
    'Home and End keys jump immediately to the first and last enabled tab.',
    'Inactive tab panels are marked hidden and inert to prevent focus and screen-reader access.',
    'Minimum 48px touch targets for each tab button with high-contrast active indicator border.',
  ],
  related: ['fp.motion.press'],
  decisions: [
    {
      label: 'ADR 0020: Versioned Component Library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0021: Theme Builder and Component Sourcing',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
    {
      label: 'ADR 0022: Port to App and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
    {
      label: 'Issue #168: Disclosure and Tabs Foundation',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/168',
    },
  ],
  props: {
    selected: 'Identifier of the currently active tab item.',
    onSelectedChange: 'Callback fired when a tab is selected with the selected tab identifier.',
    label:
      'Required localized accessible label describing the purpose of the tab list (applied as aria-label).',
    items:
      'Readonly list of tab items defining id, label, panel content, and optional disabled state.',
  },
};

export default guide;

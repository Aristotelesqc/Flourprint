import type { ComponentGuide } from '../../guides.ts';
import type { DisclosureProps } from './props.ts';

const guide: ComponentGuide<DisclosureProps> = {
  purpose:
    'Collapsible content section with an accessible trigger button, smooth grid-row animation, and preserved DOM state when closed.',
  useWhen: [
    'Organizing secondary or advanced settings that can be toggled open or closed.',
    'Preserving user form inputs or scroll position inside a collapsed section without remounting.',
    'Presenting progressive disclosure for detailed baking instructions, formula notes, or logs.',
  ],
  avoidWhen: [
    'Switching between mutually exclusive top-level views (use Tabs or navigation instead).',
    'Modal confirmation dialogues or transient popovers.',
  ],
  accessibility: [
    'Trigger button exposes aria-expanded and aria-controls bound to the collapsible container ID.',
    'Rotates a purely decorative CSS border chevron from 45° to 225° driven by fp.motion.chevron without icons or emoji.',
    'Collapsed panel is marked inert and aria-hidden to prevent keyboard navigation and screen-reader access.',
    'Focus automatically returns to the trigger header without scrolling if collapsed while focus was inside the content.',
    'Minimum 48px touch target on the toggle trigger conforming to mobile accessibility standards.',
    'Respects prefers-reduced-motion media query and ancestor data-motion attributes to eliminate motion for reduced-motion users.',
  ],
  related: ['fp.motion.disclosure', 'fp.motion.chevron'],
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
    expanded: 'Controlled boolean indicating whether the collapsible content is currently open.',
    onExpandedChange:
      'Callback fired when the user toggles the disclosure button with the next expanded boolean.',
    label: 'Primary header content displayed on the toggle button.',
    summary: 'Optional supporting text or node displayed below the primary label.',
    children:
      'Content rendered inside the collapsible section, kept mounted to preserve uncontrolled input state.',
    id: 'Optional base HTML identifier used to link the trigger button and collapsible region.',
    disabled: 'Whether the toggle button is disabled and non-interactive.',
  },
};

export default guide;

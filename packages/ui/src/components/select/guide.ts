import type { ComponentGuide } from '../../guides.ts';
import type { SelectProps } from './props.ts';

const guide: ComponentGuide<SelectProps> = {
  purpose:
    'Anchored popover overlay attached to the form field frame for choosing a single value from options, committing immediately upon selection.',
  useWhen: ['Selecting a single item from a discrete set of 3 to 15 choices.'],
  avoidWhen: [
    'Choosing between 2 mutually exclusive binary options (use a switch or radio pair).',
    'Selecting from very large datasets requiring search filtering (use a search or combobox component).',
  ],
  accessibility: [
    'Stacked label associated with the control with full aria-describedby support for descriptions and errors.',
    'Disabled options remain visible but cannot be selected (Ionic popover interface does not support navigating to disabled options).',
    'Accessible min-h-touch touch target and aria-invalid on the underlying select control.',
    'Visible outer field frame displays canonical 2px outline focus ring via focus-within:fp-focus-ring across shadow DOM when the internal button receives focus.',
    'Ionic popover interface commits selection immediately on option tap or keyboard selection, without explicit confirmation buttons.',
  ],
  props: {
    value: 'Selected option identifier or undefined when no selection has been made.',
    options:
      'Readonly array of selectable options with id, localized label, and optional disabled state.',
    label: 'Localized label describing the select field.',
    placeholder: 'Optional localized placeholder text shown when no option is selected.',
    cancelText:
      'Forwarded compatibility prop unused by the popover interface (options commit immediately without explicit cancel buttons).',
    okText:
      'Forwarded compatibility prop unused by the popover interface (options commit immediately without explicit confirmation buttons).',
    disabled: 'Whether the select input field is interactive or disabled.',
    onValueChange: 'Callback fired when the user selects a valid enabled option.',
    description: 'Optional descriptive help text displayed beneath the field.',
    error: 'Optional validation error message displayed with alert styling below the field.',
  },
  related: ['fp.floating-menu', 'fp.button'],
  decisions: [
    {
      label: 'ADR 0021: Theme builder and component sourcing',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
    {
      label: 'Issue #168: Ionic overlay foundation',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/168',
    },
  ],
};

export default guide;

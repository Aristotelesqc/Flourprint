import type { ComponentGuide } from '../../guides.ts';
import type { NumberFieldProps } from './props.ts';

const numberFieldGuide: ComponentGuide<NumberFieldProps> = {
  purpose:
    'Controlled raw-string text input for localized, editable numeric measurements and parameters.',
  useWhen: [
    'Entering or editing recipe weights, baker percentages, temperatures, durations or counts.',
    'Accepting locale-specific numeric strings (including comma decimals) without premature parsing.',
  ],
  avoidWhen: [
    'Editing freeform narrative text or prose; use a text field or textarea.',
    'Selecting among predefined discrete options; use segmented controls or pickers.',
  ],
  accessibility: [
    'Associates visible label with input via explicit htmlFor and id.',
    'Links help text and validation messages via aria-describedby and marks invalid states with aria-invalid.',
    'Announces validation errors politely using role="status" and aria-live="polite".',
    'Ensures minimum 48px touch target and wraps labels/units to prevent overflow on 360px screens.',
  ],
  related: ['fp.surface', 'fp.button'],
  decisions: [
    {
      label: 'ADR 0020: Versioned component library mechanism',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
  ],
  props: {
    label: 'Descriptive ReactNode label associated with the input element.',
    value: 'Raw string representation of the numeric value in current locale.',
    onValueChange: 'Callback invoked with uncommitted raw string whenever input text changes.',
    unit: 'Optional trailing unit indicator such as g, %, °C, or min.',
    help: 'Optional assistive guidance rendered below the input field.',
    error: 'Optional validation error message rendered below the input field in error styling.',
    invalid:
      'Whether the field is in an invalid error state; automatically true when error is present.',
    disabled: 'Whether the input is disabled and non-interactive.',
    readOnly: 'Whether the input text is selectable but non-editable.',
    required: 'Whether completion of this numeric field is mandatory.',
    inputMode:
      'Virtual keyboard layout hint: decimal (default for measurements) or numeric (integers).',
    id: 'Optional HTML id attribute for the input; falls back to an internal useId identifier.',
    name: 'Optional form field name for submission or form identification.',
    placeholder: 'Optional hint text displayed when the input value is empty.',
    onBlur: 'Optional focus loss event handler.',
    onKeyDown: 'Optional keyboard interaction event handler.',
    className: 'Optional CSS class overrides applied to the outer field container.',
  },
};

export default numberFieldGuide;

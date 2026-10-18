import type { ComponentGuide } from '../../guides.ts';
import type { NumberFieldProps } from '../../props.ts';

export default {
  purpose:
    'A numeric input that keeps the raw text while typing and commits a parsed number, with its unit and an error message.',
  useWhen: ['Every editable quantity: grams, percentages, durations, temperatures.'],
  avoidWhen: ['Read-only values: use fp.metric-pill or plain text.'],
  accessibility: [
    'Decimal keyboard; aria-invalid and the error message (role alert) describe a refused value.',
    'The unit is shown but hidden from screen readers when the label already names it.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.ingredient-row', 'fp.hero-summary'],
  decisions: [
    {
      label: 'Raw input preserved while editing (#35)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/35',
    },
    {
      label: 'ADR 0020: versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
  ],
  props: {
    compact: 'Smaller layout for rows.',
    hint: 'Optional help text under the field.',
    value: 'Committed number shown when not editing.',
    label: 'Accessible label.',
    unit: 'Unit text such as g or %.',
    unitPosition: "'prefix' or 'suffix' (default) for the unit.",
    locale: "'fr' or 'en' decimal separator.",
    onCommit:
      'Called with the parsed value; returning false keeps the raw text and shows the error.',
    onValidityChange: 'Called when the raw text becomes valid or invalid.',
    disabled: 'Disables editing.',
    dataTestId: 'Test id for browser suites.',
    errorMessage: 'Message shown when a value is refused.',
    resetKey: 'Changing it discards the raw text and shows value again.',
    displayDigits: 'Fraction digits shown when not editing.',
  },
} satisfies ComponentGuide<NumberFieldProps>;

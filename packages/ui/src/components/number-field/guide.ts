import type { ComponentGuide } from '../../guides.ts';
import type { NumberFieldProps } from '../../props.ts';

export default {
  purpose:
    'A numeric input that keeps the raw text while typing and commits a parsed number, with its unit and an error message.',
  useWhen: ['Every editable quantity: grams, percentages, durations, temperatures.'],
  avoidWhen: ['Read-only values: use fp.metric-pill or plain text.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'Decimal keyboard; aria-invalid and the error message (role alert) describe a refused value or syntax error across distinct parse and refusal error paths.',
    'The unit adornment is always aria-hidden; include the unit in label or hint so its meaning remains accessible.',
    'The input preserves a real 48 px touch target (var(--fp-spacing-touch)) without reducing typography, even in compact row layouts (L123).',
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
    onClear:
      'Optional callback when clearing a finite value in an optional field; returning false keeps the field in error.',
    onValidityChange:
      'Receives true for an invalid or refused value and false after valid input/reset; it reports invalidity, despite its name.',
    onDirtyChange:
      'Receives true when uncommitted raw text differs from the committed value, and false after commit, reset, or unmount.',
    disabled: 'Disables editing.',
    dataTestId: 'Test id for browser suites.',
    errorMessage: 'Message shown for syntax or parse errors, or as fallback for refused values.',
    commitErrorMessage:
      'Optional engine refusal reason shown when onCommit or onClear returns false (L121). An empty string clears stale domain errors.',
    onTextChange: 'Optional callback invoked with the raw text on every change.',
    resetKey: 'Changing it discards the raw text and shows value again.',
    displayDigits:
      'Maximum fraction digits for formatted display (default 2); accepted values keep their precision until the consumer changes them.',
  },
} satisfies ComponentGuide<NumberFieldProps>;

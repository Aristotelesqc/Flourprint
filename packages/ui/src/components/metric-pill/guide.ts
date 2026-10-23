import type { ComponentGuide } from '../../guides.ts';
import type { MetricPillProps } from '../../props.ts';

export default {
  purpose:
    'A compact pill showing one value, with an optional pictogram and label, such as hydration or dough weight on a recipe card.',
  useWhen: ['Short derived values in cards and summaries.'],
  avoidWhen: ['Editable values: use fp.number-field.', 'Status words: use fp.badge.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The value is text with tabular figures; the pictogram is decorative.',
    'Pass a label when the pictogram alone would carry the meaning.',
    'Compact 32 px (2 rem) height aligns with neighboring metadata and controls without empty vertical margin.',
  ],
  related: ['fp.icon', 'fp.recipe-card', 'fp.hero-summary'],
  decisions: [
    {
      label: 'Owner: round 2 is the visual baseline (#134)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label: 'ADR 0020: versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
  ],
  props: {
    value: 'Formatted value with its unit, from the consumer.',
    label: 'Optional text before the value.',
    icon: 'Optional pictogram name from fp.icon.',
    compact:
      'Optional density flag for tighter inline padding (0.35rem) and 32px height in metadata contexts.',
  },
} satisfies ComponentGuide<MetricPillProps>;

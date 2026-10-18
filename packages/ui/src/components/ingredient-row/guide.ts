import type { ComponentGuide } from '../../guides.ts';
import type { IngredientRowProps } from '../../props.ts';

export default {
  purpose:
    "One ingredient of a step: name, grams, baker's percentage, optional note and its weighing checkbox.",
  useWhen: ['Ingredient lists by step, in reading, weighing and editing modes.'],
  avoidWhen: ['Values not tied to one ingredient.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'Grams and percentage are text with tabular figures; the checkbox has its own label.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.weighing-checkbox', 'fp.number-field', 'fp.group-card'],
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
    id: 'Ingredient id, for keys and tests.',
    name: 'Ingredient name.',
    gramsText: 'Formatted grams.',
    pctText:
      'Formatted percentage with its explicit basis (baker percentage or share of flour); the component computes neither.',
    note: 'Optional note such as the share in a component.',
    checked: 'Weighed state.',
    onToggle:
      'Called by the checkbox or the non-editing row body; the quantity/end cell stops propagation.',
    checkLabel: 'Label of the weighing checkbox.',
    editing: 'Shows the edit controls passed as children.',
    children: 'Edit controls while editing.',
  },
} satisfies ComponentGuide<IngredientRowProps>;

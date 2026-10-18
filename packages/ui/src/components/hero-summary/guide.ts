import type { ComponentGuide } from '../../guides.ts';
import type { RecipeSummaryProps } from '../../props.ts';

export default {
  purpose:
    "The recipe's summary tiles: total flour, dough, hydration, fats and sugars, with a notice when a value is partial.",
  useWhen: ["At the top of a recipe's Ingredients section."],
  avoidWhen: ['Lists of single values elsewhere: use fp.metric-pill.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'Each tile is label plus value text; partial values say so in words.',
    'Help buttons carry their labels.',
  ],
  related: ['fp.metric-pill', 'fp.number-field', 'fp.warning-banner'],
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
    editor: 'Optional editor shown in the hydration tile while editing.',
    metrics: 'Tiles with label, value, optional detail and pictogram, formatted by the consumer.',
    notice: 'Optional partial-value notice.',
    onHelp: 'Opens the explanation of the values.',
    helpLabel: 'Accessible name of the help button.',
    onSizeHelp: 'Optional: opens the explanation of the dough size.',
    sizeHelpLabel: 'Accessible name of that button.',
  },
} satisfies ComponentGuide<RecipeSummaryProps>;

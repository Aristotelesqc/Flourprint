import type { ComponentGuide } from '../../guides.ts';
import type { ContextTilesProps } from '../../props.ts';

export default {
  purpose:
    'A two-column contextual facts tile grid for live process and preparation states, restoring Round 2 contextual tiles.',
  useWhen: [
    'Displaying secondary contextual metrics and operational facts alongside a dominant hero or preparation view.',
  ],
  avoidWhen: [
    'Dominant preparation countdowns: use fp.prep-hero.',
    'Grouped collapsible lists: use fp.group-card.',
    'Single metric displays: use fp.metric-pill.',
  ],
  accessibility: [
    'Page-anchored presentation stays flat; painted tile surfaces are opaque without decorative gradients or fake progress bars (elevation rule, ADR 0021).',
    'Section has accessible name from label; tiles present semantic label and value pairs with tabular figures.',
    'Optional tile actions are native buttons with accessible names; no nested interactive controls or clickable card wrappers.',
  ],
  related: ['fp.prep-hero', 'fp.surface'],
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
    label: 'Accessible name for the section landmarks grouping the contextual tiles.',
    items:
      'Read-only list of fact items with id, label, formatted value, optional detail, optional pictogram, and optional action button.',
  },
} satisfies ComponentGuide<ContextTilesProps>;

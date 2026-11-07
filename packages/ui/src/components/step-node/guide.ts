import type { ComponentGuide } from '../../guides.ts';
import type { StepNodeProps } from './props.ts';

const stepNodeGuide: ComponentGuide<StepNodeProps> = {
  purpose:
    'Presents an authored step as a compact tonal card with an operation badge, details and actions.',
  useWhen: ['Showing the steps of a Recipe in reading or editing mode.'],
  avoidWhen: ['Showing time placement across parallel lanes.'],
  accessibility: [
    'The operation glyph is decorative. Supply a complete localized title.',
    'Narrow cards give the title the full width beside the badge. Actions move below it and details span the card.',
    'Give each action a localized accessible name and an independent 48 px touch target. Provide a keyboard path to reorder.',
    'Use the same component for the row and its inert drag overlay to keep their geometry equal.',
  ],
  related: ['fp.sortable-list', 'fp.bottom-sheet'],
  decisions: [
    {
      label: 'Owner-selected compact step presentation (#133)',
      url: 'https://github.com/Aristotelesqc/Flourprint/pull/133',
    },
  ],
  props: {
    number: 'Optional authored ordinal.',
    icon: 'Optional decorative operation glyph.',
    label: 'Localized step name.',
    details: 'Compact metadata such as duration.',
    actions: 'Separate edit and reorder controls supplied by the caller.',
    highlighted: 'Emphasizes the step selected by the caller.',
    children: 'Optional detail content below the metadata.',
  },
};

export default stepNodeGuide;

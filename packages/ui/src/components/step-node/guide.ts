import type { ComponentGuide } from '../../guides.ts';
import type { StepRowProps } from '../../props.ts';

export default {
  purpose:
    'One step of the process as a numbered node with its details, actions, and owner-selected compact presentation.',
  useWhen: [
    'Step lists in Recipe, Planning and Preparation.',
    'Compact row presentation is the owner-selected default (#133); legacy rail and outline variants remain renderable via ancestor [data-step-design="rail"|"outline"] for historical comparison.',
  ],
  avoidWhen: ['Time placement across parallel lanes: use fp.timeline.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque tonal cards (ADR 0021 elevation rule).',
    'The node pictogram and badge are decorative. Supply state words in details or surrounding headings; state alone changes paint, not an accessible status label. The ordinal is included in the title when icon and number are present.',
    'Reorder controls (#123) need a keyboard path besides dragging.',
    'Touch target at least 48 px; painted controls remain compact (32-40 px) without internal layout dead space; actions maintain edge clustering with 48px hit targets (ADR 0021, #142).',
    'Intended layout behavior: discrete tonal cards with subtle border and outer row gap; metadata details row spans full available width across the badge gutter to avoid artificial wrapping constraints.',
    'Rail and outline alternatives remain available for historical comparison.',
  ],
  related: ['fp.timeline', 'fp.prep-hero'],
  decisions: [
    {
      label: 'Step move and reorder (#123)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/123',
    },
    {
      label: 'Owner: round 2 is the visual baseline (#134)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label: 'Owner: Compact row presentation selected (#133)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/133',
    },
  ],
  props: {
    icon: 'Optional pictogram for the operation.',
    number:
      'Optional position shown in the node; omitted for overlapping background steps such as preheat.',
    title: 'Step name.',
    details: 'Short detail texts (duration, temperature).',
    state: "'planned', 'running' or 'done'.",
    onEdit: 'Optional: opens the step editor.',
    editLabel: 'Accessible name of the edit button.',
    actions: 'Optional extra actions.',
    children: 'Optional content under the details.',
  },
} satisfies ComponentGuide<StepRowProps>;

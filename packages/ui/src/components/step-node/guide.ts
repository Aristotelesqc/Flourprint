import type { ComponentGuide } from '../../guides.ts';
import type { StepRowProps } from '../../props.ts';

export default {
  purpose:
    'One step of the process as a numbered node on a connected line, with its details and actions.',
  useWhen: ['Step lists in Recipe, Planning and Preparation.'],
  avoidWhen: ['Time placement across parallel lanes: use fp.timeline.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'The node pictogram is decorative. Supply state words in details or surrounding headings; state alone changes paint, not an accessible status label. The ordinal is included in the title when icon is present.',
    'Reorder controls (#123) need a keyboard path besides dragging.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
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
  ],
  props: {
    icon: 'Optional pictogram for the operation.',
    number: 'Position shown in the node.',
    title: 'Step name.',
    details: 'Short detail texts (duration, temperature).',
    state: "'planned', 'running' or 'done'.",
    onEdit: 'Optional: opens the step editor.',
    editLabel: 'Accessible name of the edit button.',
    actions: 'Optional extra actions.',
    children: 'Optional content under the details.',
  },
} satisfies ComponentGuide<StepRowProps>;

import type { ComponentGuide } from '../../guides.ts';
import type { StepRowProps } from '../../props.ts';

export default {
  purpose:
    'One step of the process as a numbered node with its details, actions, and proposed review layout alternatives.',
  useWhen: [
    'Step lists in Recipe, Planning and Preparation.',
    'Exploring density and hierarchy options via ancestor [data-step-design="compact"|"rail"|"outline"] (compact serves as technical fallback).',
  ],
  avoidWhen: ['Time placement across parallel lanes: use fp.timeline.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The node pictogram and badge are decorative. Supply state words in details or surrounding headings; state alone changes paint, not an accessible status label. The ordinal is included in the title when icon and number are present.',
    'Reorder controls (#123) need a keyboard path besides dragging.',
    'Touch target at least 48 px; painted controls remain compact without layout dead space; font-relative narrow query (<=19rem) stacks action controls into a single 48px column and lets details span the badge gutter with compact metadata pills to prevent multiline wrapping and title overlap (ADR 0021, #142).',
    'Proposed alternatives (compact, rail, outline) preserve identical semantic DOM, labeling, and reachable actions with natural wrapping at 360px / 130% zoom without truncation.',
    'Alternatives are proposals for owner review and arbitration, not accepted decisions.',
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

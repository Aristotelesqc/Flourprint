import type { ComponentGuide } from '../../guides.ts';
import type { StatusPanelProps } from '../../props.ts';

export default {
  purpose: 'A message about the state of a calculation or a value: partial, unavailable or fine.',
  useWhen: ['Partial composition, model limits, missing data.'],
  avoidWhen: ['Short statuses: use fp.badge.', 'Errors on a field: fp.number-field shows its own.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The status is stated in the title or message, not only by colour or pictogram.',
  ],
  related: ['fp.badge', 'fp.hero-summary'],
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
    embedded:
      'Hides the title/pictogram header only; message and children remain. Include the status meaning in message when true.',
    title: 'Short title.',
    status: "'ok', 'warning' or 'unavailable'.",
    message: 'Explanation.',
    children: 'Optional extra content.',
  },
} satisfies ComponentGuide<StatusPanelProps>;

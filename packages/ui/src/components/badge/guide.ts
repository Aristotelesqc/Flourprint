import type { ComponentGuide } from '../../guides.ts';
import type { BadgeProps } from '../../props.ts';

export default {
  purpose: 'A short status word, such as Draft, Ready or Running.',
  useWhen: ['Statuses on cards, rows and headers.'],
  avoidWhen: ['Values with units: use fp.metric-pill.', 'Long messages: use fp.warning-banner.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The status is the text; the colour variant only reinforces it.',
  ],
  related: ['fp.metric-pill', 'fp.recipe-card'],
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
    children: 'The status text from a message key.',
    variant: "'default', 'primary', 'warning', 'success' or 'danger'.",
  },
} satisfies ComponentGuide<BadgeProps>;

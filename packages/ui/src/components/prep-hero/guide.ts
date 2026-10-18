import type { ComponentGuide } from '../../guides.ts';
import type { PreparationTimerProps } from '../../props.ts';

export default {
  purpose:
    'The dominant block of a running preparation: current step, time remaining, start and end, progress and instructions.',
  useWhen: ['At the top of the Preparation screen, once.'],
  avoidWhen: ['Planned steps not yet running: use fp.step-node.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'Remaining time is text; progress also has a label.',
    'No rolling numbers and no action delayed behind an animation (DESIGN.md).',
  ],
  related: ['fp.step-node', 'fp.timeline'],
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
    remainingLabel: 'Optional label above the remaining time.',
    title: 'Current step.',
    remaining: 'Formatted remaining time.',
    start: 'Formatted start time.',
    end: 'Formatted planned end.',
    progress: 'Progress from 0 to 1.',
    labels: 'Texts for the start, end and progress labels.',
    instruction: 'Optional instruction for the current step.',
    conditions:
      'Optional condition items with label, value and sub text (for example temperature or vessel).',
  },
} satisfies ComponentGuide<PreparationTimerProps>;

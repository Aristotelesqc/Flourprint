import type { ComponentGuide } from '../../guides.ts';
import type { TimelineProps } from '../../props.ts';

export default {
  purpose:
    'Horizontal lanes that place the steps of a plan on one time axis, so parallel work (a poolish resting while a tangzhong cooks) reads at a glance.',
  useWhen: ['Planning views that show when steps run relative to each other.'],
  avoidWhen: [
    'Exact times the baker acts on: list them with fp.step-node.',
    'Computing schedules: the consumer supplies display positions derived from its projection; the library has no core dependency.',
  ],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    "Each event's label and range are text, not only bar position.",
    'Lanes keep their order for screen readers; colour is never the only cue.',
  ],
  related: ['fp.step-node', 'fp.prep-hero'],
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
    startLabel: "Text at the start of the axis, such as the plan's start time.",
    endLabel: 'Text at the end of the axis.',
    lanes:
      'Rows of events: id, label and events with id, label, range text and start/end positions in percent of the axis.',
  },
} satisfies ComponentGuide<TimelineProps>;

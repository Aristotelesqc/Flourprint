import type { ComponentGuide } from '../../guides.ts';
import type { DisclosureProps } from '../../props.ts';

export default {
  purpose:
    "A card with a header that opens and closes its content, such as a step group or a component's ingredients.",
  useWhen: ['Groups whose detail is not always needed.'],
  avoidWhen: ['Content the baker always needs in view.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'The header is a button with aria-expanded and aria-controls; closed content is inert.',
    'Provide a textual subtitle describing the status; the warning/check pictogram alone is decorative.',
  ],
  related: ['fp.surface', 'fp.motion.disclosure', 'fp.motion.chevron'],
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
    title: 'Header text.',
    subtitle: 'Optional secondary text.',
    badge: 'Optional short text at the end of the header.',
    defaultOpen: 'Initial open state when uncontrolled.',
    open: 'Optional controlled open state (drives expanded, inert, and motion).',
    onOpenChange: 'Callback fired when header toggles the open state.',
    status: "Optional 'warning' or 'success' tone.",
    children: 'Content shown when open.',
  },
} satisfies ComponentGuide<DisclosureProps>;

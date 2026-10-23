import type { ComponentGuide } from '../../guides.ts';
import type { IconProps } from '../../props.ts';

export default {
  purpose:
    'Stock Ionicons outline pictograms as inline SVG following text colour; source mappings are pinned in v1.tsx with the upstream MIT license.',
  useWhen: ['Inside other components, or next to text that names the same thing.'],
  avoidWhen: ['As the only content of a control: use fp.icon-button, which carries a label.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    "Always aria-hidden: meaning comes from nearby text or the control's label.",
  ],
  related: ['fp.icon-button', 'fp.metric-pill'],
  decisions: [
    {
      label: 'Pictogram sourcing inventory (ADR 0021); Ionicons outline selected for this round',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/architecture/2026-10-17-component-sourcing-inventory.md',
    },
  ],
  props: {
    name: 'Pictogram name from the closed IconName set.',
    size: 'CSS size of the square; defaults to 1.125rem.',
    className: "Extra class for the consumer's layout.",
  },
} satisfies ComponentGuide<IconProps>;

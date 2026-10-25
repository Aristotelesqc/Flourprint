import type { ComponentGuide } from '../../guides.ts';
import type { ButtonProps } from './props.ts';

const buttonGuide: ComponentGuide<ButtonProps> = {
  purpose: 'Triggers an immediate action, workflow step or state transition.',
  useWhen: [
    'Submitting forms, confirming operations or initiating workflow transitions.',
    'Navigation or tool operations where an explicit press action is required.',
  ],
  avoidWhen: [
    'Displaying purely informative content without an action; use Surface instead.',
    'Selecting between persistent mutually exclusive modes; use segmented controls or tabs.',
  ],
  accessibility: [
    'Renders a minimum 48px touch target with a centered 40px visual pill.',
    'Emits standard focus outlines via fp-focus and respects reduced-motion preferences.',
    'Maintains legible text contrast across all variants, including neutral disabled states.',
  ],
  related: ['fp.surface', 'fp.motion.press'],
  decisions: [
    {
      label: 'ADR 0020: Versioned component library mechanism',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0021: Theme builder and component sourcing',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
  ],
  props: {
    ref: 'React reference to the native button; supports object and callback refs with cleanup.',
    children: 'Action label or inline content displayed inside the button.',
    variant:
      'Visual priority: primary (call to action), secondary (standard action), quiet (borderless tool), or danger (destructive action).',
    icon: 'Optional leading graphic element accompanying the text label.',
    fullWidth: 'Whether the button expands horizontally to fill its parent container width.',
  },
};

export default buttonGuide;

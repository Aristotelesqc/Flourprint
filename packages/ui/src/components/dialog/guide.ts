import type { ComponentGuide } from '../../guides.ts';
import type { DialogProps } from './props.ts';

const guide: ComponentGuide<DialogProps> = {
  purpose:
    'Floating modal overlay centered in the viewport for critical prompts, alerts, and focused decisions.',
  useWhen: [
    'Confirming destructive actions, displaying urgent alerts, or asking for explicit user decisions.',
  ],
  avoidWhen: [
    'Presenting complex multi-step forms or long scrollable data entry (use fp.bottom-sheet instead).',
    'Providing small anchored action lists (use fp.floating-menu instead).',
  ],
  accessibility: [
    'Floating modal host sets accessible name via aria-labelledby and traps focus while open.',
    'Preserves focused inputs and autofocus without stealing focus to close button.',
    'Supports keyboard Escape dismissal routing through canDismiss guards.',
    'Touch targets for controls adhere to min-h-touch (48px).',
  ],
  props: {
    isOpen: 'Controlled boolean determining whether the dialog is presented.',
    title: 'Localized title string displayed in the dialog header and linked to host.',
    closeLabel: 'Localized accessible label for the dialog close button.',
    onDismiss: 'Callback invoked only after the dialog finishes dismissal.',
    children: 'Body content displayed within the dialog.',
    footer: 'Optional footer container for confirmation or cancellation actions.',
    canDismiss: 'Optional boolean or promise-returning predicate guarding against dismissal.',
    reducedMotion: 'Optional explicit override for reduced motion animations.',
  },
  related: ['fp.bottom-sheet', 'fp.button', 'fp.motion.sheet-enter', 'fp.motion.sheet-exit'],
  decisions: [
    {
      label: 'ADR 0021: Theme builder and component sourcing',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
    {
      label: 'Issue #168: Ionic overlay foundation',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/168',
    },
  ],
};

export default guide;

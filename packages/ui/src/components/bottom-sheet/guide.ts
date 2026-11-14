import type { ComponentGuide } from '../../guides.ts';
import type { BottomSheetProps } from './props.ts';

const guide: ComponentGuide<BottomSheetProps> = {
  purpose:
    'Floating sheet overlay docked to the viewport bottom for workflows, long forms, and secondary tasks.',
  useWhen: [
    'Presenting multi-step tasks, editors, or detailed selection interfaces on mobile or desktop.',
    'Displaying content requiring viewport height capabilities with native breakpoint gestures.',
  ],
  avoidWhen: [
    'Displaying brief binary confirmations or alerts (use fp.dialog instead).',
    'Showing short anchored action lists (use fp.floating-menu instead).',
  ],
  accessibility: [
    'Floating modal host sets accessible name via aria-labelledby and traps focus while presented.',
    'Preserves autofocus behavior on child inputs without prematurely stealing focus to close control.',
    'Provides a minimum 48px touch target for the close button.',
    'Supports keyboard Escape dismissal in browser environments; hardware back navigation is delegated to Ionic Layer 2 and requires native device evidence.',
    'Retains native Ionic sheet transition for breakpoint positioning and drag gesture tracking. The overlay motion bridge controls duration and easing via fp.motion.sheet-enter, fp.motion.sheet-exit, fp.motion.backdrop-enter, and fp.motion.backdrop-exit while native keyframes carry geometry. Native drag is a paused gesture animation; drag dismissal has no separate sheet-exit animation. Reduced motion sets duration to 0 via animated={false} or motion timing.',
  ],
  props: {
    isOpen: 'Controlled boolean determining whether the bottom sheet is presented.',
    title: 'Localized title string displayed in the sheet header and linked to host.',
    closeLabel: 'Localized accessible label for the header close button.',
    onDismiss: 'Callback invoked only after the sheet completes dismissal.',
    children: 'Main body content rendered inside the scrollable sheet container.',
    footer: 'Optional bottom footer container for primary action buttons or summaries.',
    canDismiss: 'Optional boolean or promise-returning predicate guarding against dismissal.',
    reducedMotion: 'Optional explicit override for reduced motion animations.',
  },
  related: [
    'fp.dialog',
    'fp.button',
    'fp.motion.sheet-enter',
    'fp.motion.sheet-exit',
    'fp.motion.backdrop-enter',
    'fp.motion.backdrop-exit',
  ],
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

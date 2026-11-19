import type { ComponentGuide } from '../../guides.ts';
import type { FloatingMenuProps } from './props.ts';

const guide: ComponentGuide<FloatingMenuProps> = {
  purpose: 'Floating overlay anchored to an opener button providing a list of contextual actions.',
  useWhen: [
    'Presenting overflow actions or secondary contextual operations attached to an anchored trigger button.',
  ],
  avoidWhen: [
    'Presenting primary navigation hierarchies (use navigation bars or drawer items).',
    'Displaying complex data entry forms with multiple fields (use fp.bottom-sheet or fp.dialog).',
  ],
  accessibility: [
    'Floating overlay maintains focus containment and restores focus to the opener element before executing action callbacks.',
    'Provides roving keyboard arrow navigation (Up/Down) with a single tabstop (tabindex 0), Home, and End support.',
    'Menu items use native semantic button elements with role="menuitem" and keep disabled actions visible.',
    'All touch targets adhere to minimum 48px touch guidelines without arbitrary sizing.',
    'Retains native Ionic popover animation to preserve dynamic anchor coordinate placement and viewport boundary clamping; timing (standard/reduced duration and easing) is bridged to fp.motion.menu-enter and fp.motion.menu-exit while native keyframes carry geometry.',
    'Under reduced motion, animated={false} eliminates animation; the pinned Ionic 9.0.6 patch also clears the native wrapper fade while preserving native placement. See patches/README.md.',
    'Escape dismissal and focus restoration are verified in browser environments; hardware back dismissal is delegated to Ionic Layer 2 and requires native device evidence.',
  ],
  props: {
    title: 'Accessible header title for the menu container and aria-labelledby reference.',
    closeLabel: 'Localized accessible label for the menu dismissal button.',
    actions:
      'Readonly array of action definitions with id, label, onSelect callback, and optional disabled/destructive flags.',
    triggerLabel: 'Localized accessible label for the opener button.',
    triggerContent:
      'Optional custom content or icon rendered inside the opener button; falls back to triggerLabel.',
    scrollHint:
      'Localized visible notice displayed when menu actions overflow the scrollable container.',
  },
  related: ['fp.button', 'fp.motion.menu-enter', 'fp.motion.menu-exit'],
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

import type { ComponentGuide } from '../../guides.ts';
import type { IconButtonProps } from '../../props.ts';

export default {
  purpose:
    'A button showing only a pictogram (or an image), with its label as accessible name and tooltip.',
  useWhen: [
    'Toolbars and headers: back, more, undo, close, navigation.',
    'Compact controls where space is constrained and pictogram meaning is standard and obvious.',
  ],
  avoidWhen: [
    'Actions whose pictogram is not obvious: use fp.button with text.',
    'Destructive actions without confirmation dialogs.',
  ],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'label is required and becomes aria-label and title for full screen reader and tooltip coverage.',
    'Touch target is an independent 48 px square box (--fp-spacing-touch); the visible material shape is 40 px (--fp-spacing-touch-compact) circular inset 4 px (half the difference between touch and touch-compact) using a decorative span (ADR 0021, #142).',
    'Recognisable active, hover, and focus states on the anchored shape (opaque --color-surface-container and outline ring).',
    'Disabled buttons receive disabled attribute, opacity 0.35, and pointer-events none.',
    'The consumer must check toolbar fit at 393 px / 100% and 360 px / 130%.',
  ],
  related: ['fp.icon', 'fp.button', 'fp.motion.press-icon'],
  decisions: [
    {
      label: 'Owner: round 2 is the visual baseline proposal (#134; not yet shipped on main)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
    {
      label: 'ADR 0020: versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0021: motion tokens and 48px hit target separation',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
  props: {
    icon: 'Pictogram name (IconName). Rendered when imageSrc is omitted.',
    imageSrc: 'Optional image shown instead of the pictogram (decorative, rounded square).',
    label: 'Required accessible name and tooltip (aria-label and title).',
    onClick: 'Callback invoked on button click/activation.',
    disabled: 'Disables the button; renders visually dimmed (opacity 0.35) and inert.',
    dataTestId: 'Test id for browser suites.',
    variant: "'default' (ink text/icon), 'primary', or 'danger'.",
  },
} satisfies ComponentGuide<IconButtonProps>;

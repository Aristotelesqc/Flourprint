import type { ComponentGuide } from '../../guides.ts';
import type { IconButtonProps } from '../../props.ts';

export default {
  purpose:
    'A button showing only a pictogram (or an image), with its label as accessible name and tooltip.',
  useWhen: ['Toolbars and headers: back, more, undo.'],
  avoidWhen: ['Actions whose pictogram is not obvious: use fp.button with text.'],
  accessibility: [
    'label is required and becomes aria-label and title.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.icon', 'fp.button', 'fp.motion.press-icon'],
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
    imageSrc: 'Optional image shown instead of the pictogram (decorative).',
    icon: 'Pictogram name.',
    label: 'Accessible name and tooltip.',
    onClick: 'Called on activation.',
    disabled: 'Disables the button.',
    dataTestId: 'Test id for browser suites.',
    variant: "'default', 'primary' or 'danger'.",
  },
} satisfies ComponentGuide<IconButtonProps>;

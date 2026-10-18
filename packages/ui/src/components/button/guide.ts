import type { ComponentGuide } from '../../guides.ts';
import type { ButtonProps } from '../../props.ts';

export default {
  purpose:
    "A text button, optionally with a leading pictogram. Primary for the screen's main action, secondary by default.",
  useWhen: ['Actions named by a verb in the infinitive (French UI).'],
  avoidWhen: [
    'Icon-only actions: use fp.icon-button.',
    'More than one primary button in the same view.',
  ],
  accessibility: [
    'type defaults to button, so it never submits by accident.',
    'Disabled buttons say why nearby when the reason is not obvious.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.icon-button', 'fp.motion.press'],
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
    variant: "'primary', 'secondary' (default), 'quiet' or 'danger' (menus only).",
    icon: 'Optional leading pictogram.',
    dataTestId: 'Test id for browser suites.',
    children: 'The label text from a message key.',
  },
} satisfies ComponentGuide<ButtonProps>;

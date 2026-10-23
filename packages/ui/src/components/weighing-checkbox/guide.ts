import type { ComponentGuide } from '../../guides.ts';
import type { CheckboxProps } from '../../props.ts';

export default {
  purpose: 'A weighing checkbox with a 48 px hit area and a compact 20 px visible box.',
  useWhen: ['Weighing lists and checklists during a preparation.'],
  avoidWhen: ['Settings that switch a mode on or off: use a toggle.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',

    'A native checkbox input with its label; hideLabel keeps it for screen readers.',
    'Unchecked boxes keep a 3:1 contrast in all three themes.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.ingredient-row', 'fp.motion.check'],
  decisions: [
    {
      label: 'Weighing lifetime, owner choice (#122)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/122',
    },
    {
      label: 'Owner: round 2 is the visual baseline (#134)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
  ],
  props: {
    hideLabel: 'Hides the label visually only.',
    checked: 'Checked state.',
    onChange: 'Called with the new state.',
    label: 'Label text.',
    disabled: 'Disables the checkbox.',
    dataTestId: 'Test id for browser suites.',
  },
} satisfies ComponentGuide<CheckboxProps>;

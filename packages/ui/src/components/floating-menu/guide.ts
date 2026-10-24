import type { ComponentGuide } from '../../guides.ts';
import type { MenuProps } from '../../props.ts';

export default {
  purpose: 'A small menu anchored to the button that opened it, for secondary actions.',
  useWhen: ['The more (…) actions of a screen, card or row.'],
  avoidWhen: ['Tasks with fields: use fp.bottom-sheet.'],
  accessibility: [
    'Native modal dialog anchored to its trigger; Escape and outside taps close it; focus restored for controlled close and conditional unmount.',
    'Compact close inline first action row; action layout is owned by the component even when .menu-actions wrapper is omitted.',
    'Floating layer: may be translucent (elevation rule).',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.bottom-sheet', 'fp.motion.menu-enter', 'fp.motion.menu-exit'],
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
    previewTrigger: 'Catalogue only: label of a button that opens a preview.',
    open: 'Open state.',
    onClose: 'Called when the menu asks to close.',
    title: 'Accessible name of the menu.',
    closeLabel: 'Accessible name of the close control.',
    anchor: "'bottom' (default) opens above the trigger, 'top' below it.",
    children: 'Menu items.',
    footer: 'Optional content after the items.',
  },
} satisfies ComponentGuide<MenuProps>;

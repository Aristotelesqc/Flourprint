import type { ComponentGuide } from '../../guides.ts';
import type { BottomBarProps } from './props.ts';

const bottomBarGuide: ComponentGuide<BottomBarProps> = {
  purpose:
    'Contextual actions at the screen bottom; Recipe draft actions stay in one constant-height overlay across Recipe, Planning and History, while reading Recipe has no permanent bottom bar (L31, L60).',
  useWhen: ['Once per screen, at the bottom.'],
  avoidWhen: ["Actions inside a sheet or a menu: put them in that component's footer."],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque through system insets, with padding inside the paint to keep hit areas clear of physical rounded corners (L25, ADR 0021).',
    'The toolbar/navigation landmark carries navigationLabel.',
    'Touch target at least 48 px width and height; visible control rhythm is compact without overlapping adjacent actions.',
    'At 360 px and 130% text scaling (L115), contextual toolbar actions fit without horizontal overflow; Discard, Undo/Redo and Save remain reachable in editing; time actions belong only to Planning with full >=48 px targets without clipped labels or empty padded rows.',
    'Keep the primary Save label fully readable on one row; approved icon-only Discard and history actions retain localized accessible names (L25, L60).',
  ],
  related: ['fp.button', 'fp.tabs'],
  decisions: [
    {
      label: 'Navigation A selected (L101 / #112)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/112',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
  ],
  props: {
    density:
      'Normal by default; compact reduces typography and spacing while retaining touch targets.',
    variant: "'A' (contextual toolbar; navigation A is selected under L101).",
    children: "The screen's contextual actions.",
    navigationLabel: 'Accessible name of the toolbar/navigation landmark.',
    className:
      'Optional classes applied to the toolbar container, without styling child internals.',
  },
};

export default bottomBarGuide;

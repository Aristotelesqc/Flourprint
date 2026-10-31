import type { ComponentGuide } from '../../guides.ts';
import type { BottomBarProps } from './props.ts';

const bottomBarGuide: ComponentGuide<BottomBarProps> = {
  purpose:
    'The bottom area of a screen: navigation A selects the contextual toolbar as a contextual toolbar (L101).',
  useWhen: ['Once per screen, at the bottom.'],
  avoidWhen: ["Actions inside a sheet or a menu: put them in that component's footer."],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The toolbar/navigation landmark carries navigationLabel.',
    'Touch target at least 48 px width and height; visible control rhythm is compact without overlapping adjacent actions.',
    'At 360 px and 130% text scaling (L115), contextual toolbar actions fit without horizontal overflow; Edit, Start/Resume, and overflow actions remain reachable with full >=48 px targets without clipped labels or empty padded rows.',
    'Labels use single-row ellipsis rather than mid-word wrapping (L25), preserving baseline alignment.',
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
    variant: "'A' (contextual toolbar; navigation A is selected under L101).",
    children: "The screen's contextual actions.",
    navigationLabel: 'Accessible name of the toolbar/navigation landmark.',
    className:
      'Optional classes applied to the toolbar container, without styling child internals.',
  },
};

export default bottomBarGuide;

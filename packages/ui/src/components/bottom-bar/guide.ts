import type { ComponentGuide } from '../../guides.ts';
import type { BottomBarProps } from '../../props.ts';

export default {
  purpose:
    'The bottom area of a screen: prototype selects navigation A as a contextual toolbar (L101). Legacy navigation B stays compatible but is not a current candidate.',
  useWhen: ['Once per screen, at the bottom.'],
  avoidWhen: ["Actions inside a sheet or a menu: put them in that component's footer."],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The navigation landmark carries navigationLabel; the selected destination is exposed as current.',
    'Touch target at least 48 px width and height; visible control rhythm is compact without overlapping adjacent destinations.',
    'At 360 px and 130% text scaling (L115), contextual toolbar actions fit without horizontal overflow; Save, Cancel, and overflow actions remain reachable with full >=48 px targets without clipped labels or empty padded rows.',
    'Labels use single-row ellipsis rather than mid-word wrapping (L25), preserving baseline alignment.',
  ],
  related: ['fp.button', 'fp.icon-button', 'fp.tabs'],
  decisions: [
    {
      label: 'Navigation A selected (L101 / #112)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/112',
    },
    {
      label: 'Owner: round 2 is the visual baseline (#134)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
  ],
  props: {
    variant:
      "'A' (contextual footer; prototype selects A under L101) or legacy 'B' (optional footer and destinations; stays compatible but not a candidate).",
    children: "The screen's contextual actions, in both variants.",
    destinations:
      'Legacy variant B only: destinations with id, label, pictogram, selected state, optional badge and onSelect.',
    navigationLabel: 'Accessible name of the navigation landmark.',
  },
} satisfies ComponentGuide<BottomBarProps>;

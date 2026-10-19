import type { ComponentGuide } from '../../guides.ts';
import type { BottomBarProps } from '../../props.ts';

export default {
  purpose:
    'The bottom area of a screen: navigation A is a contextual toolbar; navigation B can add stable destinations. The consumer places contextual controls in the header or footer; the component does not select the A/B design.',
  useWhen: ['Once per screen, at the bottom.'],
  avoidWhen: ["Actions inside a sheet or a menu: put them in that component's footer."],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'The navigation landmark carries navigationLabel; the selected destination is exposed as current.',
    'Touch target at least 48 px; visible control rhythm is compact without overlapping adjacent destinations.',
    'Labels use single-row ellipsis rather than mid-word wrapping (L25), preserving baseline alignment.',
  ],
  related: ['fp.button', 'fp.icon-button', 'fp.tabs'],
  decisions: [
    {
      label: 'Navigation A/B, owner choice (#112)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/112',
    },
    {
      label: 'Owner: round 2 is the visual baseline (#134)',
      url: 'https://github.com/Aristotelesqc/Flourprint/issues/134',
    },
  ],
  props: {
    variant:
      "'A' (contextual footer) or 'B' (optional footer and destinations), #112 remains an owner choice.",
    children: "The screen's contextual actions, in both variants.",
    destinations:
      'Variant B only: destinations with id, label, pictogram, selected state, optional badge and onSelect.',
    navigationLabel: 'Accessible name of the navigation landmark.',
  },
} satisfies ComponentGuide<BottomBarProps>;

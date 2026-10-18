import type { ComponentGuide } from '../../guides.ts';
import type { BottomBarProps } from '../../props.ts';

export default {
  purpose:
    'The bottom area of a screen: navigation A is a contextual toolbar; navigation B adds four stable destinations under the contextual controls.',
  useWhen: ['Once per screen, at the bottom.'],
  avoidWhen: ["Actions inside a sheet or a menu: put them in that component's footer."],
  accessibility: [
    'The navigation landmark carries navigationLabel; the selected destination is exposed as current.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
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
    variant: "'A' (contextual toolbar) or 'B' (contextual controls plus destinations), #112.",
    children: "The screen's contextual actions, in both variants.",
    destinations:
      'Variant B only: destinations with id, label, pictogram, selected state, optional badge and onSelect.',
    navigationLabel: 'Accessible name of the navigation landmark.',
  },
} satisfies ComponentGuide<BottomBarProps>;

import type { ComponentGuide } from '../../guides.ts';
import type { TabsProps } from '../../props.ts';

export default {
  purpose:
    'Switches between sections of one screen (Ingredients, Steps, Planning, History) or between filters.',
  useWhen: ['Two to five peer sections or filters.'],
  avoidWhen: ['Navigation between screens: use fp.bottom-bar.', 'A single on/off choice.'],
  accessibility: [
    'Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).',
    'Tablist with arrow-key navigation and roving focus; the selected tab is aria-selected.',
    'Narrow section and filter rows stay on one horizontal scroll strip; arrow/Home/End focus and selection changes scroll the option into view.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142). Tab labels do not break mid-word or wrap unevenly.',
  ],
  related: ['fp.bottom-bar'],
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
    variant: "'underlined' (sections), 'pills' or 'chips' (filters).",
    tabs: 'Tabs with id and label.',
    activeId: 'Id of the selected tab.',
    onChange: 'Called with the chosen id.',
    label: 'Accessible name of the tab list.',
  },
} satisfies ComponentGuide<TabsProps>;

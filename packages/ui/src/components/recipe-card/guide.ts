import type { ComponentGuide } from '../../guides.ts';
import type { RecipeCardProps } from '../../props.ts';

export default {
  purpose:
    'A recipe in the library: title, status, key values and, for a running preparation, a Resume action.',
  useWhen: ['The recipe library and search results.'],
  avoidWhen: ['Inside the recipe screen itself: use fp.hero-summary.'],
  accessibility: [
    'The whole card opens the recipe; Resume and other actions are separate buttons.',
    'The status is text (fp.badge style), not only colour.',
    'Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).',
  ],
  related: ['fp.metric-pill', 'fp.badge'],
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
    description: 'Optional short description.',
    selected: 'Highlights the selected template (template picker).',
    onResume: 'Optional: resumes the running preparation.',
    resumeLabel: 'Label of the Resume button.',
    title: 'Recipe name.',
    details: 'Optional short detail texts.',
    metrics: 'Optional values shown as pills.',
    status: 'Status text.',
    statusVariant: 'Tone of the status.',
    featured:
      'Highlights the card, as for a running preparation; the default status tone becomes success.',
    onOpen: 'Opens the recipe.',
    actions: 'Optional extra actions.',
  },
} satisfies ComponentGuide<RecipeCardProps>;

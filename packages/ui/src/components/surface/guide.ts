import type { ComponentGuide } from '../../guides.ts';
import type { SurfaceProps } from './props.ts';

const surfaceGuide: ComponentGuide<SurfaceProps> = {
  purpose: 'Provides an opaque, flat container for grouping sections, cards and content areas.',
  useWhen: [
    'Grouping related fields, instructions or summaries into distinct visual sections.',
    'Providing a structured, non-interactive background card for content presentation.',
  ],
  avoidWhen: [
    'Creating interactive buttons or list items; use Button or interactive card components.',
    'Layering arbitrary translucent blur or shadow effects outside the design tokens.',
  ],
  accessibility: [
    'Maintains high contrast between on-surface content and container backgrounds.',
    'Provides semantic grouping without imposing arbitrary heading levels on callers.',
  ],
  related: ['fp.button', 'fp.number-field'],
  decisions: [
    {
      label: 'ADR 0020: Versioned component library mechanism',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0022: Port to app and Tailwind',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md',
    },
  ],
  props: {
    children: 'Content and nested elements rendered inside the surface container.',
    variant:
      'Visual hierarchy level: surface (flat default), container (tonal flat section fill), or outlined (defined border).',
    padding: 'Internal spacing scale: compact (12px), normal (16px), or none.',
  },
};

export default surfaceGuide;

import type { ComponentGuide } from '../../guides.ts';
import type { SurfaceProps } from '../../props.ts';

export default {
  purpose:
    'A tonal container that groups content on the page, in the warm surface steps of each theme.',
  useWhen: ['Grouping related content when no more specific component fits.'],
  avoidWhen: ['Wrapping every value in its own raised box (DESIGN.md).'],
  accessibility: [
    'Anchored in the page, so opaque and flat (elevation rule, ADR 0021).',
    'Purely visual: add headings or landmarks in the content when needed.',
  ],
  related: ['fp.group-card', 'fp.hero-summary'],
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
    componentId: 'Id of the component this surface belongs to, for inspection.',
    componentVersion: 'Version of that component, for inspection.',
    children: 'Content.',
    className: "Extra class for the consumer's layout.",
    variant: "'default', 'container' or 'high' surface step.",
  },
} satisfies ComponentGuide<SurfaceProps>;

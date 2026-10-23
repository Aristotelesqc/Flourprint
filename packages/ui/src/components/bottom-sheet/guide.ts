import type { ComponentGuide } from '../../guides.ts';
import type { ModalProps } from '../../props.ts';

export default {
  purpose:
    'A modal sheet rising from the bottom for focused tasks (default) or a centered compact dialog via [data-overlay-presentation="compact"] content marker.',
  useWhen: [
    'A task or explanation that needs the full width and its own actions (default sheet presentation).',
    'Short confirmation dialogs composing a [data-overlay-presentation="compact"] content marker retained in exit clones.',
  ],
  avoidWhen: ['A short list of choices tied to a button: use fp.floating-menu.'],
  accessibility: [
    'Native modal dialog: focus is contained, Escape closes, focus returns to the trigger.',
    'Compact centered dialogs provide a single cohesive action footer, rounded corners on all edges with overflow clipping, and distinct styling from bottom-anchored sheets (L123).',
    'Floating layer: may be translucent (elevation rule).',
    'Reduced motion closes at once.',
    'Hit targets maintain 48 px minimum boundary with compact visual rhythm.',
  ],
  related: ['fp.floating-menu', 'fp.motion.sheet-enter', 'fp.motion.sheet-exit'],
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
    onClose: 'Called when the sheet asks to close.',
    title: "Title, also the dialog's accessible name.",
    closeLabel: 'Accessible name of the close button.',
    children: 'Content.',
    footer: 'Optional actions pinned at the bottom.',
  },
} satisfies ComponentGuide<ModalProps>;

import type { ComponentGuide } from '../../guides.ts';
import type { SortableListProps } from '../../props.ts';

export default {
  purpose:
    'Generic reusable sortable container adapter providing modern @dnd-kit/react 0.5.1 drag and drop behavior.',
  useWhen: [
    'Reordering lists of items such as recipe steps, ingredients or stages.',
    'Allowing grouped layouts, accordions, and custom item row wrappers without forcing flat DOM structures.',
  ],
  avoidWhen: [
    'Simple static lists without reorder needs.',
    'Complex multi-column grid dragging across independent boards.',
  ],
  accessibility: [
    'PointerSensor-only drag and drop; default English @dnd-kit Accessibility plugin is disabled so callers provide localized instructions, live-region announcements, and native keyboard (ArrowUp/ArrowDown) or action-menu reordering alternatives.',
    'Accessible drag handle binding without unlocalized screen-reader instructions or false drop announcements.',
    'Motion honoring prefers-reduced-motion and manual reduction tokens.',
  ],
  related: ['fp.step-node', 'fp.timeline'],
  decisions: [
    {
      label:
        'PR #133: Modern @dnd-kit/react sortable integration with gutter hit-test and snapshot-backed order resolution',
      url: 'https://github.com/Aristotelesqc/Flourprint/pull/133',
    },
    {
      label: 'ADR 0020: Versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
  ],
  props: {
    items:
      'Optional ordered list of item descriptors { id, group } for relative placement computation.',
    activationMode: "'move' (drag after movement threshold) or 'hold' (press and hold).",
    disabled: 'Disables all drag and drop interactions.',
    onDragStart: 'Called when an actual lift starts with the active item id.',
    onDropIntent:
      'Called on drop completion with the computed drop intent (or null on cancellation); returns a synchronous SortableDropOutcome to accept, keep pending, or roll back optimistic ordering on refused/unchanged outcomes.',
    renderOverlay: 'Optional custom renderer for the lifted drag overlay row.',
    className: 'Optional CSS class for the sortable container.',
    children: 'Items, accordions, and group wrappers composing the sortable list.',
  },
} satisfies ComponentGuide<SortableListProps>;

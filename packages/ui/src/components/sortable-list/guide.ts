import type { ComponentGuide } from '../../guides.ts';
import type { SortableListProps } from './props.ts';

const sortableListGuide: ComponentGuide<SortableListProps> = {
  purpose:
    'Enables reordering of list items through pointer drag-and-drop or accessible keyboard controls with controlled intent dispatch.',
  useWhen: [
    'Reordering sequential workflow steps, stages, or timeline items.',
    'User-directed prioritization or sorting of document sections.',
  ],
  avoidWhen: [
    'Static lists with fixed order or read-only presentation; render standard rows instead.',
    'Selecting between alternatives or filtering lists; use Select or Tabs instead.',
  ],
  accessibility: [
    'Enforces 350ms delay hold on pointer handles with 10px tolerance to differentiate intentional drags from vertical scrolling.',
    'Provides full keyboard reordering support with Space/Enter pickup and arrow key positioning.',
    'Dispatches live screen reader announcements using item display labels rather than internal IDs.',
    'Disables drop animations when reduced motion is requested at system or document level.',
    'Maintains minimum 48px touch targets for drag handles.',
    'Opens one source-sized insertion space without changing the caller order until release.',
    'Adds composed-tree scroll ancestors for Ionic while the SDK owns autoscroll and pointer tracking.',
    'Releases keyboard capture after imperative cancellation so the next gesture can start.',
  ],
  related: ['fp.surface', 'fp.button'],
  decisions: [
    {
      label: 'ADR 0020: Versioned component library',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md',
    },
    {
      label: 'ADR 0021: Theme builder and component sourcing',
      url: 'https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md',
    },
  ],
  props: {
    items:
      'List of draggable item descriptors providing unique stable IDs and accessible display labels.',
    children: 'Content containing sortable items, slot targets, and optional headers or dividers.',
    renderOverlay:
      'Render function producing the floating overlay representation of the currently dragged item.',
    onDropIntent:
      'Callback invoked exactly once upon drop completion with the computed intent (source ID and target predecessor afterId), or null if cancelled, outside, or unchanged.',
    instructions:
      'Localized screen reader instructions explaining keyboard drag and drop operations.',
    announcements:
      'Localized screen reader announcement functions for drag start, movement over slots, drop completion, and gesture cancellation.',
    onDragStart:
      'Optional callback invoked upon actual gesture activation, suitable for entering draft editing mode.',
    onDragActiveChange:
      'Optional callback notifying when drag interaction begins or ends, used to guard navigation or carousels.',
    getDropFeedback:
      'Optional pure text feedback helper reporting assistive status messages for candidate drop locations.',
    disabled: 'Whether reordering gestures and keyboard interactions are disabled.',
    className: 'Optional CSS class name applied to the container element.',
    ref: 'Optional imperative ref exposing cancelDrag() to cancel any active drag operation programmatically.',
  },
};

export default sortableListGuide;

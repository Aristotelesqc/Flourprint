import type { ReactNode, Ref } from 'react';

/** Static descriptor for a sortable item in the list. */
export interface SortableItemDescriptor {
  readonly id: string;
  readonly label: string;
}

/** Modality that initiated the drop intent. */
export type DropInput = 'pointer' | 'keyboard' | 'action';

/** Computed intent emitted when a drag ends on a valid slot or action. */
export interface DropIntent {
  readonly id: string;
  readonly afterId: string | null;
  readonly input: DropInput;
}

/** Outcome returned by the caller's drop handler. */
export type DropOutcome = 'accepted' | 'pending' | 'refused' | 'unchanged' | undefined;

/** Imperative handle allowing cancellation of active drag operations. */
export interface SortableHandle {
  cancelDrag(): boolean;
}

/** Localized screen-reader announcements for DND lifecycle events. */
export interface SortableListAnnouncements {
  readonly dragStarted: (item: SortableItemDescriptor) => string;
  readonly dragOver?: (item: SortableItemDescriptor, afterId: string | null) => string | undefined;
  readonly dragEnded: (item: SortableItemDescriptor, afterId: string | null) => string;
  readonly dragCancelled: (item: SortableItemDescriptor) => string;
}

/** Localized accessibility instructions for draggable items. */
export interface SortableListInstructions {
  readonly draggable: string;
}

/** Props for the SortableList component. */
export interface SortableListProps {
  readonly items: readonly SortableItemDescriptor[];
  readonly children: ReactNode;
  readonly renderOverlay: (id: string) => ReactNode;
  readonly onDropIntent: (intent: DropIntent | null) => DropOutcome;
  readonly instructions: SortableListInstructions;
  readonly announcements: SortableListAnnouncements;
  readonly onDragStart?: (id: string) => void;
  readonly onDragActiveChange?: (active: boolean) => void;
  readonly getDropFeedback?: (intent: DropIntent) => string | undefined;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ref?: Ref<SortableHandle>;
}

/** Context provided to child SortableItem renderers. */
export interface SortableItemContextValue {
  readonly id: string;
  readonly isDragging: boolean;
  readonly isDropTarget: boolean;
  readonly handleRef: (element: Element | null) => void;
}

/** Props for SortableItem. */
export interface SortableItemProps {
  readonly id: string;
  readonly children: ReactNode | ((context: SortableItemContextValue) => ReactNode);
  readonly className?: string;
}

/** Props for SortableSlot. */
export interface SortableSlotProps {
  readonly afterId: string | null;
  readonly children?: ReactNode;
  readonly className?: string;
}

import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
  useDragDropManager,
} from '@dnd-kit/react';
import {
  Accessibility,
  AutoScroller,
  Cursor,
  Feedback,
  Scroller,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
  PreventSelection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/dom';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { durationMs, easingCurve, isReduced } from '../../motion.ts';
import { library, useMotion } from '../../index.ts';
import type {
  DropInput,
  DropIntent,
  DropOutcome,
  SortableHandle,
  SortableItemContextValue,
  SortableItemDescriptor,
  SortableItemProps,
  SortableListProps,
  SortableSlotProps,
} from './props.ts';

interface SortableListContextValue {
  readonly instanceId: string;
  readonly registerSlot: (afterId: string | null, element: HTMLElement | null) => void;
  readonly disabled: boolean;
  readonly activeId: string | null;
  readonly items: readonly SortableItemDescriptor[];
  readonly candidateFeedback: string | undefined;
}

const SortableListContext = createContext<SortableListContextValue | null>(null);

function useSortableListContext(): SortableListContextValue {
  const ctx = useContext(SortableListContext);
  if (!ctx) {
    throw new Error('SortableItem/SortableSlot must be used within a SortableList');
  }
  return ctx;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null);

export function useSortableItem(): SortableItemContextValue {
  const ctx = useContext(SortableItemContext);
  if (!ctx) {
    throw new Error('useSortableItem must be used within a SortableItem');
  }
  return ctx;
}

export function computeDropIntent(
  sourceId: string,
  rawAfterId: string | null,
  input: DropInput,
  items: readonly SortableItemDescriptor[],
): DropIntent | null {
  const sourceIndex = items.findIndex((it) => it.id === sourceId);
  if (sourceIndex < 0) return null;
  if (rawAfterId === sourceId) return null;
  if (rawAfterId !== null && !items.some((it) => it.id === rawAfterId)) {
    return null;
  }
  const currentPredecessor = sourceIndex > 0 ? (items[sourceIndex - 1]?.id ?? null) : null;
  if (rawAfterId === currentPredecessor) {
    return null;
  }
  return {
    id: sourceId,
    afterId: rawAfterId,
    input,
  };
}

function makeSlotId(instanceId: string, afterId: string | null): string {
  return `fp-slot:${instanceId}:${afterId === null ? 'start' : `item:${encodeURIComponent(afterId)}`}`;
}

function getReleaseCoordinates(nativeEvent?: Event): { x: number; y: number } | null {
  if (!nativeEvent) return null;
  if ('clientX' in nativeEvent && 'clientY' in nativeEvent) {
    const pe = nativeEvent as PointerEvent | MouseEvent;
    return { x: pe.clientX, y: pe.clientY };
  }
  if ('changedTouches' in nativeEvent) {
    const te = nativeEvent as TouchEvent;
    const touch = te.changedTouches?.[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
  }
  return null;
}

export function SortableItem({ id, children, className = '' }: SortableItemProps): ReactElement {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const handleElementRef = useRef<Element | null>(null);
  const { disabled } = useSortableListContext();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const lastRectRef = useRef<{ width: number; height: number } | null>(null);

  const {
    ref: draggableRef,
    handleRef: dndHandleRef,
    isDragging,
  } = useDraggable({
    id,
    element: elementRef,
    handle: handleElementRef,
    disabled,
    data: { id },
  });

  const updateRect = useCallback(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        lastRectRef.current = { width: rect.width, height: rect.height };
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (isDragging) {
      if (lastRectRef.current) {
        setDimensions(lastRectRef.current);
      }
    } else {
      setDimensions(null);
    }
  }, [isDragging, updateRect]);

  const setItemRef = useCallback(
    (el: HTMLDivElement | null) => {
      elementRef.current = el;
      draggableRef(el);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          lastRectRef.current = { width: rect.width, height: rect.height };
        }
      }
    },
    [draggableRef],
  );

  const setHandleRef = useCallback(
    (el: Element | null) => {
      handleElementRef.current = el;
      dndHandleRef(el);
    },
    [dndHandleRef],
  );

  const contextValue: SortableItemContextValue = useMemo(
    () => ({
      id,
      isDragging,
      isDropTarget: false,
      handleRef: setHandleRef,
    }),
    [id, isDragging, setHandleRef],
  );

  return (
    <SortableItemContext.Provider value={contextValue}>
      <div
        ref={setItemRef}
        data-sortable-id={id}
        onPointerDown={updateRect}
        style={
          isDragging && dimensions
            ? {
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
              }
            : undefined
        }
        className={`relative ${className}`}
      >
        {isDragging ? (
          <>
            <div
              aria-hidden="true"
              className="h-full w-full rounded-card border-2 border-dashed border-outline/40 bg-surface-container"
            />
            <div
              aria-hidden="true"
              className="sr-only pointer-events-none absolute h-0 w-0 overflow-hidden"
            >
              {typeof children === 'function' ? children(contextValue) : children}
            </div>
          </>
        ) : typeof children === 'function' ? (
          children(contextValue)
        ) : (
          children
        )}
      </div>
    </SortableItemContext.Provider>
  );
}

export function SortableSlot({
  afterId,
  children,
  className = '',
}: SortableSlotProps): ReactElement {
  const { instanceId, registerSlot, activeId, items } = useSortableListContext();
  const elementRef = useRef<HTMLDivElement | null>(null);

  const slotId = useMemo(() => makeSlotId(instanceId, afterId), [instanceId, afterId]);

  const isValidCandidate = useMemo(() => {
    if (!activeId) return false;
    return computeDropIntent(activeId, afterId, 'pointer', items) !== null;
  }, [activeId, afterId, items]);

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: slotId,
    element: elementRef,
    disabled: !isValidCandidate,
    data: { afterId },
  });

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      elementRef.current = el;
      droppableRef(el);
      registerSlot(afterId, el);
    },
    [afterId, droppableRef, registerSlot],
  );

  if (activeId && !isValidCandidate) {
    return <div ref={setRef} className="h-0 w-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <div
      ref={setRef}
      data-slot-after={afterId ?? 'start'}
      className={`relative transition-all duration-[var(--duration-effect)] ease-standard ${
        activeId && isValidCandidate ? 'min-h-[24px] py-1' : ''
      } ${className}`}
      data-drop-target={isDropTarget ? 'true' : undefined}
    >
      {activeId && isValidCandidate && (
        <div
          aria-hidden="true"
          className={`h-2 w-full rounded-full transition-all duration-[var(--duration-effect)] ease-standard ${
            isDropTarget
              ? 'scale-y-125 bg-primary shadow-sm'
              : 'border border-dashed border-outline/50 bg-surface-container/50'
          }`}
        />
      )}
      {children}
    </div>
  );
}

function SortableListInner({
  cancelRef,
  onCancel,
  disabled,
  children,
}: {
  cancelRef?: React.Ref<SortableHandle> | undefined;
  onCancel: () => void;
  disabled: boolean;
  children: ReactNode;
}): ReactElement {
  const manager = useDragDropManager();

  useEffect(() => {
    if (!manager) return;

    const scroller = manager.registry.plugins.get(Scroller);
    if (!scroller || typeof scroller.getScrollableElements !== 'function') return;

    const originalGetScrollableElements = scroller.getScrollableElements;

    const wrappedGetScrollableElements = function (this: Scroller): Set<Element> | null {
      const native = originalGetScrollableElements.call(this);
      const sourceEl = manager.dragOperation.source?.element;
      if (!(sourceEl instanceof Element)) return native;

      const composedScrollables: Element[] = [];
      const visited = new Set<Node>();

      let current: Node | null = sourceEl.assignedSlot ?? sourceEl.parentNode;

      while (current && !visited.has(current)) {
        visited.add(current);

        if (current instanceof HTMLElement) {
          const win = current.ownerDocument?.defaultView ?? window;
          const style = win.getComputedStyle(current);
          const isScrollable = (val: string) =>
            val === 'auto' || val === 'scroll' || val === 'overlay';
          const canScrollY = isScrollable(style.overflowY);
          const canScrollX = isScrollable(style.overflowX);

          if (
            (canScrollY &&
              current.scrollHeight > current.clientHeight &&
              current.clientHeight > 0) ||
            (canScrollX && current.scrollWidth > current.clientWidth && current.clientWidth > 0)
          ) {
            composedScrollables.push(current);
          }
        }

        current =
          (current instanceof Element && current.assignedSlot) ||
          current.parentNode ||
          (current instanceof ShadowRoot ? current.host : null);
      }

      if (composedScrollables.length === 0) return native;

      const merged = new Set<Element>(composedScrollables);
      if (native) {
        for (const el of native) merged.add(el);
      }
      return merged;
    };

    scroller.getScrollableElements = wrappedGetScrollableElements;

    return () => {
      if (scroller.getScrollableElements === wrappedGetScrollableElements) {
        scroller.getScrollableElements = originalGetScrollableElements;
      }
    };
  }, [manager]);

  useImperativeHandle(
    cancelRef,
    () => ({
      cancelDrag(): boolean {
        if (!manager) return false;
        const status = manager.dragOperation.status;
        if (status.idle) return false;
        manager.actions.stop({ canceled: true });
        onCancel();
        return true;
      },
    }),
    [manager, onCancel],
  );

  useEffect(() => {
    return () => {
      if (manager && !manager.dragOperation.status.idle) {
        manager.actions.stop({ canceled: true });
        onCancel();
      }
    };
  }, [disabled, manager, onCancel]);

  return <>{children}</>;
}

export function SortableList({
  items,
  children,
  renderOverlay,
  onDropIntent,
  instructions,
  announcements,
  onDragStart,
  onDragActiveChange,
  getDropFeedback,
  disabled = false,
  className = '',
  ref,
}: SortableListProps): ReactElement {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<Map<string | null, { afterId: string | null; element: HTMLElement }>>(
    new Map(),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const lastActiveIdRef = useRef<string | null>(null);
  const activatedRef = useRef(false);
  const endedRef = useRef(false);

  const [candidateFeedback, setCandidateFeedback] = useState<string | undefined>(undefined);
  const endResolutionRef = useRef<{
    operationId: unknown;
    intent: DropIntent | null;
    outcome: DropOutcome;
  } | null>(null);

  const callbacksRef = useRef({
    onDropIntent,
    onDragStart,
    onDragActiveChange,
    getDropFeedback,
    announcements,
    instructions,
    items,
  });
  callbacksRef.current = {
    onDropIntent,
    onDragStart,
    onDragActiveChange,
    getDropFeedback,
    announcements,
    instructions,
    items,
  };

  const registerSlot = useCallback((afterId: string | null, element: HTMLElement | null) => {
    const key = afterId;
    if (!element) {
      slotsRef.current.delete(key);
    } else {
      slotsRef.current.set(key, { afterId, element });
    }
  }, []);

  const resolveEnd = useCallback(
    (event: DragEndEvent): { intent: DropIntent | null; outcome: DropOutcome } => {
      const operation = event.operation;
      if (endResolutionRef.current && endResolutionRef.current.operationId === operation) {
        return {
          intent: endResolutionRef.current.intent,
          outcome: endResolutionRef.current.outcome,
        };
      }

      if (!activatedRef.current || endedRef.current) {
        return { intent: null, outcome: 'unchanged' };
      }
      endedRef.current = true;
      activatedRef.current = false;

      const currentItems = callbacksRef.current.items;
      const sourceId = String(operation.source?.id ?? '');
      const isCanceled = event.canceled;

      let resolvedIntent: DropIntent | null = null;

      if (!isCanceled && sourceId) {
        const activator = operation.activatorEvent;
        const isKeyboard =
          activator instanceof KeyboardEvent || event.nativeEvent instanceof KeyboardEvent;
        const input: DropInput = isKeyboard ? 'keyboard' : 'pointer';

        let resolvedAfterId: string | null = null;
        let found = false;

        if (isKeyboard) {
          const targetId = String(operation.target?.id ?? '');
          for (const slot of slotsRef.current.values()) {
            if (!slot.element.isConnected) continue;
            const expectedId = makeSlotId(instanceId, slot.afterId);
            if (expectedId === targetId) {
              resolvedAfterId = slot.afterId;
              found = true;
              break;
            }
          }
        } else {
          const coords = getReleaseCoordinates(event.nativeEvent);
          if (coords) {
            for (const slot of slotsRef.current.values()) {
              if (!slot.element.isConnected) continue;
              if (slot.element.offsetParent === null && slot.element.offsetWidth === 0) continue;
              const rect = slot.element.getBoundingClientRect();
              if (
                coords.x >= rect.left &&
                coords.x <= rect.right &&
                coords.y >= rect.top &&
                coords.y <= rect.bottom
              ) {
                resolvedAfterId = slot.afterId;
                found = true;
                break;
              }
            }
          }
        }

        if (found) {
          resolvedIntent = computeDropIntent(sourceId, resolvedAfterId, input, currentItems);
        }
      }

      const outcome = callbacksRef.current.onDropIntent(resolvedIntent);

      endResolutionRef.current = {
        operationId: operation,
        intent: resolvedIntent,
        outcome,
      };

      callbacksRef.current.onDragActiveChange?.(false);
      setActiveId(null);
      setCandidateFeedback(undefined);

      return { intent: resolvedIntent, outcome };
    },
    [instanceId],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const sourceId = String(event.operation.source?.id ?? '');
    if (!sourceId) return;
    activatedRef.current = true;
    endedRef.current = false;
    endResolutionRef.current = null;
    lastActiveIdRef.current = sourceId;
    setActiveId(sourceId);

    callbacksRef.current.onDragStart?.(sourceId);
    callbacksRef.current.onDragActiveChange?.(true);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!activatedRef.current) return;
      const sourceId = String(event.operation.source?.id ?? '');
      const targetId = String(event.operation.target?.id ?? '');
      if (!sourceId || !targetId) {
        setCandidateFeedback(undefined);
        return;
      }
      let targetAfterId: string | null = null;
      let found = false;
      for (const slot of slotsRef.current.values()) {
        if (makeSlotId(instanceId, slot.afterId) === targetId) {
          targetAfterId = slot.afterId;
          found = true;
          break;
        }
      }
      if (found) {
        const intent = computeDropIntent(
          sourceId,
          targetAfterId,
          'pointer',
          callbacksRef.current.items,
        );
        if (intent && callbacksRef.current.getDropFeedback) {
          const feedback = callbacksRef.current.getDropFeedback(intent);
          setCandidateFeedback(feedback);
        } else {
          setCandidateFeedback(undefined);
        }
      } else {
        setCandidateFeedback(undefined);
      }
    },
    [instanceId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      resolveEnd(event);
    },
    [resolveEnd],
  );

  const handleCancel = useCallback(() => {
    if (activatedRef.current && !endedRef.current) {
      endedRef.current = true;
      activatedRef.current = false;
      callbacksRef.current.onDropIntent(null);
      callbacksRef.current.onDragActiveChange?.(false);
      setActiveId(null);
      setCandidateFeedback(undefined);
    }
  }, []);

  const sensors = useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: [
          new PointerActivationConstraints.Delay({ value: 350, tolerance: 10 }),
        ],
      }),
      KeyboardSensor,
    ],
    [],
  );

  const plugins = useMemo(
    () => [
      AutoScroller.configure({ threshold: { x: 0, y: 0.2 } }),
      Feedback,
      Cursor,
      PreventSelection,
      Accessibility.configure({
        screenReaderInstructions: {
          draggable: instructions.draggable,
        },
        announcements: {
          dragstart({ operation }: DragStartEvent) {
            const sourceId = String(operation.source?.id ?? '');
            const item = callbacksRef.current.items.find((it) => it.id === sourceId);
            return item ? callbacksRef.current.announcements.dragStarted(item) : undefined;
          },
          dragover({ operation }: DragOverEvent) {
            if (!callbacksRef.current.announcements.dragOver) return undefined;
            const sourceId = String(operation.source?.id ?? '');
            const item = callbacksRef.current.items.find((it) => it.id === sourceId);
            if (!item) return undefined;
            const targetId = String(operation.target?.id ?? '');
            let afterId: string | null = null;
            for (const slot of slotsRef.current.values()) {
              if (makeSlotId(instanceId, slot.afterId) === targetId) {
                afterId = slot.afterId;
                break;
              }
            }
            return callbacksRef.current.announcements.dragOver(item, afterId);
          },
          dragend(event: DragEndEvent) {
            const { operation, canceled } = event;
            const sourceId = String(operation.source?.id ?? '');
            const item = callbacksRef.current.items.find((it) => it.id === sourceId);
            if (!item) return undefined;

            const { intent, outcome } = resolveEnd(event);

            if (!canceled && intent && outcome === 'accepted') {
              return callbacksRef.current.announcements.dragEnded(item, intent.afterId);
            }

            return callbacksRef.current.announcements.dragCancelled(item);
          },
        },
      }),
    ],
    [instanceId, instructions.draggable, resolveEnd],
  );

  const dragMotion = useMotion('fp.motion.step-drag');
  const dragForm = isReduced(containerRef.current) ? dragMotion.reduced : dragMotion.standard;
  const dropAnimation =
    dragForm === 'none'
      ? { duration: 0, easing: 'linear' }
      : { duration: durationMs(dragForm.duration), easing: easingCurve(dragForm.easing) };

  const contextValue: SortableListContextValue = useMemo(
    () => ({
      instanceId,
      registerSlot,
      disabled,
      activeId,
      items,
      candidateFeedback,
    }),
    [instanceId, registerSlot, disabled, activeId, items, candidateFeedback],
  );

  const displayedOverlayId = activeId ?? lastActiveIdRef.current;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <SortableListContext.Provider value={contextValue}>
        <DragDropProvider
          sensors={sensors}
          plugins={plugins}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableListInner cancelRef={ref} onCancel={handleCancel} disabled={disabled}>
            {children}
          </SortableListInner>

          {candidateFeedback && (
            <div data-drop-feedback className="mt-1 text-xs text-muted" aria-hidden="true">
              {candidateFeedback}
            </div>
          )}

          <DragOverlay dropAnimation={dropAnimation} className="pointer-events-none select-none">
            {displayedOverlayId ? (
              <div aria-hidden="true" className="pointer-events-none select-none">
                {renderOverlay(displayedOverlayId)}
              </div>
            ) : null}
          </DragOverlay>
        </DragDropProvider>
      </SortableListContext.Provider>
    </div>
  );
}

const defaultProps: SortableListProps = {
  items: [
    { id: 'step-1', label: 'Autolyse' },
    { id: 'step-2', label: 'Mix' },
    { id: 'step-3', label: 'Bulk' },
  ],
  instructions: {
    draggable:
      'Press Space or Enter to pick up, arrow keys to move, Space or Enter to drop, Escape to cancel.',
  },
  announcements: {
    dragStarted: (item) => `Picked up ${item.label}.`,
    dragEnded: (item, afterId) => {
      if (!afterId) return `Dropped ${item.label} at the beginning.`;
      const target = defaultProps.items.find((it) => it.id === afterId);
      return `Dropped ${item.label} after ${target ? target.label : afterId}.`;
    },
    dragCancelled: (item) => `Cancelled drag of ${item.label}.`,
  },
  renderOverlay: (id) => {
    const item = defaultProps.items.find((it) => it.id === id);
    return (
      <div className="rounded-card border border-outline bg-surface p-3 text-on-surface shadow-lg">
        {item ? item.label : id}
      </div>
    );
  },
  onDropIntent: () => 'accepted',
  children: null,
};

function ControlledSortableListExample(props: SortableListProps): ReactElement {
  const [items, setItems] = useState(props.items);

  const handleDropIntent = (intent: DropIntent | null): DropOutcome => {
    if (!intent) return 'unchanged';
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === intent.id);
      if (idx < 0) return prev;
      const item = prev[idx];
      if (!item) return prev;
      const without = prev.filter((it) => it.id !== intent.id);
      if (intent.afterId === null) {
        return [item, ...without];
      }
      const targetIdx = without.findIndex((it) => it.id === intent.afterId);
      if (targetIdx < 0) return prev;
      const next = [...without];
      next.splice(targetIdx + 1, 0, item);
      return next;
    });
    return 'accepted';
  };

  return (
    <SortableList
      {...props}
      items={items}
      onDropIntent={handleDropIntent}
      renderOverlay={(id) => {
        const item = items.find((it) => it.id === id);
        return (
          <div className="rounded-card border border-outline bg-surface p-3 text-on-surface shadow-lg">
            {item ? item.label : id}
          </div>
        );
      }}
    >
      <SortableSlot afterId={null} />
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <SortableItem id={item.id}>
            {({ handleRef, isDragging }) => (
              <div
                className={`flex min-h-touch items-center justify-between rounded-card border border-outline p-3 ${
                  isDragging ? 'opacity-40' : 'bg-surface text-on-surface'
                }`}
              >
                <span>{item.label}</span>
                <button
                  ref={handleRef}
                  type="button"
                  className="min-h-touch min-w-touch flex items-center justify-center text-muted hover:text-on-surface"
                  aria-label={`Drag ${item.label}`}
                >
                  ⋮⋮
                </button>
              </div>
            )}
          </SortableItem>
          <SortableSlot afterId={item.id} />
        </React.Fragment>
      ))}
    </SortableList>
  );
}

export default library.version({
  id: 'fp.sortable-list',
  version: 'v1',
  component: SortableList,
  notes:
    'Domain-neutral sortable list with 350ms hold activation constraints, post-scroll release hit-testing, and accessible announcements.',
  examples: [
    {
      name: 'Default',
      props: defaultProps,
    },
    {
      name: 'Controlled list with slots',
      props: defaultProps,
      render: ControlledSortableListExample,
    },
  ],
});

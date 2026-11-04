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
import { createPortal } from 'react-dom';
import { durationMs, easingCurve, isReduced } from '../../motion.ts';
import { playStepDragSettle } from '../../motions/step-drag/index.ts';
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

// External cancellation must release the native keyboard listener as Escape does.
class CancelAwareKeyboardSensor extends KeyboardSensor {
  private readonly unlisten: () => void;
  constructor(...args: ConstructorParameters<typeof KeyboardSensor>) {
    super(...args);
    this.unlisten = this.manager.monitor.addEventListener('dragend', () => this.cleanup());
  }
  override destroy(): void {
    this.unlisten();
    super.destroy();
  }
}

interface SortableListContextValue {
  readonly instanceId: string;
  readonly registerSlot: (afterId: string | null, element: HTMLElement | null) => void;
  readonly disabled: boolean;
  readonly activeId: string | null;
  readonly items: readonly SortableItemDescriptor[];
  readonly candidateFeedback: string | undefined;
  readonly candidateAfterId: string | null | undefined;
  readonly activeDimensions: { width: number; height: number } | null;
  readonly activeSpacing: number;
  readonly registerHandle: (id: string, element: Element | null) => void;
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
  const { disabled, activeId, candidateAfterId, activeDimensions, registerHandle } =
    useSortableListContext();
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
      registerHandle(id, el);
    },
    [dndHandleRef, id, registerHandle],
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

  const itemDims = activeDimensions ?? dimensions;

  return (
    <SortableItemContext.Provider value={contextValue}>
      <div
        ref={setItemRef}
        data-sortable-id={id}
        onPointerDown={updateRect}
        style={
          isDragging
            ? candidateAfterId !== undefined
              ? { height: 0, marginBottom: 0, overflow: 'hidden' }
              : itemDims
                ? {
                    height: `${itemDims.height}px`,
                    width: `${itemDims.width}px`,
                  }
                : undefined
            : undefined
        }
        className={`relative transition-[height,margin-bottom] ${activeId ? 'duration-[var(--duration-spatial)]' : 'duration-0'} ease-standard motion-reduce:duration-0 ${className}`}
      >
        {isDragging && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-card border-2 border-dashed border-outline/40 bg-surface-container ${
              candidateAfterId !== undefined ? 'hidden' : ''
            }`}
          />
        )}
        <div
          aria-hidden={isDragging || undefined}
          inert={isDragging}
          className={isDragging ? 'pointer-events-none opacity-0' : undefined}
        >
          {typeof children === 'function' ? children(contextValue) : children}
        </div>
      </div>
    </SortableItemContext.Provider>
  );
}

export function SortableSlot({
  afterId,
  children,
  className = '',
}: SortableSlotProps): ReactElement {
  const {
    instanceId,
    registerSlot,
    activeId,
    items,
    candidateAfterId,
    activeDimensions,
    activeSpacing,
  } = useSortableListContext();
  const drawnElementRef = useRef<HTMLDivElement | null>(null);
  const boundaryElementRef = useRef<HTMLDivElement | null>(null);
  const [leadingSpace, setLeadingSpace] = useState(0);

  useLayoutEffect(() => {
    const element = drawnElementRef.current;
    const previous = element?.previousElementSibling;
    setLeadingSpace(
      activeId && element && previous
        ? Math.max(0, element.getBoundingClientRect().top - previous.getBoundingClientRect().bottom)
        : 0,
    );
  }, [activeId]);

  const slotId = useMemo(() => makeSlotId(instanceId, afterId), [instanceId, afterId]);

  const isValidCandidate = useMemo(() => {
    if (!activeId) return false;
    return computeDropIntent(activeId, afterId, 'pointer', items) !== null;
  }, [activeId, afterId, items]);

  const isCandidate =
    Boolean(activeId) &&
    isValidCandidate &&
    candidateAfterId !== undefined &&
    candidateAfterId === afterId;

  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: slotId,
    element: boundaryElementRef,
    disabled: !isValidCandidate,
    data: { afterId },
  });

  const setDrawnRef = useCallback(
    (el: HTMLDivElement | null) => {
      drawnElementRef.current = el;
      registerSlot(afterId, el);
    },
    [afterId, registerSlot],
  );

  const setBoundaryRef = useCallback(
    (el: HTMLDivElement | null) => {
      boundaryElementRef.current = el;
      droppableRef(el);
    },
    [droppableRef],
  );

  if (activeId && !isValidCandidate) {
    return <div ref={setDrawnRef} className="h-0 w-0 overflow-hidden" aria-hidden="true" />;
  }

  return (
    <div
      ref={setDrawnRef}
      data-slot-after={afterId ?? 'start'}
      className={`relative transition-[height,margin-top,padding-top] ${activeId ? 'duration-[var(--duration-spatial)]' : 'duration-0'} ease-standard motion-reduce:duration-0 ${isCandidate ? 'rounded-card bg-surface-container' : ''} ${className}`}
      style={
        isCandidate && activeDimensions
          ? {
              height: `${activeDimensions.height + activeSpacing + leadingSpace}px`,
              marginTop: -leadingSpace,
              paddingTop: leadingSpace,
            }
          : activeId
            ? { height: 0, marginTop: 0, paddingTop: 0 }
            : undefined
      }
      data-drop-target={isDropTarget ? 'true' : undefined}
    >
      {activeId && isValidCandidate && (
        <div
          ref={setBoundaryRef}
          aria-hidden="true"
          className={`absolute left-0 right-0 pointer-events-none opacity-0 ${
            isCandidate ? 'inset-0' : 'h-[48px] top-1/2 -translate-y-1/2'
          }`}
        />
      )}
      {isCandidate && (
        <div
          aria-hidden="true"
          className="h-full w-full rounded-card border-2 border-dashed border-outline/40 bg-surface-container"
          style={activeDimensions ? { height: activeDimensions.height } : undefined}
        />
      )}
      {activeId ? null : children}
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
  const [candidateAfterId, setCandidateAfterId] = useState<string | null | undefined>(undefined);
  const [activeDimensions, setActiveDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [activeSpacing, setActiveSpacing] = useState(0);
  const lastActiveIdRef = useRef<string | null>(null);
  const handlesRef = useRef(new Map<string, HTMLElement>());
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const settleGenerationRef = useRef(0);
  const pendingSettleRef = useRef<{ frame: number; resolve: () => void } | null>(null);
  const releaseFocusRef = useRef<Element | null>(null);
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

  const registerHandle = useCallback((id: string, element: Element | null) => {
    if (element instanceof HTMLElement) handlesRef.current.set(id, element);
    else handlesRef.current.delete(id);
  }, []);

  const restoreHandleFocus = useCallback((id: string) => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      const handle = handlesRef.current.get(id);
      if (!handle?.isConnected || activatedRef.current) return;
      if (handle.closest('[hidden], .ion-page-hidden, [inert]')) return;
      const currentFocus = document.activeElement;
      if (
        currentFocus !== releaseFocusRef.current &&
        currentFocus !== document.body &&
        currentFocus !== handle
      )
        return;
      handle.focus({ preventScroll: true });
    });
  }, []);

  const cancelSettle = useCallback(() => {
    settleGenerationRef.current++;
    animationRef.current?.cancel();
    animationRef.current = null;
    const pending = pendingSettleRef.current;
    if (pending) {
      cancelAnimationFrame(pending.frame);
      pending.resolve();
      pendingSettleRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
      cancelSettle();
    },
    [cancelSettle],
  );

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
      releaseFocusRef.current = document.activeElement;
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
      setCandidateAfterId(undefined);
      setActiveDimensions(null);
      setCandidateFeedback(undefined);
      setSettlingId(sourceId || null);
      if (sourceId) restoreHandleFocus(sourceId);

      return { intent: resolvedIntent, outcome };
    },
    [instanceId, restoreHandleFocus],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const sourceId = String(event.operation.source?.id ?? '');
      if (!sourceId) return;
      activatedRef.current = true;
      endedRef.current = false;
      endResolutionRef.current = null;
      cancelSettle();
      setSettlingId(null);
      lastActiveIdRef.current = sourceId;
      const rect = event.operation.source?.element?.getBoundingClientRect();
      const source = event.operation.source?.element;
      setActiveSpacing(source ? Number.parseFloat(getComputedStyle(source).marginBottom) || 0 : 0);
      setActiveDimensions(rect ? { width: rect.width, height: rect.height } : null);
      setCandidateAfterId(undefined);
      setActiveId(sourceId);

      callbacksRef.current.onDragStart?.(sourceId);
      callbacksRef.current.onDragActiveChange?.(true);
    },
    [cancelSettle],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!activatedRef.current) return;
      const sourceId = String(event.operation.source?.id ?? '');
      const targetId = String(event.operation.target?.id ?? '');
      if (!sourceId || !targetId) {
        setCandidateAfterId(undefined);
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
        setCandidateAfterId(intent ? targetAfterId : undefined);
        if (intent && callbacksRef.current.getDropFeedback) {
          const feedback = callbacksRef.current.getDropFeedback(intent);
          setCandidateFeedback(feedback);
        } else {
          setCandidateFeedback(undefined);
        }
      } else {
        setCandidateAfterId(undefined);
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
      setCandidateAfterId(undefined);
      setActiveDimensions(null);
      setCandidateFeedback(undefined);
      const id = lastActiveIdRef.current;
      if (id) restoreHandleFocus(id);
    }
  }, [restoreHandleFocus]);

  const sensors = useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: [
          new PointerActivationConstraints.Delay({ value: 350, tolerance: 10 }),
        ],
      }),
      CancelAwareKeyboardSensor,
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
  const dropAnimation: React.ComponentProps<typeof DragOverlay>['dropAnimation'] = useCallback(
    ({ feedbackElement, element, source }) =>
      new Promise<void>((resolve) => {
        const id = String(source.id);
        const generation = settleGenerationRef.current;
        const frame = requestAnimationFrame(() => {
          pendingSettleRef.current = null;
          const finish = () => {
            if (generation !== settleGenerationRef.current) {
              resolve();
              return;
            }
            animationRef.current = null;
            setSettlingId(null);
            restoreHandleFocus(id);
            resolve();
          };
          if (!(feedbackElement instanceof HTMLElement) || dragMotion.kind !== 'keyframes') {
            finish();
            return;
          }
          const from = feedbackElement.getBoundingClientRect();
          const target = handlesRef.current.get(id)?.closest('[data-sortable-id]') ?? element;
          const to = target.getBoundingClientRect();
          animationRef.current = playStepDragSettle(
            feedbackElement,
            { x: from.left, y: from.top },
            { x: to.left, y: to.top },
            dragMotion,
            {
              reduced: isReduced(containerRef.current),
              duration: durationMs(dragMotion.standard.duration),
              easing: easingCurve(dragMotion.standard.easing),
              onFinish: finish,
            },
          );
        });
        pendingSettleRef.current = { frame, resolve };
      }),
    [dragMotion, restoreHandleFocus],
  );

  const contextValue: SortableListContextValue = useMemo(
    () => ({
      instanceId,
      registerSlot,
      disabled,
      activeId,
      items,
      candidateFeedback,
      candidateAfterId,
      activeDimensions,
      activeSpacing,
      registerHandle,
    }),
    [
      instanceId,
      registerSlot,
      disabled,
      activeId,
      items,
      candidateFeedback,
      candidateAfterId,
      activeDimensions,
      activeSpacing,
      registerHandle,
    ],
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

          {(activeId || settlingId) &&
            createPortal(
              <div
                data-sortable-scrim
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-[9998] bg-scrim/20"
              />,
              document.body,
            )}

          <DragOverlay dropAnimation={dropAnimation} className="pointer-events-none select-none">
            {displayedOverlayId ? (
              <div aria-hidden="true" className="relative pointer-events-none select-none">
                {renderOverlay(displayedOverlayId)}
                {candidateFeedback && (
                  <div
                    data-drop-feedback
                    className="absolute inset-x-1 bottom-1 rounded border border-alert bg-surface px-2 py-0.5 text-xs text-alert shadow-sm"
                  >
                    {candidateFeedback}
                  </div>
                )}
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

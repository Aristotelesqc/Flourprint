import './v1.css';
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { DragDropProvider, DragOverlay, PointerSensor, useDragDropManager } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { Accessibility, PointerActivationConstraints, type DragDropManager } from '@dnd-kit/dom';
import { useMotion } from '../../motion-context.ts';
import { useReducedMotion } from '../use-transition-motion.ts';
import {
  durationMs,
  easingCurve,
  isReduced as isReducedElement,
  type KeyframesMotion,
} from '../../motion.ts';
import { playStepDragSettle } from '../../motions/step-drag/index.ts';
import type { SortableListProps, SortableDropOutcome } from '../../props.ts';
import { library } from '../../index.ts';

type DropAnimation = React.ComponentProps<typeof DragOverlay>['dropAnimation'];
type DragDropPlugins = React.ComponentProps<typeof DragDropProvider>['plugins'];

const pluginsWithoutAccessibility: DragDropPlugins = (defaults) =>
  defaults.filter((plugin) => plugin !== Accessibility);

let activeGlobalCancelFn: (() => boolean) | null = null;

export function cancelActiveSortableDrag(): boolean {
  if (activeGlobalCancelFn) {
    return activeGlobalCancelFn();
  }
  return false;
}

export interface SortableItemContextValue {
  ref: (element: Element | null) => void;
  handleRef: (element: Element | null) => void;
  isDragging: boolean;
  isDropping: boolean;
  isDropTarget: boolean;
  isDragSource: boolean;
  index: number;
}

interface SortableDomSnapshotEntry {
  id: string;
  element: Element;
  parent: ParentNode;
  nextSibling: ChildNode | null;
  index: number;
  group: string | undefined;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null);
const SortableHandleRegistryContext = createContext<Map<string, HTMLElement> | null>(null);

export const useSortableItem = (): SortableItemContextValue => {
  const ctx = useContext(SortableItemContext);
  if (!ctx) throw new Error('useSortableItem must be used within a SortableItem');
  return ctx;
};

const SortableTransitionContext = createContext<{
  duration: number;
  easing: string;
  activeSourceId: string | null;
  originSize: { width: number; height: number } | null;
} | null>(null);

export interface SortableItemProps {
  id: string;
  index: number;
  group?: string;
  disabled?: boolean;
  children: React.ReactNode | ((context: SortableItemContextValue) => React.ReactNode);
  className?: string;
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  index,
  group,
  disabled,
  children,
  className,
}) => {
  const transitionSettings = useContext(SortableTransitionContext);
  const handleRegistry = useContext(SortableHandleRegistryContext);

  const sortableInput: Parameters<typeof useSortable>[0] = {
    id,
    index,
    disabled: disabled ?? false,
    transition:
      transitionSettings && transitionSettings.duration > 0
        ? { duration: transitionSettings.duration, easing: transitionSettings.easing }
        : null,
    ...(group !== undefined ? { group } : {}),
  };

  const { ref, handleRef, isDragging, isDropping, isDropTarget, isDragSource } =
    useSortable(sortableInput);

  const registeredHandleRef = useCallback(
    (el: Element | null) => {
      handleRef(el);
      if (!handleRegistry) return;
      if (el instanceof HTMLElement) {
        handleRegistry.set(id, el);
      } else {
        handleRegistry.delete(id);
      }
    },
    [handleRef, handleRegistry, id],
  );

  const isOriginPlaceholder =
    isDragSource && (isDragging || transitionSettings?.activeSourceId === id);

  const value = useMemo(
    () => ({
      ref,
      handleRef: registeredHandleRef,
      isDragging,
      isDropping,
      isDropTarget,
      isDragSource,
      index,
    }),
    [ref, registeredHandleRef, isDragging, isDropping, isDropTarget, isDragSource, index],
  );

  const composedClassName = [
    className,
    isOriginPlaceholder ? 'fp-sortable-placeholder is-origin-placeholder' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties | undefined =
    isOriginPlaceholder && transitionSettings?.originSize
      ? ({
          '--fp-sortable-origin-height': `${transitionSettings.originSize.height}px`,
          minHeight: `${transitionSettings.originSize.height}px`,
        } as React.CSSProperties)
      : undefined;

  return (
    <SortableItemContext.Provider value={value}>
      <div
        ref={ref}
        data-step-id={id}
        data-sortable-id={id}
        className={composedClassName || undefined}
        style={style}
      >
        {typeof children === 'function' ? children(value) : children}
      </div>
    </SortableItemContext.Provider>
  );
};

export interface SortableHandleProps {
  children: React.ReactElement;
}

export const SortableHandle: React.FC<SortableHandleProps> = ({ children }) => {
  const { handleRef } = useSortableItem();
  if (!React.isValidElement(children)) return <>{children}</>;

  // React 19: ref is a standard prop on props
  const childProps = children.props as {
    ref?: React.Ref<Element>;
    onLostPointerCapture?: React.PointerEventHandler<Element>;
  };
  const childRef = childProps.ref;

  return React.cloneElement(children, {
    'data-sortable-handle': '',
    onLostPointerCapture: (e: React.PointerEvent<Element>) => {
      e.stopPropagation();
      childProps.onLostPointerCapture?.(e);
    },
    ref: (el: Element | null) => {
      handleRef(el);
      if (typeof childRef === 'function') childRef(el);
      else if (childRef && 'current' in childRef) {
        (childRef as React.MutableRefObject<Element | null>).current = el;
      }
    },
  } as React.Attributes & Record<string, unknown>);
};

function captureSortableSnapshot(manager: DragDropManager): SortableDomSnapshotEntry[] {
  const entries: SortableDomSnapshotEntry[] = [];
  for (const droppable of manager.registry.droppables) {
    if (isSortable(droppable) && droppable.sortable.element?.parentNode) {
      const el = droppable.sortable.element;
      entries.push({
        id: String(droppable.id),
        element: el,
        parent: el.parentNode as ParentNode,
        nextSibling: el.nextSibling,
        index: droppable.sortable.index,
        group: droppable.sortable.group as string | undefined,
      });
    }
  }
  return entries;
}

function restoreSortableSnapshot(
  manager: DragDropManager | null,
  snapshot: SortableDomSnapshotEntry[],
): void {
  if (snapshot.length === 0) return;

  const byParent = new Map<ParentNode, SortableDomSnapshotEntry[]>();
  for (const entry of snapshot) {
    const list = byParent.get(entry.parent) ?? [];
    list.push(entry);
    byParent.set(entry.parent, list);
  }

  for (const [parent, groupEntries] of byParent.entries()) {
    const trackedSet = new Set<Node>(groupEntries.map((e) => e.element));
    for (let i = groupEntries.length - 1; i >= 0; i--) {
      const entry = groupEntries[i];
      if (!entry) continue;
      let anchor: ChildNode | null = entry.nextSibling;
      while (anchor && trackedSet.has(anchor) && anchor.parentNode !== parent) {
        anchor = anchor.nextSibling;
      }
      if (anchor && anchor.parentNode === parent) {
        if (entry.element.parentNode !== parent || entry.element.nextSibling !== anchor) {
          parent.insertBefore(entry.element, anchor);
        }
      } else {
        parent.appendChild(entry.element);
      }
    }
  }

  if (!manager) return;
  const byId = new Map(snapshot.map((entry) => [entry.id, entry]));
  for (const droppable of manager.registry.droppables) {
    if (isSortable(droppable)) {
      const saved = byId.get(String(droppable.id));
      if (saved) {
        droppable.sortable.index = saved.index;
        if (saved.group !== undefined) {
          droppable.sortable.group = saved.group;
        }
      }
    }
  }
}

const ManagerBinding: React.FC<{
  onManager: (manager: DragDropManager | null) => void;
}> = ({ onManager }) => {
  const manager = useDragDropManager();
  useEffect(() => {
    onManager(manager);
    return () => onManager(null);
  }, [manager, onManager]);
  return null;
};

function extractEventPoint(
  nativeEvent: Event | undefined,
  fallback: { x: number; y: number } | null,
): { x: number; y: number } | null {
  if (nativeEvent && typeof window !== 'undefined') {
    if ('changedTouches' in nativeEvent) {
      const touchEvent = nativeEvent as TouchEvent;
      const touch = touchEvent.changedTouches?.[0] ?? touchEvent.touches?.[0];
      if (touch && Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY)) {
        return { x: touch.clientX, y: touch.clientY };
      }
    }
    if ('clientX' in nativeEvent) {
      const mouseEvent = nativeEvent as MouseEvent | PointerEvent;
      if (Number.isFinite(mouseEvent.clientX) && Number.isFinite(mouseEvent.clientY)) {
        return { x: mouseEvent.clientX, y: mouseEvent.clientY };
      }
    }
  }
  return fallback;
}

function isPointWithinVisibleContainer(
  container: HTMLElement,
  point: { x: number; y: number },
): boolean {
  const rect = container.getBoundingClientRect();
  if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) {
    return false;
  }
  let parent: HTMLElement | null = container.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`;
    if (/(auto|scroll|clip|hidden)/.test(overflow)) {
      const clipRect = parent.getBoundingClientRect();
      if (
        point.x < clipRect.left ||
        point.x > clipRect.right ||
        point.y < clipRect.top ||
        point.y > clipRect.bottom
      ) {
        return false;
      }
    }
    parent = parent.parentElement;
  }
  return true;
}

export const SortableList: React.FC<SortableListProps> = ({
  items,
  activationMode = 'move',
  disabled = false,
  onDragStart,
  onDropIntent,
  renderOverlay,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<DragDropManager | null>(null);
  const handleRegistryRef = useRef<Map<string, HTMLElement>>(new Map());
  const snapshotRef = useRef<SortableDomSnapshotEntry[]>([]);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const gestureActiveRef = useRef(false);
  const pendingFocusIdRef = useRef<string | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRafRef = useRef<number | null>(null);

  const isOsReduced = useReducedMotion();
  const stepDragMotion = useMotion('fp.motion.step-drag') as KeyframesMotion | undefined;

  const [manualReducedFlag, setManualReducedFlag] = useState(false);
  const isManualReduced =
    manualReducedFlag ||
    (containerRef.current ? isReducedElement(containerRef.current) : false) ||
    (typeof document !== 'undefined' ? isReducedElement(document.documentElement) : false);
  const isReduced = isOsReduced || isManualReduced;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [originSize, setOriginSize] = useState<{ width: number; height: number } | null>(null);

  const duration = !isReduced && stepDragMotion ? durationMs(stepDragMotion.standard.duration) : 0;
  const easing = stepDragMotion
    ? easingCurve(stepDragMotion.standard.easing)
    : 'cubic-bezier(0.2, 0, 0, 1)';

  const transitionSettings = useMemo(() => {
    if (isReduced || duration <= 0) {
      return { duration: 0, easing, activeSourceId: activeId, originSize };
    }
    return { duration, easing, activeSourceId: activeId, originSize };
  }, [isReduced, duration, easing, activeId, originSize]);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const cancelFocusRestore = useCallback(() => {
    if (focusRafRef.current !== null) {
      cancelAnimationFrame(focusRafRef.current);
      focusRafRef.current = null;
    }
  }, []);

  const focusHandleForId = useCallback(
    (id: string) => {
      cancelFocusRestore();
      let attempts = 0;
      let confirmed = false;
      const tick = () => {
        focusRafRef.current = null;
        if (gestureActiveRef.current || attempts++ >= 24) return;
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        if (
          active instanceof HTMLElement &&
          active !== document.body &&
          active !== document.documentElement &&
          (Boolean(
            active.closest('[role="dialog"],[role="alertdialog"],[aria-modal="true"],dialog'),
          ) ||
            (containerRef.current !== null && !containerRef.current.contains(active)))
        ) {
          return;
        }
        const regHandle = handleRegistryRef.current.get(id);
        const dndHandle = managerRef.current?.registry.draggables.get(id)?.handle;
        const handle = regHandle?.isConnected
          ? regHandle
          : dndHandle instanceof HTMLElement && dndHandle.isConnected
            ? dndHandle
            : null;
        if (
          handle &&
          (!containerRef.current || containerRef.current.contains(handle)) &&
          !handle.hasAttribute('disabled') &&
          !handle.closest('.is-origin-placeholder,[inert],[aria-hidden="true"]')
        ) {
          if (confirmed && active === handle) return;
          handle.focus({ preventScroll: true });
          confirmed = typeof document !== 'undefined' && document.activeElement === handle;
        }
        focusRafRef.current = requestAnimationFrame(tick);
      };
      focusRafRef.current = requestAnimationFrame(tick);
    },
    [cancelFocusRestore],
  );

  const settleOverlay = useCallback(
    (idToFocus: string | null) => {
      const targetId = idToFocus ?? pendingFocusIdRef.current;
      clearSettleTimer();
      pendingFocusIdRef.current = null;
      setOverlayId(null);
      setOriginSize(null);
      if (targetId) focusHandleForId(targetId);
    },
    [clearSettleTimer, focusHandleForId],
  );

  const dropAnimation: DropAnimation = useMemo(() => {
    if (isReduced || duration <= 0 || !stepDragMotion) return null;
    return ({ feedbackElement, placeholder, element }) =>
      new Promise<void>((resolve) => {
        const targetEl = placeholder ?? element;
        if (!(feedbackElement instanceof HTMLElement) || !targetEl) {
          resolve();
          settleOverlay(pendingFocusIdRef.current);
          return;
        }
        const fromRect = feedbackElement.getBoundingClientRect();
        const toRect = targetEl.getBoundingClientRect();
        playStepDragSettle(
          feedbackElement,
          { x: fromRect.left, y: fromRect.top },
          { x: toRect.left, y: toRect.top },
          stepDragMotion,
          {
            duration,
            easing,
            reduced: false,
            onFinish: () => {
              resolve();
              settleOverlay(pendingFocusIdRef.current);
            },
          },
        );
      });
  }, [isReduced, duration, easing, stepDragMotion, settleOverlay]);

  const sensors = useMemo(() => {
    if (disabled) return [];
    return [
      PointerSensor.configure({
        activationConstraints: () =>
          activationMode === 'hold'
            ? [new PointerActivationConstraints.Delay({ value: 350, tolerance: 10 })]
            : [new PointerActivationConstraints.Distance({ value: 5 })],
      }),
    ];
  }, [disabled, activationMode]);

  useEffect(() => {
    if (!activeId || typeof window === 'undefined') return;

    const trackPointer = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const pt = extractEventPoint(e, lastPointerRef.current);
      if (pt) lastPointerRef.current = pt;
    };

    const handleCancelKeyOrBack = (e: Event) => {
      if (!gestureActiveRef.current) return;
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'keydown') {
        e.preventDefault();
        e.stopPropagation();
      }
      cancelActiveSortableDrag();
    };

    window.addEventListener('pointermove', trackPointer, { capture: true, passive: true });
    window.addEventListener('touchmove', trackPointer, { capture: true, passive: true });
    window.addEventListener('pointerup', trackPointer, { capture: true, passive: true });
    window.addEventListener('touchend', trackPointer, { capture: true, passive: true });
    window.addEventListener('keydown', handleCancelKeyOrBack, { capture: true });
    window.addEventListener('popstate', handleCancelKeyOrBack);

    return () => {
      window.removeEventListener('pointermove', trackPointer, { capture: true });
      window.removeEventListener('touchmove', trackPointer, { capture: true });
      window.removeEventListener('pointerup', trackPointer, { capture: true });
      window.removeEventListener('touchend', trackPointer, { capture: true });
      window.removeEventListener('keydown', handleCancelKeyOrBack, { capture: true });
      window.removeEventListener('popstate', handleCancelKeyOrBack);
    };
  }, [activeId]);

  useEffect(() => {
    return () => {
      clearSettleTimer();
      cancelFocusRestore();
      if (gestureActiveRef.current) {
        gestureActiveRef.current = false;
        activeGlobalCancelFn = null;
        restoreSortableSnapshot(managerRef.current, snapshotRef.current);
        snapshotRef.current = [];
      }
    };
  }, [clearSettleTimer, cancelFocusRestore]);

  const handleDragStart: NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragStart']> =
    useCallback(
      (event, manager) => {
        if (!event.operation.source) return;
        clearSettleTimer();
        cancelFocusRestore();

        if (containerRef.current) {
          setManualReducedFlag(isReducedElement(containerRef.current));
        }

        const id = String(event.operation.source.id);
        const activeMgr = manager ?? managerRef.current;
        if (activeMgr) {
          snapshotRef.current = captureSortableSnapshot(activeMgr);
        }

        const sourceEl = event.operation.source.element;
        if (sourceEl instanceof HTMLElement) {
          const rect = sourceEl.getBoundingClientRect();
          setOriginSize({ width: rect.width, height: rect.height });
        } else {
          setOriginSize(null);
        }

        const currentCoords = event.operation.position?.current;
        const startPt = extractEventPoint(
          event.nativeEvent,
          currentCoords && Number.isFinite(currentCoords.x) && Number.isFinite(currentCoords.y)
            ? { x: currentCoords.x, y: currentCoords.y }
            : null,
        );
        lastPointerRef.current = startPt;
        gestureActiveRef.current = true;
        pendingFocusIdRef.current = id;
        setActiveId(id);
        setOverlayId(id);

        activeGlobalCancelFn = () => {
          if (managerRef.current && gestureActiveRef.current) {
            managerRef.current.actions.stop({ canceled: true });
            return true;
          }
          return false;
        };

        onDragStart?.(id);
      },
      [clearSettleTimer, cancelFocusRestore, onDragStart],
    );

  const handleDragMove: NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragMove']> =
    useCallback((event) => {
      const currentCoords = event.operation.position?.current;
      const pt = extractEventPoint(
        event.nativeEvent,
        currentCoords && Number.isFinite(currentCoords.x) && Number.isFinite(currentCoords.y)
          ? { x: currentCoords.x, y: currentCoords.y }
          : lastPointerRef.current,
      );
      if (pt) {
        lastPointerRef.current = pt;
      }
    }, []);

  const handleDragEnd: NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragEnd']> =
    useCallback(
      (event, manager) => {
        if (!gestureActiveRef.current) return;
        gestureActiveRef.current = false;
        activeGlobalCancelFn = null;
        setActiveId(null);

        const activeMgr = manager ?? managerRef.current;
        const source = event.operation.source;
        const sourceId = source ? String(source.id) : null;
        const snapshot = snapshotRef.current;

        const finishOverlayAndFocus = (idToFocus: string | null) => {
          pendingFocusIdRef.current = idToFocus;
          if (!isReduced && duration > 0 && stepDragMotion && renderOverlay) {
            clearSettleTimer();
            settleTimerRef.current = setTimeout(() => {
              settleOverlay(idToFocus);
            }, duration + 100);
          } else {
            settleOverlay(idToFocus);
          }
        };

        const abortAndRollback = () => {
          restoreSortableSnapshot(activeMgr, snapshot);
          snapshotRef.current = [];
          onDropIntent?.(null);
          finishOverlayAndFocus(sourceId);
        };

        if (event.canceled || !source || !sourceId) {
          abortAndRollback();
          return;
        }

        const currentCoords = event.operation.position?.current;
        const releasePoint = extractEventPoint(
          event.nativeEvent,
          currentCoords && Number.isFinite(currentCoords.x) && Number.isFinite(currentCoords.y)
            ? { x: currentCoords.x, y: currentCoords.y }
            : lastPointerRef.current,
        );

        const containerEl = containerRef.current;
        if (
          !containerEl ||
          !releasePoint ||
          !isPointWithinVisibleContainer(containerEl, releasePoint)
        ) {
          abortAndRollback();
          return;
        }

        const ownedRows = Array.from(
          containerEl.querySelectorAll<HTMLElement>('[data-sortable-id]'),
        );
        const ownsRowHit = ownedRows.some((row) => {
          const rect = row.getBoundingClientRect();
          return (
            releasePoint.x >= rect.left &&
            releasePoint.x <= rect.right &&
            releasePoint.y >= rect.top &&
            releasePoint.y <= rect.bottom
          );
        });
        if (!ownsRowHit) {
          abortAndRollback();
          return;
        }

        const targetIndex = isSortable(source) ? source.index : 0;
        const snapshotEntry = snapshot.find((entry) => entry.id === sourceId);
        const initialIndex = snapshotEntry?.index ?? (isSortable(source) ? source.initialIndex : 0);

        if (targetIndex === initialIndex) {
          abortAndRollback();
          return;
        }

        let afterId: string | null = null;
        if (items && items.length > 0) {
          const remaining = items.filter((it) => it.id !== sourceId);
          afterId = targetIndex > 0 ? (remaining[targetIndex - 1]?.id ?? null) : null;
        } else if (containerEl) {
          const domRows = Array.from(
            containerEl.querySelectorAll<HTMLElement>('[data-sortable-id]'),
          ).filter((el) => el.getAttribute('data-sortable-id') !== sourceId);
          afterId =
            targetIndex > 0
              ? (domRows[targetIndex - 1]?.getAttribute('data-sortable-id') ?? null)
              : null;
        }

        const outcome: SortableDropOutcome = onDropIntent?.({
          id: sourceId,
          afterId,
          targetIndex,
          initialIndex,
        });

        // Any outcome other than accepted (including pending/refused/unchanged) restores exact pre-gesture DOM
        if (outcome !== 'accepted') {
          restoreSortableSnapshot(activeMgr, snapshot);
        }
        snapshotRef.current = [];
        finishOverlayAndFocus(sourceId);
      },
      [
        clearSettleTimer,
        duration,
        isReduced,
        items,
        onDropIntent,
        renderOverlay,
        settleOverlay,
        stepDragMotion,
      ],
    );

  const overlayNode = renderOverlay && (
    <div
      data-fp-container="fp.sortable-list"
      data-fp-container-version="v1"
      className={overlayId ? 'fp-sortable-portal fp-drag-portal-layer' : 'fp-sortable-portal'}
      aria-hidden="true"
    >
      {overlayId ? <div className="fp-sortable-scrim" /> : null}
      <DragOverlay
        className="fp-sortable-overlay-container"
        dropAnimation={dropAnimation}
        style={
          originSize ? { width: `${originSize.width}px`, height: `${originSize.height}px` } : {}
        }
      >
        {overlayId ? (
          <div inert className="fp-sortable-overlay-card-host">
            {renderOverlay(overlayId)}
          </div>
        ) : null}
      </DragOverlay>
    </div>
  );

  return (
    <div
      ref={containerRef}
      data-fp-component="fp.sortable-list"
      data-fp-version="v1"
      className={className}
    >
      <DragDropProvider
        sensors={sensors}
        plugins={pluginsWithoutAccessibility}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <ManagerBinding onManager={(m) => (managerRef.current = m)} />
        <SortableHandleRegistryContext.Provider value={handleRegistryRef.current}>
          <SortableTransitionContext.Provider value={transitionSettings}>
            {children}
            {overlayNode
              ? typeof document !== 'undefined' && document.body
                ? createPortal(overlayNode, document.body)
                : overlayNode
              : null}
          </SortableTransitionContext.Provider>
        </SortableHandleRegistryContext.Provider>
      </DragDropProvider>
    </div>
  );
};

const CatalogueExample: React.FC = () => {
  const [items, setItems] = useState([
    { id: 'step-1', name: 'Autolyse' },
    { id: 'step-2', name: 'Knead' },
    { id: 'step-3', name: 'Bulk fermentation' },
  ]);

  const moveItem = useCallback((index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      if (!moved) return prev;
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  return (
    <SortableList
      items={items}
      onDropIntent={(intent) => {
        if (!intent) return 'unchanged';
        const srcIdx = items.findIndex((it) => it.id === intent.id);
        if (srcIdx < 0) return 'refused';
        const next = [...items];
        const [moved] = next.splice(srcIdx, 1);
        if (!moved) return 'refused';
        next.splice(intent.targetIndex, 0, moved);
        setItems(next);
        return 'accepted';
      }}
      renderOverlay={(id) => {
        const item = items.find((it) => it.id === id);
        return (
          <div
            className="fp-drag-floating-card"
            style={{ padding: 'var(--fp-space-2, 0.5rem) var(--fp-space-3, 0.75rem)' }}
          >
            <strong>{item?.name}</strong>
          </div>
        );
      }}
    >
      <div className="fp-sortable-catalogue-list">
        {items.map((it, idx) => (
          <SortableItem key={it.id} id={it.id} index={idx}>
            <div className="fp-sortable-catalogue-row">
              <span>{it.name}</span>
              <div className="fp-sortable-catalogue-controls">
                <button
                  type="button"
                  className="fp-sortable-catalogue-btn"
                  aria-label={`Move ${it.name} up`}
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="fp-sortable-catalogue-btn"
                  aria-label={`Move ${it.name} down`}
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, 1)}
                >
                  ↓
                </button>
                <SortableHandle>
                  <button
                    type="button"
                    className="fp-sortable-catalogue-btn"
                    aria-label={`Drag ${it.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        moveItem(idx, -1);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        moveItem(idx, 1);
                      }
                    }}
                  >
                    ⠿
                  </button>
                </SortableHandle>
              </div>
            </div>
          </SortableItem>
        ))}
      </div>
    </SortableList>
  );
};

export default library.version({
  id: 'fp.sortable-list',
  version: 'v1',
  component: SortableList,
  notes: 'Modern @dnd-kit/react 0.5.1 generic sortable container with optimistic sorting.',
  examples: [
    {
      name: 'Interactive Draggable List',
      props: {
        children: <CatalogueExample />,
      },
    },
  ],
});

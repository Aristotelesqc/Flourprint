import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Process, ProcessStep, StepId } from '@flourprint/core/domain';
import type { Locale } from './messages';
import { stepCopy } from './steps-copy';
import { useMotion } from '../../../../packages/ui/src/motion-context.ts';
import { useReducedMotion } from '../../../../packages/ui/src/components/use-transition-motion.ts';
import { isReduced as isReducedElement } from '../../../../packages/ui/src/motion.ts';
import { playStepDragSettle } from '../../../../packages/ui/src/motions/step-drag/index.ts';
import './step-drag.css';

export const DRAG_ACTIVATION_QUERY = 'dragActivation';
export type DragActivationMode = 'move' | 'hold';

export const getDragActivationMode = (): DragActivationMode => {
  if (typeof location === 'undefined') return 'move';
  const param = new URLSearchParams(location.search).get(DRAG_ACTIVATION_QUERY);
  return param === 'hold' ? 'hold' : 'move';
};

// Global cancel registration agreed with App writer (L104)
let activeDragCancelFn: (() => boolean) | null = null;

export function cancelActiveStepDrag(): boolean {
  if (activeDragCancelFn) {
    return activeDragCancelFn();
  }
  return false;
}

export interface DragPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragState {
  activeStepId: StepId | null;
  targetAfterId: StepId | null | undefined;
  isDragging: boolean;
  floatingPosition: DragPosition | null;
  isSettling: boolean;
  offsetY: number; // For backward compatibility with tests/consumers
}

export type MoveOutcome = 'accepted' | 'pending' | 'refused' | 'unchanged';

export interface UseStepDragProps {
  process: Process;
  locale: Locale;
  onMove: (stepId: StepId, after: StepId | null) => MoveOutcome | undefined;
  onAnnounce: (message: string) => void;
  onStartDrag?: () => void;
  planning?: boolean;
}

interface GestureSnapshot {
  pointerId: number;
  activeStepId: StepId;
  grabOffsetX: number;
  grabOffsetY: number;
  initialRect: { left: number; top: number; width: number; height: number };
  initialScrollTop: number;
  initialScrollLeft: number;
  currentX: number;
  currentY: number;
}

export function useStepDrag({
  process,
  locale,
  onMove,
  onAnnounce,
  onStartDrag,
  planning = false,
}: UseStepDragProps) {
  // Motion integration under MotionProvider (ADR 0021)
  const stepDragMotion = useMotion('fp.motion.step-drag');
  const isReduced = useReducedMotion();

  const [dragState, setDragState] = useState<DragState>({
    activeStepId: null,
    targetAfterId: undefined,
    isDragging: false,
    floatingPosition: null,
    isSettling: false,
    offsetY: 0,
  });

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onAnnounceRef = useRef(onAnnounce);
  onAnnounceRef.current = onAnnounce;

  const onStartDragRef = useRef(onStartDrag);
  onStartDragRef.current = onStartDrag;

  const processRef = useRef(process);
  processRef.current = process;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const pointerTracker = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    activeStepId: StepId;
    isMoved: boolean;
    grabOffsetX: number;
    grabOffsetY: number;
    initialRect: { left: number; top: number; width: number; height: number };
    initialScrollTop: number;
    initialScrollLeft: number;
  } | null>(null);

  // Immutable snapshot preserved until gesture settlement completes
  const gestureSnapshotRef = useRef<GestureSnapshot | null>(null);
  const floatingCardRef = useRef<HTMLDivElement | null>(null);

  const pointerCoordRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const targetAfterRef = useRef<StepId | null | undefined>(undefined);
  const autoscrollInterval = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const activeProcessViewRef = useRef<HTMLElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const gestureEndedRef = useRef<boolean>(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const stopAutoscroll = useCallback(() => {
    if (autoscrollInterval.current !== null) {
      window.clearInterval(autoscrollInterval.current);
      autoscrollInterval.current = null;
    }
  }, []);

  const computeTargetAtPoint = useCallback(
    (clientX: number, clientY: number, activeId: StepId): StepId | null | undefined => {
      const activeView = activeProcessViewRef.current;
      if (activeView) {
        const viewRect = activeView.getBoundingClientRect();
        if (
          clientX < viewRect.left ||
          clientX > viewRect.right ||
          clientY < viewRect.top ||
          clientY > viewRect.bottom
        ) {
          return undefined;
        }
      }

      const elements = document.elementsFromPoint(clientX, clientY);
      const stepRowElement = elements.find(
        (el) =>
          el.hasAttribute('data-step-id') &&
          !el.classList.contains('fp-drag-floating-card') &&
          (!activeView || activeView.contains(el)),
      );
      if (!stepRowElement) return undefined;

      const targetId = stepRowElement.getAttribute('data-step-id');
      if (!targetId || targetId === activeId) return undefined;

      const rect = stepRowElement.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const steps = processRef.current.steps;
      const targetIndex = steps.findIndex((s) => s.id === targetId);
      if (targetIndex < 0) return undefined;

      return clientY < midY ? (targetIndex === 0 ? null : steps[targetIndex - 1].id) : targetId;
    },
    [],
  );

  const snapBack = useCallback(
    (reason: 'outside' | 'refused' | 'unchanged' | 'cancelled') => {
      clearHoldTimer();
      stopAutoscroll();
      activeDragCancelFn = null;
      gestureEndedRef.current = true;

      const snapshot = gestureSnapshotRef.current;
      if (!snapshot) {
        pointerTracker.current = null;
        pointerCoordRef.current = null;
        targetAfterRef.current = undefined;
        setDragState({
          activeStepId: null,
          targetAfterId: undefined,
          isDragging: false,
          floatingPosition: null,
          isSettling: false,
          offsetY: 0,
        });
        return;
      }

      const container =
        scrollContainerRef.current ||
        (document.scrollingElement as HTMLElement) ||
        document.documentElement;
      const scrollDeltaX = container.scrollLeft - snapshot.initialScrollLeft;
      const scrollDeltaY = container.scrollTop - snapshot.initialScrollTop;
      const originX = snapshot.initialRect.left - scrollDeltaX;
      const originY = snapshot.initialRect.top - scrollDeltaY;

      const manualReduced = activeProcessViewRef.current
        ? isReducedElement(activeProcessViewRef.current)
        : false;
      const reduced = isReduced || manualReduced;

      const finishCleanup = () => {
        requestAnimationFrame(() =>
          activeProcessViewRef.current
            ?.querySelector<HTMLElement>(
              `[data-testid="drag-handle-${CSS.escape(snapshot.activeStepId)}"]`,
            )
            ?.focus({ preventScroll: true }),
        );
        pointerTracker.current = null;
        pointerCoordRef.current = null;
        targetAfterRef.current = undefined;
        gestureSnapshotRef.current = null;
        setDragState({
          activeStepId: null,
          targetAfterId: undefined,
          isDragging: false,
          floatingPosition: null,
          isSettling: false,
          offsetY: 0,
        });
        if (reason === 'cancelled' || reason === 'outside') {
          onAnnounceRef.current(stepCopy(localeRef.current, 'dragCancelled'));
        }
      };

      setDragState((prev) => ({
        ...prev,
        targetAfterId: undefined,
        isSettling: true,
      }));

      const cardEl = floatingCardRef.current;
      if (!cardEl || reduced) {
        finishCleanup();
      } else {
        playStepDragSettle(
          cardEl,
          { x: snapshot.currentX, y: snapshot.currentY },
          { x: originX, y: originY },
          stepDragMotion as import('../../../../packages/ui/src/motion.ts').KeyframesMotion,
          {
            reduced: false,
            onFinish: finishCleanup,
          },
        );
      }
    },
    [clearHoldTimer, isReduced, stepDragMotion, stopAutoscroll],
  );

  const cancelDrag = useCallback(() => {
    snapBack('cancelled');
    return true;
  }, [snapBack]);

  const tickAutoscroll = useCallback(() => {
    const snapshot = gestureSnapshotRef.current;
    if (!snapshot || gestureEndedRef.current) {
      stopAutoscroll();
      return;
    }
    const coords = pointerCoordRef.current;
    if (!coords) return;

    const container =
      scrollContainerRef.current ||
      (document.scrollingElement as HTMLElement) ||
      document.documentElement;
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 56;
    let delta = 0;

    if (coords.clientY < rect.top + edgeThreshold) {
      const factor = Math.max(0, (rect.top + edgeThreshold - coords.clientY) / edgeThreshold);
      delta = -Math.round(4 + factor * 10);
    } else if (coords.clientY > rect.bottom - edgeThreshold) {
      const factor = Math.max(0, (coords.clientY - (rect.bottom - edgeThreshold)) / edgeThreshold);
      delta = Math.round(4 + factor * 10);
    }

    if (delta !== 0) {
      container.scrollTop += delta;
      if (container === document.documentElement) {
        window.scrollBy({ top: delta, behavior: 'auto' });
      }

      // Recompute target under stationary finger while list scrolls
      const dropAfter = computeTargetAtPoint(coords.clientX, coords.clientY, snapshot.activeStepId);
      if (dropAfter !== targetAfterRef.current) {
        targetAfterRef.current = dropAfter;
        setDragState((prev) => ({ ...prev, targetAfterId: dropAfter }));
      }
    }
  }, [computeTargetAtPoint, stopAutoscroll]);

  const startAutoscroll = useCallback(() => {
    if (autoscrollInterval.current === null) {
      autoscrollInterval.current = window.setInterval(tickAutoscroll, 16);
    }
  }, [tickAutoscroll]);

  const liftDrag = useCallback(
    (stepId: StepId, clientX: number, clientY: number) => {
      const tracker = pointerTracker.current;
      if (!tracker || tracker.isMoved) return;

      tracker.isMoved = true;
      gestureEndedRef.current = false;

      const initialX = clientX - tracker.grabOffsetX;
      const initialY = clientY - tracker.grabOffsetY;

      gestureSnapshotRef.current = {
        pointerId: tracker.pointerId,
        activeStepId: stepId,
        grabOffsetX: tracker.grabOffsetX,
        grabOffsetY: tracker.grabOffsetY,
        initialRect: { ...tracker.initialRect },
        initialScrollTop: tracker.initialScrollTop,
        initialScrollLeft: tracker.initialScrollLeft,
        currentX: initialX,
        currentY: initialY,
      };

      // Register cancel handler only for Recipe view (not Planning)
      if (!planning) {
        activeDragCancelFn = () => {
          cancelDrag();
          return true;
        };
      }

      // Enter editing on actual drag (L104)
      onStartDragRef.current?.();

      setDragState({
        activeStepId: stepId,
        targetAfterId: undefined,
        isDragging: true,
        floatingPosition: {
          x: initialX,
          y: initialY,
          width: tracker.initialRect.width,
          height: tracker.initialRect.height,
        },
        isSettling: false,
        offsetY: clientY - tracker.startY,
      });

      onAnnounceRef.current(stepCopy(localeRef.current, 'dragGrabbed'));
      startAutoscroll();
    },
    [cancelDrag, planning, startAutoscroll],
  );

  const handlePointerDown = (stepId: StepId, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in mock environment
    }
    clearHoldTimer();
    clearSettleTimer();
    gestureEndedRef.current = false;

    const grip = e.currentTarget;
    const rowEl = grip.closest<HTMLElement>('[data-step-id]') || grip;
    const rect = rowEl.getBoundingClientRect();

    activeProcessViewRef.current =
      grip.closest<HTMLElement>('[data-process-root="recipe"]') ||
      grip.closest<HTMLElement>('[data-process-root]') ||
      grip.closest<HTMLElement>('[data-step-design]');
    const container =
      grip.closest<HTMLElement>('.section-carousel-pane') ||
      grip.closest<HTMLElement>('.phone-content') ||
      (document.scrollingElement as HTMLElement) ||
      document.documentElement;
    scrollContainerRef.current = container;

    pointerTracker.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      activeStepId: stepId,
      isMoved: false,
      grabOffsetX: e.clientX - rect.left,
      grabOffsetY: e.clientY - rect.top,
      initialRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      initialScrollTop: container.scrollTop,
      initialScrollLeft: container.scrollLeft,
    };
    pointerCoordRef.current = { clientX: e.clientX, clientY: e.clientY };
    targetAfterRef.current = undefined;

    const mode = getDragActivationMode();
    if (mode === 'hold') {
      holdTimerRef.current = window.setTimeout(() => {
        const tr = pointerTracker.current;
        if (tr && tr.pointerId === e.pointerId && !tr.isMoved) {
          liftDrag(tr.activeStepId, e.clientX, e.clientY);
        }
      }, 300);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement> | PointerEvent) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;

    pointerCoordRef.current = { clientX: e.clientX, clientY: e.clientY };
    const deltaX = e.clientX - tracker.startX;
    const deltaY = e.clientY - tracker.startY;

    const mode = getDragActivationMode();
    if (mode === 'hold' && !tracker.isMoved && Math.hypot(deltaX, deltaY) > 10) {
      clearHoldTimer();
    }

    if (!tracker.isMoved && mode === 'move' && Math.hypot(deltaX, deltaY) > 6) {
      liftDrag(tracker.activeStepId, e.clientX, e.clientY);
    }

    if (!tracker.isMoved) return;

    const currentX = e.clientX - tracker.grabOffsetX;
    const currentY = e.clientY - tracker.grabOffsetY;

    if (gestureSnapshotRef.current) {
      gestureSnapshotRef.current.currentX = currentX;
      gestureSnapshotRef.current.currentY = currentY;
    }

    setDragState((prev) => ({
      ...prev,
      offsetY: deltaY,
      floatingPosition: prev.floatingPosition
        ? {
            ...prev.floatingPosition,
            x: currentX,
            y: currentY,
          }
        : null,
    }));

    const dropAfter = computeTargetAtPoint(e.clientX, e.clientY, tracker.activeStepId);
    if (dropAfter !== targetAfterRef.current) {
      targetAfterRef.current = dropAfter;
      setDragState((prev) => ({ ...prev, targetAfterId: dropAfter }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement> | PointerEvent) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;

    clearHoldTimer();
    stopAutoscroll();

    try {
      if (e.currentTarget && 'releasePointerCapture' in e.currentTarget) {
        (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    if (!tracker.isMoved) {
      pointerTracker.current = null;
      pointerCoordRef.current = null;
      targetAfterRef.current = undefined;
      return;
    }

    // Re-evaluate drop target at exact release pointer position
    const targetAfter = computeTargetAtPoint(e.clientX, e.clientY, tracker.activeStepId);
    const activeId = tracker.activeStepId;
    const steps = processRef.current.steps;
    const activeIndex = steps.findIndex((s) => s.id === activeId);
    const currentPredecessor = activeIndex <= 0 ? null : steps[activeIndex - 1].id;

    // Drop outside or no-op returns source via snapBack
    if (
      targetAfter === undefined ||
      targetAfter === activeId ||
      targetAfter === currentPredecessor
    ) {
      snapBack('outside');
      return;
    }

    // Coordinate outcome explicitly
    const outcome = onMoveRef.current(activeId, targetAfter);

    if (outcome === 'accepted' || outcome === 'pending') {
      gestureEndedRef.current = true;
      activeDragCancelFn = null;
      pointerTracker.current = null;
      pointerCoordRef.current = null;
      targetAfterRef.current = undefined;
      gestureSnapshotRef.current = null;
      setDragState({
        activeStepId: null,
        targetAfterId: undefined,
        isDragging: false,
        floatingPosition: null,
        isSettling: false,
        offsetY: 0,
      });
    } else if (outcome === 'refused') {
      snapBack('refused');
    } else {
      snapBack('unchanged');
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement> | PointerEvent) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;
    clearHoldTimer();
    try {
      if (e.currentTarget && 'releasePointerCapture' in e.currentTarget) {
        (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    cancelDrag();
  };

  const handleLostPointerCapture = (e?: React.PointerEvent<HTMLButtonElement>) => {
    const tracker = pointerTracker.current;
    if (!tracker) return;
    if (e && e.pointerId !== undefined && tracker.pointerId !== e.pointerId) return;
    if (gestureEndedRef.current) return;
  };

  // Keyboard Escape cancels drag
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current.isDragging) {
        cancelDrag();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [cancelDrag]);

  // Window pointer listeners maintain tracking even if handle re-renders upon draft opening
  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (pointerTracker.current && pointerTracker.current.isMoved) {
        handlePointerMove(e);
      }
    };
    const onWindowPointerUp = (e: PointerEvent) => {
      if (pointerTracker.current && pointerTracker.current.isMoved) {
        handlePointerUp(e);
      }
    };
    const onWindowPointerCancel = (e: PointerEvent) => {
      if (pointerTracker.current && pointerTracker.current.isMoved) {
        handlePointerCancel(e);
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
    };
  }, [cancelDrag]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearSettleTimer();
      if (autoscrollInterval.current !== null) {
        window.clearInterval(autoscrollInterval.current);
        autoscrollInterval.current = null;
      }
      activeDragCancelFn = null;
    };
  }, [clearHoldTimer, clearSettleTimer]);

  return {
    dragState,
    floatingCardRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    cancelDrag,
  };
}

export interface DragHandleProps {
  step: ProcessStep;
  index: number;
  totalSteps: number;
  locale: Locale;
  title: string;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onKeyboardMove: (index: number, delta: number) => void;
}

export const DragHandle = ({
  step,
  index,
  totalSteps,
  locale,
  title,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyboardMove,
}: DragHandleProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) onKeyboardMove(index, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < totalSteps - 1) onKeyboardMove(index, 1);
    }
  };

  return (
    <button
      type="button"
      className={`fp-drag-handle ${isDragging ? 'is-grabbing' : ''}`}
      aria-label={`${stepCopy(locale, 'dragHandle')} : ${title}`}
      title={stepCopy(locale, 'dragHandleHint')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onKeyDown={handleKeyDown}
      data-testid={`drag-handle-${step.id}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block', pointerEvents: 'none' }}
      >
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
    </button>
  );
};

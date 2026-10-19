import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Process, ProcessStep, StepId } from '@flourprint/core/domain';
import type { Locale } from './messages';
import { stepCopy } from './steps-copy';
import './step-drag.css';

export const DRAG_ACTIVATION_QUERY = 'dragActivation';
export type DragActivationMode = 'move' | 'hold';

export const getDragActivationMode = (): DragActivationMode => {
  if (typeof location === 'undefined') return 'move';
  const param = new URLSearchParams(location.search).get(DRAG_ACTIVATION_QUERY);
  return param === 'hold' ? 'hold' : 'move';
};

export interface DragState {
  activeStepId: StepId | null;
  targetAfterId: StepId | null | undefined;
  isDragging: boolean;
  offsetY: number;
}

export interface UseStepDragProps {
  process: Process;
  locale: Locale;
  onMove: (stepId: StepId, after: StepId | null) => void;
  onAnnounce: (message: string) => void;
}

export function useStepDrag({ process, locale, onMove, onAnnounce }: UseStepDragProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeStepId: null,
    targetAfterId: undefined,
    isDragging: false,
    offsetY: 0,
  });

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onAnnounceRef = useRef(onAnnounce);
  onAnnounceRef.current = onAnnounce;

  const processRef = useRef(process);
  processRef.current = process;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const pointerTracker = useRef<{
    pointerId: number;
    startY: number;
    activeStepId: StepId;
    isMoved: boolean;
  } | null>(null);

  const pointerCoordRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const targetAfterRef = useRef<StepId | null | undefined>(undefined);
  const autoscrollInterval = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const activeProcessViewRef = useRef<HTMLElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
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
      const elements = document.elementsFromPoint(clientX, clientY);
      const activeView = activeProcessViewRef.current;
      const stepRowElement = elements.find(
        (el) => el.hasAttribute('data-step-id') && (!activeView || activeView.contains(el)),
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

  const cancelDrag = useCallback(() => {
    clearHoldTimer();
    stopAutoscroll();
    const wasDragging = dragStateRef.current.isDragging;
    pointerTracker.current = null;
    pointerCoordRef.current = null;
    targetAfterRef.current = undefined;
    setDragState({
      activeStepId: null,
      targetAfterId: undefined,
      isDragging: false,
      offsetY: 0,
    });
    if (wasDragging) {
      onAnnounceRef.current(stepCopy(localeRef.current, 'dragCancelled'));
    }
  }, [stopAutoscroll, clearHoldTimer]);

  const tickAutoscroll = useCallback(() => {
    const tracker = pointerTracker.current;
    if (!tracker || !tracker.isMoved) {
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

      // Recompute drop target while finger is held still during scrolling
      const dropAfter = computeTargetAtPoint(coords.clientX, coords.clientY, tracker.activeStepId);
      if (dropAfter !== undefined && dropAfter !== targetAfterRef.current) {
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

  const handlePointerDown = (stepId: StepId, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if not supported in mock environment
    }
    clearHoldTimer();
    const grip = e.currentTarget;
    activeProcessViewRef.current =
      grip.closest<HTMLElement>('[data-process-root]') ||
      grip.closest<HTMLElement>('.section-carousel-pane') ||
      grip.closest<HTMLElement>('[data-step-design]');
    scrollContainerRef.current =
      grip.closest<HTMLElement>('.section-carousel-pane') ||
      grip.closest<HTMLElement>('.phone-content') ||
      (document.scrollingElement as HTMLElement) ||
      document.documentElement;

    pointerTracker.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      activeStepId: stepId,
      isMoved: false,
    };
    pointerCoordRef.current = { clientX: e.clientX, clientY: e.clientY };
    targetAfterRef.current = undefined;

    const mode = getDragActivationMode();
    if (mode === 'hold') {
      holdTimerRef.current = window.setTimeout(() => {
        const tracker = pointerTracker.current;
        if (tracker && tracker.pointerId === e.pointerId && !tracker.isMoved) {
          tracker.isMoved = true;
          targetAfterRef.current = undefined;
          setDragState({
            activeStepId: tracker.activeStepId,
            targetAfterId: undefined,
            isDragging: true,
            offsetY: 0,
          });
          onAnnounceRef.current(stepCopy(localeRef.current, 'dragGrabbed'));
          startAutoscroll();
        }
      }, 350);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;

    pointerCoordRef.current = { clientX: e.clientX, clientY: e.clientY };
    const deltaY = e.clientY - tracker.startY;

    const mode = getDragActivationMode();
    if (mode === 'hold' && !tracker.isMoved && Math.abs(deltaY) > 10) {
      clearHoldTimer();
    }

    if (!tracker.isMoved && mode === 'move' && Math.abs(deltaY) > 5) {
      tracker.isMoved = true;
      targetAfterRef.current = undefined;
      setDragState({
        activeStepId: tracker.activeStepId,
        targetAfterId: undefined,
        isDragging: true,
        offsetY: deltaY,
      });
      onAnnounceRef.current(stepCopy(localeRef.current, 'dragGrabbed'));
      startAutoscroll();
    }

    if (!tracker.isMoved) return;

    setDragState((prev) => ({
      ...prev,
      offsetY: deltaY,
    }));

    const dropAfter = computeTargetAtPoint(e.clientX, e.clientY, tracker.activeStepId);
    if (dropAfter !== undefined && dropAfter !== targetAfterRef.current) {
      targetAfterRef.current = dropAfter;
      setDragState((prev) => ({ ...prev, targetAfterId: dropAfter }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;

    clearHoldTimer();
    stopAutoscroll();

    const targetAfter = targetAfterRef.current;
    pointerTracker.current = null;
    pointerCoordRef.current = null;
    targetAfterRef.current = undefined;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (tracker.isMoved) {
      const activeId = tracker.activeStepId;
      const steps = processRef.current.steps;
      const activeIndex = steps.findIndex((s) => s.id === activeId);
      const currentPredecessor = activeIndex <= 0 ? null : steps[activeIndex - 1].id;

      // Ignore no-op drop where target is the active item or its existing predecessor
      if (
        targetAfter !== undefined &&
        targetAfter !== activeId &&
        targetAfter !== currentPredecessor
      ) {
        onMoveRef.current(activeId, targetAfter);
      }
    }

    setDragState({
      activeStepId: null,
      targetAfterId: undefined,
      isDragging: false,
      offsetY: 0,
    });
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const tracker = pointerTracker.current;
    if (!tracker || tracker.pointerId !== e.pointerId) return;
    clearHoldTimer();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    cancelDrag();
  };

  const handleLostPointerCapture = (e?: React.PointerEvent<HTMLButtonElement>) => {
    const tracker = pointerTracker.current;
    if (!tracker) return;
    if (e && e.pointerId !== undefined && tracker.pointerId !== e.pointerId) return;
    if (tracker.isMoved) {
      cancelDrag();
    }
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

  // Clean up interval and hold timer on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer();
      if (autoscrollInterval.current !== null) {
        window.clearInterval(autoscrollInterval.current);
        autoscrollInterval.current = null;
      }
    };
  }, [clearHoldTimer]);

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
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

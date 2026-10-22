import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Process, ProcessStep, StepId } from '@flourprint/core/domain';
import { colon, type Locale } from './messages';
import { stepCopy } from './steps-copy';
import {
  SortableList,
  SortableItem,
  useSortableItem,
  cancelActiveSortableDrag,
} from '../../../../packages/ui/src/components/sortable-list/index.ts';
import type { SortableDropIntent } from '../../../../packages/ui/src/props.ts';
import './step-drag.css';

export { SortableList, SortableItem, useSortableItem };

export const DRAG_ACTIVATION_QUERY = 'dragActivation';
export type DragActivationMode = 'move' | 'hold';

export const getDragActivationMode = (): DragActivationMode => {
  if (typeof location === 'undefined') return 'move';
  const param = new URLSearchParams(location.search).get(DRAG_ACTIVATION_QUERY);
  return param === 'hold' ? 'hold' : 'move';
};

export function cancelActiveStepDrag(): boolean {
  return cancelActiveSortableDrag();
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

export interface DragState {
  activeStepId: StepId | null;
  isDragging: boolean;
}

export function useStepDrag({
  process,
  locale,
  onMove,
  onAnnounce,
  onStartDrag,
}: UseStepDragProps) {
  const [activeStepId, setActiveStepId] = useState<StepId | null>(null);

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onAnnounceRef = useRef(onAnnounce);
  onAnnounceRef.current = onAnnounce;

  const onStartDragRef = useRef(onStartDrag);
  onStartDragRef.current = onStartDrag;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  const handleDragStart = useCallback((id: string) => {
    setActiveStepId(id);
    onStartDragRef.current?.();
    onAnnounceRef.current(stepCopy(localeRef.current, 'dragGrabbed'));
  }, []);

  const handleDropIntent = useCallback((intent: SortableDropIntent | null) => {
    setActiveStepId(null);
    if (!intent) {
      onAnnounceRef.current(stepCopy(localeRef.current, 'dragCancelled'));
      return 'unchanged';
    }

    const outcome = onMoveRef.current(intent.id, intent.afterId);
    if (outcome === 'accepted') {
      onAnnounceRef.current(stepCopy(localeRef.current, 'orderChanged'));
    } else if (outcome === 'refused' || outcome === 'pending') {
      // Announce and feedback handled by consumer toast/modal
    } else if (outcome === 'unchanged') {
      onAnnounceRef.current(stepCopy(localeRef.current, 'dragCancelled'));
    }
    return outcome;
  }, []);

  // Global Escape cancellation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeStepId) {
        cancelActiveStepDrag();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStepId]);

  const sortableItems = useMemo(() => process.steps.map((s) => ({ id: s.id })), [process.steps]);

  const dragState: DragState = {
    activeStepId,
    isDragging: activeStepId !== null,
  };

  return {
    activeStepId,
    dragState,
    sortableItems,
    activationMode: getDragActivationMode(),
    handleDragStart,
    handleDropIntent,
    cancelDrag: cancelActiveStepDrag,
  };
}

export interface DragHandleProps {
  step: ProcessStep;
  index: number;
  totalSteps: number;
  locale: Locale;
  title: string;
  isDragging: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
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
  onKeyboardMove,
}: DragHandleProps) => {
  const { handleRef } = useSortableItem();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (index > 0) onKeyboardMove(index, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (index < totalSteps - 1) onKeyboardMove(index, 1);
    }
  };

  return (
    <button
      ref={handleRef}
      type="button"
      className={`fp-drag-handle ${isDragging ? 'is-grabbing' : ''}`}
      aria-label={`${stepCopy(locale, 'dragHandle')}${colon(locale)}${title}`}
      aria-description={stepCopy(locale, 'dragHandleHint')}
      aria-keyshortcuts="ArrowUp ArrowDown"
      title={stepCopy(locale, 'dragHandleHint')}
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

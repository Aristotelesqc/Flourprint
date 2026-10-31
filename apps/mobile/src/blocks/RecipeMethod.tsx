import { IonButton } from '@ionic/react';
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  duplicateStep,
  insertStepAfter,
  temperatureContext,
  type DuplicateResult,
  type Process,
  type ProcessStep,
} from '@flourprint/core/domain';
import { SortableItem, SortableSlot } from '@flourprint/ui/components/sortable-list/v1';
import { useMessages } from '../i18n/use-messages';
import { formatDuration } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { DurationField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Rows, SectionTitle } from '../ui/Layout';
import { Ui } from '../ui/library';
import { useServices } from '../services/services';
import { useValidationActions } from '../ui/ValidationContext';
import { newStepId, STEP_OPERATIONS } from '../services/process-edit';
import { DuplicateStepReview } from './DuplicateStepReview';
import { RecipeOutcome } from './RecipeOutcome';
import { StepEquipmentDetails } from './StepEquipmentDetails';
import { StepSheet, techniqueSummary } from './StepSheet';

interface Props {
  readonly dragControl?: React.Ref<{ cancelDrag(): boolean }>;
  readonly process: Process;
  /** Undefined clears duration (unknown); false when edit refused. */
  readonly onDurationChange?: (stepId: string, durationS: number | undefined) => boolean;
  /** Process structure and technique edits; false when refused. */
  readonly onProcessChange?: (process: Process) => boolean;
  /** Formula preparation ids: steps removed through preparation, not directly. */
  readonly preparationIds: readonly string[];
  /** Whether authored steps are editable or read-only consultation. */
  readonly editable: boolean;
  /** Step to target/open directly when navigating from Planning shortcut (#71). */
  readonly targetedStepId?: string;
  /** Called once targetedStepId is consumed so sheet closure does not conflict. */
  readonly onClearTargetedStep?: () => void;
  /** Callback to return to the Planning tab if shortcut was used. */
  readonly onReturnToPlanning?: () => void;
  /** Step IDs whose duration is managed in FermentationCard. */
  readonly fermentationStepIds?: ReadonlySet<string>;
  /** Callback to navigate to FermentationCard for a step. */
  readonly onEditFermentation?: (stepId: string) => void;
  /** Whether to show RecipeOutcome (defaults to true; false when authored in Result section). */
  readonly showOutcome?: boolean;
  /** Called with the drop intent; returns accepted, refused, or unchanged. */
  readonly onDropIntent?: (
    intent: { id: string; afterId: string | null } | null,
  ) => 'accepted' | 'refused' | 'unchanged';
  /** Called when actual drag starts. */
  readonly onDragStart?: (id: string) => void;
  /** Called when active drag state changes. */
  readonly onDragActiveChange?: (active: boolean) => void;
  /** Whether sorting/reordering is disabled (trashed, busy, invalid, etc.). */
  readonly disabled?: boolean;
}

/** Whether a step depends exclusively on the immediately preceding authored step. */
export const isImmediatelyPreceding = (
  step: ProcessStep,
  allSteps: readonly ProcessStep[],
): boolean => {
  if (step.dependsOn.length !== 1) return false;
  const index = allSteps.findIndex((s) => s.id === step.id);
  return index > 0 && step.dependsOn[0] === allSteps[index - 1]?.id;
};

/**
 * Authored method component for the Recipe tab (#71).
 * Displays authored method steps, durations, techniques, conditions and dependencies.
 * Handles step authoring, durations, adding/removing steps, reordering, and shortcut return.
 */
export const RecipeMethod = ({
  dragControl,
  process,
  onDurationChange,
  onProcessChange,
  preparationIds,
  editable,
  targetedStepId,
  onClearTargetedStep,
  onReturnToPlanning,
  fermentationStepIds,
  onEditFermentation,
  showOutcome = true,
  onDropIntent,
  onDragStart,
  onDragActiveChange,
  disabled = false,
}: Props) => {
  const { t, error, stepName, stepInstructions } = useMessages();
  const { ids } = useServices();
  const validationActions = useValidationActions();
  const temperature = useTemperature();
  const [selectedStepId, setSelectedStepId] = useState<string>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [highlightedStepId, setHighlightedStepId] = useState<string>();
  const stepButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const returnBtnRef = useRef<HTMLButtonElement>(null);
  const stepSnapshotRef = useRef<ProcessStep | undefined>(undefined);
  const frameRef = useRef<number | undefined>(undefined);
  const [pendingProposal, setPendingProposal] = useState<{
    readonly result: DuplicateResult;
    readonly originalStep: ProcessStep;
    readonly originalProcess: Process;
  }>();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const dismissActionRef = useRef<'none' | 'openReview'>('none');
  const keepIntentRef = useRef<{ process: Process; copyId: string } | undefined>(undefined);

  const isDragActiveRef = useRef(false);
  const sortableRef = useRef<{ cancelDrag(): boolean } | null>(null);

  useImperativeHandle(
    dragControl,
    () => ({ cancelDrag: () => sortableRef.current?.cancelDrag() ?? false }),
    [],
  );

  const canSort = !disabled && process.steps.length > 1;

  const items = useMemo(
    () =>
      process.steps.map((step) => ({
        id: step.id,
        label: stepName(step),
      })),
    [process.steps, stepName],
  );

  const activeStep = process.steps.find((s) => s.id === selectedStepId);
  if (activeStep) {
    stepSnapshotRef.current = activeStep;
  }
  const modalStep = activeStep ?? stepSnapshotRef.current;

  useEffect(() => {
    if (!targetedStepId) return;
    const targetExists = process.steps.some((s) => s.id === targetedStepId);
    if (!targetExists) {
      onClearTargetedStep?.();
      return;
    }
    setHighlightedStepId(targetedStepId);
    setSelectedStepId(targetedStepId);
    setIsSheetOpen(true);
    onClearTargetedStep?.();

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
    };
  }, [targetedStepId, process.steps, onClearTargetedStep]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleDragActiveChange = useCallback(
    (active: boolean) => {
      isDragActiveRef.current = active;
      onDragActiveChange?.(active);
    },
    [onDragActiveChange],
  );

  const handleDragStart = useCallback(
    (id: string) => {
      onDragStart?.(id);
    },
    [onDragStart],
  );

  const handleDropIntent = useCallback(
    (
      intent: { id: string; afterId: string | null; input?: unknown } | null,
    ): 'accepted' | 'refused' | 'unchanged' => {
      if (!onDropIntent) return 'unchanged';
      return onDropIntent(intent ? { id: intent.id, afterId: intent.afterId } : null);
    },
    [onDropIntent],
  );

  useEffect(() => {
    const handleBackButton = (ev: Event) => {
      const customEv = ev as CustomEvent<{
        register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
      }>;
      if (isDragActiveRef.current) {
        customEv.detail?.register(100, () => {
          sortableRef.current?.cancelDrag();
        });
      }
    };
    document.addEventListener('ionBackButton', handleBackButton);
    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, []);

  const handleSheetClose = () => {
    setIsSheetOpen(false);
  };

  const handleSheetDismissed = () => {
    setIsSheetOpen(false);
    stepSnapshotRef.current = undefined;
    if (dismissActionRef.current === 'openReview') {
      dismissActionRef.current = 'none';
      setIsReviewOpen(true);
      return;
    }
    const targetId = highlightedStepId ?? selectedStepId;
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (
        !containerRef.current ||
        containerRef.current.closest('[hidden]') ||
        containerRef.current.closest('.ion-page-hidden')
      ) {
        return;
      }
      const btn = targetId ? stepButtonRefs.current.get(targetId) : undefined;
      if (btn && document.contains(btn)) {
        btn.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        btn.focus({ preventScroll: true });
      } else {
        const fallback = returnBtnRef.current ?? headingRef.current;
        fallback?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        fallback?.focus({ preventScroll: true });
      }
    });
  };

  const handleRequestDuplicate = useCallback(
    (step: ProcessStep, source: Process): string | undefined => {
      if (disabled || !editable || !onProcessChange) return undefined;
      if (dismissActionRef.current !== 'none' || pendingProposal) return undefined;
      if (validationActions?.isBlocked()) {
        return t('step.duplicate.error.blocked');
      }
      const newId = `${step.operation}-${ids.next()}`;
      const result = duplicateStep(source, step.id, newId);
      if (!result.ok) {
        if (result.error.code === 'NotDuplicable') {
          const reason = result.error.details?.reason;
          if (reason === 'alap') return t('step.duplicate.error.alap');
          if (reason === 'beforeTarget') return t('step.duplicate.error.beforeTarget');
          if (reason === 'workpieceStep') return t('step.duplicate.error.workpieceStep');
        }
        return error(result.error);
      }
      setPendingProposal({
        result: result.value,
        originalStep: step,
        originalProcess: source,
      });
      dismissActionRef.current = 'openReview';
      setIsSheetOpen(false);
      return undefined;
    },
    [disabled, editable, onProcessChange, validationActions, ids, pendingProposal, t, error],
  );

  const handleKeepProposal = useCallback((candidateProcess: Process, copyId: string): boolean => {
    keepIntentRef.current = { process: candidateProcess, copyId };
    setIsReviewOpen(false);
    return true;
  }, []);

  const handleCancelReview = useCallback(() => {
    keepIntentRef.current = undefined;
    setIsReviewOpen(false);
  }, []);

  const handleReviewDismissed = useCallback(() => {
    setIsReviewOpen(false);
    const kept = keepIntentRef.current;
    keepIntentRef.current = undefined;
    const origStepId = pendingProposal?.originalStep.id;
    setPendingProposal(undefined);

    if (kept && onProcessChange) {
      const accepted = onProcessChange(kept.process);
      if (accepted) {
        setSelectedStepId(kept.copyId);
        setHighlightedStepId(kept.copyId);
        setIsSheetOpen(true);
        return;
      }
    }

    const targetId = origStepId ?? highlightedStepId ?? selectedStepId;
    if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (
        !containerRef.current ||
        containerRef.current.closest('[hidden]') ||
        containerRef.current.closest('.ion-page-hidden')
      ) {
        return;
      }
      const btn = targetId ? stepButtonRefs.current.get(targetId) : undefined;
      if (btn && document.contains(btn)) {
        btn.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        btn.focus({ preventScroll: true });
      } else {
        const fallback = returnBtnRef.current ?? headingRef.current;
        fallback?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        fallback?.focus({ preventScroll: true });
      }
    });
  }, [pendingProposal, onProcessChange, highlightedStepId, selectedStepId]);

  const nameOf = (id: string) => {
    const step = process.steps.find((s) => s.id === id);
    return step ? stepName(step) : id;
  };

  const renderOverlay = useCallback(
    (id: string) => {
      const step = process.steps.find((s) => s.id === id);
      if (!step) return null;
      return (
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-lg opacity-100"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-touch w-touch min-h-touch min-w-touch items-center justify-center text-muted">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </span>
            <span className="font-semibold text-ink">{stepName(step)}</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              {t('prep.duration')}
            </span>
            <span className="font-medium text-ink">
              {step.plannedDurationS !== undefined ? formatDuration(step.plannedDurationS) : '—'}
            </span>
          </div>
        </div>
      );
    },
    [process.steps, stepName, t],
  );

  const instructions = useMemo(
    () => ({
      draggable: t('recipe.sort.instructions.draggable'),
    }),
    [t],
  );

  const announcements = useMemo(
    () => ({
      dragStarted: (item: { id: string; label: string }) => {
        const index = process.steps.findIndex((s) => s.id === item.id);
        return t('recipe.sort.announcement.dragStarted', {
          step: item.label,
          position: index + 1,
          total: process.steps.length,
        });
      },
      dragEnded: (item: { id: string; label: string }, afterId: string | null) => {
        if (afterId === null)
          return t('recipe.sort.announcement.dragEndedStart', { step: item.label });
        const after = process.steps.find((step) => step.id === afterId);
        return t('recipe.sort.announcement.dragEnded', {
          step: item.label,
          after: after ? stepName(after) : t('recipe.sort.unknownStep'),
        });
      },
      dragCancelled: (item: { id: string; label: string }) =>
        t('recipe.sort.announcement.dragCancelled', { step: item.label }),
    }),
    [process.steps, t, stepName],
  );

  return (
    <section ref={containerRef} data-testid="recipe-method" className="flex flex-col gap-3 pb-6">
      <div
        ref={headingRef}
        tabIndex={-1}
        className="flex flex-wrap items-center justify-between gap-3 outline-none"
      >
        <span className="flex items-center gap-1.5">
          <SectionTitle>{t('recipe.methodTitle')}</SectionTitle>
          <InfoButton topic="technique" term={t('recipe.methodTitle')} />
        </span>
        {onReturnToPlanning && (
          <button
            ref={returnBtnRef}
            type="button"
            className="fp-reset inline-flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-accent-text shadow-sm hover:bg-field-bg active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            onClick={onReturnToPlanning}
          >
            <span aria-hidden="true">←</span>
            <span>{t('recipe.returnToPlanning')}</span>
          </button>
        )}
      </div>

      <Ui
        ref={sortableRef}
        component="fp.sortable-list"
        items={items}
        renderOverlay={renderOverlay}
        onDropIntent={handleDropIntent}
        instructions={instructions}
        announcements={announcements}
        onDragStart={handleDragStart}
        onDragActiveChange={handleDragActiveChange}
        disabled={!canSort}
      >
        <SortableSlot afterId={null} />
        {process.steps.map((step, index) => {
          const isLinearPrev = isImmediatelyPreceding(step, process.steps);
          const hints = [
            ...(step.dependsOn.length > 0 && !isLinearPrev
              ? [t('process.after', { steps: step.dependsOn.map(nameOf).join(', ') })]
              : []),
          ];
          const isHighlighted = step.id === highlightedStepId;
          const isFermentationManaged = fermentationStepIds?.has(step.id) ?? false;
          return (
            <Fragment key={step.id}>
              <SortableItem id={step.id} className="mb-2">
                {({ handleRef }: { handleRef?: React.Ref<HTMLButtonElement> }) => (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 ${
                      isHighlighted ? 'bg-accent-soft/30 ring-2 ring-accent' : ''
                    }`}
                  >
                    <div className="flex min-w-[140px] flex-1 items-start gap-2">
                      <button
                        ref={handleRef}
                        hidden={process.steps.length < 2}
                        disabled={!canSort}
                        type="button"
                        className="fp-reset flex h-touch w-touch min-h-touch min-w-touch shrink-0 items-center justify-center rounded-lg text-muted hover:text-ink active:text-accent touch-none cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={t('recipe.sort.dragHandle', { step: stepName(step) })}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </button>

                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 tabular-nums text-sm font-bold text-muted">
                            {index + 1}.
                          </span>
                          {editable ? (
                            <button
                              ref={(el) => {
                                if (el) stepButtonRefs.current.set(step.id, el);
                                else stepButtonRefs.current.delete(step.id);
                              }}
                              type="button"
                              className="fp-reset inline-flex min-h-12 items-center gap-1.5 rounded text-left font-semibold text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                              aria-label={t('process.editStep', { step: stepName(step) })}
                              onClick={() => {
                                setHighlightedStepId(step.id);
                                setSelectedStepId(step.id);
                                setIsSheetOpen(true);
                              }}
                            >
                              <span>{stepName(step)}</span>
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                className="shrink-0 opacity-70"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          ) : (
                            <span className="min-h-12 py-3 font-semibold text-ink">
                              {stepName(step)}
                            </span>
                          )}
                        </div>
                        {step.technique && (
                          <span className="text-[13px] text-ink">
                            {techniqueSummary(t, step.technique)}
                          </span>
                        )}
                        {stepInstructions(step) && (
                          <span className="text-[13px] text-muted">{stepInstructions(step)}</span>
                        )}
                        {step.conditions && (
                          <span className="text-[13px] text-muted">
                            {[
                              step.conditions.location,
                              step.conditions.temperatureC !== undefined
                                ? `${
                                    temperatureContext(step) === 'oven'
                                      ? t('equipment.label.setpoint')
                                      : t('fermentation.room')
                                  } : ${temperature.format(
                                    step.conditions.temperatureC,
                                    temperatureContext(step),
                                  )}`
                                : undefined,
                              step.conditions.doughTemperatureC !== undefined
                                ? `${t('fermentation.target')} : ${temperature.format(step.conditions.doughTemperatureC, 'ambient')}`
                                : undefined,
                              step.conditions.frictionC !== undefined
                                ? `${t('fermentation.friction')} : ${temperature.format(step.conditions.frictionC, 'ambient', { difference: true })}`
                                : undefined,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                        <StepEquipmentDetails step={step} />
                        {(hints.length > 0 || step.schedule === 'alap') && (
                          <span className="text-[13px] text-muted">
                            {step.schedule === 'alap' && (
                              <span className="mr-1 inline-flex items-center gap-1 font-semibold">
                                {t('process.alap')}
                                <InfoButton topic="alap" term={t('process.alap')} />
                              </span>
                            )}
                            {step.schedule === 'alap' && hints.length > 0 && ' · '}
                            {hints.join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isFermentationManaged ? (
                      <div className="flex flex-wrap items-center justify-end gap-2 text-right sm:max-w-[65%]">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                            {t('prep.duration')}
                          </span>
                          <span className="font-medium text-ink">
                            {step.durationMode === 'model'
                              ? step.plannedDurationS !== undefined
                                ? `≈ ${formatDuration(step.plannedDurationS)}`
                                : t('fermentation.auto')
                              : step.plannedDurationS !== undefined
                                ? formatDuration(step.plannedDurationS)
                                : '—'}
                          </span>
                        </div>
                        {editable && onEditFermentation && (
                          <button
                            type="button"
                            className="fp-reset inline-flex min-h-12 max-w-full items-center justify-center rounded-lg border border-line bg-surface px-3 py-1.5 text-center text-xs font-semibold leading-snug text-accent-text shadow-sm hover:bg-field-bg active:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            aria-label={t('recipe.editFermentationFor', { step: stepName(step) })}
                            onClick={() => onEditFermentation(step.id)}
                          >
                            {t('recipe.editFermentation')}
                          </button>
                        )}
                      </div>
                    ) : editable && onDurationChange ? (
                      <div className="shrink-0">
                        <DurationField
                          label={t('process.duration', { step: stepName(step) })}
                          value={step.plannedDurationS}
                          optional={step.schedule !== 'alap'}
                          onCommit={(seconds) => onDurationChange(step.id, seconds)}
                        />
                      </div>
                    ) : (
                      <div className="flex shrink-0 flex-col items-end text-right">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                          {t('prep.duration')}
                        </span>
                        <span className="font-medium text-ink">
                          {step.plannedDurationS !== undefined
                            ? formatDuration(step.plannedDurationS)
                            : '—'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </SortableItem>
              <SortableSlot afterId={step.id} />
            </Fragment>
          );
        })}
      </Ui>

      {showOutcome && (
        <RecipeOutcome
          process={process}
          editable={editable}
          {...(onProcessChange ? { onChange: onProcessChange } : {})}
        />
      )}

      {editable && onProcessChange && (
        <Rows>
          <AddStep
            process={process}
            onAdd={(after, operation) =>
              onProcessChange(
                insertStepAfter(process, after, {
                  id: newStepId(process, operation, preparationIds),
                  operation,
                  schedule: 'asap',
                }),
              )
            }
          />
        </Rows>
      )}

      {editable && onProcessChange && (
        <StepSheet
          open={isSheetOpen}
          step={modalStep}
          process={process}
          preparation={selectedStepId !== undefined && preparationIds.includes(selectedStepId)}
          onChange={onProcessChange}
          onClose={handleSheetClose}
          onDismissed={handleSheetDismissed}
          onDuplicate={handleRequestDuplicate}
          duplicateDisabled={disabled}
        />
      )}

      <DuplicateStepReview
        isOpen={isReviewOpen}
        proposal={pendingProposal}
        currentProcess={process}
        onKeep={handleKeepProposal}
        onCancel={handleCancelReview}
        onDismissed={handleReviewDismissed}
        disabled={disabled}
      />
    </section>
  );
};

const AddStep = ({
  process,
  onAdd,
}: {
  process: Process;
  onAdd: (after: string, operation: string) => boolean;
}) => {
  const { t, stepName } = useMessages();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [after, setAfter] = useState<string>();
  const [operation, setOperation] = useState<string>(STEP_OPERATIONS[0]);
  const anchor = process.steps.find((s) => s.id === after) ?? process.steps.at(-1);
  if (!open || !anchor) {
    return (
      <button
        type="button"
        className="fp-reset min-h-12 w-full px-4 text-left font-semibold text-accent-text disabled:text-muted"
        disabled={process.steps.length === 0}
        onClick={() => setOpen(true)}
      >
        {t('process.addStep')}
      </button>
    );
  }
  const selectClass =
    'fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink';
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <span className="text-sm font-semibold">{t('process.addStep')}</span>
      <label htmlFor={`${id}-after`} className="text-sm">
        {t('process.addStep.after')}
      </label>
      <select
        id={`${id}-after`}
        className={selectClass}
        value={anchor.id}
        onChange={(event) => setAfter(event.target.value)}
      >
        {process.steps.map((s) => (
          <option key={s.id} value={s.id}>
            {stepName(s)}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-operation`} className="text-sm">
        {t('process.addStep.operation')}
      </label>
      <select
        id={`${id}-operation`}
        className={selectClass}
        value={operation}
        onChange={(event) => setOperation(event.target.value)}
      >
        {STEP_OPERATIONS.map((code) => (
          <option key={code} value={code}>
            {stepName({ operation: code })}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted">{t('process.addStep.hint')}</span>
      <span className="flex gap-2">
        <IonButton
          onClick={() => {
            if (onAdd(anchor.id, operation)) setOpen(false);
          }}
        >
          {t('process.addStep.confirm')}
        </IonButton>
        <IonButton fill="outline" onClick={() => setOpen(false)}>
          {t('process.addStep.cancel')}
        </IonButton>
      </span>
    </div>
  );
};

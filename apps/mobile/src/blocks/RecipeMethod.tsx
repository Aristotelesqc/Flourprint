import { IonButton } from '@ionic/react';
import { useEffect, useId, useRef, useState } from 'react';
import {
  insertStepAfter,
  temperatureContext,
  type Process,
  type ProcessStep,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { formatDuration } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { DurationField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Rows, SectionTitle } from '../ui/Layout';
import { newStepId, STEP_OPERATIONS } from '../services/process-edit';
import { RecipeOutcome } from './RecipeOutcome';
import { StepEquipmentDetails } from './StepEquipmentDetails';
import { StepSheet, techniqueSummary } from './StepSheet';

interface Props {
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
}

/**
 * Authored method component for the Recipe tab (#71).
 * Displays authored method steps, durations, techniques, conditions and dependencies.
 * Handles step authoring, durations, adding/removing steps, and shortcut return.
 */
export const RecipeMethod = ({
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
}: Props) => {
  const { t, stepName } = useMessages();
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

  const handleSheetClose = () => {
    setIsSheetOpen(false);
  };

  const handleSheetDismissed = () => {
    setIsSheetOpen(false);
    stepSnapshotRef.current = undefined;
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

  const nameOf = (id: string) => {
    const step = process.steps.find((s) => s.id === id);
    return step ? stepName(step) : id;
  };

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

      <Rows>
        {process.steps.map((step) => {
          const hints = [
            ...(step.dependsOn.length > 0
              ? [t('process.after', { steps: step.dependsOn.map(nameOf).join(', ') })]
              : []),
          ];
          const isHighlighted = step.id === highlightedStepId;
          const isFermentationManaged = fermentationStepIds?.has(step.id) ?? false;
          return (
            <div
              key={step.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                isHighlighted ? 'bg-accent-soft/30 ring-2 ring-accent' : ''
              }`}
            >
              <div className="flex min-w-[140px] flex-1 flex-col gap-0.5">
                {editable ? (
                  <button
                    ref={(el) => {
                      if (el) stepButtonRefs.current.set(step.id, el);
                      else stepButtonRefs.current.delete(step.id);
                    }}
                    type="button"
                    className="fp-reset min-h-12 rounded text-left font-semibold text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    aria-label={t('process.editStep', { step: stepName(step) })}
                    onClick={() => {
                      setHighlightedStepId(step.id);
                      setSelectedStepId(step.id);
                      setIsSheetOpen(true);
                    }}
                  >
                    {stepName(step)}
                  </button>
                ) : (
                  <span className="min-h-12 py-3 font-semibold text-ink">{stepName(step)}</span>
                )}
                {step.technique && (
                  <span className="text-[13px] text-ink">
                    {techniqueSummary(t, step.technique)}
                  </span>
                )}
                {step.conditions && (
                  <span className="text-[13px] text-muted">
                    {[
                      step.conditions.location,
                      step.conditions.temperatureC !== undefined
                        ? temperature.format(step.conditions.temperatureC, temperatureContext(step))
                        : undefined,
                      step.conditions.doughTemperatureC !== undefined
                        ? `${t('fermentation.target')}: ${temperature.format(step.conditions.doughTemperatureC, 'ambient')}`
                        : undefined,
                      step.conditions.frictionC !== undefined
                        ? `${t('fermentation.friction')}: ${temperature.format(step.conditions.frictionC, 'ambient', { difference: true })}`
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
              {isFermentationManaged ? (
                <div className="flex flex-wrap items-center justify-end gap-2 text-right sm:max-w-[65%]">
                  <span className="font-medium text-ink">
                    {step.durationMode === 'model'
                      ? step.plannedDurationS !== undefined
                        ? `≈ ${formatDuration(step.plannedDurationS)}`
                        : t('fermentation.auto')
                      : step.plannedDurationS !== undefined
                        ? formatDuration(step.plannedDurationS)
                        : '—'}
                  </span>
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
                <span className="shrink-0 text-right font-medium text-ink">
                  {step.plannedDurationS !== undefined
                    ? formatDuration(step.plannedDurationS)
                    : '—'}
                </span>
              )}
            </div>
          );
        })}
      </Rows>

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

      {showOutcome && (
        <div className="pt-2">
          <RecipeOutcome
            process={process}
            editable={editable}
            {...(onProcessChange ? { onChange: onProcessChange } : {})}
          />
        </div>
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
        />
      )}
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

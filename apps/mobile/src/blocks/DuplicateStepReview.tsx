import { useEffect, useMemo, useState } from 'react';
import {
  relativeTimeline,
  type DuplicateResult,
  type Process,
  type ProcessStep,
  type Timing,
} from '@flourprint/core/domain';
import { formatDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { SectionTitle } from '../ui/Layout';
import { Ui } from '../ui/library';
import { useValidationActions } from '../ui/ValidationContext';

interface Props {
  readonly isOpen: boolean;
  readonly proposal:
    | {
        readonly result: DuplicateResult;
        readonly originalStep: ProcessStep;
        readonly originalProcess: Process;
      }
    | undefined;
  readonly currentProcess: Process;
  readonly onKeep: (candidateProcess: Process, copyId: string) => boolean;
  readonly onCancel: () => void;
  readonly onDismissed: () => void;
  readonly disabled?: boolean;
}

/**
 * Review bottom sheet for a proposed step duplicate (#169).
 * Presents the proposed copy, non-carried attributes, dependencies, and relative schedule impact.
 */
export const DuplicateStepReview = ({
  isOpen,
  proposal,
  currentProcess,
  onKeep,
  onCancel,
  onDismissed,
  disabled = false,
}: Props) => {
  const { t, error, stepName } = useMessages();
  const validationActions = useValidationActions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepError, setKeepError] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setKeepError(undefined);
    }
  }, [isOpen]);

  const timelineBeforeResult = useMemo(
    () => (proposal ? relativeTimeline(proposal.originalProcess) : undefined),
    [proposal],
  );

  const timelineAfterResult = useMemo(
    () => (proposal ? relativeTimeline(proposal.result.process) : undefined),
    [proposal],
  );

  const beforeMap = useMemo(() => {
    if (!timelineBeforeResult?.ok) return new Map<string, Timing>();
    return new Map(timelineBeforeResult.value.steps.map((s) => [s.stepId, s.timing]));
  }, [timelineBeforeResult]);

  const afterMap = useMemo(() => {
    if (!timelineAfterResult?.ok) return new Map<string, Timing>();
    return new Map(timelineAfterResult.value.steps.map((s) => [s.stepId, s.timing]));
  }, [timelineAfterResult]);

  const stepMap = useMemo(() => {
    if (!proposal) return new Map<string, ProcessStep>();
    return new Map(proposal.result.process.steps.map((s) => [s.id, s]));
  }, [proposal]);

  const subsequentSteps = useMemo(() => {
    if (!proposal) return [];
    const copyIndex = proposal.result.process.steps.findIndex(
      (s) => s.id === proposal.result.copy.id,
    );
    if (copyIndex < 0) return [];
    return proposal.result.process.steps.slice(copyIndex + 1);
  }, [proposal]);

  const rewiredSteps = useMemo(() => {
    if (!proposal) return [];
    return proposal.result.process.steps.filter(
      (s) => s.id !== proposal.result.copy.id && s.dependsOn.includes(proposal.result.copy.id),
    );
  }, [proposal]);

  if (!proposal) {
    return (
      <Ui
        component="fp.bottom-sheet"
        isOpen={false}
        title={t('step.duplicateReview.title')}
        closeLabel={t('bake.cancel')}
        onDismiss={onDismissed}
      >
        <div />
      </Ui>
    );
  }

  const { copy, notCarried } = proposal.result;
  const originalStep = proposal.originalStep;

  const formatTiming = (timing: Timing | undefined): string => {
    if (!timing) return '—';
    if (timing.status === 'known') {
      return t('step.duplicate.schedule.range', {
        start: t('step.duplicate.schedule.afterOffset', { time: formatDuration(timing.startS) }),
        end: t('step.duplicate.schedule.afterOffset', { time: formatDuration(timing.endS) }),
      });
    }
    if (timing.unknownAfter.length > 0) {
      const names = timing.unknownAfter
        .map((id) => {
          const s = stepMap.get(id);
          return s ? stepName(s) : t('step.duplicate.schedule.unknown');
        })
        .join(', ');
      return t('step.duplicate.schedule.unknownAfter', { steps: names });
    }
    return t('step.duplicate.schedule.unknown');
  };

  const handleKeep = () => {
    if (isSubmitting || disabled) return;
    if (validationActions?.isBlocked()) {
      setKeepError(t('step.duplicate.error.blocked'));
      return;
    }
    if (proposal.originalProcess !== currentProcess) {
      setKeepError(t('step.duplicate.error.processChanged'));
      return;
    }
    setKeepError(undefined);
    setIsSubmitting(true);
    onKeep(proposal.result.process, proposal.result.copy.id);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  return (
    <Ui
      component="fp.bottom-sheet"
      isOpen={isOpen}
      title={t('step.duplicateReview.title')}
      closeLabel={t('bake.cancel')}
      onDismiss={onDismissed}
      footer={
        <div className="flex justify-end gap-2">
          <Ui
            component="fp.button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={handleCancel}
          >
            {t('bake.cancel')}
          </Ui>
          <Ui
            component="fp.button"
            variant="primary"
            disabled={isSubmitting || disabled}
            onClick={handleKeep}
          >
            {t('step.duplicate.keep')}
          </Ui>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-4 text-ink">
        {keepError && (
          <p
            role="alert"
            className="m-0 rounded-lg border border-alert/30 bg-alert-soft/20 p-3 text-sm font-medium text-alert"
          >
            {keepError}
          </p>
        )}

        <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-3.5">
          <span className="text-base font-bold text-ink">
            {t('step.duplicate.proposalStep', { step: stepName(copy) })}
          </span>
          <span className="text-sm text-muted">
            {t('step.duplicate.originalStep', { step: stepName(originalStep) })}
          </span>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <span>
              {t('step.duplicate.operation', {
                operation: stepName({ operation: copy.operation }),
              })}
            </span>
            <span>
              {originalStep.durationMode === 'model' ? (
                <span className="font-semibold text-accent-text">
                  {t('step.duplicate.durationRequired')}
                </span>
              ) : copy.plannedDurationS !== undefined ? (
                t('step.duplicate.copiedDuration', {
                  duration: formatDuration(copy.plannedDurationS),
                })
              ) : (
                t('step.duplicate.noDuration')
              )}
            </span>
          </div>
        </section>

        {notCarried.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle>{t('step.duplicate.notCarried.title')}</SectionTitle>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-sm text-muted">
              {notCarried.map((field) => (
                <li key={field}>{t(`step.duplicate.notCarried.${field}` as const)}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <SectionTitle>{t('step.duplicate.dependencies.title')}</SectionTitle>
          <div className="flex flex-col gap-1 text-sm text-ink">
            <span>{t('step.duplicate.dependsOn', { step: stepName(originalStep) })}</span>
            <span className="text-muted">
              {rewiredSteps.length > 0
                ? t('step.duplicate.rewiredDependents', {
                    steps: rewiredSteps.map((s) => stepName(s)).join(', '),
                  })
                : t('step.duplicate.noRewiredDependents')}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>{t('step.duplicate.schedule.title')}</SectionTitle>
          {timelineAfterResult && !timelineAfterResult.ok ? (
            <p role="alert" className="m-0 text-sm text-alert">
              {error(timelineAfterResult.error)}
            </p>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
              <div className="flex flex-col gap-0.5 border-b border-line/60 pb-2">
                <span className="font-semibold text-ink">
                  {t('step.duplicate.schedule.copy')} ({stepName(copy)})
                </span>
                <span className="text-accent-text">{formatTiming(afterMap.get(copy.id))}</span>
              </div>
              {subsequentSteps.map((s) => (
                <div key={s.id} className="flex flex-col gap-0.5">
                  <span className="font-medium text-ink">{stepName(s)}</span>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span>
                      {t('step.duplicate.schedule.before', {
                        timing: formatTiming(beforeMap.get(s.id)),
                      })}
                    </span>
                    <span>→</span>
                    <span className="font-medium text-ink">
                      {t('step.duplicate.schedule.after', {
                        timing: formatTiming(afterMap.get(s.id)),
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Ui>
  );
};

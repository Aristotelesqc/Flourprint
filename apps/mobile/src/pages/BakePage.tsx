import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonAlert,
  useIonRouter,
  useIonViewWillEnter,
  useIonViewWillLeave,
} from '@ionic/react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { loadBake } from '@flourprint/core/application';
import {
  adjustedDurationS,
  doughContextOf,
  doughReadyStage,
  implicitStartOf,
  intendedOutcome,
  isCookingStep,
  isStepHeld,
  outcomeChoiceRequired,
  previousAction,
  subjectOf,
  type BakeCommandPayload,
  type BakeEvent,
  type BakeState,
  type DomainError,
  type Instant,
  type PreparationOutcome,
  type ProcessStep,
} from '@flourprint/core/domain';
import { NoteSheet } from '../blocks/NoteSheet';
import {
  PreparationStepActionSheet,
  type PreparationStepAction,
} from '../blocks/PreparationStepActionSheet';
import { useOutcomePicker, useOutcomeText } from '../blocks/Outcome';
import { techniqueSummary } from '../blocks/StepSheet';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import {
  formatClock,
  formatDayTime,
  formatDuration,
  formatTime,
  parseDuration,
  editableDuration,
} from '../i18n/time';
import { OverflowMenu } from '../ui/OverflowMenu';
import {
  bakeAlerts,
  bakeLog,
  bakeView,
  completedPredecessor,
  foldStatus,
  lastCompletedStep,
  stepProgress,
  type BakeStepView,
  type LogEntry,
} from '../services/bake-view';
import {
  useBakeCommands,
  type CommandOutcome,
  type PendingCommand,
} from '../services/bake-commands';
import { BAKES_CHANGED } from '../services/notifications';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { InfoButton } from '../ui/InfoButton';
import { Ui } from '../ui/library';
import { SimulationBanner } from '../ui/SimulationBanner';
import { SectionTitle } from '../ui/Layout';

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);
const CRITERIA = ['poke', 'feel', 'time', 'other'] as const;

type StepTimeCorrectionEvent = BakeEvent & {
  readonly payload: Extract<BakeEvent['payload'], { type: 'StepTimeCorrected' }>;
};

const isPendingForAction = (
  pending: PendingCommand | undefined,
  action: PreparationStepAction | undefined,
): boolean => {
  if (!pending || !action) return false;
  const { payload } = pending;
  if (action.kind === 'correct' && payload.type === 'CorrectStepTime') {
    const { targetEventId } = payload;
    return action.choices.some((choice) => choice.eventId === targetEventId);
  }
  if (action.kind === 'repeat' && payload.type === 'InsertStepAfter') {
    return payload.after === action.after.id;
  }
  return false;
};

/** Bake mode (#8, #21): "what do I do now?" first; everything is recorded as bake events. */
export const BakePage = () => {
  const bakeId = useParams<{ bakeId: string }>().bakeId ?? '';
  const services = useServices();
  const router = useIonRouter();
  const { t, error, stepName, locale } = useMessages();
  const [presentAlert] = useIonAlert();
  const outcomeText = useOutcomeText();
  const pickOutcome = useOutcomePicker();
  const [state, setState] = useState<BakeState>();
  const preparationContent = useRef<HTMLIonContentElement>(null);
  const [recipeName, setRecipeName] = useState<string | null>();
  const [failure, setFailure] = useState<DomainError>();
  const [readFailed, setReadFailed] = useState(false);
  const [now, setNow] = useState<Instant>(services.clock.now());
  const commands = useBakeCommands(services);
  const { pending } = commands;
  const countdownActionRef = useRef(false);
  const [countdownBusy, setCountdownBusy] = useState(false);
  const countdownLabelId = useId();
  const noDurationId = useId();
  const progressionLabelId = useId();
  const statusHeadingId = useId();
  const [undoStepId, setUndoStepId] = useState<string>();
  const [progressionError, setProgressionError] = useState<string>();
  const [countdownError, setCountdownError] = useState<string>();
  const [blockedStepId, setBlockedStepId] = useState<string>();
  const [stepAction, setStepAction] = useState<PreparationStepAction>();
  const [timeCorrections, setTimeCorrections] = useState<readonly StepTimeCorrectionEvent[]>([]);
  // The note sheet, open on a step (or on the whole bake).
  const [noteOn, setNoteOn] = useState<{ stepId?: string }>();
  const { simulation } = usePreferences();

  const reload = useCallback(async () => {
    try {
      const loaded = await loadBake(services.bakes, bakeId);
      setNow(services.clock.now());
      if (!loaded.ok) {
        setFailure(loaded.error);
        return;
      }
      setState(loaded.value);
      const recipeId = loaded.value.snapshot?.revisions.formula.id;
      // A deleted recipe leaves its bakes in place: `null` reads as a deleted recipe.
      if (recipeId) setRecipeName((await services.recipes.getRecipe(recipeId))?.name ?? null);
    } catch (cause) {
      console.error(cause);
      setReadFailed(true);
    }
  }, [services, bakeId]);

  // A bake of the other world reads as absent (ADR 0014): reload when the mode changes.
  useEffect(() => void reload(), [reload, simulation]);
  // Ionic keeps inactive pages mounted: refresh when the page or the app becomes visible again.
  useIonViewWillEnter(() => void reload(), [reload]);
  useIonViewWillLeave(() => {
    setUndoStepId(undefined);
    setProgressionError(undefined);
    setCountdownError(undefined);
    setBlockedStepId(undefined);
    setStepAction(undefined);
  }, []);
  const stateBakeId = state?.bakeId;
  const stateVersion = state?.version;
  useEffect(() => {
    if (!stateBakeId || stateVersion === undefined || stateVersion === 0) {
      setTimeCorrections([]);
      return;
    }
    let cancelled = false;
    void services.bakes
      .loadEvents(stateBakeId)
      .then((events) => {
        if (cancelled) return;
        setTimeCorrections(
          events.filter(
            (event): event is StepTimeCorrectionEvent => event.payload.type === 'StepTimeCorrected',
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setTimeCorrections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [services.bakes, stateBakeId, stateVersion]);
  useEffect(() => {
    if (undoStepId === undefined) return;
    const timer = setTimeout(() => setUndoStepId(undefined), 4000);
    return () => clearTimeout(timer);
  }, [undoStepId]);
  useEffect(() => {
    const tick = () => setNow(services.clock.now());
    const timer = setInterval(tick, 15_000);
    const resume = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [services, reload]);

  if (!state || (state.status === 'notStarted' && state.version === 0)) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/recipes" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {failure && <p role="alert">{error(failure)}</p>}
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {state && <p role="alert">{t('state.bakeMissing')}</p>}
        </IonContent>
      </IonPage>
    );
  }

  const commandRefusal = (failure: DomainError): string => {
    const { code, message, details } = failure;
    const record = (details ?? {}) as Record<string, unknown>;
    const fieldKey = typeof record.field === 'string' ? `error.${code}.${record.field}` : undefined;
    const reasonKey =
      typeof record.reason === 'string' ? `error.${code}.${record.reason}` : undefined;
    if (reasonKey !== undefined && isKey(reasonKey)) return t(reasonKey);
    if (fieldKey !== undefined && isKey(fieldKey)) return error(failure);
    if (typeof record.reason === 'string' && record.reason.trim() !== '') {
      return message.trim() !== '' ? message : record.reason;
    }
    return isKey(`error.${code}`) || message.trim() === '' ? error(failure) : message;
  };

  /** Applies the outcome of a command and places a refusal at the initiating controls. */
  const settle = async (
    outcome: CommandOutcome,
    feedback: 'page' | 'countdown' | 'progression' | 'sheet' = 'page',
  ): Promise<string | undefined> => {
    setUndoStepId(undefined);
    setProgressionError(undefined);
    setCountdownError(undefined);
    setBlockedStepId(undefined);
    setFailure(undefined);
    setNow(services.clock.now());
    switch (outcome.kind) {
      case 'ok':
        setState(outcome.state);
        if (state.status === 'active' && outcome.state.status === 'finished') {
          void preparationContent.current?.scrollToTop(0);
        }
        return undefined;
      case 'rejected': {
        const message = commandRefusal(outcome.error);
        if (feedback === 'page') setFailure(outcome.error);
        if (feedback === 'countdown') setCountdownError(message);
        if (feedback === 'progression') setProgressionError(message);
        if (outcome.error.code === 'VersionConflict') await reload();
        return message;
      }
      case 'storage':
        return t('state.storageWrite');
      case 'busy':
        return t('state.writeBusy');
    }
  };

  const send = async (payload: BakeCommandPayload, feedback?: 'progression') =>
    settle(await commands.send(state, payload), feedback);

  /**
   * Records an implicit step start before the first countdown adjustment or hold on an implicitly
   * running step, stopping on any non-ok outcome (docs/contracts/bake-session.md).
   */
  const sendStepCountdownAction = async (
    stepId: string,
    payload: BakeCommandPayload,
  ): Promise<void> => {
    if (countdownActionRef.current || commands.busy || pending !== undefined) return;
    countdownActionRef.current = true;
    setCountdownBusy(true);
    try {
      const implicitStart = implicitStartOf(state, stepId);
      if (implicitStart !== undefined) {
        const startOutcome = await commands.send(state, {
          type: 'StartStep',
          stepId,
          at: implicitStart,
        });
        await settle(startOutcome, 'countdown');
        if (startOutcome.kind !== 'ok') return;
        await settle(await commands.send(startOutcome.state, payload), 'countdown');
        return;
      }
      await settle(await commands.send(state, payload), 'countdown');
    } finally {
      countdownActionRef.current = false;
      setCountdownBusy(false);
    }
  };

  /** Corrects a recorded step start or end time; closes only once accepted, retrying uncertain writes as is. */
  const handleCorrect = async (eventId: string, at: Instant): Promise<string | undefined> => {
    if (pending !== undefined) {
      if (pending.payload.type === 'CorrectStepTime') {
        const outcome = await commands.retry();
        const problem = await settle(outcome, 'sheet');
        if (problem === undefined) setStepAction(undefined);
        return problem;
      }
      return t('state.writeBusy');
    }
    const outcome = await commands.send(state, {
      type: 'CorrectStepTime',
      targetEventId: eventId,
      newOccurredAt: at,
    });
    const problem = await settle(outcome, 'sheet');
    if (problem === undefined) setStepAction(undefined);
    return problem;
  };

  /** Repeats a step after `after`; closes only once accepted, retrying uncertain insertions without regenerating an id. */
  const handleRepeat = async (
    step: ProcessStep,
    after: ProcessStep,
    durationS: number | undefined,
  ): Promise<string | undefined> => {
    if (pending !== undefined) {
      if (pending.payload.type === 'InsertStepAfter') {
        const outcome = await commands.retry();
        const problem = await settle(outcome, 'sheet');
        if (problem === undefined) setStepAction(undefined);
        return problem;
      }
      return t('state.writeBusy');
    }
    if (!state.process) return t('error.InvalidProcess');
    const sourceStep = state.process.steps.find((s) => s.id === step.id) ?? step;
    const {
      accepted: _accepted,
      plannedDurationS: _plannedDurationS,
      durationMode: _durationMode,
      dependsOn: _dependsOn,
      incorporations: _incorporations,
      ...rest
    } = sourceStep;
    const outcome = await commands.send(state, {
      type: 'InsertStepAfter',
      after: after.id,
      step: {
        ...rest,
        id: services.ids.next(),
        label: t('bake.repeatStepLabel', { step: stepName(sourceStep) }),
        schedule: 'asap',
        subject: subjectOf(
          state.process,
          sourceStep,
          state.formula ? doughContextOf(state.formula).components : undefined,
        ),
        ...(durationS === undefined
          ? {}
          : { plannedDurationS: durationS, durationMode: 'manual' as const }),
      },
    });
    const problem = await settle(outcome, 'sheet');
    if (problem === undefined) setStepAction(undefined);
    return problem;
  };

  /** A note is closed only once it is durably written; an uncertain one is retried as is. */
  const saveNote = async (payload: BakeCommandPayload): Promise<string | undefined> => {
    const retrying = pending && JSON.stringify(pending.payload) === JSON.stringify(payload);
    const problem = await settle(
      retrying ? await commands.retry() : await commands.send(state, payload),
    );
    if (problem === undefined) setNoteOn(undefined);
    return problem;
  };

  const view =
    state.status === 'active' ? bakeView(state, now, { progressionFocus: true }) : undefined;
  const focus = view?.focus;
  const focusStepIndex =
    focus && state.process ? state.process.steps.findIndex((s) => s.id === focus.step.id) + 1 : 0;
  const focusStepTotal = state.process?.steps.length ?? view?.total ?? 0;
  const focusBaselineDurationS = focus
    ? state.snapshot?.process.steps.find((s) => s.id === focus.step.id)?.plannedDurationS
    : undefined;
  const focusHeld = focus ? isStepHeld(state, focus.step.id) : false;
  const focusImplicitStart = focus ? implicitStartOf(state, focus.step.id) : undefined;
  const predecessorId = focus
    ? completedPredecessor(state, focus.step.id)
    : view?.allDone
      ? lastCompletedStep(state)
      : undefined;
  const focusPlannedDurationS = focus?.step.plannedDurationS;
  const focusNoDuration = focusPlannedDurationS === undefined;
  const focusCanAdjustDuration =
    focus !== undefined &&
    focusPlannedDurationS !== undefined &&
    focus.step.schedule !== 'beforeTarget';
  const focusCanToggleHold =
    focus !== undefined &&
    focusCanAdjustDuration &&
    (focusHeld
      ? focus.startedAt !== undefined
      : focus.startedAt !== undefined || focusImplicitStart !== undefined);
  const countdownWriteBlocked = commands.busy || countdownBusy || pending !== undefined;
  const blockedStep =
    blockedStepId === undefined
      ? undefined
      : state.process?.steps.find((s) => s.id === blockedStepId);
  const blockedRecord = blockedStepId === undefined ? undefined : state.steps[blockedStepId];
  const canCorrectBlocked =
    blockedStep !== undefined &&
    blockedRecord?.endEventId !== undefined &&
    blockedRecord.endedAt !== undefined;
  const canRepeatBlocked =
    blockedStep !== undefined && focus !== undefined && focus.step.id !== blockedStep.id;
  const sheetBlocked =
    commands.busy ||
    countdownBusy ||
    (pending !== undefined && !isPendingForAction(pending, stepAction));
  const log = bakeLog(state);
  const journalItems: (
    | {
        readonly kind: 'log';
        readonly at: Instant;
        readonly key: string;
        readonly entry: LogEntry;
      }
    | {
        readonly kind: 'correction';
        readonly at: Instant;
        readonly key: string;
        readonly stepId: string;
        readonly field: 'start' | 'end';
        readonly newAt: Instant;
      }
  )[] = [
    ...log.map((entry) => ({
      kind: 'log' as const,
      at: entry.at,
      key: `${entry.kind}-${entry.at}-${entry.stepId ?? ''}-${entry.set ?? ''}`,
      entry,
    })),
    ...timeCorrections.flatMap((event) => {
      const target = state.stepEvents[event.payload.targetEventId];
      if (!target) return [];
      return [
        {
          kind: 'correction' as const,
          at: event.occurredAt,
          key: event.eventId,
          stepId: target.stepId,
          field: target.kind,
          newAt: event.payload.newOccurredAt,
        },
      ];
    }),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const completedSteps =
    state.process?.steps.filter((s) => state.steps[s.id]?.endedAt !== undefined) ?? [];
  const criterionLabel = (code: string) => {
    const key = `bake.doughReady.${code}`;
    return isKey(key) ? t(key) : code;
  };
  const nameOf = (id: string | undefined) => {
    const step = state.process?.steps.find((s) => s.id === id);
    return step ? stepName(step) : (id ?? '');
  };

  const retractStep = (stepId: string) => {
    if (countdownWriteBlocked) return;
    setUndoStepId(undefined);
    const action = previousAction(state, stepId);
    if (action.kind === 'retract') {
      setBlockedStepId(undefined);
      void send({ type: 'RetractCompletion', targetEventId: action.targetEventId }, 'progression');
      return;
    }
    if (action.reason === 'dependentStarted') {
      setBlockedStepId(stepId);
      setProgressionError(
        t('bake.previousBlockedDependents', {
          count: action.dependents.length,
          steps: action.dependents.map(nameOf).join(', '),
        }),
      );
    } else {
      setBlockedStepId(undefined);
      setProgressionError(t('bake.previousUnavailable'));
    }
  };

  const completeFocusedStep = async (stepId: string) => {
    if (countdownWriteBlocked) return;
    setUndoStepId(undefined);
    setProgressionError(undefined);
    setBlockedStepId(undefined);
    const outcome = await commands.send(state, { type: 'CompleteStep', stepId });
    await settle(outcome, 'progression');
    if (outcome.kind === 'ok') setUndoStepId(stepId);
  };

  const adjust = (target: BakeStepView) =>
    void presentAlert({
      header: t('bake.adjustTitle', { step: stepName(target.step) }),
      inputs: [
        {
          name: 'duration',
          type: 'text',
          value:
            target.step.plannedDurationS === undefined
              ? ''
              : editableDuration(target.step.plannedDurationS),
          attributes: { inputmode: 'decimal' },
        },
      ],
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.save'),
          handler: (values: { duration: string }) => {
            const seconds = parseDuration(values.duration);
            if (seconds === undefined) return false;
            void send({
              type: 'AdjustStep',
              stepId: target.step.id,
              adjustment: { field: 'plannedDurationS', value: seconds },
            });
            return true;
          },
        },
      ],
    });

  const note = () => {
    setUndoStepId(undefined);
    setNoteOn(focus ? { stepId: focus.step.id } : {});
  };

  const adjustFocusDuration = (deltaSeconds: number) => {
    if (!focus || !focusCanAdjustDuration || focusPlannedDurationS === undefined) return;
    const value = adjustedDurationS(focusPlannedDurationS, deltaSeconds);
    if (value === focusPlannedDurationS) return;
    void sendStepCountdownAction(focus.step.id, {
      type: 'AdjustStep',
      stepId: focus.step.id,
      adjustment: { field: 'plannedDurationS', value },
    });
  };

  /** The stage a running dough step can be judged ready for (bake-session.md), if any. */
  const readyStage = (target: BakeStepView) =>
    target.startedAt !== undefined && target.endedAt === undefined && state.process
      ? doughReadyStage(
          state.process,
          target.step.id,
          state.formula ? doughContextOf(state.formula) : undefined,
        )
      : undefined;
  const readyLabel = (stage: 'shape' | 'bake') =>
    t(stage === 'bake' ? 'bake.readyToBake' : 'bake.readyToShape');

  /** Records the time of the judgement and, optionally, what it went by. Never ends the step. */
  const doughReady = (stepId: string) =>
    void presentAlert({
      header: t('bake.doughReadyTitle'),
      inputs: CRITERIA.map((criterion) => ({
        type: 'radio' as const,
        label: t(`bake.doughReady.${criterion}`),
        value: criterion,
      })),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.save'),
          handler: (criterion: string | undefined) => {
            void send({
              type: 'AddObservation',
              stepId,
              category: 'fermentation',
              kind: 'doughReady',
              ...(criterion === undefined ? {} : { criterion }),
            });
            return true;
          },
        },
      ],
    });

  /** Records one set of folds; the plan never changes (bake-session.md). */
  const recordFold = (stepId: string, set: number) =>
    void send({ type: 'AddObservation', stepId, category: 'handling', kind: 'fold', set });

  /** The next set not recorded yet; once all are, the baker picks which one was done again. */
  const foldDone = (stepId: string) => {
    const status = foldStatus(state, stepId);
    if (!status) return;
    if (status.next) {
      recordFold(stepId, status.next.set);
      return;
    }
    void presentAlert({
      header: t('bake.fold.pick'),
      inputs: Array.from({ length: status.count }, (_, i) => ({
        type: 'radio' as const,
        label: t('bake.fold.set', { set: i + 1 }),
        value: i + 1,
      })),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.save'),
          handler: (set: number | undefined) => {
            if (set === undefined) return false;
            recordFold(stepId, set);
            return true;
          },
        },
      ],
    });
  };

  // Running steps with folds: the focus first, then the parallel ones.
  const foldSteps = [...(focus?.running ? [focus] : []), ...(view?.alsoRunning ?? [])].filter(
    (v) => v.step.technique?.folds !== undefined,
  );

  /** Simulated time moves forward only (ADR 0014); reminders follow the new clock. */
  const advance = (ms: number) => {
    services.preferences.advance(ms);
    setNow(services.clock.now());
    window.dispatchEvent(new Event(BAKES_CHANGED));
  };
  const nextMoment =
    simulation && state.status === 'active'
      ? bakeAlerts(state, now).find((alert) => Date.parse(alert.at) > Date.parse(now))
      : undefined;

  const intended = state.process ? intendedOutcome(state.process) : undefined;
  const hasCompletedCooking =
    state.process?.steps.some(
      (step) => isCookingStep(step) && state.steps[step.id]?.endedAt !== undefined,
    ) ?? false;
  // A cooked result is intended but nothing was cooked yet: no outcome is assumed or preselected.
  const mustChoose =
    state.process !== undefined &&
    outcomeChoiceRequired(state.process, (id) => state.steps[id]?.endedAt !== undefined);
  const reopen = () =>
    void presentAlert({
      header: t('bake.reopen'),
      message: t('bake.reopenConfirm'),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        { text: t('bake.reopen'), handler: () => void send({ type: 'ReopenBake' }) },
      ],
    });

  const abandon = () =>
    void presentAlert({
      header: t('bake.abandon'),
      message: t('bake.abandonConfirm'),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.abandon'),
          role: 'destructive',
          handler: () => void send({ type: 'AbandonBake' }),
        },
      ],
    });

  const outcomeBusy = commands.busy || pending !== undefined;
  const correctOutcome = () => {
    if (outcomeBusy) return;
    pickOutcome(t('bake.outcome.change'), state.outcome, (outcome) => {
      void send({ type: 'CorrectOutcome', outcome });
    });
  };
  const startMs = state.startedAt === undefined ? Number.NaN : Date.parse(state.startedAt);
  const endMs = state.endedAt === undefined ? Number.NaN : Date.parse(state.endedAt);
  const totalDurationS =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? (endMs - startMs) / 1_000
      : undefined;

  const finishOutcome = (outcome: PreparationOutcome) => {
    void send({ type: 'FinishBake', outcome });
  };
  const finishWith = (header: string) =>
    pickOutcome(header, mustChoose ? undefined : intended, finishOutcome);
  const finishNow = () => {
    const header = t('bake.finishNow');
    if (hasCompletedCooking) {
      finishWith(header);
      return;
    }
    pickOutcome(header, undefined, finishOutcome, { onAbandon: abandon });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <div className="min-w-0 px-2 font-bold text-lg">{t('bake.headerTitle')}</div>
          <IonButtons slot="end">
            <OverflowMenu
              ariaLabel={t('bake.overflowActions')}
              title={t('bake.overflowActions')}
              actions={[
                {
                  label: t('bake.note'),
                  handler: note,
                },
                ...(focus && focusImplicitStart
                  ? [
                      {
                        label: t('bake.start', { step: stepName(focus.step) }),
                        disabled: countdownWriteBlocked,
                        handler: () =>
                          void send({
                            type: 'StartStep',
                            stepId: focus.step.id,
                            at: focusImplicitStart,
                          }),
                      },
                    ]
                  : []),
                ...(focus
                  ? [
                      {
                        label: t('bake.adjust'),
                        handler: () => adjust(focus),
                      },
                    ]
                  : []),
                ...(state.snapshot?.revisions.formula.id
                  ? [
                      {
                        label: t('recipe.consultation'),
                        handler: () =>
                          router.push(`/recipes/${state.snapshot?.revisions.formula.id}`),
                      },
                    ]
                  : []),
                'divider',
                ...(state.status === 'active' && !view?.allDone
                  ? [
                      {
                        label: t('bake.finishNow'),
                        handler: finishNow,
                      },
                    ]
                  : []),
                ...(state.status === 'active'
                  ? [
                      {
                        label: t('bake.abandon'),
                        destructive: true,
                        handler: abandon,
                      },
                    ]
                  : []),
                ...(state.status === 'finished'
                  ? [
                      {
                        label: t('bake.outcome.change'),
                        disabled: outcomeBusy,
                        handler: correctOutcome,
                      },
                    ]
                  : []),
                ...(state.status === 'finished' || state.status === 'abandoned'
                  ? [
                      {
                        label: t('bake.reopen'),
                        handler: reopen,
                      },
                    ]
                  : []),
              ]}
            />
          </IonButtons>
        </IonToolbar>
        <SimulationBanner />
      </IonHeader>
      <IonContent ref={preparationContent} className="ion-padding">
        <div className="flex flex-col gap-5">
          {failure && (
            <p role="alert" className="m-0 text-alert">
              {commandRefusal(failure)}
            </p>
          )}
          {pending && (
            <div role="alert" className="flex items-center gap-3 rounded-xl bg-track p-3">
              <span className="flex-1 text-alert">{t('state.storageWrite')}</span>
              <IonButton
                disabled={commands.busy}
                onClick={() => void commands.retry().then(settle)}
              >
                {t('state.retry')}
              </IonButton>
            </div>
          )}

          <div>
            <h1 className="m3-type-page m-0 break-words">
              {recipeName === null ? t('recipe.deleted') : (recipeName ?? t('bake.headerTitle'))}
            </h1>
            <div className="mt-1 text-sm text-muted">
              {state.snapshot &&
                t('recipe.version', { version: state.snapshot.revisions.formula.version })}
              {state.startedAt &&
                t('prep.sessionStarted', { time: formatDayTime(state.startedAt, locale) })}
            </div>
          </div>

          {state.status !== 'active' && (
            <section aria-labelledby={statusHeadingId} className="flex flex-col gap-2">
              <h2 id={statusHeadingId} className="m3-type-title m-0">
                {t(state.status === 'abandoned' ? 'bake.abandoned' : 'bake.finished')}
              </h2>
              {state.status === 'finished' && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex w-full min-w-0 flex-col gap-1">
                    <span
                      className="m3-type-body font-medium text-on-surface break-words"
                      data-testid="bake-outcome"
                    >
                      {t('bake.outcome', { outcome: outcomeText(state.outcome ?? 'unknown') })}
                    </span>
                    <span
                      className="m3-type-supporting text-muted tabular-nums break-words"
                      data-testid="bake-total-duration"
                    >
                      {t('bake.totalDuration', {
                        duration:
                          totalDurationS === undefined
                            ? t('bake.totalDurationUnknown')
                            : formatDuration(totalDurationS),
                      })}
                    </span>
                  </div>
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    className="max-w-full px-4 text-supporting"
                    disabled={outcomeBusy}
                    onClick={correctOutcome}
                  >
                    {t('bake.outcome.change')}
                  </Ui>
                </div>
              )}
            </section>
          )}

          {focus && (
            <Focus
              focus={focus}
              now={now}
              held={focusHeld}
              stepIndex={focusStepIndex}
              totalSteps={focusStepTotal}
              baselineDurationS={focusBaselineDurationS}
            />
          )}

          {focus && (
            <>
              <section aria-labelledby={countdownLabelId} className="flex flex-col gap-2">
                <span id={countdownLabelId}>
                  <SectionTitle>{t('bake.countdown')}</SectionTitle>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    fullWidth
                    disabled={
                      countdownWriteBlocked ||
                      !focusCanAdjustDuration ||
                      focusPlannedDurationS === undefined ||
                      focusPlannedDurationS <= 0
                    }
                    {...(focusNoDuration ? { 'aria-describedby': noDurationId } : {})}
                    onClick={() => adjustFocusDuration(-900)}
                  >
                    {t('bake.minus15')}
                  </Ui>
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    fullWidth
                    disabled={countdownWriteBlocked || !focusCanToggleHold}
                    {...(focusNoDuration ? { 'aria-describedby': noDurationId } : {})}
                    onClick={() =>
                      void sendStepCountdownAction(focus.step.id, {
                        type: focusHeld ? 'ReleaseStepCountdown' : 'HoldStepCountdown',
                        stepId: focus.step.id,
                      })
                    }
                  >
                    {t(focusHeld ? 'bake.resume' : 'bake.pause')}
                  </Ui>
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    fullWidth
                    disabled={countdownWriteBlocked || !focusCanAdjustDuration}
                    {...(focusNoDuration ? { 'aria-describedby': noDurationId } : {})}
                    onClick={() => adjustFocusDuration(900)}
                  >
                    {t('bake.plus15')}
                  </Ui>
                </div>
                {focusNoDuration && (
                  <p id={noDurationId} className="m-0 px-1 text-xs text-muted">
                    {t('bake.noDuration')}
                  </p>
                )}
                <p aria-live="polite" className="m-0 text-supporting text-alert empty:sr-only">
                  {countdownError}
                </p>
              </section>
              <div className="flex items-center">
                <Ui component="fp.button" variant="quiet" onClick={note}>
                  {t('bake.note')}
                </Ui>
              </div>
              {focus.running &&
                (() => {
                  const stage = readyStage(focus);
                  return (
                    stage && (
                      <div className="flex items-center justify-center gap-3 py-1">
                        <IonButton
                          fill="outline"
                          shape="round"
                          className="min-h-12 font-semibold btn-pill-secondary"
                          disabled={commands.busy || pending !== undefined}
                          onClick={() => doughReady(focus.step.id)}
                        >
                          {readyLabel(stage)}
                        </IonButton>
                        <InfoButton topic="readyMark" term={t('bake.doughReady')} />
                      </div>
                    )
                  );
                })()}
            </>
          )}

          {foldSteps.map((v) => {
            const status = foldStatus(state, v.step.id);
            if (!status) return null;
            const next = status.next;
            const seconds = next ? (Date.parse(next.at) - Date.parse(now)) / 1000 : 0;
            return (
              <section
                key={`fold-${v.step.id}`}
                aria-label={t('bake.fold.title', { step: stepName(v.step) })}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
              >
                <span className="flex flex-1 flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
                    {t('bake.fold.title', { step: stepName(v.step) })}
                    <InfoButton topic="technique" term={t('technique.title')} />
                  </span>
                  <span className={`font-bold ${next && seconds < 0 ? 'text-alert' : ''}`}>
                    {next
                      ? t(seconds >= 0 ? 'bake.fold.next' : 'bake.fold.overdue', {
                          set: next.set,
                          count: status.count,
                          time: formatDuration(seconds),
                        })
                      : t('bake.fold.allDone', { count: status.count })}
                  </span>
                </span>
                <IonButton
                  disabled={commands.busy || pending !== undefined}
                  onClick={() => foldDone(v.step.id)}
                >
                  {t('bake.fold.done')}
                </IonButton>
              </section>
            );
          })}

          {view && view.due.length > 0 && (
            <StepList title={t('bake.dueNow')}>
              {view.due.map((v) => (
                <StepLine
                  key={v.step.id}
                  time={v.projected?.start ? formatTime(v.projected.start, locale) : '—'}
                  name={stepName(v.step)}
                  detail={
                    v.step.plannedDurationS === undefined
                      ? ''
                      : formatDuration(v.step.plannedDurationS)
                  }
                  action={{
                    label: t('bake.startShort'),
                    disabled: commands.busy || pending !== undefined,
                    run: () => void send({ type: 'StartStep', stepId: v.step.id }),
                  }}
                  emphasized
                />
              ))}
            </StepList>
          )}

          {view?.allDone && (
            <>
              <p className="m-0 text-lg">{t('bake.allDone')}</p>
              {/* The primary footer records the intended outcome; this offers another result. */}
              {!mustChoose && (
                <div className="flex flex-wrap items-center gap-2">
                  <IonButton
                    fill="outline"
                    disabled={commands.busy}
                    onClick={() => finishWith(t('bake.finishOther'))}
                  >
                    {t('bake.finishOther')}
                  </IonButton>
                </div>
              )}
            </>
          )}

          {view && view.alsoRunning.length > 0 && (
            <StepList
              title={t('bake.alsoRunning')}
              help={<InfoButton topic="bakeFocus" term={t('bake.alsoRunning')} />}
            >
              {view.alsoRunning.map((v) => (
                <StepLine
                  key={v.step.id}
                  time={v.projected?.end ? formatTime(v.projected.end, locale) : '—'}
                  name={stepName(v.step)}
                  detail={
                    v.projected?.end ? remainingText(v.projected.end, now, t) : t('bake.noDuration')
                  }
                  action={{
                    label: t('bake.doneShort'),
                    disabled: commands.busy || pending !== undefined,
                    run: () => void send({ type: 'CompleteStep', stepId: v.step.id }),
                  }}
                  {...(() => {
                    // A proof running beside the preheat still takes its readiness mark.
                    const stage = readyStage(v);
                    return stage
                      ? {
                          extra: {
                            label: readyLabel(stage),
                            disabled: commands.busy || pending !== undefined,
                            run: () => doughReady(v.step.id),
                          },
                        }
                      : {};
                  })()}
                />
              ))}
            </StepList>
          )}

          {view && view.next.length > 0 && (
            <StepList title={t('bake.next')}>
              {view.next.map((v) => (
                <StepLine
                  key={v.step.id}
                  time={v.projected?.start ? formatTime(v.projected.start, locale) : '—'}
                  name={stepName(v.step)}
                  detail={
                    v.step.plannedDurationS === undefined
                      ? ''
                      : formatDuration(v.step.plannedDurationS)
                  }
                  {...(v.ready
                    ? {
                        action: {
                          label: t('bake.startShort'),
                          disabled: commands.busy || pending !== undefined,
                          run: () => void send({ type: 'StartStep', stepId: v.step.id }),
                        },
                      }
                    : {})}
                />
              ))}
            </StepList>
          )}

          {completedSteps.length > 0 && (
            <StepList title={t('bake.completedSteps')}>
              {completedSteps.map((step) => {
                const record = state.steps[step.id];
                const choices: {
                  readonly kind: 'start' | 'end';
                  readonly eventId: string;
                  readonly at: Instant;
                }[] = [
                  ...(record?.startEventId !== undefined && record.startedAt !== undefined
                    ? [
                        {
                          kind: 'start' as const,
                          eventId: record.startEventId,
                          at: record.startedAt,
                        },
                      ]
                    : []),
                  ...(record?.endEventId !== undefined && record.endedAt !== undefined
                    ? [{ kind: 'end' as const, eventId: record.endEventId, at: record.endedAt }]
                    : []),
                ];
                return (
                  <StepLine
                    key={step.id}
                    time={record?.endedAt ? formatTime(record.endedAt, locale) : '—'}
                    name={stepName(step)}
                    detail={
                      step.plannedDurationS === undefined
                        ? ''
                        : t('bake.stepPlannedDuration', {
                            duration: formatDuration(step.plannedDurationS),
                          })
                    }
                    {...(state.status === 'active' && choices.length > 0
                      ? {
                          action: {
                            label: t('bake.correctTimeAction'),
                            disabled: countdownWriteBlocked,
                            run: () => setStepAction({ kind: 'correct', step, choices }),
                          },
                        }
                      : {})}
                  />
                );
              })}
            </StepList>
          )}

          {journalItems.length > 0 && (
            <StepList title={t('bake.log')} testId="preparation-journal" ordered>
              {journalItems.map((item) => {
                if (item.kind === 'correction') {
                  return (
                    <li key={item.key} className="py-2">
                      <p className="m-0 text-sm text-muted break-words">
                        {t('bake.log.timeCorrected', {
                          time: formatTime(item.at, locale),
                          step: nameOf(item.stepId),
                          field: t(item.field === 'start' ? 'bake.timeStart' : 'bake.timeEnd'),
                          newTime: formatTime(item.newAt, locale),
                        })}
                      </p>
                    </li>
                  );
                }
                const { entry } = item;
                return (
                  <li key={item.key} className="py-2">
                    <p className="m-0 text-sm text-muted break-words">
                      {entry.kind === 'note'
                        ? entry.stepId === undefined
                          ? t('bake.log.note', {
                              time: formatTime(entry.at, locale),
                              text: noteText(entry),
                            })
                          : t('bake.log.noteOn', {
                              time: formatTime(entry.at, locale),
                              step: nameOf(entry.stepId),
                              text: noteText(entry),
                            })
                        : entry.kind === 'fold'
                          ? t('bake.log.fold', {
                              time: formatTime(entry.at, locale),
                              set: entry.set ?? '?',
                              count: entry.count ?? '?',
                              step: nameOf(entry.stepId),
                            })
                          : entry.kind === 'doughReady'
                            ? t('bake.log.ready', {
                                time: formatTime(entry.at, locale),
                                label:
                                  entry.stage === undefined
                                    ? t('bake.doughReady')
                                    : readyLabel(entry.stage),
                                details: [
                                  nameOf(entry.stepId),
                                  ...(entry.criterion === undefined
                                    ? []
                                    : [criterionLabel(entry.criterion)]),
                                ].join(', '),
                                text: entry.text ?? '',
                              })
                            : t(
                                entry.kind === 'started'
                                  ? 'bake.log.started'
                                  : 'bake.log.completed',
                                {
                                  time: formatTime(entry.at, locale),
                                  step: nameOf(entry.stepId),
                                },
                              )}
                    </p>
                  </li>
                );
              })}
            </StepList>
          )}

          {!focus && (
            <IonButton
              fill="outline"
              disabled={commands.busy || pending !== undefined}
              onClick={note}
            >
              {t('bake.addNote')}
            </IonButton>
          )}

          {simulation && state.status === 'active' && (
            <section
              aria-label={t('sim.advance')}
              className="flex flex-col gap-2 rounded-xl border border-dashed border-accent p-3"
            >
              <SectionTitle>{t('sim.advance')}</SectionTitle>
              <IonButton
                fill="outline"
                disabled={nextMoment === undefined}
                onClick={() =>
                  nextMoment &&
                  advance(Date.parse(nextMoment.at) - Date.parse(services.clock.now()))
                }
              >
                {t('sim.advance.next')}
              </IonButton>
              <span className="text-center text-sm text-muted">
                {nextMoment
                  ? t('sim.advance.nextAt', {
                      time: formatTime(nextMoment.at, locale),
                      step: nameOf(nextMoment.stepId),
                    })
                  : t('sim.advance.none')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <IonButton fill="outline" onClick={() => advance(15 * 60_000)}>
                  {t('sim.advance.quarter')}
                </IonButton>
                <IonButton fill="outline" onClick={() => advance(3_600_000)}>
                  {t('sim.advance.hour')}
                </IonButton>
              </div>
            </section>
          )}

          {/* Finishing does not need every planned step done: a dough frozen before its
              planned bake is a finished Preparation (bake-session.md). No step is completed
              for the baker; the result is chosen explicitly. */}
        </div>
        <NoteSheet
          open={noteOn !== undefined}
          state={state}
          {...(noteOn?.stepId === undefined ? {} : { stepId: noteOn.stepId })}
          busy={commands.busy}
          onSave={saveNote}
          onClose={() => setNoteOn(undefined)}
        />
        <PreparationStepActionSheet
          action={stepAction}
          blocked={sheetBlocked}
          retrying={isPendingForAction(pending, stepAction)}
          onCorrect={handleCorrect}
          onRepeat={handleRepeat}
          onDismiss={() => setStepAction(undefined)}
        />
      </IonContent>
      {(focus || view?.allDone || undoStepId !== undefined) && state.status === 'active' && (
        <IonFooter className="ion-no-border relative">
          {undoStepId && (
            <div className="absolute inset-x-4 bottom-full z-10 mb-2 flex items-center justify-between gap-2 rounded-card border border-line bg-surface-container px-3 text-on-surface shadow-md">
              <span role="status" className="min-w-0 text-supporting">
                {t('bake.done', { step: nameOf(undoStepId) })}
              </span>
              <Ui
                component="fp.button"
                variant="quiet"
                density="compact"
                onClick={() => retractStep(undoStepId)}
              >
                {t('editor.undo')}
              </Ui>
            </div>
          )}
          <IonToolbar>
            <section aria-labelledby={progressionLabelId} className="px-4 py-2">
              <span id={progressionLabelId}>
                <SectionTitle>{t('bake.progression')}</SectionTitle>
              </span>
              {progressionError && (
                <p role="alert" className="my-1 text-supporting text-alert">
                  {progressionError}
                </p>
              )}
              {blockedStep && (
                <div className="my-1.5 flex flex-wrap gap-2">
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    disabled={countdownWriteBlocked || !canCorrectBlocked}
                    onClick={() => {
                      if (!blockedRecord?.endEventId || blockedRecord.endedAt === undefined) {
                        return;
                      }
                      setStepAction({
                        kind: 'correct',
                        step: blockedStep,
                        choices: [
                          {
                            kind: 'end',
                            eventId: blockedRecord.endEventId,
                            at: blockedRecord.endedAt,
                          },
                        ],
                      });
                    }}
                  >
                    {t('bake.correctTimeAction')}
                  </Ui>
                  <Ui
                    component="fp.button"
                    variant="secondary"
                    density="compact"
                    disabled={countdownWriteBlocked || !canRepeatBlocked}
                    onClick={() => {
                      if (!focus || focus.step.id === blockedStep.id) return;
                      setStepAction({
                        kind: 'repeat',
                        step: blockedStep,
                        after: focus.step,
                      });
                    }}
                  >
                    {t('bake.repeatStepAction')}
                  </Ui>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Ui
                  component="fp.button"
                  variant="secondary"
                  density="compact"
                  fullWidth
                  disabled={countdownWriteBlocked || !(predecessorId ?? undoStepId)}
                  onClick={() => {
                    const target = predecessorId ?? undoStepId;
                    if (target) retractStep(target);
                  }}
                >
                  {t('bake.previous')}
                </Ui>
                <Ui
                  component="fp.button"
                  density="compact"
                  fullWidth
                  disabled={countdownWriteBlocked || (!focus && !view?.allDone)}
                  onClick={() => {
                    if (focus) {
                      if (focus.running || focusImplicitStart)
                        void completeFocusedStep(focus.step.id);
                      else void send({ type: 'StartStep', stepId: focus.step.id }, 'progression');
                    } else if (mustChoose) finishWith(t('bake.finish'));
                    else void send({ type: 'FinishBake' });
                  }}
                >
                  {focus
                    ? focus.running || focusImplicitStart
                      ? t('bake.nextAction')
                      : t('bake.start', { step: stepName(focus.step) })
                    : intended && !mustChoose
                      ? t('bake.finishAs', { outcome: outcomeText(intended) })
                      : t('bake.finish')}
                </Ui>
              </div>
            </section>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

/** A note's text, with its rating as stars when it has one. */
const noteText = (entry: LogEntry): string =>
  [ratingText(entry.rating), entry.text ?? ''].filter((part) => part !== '').join(' ');

/** Stars for positive whole ratings up to 5; zero and other recorded values remain readable. */
const ratingText = (rating: number | undefined): string => {
  if (rating === undefined || !Number.isFinite(rating)) return '';
  return Number.isInteger(rating) && rating > 0 && rating <= 5 ? '★'.repeat(rating) : `${rating}/5`;
};

type Translate = ReturnType<typeof useMessages>['t'];

const remainingText = (end: Instant, now: Instant, t: Translate): string => {
  const seconds = (Date.parse(end) - Date.parse(now)) / 1000;
  return `${formatDuration(seconds)} ${t(seconds >= 0 ? 'bake.left' : 'bake.over')}`;
};

const Focus = ({
  focus,
  now,
  held,
  stepIndex,
  totalSteps,
  baselineDurationS,
}: {
  focus: BakeStepView & { running: boolean };
  now: Instant;
  held: boolean;
  stepIndex: number;
  totalSteps: number;
  baselineDurationS: number | undefined;
}) => {
  const { t, stepName, locale } = useMessages();
  const { clock } = useServices();
  const timerLabelId = useId();
  const elapsedLabelId = useId();
  const { projected, startedAt } = focus;
  const effectiveStart = startedAt ?? (projected?.implicit ? projected.start : undefined);
  const duration = focus.step.plannedDurationS;
  const startMs = effectiveStart === undefined ? Number.NaN : Date.parse(effectiveStart);
  const isActive = effectiveStart !== undefined && Number.isFinite(startMs);
  const endMs = projected?.end === undefined ? Number.NaN : Date.parse(projected.end);
  const hasActiveCountdown = isActive && Number.isFinite(endMs);
  const stepId = focus.step.id;
  const [timerSample, setTimerSample] = useState<{
    readonly stepId: string;
    readonly parentNow: Instant;
    readonly instant: Instant;
  }>();
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(
      () => setTimerSample({ stepId, parentNow: now, instant: clock.now() }),
      1_000,
    );
    return () => clearInterval(interval);
  }, [clock, isActive, now, stepId]);
  // Render a new focus or clock jump immediately, without a sample from the previous step.
  const timerNow =
    timerSample?.stepId === stepId && timerSample.parentNow === now ? timerSample.instant : now;
  // A held projection is calculated using the same clock sample as the parent.
  const elapsedNowMs = Date.parse(timerNow);
  const nowMs = held ? Date.parse(now) : elapsedNowMs;
  const elapsedSeconds =
    isActive && Number.isFinite(elapsedNowMs)
      ? Math.max(0, Math.floor((elapsedNowMs - startMs) / 1_000))
      : 0;

  const remainingSeconds = Math.ceil((endMs - nowMs) / 1_000);
  const overrun = remainingSeconds < 0;
  const plannedDuration = isActive ? undefined : duration;

  const showProgress = isActive && Number.isFinite(startMs) && Number.isFinite(endMs);
  const progress = showProgress ? stepProgress(startMs, endMs, nowMs) : 0;
  const adjustmentS =
    baselineDurationS !== undefined &&
    Number.isFinite(baselineDurationS) &&
    duration !== undefined &&
    Number.isFinite(duration)
      ? duration - baselineDurationS
      : undefined;
  const adjustmentDelta =
    adjustmentS === undefined
      ? undefined
      : Math.round(Math.abs(adjustmentS) / 60) === 0 || adjustmentS > 0
        ? `+${formatDuration(adjustmentS)}`
        : `−${formatDuration(adjustmentS)}`;
  const stepTitle = stepName(focus.step);
  const heading =
    stepIndex > 0 && totalSteps > 0
      ? t('bake.stepHeading', { index: stepIndex, total: totalSteps, step: stepTitle })
      : stepTitle;
  const technique = techniqueSummary(t, focus.step.technique);
  const heroTimerClass = 'm3-type-hero-timer max-w-full text-[min(3.25rem,14vw)] tabular-nums';

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 pe-3">
        <h2 className="m3-type-title m-0 min-w-0 break-words">{heading}</h2>
        <InfoButton topic="bakeFocus" term={stepTitle} />
      </div>
      {hasActiveCountdown ? (
        <div className="flex flex-col items-start gap-0.5">
          <span
            role="timer"
            aria-labelledby={timerLabelId}
            aria-live="off"
            className={`${heroTimerClass} whitespace-nowrap${overrun ? ' text-alert' : ''}`}
          >
            {overrun && '+'}
            {formatClock(remainingSeconds)}
          </span>
          <span
            id={timerLabelId}
            className={`m3-type-supporting ${overrun ? 'font-semibold text-alert' : 'text-muted'}`}
          >
            {t(overrun ? 'bake.overrun' : 'bake.estimatedRemaining')}
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span id={elapsedLabelId} className="m3-type-supporting text-muted">
              {t('bake.elapsedTime')}
            </span>
            <span
              role="timer"
              aria-labelledby={elapsedLabelId}
              aria-live="off"
              className="m3-type-supporting font-semibold text-on-surface tabular-nums whitespace-nowrap"
            >
              {formatClock(elapsedSeconds)}
            </span>
          </div>
        </div>
      ) : isActive ? (
        <div className="flex flex-col items-start gap-0.5">
          <span
            role="timer"
            aria-labelledby={elapsedLabelId}
            aria-live="off"
            className={`${heroTimerClass} whitespace-nowrap`}
          >
            {formatClock(elapsedSeconds)}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span id={elapsedLabelId} className="m3-type-supporting text-muted">
              {t('bake.elapsedTime')}
            </span>
            <span aria-hidden="true" className="m3-type-supporting text-muted">
              ·
            </span>
            <span className="m3-type-supporting text-muted">{t('bake.noDuration')}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`${heroTimerClass} min-w-0`}>
            {plannedDuration === undefined ? '—' : formatDuration(plannedDuration)}
          </span>
          <span className="m3-type-supporting text-muted">
            {t(plannedDuration === undefined ? 'bake.noDuration' : 'bake.planned')}
          </span>
        </div>
      )}
      {adjustmentDelta !== undefined && (
        <div className="m3-type-supporting text-muted tabular-nums">
          {t('bake.adjustment', { delta: adjustmentDelta })}
        </div>
      )}
      {showProgress && (
        <>
          <div
            className="mt-2.5 h-2 rounded bg-track"
            role="progressbar"
            aria-label={stepTitle}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-valuetext={t('prep.progressPct', { pct: Math.round(progress * 100) })}
          >
            <div className="h-2 rounded bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="text-xs text-muted">
            {t('prep.progressPct', { pct: Math.round(progress * 100) })}
          </div>
        </>
      )}
      {technique && <span className="text-[15px] text-muted">{technique}</span>}
      <div className="m3-type-supporting flex flex-wrap justify-between gap-2 text-muted">
        <span>
          {startedAt
            ? t('bake.startedAt', { time: formatTime(startedAt, locale) })
            : projected?.start
              ? t('bake.startsAt', { time: formatTime(projected.start, locale) })
              : ''}
        </span>
        <span>
          {projected?.end ? t('bake.endsAt', { time: formatTime(projected.end, locale) }) : ''}
        </span>
      </div>
    </section>
  );
};

const StepList = ({
  title,
  help,
  testId,
  ordered = false,
  children,
}: {
  title: string;
  help?: ReactNode;
  testId?: string;
  ordered?: boolean;
  children: ReactNode;
}) => (
  <section className="flex flex-col" data-testid={testId}>
    <div className="flex items-center gap-1.5 pb-1">
      <SectionTitle>{title}</SectionTitle>
      {help}
    </div>
    {ordered ? (
      <ol
        reversed
        className="m-0 list-decimal list-outside ps-8 text-sm text-muted tabular-nums [&>li]:border-t [&>li]:border-line"
      >
        {children}
      </ol>
    ) : (
      <div className="[&>*]:border-t [&>*]:border-line">{children}</div>
    )}
  </section>
);

interface StepLineProps {
  readonly time: string;
  readonly name: string;
  readonly detail: string;
  /** A direct action on this step, for work that runs in parallel with the focus. */
  readonly action?: { label: string; disabled: boolean; run: () => void };
  /** A second action, such as the readiness mark of a running dough step. */
  readonly extra?: { label: string; disabled: boolean; run: () => void };
  readonly emphasized?: boolean;
}

const StepLine = ({ time, name, detail, action, extra, emphasized = false }: StepLineProps) => (
  <div className="grid min-h-12 grid-cols-[56px_1fr_auto] items-center gap-2.5 py-1.5">
    <span className="font-bold">{time}</span>
    <span className={emphasized ? 'font-bold text-accent-text' : ''}>
      {name}
      {detail && <span className="block text-sm font-normal text-muted">{detail}</span>}
    </span>
    <span className="flex flex-wrap justify-end gap-1">
      {extra && (
        <IonButton
          size="small"
          fill="outline"
          disabled={extra.disabled}
          onClick={extra.run}
          aria-label={`${extra.label} ${name}`}
        >
          {extra.label}
        </IonButton>
      )}
      {action && (
        <IonButton
          size="small"
          fill={emphasized ? 'solid' : 'outline'}
          disabled={action.disabled}
          onClick={action.run}
          aria-label={`${action.label} ${name}`}
        >
          {action.label}
        </IonButton>
      )}
    </span>
  </div>
);

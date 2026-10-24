import { createPortal } from 'react-dom';
import { curatedText } from './template-presentation';
import { useEffect, useState, useRef } from 'react';
import {
  resolveFormula,
  intendedOutcome,
  outcomeProblem,
  outcomeChoiceRequired,
  OUTCOME_RESULTS,
  DOUGH_DISPOSITIONS,
  type PreparationOutcome,
  subjectOf,
  temperatureContext,
} from '@flourprint/core/domain';
import { StepRow, IngredientRow, ContextTiles, PreparationTimer } from './components';
import {
  Button,
  IconButton,
  Disclosure,
  Modal,
  NumberField,
  Menu,
  Tabs,
  Surface,
  CompactDialog,
} from './ui';
import { type Prototype, instant, project, syncSessions } from './model';
import { titleOf, stepDetails, modeLabel, operationIcon } from './ProcessView';
import { groupsOf } from './RecipeView';
import { t, duration, time, grams, num, colon, vesselName, type Locale } from './messages';
import { prepCopy, locationLabel } from './preparation-copy';
import {
  prepActionsCopy,
  formatEarlyFinishPrompt,
  formatAbandonPrompt,
} from './preparation-actions-copy';
import { formatTemperature, formatTemperatureForStep } from './device-preferences';
import { historyCopyT } from './history-copy';
import {
  formatCountdownHHMMSS,
  formatStepAdjustment,
  liveProjection,
  heldSeconds,
  isStepHeld,
  adjustedDurationS,
  previousAction,
  visibleEvents,
  type ProcessStep,
  type BakeEvent,
} from './preparation-runtime';

function formatTechnicalEvent(
  ev: BakeEvent,
  steps: readonly ProcessStep[],
  locale: Locale,
): string {
  const stepId =
    'stepId' in ev.payload && ev.payload.stepId
      ? (ev.payload as { stepId: string }).stepId
      : 'target' in ev.payload && ev.payload.target && 'stepId' in ev.payload.target
        ? (ev.payload.target as { stepId: string }).stepId
        : undefined;
  const step = stepId ? steps.find((s) => s.id === stepId) : undefined;
  const stepName = step ? titleOf(step, locale) : undefined;

  let desc: string;
  switch (ev.payload.type) {
    case 'BakeStarted':
      desc = t(locale, 'startRecorded');
      break;
    case 'BakeFinished':
      desc = t(locale, 'completeSession');
      break;
    case 'BakeAbandoned':
      desc = prepActionsCopy(locale, 'journalAbandonment');
      break;
    case 'StepStarted':
      desc = t(locale, 'started');
      break;
    case 'StepCompleted':
      desc = t(locale, 'done');
      break;
    case 'StepCountdownHeld':
      desc = prepCopy(locale, 'pauseActive');
      break;
    case 'StepCountdownReleased':
      desc = prepCopy(locale, 'actionResume');
      break;
    case 'StepCompletionRetracted':
      desc = prepCopy(locale, 'retractCompletion');
      break;
    case 'StepTimeCorrected':
      desc = prepCopy(locale, 'correctTimeTitle');
      break;
    case 'StepInserted':
      desc = prepCopy(locale, 'repeatStepTitle');
      break;
    case 'OverrideApplied':
      desc = t(locale, 'timeChanged');
      break;
    case 'ObservationAdded':
      desc = 'text' in ev.payload && ev.payload.text ? ev.payload.text : t(locale, 'note');
      break;
    default:
      desc = prepCopy(locale, 'technicalEventGeneric');
  }
  return stepName ? `${stepName} · ${desc}` : desc;
}

export function PreparationView({
  store,
  locale,
  footerHost,
  onExit,
}: {
  store: Prototype;
  locale: Locale;
  footerHost?: HTMLElement | null;
  onExit?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState<'note' | 'photo' | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [outcomeInvalid, setOutcomeInvalid] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [confirmEarlyFinishOpen, setConfirmEarlyFinishOpen] = useState(false);
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false);
  const [chosenOutcome, setChosenOutcome] = useState<PreparationOutcome | undefined>();
  const [commandError, setCommandError] = useState<string | null>(null);
  const [recentlyCompletedStepId, setRecentlyCompletedStepId] = useState<string | null>(null);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState<PreparationOutcome | undefined>();
  const [durationOpen, setDurationOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(NaN);
  const [durationInvalid, setDurationInvalid] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [weighingOpenCount, setWeighingOpenCount] = useState(0);
  const weighingRef = useRef<HTMLDivElement>(null);

  // Correction & repetition dialog states for DependentStepStarted refusal
  const [refusalDialogOpen, setRefusalDialogOpen] = useState(false);
  const [refusalExplanation, setRefusalExplanation] = useState('');
  const [correctTimeOpen, setCorrectTimeOpen] = useState(false);
  const [correctTargetEventId, setCorrectTargetEventId] = useState<string | null>(null);
  const [correctMinutes, setCorrectMinutes] = useState(15);
  const [correctTimeError, setCorrectTimeError] = useState<string | null>(null);
  const [repeatStepOpen, setRepeatStepOpen] = useState(false);
  const [predecessorToRepeat, setPredecessorToRepeat] = useState<ProcessStep | null>(null);
  const [repeatDurationMinutes, setRepeatDurationMinutes] = useState(15);
  const [repeatStepError, setRepeatStepError] = useState<string | null>(null);

  useEffect(() => {
    if (weighingOpenCount > 0) {
      weighingRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [weighingOpenCount]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const session = store.state.session;

  useEffect(() => {
    setChosenOutcome(undefined);
    setPendingFinish(false);
    setCommandError(null);
    setRecentlyCompletedStepId(null);
    setOutcomeDraft(undefined);
    setOutcomeInvalid(false);
    setOutcomeOpen(false);
    setDurationOpen(false);
    setDurationError(null);
    setSheet(null);
    setMoreOpen(false);
    setConfirmEarlyFinishOpen(false);
    setConfirmAbandonOpen(false);
    setNote('');
    setWeighingOpenCount(0);
    setRefusalDialogOpen(false);
    setCorrectTimeOpen(false);
    setCorrectTimeError(null);
    setRepeatStepOpen(false);
    setRepeatStepError(null);
    setPredecessorToRepeat(null);
  }, [session?.id]);

  useEffect(() => {
    setCommandError(null);
  }, [session?.activeId]);

  if (!session) return <p>{t(locale, 'noSession')}</p>;
  const allSessions = syncSessions(store.state.sessions, store.state.session);
  const sequentialSteps = session.effective.steps.filter((s) => s.operation !== 'preheat');
  const preheatSteps = session.effective.steps.filter((s) => s.operation === 'preheat');
  const current = sequentialSteps.find((s) => s.id === session.activeId) ?? sequentialSteps[0];
  const currentIndex = sequentialSteps.findIndex((s) => s.id === current.id);
  const fact = session.facts[current.id];
  const nowInstant = instant(now);

  // Native hold state and countdown freeze
  const stepRecord = session.engineRuntime?.state.steps[current.id];
  const isHeld = session.engineRuntime
    ? isStepHeld(session.engineRuntime.state, current.id)
    : false;
  const heldS = session.engineRuntime ? heldSeconds(stepRecord, nowInstant) : 0;

  // Native live projection
  const liveProj = session.engineRuntime
    ? liveProjection(session.engineRuntime.state, nowInstant)
    : undefined;
  const projection =
    liveProj && liveProj.ok
      ? liveProj
      : project(session.effective, session.startedAt, session.facts);
  const stepProj = projection.ok ? projection.value.steps[current.id] : undefined;

  const isRecordedRunning = Boolean(fact?.startedAt && !fact?.endedAt);
  const isImplicitlyRunning = Boolean(!fact?.startedAt && stepProj?.implicit === true);
  const isRunning = isRecordedRunning || isImplicitlyRunning;

  const effectiveStart = fact?.startedAt ?? (isImplicitlyRunning ? stepProj?.start : undefined);
  const elapsed =
    isRunning && effectiveStart
      ? Math.max(0, (now - Date.parse(effectiveStart)) / 1000 - heldS + session.elapsedOffsetS)
      : 0;
  const isCurrentStepEnded = Boolean(fact?.endedAt);
  const remaining = isCurrentStepEnded
    ? 0
    : current.plannedDurationS === undefined
      ? undefined
      : isRunning && stepProj?.end
        ? Math.max(0, (Date.parse(stepProj.end) - now) / 1000)
        : current.plannedDurationS;

  const progress = isCurrentStepEnded
    ? 1
    : isRunning && current.plannedDurationS && current.plannedDurationS > 0
      ? Math.min(1, Math.max(0, elapsed / current.plannedDurationS))
      : 0;

  const isOverdue = Boolean(
    !isHeld && !isCurrentStepEnded && isRunning && stepProj?.end && now > Date.parse(stepProj.end),
  );

  const baselineDurationS = session.snapshot.process.steps.find(
    (s) => s.id === current.id,
  )?.plannedDurationS;

  const isLastSequentialStep = currentIndex === sequentialSteps.length - 1;
  const isReadyToFinish =
    sequentialSteps.length > 0 && sequentialSteps.every((step) => session.facts[step.id]?.endedAt);

  const needsChoice = outcomeChoiceRequired(session.effective, (id) =>
    Boolean(session.facts[id]?.endedAt),
  );
  const defaultOutcome = intendedOutcome(session.effective);
  const outcome = chosenOutcome ?? (needsChoice ? undefined : defaultOutcome);

  const resultLabel = (value: PreparationOutcome | undefined) => {
    if (!value) return t(locale, 'unknown');
    return t(
      locale,
      value.result === 'cooked'
        ? 'resultCooked'
        : value.result === 'dough'
          ? 'resultDough'
          : 'resultMixed',
    );
  };

  const upcoming = sequentialSteps.filter(
    (s) => !session.facts[s.id]?.endedAt && s.id !== current.id,
  );
  const completed = sequentialSteps.filter((s) => session.facts[s.id]?.endedAt);

  const r = resolveFormula(session.snapshot.formula),
    n = resolveFormula({ ...session.snapshot.formula, anchor: { kind: 'flourTotal', grams: 100 } });
  const groups = r.ok && n.ok ? groupsOf(session.snapshot, r.value, n.value, locale) : [];

  // Predecessor for Previous: follows current.dependsOn to most-recent completed same-subject predecessor
  const depSteps = session.effective.steps.filter(
    (s) => current.dependsOn.includes(s.id) && s.operation !== 'preheat',
  );
  const currentSubject = subjectOf(session.effective, current);
  const sameSubject = (a: { kind: string; id?: string }, b: { kind: string; id?: string }) =>
    a.kind === b.kind && (a.kind === 'mainDough' || a.id === b.id);
  const sameSubjectDeps = depSteps.filter((s) =>
    sameSubject(subjectOf(session.effective, s), currentSubject),
  );
  const candidateDeps = sameSubjectDeps.length > 0 ? sameSubjectDeps : depSteps;
  const predecessorStep =
    candidateDeps
      .filter((s) => session.facts[s.id]?.endedAt)
      .sort((a, b) => {
        const endA = Date.parse(session.facts[a.id]?.endedAt ?? '0');
        const endB = Date.parse(session.facts[b.id]?.endedAt ?? '0');
        return endB - endA;
      })[0] ?? candidateDeps[0];

  const isPrevDisabled = !predecessorStep;

  // Progression: Next
  const handleNext = () => {
    const res = store.executeBakeCommand({
      type: 'CompleteStep',
      stepId: current.id,
      at: nowInstant,
    });
    if (!res.ok) {
      if (res.bakeError?.code === 'DependenciesNotCompleted') {
        const details = res.bakeError.details as { stepId: string; pending: string[] } | undefined;
        const pendingIds = details?.pending ?? [];
        const pendingNames = pendingIds
          .map((id) => {
            const step = session.effective.steps.find((s) => s.id === id);
            return step ? titleOf(step, locale) : prepCopy(locale, 'pendingPrecedingStep');
          })
          .join(', ');
        setCommandError(
          prepCopy(locale, 'errorPendingDependencies', {
            steps: pendingNames || prepCopy(locale, 'preheatTitle'),
          }),
        );
      } else if (res.bakeError?.code === 'StepNotRunning') {
        setCommandError(prepCopy(locale, 'errorStepNotRunning'));
      } else if (res.bakeError?.code === 'StepAlreadyCompleted') {
        setCommandError(prepCopy(locale, 'errorStepAlreadyCompleted'));
      } else if (res.bakeError?.code === 'InvalidTime') {
        setCommandError(prepCopy(locale, 'errorInvalidTime'));
      } else if (res.bakeError?.code === 'BakeNotActive') {
        setCommandError(prepCopy(locale, 'errorBakeNotActive'));
      } else {
        setCommandError(prepCopy(locale, 'errorGenericCommand'));
      }
      return;
    }
    setCommandError(null);
    setRecentlyCompletedStepId(current.id);
  };

  const handleRetractStep = (targetStep: ProcessStep) => {
    if (!session.engineRuntime) return;
    setCommandError(null);
    setRecentlyCompletedStepId(null);

    const action = previousAction(session.engineRuntime.state, targetStep.id);
    if (action.kind === 'retract') {
      store.executeBakeCommand(
        { type: 'RetractCompletion', targetEventId: action.targetEventId },
        nowInstant,
      );
    } else {
      const explanation =
        action.reason === 'dependentStarted'
          ? prepCopy(locale, 'retractRefusalExplanation')
          : prepCopy(locale, 'retractBlockedNotCompleted');
      setRefusalExplanation(explanation);
      const targetEventId = session.engineRuntime.state.steps[targetStep.id]?.endEventId ?? null;
      setCorrectTargetEventId(targetEventId);
      setPredecessorToRepeat(targetStep);
      setRefusalDialogOpen(true);
    }
  };

  // Progression: Previous
  const handlePrev = () => {
    if (!predecessorStep) return;
    handleRetractStep(predecessorStep);
  };

  const completedStepForUndo = recentlyCompletedStepId
    ? session.effective.steps.find((s) => s.id === recentlyCompletedStepId)
    : undefined;

  const handleUndo = () => {
    if (!completedStepForUndo) return;
    handleRetractStep(completedStepForUndo);
  };

  // Pause / Resume toggle
  const handlePauseToggle = () => {
    if (isHeld) {
      store.executeBakeCommand({ type: 'ReleaseStepCountdown', stepId: current.id }, nowInstant);
    } else {
      store.executeBakeCommand(
        { type: 'HoldStepCountdown', stepId: current.id },
        nowInstant,
        current.id,
      );
    }
  };

  // Adjustment ±15min using adjustedDurationS
  const handleAdjust = (deltaMinutes: number) => {
    const currentDuration = current.plannedDurationS ?? 0;
    const newDuration = adjustedDurationS(currentDuration, deltaMinutes * 60);
    store.executeBakeCommand(
      {
        type: 'AdjustStep',
        stepId: current.id,
        adjustment: { field: 'plannedDurationS', value: newDuration },
      },
      nowInstant,
      current.id,
    );
  };

  // Finishing
  const handleFinishClick = () => {
    if (needsChoice && !chosenOutcome) {
      setPendingFinish(true);
      setOutcomeDraft(undefined);
      setOutcomeOpen(true);
      return;
    }
    store.finishSession(chosenOutcome);
  };

  // Correction confirmation
  const handleCorrectTimeConfirm = () => {
    if (!correctTargetEventId) return;
    const newTime = instant(Date.now() - correctMinutes * 60000);
    const res = store.executeBakeCommand(
      { type: 'CorrectStepTime', targetEventId: correctTargetEventId, newOccurredAt: newTime },
      nowInstant,
    );
    if (!res.ok) {
      setCorrectTimeError(
        res.bakeError?.message ??
          res.bakeError?.code ??
          prepCopy(locale, 'retractBlockedNotCompleted'),
      );
      return;
    }
    setCorrectTimeError(null);
    setCorrectTimeOpen(false);
  };

  // Repetition confirmation: clones PREVIOUS step (predecessorToRepeat), inserted after current
  const handleRepeatStepConfirm = () => {
    if (!predecessorToRepeat) return;
    const newStepId = `${predecessorToRepeat.id}-rep-${Date.now()}`;
    const repLabel = `${predecessorToRepeat.label ?? titleOf(predecessorToRepeat, locale)} (${locale === 'fr' ? 'reprise' : 'repetition'})`;
    const newStep: ProcessStep = {
      ...predecessorToRepeat,
      id: newStepId,
      label: repLabel,
      plannedDurationS: repeatDurationMinutes * 60,
      dependsOn: [current.id],
    };
    const res = store.executeBakeCommand(
      { type: 'InsertStepAfter', after: current.id, step: newStep },
      nowInstant,
    );
    if (!res.ok) {
      setRepeatStepError(
        res.bakeError?.message ??
          res.bakeError?.code ??
          prepCopy(locale, 'retractBlockedNotCompleted'),
      );
      return;
    }
    setRepeatStepError(null);
    setRepeatStepOpen(false);
  };

  const contextTilesItems = [
    ...(current.equipment?.mode
      ? [{ id: 'mode', label: t(locale, 'mode'), value: modeLabel(locale, current.equipment.mode) }]
      : []),
    ...(current.equipment?.setpointC !== undefined
      ? [
          {
            id: 'temperature',
            label:
              current.equipment.appliance === 'proofer'
                ? prepCopy(locale, 'roomTemperature')
                : prepCopy(locale, 'ovenTemperature'),
            value: formatTemperature(
              current.equipment.setpointC,
              current.equipment.appliance === 'proofer' ? 'ambient' : 'oven',
              locale,
            ),
          },
        ]
      : current.conditions?.temperatureC !== undefined
        ? [
            {
              id: 'temperature',
              label:
                temperatureContext(current) === 'oven'
                  ? prepCopy(locale, 'ovenTemperature')
                  : prepCopy(locale, 'roomTemperature'),
              value: formatTemperatureForStep(current, current.conditions.temperatureC, locale),
              detail: current.conditions.location
                ? locationLabel(current.conditions.location, locale)
                : undefined,
            },
          ]
        : []),
    ...(current.equipment?.steam
      ? [
          {
            id: 'steam',
            label: t(locale, 'steam'),
            value: t(
              locale,
              current.equipment.steam.source === 'none'
                ? 'steamNone'
                : current.equipment.steam.source === 'manual'
                  ? 'steamManual'
                  : 'steamFunction',
            ),
          },
        ]
      : []),
    ...(current.equipment?.vessel
      ? [
          {
            id: 'vessel',
            label: t(locale, 'vessel'),
            value: vesselName(locale, current.equipment.vessel.item.id),
          },
        ]
      : []),
    ...(r.ok && r.value.doughWeight > 0
      ? [
          {
            id: 'dough-mass',
            label: prepCopy(locale, 'targetDoughMass'),
            value: grams(locale, r.value.doughWeight),
            actionLabel: prepCopy(locale, 'openWeighing'),
            onAction: () => setWeighingOpenCount((c) => c + 1),
          },
        ]
      : []),
  ];

  // Engine events and visible business journal
  const engineEvents = session.engineRuntime?.events ?? [];
  const visibleEngineEvents = visibleEvents(engineEvents);

  const curated = curatedText(locale, current.label, true);
  const rawInstruction = (current as { instructions?: string }).instructions;
  const stepInstruction =
    curated && curated !== titleOf(current, locale)
      ? curated
      : rawInstruction && rawInstruction !== titleOf(current, locale)
        ? rawInstruction
        : undefined;

  const visibleJournalItems: { at: string; text: string; id: string }[] = [];
  for (const ev of visibleEngineEvents) {
    const stepId =
      'stepId' in ev.payload && ev.payload.stepId
        ? (ev.payload as { stepId: string }).stepId
        : undefined;
    const step = stepId ? session.effective.steps.find((s) => s.id === stepId) : undefined;
    const stepTitle = step ? titleOf(step, locale) : undefined;
    let text = '';
    switch (ev.payload.type) {
      case 'BakeStarted':
        text = t(locale, 'startRecorded');
        break;
      case 'BakeFinished':
        text = t(locale, 'completeSession');
        break;
      case 'BakeAbandoned':
        text = prepActionsCopy(locale, 'journalAbandonment');
        break;
      case 'StepStarted':
        text = stepTitle ? `${stepTitle} · ${t(locale, 'started')}` : t(locale, 'started');
        break;
      case 'StepCompleted':
        text = stepTitle ? `${stepTitle} · ${t(locale, 'done')}` : t(locale, 'done');
        break;
      case 'ObservationAdded':
        text =
          ev.payload.text ??
          (stepTitle ? `${stepTitle} · ${ev.payload.category}` : ev.payload.category);
        break;
      case 'OverrideApplied':
        if ('target' in ev.payload && ev.payload.target.kind === 'step') {
          const targetStep = session.effective.steps.find(
            (s) => s.id === (ev.payload as { target: { stepId: string } }).target.stepId,
          );
          const targetTitle = targetStep ? titleOf(targetStep, locale) : undefined;
          const isDurationOverride =
            'unit' in ev.payload &&
            ev.payload.unit === 's' &&
            typeof ev.payload.effective === 'number';
          const durDesc = isDurationOverride
            ? `${t(locale, 'timeChanged')}${colon(locale)}${duration(locale, ev.payload.effective)}`
            : t(locale, 'timeChanged');
          text = targetTitle ? `${targetTitle} · ${durDesc}` : durDesc;
        }
        break;
      case 'StepCountdownHeld':
        text = stepTitle
          ? `${stepTitle} · ${prepCopy(locale, 'pauseActive')}`
          : prepCopy(locale, 'pauseActive');
        break;
      case 'StepCountdownReleased':
        text = stepTitle
          ? `${stepTitle} · ${prepCopy(locale, 'actionResume')}`
          : prepCopy(locale, 'actionResume');
        break;
      case 'StepTimeCorrected':
        text = stepTitle
          ? `${stepTitle} · ${prepCopy(locale, 'correctTimeTitle')}`
          : prepCopy(locale, 'correctTimeTitle');
        break;
      case 'StepInserted':
        text = stepTitle
          ? `${stepTitle} · ${prepCopy(locale, 'repeatStepTitle')}`
          : prepCopy(locale, 'repeatStepTitle');
        break;
      default:
        text = '';
    }
    if (text) {
      visibleJournalItems.push({ at: ev.occurredAt, text, id: ev.eventId });
    }
  }

  for (let i = 0; i < session.journal.length; i++) {
    const j = session.journal[i];
    const alreadyIncluded = visibleJournalItems.some(
      (item) => item.at === j.at && item.text === j.text,
    );
    if (!alreadyIncluded) {
      visibleJournalItems.push({ at: j.at, text: j.text, id: `journal-${j.at}-${i}` });
    }
  }
  visibleJournalItems.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <div className="stack">
      {allSessions.length > 1 && (
        <Tabs
          variant="chips"
          label={prepCopy(locale, 'selectPreparation')}
          tabs={allSessions.map((s, index) => ({
            id: s.id,
            label: `${index + 1}. ${s.recipeName} · ${historyCopyT(locale, 'revisionItem', { version: s.recipeVersion })}${
              s.abandoned
                ? ` · ${prepActionsCopy(locale, 'sessionAbandoned')}`
                : s.finished
                  ? ` · ${prepCopy(locale, 'sessionFinished')}`
                  : ''
            }`,
          }))}
          activeId={session.id}
          onChange={(id) => store.selectSession?.(id)}
        />
      )}

      {session.abandoned ? (
        <h2>{prepActionsCopy(locale, 'sessionAbandonedTitle')}</h2>
      ) : session.finished ? (
        <h2>{t(locale, 'completeSession')}</h2>
      ) : (
        <>
          {/* L127 Active Step Presentation via fp.prep-hero */}
          <div data-step={current.id} data-testid="prep-current-step">
            <PreparationTimer
              title={titleOf(current, locale)}
              heading={prepCopy(locale, 'prepHeading', { recipe: session.recipeName })}
              stepLine={prepCopy(locale, 'stepLine', {
                current: currentIndex + 1,
                total: sequentialSteps.length,
                step: titleOf(current, locale),
              })}
              remaining={formatCountdownHHMMSS(remaining)}
              remainingLabel={prepCopy(locale, 'estimatedRemainingTime')}
              start={
                fact?.startedAt
                  ? time(locale, fact.startedAt)
                  : isImplicitlyRunning && stepProj?.start
                    ? time(locale, stepProj.start)
                    : prepCopy(locale, 'stepNotStarted')
              }
              end={
                fact?.endedAt
                  ? time(locale, fact.endedAt)
                  : stepProj?.end
                    ? time(locale, stepProj.end)
                    : ''
              }
              progress={progress}
              labels={{
                start: fact?.startedAt
                  ? `${prepCopy(locale, 'actualStepStart', { time: '' }).trim()} `
                  : isImplicitlyRunning && stepProj?.start
                    ? `${prepCopy(locale, 'projectedStepStart', { time: '' }).trim()} `
                    : '',
                end: fact?.endedAt
                  ? `${prepCopy(locale, 'actualStepEnd', { time: '' }).trim()} `
                  : stepProj?.end
                    ? `${prepCopy(locale, 'plannedStepEnd', { time: '' }).trim()} `
                    : '',
                progress: prepCopy(locale, 'actualStepProgress'),
              }}
              adjustment={formatStepAdjustment(current.plannedDurationS, baselineDurationS, locale)}
              pausedBadge={isHeld ? prepCopy(locale, 'pauseActive') : undefined}
              overdueBadge={isOverdue ? prepCopy(locale, 'overdue') : undefined}
              countdownLabel={prepCopy(locale, 'countdownRow')}
              progressLabel={prepCopy(locale, 'progressionRow')}
              countdownControls={
                <>
                  <Button
                    variant="secondary"
                    className="touch-target-48"
                    dataTestId="prep-adjust-minus"
                    disabled={(current.plannedDurationS ?? 0) <= 0}
                    onClick={() => handleAdjust(-15)}
                  >
                    {prepCopy(locale, 'actionMinus15')}
                  </Button>
                  <Button
                    variant={isHeld ? 'primary' : 'quiet'}
                    className="touch-target-48"
                    dataTestId="prep-pause-btn"
                    onClick={handlePauseToggle}
                  >
                    {isHeld ? prepCopy(locale, 'actionResume') : prepCopy(locale, 'actionPause')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="touch-target-48"
                    dataTestId="prep-adjust-plus"
                    onClick={() => handleAdjust(15)}
                  >
                    {prepCopy(locale, 'actionPlus15')}
                  </Button>
                </>
              }
              progressionControls={
                <>
                  <Button
                    variant="quiet"
                    className="touch-target-48"
                    dataTestId="prep-prev-btn"
                    disabled={isPrevDisabled}
                    onClick={handlePrev}
                  >
                    {prepCopy(locale, 'actionPrev')}
                  </Button>
                  {isReadyToFinish || (isLastSequentialStep && isCurrentStepEnded) ? (
                    <Button
                      variant="primary"
                      className="touch-target-48"
                      dataTestId="finish-preparation"
                      onClick={handleFinishClick}
                    >
                      {prepCopy(locale, 'finishPreparation')}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="touch-target-48"
                      dataTestId="prep-next-btn"
                      onClick={handleNext}
                    >
                      {prepCopy(locale, 'actionNext')}
                    </Button>
                  )}
                </>
              }
            />
          </div>

          {commandError && (
            <p
              role="alert"
              data-testid="prep-command-error"
              className="danger"
              style={{ color: 'var(--fp-color-error, #ba1a1a)', margin: '8px 0' }}
            >
              {commandError}
            </p>
          )}

          {completedStepForUndo && (
            <div
              role="status"
              data-testid="prep-next-status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--fp-radius-sm, 6px)',
                background: 'var(--fp-color-surface-container, #f0ede6)',
                margin: '8px 0',
              }}
            >
              <span>{prepCopy(locale, 'nextStepCompletedNotice')}</span>
              <Button variant="quiet" dataTestId="prep-undo-next" onClick={handleUndo}>
                {prepCopy(locale, 'actionUndo')}
              </Button>
            </div>
          )}

          {/* Current step instructions compactly below main controls */}
          {stepInstruction && (
            <p className="muted" data-testid="prep-step-instruction">
              {stepInstruction}
            </p>
          )}

          {/* Compact auxiliary actions below */}
          <div className="actions quick-actions">
            <Button dataTestId="prep-note-btn" icon="note" onClick={() => setSheet('note')}>
              {t(locale, 'note')}
            </Button>
            <Button
              dataTestId="prep-duration-btn"
              onClick={() => {
                setDurationMinutes(
                  current.plannedDurationS !== undefined ? current.plannedDurationS / 60 : NaN,
                );
                setDurationInvalid(false);
                setDurationError(null);
                setDurationOpen(true);
              }}
            >
              {t(locale, 'duration')}
            </Button>
            {['bulk', 'proof', 'retard'].includes(current.operation) && (
              <Button
                onClick={() =>
                  store.executeBakeCommand(
                    {
                      type: 'AddObservation',
                      stepId: current.id,
                      category: 'fermentation',
                      kind: 'doughReady',
                      text: t(locale, current.operation === 'bulk' ? 'readyShape' : 'readyCook'),
                    },
                    nowInstant,
                    current.id,
                  )
                }
              >
                {t(locale, current.operation === 'bulk' ? 'readyShape' : 'readyCook')}
              </Button>
            )}
          </div>

          {contextTilesItems.length > 0 && (
            <ContextTiles label={prepCopy(locale, 'contextualDetails')} items={contextTilesItems} />
          )}

          {/* Independent parallel preheat controls */}
          {preheatSteps.map((preheat) => {
            const preheatProj = projection.ok ? projection.value.steps[preheat.id] : undefined;
            const preheatFact = session.facts[preheat.id];
            const isStarted = Boolean(preheatFact?.startedAt);
            const isReady = Boolean(preheatFact?.endedAt);
            const isMissedWindow = !isStarted && !isReady && Boolean(preheatProj?.overdue?.dueAt);
            return (
              <Surface
                key={preheat.id}
                variant="container"
                componentId="preheat-branch"
                className="stack"
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <strong>{titleOf(preheat, locale)}</strong>
                  <span className="muted">
                    {isReady
                      ? prepCopy(locale, 'preheatReady')
                      : isStarted
                        ? prepCopy(locale, 'preheatHeating')
                        : isMissedWindow
                          ? prepCopy(locale, 'preheatMissedWindow')
                          : prepCopy(locale, 'preheatProjected')}
                  </span>
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  {time(locale, preheatProj?.start)} → {time(locale, preheatProj?.end)}
                  {preheatFact?.startedAt &&
                    ` · ${prepCopy(locale, 'heatingStartedAt')} ${time(locale, preheatFact.startedAt)}`}
                  {preheatFact?.endedAt &&
                    ` · ${prepCopy(locale, 'preheatObservedAt')} ${time(locale, preheatFact.endedAt)}`}
                </p>
                <div className="actions">
                  {!isStarted && (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        store.executeBakeCommand(
                          { type: 'StartStep', stepId: preheat.id, at: instant(now) },
                          instant(now),
                        )
                      }
                    >
                      {prepCopy(locale, 'startHeating')}
                    </Button>
                  )}
                  {isStarted && !isReady && (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        store.executeBakeCommand(
                          { type: 'CompleteStep', stepId: preheat.id, at: instant(now) },
                          instant(now),
                        )
                      }
                    >
                      {prepCopy(locale, 'markPreheatReady')}
                    </Button>
                  )}
                </div>
              </Surface>
            );
          })}

          {footerHost &&
            createPortal(
              <IconButton
                icon="more"
                label={t(locale, 'preparationActions')}
                onClick={() => setMoreOpen(true)}
              />,
              footerHost,
            )}
        </>
      )}

      {session.abandoned ? (
        <p data-testid="recorded-outcome" className="muted">
          {prepActionsCopy(locale, 'noUsableOutcome')}
        </p>
      ) : (
        session.finished &&
        session.outcome && (
          <p data-testid="recorded-outcome">
            {resultLabel(session.outcome)}
            {session.outcome.dough ? ` · ${t(locale, session.outcome.dough)}` : ''}
          </p>
        )
      )}

      {(session.abandoned || session.finished) && onExit && (
        <div className="actions">
          <Button variant="primary" dataTestId="prep-exit-btn" onClick={onExit}>
            {prepCopy(locale, 'backToRecipe')}
          </Button>
        </div>
      )}

      {/* More menu */}
      <Menu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t(locale, 'preparationActions')}
        closeLabel={t(locale, 'close')}
        anchor="top"
      >
        <Button
          icon="photo"
          variant="quiet"
          onClick={() => {
            setMoreOpen(false);
            setSheet('photo');
          }}
        >
          {t(locale, 'photo')}
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            setMoreOpen(false);
            setOutcomeInvalid(false);
            setPendingFinish(false);
            setOutcomeDraft(chosenOutcome ?? outcome);
            setOutcomeOpen(true);
          }}
        >
          {outcome
            ? `${resultLabel(outcome)} · ${t(locale, 'outcomeChoice')}`
            : t(locale, 'outcomeChoice')}
        </Button>
        <Button
          variant="quiet"
          dataTestId="finish-preparation-early"
          onClick={() => {
            setMoreOpen(false);
            setConfirmEarlyFinishOpen(true);
          }}
        >
          {t(locale, 'finishSession')}
        </Button>
        <Button
          variant="danger"
          dataTestId="abandon-preparation-btn"
          onClick={() => {
            setMoreOpen(false);
            setConfirmAbandonOpen(true);
          }}
        >
          {prepActionsCopy(locale, 'abandonPreparation')}
        </Button>
      </Menu>

      {/* Refusal Dialog for DependentStepStarted */}
      <CompactDialog
        open={refusalDialogOpen}
        onClose={() => setRefusalDialogOpen(false)}
        title={prepCopy(locale, 'retractRefusalTitle')}
        closeLabel={prepCopy(locale, 'closeAction')}
        footer={
          <div className="actions">
            <Button
              variant="quiet"
              onClick={() => {
                setRefusalDialogOpen(false);
                setCorrectMinutes(15);
                setCorrectTimeOpen(true);
              }}
            >
              {prepCopy(locale, 'correctTimeAction')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setRefusalDialogOpen(false);
                setRepeatDurationMinutes(15);
                setRepeatStepOpen(true);
              }}
            >
              {prepCopy(locale, 'repeatStepAction')}
            </Button>
          </div>
        }
      >
        <p>{refusalExplanation}</p>
      </CompactDialog>

      {/* Compact Dialog for CorrectStepTime */}
      <CompactDialog
        open={correctTimeOpen}
        onClose={() => {
          setCorrectTimeOpen(false);
          setCorrectTimeError(null);
        }}
        title={prepCopy(locale, 'correctTimeTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button
              variant="quiet"
              onClick={() => {
                setCorrectTimeOpen(false);
                setCorrectTimeError(null);
              }}
            >
              {t(locale, 'cancel')}
            </Button>
            <Button variant="primary" onClick={handleCorrectTimeConfirm}>
              {prepCopy(locale, 'applyAction')}
            </Button>
          </div>
        }
      >
        {correctTimeError && (
          <p className="danger" role="alert" style={{ color: 'var(--fp-color-error, #ba1a1a)' }}>
            {correctTimeError}
          </p>
        )}
        <NumberField
          value={correctMinutes}
          label={prepCopy(locale, 'newTimeLabel')}
          unit="min"
          locale={locale}
          errorMessage={t(locale, 'invalid')}
          onCommit={(v) => {
            if (v < 0) return false;
            setCorrectMinutes(v);
            return true;
          }}
        />
      </CompactDialog>

      {/* Compact Dialog for InsertStepAfter */}
      <CompactDialog
        open={repeatStepOpen}
        onClose={() => {
          setRepeatStepOpen(false);
          setRepeatStepError(null);
        }}
        title={prepCopy(locale, 'repeatStepTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button
              variant="quiet"
              onClick={() => {
                setRepeatStepOpen(false);
                setRepeatStepError(null);
              }}
            >
              {t(locale, 'cancel')}
            </Button>
            <Button variant="primary" onClick={handleRepeatStepConfirm}>
              {prepCopy(locale, 'applyAction')}
            </Button>
          </div>
        }
      >
        {repeatStepError && (
          <p className="danger" role="alert" style={{ color: 'var(--fp-color-error, #ba1a1a)' }}>
            {repeatStepError}
          </p>
        )}
        <NumberField
          value={repeatDurationMinutes}
          label={prepCopy(locale, 'repeatDurationLabel')}
          unit="min"
          locale={locale}
          errorMessage={t(locale, 'invalid')}
          onCommit={(v) => {
            if (v <= 0) return false;
            setRepeatDurationMinutes(v);
            return true;
          }}
        />
      </CompactDialog>

      {/* Confirm Early Finish */}
      <CompactDialog
        open={confirmEarlyFinishOpen}
        onClose={() => setConfirmEarlyFinishOpen(false)}
        title={prepActionsCopy(locale, 'confirmEarlyFinishTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setConfirmEarlyFinishOpen(false)}>
              {t(locale, 'cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmEarlyFinishOpen(false);
                handleFinishClick();
              }}
            >
              {prepActionsCopy(locale, 'confirmEarlyFinishAction')}
            </Button>
          </div>
        }
      >
        <p>
          {formatEarlyFinishPrompt(
            locale,
            session.recipeName,
            outcome ? resultLabel(outcome) : undefined,
          )}
        </p>
      </CompactDialog>

      {/* Confirm Abandon */}
      <CompactDialog
        open={confirmAbandonOpen}
        onClose={() => setConfirmAbandonOpen(false)}
        title={prepActionsCopy(locale, 'confirmAbandonTitle')}
        closeLabel={t(locale, 'cancel')}
        footer={
          <div className="actions">
            <Button variant="quiet" onClick={() => setConfirmAbandonOpen(false)}>
              {t(locale, 'cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmAbandonOpen(false);
                store.abandonSession();
              }}
            >
              {prepActionsCopy(locale, 'abandonPreparation')}
            </Button>
          </div>
        }
      >
        <p>{formatAbandonPrompt(locale, session.recipeName)}</p>
      </CompactDialog>

      {/* Outcome Selection Modal */}
      <Modal
        open={outcomeOpen}
        onClose={() => {
          setPendingFinish(false);
          setOutcomeOpen(false);
        }}
        title={t(locale, 'outcomeChoice')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            disabled={outcomeInvalid || !outcomeDraft || Boolean(outcomeProblem(outcomeDraft))}
            onClick={() => {
              if (outcomeDraft) {
                setChosenOutcome(outcomeDraft);
                setOutcomeOpen(false);
                if (pendingFinish) {
                  setPendingFinish(false);
                  store.finishSession(outcomeDraft);
                }
              }
            }}
          >
            {t(locale, 'apply')}
          </Button>
        }
      >
        <p>
          {needsChoice
            ? prepCopy(locale, 'outcomeRequiredExplanation')
            : t(locale, 'defaultOutcome')}
        </p>
        <label className="field-label">
          {t(locale, 'outcome')}
          <select
            value={outcomeDraft?.result ?? ''}
            disabled={outcomeInvalid}
            onChange={(e) =>
              setOutcomeDraft(
                e.target.value
                  ? {
                      ...(outcomeDraft ?? {}),
                      result: e.target.value as PreparationOutcome['result'],
                    }
                  : undefined,
              )
            }
          >
            <option value="">-- {t(locale, 'outcomeChoice')} --</option>
            {OUTCOME_RESULTS.map((result) => (
              <option key={result} value={result}>
                {resultLabel({ result })}
              </option>
            ))}
          </select>
        </label>
        {outcomeDraft && outcomeDraft.result !== 'cooked' && (
          <>
            <label className="field-label">
              {t(locale, 'disposition')}
              <select
                value={outcomeDraft.dough ?? ''}
                onChange={(e) =>
                  setOutcomeDraft({
                    ...outcomeDraft,
                    dough: e.target.value
                      ? (e.target.value as PreparationOutcome['dough'])
                      : undefined,
                  })
                }
              >
                <option value="">{t(locale, 'optional')}</option>
                {DOUGH_DISPOSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(locale, value)}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              value={outcomeDraft.pieces ?? NaN}
              label={t(locale, 'count')}
              onValidityChange={setOutcomeInvalid}
              locale={locale}
              errorMessage={t(locale, 'invalid')}
              onCommit={(pieces) => {
                if (!Number.isInteger(pieces) || pieces < 1) return false;
                setOutcomeDraft({ ...outcomeDraft, pieces });
                return true;
              }}
            />
          </>
        )}
      </Modal>

      {/* Weighing & quantities */}
      <div ref={weighingRef} key={`weighing-${weighingOpenCount}`}>
        <Disclosure
          title={t(locale, 'quantities')}
          subtitle={`${session.recipeName} · ${historyCopyT(locale, 'revisionItem', { version: session.recipeVersion })}`}
          defaultOpen={weighingOpenCount > 0 ? true : undefined}
        >
          <p className="muted">{t(locale, 'snapshotHelp')}</p>
          <p className="muted">{t(locale, 'sessionScope')}</p>
          {groups.map((group) => (
            <Disclosure
              key={group.id}
              title={group.title}
              badge={grams(locale, group.mass)}
              defaultOpen
            >
              {group.rows.map((row) => (
                <IngredientRow
                  key={row.key}
                  id={`prep:${row.key}`}
                  name={row.name}
                  gramsText={grams(locale, row.grams)}
                  pctText={`${num(locale, row.pct)} ${t(locale, 'bakerPct')}`}
                  checked={session.checks.includes(row.key)}
                  checkLabel={`${t(locale, 'weighed')} : ${row.name}`}
                  onToggle={() =>
                    store.updateSession((s) => ({
                      ...s,
                      checks: s.checks.includes(row.key)
                        ? s.checks.filter((id) => id !== row.key)
                        : [...s.checks, row.key],
                    }))
                  }
                />
              ))}
            </Disclosure>
          ))}
        </Disclosure>
      </div>

      {/* Upcoming steps */}
      {!session.finished && !session.abandoned && upcoming.length > 0 && (
        <Disclosure title={t(locale, 'upcoming')} defaultOpen>
          {upcoming.map((step) => (
            <StepRow
              key={step.id}
              icon={operationIcon(step.operation)}
              number={sequentialSteps.indexOf(step) + 1}
              title={titleOf(step, locale)}
              details={[
                time(locale, projection.ok ? projection.value.steps[step.id]?.start : undefined),
                ...stepDetails(step, locale),
              ]}
            />
          ))}
        </Disclosure>
      )}

      {/* User Journal: uses domain visibleEvents, keeps all notes/photos, hides retracted completions */}
      <Disclosure title={t(locale, 'journal')} defaultOpen>
        <ol className="journal" data-testid="prep-business-journal">
          {visibleJournalItems.map((entry) => (
            <li key={entry.id}>
              <time>{time(locale, entry.at)}</time> {entry.text}
            </li>
          ))}
        </ol>
      </Disclosure>

      {/* Technical Event Log */}
      <div data-testid="prep-technical-journal">
        <Disclosure
          title={prepCopy(locale, 'technicalJournal')}
          subtitle={prepCopy(locale, 'technicalEventsCount', { count: engineEvents.length })}
        >
          <ol className="journal">
            {engineEvents.map((ev) => (
              <li key={ev.eventId}>
                <time>{time(locale, ev.occurredAt)}</time>{' '}
                <span>{formatTechnicalEvent(ev, session.effective.steps, locale)}</span>
              </li>
            ))}
          </ol>
        </Disclosure>
      </div>

      {/* Completed steps */}
      <Disclosure title={t(locale, 'completed')}>
        {completed.map((step) => (
          <StepRow
            key={step.id}
            state="done"
            icon={operationIcon(step.operation)}
            number={sequentialSteps.indexOf(step) + 1}
            title={titleOf(step, locale)}
            details={[
              time(locale, session.facts[step.id]?.endedAt),
              duration(locale, step.plannedDurationS),
            ]}
          />
        ))}
      </Disclosure>

      {/* Note / Photo Sheet Modal */}
      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={t(locale, sheet === 'photo' ? 'photoDemo' : 'note')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            variant="primary"
            disabled={sheet === 'note' && !note.trim()}
            onClick={() => {
              if (sheet === 'note') {
                store.log(note.trim());
                setNote('');
              }
              if (sheet === 'photo') store.log(t(locale, 'photoAdded'));
              setSheet(null);
            }}
          >
            {t(locale, sheet === 'photo' ? 'attachPhoto' : 'apply')}
          </Button>
        }
      >
        {sheet === 'note' && (
          <label className="field-label">
            {t(locale, 'notePrompt')}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        {sheet === 'photo' && <p>{t(locale, 'photoHelp')}</p>}
      </Modal>

      {/* Absolute Duration Modal */}
      <Modal
        open={durationOpen}
        onClose={() => {
          setDurationOpen(false);
          setDurationError(null);
        }}
        title={t(locale, 'duration')}
        closeLabel={t(locale, 'close')}
        footer={
          <Button
            variant="primary"
            disabled={durationInvalid || isNaN(durationMinutes) || durationMinutes < 0}
            onClick={() => {
              const res = store.executeBakeCommand(
                {
                  type: 'AdjustStep',
                  stepId: current.id,
                  adjustment: { field: 'plannedDurationS', value: durationMinutes * 60 },
                },
                nowInstant,
                current.id,
              );
              if (res.ok) {
                setDurationOpen(false);
                setDurationError(null);
              } else {
                setDurationError(
                  res.bakeError?.message ?? res.bakeError?.code ?? t(locale, 'invalid'),
                );
              }
            }}
          >
            {t(locale, 'apply')}
          </Button>
        }
      >
        {durationError && (
          <p className="danger" role="alert" style={{ color: 'var(--fp-color-error, #ba1a1a)' }}>
            {durationError}
          </p>
        )}
        <NumberField
          value={durationMinutes}
          label={t(locale, 'duration')}
          unit="min"
          locale={locale}
          errorMessage={t(locale, 'invalid')}
          onValidityChange={setDurationInvalid}
          onCommit={(v) => {
            if (isNaN(v) || v < 0) return false;
            setDurationMinutes(v);
            return true;
          }}
        />
      </Modal>
    </div>
  );
}

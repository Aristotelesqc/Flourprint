import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  useIonAlert,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { loadBake } from '@flourprint/core/application';
import {
  doughReadyStage,
  type BakeCommandPayload,
  type BakeState,
  type DomainError,
  type Instant,
} from '@flourprint/core/domain';
import { NoteSheet } from '../blocks/NoteSheet';
import { techniqueSummary } from '../blocks/StepSheet';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatTime, parseDuration, editableDuration } from '../i18n/time';
import {
  bakeAlerts,
  bakeLog,
  bakeView,
  foldStatus,
  stepProgress,
  type BakeStepView,
  type LogEntry,
} from '../services/bake-view';
import { useBakeCommands, type CommandOutcome } from '../services/bake-commands';
import { BAKES_CHANGED } from '../services/notifications';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { InfoButton } from '../ui/InfoButton';
import { SimulationBanner } from '../ui/SimulationBanner';
import { SectionTitle } from '../ui/Layout';

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);
const CRITERIA = ['poke', 'feel', 'time', 'other'] as const;

/** Bake mode (#8, #21): "what do I do now?" first; everything is recorded as bake events. */
export const BakePage = () => {
  const bakeId = useParams<{ bakeId: string }>().bakeId ?? '';
  const services = useServices();
  const { t, error, stepName, locale } = useMessages();
  const [presentAlert] = useIonAlert();
  const [state, setState] = useState<BakeState>();
  const [recipeName, setRecipeName] = useState<string>();
  const [failure, setFailure] = useState<DomainError>();
  const [readFailed, setReadFailed] = useState(false);
  const [now, setNow] = useState<Instant>(services.clock.now());
  const commands = useBakeCommands(services);
  const { pending } = commands;
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
      if (recipeId) setRecipeName((await services.recipes.getRecipe(recipeId))?.name);
    } catch (cause) {
      console.error(cause);
      setReadFailed(true);
    }
  }, [services, bakeId]);

  // A bake of the other world reads as absent (ADR 0014): reload when the mode changes.
  useEffect(() => void reload(), [reload, simulation]);
  // Ionic keeps inactive pages mounted: refresh when the page or the app becomes visible again.
  useIonViewWillEnter(() => void reload(), [reload]);
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

  /** Applies the outcome of a command; resolves to a message when it was not recorded. */
  const settle = async (outcome: CommandOutcome): Promise<string | undefined> => {
    setNow(services.clock.now());
    switch (outcome.kind) {
      case 'ok':
        setState(outcome.state);
        setFailure(undefined);
        return undefined;
      case 'rejected':
        setFailure(outcome.error);
        if (outcome.error.code === 'VersionConflict') await reload();
        return error(outcome.error);
      case 'storage':
        return t('state.storageWrite');
      case 'busy':
        return t('state.writeBusy');
    }
  };

  const send = async (payload: BakeCommandPayload) => settle(await commands.send(state, payload));

  /** A note is closed only once it is durably written; an uncertain one is retried as is. */
  const saveNote = async (payload: BakeCommandPayload): Promise<string | undefined> => {
    const retrying = pending && JSON.stringify(pending.payload) === JSON.stringify(payload);
    const problem = await settle(
      retrying ? await commands.retry() : await commands.send(state, payload),
    );
    if (problem === undefined) setNoteOn(undefined);
    return problem;
  };

  const view = state.status === 'active' ? bakeView(state, now) : undefined;
  const focus = view?.focus;
  const log = bakeLog(state);
  const criterionLabel = (code: string) => {
    const key = `bake.doughReady.${code}`;
    return isKey(key) ? t(key) : code;
  };
  const nameOf = (id: string | undefined) => {
    const step = state.process?.steps.find((s) => s.id === id);
    return step ? stepName(step) : (id ?? '');
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

  const note = () => setNoteOn(focus ? { stepId: focus.step.id } : {});

  /** The stage a running dough step can be judged ready for (bake-session.md), if any. */
  const readyStage = (target: BakeStepView) =>
    target.startedAt !== undefined && target.endedAt === undefined && state.process
      ? doughReadyStage(state.process, target.step.id)
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

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <div className="truncate px-1 text-sm text-muted">{recipeName}</div>
          {view && focus && (
            <span slot="end" className="pr-4 text-sm text-muted">
              {t('bake.position', { index: view.position, total: view.total })}
            </span>
          )}
        </IonToolbar>
        <SimulationBanner />
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-5">
          {failure && (
            <p role="alert" className="m-0 text-alert">
              {error(failure)}
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

          {state.status !== 'active' && (
            <h1 className="m-0 text-3xl font-bold">
              {t(state.status === 'abandoned' ? 'bake.abandoned' : 'bake.finished')}
            </h1>
          )}

          {focus && <Focus focus={focus} now={now} />}

          {focus && (
            <>
              <IonButton
                expand="block"
                className="h-[72px] text-[22px] font-bold [--border-radius:18px]"
                disabled={commands.busy || pending !== undefined}
                onClick={() =>
                  void send(
                    focus.running
                      ? { type: 'CompleteStep', stepId: focus.step.id }
                      : { type: 'StartStep', stepId: focus.step.id },
                  )
                }
              >
                {t(focus.running ? 'bake.done' : 'bake.start', { step: stepName(focus.step) })}
              </IonButton>
              <div className="grid grid-cols-3 gap-2.5">
                <IonButton
                  fill="outline"
                  disabled={focus.step.plannedDurationS === undefined}
                  onClick={() =>
                    void send({
                      type: 'AdjustStep',
                      stepId: focus.step.id,
                      adjustment: {
                        field: 'plannedDurationS',
                        value: (focus.step.plannedDurationS ?? 0) + 900,
                      },
                    })
                  }
                >
                  {t('bake.plus15')}
                </IonButton>
                <IonButton fill="outline" onClick={() => adjust(focus)}>
                  {t('bake.adjust')}
                </IonButton>
                <IonButton fill="outline" onClick={note}>
                  {t('bake.note')}
                </IonButton>
              </div>
              {focus.running &&
                (() => {
                  const stage = readyStage(focus);
                  return (
                    stage && (
                      <div className="flex items-center justify-center gap-3">
                        <IonButton
                          fill="outline"
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
              <IonButton
                expand="block"
                size="large"
                onClick={() => void send({ type: 'FinishBake' })}
              >
                {t('bake.finish')}
              </IonButton>
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

          {log.length > 0 && (
            <StepList title={t('bake.log')}>
              {log.slice(0, state.status === 'active' ? 3 : undefined).map((entry) => (
                <p
                  key={`${entry.kind}-${entry.at}-${entry.stepId ?? ''}-${entry.set ?? ''}`}
                  className="m-0 py-2 text-sm text-muted"
                >
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
                        : t(entry.kind === 'started' ? 'bake.log.started' : 'bake.log.completed', {
                            time: formatTime(entry.at, locale),
                            step: nameOf(entry.stepId),
                          })}
                </p>
              ))}
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

          {state.status === 'active' && (
            <IonButton fill="clear" color="medium" onClick={abandon}>
              {t('bake.abandon')}
            </IonButton>
          )}
        </div>
        <NoteSheet
          open={noteOn !== undefined}
          state={state}
          {...(noteOn?.stepId === undefined ? {} : { stepId: noteOn.stepId })}
          busy={commands.busy}
          onSave={saveNote}
          onClose={() => setNoteOn(undefined)}
        />
      </IonContent>
    </IonPage>
  );
};

/** A note's text, with its rating as stars when it has one. */
const noteText = (entry: LogEntry): string =>
  [ratingText(entry.rating), entry.text ?? ''].filter((part) => part !== '').join(' ');

/** Stars for a whole rating in [0, 5]; any other recorded value as a number, never a crash. */
const ratingText = (rating: number | undefined): string => {
  if (rating === undefined || !Number.isFinite(rating)) return '';
  return Number.isInteger(rating) && rating >= 0 && rating <= 5
    ? '★'.repeat(rating)
    : `${rating}/5`;
};

type Translate = ReturnType<typeof useMessages>['t'];

const remainingText = (end: Instant, now: Instant, t: Translate): string => {
  const seconds = (Date.parse(end) - Date.parse(now)) / 1000;
  return `${formatDuration(seconds)} ${t(seconds >= 0 ? 'bake.left' : 'bake.over')}`;
};

const Focus = ({ focus, now }: { focus: BakeStepView & { running: boolean }; now: Instant }) => {
  const { t, stepName, locale } = useMessages();
  const { projected, startedAt } = focus;
  const duration = focus.step.plannedDurationS;
  let big = '—';
  let unit = '';
  if (focus.running && projected?.end) {
    const seconds = (Date.parse(projected.end) - Date.parse(now)) / 1000;
    big = formatDuration(seconds);
    unit = t(seconds >= 0 ? 'bake.left' : 'bake.over');
  } else if (duration !== undefined) {
    big = formatDuration(duration);
    unit = t('bake.planned');
  }
  const progress =
    focus.running && startedAt && projected?.end
      ? stepProgress(Date.parse(startedAt), Date.parse(projected.end), Date.parse(now))
      : 0;
  return (
    <section className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-bold tracking-wider text-accent-text uppercase">
        {t(focus.running ? 'bake.now' : 'bake.upNext')}
        <InfoButton topic="bakeFocus" term={t(focus.running ? 'bake.now' : 'bake.upNext')} />
      </span>
      <h1 className="m-0 text-[40px] leading-tight font-bold">{stepName(focus.step)}</h1>
      {focus.step.technique && (
        <span className="text-[15px] text-muted">{techniqueSummary(t, focus.step.technique)}</span>
      )}
      <div className="flex items-baseline gap-2.5">
        <span className="text-[52px] leading-none font-bold">{big}</span>
        <span className="text-lg text-muted">{unit}</span>
      </div>
      {focus.running && (
        <div
          className="mt-2.5 h-2 rounded bg-track"
          role="progressbar"
          aria-label={stepName(focus.step)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={unit ? `${big} ${unit}` : big}
        >
          <div className="h-2 rounded bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <div className="flex justify-between text-[15px] text-muted">
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
  children,
}: {
  title: string;
  help?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col">
    <div className="flex items-center gap-1.5 pb-1">
      <SectionTitle>{title}</SectionTitle>
      {help}
    </div>
    <div className="[&>*]:border-t [&>*]:border-line">{children}</div>
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

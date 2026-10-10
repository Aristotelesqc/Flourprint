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
  lastDoughStepId,
  type BakeCommandPayload,
  type BakeState,
  type DomainError,
  type Instant,
} from '@flourprint/core/domain';
import { NoteSheet } from '../blocks/NoteSheet';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatTime, parseDuration, editableDuration } from '../i18n/time';
import {
  bakeLog,
  bakeView,
  stepProgress,
  type BakeStepView,
  type LogEntry,
} from '../services/bake-view';
import { sendBakeCommand } from '../services/bakes';
import { useServices } from '../services/services';
import { useGuardedWrite } from '../services/writes';
import { SectionTitle } from '../ui/Layout';

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);
const DOUGH_READY_OPERATIONS = new Set(['bulk', 'retard', 'proof']);
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
  const writes = useGuardedWrite();
  // The note sheet, open on a step (or on the whole bake).
  const [noteOn, setNoteOn] = useState<{ stepId?: string }>();
  // A command whose outcome is unknown (storage error): retried with the same id, never twice.
  const [pending, setPending] = useState<{
    commandId: string;
    version: number;
    payload: BakeCommandPayload;
  }>();

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

  useEffect(() => void reload(), [reload]);
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

  const execute = async (command: {
    commandId: string;
    version: number;
    payload: BakeCommandPayload;
  }) => {
    const result = await writes.run(() =>
      sendBakeCommand(
        services,
        { bakeId: state.bakeId, version: command.version },
        command.payload,
        command.commandId,
      ),
    );
    setNow(services.clock.now());
    if (!result.ok) {
      if (result.reason === 'storage') setPending(command);
      return;
    }
    setPending(undefined);
    if (result.value.ok) {
      setState(result.value.value.state);
      setFailure(undefined);
    } else {
      setFailure(result.value.error);
      if (result.value.error.code === 'VersionConflict') await reload();
    }
  };

  const send = (payload: BakeCommandPayload) =>
    execute({ commandId: services.ids.next(), version: state.version, payload });

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

  /** The dough's fermentation steps: where the baker judges it ready (fermentation.md). */
  const fermenting = (stepId: string) => {
    const step = state.process?.steps.find((s) => s.id === stepId);
    return (
      step !== undefined &&
      (DOUGH_READY_OPERATIONS.has(step.operation) ||
        (state.process !== undefined && lastDoughStepId(state.process) === stepId))
    );
  };

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
              <IonButton disabled={writes.busy} onClick={() => void execute(pending)}>
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
                disabled={writes.busy || pending !== undefined}
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
              {focus.running && fermenting(focus.step.id) && (
                <IonButton
                  fill="outline"
                  disabled={writes.busy || pending !== undefined}
                  onClick={() => doughReady(focus.step.id)}
                >
                  {t('bake.doughReady')}
                </IonButton>
              )}
            </>
          )}

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
                    disabled: writes.busy || pending !== undefined,
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
            <StepList title={t('bake.alsoRunning')}>
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
                    disabled: writes.busy || pending !== undefined,
                    run: () => void send({ type: 'CompleteStep', stepId: v.step.id }),
                  }}
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
                          disabled: writes.busy || pending !== undefined,
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
                  key={`${entry.kind}-${entry.at}-${entry.stepId ?? ''}`}
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
                    : entry.kind === 'doughReady'
                      ? entry.criterion === undefined
                        ? t('bake.log.doughReady', {
                            time: formatTime(entry.at, locale),
                            step: nameOf(entry.stepId),
                          })
                        : t('bake.log.doughReadyBy', {
                            time: formatTime(entry.at, locale),
                            step: nameOf(entry.stepId),
                            criterion: criterionLabel(entry.criterion),
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
              disabled={writes.busy || pending !== undefined}
              onClick={note}
            >
              {t('bake.addNote')}
            </IonButton>
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
          onSave={(payload) => {
            setNoteOn(undefined);
            void send(payload);
          }}
          onClose={() => setNoteOn(undefined)}
        />
      </IonContent>
    </IonPage>
  );
};

/** A note's text, with its rating as stars when it has one. */
const noteText = (entry: LogEntry): string =>
  [entry.rating === undefined ? '' : '★'.repeat(entry.rating), entry.text ?? '']
    .filter((part) => part !== '')
    .join(' ');

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
      <span className="text-sm font-bold tracking-wider text-accent-text uppercase">
        {t(focus.running ? 'bake.now' : 'bake.upNext')}
      </span>
      <h1 className="m-0 text-[40px] leading-tight font-bold">{stepName(focus.step)}</h1>
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

const StepList = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col">
    <div className="pb-1">
      <SectionTitle>{title}</SectionTitle>
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
  readonly emphasized?: boolean;
}

const StepLine = ({ time, name, detail, action, emphasized = false }: StepLineProps) => (
  <div className="grid min-h-12 grid-cols-[56px_1fr_auto] items-center gap-2.5 py-1.5">
    <span className="font-bold">{time}</span>
    <span className={emphasized ? 'font-bold text-accent-text' : ''}>
      {name}
      {detail && <span className="block text-sm font-normal text-muted">{detail}</span>}
    </span>
    {action ? (
      <IonButton
        size="small"
        fill={emphasized ? 'solid' : 'outline'}
        disabled={action.disabled}
        onClick={action.run}
        aria-label={`${action.label} ${name}`}
      >
        {action.label}
      </IonButton>
    ) : (
      <span />
    )}
  </div>
);

import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import type { BakeCommandPayload, BakeState, Instant } from '@flourprint/core/domain';
import { NoteSheet } from '../blocks/NoteSheet';
import { useMessages } from '../i18n/use-messages';
import { formatDuration, formatTime } from '../i18n/time';
import { bakeAlerts, bakeView, stepProgress } from '../services/bake-view';
import { useBakeCommands, type CommandOutcome } from '../services/bake-commands';
import { activeBakes } from '../services/bakes';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { SimulationBanner } from '../ui/SimulationBanner';

interface Running {
  readonly state: BakeState;
  readonly recipe?: string;
}

/** Every running bake on one screen (#8): what each needs now and when, most urgent first. */
export const BakesPage = () => {
  const services = useServices();
  const { t, error } = useMessages();
  const [bakes, setBakes] = useState<readonly Running[]>();
  // Active bakes whose log this version cannot read: listed, never dropped silently.
  const [unreadable, setUnreadable] = useState<readonly string[]>([]);
  const [now, setNow] = useState<Instant>(services.clock.now());
  const [readFailed, setReadFailed] = useState(false);
  const [failure, setFailure] = useState<{ bakeId: string; text: string }>();
  const [noteFor, setNoteFor] = useState<{ state: BakeState; stepId?: string }>();
  const commands = useBakeCommands(services);
  const { simulation, offsetMs } = usePreferences();

  const load = useCallback(async () => {
    try {
      const active = await activeBakes(services);
      setUnreadable(active.filter(({ result }) => !result.ok).map(({ bakeId }) => bakeId));
      const states = active.flatMap(({ result }) => (result.ok ? [result.value] : []));
      const loaded = await Promise.all(
        states.map(async (state): Promise<Running> => {
          const id = state.snapshot?.revisions.formula.id;
          const recipe = id ? (await services.recipes.getRecipe(id))?.name : undefined;
          return { state, ...(recipe === undefined ? {} : { recipe }) };
        }),
      );
      setNow(services.clock.now());
      setBakes(loaded);
      setReadFailed(false);
    } catch (cause) {
      console.error(cause);
      setReadFailed(true);
    }
  }, [services]);

  useIonViewWillEnter(() => void load(), [load]);
  // Only the bakes of the current mode, on its clock (ADR 0014).
  useEffect(() => void load(), [load, simulation, offsetMs]);
  useEffect(() => {
    const timer = setInterval(() => setNow(services.clock.now()), 15_000);
    const resume = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [services, load]);

  /** Applies an outcome to the card of its bake; resolves to a message when nothing was recorded. */
  const settle = async (bakeId: string, outcome: CommandOutcome): Promise<string | undefined> => {
    const text =
      outcome.kind === 'ok'
        ? undefined
        : outcome.kind === 'rejected'
          ? error(outcome.error)
          : t(outcome.kind === 'storage' ? 'state.storageWrite' : 'state.writeBusy');
    setFailure(text === undefined ? undefined : { bakeId, text });
    await load();
    return text;
  };

  const send = async (state: BakeState, payload: BakeCommandPayload) =>
    settle(state.bakeId, await commands.send(state, payload));

  /** The uncertain command, resent with its original id (D7). */
  const retry = async () => {
    const bakeId = commands.pending?.bakeId;
    if (bakeId) await settle(bakeId, await commands.retry());
  };

  /** A note closes only once durably written; an uncertain one is retried as is. */
  const saveNote = async (state: BakeState, payload: BakeCommandPayload) => {
    const { pending } = commands;
    const retrying =
      pending?.bakeId === state.bakeId &&
      JSON.stringify(pending.payload) === JSON.stringify(payload);
    const problem = await settle(
      state.bakeId,
      retrying ? await commands.retry() : await commands.send(state, payload),
    );
    if (problem === undefined) setNoteFor(undefined);
    return problem;
  };

  const soonest = (state: BakeState) =>
    Date.parse(bakeAlerts(state, now)[0]?.at ?? '9999-12-31T00:00:00Z');
  const sorted = [...(bakes ?? [])].sort((a, b) => soonest(a.state) - soonest(b.state));

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>{t('bakes.title')}</IonTitle>
        </IonToolbar>
        <SimulationBanner />
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-4">
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {unreadable.length > 0 && (
            <p role="alert" className="m-0 text-alert">
              {t('bakes.unreadable', { count: unreadable.length })}
            </p>
          )}
          {bakes?.length === 0 && unreadable.length === 0 && (
            <p className="text-muted">{t('bakes.empty')}</p>
          )}
          {sorted.map((bake) => (
            <BakeCard
              key={bake.state.bakeId}
              bake={bake}
              now={now}
              busy={commands.busy || commands.pending !== undefined}
              {...(failure?.bakeId === bake.state.bakeId ? { failure: failure.text } : {})}
              {...(commands.pending?.bakeId === bake.state.bakeId
                ? { onRetry: () => void retry() }
                : {})}
              onSend={(payload) => void send(bake.state, payload)}
              onNote={(stepId) =>
                setNoteFor({ state: bake.state, ...(stepId === undefined ? {} : { stepId }) })
              }
            />
          ))}
        </div>
        {noteFor && (
          <NoteSheet
            open
            state={noteFor.state}
            {...(noteFor.stepId === undefined ? {} : { stepId: noteFor.stepId })}
            busy={commands.busy}
            onSave={(payload) => saveNote(noteFor.state, payload)}
            onClose={() => setNoteFor(undefined)}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

const BakeCard = ({
  bake,
  now,
  busy,
  failure,
  onRetry,
  onSend,
  onNote,
}: {
  bake: Running;
  now: Instant;
  busy: boolean;
  failure?: string;
  /** The uncertain command of this bake, resent as is. */
  onRetry?: () => void;
  onSend: (payload: BakeCommandPayload) => void;
  onNote: (stepId: string | undefined) => void;
}) => {
  const { t, stepName, locale } = useMessages();
  const { state } = bake;
  const view = bakeView(state, now);
  const focus = view?.focus;
  const alerts = bakeAlerts(state, now).slice(0, 2);
  const nameOf = (id: string) => {
    const step = state.process?.steps.find((s) => s.id === id);
    return step ? stepName(step) : id;
  };
  let big = '—';
  let unit = '';
  let progress = 0;
  if (focus?.running && focus.projected?.end) {
    const seconds = (Date.parse(focus.projected.end) - Date.parse(now)) / 1000;
    big = formatDuration(seconds);
    unit = t(seconds >= 0 ? 'bake.left' : 'bake.over');
    if (focus.startedAt) {
      progress = stepProgress(
        Date.parse(focus.startedAt),
        Date.parse(focus.projected.end),
        Date.parse(now),
      );
    }
  } else if (focus?.step.plannedDurationS !== undefined) {
    big = formatDuration(focus.step.plannedDurationS);
    unit = t('bake.planned');
  }
  return (
    <section
      aria-label={bake.recipe ?? t('recipe.deleted')}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-lg font-semibold">{bake.recipe ?? t('recipe.deleted')}</span>
        {view && (
          <span className="shrink-0 text-sm text-muted">
            {t('bake.position', { index: view.position, total: view.total })}
          </span>
        )}
      </div>
      {focus ? (
        <>
          <span className="text-xs font-bold tracking-wider text-accent-text uppercase">
            {t(focus.running ? 'bake.now' : 'bake.upNext')}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold">{stepName(focus.step)}</span>
            <span className="shrink-0">
              <span className="text-2xl font-bold">{big}</span>{' '}
              <span className="text-sm text-muted">{unit}</span>
            </span>
          </div>
          {focus.running && (
            <div
              className="h-1.5 rounded bg-track"
              role="progressbar"
              aria-label={stepName(focus.step)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="h-1.5 rounded bg-accent" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </>
      ) : (
        view?.allDone && <span className="text-lg">{t('bake.allDone')}</span>
      )}
      {alerts.map((alert) => (
        <span key={`${alert.kind}-${alert.stepId}`} className="text-sm text-muted">
          {t(alert.kind === 'end' ? 'bakes.alert.end' : 'bakes.alert.start', {
            time: formatTime(alert.at, locale),
            step: nameOf(alert.stepId),
          })}
        </span>
      ))}
      {failure && (
        <p role="alert" className="m-0 text-alert">
          {failure}
        </p>
      )}
      {onRetry && (
        <IonButton fill="outline" onClick={onRetry}>
          {t('state.retry')}
        </IonButton>
      )}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        {focus ? (
          <IonButton
            disabled={busy}
            onClick={() =>
              onSend(
                focus.running
                  ? { type: 'CompleteStep', stepId: focus.step.id }
                  : { type: 'StartStep', stepId: focus.step.id },
              )
            }
          >
            {t(focus.running ? 'bake.done' : 'bake.start', { step: stepName(focus.step) })}
          </IonButton>
        ) : view?.allDone ? (
          <IonButton disabled={busy} onClick={() => onSend({ type: 'FinishBake' })}>
            {t('bake.finish')}
          </IonButton>
        ) : (
          <span />
        )}
        <IonButton fill="outline" onClick={() => onNote(focus?.step.id)}>
          {t('bake.note')}
        </IonButton>
        <IonButton fill="outline" routerLink={`/bakes/${state.bakeId}`}>
          {t('bakes.open')}
        </IonButton>
      </div>
    </section>
  );
};

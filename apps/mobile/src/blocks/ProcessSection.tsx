import {
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { useMemo, useState } from 'react';
import {
  projectProcess,
  type Instant,
  type Process,
  type ProjectionMode,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import { NumberField } from './NumberField';

interface Props {
  readonly process: Process;
  readonly onDurationChange: (stepId: string, durationS: number) => void;
}

/** `datetime-local` value (local time, minutes) ↔ UTC instant. */
const toLocalInput = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
const fromLocalInput = (value: string): Instant => new Date(value).toISOString() as Instant;

const nextQuarterHour = (): Date => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 15) * 15);
  return date;
};

/** Steps with their planned times, start-at or ready-by (#5, #17); times come from the engine. */
export const ProcessSection = ({ process, onDurationChange }: Props) => {
  const { t, error, locale } = useMessages();
  const [modeKind, setModeKind] = useState<ProjectionMode['kind']>('startAt');
  const [when, setWhen] = useState(() => toLocalInput(nextQuarterHour()));
  const target = process.steps.at(-1)?.id;

  const projection = useMemo(() => {
    const at = fromLocalInput(when);
    const mode: ProjectionMode =
      modeKind === 'readyBy' && target ? { kind: 'readyBy', at, target } : { kind: 'startAt', at };
    return projectProcess(process, { mode });
  }, [process, modeKind, when, target]);

  const operation = (code: string) => {
    const key = `operation.${code}`;
    return key in en ? t(key as MessageKey) : code;
  };
  const time = (instant: string | undefined) =>
    instant === undefined
      ? '?'
      : new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(instant));
  const nameOf = (id: string) => operation(process.steps.find((s) => s.id === id)?.operation ?? id);

  return (
    <>
      <IonSegment
        value={modeKind}
        onIonChange={(e) => setModeKind(e.detail.value === 'readyBy' ? 'readyBy' : 'startAt')}
      >
        <IonSegmentButton value="startAt">
          <IonLabel>{t('process.mode.startAt')}</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="readyBy">
          <IonLabel>{t('process.mode.readyBy')}</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      <label className="mt-3 flex min-h-[var(--spacing-touch)] items-center justify-between gap-2">
        <span>{t('process.when')}</span>
        <input
          type="datetime-local"
          className="rounded border border-[var(--color-muted)] bg-transparent p-2"
          value={when}
          onChange={(e) => e.target.value && setWhen(e.target.value)}
        />
      </label>
      {modeKind === 'readyBy' && target && (
        <IonNote className="block">{t('process.readyTarget', { step: nameOf(target) })}</IonNote>
      )}
      {!projection.ok && (
        <p role="alert" className="mt-2 text-[var(--color-alert)]">
          {error(projection.error)}
        </p>
      )}

      <IonList className="mt-2">
        {process.steps.map((step) => {
          const planned = projection.ok ? projection.value.steps[step.id] : undefined;
          return (
            <IonItem key={step.id}>
              <IonLabel className="ion-text-wrap">
                <h2>
                  {operation(step.operation)}{' '}
                  {step.schedule === 'alap' && (
                    <IonBadge color="medium">{t('process.alap')}</IonBadge>
                  )}
                </h2>
                <p>
                  {time(planned?.start)} → {time(planned?.end)}
                </p>
                {step.dependsOn.length > 0 && (
                  <p>{t('process.after', { steps: step.dependsOn.map(nameOf).join(', ') })}</p>
                )}
                {planned && planned.unknownAfter.length > 0 && (
                  <p>
                    {t('process.unknown', { steps: planned.unknownAfter.map(nameOf).join(', ') })}
                  </p>
                )}
              </IonLabel>
              <div slot="end" className="w-28">
                <NumberField
                  label={`${step.id} ${t('process.duration')}`}
                  unit="min"
                  value={(step.plannedDurationS ?? 0) / 60}
                  onCommit={(minutes) => onDurationChange(step.id, Math.round(minutes * 60))}
                />
              </div>
            </IonItem>
          );
        })}
      </IonList>
    </>
  );
};

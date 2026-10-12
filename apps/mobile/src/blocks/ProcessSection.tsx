import { IonButton } from '@ionic/react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  insertStepAfter,
  projectProcess,
  temperatureContext,
  type Instant,
  type Process,
  type ProjectedStep,
  type ProcessStep,
  type ProjectionMode,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { formatDay, formatDayTime, formatDuration, formatTime, localDayKey } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { DurationField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';
import { newStepId, STEP_OPERATIONS } from '../services/process-edit';
import { StepSheet, techniqueSummary } from './StepSheet';

interface Props {
  readonly process: Process;
  /** Undefined clears the duration (unknown); returns false when the change was refused. */
  readonly onDurationChange: (stepId: string, durationS: number | undefined) => boolean;
  /** Structure and technique edits (add, remove, technique); false when refused. */
  readonly onProcessChange: (process: Process) => boolean;
  /** Ids of the formula's preparations: their steps are removed through the preparation. */
  readonly preparationIds: readonly string[];
  /** False while the recipe has unsaved changes: a bake starts from a saved revision. */
  readonly canStart: boolean;
  /** Starts another bake from the moment of the tap, whatever time the planner shows. */
  readonly onStart: () => void;
  /** A bake of this recipe in progress: the main action opens it; another start is explicit. */
  readonly activeBakeId?: string;
  readonly onOpenBake: (bakeId: string) => void;
  /** Whether authored steps are editable or read-only projection/consultation (#67). */
  readonly editable?: boolean;
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

/** Default step a "ready by" time refers to: the bake when there is one, else the last step. */
const defaultTarget = (process: Process): ProcessStep | undefined =>
  process.steps.find((s) => s.operation === 'bake') ?? process.steps.at(-1);

interface Planned {
  readonly step: ProcessStep;
  readonly planned?: ProjectedStep;
}

/** Process tab of the #8 mockups: plan by start or ready time, steps grouped by day. */
export const ProcessSection = ({
  process,
  onDurationChange,
  onProcessChange,
  preparationIds,
  canStart,
  onStart,
  activeBakeId,
  onOpenBake,
  editable = true,
}: Props) => {
  const { t, error, stepName, locale } = useMessages();
  const temperature = useTemperature();
  const services = useServices();
  const [modeKind, setModeKind] = useState<ProjectionMode['kind']>('startAt');
  const [fromNow, setFromNow] = useState(true);
  const [now, setNow] = useState(() => services.clock.now());
  const [when, setWhen] = useState(() => toLocalInput(nextQuarterHour()));
  const followsClock = modeKind === 'startAt' && fromNow;
  useEffect(() => {
    if (!followsClock) return;
    setNow(services.clock.now());
    const timer = setInterval(() => setNow(services.clock.now()), 15_000);
    return () => clearInterval(timer);
  }, [followsClock, services]);
  const [targetId, setTargetId] = useState(() => defaultTarget(process)?.id);
  const [editing, setEditing] = useState<string>();
  const target = process.steps.find((s) => s.id === targetId) ?? defaultTarget(process);

  const mode: ProjectionMode = useMemo(() => {
    const at = followsClock ? now : fromLocalInput(when);
    return modeKind === 'readyBy' && target
      ? { kind: 'readyBy', at, target: target.id }
      : { kind: 'startAt', at };
  }, [modeKind, followsClock, now, when, target]);
  const projection = useMemo(() => projectProcess(process, { mode }), [process, mode]);

  const planned: Planned[] = process.steps
    .map((step) => {
      const p = projection.ok ? projection.value.steps[step.id] : undefined;
      return p === undefined ? { step } : { step, planned: p };
    })
    .sort(
      (a, b) =>
        (a.planned?.start ? Date.parse(a.planned.start) : Infinity) -
          (b.planned?.start ? Date.parse(b.planned.start) : Infinity) ||
        process.steps.indexOf(a.step) - process.steps.indexOf(b.step),
    );
  const days: { key: string; label: string; steps: Planned[] }[] = [];
  for (const item of planned) {
    const start = item.planned?.start;
    const key = start ? localDayKey(start) : 'unknown';
    const label = start ? formatDay(start, locale) : t('process.unknownDay');
    const day = days.find((d) => d.key === key);
    if (day) day.steps.push(item);
    else days.push({ key, label, steps: [item] });
  }

  const first = planned[0];
  const targetEnd = target && projection.ok ? projection.value.steps[target.id]?.end : undefined;
  const summary =
    modeKind === 'readyBy'
      ? first?.planned?.start &&
        t('process.summary.readyBy', {
          step: stepName(first.step),
          when: formatDayTime(first.planned.start, locale),
        })
      : target &&
        targetEnd &&
        t('process.summary.startAt', {
          step: stepName(target),
          when: formatDayTime(targetEnd, locale),
        });
  const nameOf = (id: string) => {
    const step = process.steps.find((s) => s.id === id);
    return step ? stepName(step) : id;
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Card>
        <span className="flex items-center gap-1.5 font-bold">
          {t('process.plan')}
          <InfoButton topic="startMode" term={t('process.plan')} />
        </span>
        <Segmented
          size="small"
          value={modeKind}
          options={[
            { value: 'startAt', label: t('process.mode.startAt') },
            { value: 'readyBy', label: t('process.mode.readyBy') },
          ]}
          onChange={setModeKind}
        />
        {modeKind === 'startAt' && (
          <div className="flex items-center justify-between gap-3">
            <span>{t('process.when.startAt')}</span>
            <Segmented
              size="small"
              value={fromNow ? 'now' : 'chosen'}
              options={[
                { value: 'now', label: t('process.when.now') },
                { value: 'chosen', label: t('process.when.chosen') },
              ]}
              onChange={(value) => setFromNow(value === 'now')}
            />
          </div>
        )}
        {!followsClock && (
          <label className="flex items-center justify-between gap-3">
            <span>
              {modeKind === 'readyBy' && target
                ? t('process.when.readyBy', { step: stepName(target) })
                : t('process.when.time')}
            </span>
            <input
              type="datetime-local"
              className="fp-field h-12 rounded-[10px] border-[1.5px] border-field bg-field-bg px-3 font-bold text-ink"
              value={when}
              onChange={(e) => e.target.value && setWhen(e.target.value)}
            />
          </label>
        )}
        {modeKind === 'readyBy' && (
          <label className="flex items-center justify-between gap-3">
            <span>{t('process.target')}</span>
            <select
              className="fp-field h-12 max-w-[60%] rounded-[10px] border-[1.5px] border-field bg-field-bg px-3 text-ink"
              value={target?.id}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {process.steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {stepName(s)}
                </option>
              ))}
            </select>
          </label>
        )}
        {!projection.ok && (
          <p role="alert" className="m-0 text-alert">
            {error(projection.error)}
          </p>
        )}
        {summary && (
          <div className="flex items-center gap-2.5 border-t border-line pt-3">
            <ClockIcon />
            <span>{summary}</span>
          </div>
        )}
      </Card>

      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-2">
          <SectionTitle>{day.label}</SectionTitle>
          <Rows>
            {day.steps.map(({ step, planned: p }) => {
              const hints = [
                ...(step.dependsOn.length > 0
                  ? [t('process.after', { steps: step.dependsOn.map(nameOf).join(', ') })]
                  : []),
                ...(p && p.unknownAfter.length > 0
                  ? [t('process.unknown', { steps: p.unknownAfter.map(nameOf).join(', ') })]
                  : []),
              ];
              return (
                <div
                  key={step.id}
                  className="grid min-h-16 grid-cols-[52px_1fr_104px] items-center gap-2.5 px-3 py-2"
                >
                  <span className="font-bold">{p?.start ? formatTime(p.start, locale) : '—'}</span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    {editable ? (
                      <button
                        type="button"
                        className="fp-reset min-h-8 text-left font-semibold text-accent-text"
                        aria-label={t('process.editStep', { step: stepName(step) })}
                        onClick={() => setEditing(step.id)}
                      >
                        {stepName(step)}
                      </button>
                    ) : (
                      <span className="min-h-8 py-1 font-semibold text-ink">{stepName(step)}</span>
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
                            ? temperature.format(
                                step.conditions.temperatureC,
                                temperatureContext(step),
                              )
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
                  {editable ? (
                    <DurationField
                      label={t('process.duration', { step: stepName(step) })}
                      value={step.plannedDurationS}
                      optional={step.schedule !== 'alap'}
                      onCommit={(seconds) => onDurationChange(step.id, seconds)}
                    />
                  ) : (
                    <span className="text-right font-medium text-ink">
                      {step.plannedDurationS !== undefined
                        ? formatDuration(step.plannedDurationS)
                        : '—'}
                    </span>
                  )}
                </div>
              );
            })}
          </Rows>
        </section>
      ))}

      {editable && (
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

      {editable && (
        <StepSheet
          open={editing !== undefined}
          step={process.steps.find((s) => s.id === editing)}
          process={process}
          preparation={editing !== undefined && preparationIds.includes(editing)}
          onChange={onProcessChange}
          onClose={() => setEditing(undefined)}
        />
      )}

      {!canStart && <p className="m-0 px-1 text-sm text-muted">{t('process.saveFirst')}</p>}
      {canStart && !followsClock && (
        <p className="m-0 px-1 text-sm text-muted">{t('process.startsNow')}</p>
      )}
      {activeBakeId && (
        <>
          <IonButton expand="block" size="large" onClick={() => onOpenBake(activeBakeId)}>
            {t('process.openBake')}
          </IonButton>
          <IonButton fill="clear" disabled={!canStart || !projection.ok} onClick={onStart}>
            {t('process.startAnother')}
          </IonButton>
        </>
      )}
    </div>
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

const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-accent-text)"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

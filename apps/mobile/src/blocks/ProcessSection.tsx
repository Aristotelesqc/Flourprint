import { IonButton } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import {
  anchorTimeline,
  projectProcess,
  relativeTimeline,
  temperatureContext,
  type Formula,
  type Instant,
  type Process,
  type ProjectedStep,
  type ProcessStep,
  type ProjectionMode,
  type StepTiming,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { formatDay, formatDayTime, formatDuration, formatTime, localDayKey } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { InfoButton } from '../ui/InfoButton';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { Ui } from '../ui/library';
import { Segmented } from '../ui/Segmented';
import { PlanningWindows } from './PlanningWindows';
import { RecipeOutcome } from './RecipeOutcome';
import { StepEquipmentDetails } from './StepEquipmentDetails';
import { techniqueSummary } from './StepSheet';
import { isImmediatelyPreceding } from './RecipeMethod';

interface Props {
  readonly formula: Formula;
  readonly process: Process;
  /** False while the recipe has unsaved changes: a bake starts from a saved revision. */
  readonly canStart: boolean;
  /** Starts another bake from the moment of the tap, whatever time the planner shows. */
  readonly onStart: () => void;
  /** A bake of this recipe in progress: the main action opens it; another start is explicit. */
  readonly activeBakeId?: string;
  readonly onOpenBake: (bakeId: string) => void;
  /** The Recipe page supplies the single primary action and its overflow alternatives. */
  readonly showActions?: boolean;
  /** Show the save-first hint when `canStart` is false (non-trashed RecipePage drafts/invalid state). */
  readonly showSaveHint?: boolean;
}

type StartSource = 'relative' | 'now' | 'chosen';

/** `datetime-local` value (local time, minutes) → UTC instant when valid. */
const parseLocalInput = (value: string): Instant | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : (date.toISOString() as Instant);
};

/** Default step a "ready by" time refers to: the bake when there is one, else the last step. */
const defaultTarget = (process: Process): ProcessStep | undefined =>
  process.steps.find((s) => s.operation === 'bake') ?? process.steps.at(-1);

interface Planned {
  readonly step: ProcessStep;
  readonly index: number;
  readonly sortAt: number;
  readonly planned?: ProjectedStep;
  readonly relative?: StepTiming;
}

const formatStepTimeRange = (
  planned: ProjectedStep | undefined,
  locale: string,
): { readonly text: string; readonly wrap: boolean } => {
  const start = planned?.start;
  const end = planned?.end;
  if (start === undefined) {
    return { text: end === undefined ? '—' : `— – ${formatTime(end, locale)}`, wrap: false };
  }
  const startTime = formatTime(start, locale);
  if (end === undefined) {
    return { text: `${startTime} – —`, wrap: false };
  }
  const overnight = localDayKey(start) !== localDayKey(end);
  return {
    text: overnight
      ? `${startTime} – ${formatDayTime(end, locale)}`
      : `${startTime}–${formatTime(end, locale)}`,
    wrap: overnight,
  };
};

const formatRelativeTimeRange = (
  stepTiming: StepTiming | undefined,
): { readonly text: string; readonly wrap: boolean } => {
  if (stepTiming?.timing.status !== 'known') {
    return { text: '—', wrap: false };
  }
  return {
    text: `+${formatDuration(stepTiming.timing.startS)} – +${formatDuration(stepTiming.timing.endS)}`,
    wrap: true,
  };
};

/** Planning tab (#71, #170): read-only timeline with relative, clock-anchored and target controls. */
export const ProcessSection = ({
  formula,
  process,
  canStart,
  onStart,
  activeBakeId,
  onOpenBake,
  showActions = true,
  showSaveHint = false,
}: Props) => {
  const { t, error, stepName, stepInstructions, locale } = useMessages();
  const temperature = useTemperature();
  const formatOven = (celsius: number) => temperature.format(celsius, 'oven');
  const services = useServices();
  const [modeKind, setModeKind] = useState<ProjectionMode['kind']>('startAt');
  const [startSource, setStartSource] = useState<StartSource>('relative');
  const [now, setNow] = useState(() => services.clock.now());
  const [when, setWhen] = useState('');
  const [scheduleDetailsOpen, setScheduleDetailsOpen] = useState(false);
  const followsClock = modeKind === 'startAt' && startSource === 'now';
  useEffect(() => {
    if (!followsClock) return;
    setNow(services.clock.now());
    const timer = setInterval(() => setNow(services.clock.now()), 15_000);
    return () => clearInterval(timer);
  }, [followsClock, services]);
  const [targetId, setTargetId] = useState(() => defaultTarget(process)?.id);
  const target = process.steps.find((s) => s.id === targetId) ?? defaultTarget(process);

  const chosenInstant = useMemo(() => parseLocalInput(when), [when]);
  const mode: ProjectionMode | undefined = useMemo(() => {
    if (modeKind === 'readyBy') {
      return chosenInstant && target
        ? { kind: 'readyBy', at: chosenInstant, target: target.id }
        : undefined;
    }
    if (startSource === 'now') {
      return { kind: 'startAt', at: now };
    }
    if (startSource === 'chosen' && chosenInstant) {
      return { kind: 'startAt', at: chosenInstant };
    }
    return undefined;
  }, [modeKind, startSource, now, chosenInstant, target]);
  const timeline = useMemo(
    () =>
      relativeTimeline(process, {
        components: new Set(formula.components.map((component) => component.id)),
      }),
    [process, formula.components],
  );
  const timingById = useMemo(
    () =>
      new Map<ProcessStep['id'], StepTiming>(
        timeline.ok ? timeline.value.steps.map((s) => [s.stepId, s]) : [],
      ),
    [timeline],
  );
  const projection = useMemo(
    () => (mode ? projectProcess(process, { mode }) : undefined),
    [process, mode],
  );
  const anchored = useMemo(
    () =>
      timeline.ok && mode && projection?.ok ? anchorTimeline(timeline.value, mode) : undefined,
    [timeline, mode, projection],
  );
  const activeResult = projection ?? timeline;

  const planned: Planned[] = process.steps
    .map((step, index) => {
      const p = projection?.ok ? projection.value.steps[step.id] : undefined;
      const r = projection ? undefined : timingById.get(step.id);
      const sortAt = projection
        ? p?.start
          ? Date.parse(p.start)
          : Infinity
        : r?.timing.status === 'known'
          ? r.timing.startS
          : Infinity;
      return {
        step,
        index,
        sortAt,
        ...(p === undefined ? {} : { planned: p }),
        ...(r === undefined ? {} : { relative: r }),
      };
    })
    .sort((a, b) => a.sortAt - b.sortAt || a.index - b.index);
  const groups: { key: string; label: string; steps: Planned[] }[] = [];
  if (projection) {
    for (const item of planned) {
      const start = item.planned?.start;
      const key = start ? localDayKey(start) : 'unknown';
      const label = start ? formatDay(start, locale) : t('process.unknownDay');
      const group = groups.find((d) => d.key === key);
      if (group) group.steps.push(item);
      else groups.push({ key, label, steps: [item] });
    }
  } else if (planned.length > 0) {
    groups.push({ key: 'relative', label: t('process.fromStart'), steps: planned });
  }

  const first = planned[0];
  const targetEnd = target && projection?.ok ? projection.value.steps[target.id]?.end : undefined;
  const summary = projection?.ok
    ? modeKind === 'readyBy'
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
        })
    : undefined;
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('process.when.startAt')}</span>
            <Segmented
              size="small"
              value={startSource}
              options={[
                { value: 'relative', label: t('process.when.relative') },
                { value: 'now', label: t('process.when.now') },
                { value: 'chosen', label: t('process.when.chosen') },
              ]}
              onChange={setStartSource}
            />
          </div>
        )}
        {((modeKind === 'startAt' && startSource === 'chosen') || modeKind === 'readyBy') && (
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              {modeKind === 'readyBy' && target
                ? t('process.when.readyBy', { step: stepName(target) })
                : t('process.when.time')}
            </span>
            <input
              type="datetime-local"
              className="fp-field h-12 w-full min-w-0 max-w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-3 font-bold text-ink sm:w-auto"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>
        )}
        {modeKind === 'readyBy' && (
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('process.target')}</span>
            <select
              className="fp-field h-12 w-full min-w-0 max-w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-3 text-ink sm:w-auto sm:max-w-[60%]"
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
        {!activeResult.ok && (
          <p role="alert" className="m-0 text-alert">
            {error(activeResult.error)}
          </p>
        )}
        {summary && (
          <div className="flex items-center gap-2.5 border-t border-line pt-3">
            <ClockIcon />
            <span>{summary}</span>
          </div>
        )}
      </Card>

      {timeline.ok &&
        timeline.value.steps.length > 0 &&
        (!mode || (projection?.ok && anchored?.ok)) && (
          <PlanningWindows
            formula={formula}
            process={process}
            timeline={timeline.value}
            {...(anchored?.ok ? { anchored: anchored.value } : {})}
          />
        )}

      {groups.length > 0 && (
        <Ui
          component="fp.disclosure"
          expanded={scheduleDetailsOpen}
          onExpandedChange={setScheduleDetailsOpen}
          label={t('process.scheduleDetails')}
        >
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <SectionTitle>{group.label}</SectionTitle>
                <Rows>
                  {group.steps.map(({ step, planned: p, relative: r }) => {
                    const isLinearPrev = isImmediatelyPreceding(step, process.steps);
                    const unknownAfter = projection
                      ? (p?.unknownAfter ?? [])
                      : r?.timing.status === 'unknown'
                        ? r.timing.unknownAfter
                        : [];
                    const hints = [
                      ...(step.dependsOn.length > 0 && !isLinearPrev
                        ? [t('process.after', { steps: step.dependsOn.map(nameOf).join(', ') })]
                        : []),
                      ...(unknownAfter.length > 0
                        ? [t('process.unknown', { steps: unknownAfter.map(nameOf).join(', ') })]
                        : []),
                    ];
                    const timeRange = projection
                      ? formatStepTimeRange(p, locale)
                      : formatRelativeTimeRange(r);
                    const durationText =
                      step.durationMode === 'model'
                        ? step.plannedDurationS !== undefined
                          ? `≈ ${formatDuration(step.plannedDurationS)}`
                          : t('fermentation.auto')
                        : step.plannedDurationS !== undefined
                          ? formatDuration(step.plannedDurationS)
                          : '—';
                    return (
                      <div
                        key={step.id}
                        data-testid={`planning-step-${step.id}`}
                        className="flex min-w-0 flex-col gap-2 border-b border-line/40 px-3 py-3 last:border-b-0"
                      >
                        <div
                          data-testid={`planning-step-time-${step.id}`}
                          className={`min-w-0 font-bold tabular-nums text-ink ${
                            timeRange.wrap ? 'whitespace-normal' : 'whitespace-nowrap'
                          }`}
                        >
                          {timeRange.text}
                        </div>
                        <div
                          data-testid={`planning-step-title-${step.id}`}
                          className="min-w-0 font-semibold text-ink"
                        >
                          {stepName(step)}
                        </div>
                        {step.technique && (
                          <span className="min-w-0 text-supporting text-ink">
                            {techniqueSummary(t, step.technique)}
                          </span>
                        )}
                        {stepInstructions(step, formatOven) && (
                          <span className="min-w-0 text-supporting text-muted">
                            {stepInstructions(step, formatOven)}
                          </span>
                        )}
                        <div
                          data-testid={`planning-step-duration-${step.id}`}
                          className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-supporting"
                        >
                          <span className="text-muted">{t('prep.duration')}</span>
                          <span className="font-medium tabular-nums text-ink">{durationText}</span>
                        </div>
                        {step.conditions && (
                          <span className="min-w-0 text-supporting text-muted">
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
                          <span className="text-supporting text-muted">
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
                    );
                  })}
                </Rows>
              </section>
            ))}
          </div>
        </Ui>
      )}

      <div className="pt-1">
        <RecipeOutcome process={process} editable={false} />
      </div>

      {!canStart && showSaveHint && (
        <p className="m-0 px-1 text-sm text-muted">{t('process.saveFirst')}</p>
      )}
      {canStart && mode !== undefined && !followsClock && (
        <p className="m-0 px-1 text-sm text-muted">{t('process.startsNow')}</p>
      )}
      {showActions && activeBakeId && (
        <>
          <IonButton expand="block" size="large" onClick={() => onOpenBake(activeBakeId)}>
            {t('process.openBake')}
          </IonButton>
          <IonButton fill="clear" disabled={!canStart || !activeResult.ok} onClick={onStart}>
            {t('process.startAnother')}
          </IonButton>
        </>
      )}
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

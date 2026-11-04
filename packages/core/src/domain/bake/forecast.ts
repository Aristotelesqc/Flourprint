import {
  CENTRAL,
  estimateLiveMass,
  FERMENTATION_MODEL,
  liveDoughMass,
  meanFromCoreC,
  progressPerHour,
  SELF_HEATING_K,
  simulate,
  type DoughMass,
  type EstimateOptions,
  type LiveUnit,
  type ReadinessProfile,
  type StepForecast,
  type ThermalStepLag,
} from '../fermentation/index.js';
import type { Instant } from '../instant.js';
import { doughContextOf, doughSteps, firstContactStep, isMixingStep } from '../process/dough.js';
import type { ProcessStep, StepId, StepThermal } from '../process/types.js';
import type { Estimate } from '../values.js';
import { implicitStartOf } from './decide.js';
import { heldSeconds } from './hold.js';
import { effectiveThermal, thermalSegments } from './thermal.js';
import type { BakeState, ProbePosition } from './types.js';

/**
 * Live recomputation of the dough forecast from the recorded facts of a Preparation
 * (docs/contracts/fermentation.md, Live recomputation and readiness cues; bake-session.md): the
 * forecast of every step that has not ended is computed from what was recorded, never from the
 * original plan. The accumulated progress is integrated over the recorded times with the recorded
 * temperatures and thermal inputs (`StepThermalChanged` opens a new segment), a `doughTemperature`
 * observation replaces the mean dough temperature from its instant, and what remains is projected
 * from the state the dough has now. Derived and never stored; `evolve` stays structural.
 *
 * Where the facts leave a gap (a step recorded as started after the previous one ended), the dough
 * stays in the conditions of the previous step. A step started while the previous one was never
 * completed ends the previous one at that start.
 */

export interface LiveForecastOptions extends EstimateOptions {
  /** Overrides the readiness profile of the process (tests, comparisons). */
  readonly profile?: ReadinessProfile;
  /**
   * Also rebuild the path of a finished or abandoned session (calibration reads one). The live
   * forecast itself stays restricted to active sessions.
   */
  readonly includeEnded?: boolean;
}

export interface LiveDoughForecast {
  /** The step whose end point is forecast: the model-driven dough step, else the last one. */
  readonly stepId: StepId;
  /**
   * Seconds from `now` until the dough reaches the end point of that step, with its range over
   * the same corners as every estimate. The model's end is never the dough being ready: a
   * recorded `doughReady` observation prevails (fermentation.md).
   */
  readonly remaining: Estimate;
  /** Progress now, as a percentage of the planned fermentation (`F*`). */
  readonly progressNowPct: Estimate;
  /**
   * The end of every dough step: the recorded end of a step that ended, the projected end of the
   * others from the state of the dough now.
   */
  readonly steps: readonly StepForecast[];
}

const MS_PER_H = 3_600_000;

export interface Reading {
  readonly tempC: number;
  readonly position: ProbePosition;
  /** Hours since the thermal inputs in force began (the later of the step start and the last change). */
  readonly sinceTransitionH: number;
  /** Index of the stretch where those inputs began. */
  readonly transition: number;
  /** Stretch whose lag and ambient the reading was taken in, when it applies to a later one. */
  readonly lagUnit?: number;
}

/** One stretch of the dough's path with the facts that bear on it. */
export interface Stretch {
  readonly unit: LiveUnit;
  /** When the stretch begins, ms. */
  readonly fromMs: number;
  /** `recorded` and `gap` stretches are in the past; `remaining` ones are projected. */
  readonly kind: 'recorded' | 'gap' | 'remaining';
  /** The last stretch of its step: the end of the step. */
  readonly endsStep: boolean;
  readonly reading?: Reading;
}

/** The recorded `AdjustStep` of a step's temperature, in order of time. */
const temperatureChanges = (state: BakeState, stepId: StepId) =>
  state.overrides
    .flatMap((o) => {
      const p = o.payload;
      if ('derived' in p || p.target.kind !== 'step' || p.target.stepId !== stepId) return [];
      if (p.target.field !== 'temperatureC') return [];
      return [
        {
          atMs: Date.parse(o.occurredAt),
          baseline: p.baseline as number | null,
          effective: p.effective as number,
        },
      ];
    })
    .sort((a, b) => a.atMs - b.atMs);

/** The ambient of a step at an instant: the plan's, then every `AdjustStep` of the temperature. */
const ambientAt = (
  state: BakeState,
  step: ProcessStep,
  atMs: number,
  carried: number | undefined,
): number | undefined => {
  const changes = temperatureChanges(state, step.id);
  const applied = changes.filter((c) => c.atMs <= atMs).at(-1);
  if (applied !== undefined) return applied.effective;
  const first = changes[0];
  if (first !== undefined) return first.baseline ?? carried;
  return step.conditions?.temperatureC ?? carried;
};

/** A step with the thermal inputs in force, as the stretch of the path that carries it. */
const carrying = (step: ProcessStep, thermal: StepThermal | undefined): ProcessStep => {
  const { thermal: _planned, ...rest } = step;
  return thermal === undefined ? rest : { ...rest, thermal };
};

/** The dough's path rebuilt from the facts, and the mass it gives. */
export interface LiveContext {
  readonly steps: readonly ProcessStep[];
  readonly target: ProcessStep;
  readonly targetDone: boolean;
  readonly stretches: readonly Stretch[];
  readonly openIndex: number;
  readonly mass:
    | DoughMass
    | Extract<Estimate, { status: 'insufficient_data' | 'unsupported' | 'out_of_domain' }>;
  /**
   * Seconds until the dough clock starts, from `now`: what remains of the first-contact step,
   * which is not part of the dough path (0 once it is completed or when it has run past its plan).
   */
  readonly beforeClockS: number;
}

export const liveContext = (
  state: BakeState,
  now: Instant,
  options: LiveForecastOptions = {},
): LiveContext | undefined => {
  const { formula, process } = state;
  const live =
    state.status === 'active' || (options.includeEnded === true && state.status !== 'notStarted');
  if (!live || !formula || !process) return undefined;
  const context = doughContextOf(formula);
  const steps = doughSteps(process, context) ?? [];
  if (steps.length === 0) return undefined;
  const nowMs = Date.parse(now);
  // The model solves a fermentation step, never a mixing one (fermentation.md).
  const lastFermenting = steps.findLastIndex((s) => !isMixingStep(s));
  if (lastFermenting < 0) return undefined;
  const driven = steps.findIndex((s) => s.durationMode === 'model' && !isMixingStep(s));
  const target = steps[driven < 0 ? lastFermenting : driven] as ProcessStep;
  const targetDone = state.steps[target.id]?.endedAt !== undefined;

  const stretches: Stretch[] = [];
  const unplanned: StepId[] = [];
  const afterEnd: { after: number; reading: Reading }[] = [];
  // The dough clock starts at the END of the first-contact step (process.md, First contact): the
  // instant the baker completed it, else (never completed) the start of the first dough step
  // recorded as started. The step is not part of the path; the dough starts in its conditions.
  const contact = firstContactStep(process, context);
  const contactRecord = contact === undefined ? undefined : state.steps[contact.id];
  const firstDoughStart = steps
    .map((s) => state.steps[s.id]?.startedAt)
    .find((at): at is Instant => at !== undefined);
  const contactEndAt = contactRecord?.endedAt ?? firstDoughStart;
  const contactEndMs = contactEndAt === undefined ? Number.NaN : Date.parse(contactEndAt);
  const contactDone = contactEndMs <= nowMs;
  let carried: number | undefined =
    contact === undefined
      ? undefined
      : contactDone
        ? ambientAt(state, contact, contactEndMs, contact.conditions?.temperatureC)
        : contact.conditions?.temperatureC;
  // The end of the step before, if it ended, and where its last stretch is (the first-contact
  // step has none: the dough stays in its conditions until the first dough step starts).
  let before:
    { readonly endMs: number; readonly index?: number; readonly unit?: LiveUnit } | undefined =
    contact !== undefined && contactDone && carried !== undefined
      ? { endMs: contactEndMs, unit: { step: carrying(contact, undefined), ambientC: carried } }
      : undefined;
  // What remains of the first-contact step before the clock starts.
  let beforeClockS = 0;
  if (contact !== undefined && !contactDone) {
    const planned = contact.plannedDurationS;
    const startedMs =
      contactRecord?.startedAt === undefined ? undefined : Date.parse(contactRecord.startedAt);
    beforeClockS =
      planned === undefined
        ? 0
        : startedMs === undefined
          ? planned
          : Math.max(0, planned + heldSeconds(contactRecord, now) - (nowMs - startedMs) / 1000);
  }

  for (const [position, step] of steps.entries()) {
    const record = state.steps[step.id];
    const startAt = record?.startedAt ?? implicitStartOf(state, step.id);
    const startMs = startAt === undefined ? undefined : Date.parse(startAt);
    const nextStart = steps.slice(position + 1).flatMap((s) => {
      const at = state.steps[s.id]?.startedAt;
      return at === undefined ? [] : [Date.parse(at)];
    })[0];
    // A step the baker never completed ends when the next one starts.
    const endMs = record?.endedAt === undefined ? nextStart : Date.parse(record.endedAt);
    const planned = step.plannedDurationS;
    const ambient0 = ambientAt(state, step, startMs ?? nowMs, carried);
    if (ambient0 === undefined) return undefined;

    if (before !== undefined && startMs !== undefined && startMs > before.endMs) {
      // The dough stays where it was between the end of the previous step (the first-contact
      // step for the first dough step) and this start.
      const lastUnit = (
        before.index === undefined ? before.unit : stretches[before.index]?.unit
      ) as LiveUnit;
      stretches.push({
        unit: { ...lastUnit, hours: (startMs - before.endMs) / MS_PER_H },
        fromMs: before.endMs,
        kind: 'gap',
        endsStep: false,
      });
    }

    if (startMs === undefined) {
      // Not started: the plan.
      if (planned === undefined && step !== target) unplanned.push(step.id);
      stretches.push({
        unit: {
          step: carrying(step, effectiveThermal(state, step.id)),
          ...(planned === undefined
            ? step === target
              ? {}
              : { hours: 0 }
            : { hours: planned / 3600 }),
          ambientC: ambient0,
        },
        fromMs: nowMs,
        kind: 'remaining',
        endsStep: true,
      });
    } else {
      // Recorded: from the start to the end, or to now; cut where the thermal inputs, the
      // ambient or a reading change.
      const stopMs = Math.max(startMs, Math.min(endMs ?? nowMs, nowMs));
      const segments =
        record?.startedAt === undefined
          ? [{ from: startAt as Instant, thermal: effectiveThermal(state, step.id) }]
          : thermalSegments(state, step.id);
      const readings = state.observations.flatMap((o) => {
        const p = o.payload;
        return p.kind === 'doughTemperature' &&
          p.stepId === step.id &&
          p.measurement !== undefined &&
          p.position !== undefined
          ? [
              {
                atMs: Date.parse(p.measurement.observedAt),
                tempC: p.measurement.value,
                position: p.position,
              },
            ]
          : [];
      });
      const clamp = (ms: number) => Math.min(Math.max(ms, startMs), stopMs);
      const cuts = new Set<number>([startMs, stopMs]);
      for (const s of segments) cuts.add(clamp(Date.parse(s.from)));
      for (const c of temperatureChanges(state, step.id)) cuts.add(clamp(c.atMs));
      for (const r of readings) cuts.add(clamp(r.atMs));
      const bounds = [...cuts].sort((a, b) => a - b);
      const stretchAt = new Map<number, number>();
      const readingAt = (
        ms: number,
        transitionMs: number,
        transition: number,
      ): Reading | undefined => {
        const r = readings.filter((x) => clamp(x.atMs) === ms).at(-1);
        return r === undefined
          ? undefined
          : {
              tempC: r.tempC,
              position: r.position,
              sinceTransitionH: (ms - transitionMs) / MS_PER_H,
              transition,
            };
      };
      const inForce = (ms: number) =>
        [...segments].reverse().find((s) => clamp(Date.parse(s.from)) <= ms) ?? segments[0];
      let pushed = 0;
      for (const [i, from] of bounds.entries()) {
        const to = bounds[i + 1];
        const segment = inForce(from);
        const transitionMs = segment === undefined ? startMs : clamp(Date.parse(segment.from));
        stretchAt.set(from, stretches.length);
        if (to === undefined || to <= from) continue;
        const reading = readingAt(
          from,
          transitionMs,
          stretchAt.get(transitionMs) ?? stretches.length,
        );
        stretches.push({
          unit: {
            step: carrying(step, segment?.thermal),
            hours: (to - from) / MS_PER_H,
            ambientC: ambientAt(state, step, from, carried) ?? ambient0,
          },
          fromMs: from,
          kind: 'recorded',
          endsStep: false,
          ...(reading === undefined ? {} : { reading }),
        });
        pushed++;
      }
      if (pushed === 0) {
        // No time has elapsed in the step yet: it starts here.
        stretches.push({
          unit: {
            step: carrying(step, effectiveThermal(state, step.id)),
            hours: 0,
            ambientC: ambient0,
          },
          fromMs: startMs,
          kind: 'recorded',
          endsStep: false,
        });
      }
      if (endMs !== undefined && endMs <= nowMs) {
        const last = stretches.pop() as Stretch;
        stretches.push({ ...last, endsStep: true });
        // A reading taken at the very end of the step applies from the next stretch (below).
        const closing = inForce(stopMs);
        const closingMs = closing === undefined ? startMs : clamp(Date.parse(closing.from));
        const atEnd = readingAt(
          stopMs,
          closingMs,
          stretchAt.get(closingMs) ?? stretches.length - 1,
        );
        if (atEnd !== undefined) {
          afterEnd.push({
            after: stretches.length - 1,
            reading: { ...atEnd, lagUnit: stretches.length - 1 },
          });
        }
      } else {
        // What remains of a running step's countdown, holds included.
        const elapsedS = (stopMs - startMs) / 1000;
        const remainingS =
          planned === undefined
            ? undefined
            : Math.max(0, planned + heldSeconds(record, now) - elapsedS);
        if (planned === undefined && step !== target) unplanned.push(step.id);
        const segment = inForce(stopMs);
        const transitionMs = segment === undefined ? startMs : clamp(Date.parse(segment.from));
        const reading = readingAt(
          stopMs,
          transitionMs,
          stretchAt.get(transitionMs) ?? stretches.length,
        );
        stretches.push({
          unit: {
            step: carrying(step, effectiveThermal(state, step.id)),
            ...(remainingS === undefined
              ? step === target
                ? {}
                : { hours: 0 }
              : { hours: remainingS / 3600 }),
            ambientC: ambientAt(state, step, nowMs, carried) ?? ambient0,
          },
          fromMs: stopMs,
          kind: 'remaining',
          endsStep: true,
          ...(reading === undefined ? {} : { reading }),
        });
      }
    }
    const last = stretches.at(-1) as Stretch;
    carried = last.unit.ambientC;
    before =
      endMs !== undefined && endMs <= nowMs ? { endMs, index: stretches.length - 1 } : undefined;
  }

  for (const { after, reading } of afterEnd) {
    const next = stretches[after + 1];
    if (next !== undefined && next.reading === undefined)
      stretches[after + 1] = { ...next, reading };
  }

  // The stretch the model solves: the remainder of the target step, or, when that step ended,
  // the last one (its answer is replaced below).
  const openIndex = targetDone
    ? stretches.length - 1
    : stretches.findIndex((s) => s.unit.step.id === target.id && s.kind === 'remaining');
  if (openIndex < 0) return undefined;
  const plan = { units: stretches.map((s) => s.unit), openIndex, unplanned };
  const built = liveDoughMass(formula, process, options.profile, options, plan);
  return {
    steps,
    target,
    targetDone,
    stretches,
    openIndex,
    mass: 'status' in built ? built : withReadings(built, stretches),
    beforeClockS,
  };
};

/**
 * The forecast of the dough at `now`, or `undefined` when the session is not active or has no
 * dough step to forecast. `options.massG` overrides the mass the formula resolves to.
 */
export const liveDoughForecast = (
  state: BakeState,
  now: Instant,
  options: LiveForecastOptions = {},
): LiveDoughForecast | undefined => {
  const context = liveContext(state, now, { ...options, includeEnded: false });
  if (context === undefined) return undefined;
  const { steps, target, targetDone, stretches, openIndex, mass, beforeClockS } = context;
  if ('status' in mass) {
    return {
      stepId: target.id,
      remaining: mass,
      progressNowPct: mass,
      steps: steps.map((s) => ({ stepId: s.id, endProgressPct: mass, endTemperatureC: mass })),
    };
  }
  const estimates = estimateLiveMass(mass);
  const forecasts = estimates.steps ?? [];

  // The end of each step is its last stretch; the state now is the end of the last stretch that
  // is in the past.
  const endForecasts = steps.map((s): StepForecast => {
    const index = stretches.findIndex((x) => x.endsStep && x.unit.step.id === s.id);
    const found = forecasts[index];
    return (
      found ?? {
        stepId: s.id,
        endProgressPct: estimates.progressPct,
        endTemperatureC: estimates.progressPct,
      }
    );
  });
  const lastPast = stretches.map((s) => s.kind !== 'remaining').lastIndexOf(true);
  const atNow = lastPast < 0 ? undefined : forecasts[lastPast];
  const progressNowPct: Estimate = atNow?.endProgressPct ?? noProgressYet(estimates.progressPct);

  // Time from now: the planned stretches between now and the one the model solves, then its answer.
  const beforeOpenS = stretches
    .slice(lastPast + 1, openIndex)
    .reduce((sum, s) => sum + (s.unit.hours ?? 0) * 3600, 0);
  const remaining: Estimate = targetDone
    ? { status: 'insufficient_data', model: FERMENTATION_MODEL, reason: 'target_step_ended' }
    : later(estimates.duration, beforeOpenS + beforeClockS);

  return { stepId: target.id, remaining, progressNowPct, steps: endForecasts };
};

/** An estimate moved later by a fixed number of seconds. */
const later = (estimate: Estimate, seconds: number): Estimate => {
  if (estimate.status !== 'ok' || seconds === 0) return estimate;
  const move = (bound: NonNullable<typeof estimate.range>[0]) =>
    bound.kind === 'finite' ? { kind: 'finite' as const, value: bound.value + seconds } : bound;
  return {
    ...estimate,
    value: estimate.value + seconds,
    ...(estimate.range === undefined
      ? {}
      : { range: [move(estimate.range[0]), move(estimate.range[1])] as const }),
  };
};

/**
 * Nothing has fermented yet (the clock starts at the end of the first-contact step): zero, with the
 * assumptions of the forecast when it has any. Zero holds whatever the open step leaves unknown.
 */
const noProgressYet = (like: Estimate): Estimate => ({
  status: 'ok',
  value: 0,
  model: like.model ?? FERMENTATION_MODEL,
  assumptions: like.status === 'ok' ? like.assumptions : [],
});

/**
 * Applies the measured dough temperatures: from its instant a reading replaces the model's mean
 * state (fermentation.md, Dough temperature). A core reading goes through `γ_core` when the step
 * has thermal inputs and it was taken at least 0.5 `τ_eff` after they began; any other reading is
 * taken as the mean and the estimate says why. The model state at each stretch comes from the
 * central path, walked in order.
 */
const withReadings = (mass: DoughMass, stretches: readonly Stretch[]): DoughMass => {
  if (!stretches.some((s) => s.reading !== undefined)) return mass;
  const lagOf = new Map<number, ThermalStepLag>((mass.thermal ?? []).map((l) => [l.unit, l]));
  const dose = mass.yeasts.reduce((sum, y) => sum + y.pct * CENTRAL.freshPerGram[y.form], 0);
  const notes = new Set<string>();
  const starts: number[] = [];
  let doughC = mass.startC;
  const segments = mass.segments.map((segment, index) => {
    const reading = stretches[index]?.reading;
    let reset: number | undefined;
    if (reading !== undefined) {
      // A reading taken at a step's end applies from the next stretch, with the lag it was taken in.
      const unit = reading.lagUnit ?? index;
      const lag = lagOf.get(unit);
      const ambientC = mass.segments[unit]?.ambientC ?? segment.ambientC;
      if (
        reading.position === 'core' &&
        lag !== undefined &&
        reading.sinceTransitionH >= 0.5 * lag.effectiveTauH.central
      ) {
        // The core is further from where the dough is heading than the mean (Core temperature).
        const equilibriumC =
          ambientC +
          SELF_HEATING_K.central *
            progressPerHour(CENTRAL, dose, doughC) *
            lag.effectiveTauH.central;
        reset = meanFromCoreC(
          starts[reading.transition] ?? doughC,
          equilibriumC,
          reading.tempC,
          lag.gammaCore,
        );
      } else {
        reset = reading.tempC;
        notes.add(
          reading.position !== 'core' || lag === undefined
            ? 'probe_position_unmodelled'
            : 'reading_in_transient',
        );
      }
      doughC = reset;
    }
    // The state a transition starts from is the one after any reading taken at its start.
    starts.push(doughC);
    const run = simulate(CENTRAL, {
      freshPct: dose,
      startC: doughC,
      segments: [{ ...segment, hours: segment.hours ?? 0 }],
    });
    if (run.kind === 'progress') doughC = run.ends[0]?.doughC ?? doughC;
    return reset === undefined ? segment : { ...segment, resetC: reset };
  });
  return { ...mass, segments, assumptions: [...new Set([...mass.assumptions, ...notes])] };
};

import type { Component, Formula, Ingredient, YeastForm } from '../formula/types.js';
import { resolveFormula } from '../formula/resolve.js';
import { ancestors, doughSteps } from '../process/dough.js';
import { phasesOf } from '../process/move.js';
import type { Process, ProcessStep, StepId } from '../process/types.js';
import { resolveThermal } from '../process/thermal.js';
import type { DoughPorosity } from '../process/types.js';
import type { Estimate, RangeBound } from '../values.js';
import {
  findReadinessProfile,
  MODEL_END_POINT,
  RIPE_TARGET,
  validReadinessTarget,
  type ReadinessProfile,
  type ReadinessRef,
  type ReadinessTarget,
} from './calibration.js';
import { SELF_HEATING_K, type SegmentLag } from './lag.js';
import {
  CENTRAL,
  CORNERS,
  DOMAIN,
  FERMENTATION_MODEL,
  type FermentationParameters,
} from './model.js';
import {
  HORIZON_S,
  simulate,
  solveDoseFactor,
  solveOpenSegment,
  type Segment,
  type SimulationResult,
} from './simulate.js';
import {
  BIOT_HIGH,
  porosityFromProgress,
  THERMAL_MODEL,
  thermalBand,
  type ThermalBand,
  type ThermalInputs,
} from './thermal.js';
import {
  personalCorrection,
  type PersonalCorrection,
  type ThermalKey,
  type ThermalProfile,
} from './thermal-profile.js';

/**
 * The state of the dough at the end of one dough step (fermentation.md, The band and the
 * envelope): progress as a percentage of the planned fermentation, and the mean temperature, each
 * with its range over the same corners as the other estimates. Computed, never persisted.
 */
export interface StepForecast {
  readonly stepId: StepId;
  readonly endProgressPct: Estimate;
  readonly endTemperatureC: Estimate;
}

/** Estimates of one fermenting mass (fermentation.md, Results). */
export interface MassEstimates {
  /**
   * The step whose duration is estimated: the model-driven dough step, else the last dough step;
   * the preferment step for a preferment.
   */
  readonly stepId?: StepId;
  /** Seconds the step needs to reach the end point, the other durations being as planned. */
  readonly duration: Estimate;
  /** Progress at the end of the planned schedule, in percent of the planned fermentation (`F*`). */
  readonly progressPct: Estimate;
  /** Baker's percentage of each yeast for the planned schedule, in the ingredient's own form. */
  readonly yeastPct: Readonly<Record<string, Estimate>>;
  /**
   * Dough only: the end of every dough step, in process order, so that the interface can show a
   * likely time and a range at each step (additive; a consumer may ignore it).
   */
  readonly steps?: readonly StepForecast[];
}

/** What the caller may add to an estimate (the application layer passes the mass, not the process). */
export interface EstimateOptions {
  /**
   * The fermenting mass in grams (fermentation.md, Mass). Default: the dough weight the formula
   * resolves to, minus declared losses.
   */
  readonly massG?: number;
  /** The personal thermal profile in force (its latest version); absent = every factor 1. */
  readonly thermalProfile?: ThermalProfile;
}

export interface FermentationEstimates {
  readonly dough: MassEstimates;
  readonly preferments: Readonly<Record<string, MassEstimates>>;
  /** Water temperature for the target dough temperature, °C; advanced mode only. */
  readonly waterTemperatureC?: Estimate;
}

type Failure = Exclude<Estimate, { status: 'ok' }>;

const failure = (
  status: Failure['status'],
  reason: string,
  missing?: readonly string[],
): Failure => ({
  status,
  model: FERMENTATION_MODEL,
  reason,
  ...(missing && missing.length > 0 ? { missing } : {}),
});

const failed = (
  f: Failure,
  yeastIds: readonly string[],
  stepIds?: readonly StepId[],
): MassEstimates => ({
  duration: f,
  progressPct: f,
  yeastPct: Object.fromEntries(yeastIds.map((id) => [id, f])),
  ...(stepIds === undefined
    ? {}
    : { steps: stepIds.map((stepId) => ({ stepId, endProgressPct: f, endTemperatureC: f })) }),
});

/** One yeast source of a mass: its baker's percentage relative to that mass's flour. */
interface Yeast {
  readonly id: string;
  readonly form: YeastForm;
  readonly pct: number;
}

interface Mass {
  readonly stepId: StepId;
  readonly yeasts: readonly Yeast[];
  /** Converts a percentage of the mass's flour back to the unit the suggestion is given in. */
  readonly toSuggested: number;
  /** End point of this mass: the dough's readiness profile, or ripe for a preferment. */
  readonly calibration: ReadinessTarget;
  /** The readiness profile, named in the dough's estimates (fermentation.md). */
  readonly profile?: ReadinessRef;
  readonly startC: number;
  readonly segments: readonly Segment[];
  /** The step each segment belongs to (dough masses; one entry for a preferment). */
  readonly stepIds: readonly StepId[];
  /** A dough (its estimates list the end of every step), not a preferment. */
  readonly dough: boolean;
  /** The lag of each step that carries thermal inputs, as the estimate used it. */
  readonly thermal?: readonly ThermalStepLag[];
  /** Index in `segments` of the step whose duration is estimated. */
  readonly openIndex: number;
  readonly assumptions: readonly string[];
  readonly extrapolations: readonly string[];
  /** Ids of the other steps, without a planned duration (they count as 0). */
  readonly unplanned: readonly StepId[];
}

const freshPct = (p: FermentationParameters, yeasts: readonly Yeast[], factor = 1) =>
  yeasts.reduce((sum, y) => sum + y.pct * factor * p.freshPerGram[y.form], 0);

/** A bound of a band: a finite number, or a corner that never reaches the end point. */
const bound = (value: number): RangeBound =>
  Number.isFinite(value)
    ? { kind: 'finite', value }
    : { kind: 'beyondHorizon', horizonS: HORIZON_S };

/**
 * An estimate with the band over `values`. Only a duration can lie beyond the horizon; for any
 * other quantity an unbounded corner leaves the band out and says so (`band_unbounded`).
 */
const ok = (
  value: number,
  values: readonly number[],
  mass: Mass,
  options: { readonly assumptions?: readonly string[]; readonly duration?: boolean } = {},
): Estimate => {
  const assumptions = options.assumptions ?? mass.assumptions;
  // An ok estimate never holds a non-finite value (values-and-units.md).
  if (!Number.isFinite(value)) return failure('insufficient_data', 'non_finite_result');
  // NaN is a corner that failed (a runaway, the temperature gate): the band is left out. Infinity
  // is a corner that never reaches the end point, which only a duration can report.
  const all = [value, ...values.filter((v) => !Number.isNaN(v))];
  const unbounded =
    values.some(Number.isNaN) ||
    (options.duration !== true && all.some((v) => !Number.isFinite(v)));
  return {
    status: 'ok',
    value,
    ...(unbounded ? {} : { range: [bound(Math.min(...all)), bound(Math.max(...all))] as const }),
    model: FERMENTATION_MODEL,
    assumptions: unbounded ? [...assumptions, 'band_unbounded'] : assumptions,
    ...(mass.extrapolations.length > 0 ? { extrapolations: mass.extrapolations } : {}),
    ...(mass.profile
      ? { calibration: { id: mass.profile.id, version: mass.profile.version } }
      : {}),
  };
};

/** Every parameter corner combined with each end of the target's band. */
const corners = (mass: Mass) =>
  CORNERS.flatMap((p) => mass.calibration.band.map((target) => ({ p, target })));

const inDomain = (mass: Mass): Failure | undefined => {
  const dose = freshPct(CENTRAL, mass.yeasts);
  if (dose < DOMAIN.minFreshPct || dose > DOMAIN.maxFreshPct) {
    return failure('out_of_domain', 'dose_outside_domain');
  }
  const temperatures = [
    mass.startC,
    ...mass.segments.flatMap((s) =>
      s.resetC === undefined ? [s.ambientC] : [s.ambientC, s.resetC],
    ),
  ];
  if (temperatures.some((t) => t < DOMAIN.minDoughC || t > DOMAIN.maxDoughC)) {
    return failure('out_of_domain', 'temperature_outside_domain');
  }
  return undefined;
};

/** The open segment of a mass: its ambient and lag, without a duration. */
const openSegment = (s: Segment): Segment => ({
  ambientC: s.ambientC,
  ...(s.lag === undefined ? {} : { lag: s.lag }),
  ...(s.resetC === undefined ? {} : { resetC: s.resetC }),
});

const runaway = (reason: Extract<SimulationResult, { kind: 'unbounded' }>['reason']): Failure =>
  failure('out_of_domain', reason);

const estimateMass = (mass: Mass, options: { readonly dose?: boolean } = {}): MassEstimates => {
  const open = mass.segments.map((s, i) => (i === mass.openIndex ? openSegment(s) : s));
  const planned = mass.segments.every((s) => s.hours !== undefined);
  const yeastIds = mass.yeasts.map((y) => y.id);
  const domain = inDomain(mass);

  let duration: Estimate;
  if (domain) duration = domain;
  else {
    const run = (p: FermentationParameters, target: number) =>
      solveOpenSegment(p, {
        freshPct: freshPct(p, mass.yeasts),
        startC: mass.startC,
        segments: open,
        target,
      });
    const central = run(CENTRAL, mass.calibration.readyProgress);
    if (central.kind === 'unbounded') duration = runaway(central.reason);
    else if (central.kind !== 'remaining') {
      duration = failure('out_of_domain', 'end_point_not_reached');
    } else {
      const hours = corners(mass)
        .map(({ p, target }) => run(p, target))
        .map((r) => (r.kind === 'remaining' ? r.hours : r.kind === 'unbounded' ? NaN : Infinity));
      duration = ok(
        central.hours * 3600,
        hours.map((h) => h * 3600),
        mass,
        {
          duration: true,
          assumptions: central.reachedBefore
            ? [...mass.assumptions, 'end_point_before_last_step']
            : mass.assumptions,
        },
      );
    }
  }

  const missing = mass.segments[mass.openIndex]?.hours === undefined ? [mass.stepId] : [];

  // One simulation per parameter corner serves the progress at the end and the end of every step:
  // the planned schedule does not depend on the end point, only the percentage does.
  const knownLength = planned ? mass.segments.length : mass.openIndex;
  const known = mass.segments.slice(0, knownLength);
  const simulation = (p: FermentationParameters) =>
    simulate(p, { freshPct: freshPct(p, mass.yeasts), startC: mass.startC, segments: known });
  const centralRun = domain || known.length === 0 ? undefined : simulation(CENTRAL);
  const cornerRuns = centralRun === undefined ? [] : CORNERS.map(simulation);
  const targets = mass.calibration.band;
  const percent = (run: SimulationResult | undefined, target: number, at?: number) =>
    run?.kind === 'progress'
      ? (100 * (at === undefined ? run.progress : (run.ends[at]?.progress ?? NaN))) / target
      : NaN;

  let progressPct: Estimate;
  if (!planned) progressPct = failure('insufficient_data', 'duration_unknown', missing);
  else if (domain) progressPct = domain;
  else if (centralRun?.kind === 'unbounded') progressPct = runaway(centralRun.reason);
  else {
    progressPct = ok(
      percent(centralRun, mass.calibration.readyProgress),
      cornerRuns.flatMap((run) => targets.map((target) => percent(run, target))),
      mass,
    );
  }

  const stepForecasts: StepForecast[] = mass.segments.map((_, index) => {
    const stepId = mass.stepIds[index] as StepId;
    const none = (f: Failure): StepForecast => ({ stepId, endProgressPct: f, endTemperatureC: f });
    if (domain) return none(domain);
    if (index >= knownLength)
      return none(failure('insufficient_data', 'duration_unknown', missing));
    if (centralRun?.kind === 'unbounded') return none(runaway(centralRun.reason));
    const temperature = (run: SimulationResult | undefined) =>
      run?.kind === 'progress' ? (run.ends[index]?.doughC ?? NaN) : NaN;
    return {
      stepId,
      endProgressPct: ok(
        percent(centralRun, mass.calibration.readyProgress, index),
        cornerRuns.flatMap((run) => targets.map((target) => percent(run, target, index))),
        mass,
      ),
      endTemperatureC: ok(temperature(centralRun), cornerRuns.map(temperature), mass),
    };
  });

  const base: readonly Yeast[] = mass.yeasts.some((y) => y.pct > 0)
    ? mass.yeasts
    : mass.yeasts.map((y, i) => ({ ...y, pct: i === 0 ? 1 : 0 }));
  const yeastPct: Record<string, Estimate> = {};
  if (options.dose === false) {
    // Not asked (a live forecast keeps the dose of the recipe).
  } else if (!planned) {
    for (const id of yeastIds) {
      yeastPct[id] = failure('insufficient_data', 'duration_unknown', missing);
    }
  } else {
    const factor = (p: FermentationParameters, target: number) =>
      solveDoseFactor(p, {
        freshPct: freshPct(p, base),
        startC: mass.startC,
        segments: mass.segments,
        target,
      });
    const centralFactor = factor(CENTRAL, mass.calibration.readyProgress);
    const central = centralFactor.kind === 'factor' ? centralFactor.factor : undefined;
    const solvedDose = central === undefined ? undefined : freshPct(CENTRAL, base, central);
    const factors = corners(mass).map(({ p, target }) => factor(p, target));
    for (const yeast of base) {
      if (centralFactor.kind === 'unbounded' && !domain) {
        yeastPct[yeast.id] = runaway(centralFactor.reason);
        continue;
      }
      if (
        solvedDose === undefined ||
        solvedDose < DOMAIN.minFreshPct ||
        solvedDose > DOMAIN.maxFreshPct ||
        (domain && domain.reason !== 'dose_outside_domain')
      ) {
        yeastPct[yeast.id] = domain ?? failure('out_of_domain', 'dose_outside_domain');
        continue;
      }
      const scale = yeast.pct * mass.toSuggested;
      // The band is the full envelope; corners outside the dose domain are disclosed, not clipped.
      const outside = corners(mass).some(({ p }, i) => {
        const f = factors[i];
        if (f?.kind !== 'factor') return false;
        const dose = freshPct(p, base, f.factor);
        return dose < DOMAIN.minFreshPct || dose > DOMAIN.maxFreshPct;
      });
      yeastPct[yeast.id] = ok(
        (central ?? NaN) * scale,
        factors.map(
          (f) => (f.kind === 'factor' ? f.factor : f.kind === 'unbounded' ? NaN : Infinity) * scale,
        ),
        mass,
        outside ? { assumptions: [...mass.assumptions, 'band_outside_domain'] } : {},
      );
    }
  }

  return {
    stepId: mass.stepId,
    duration,
    progressPct,
    yeastPct,
    ...(mass.dough ? { steps: stepForecasts } : {}),
  };
};

const isYeast = (i: Ingredient): i is Ingredient & { yeast: { form: YeastForm } } =>
  i.yeast !== undefined && i.role === 'dough';

/** The segments of `steps`; a step without a duration counts as 0, but the open one stays open. */
const segmentsOf = (
  steps: readonly ProcessStep[],
  firstC: number,
  openIndex: number,
): { segments: Segment[]; unplanned: StepId[] } => {
  let ambientC = firstC;
  const unplanned: StepId[] = [];
  const segments = steps.map((step, index) => {
    ambientC = step.conditions?.temperatureC ?? ambientC;
    const open = index === openIndex;
    if (step.plannedDurationS === undefined && !open) unplanned.push(step.id);
    const hours =
      step.plannedDurationS === undefined ? (open ? undefined : 0) : step.plannedDurationS / 3600;
    return hours === undefined ? { ambientC } : { hours, ambientC };
  });
  return { segments, unplanned };
};

/**
 * The lag of one dough step that carries thermal inputs (fermentation.md, Dough thermal model),
 * as the estimate used it. Exposed so that an interface can show the lag and its band.
 */
export interface ThermalStepLag {
  readonly stepId: StepId;
  /** Index of the stretch of the dough's path this lag belongs to (the step's, in a plan). */
  readonly unit: number;
  /** The key of the personal factor: material, cover and environment. */
  readonly key: ThermalKey;
  /** The porosity class in force: the step's own, else derived from the progress at its start. */
  readonly porosity: DoughPorosity;
  /** Mass of the piece the step carries, grams. */
  readonly massG: number;
  /** `Bi_R`, `γ_core` and `τ_eff` at the central constants (no personal factor). */
  readonly biot: number;
  readonly gammaCore: number;
  readonly tauEffH: number;
  /** The thermal band of `τ_eff`, hours (no personal factor). */
  readonly bandH: { readonly low: number; readonly high: number };
  /** The personal factor in force (1 without one) and the band of the effective `τ`, hours. */
  readonly factor: number;
  readonly effectiveTauH: { readonly low: number; readonly central: number; readonly high: number };
  /** What the simulation reads. */
  readonly lag: SegmentLag;
  readonly assumptions: readonly string[];
  readonly cover: ThermalInputs['cover'];
}

const stepLag = (
  step: ProcessStep,
  unit: number,
  massG: number,
  porosity: DoughPorosity,
  profile: ThermalProfile | undefined,
): ThermalStepLag => {
  const resolved = resolveThermal(
    step.thermal as NonNullable<ProcessStep['thermal']>,
    step.conditions?.location,
  );
  const inputs: ThermalInputs = { ...resolved, porosity: resolved.porosity ?? porosity };
  const pieceG = massG / resolved.pieces;
  const band: ThermalBand = thermalBand(pieceG / 1000, inputs);
  const key: ThermalKey = {
    material: inputs.material,
    cover: inputs.cover,
    environment: inputs.environment,
  };
  const correction: PersonalCorrection = personalCorrection(
    profile,
    key,
    band.central.tauEffH,
    band.tauH,
  );
  return {
    stepId: step.id,
    unit,
    key,
    porosity: inputs.porosity,
    massG: pieceG,
    biot: band.central.bi,
    gammaCore: band.central.gammaCore,
    tauEffH: band.central.tauEffH,
    bandH: { low: band.tauH.low, high: band.tauH.high },
    factor: correction.factor,
    effectiveTauH: correction.tauH,
    lag: { tauH: correction.tauH, heatingK: SELF_HEATING_K },
    assumptions: correction.assumptions,
    cover: inputs.cover,
  };
};

interface ThermalContext {
  /** The fermenting mass in grams, if known. */
  readonly massG: number | undefined;
  readonly profile: ThermalProfile | undefined;
}

/** `F` at the start of every segment, central parameters (fermentation.md, porosity class). */
const progressAtStarts = (base: Mass, segments: readonly Segment[]): number[] | undefined => {
  const dose = freshPct(CENTRAL, base.yeasts);
  const target = base.calibration.readyProgress;
  const open = segments.map((s, i) => (i === base.openIndex ? openSegment(s) : s));
  let hours = segments[base.openIndex]?.hours;
  if (hours === undefined) {
    const solved = solveOpenSegment(CENTRAL, {
      freshPct: dose,
      startC: base.startC,
      segments: open,
      target,
    });
    hours = solved.kind === 'remaining' ? solved.hours : 0;
  }
  const planned = segments.map((s, i) =>
    i === base.openIndex ? { ...(open[i] as Segment), hours } : s,
  );
  const run = simulate(CENTRAL, { freshPct: dose, startC: base.startC, segments: planned });
  if (run.kind !== 'progress') return undefined;
  return segments.map((_, i) => (i === 0 ? 0 : (run.ends[i - 1]?.progress ?? 0)));
};

/**
 * Gives every step that carries thermal inputs its own lag (fermentation.md, Dough thermal
 * model), and the flags those inputs raise. The class of porosity of a step without one is
 * derived from the progress at its start, which depends on the lags of the steps before it: the
 * classes are settled in a few passes of the central path (they cannot change inside a step).
 */
const withThermal = (
  base: Mass,
  steps: readonly ProcessStep[],
  /** For each unit, the index of the first unit of its step: the class is fixed per step. */
  groups: readonly number[],
  context: ThermalContext,
): Mass | Failure => {
  const indexes = steps.flatMap((s, i) => (s.thermal === undefined ? [] : [i]));
  if (indexes.length === 0) return base;
  const { massG } = context;
  if (massG === undefined || !Number.isFinite(massG) || !(massG > 0)) {
    return failure('insufficient_data', 'thermal_mass_unknown');
  }
  const lagsFor = (porosities: readonly DoughPorosity[]) =>
    indexes.map((i) =>
      stepLag(steps[i] as ProcessStep, i, massG, porosities[i] as DoughPorosity, context.profile),
    );
  const withLags = (lags: readonly ThermalStepLag[]): Segment[] =>
    base.segments.map((s, i) => {
      const at = indexes.indexOf(i);
      return at < 0 ? s : { ...s, lag: (lags[at] as ThermalStepLag).lag };
    });
  let porosities: DoughPorosity[] = steps.map(() => 'unproofed');
  for (let pass = 0; pass < 3; pass++) {
    const starts = progressAtStarts(base, withLags(lagsFor(porosities)));
    if (starts === undefined) break;
    const next = steps.map(
      (s, i): DoughPorosity =>
        s.thermal?.porosity ??
        porosityFromProgress((starts[groups[i] ?? i] ?? 0) / base.calibration.readyProgress),
    );
    if (next.every((p, i) => p === porosities[i])) break;
    porosities = next;
  }
  const lags = lagsFor(porosities);
  const assumptions = [
    `thermal_model:${THERMAL_MODEL.version}`,
    ...lags.flatMap((l) => l.assumptions),
    ...(steps.some(
      (s) =>
        s.thermal !== undefined &&
        (resolveThermal(s.thermal, s.conditions?.location).environment === 'fridgeStatic' ||
          resolveThermal(s.thermal, s.conditions?.location).environment === 'fridgeVentilated'),
    )
      ? ['thermal_fridge_cycling']
      : []),
  ];
  const extrapolations = [
    ...(lags.some((l) => l.biot > BIOT_HIGH) ? ['thermal_biot_high'] : []),
    ...(lags.some((l) => l.cover === 'none') ? ['thermal_uncovered_evaporation'] : []),
    ...(base.extrapolations.some((e) => e === 'sugar_above_5pct' || e === 'fat_above_3pct')
      ? ['thermal_enriched_dough']
      : []),
  ];
  const unique = (list: readonly string[]) => [...new Set(list)];
  return {
    ...base,
    segments: withLags(lags),
    assumptions: unique([...base.assumptions, ...assumptions]),
    extrapolations: unique([...base.extrapolations, ...extrapolations]),
    thermal: lags,
  };
};

const doughExtrapolations = (formula: Formula): string[] | Failure => {
  const resolved = resolveFormula(formula);
  if (!resolved.ok) return failure('insufficient_data', 'formula_invalid');
  const r = resolved.value;
  const codes: string[] = [];
  if (formula.components.some((c) => c.kind === 'preferment' && c.flourPct > 0)) {
    codes.push('preferment');
  }
  const check = (
    name: string,
    balance: { completeness: string } | undefined,
    pct: number | undefined,
    outside: (pct: number) => boolean,
    code: string,
  ) => {
    if (!balance || balance.completeness !== 'complete' || pct === undefined) {
      codes.push(`${name}_unknown`);
    } else if (outside(pct)) codes.push(code);
  };
  check('sugar', r.totalSugar, r.totalSugarPct, (p) => p > 5, 'sugar_above_5pct');
  check('fat', r.totalFat, r.totalFatPct, (p) => p > 3, 'fat_above_3pct');
  const salt = formula.ingredients.find((i) => i.id === 'salt' && i.role === 'dough');
  if (!salt || salt.bakerPct < 1.5 || salt.bakerPct > 3) codes.push('salt_outside_1_5_to_3pct');
  check(
    'water',
    r.totalWater,
    r.totalWaterPct,
    (p) => p < 55 || p > 75,
    'water_outside_55_to_75pct',
  );
  return codes;
};

const unplannedAssumptions = (unplanned: readonly StepId[]) =>
  unplanned.map((id) => `step_without_duration:${id}`);

/**
 * The stage a dough is judged ready for on this step (bake-session.md): `bake` on the last dough
 * step, `shape` on an earlier one, none outside the dough steps.
 */
export const doughReadyStage = (process: Process, stepId: StepId): 'shape' | 'bake' | undefined => {
  const steps = doughSteps(process) ?? [];
  if (!steps.some((s) => s.id === stepId)) return undefined;
  return steps.at(-1)?.id === stepId ? 'bake' : 'shape';
};

/** The last step the dough ferments in before the first heat step, if the process has one. */
export const lastDoughStepId = (process: Process): StepId | undefined =>
  doughSteps(process)?.at(-1)?.id;

/** The room temperature the dough starts from: the mix's, else the first dough step's. */
const roomOf = (mix: ProcessStep, steps: readonly ProcessStep[]) =>
  mix.conditions?.temperatureC ??
  steps.find((s) => s.conditions?.temperatureC !== undefined)?.conditions?.temperatureC;

/**
 * The ambient each dough step is estimated at (fermentation.md, Dough temperature): its own
 * condition temperature, else the previous one's, starting from the room temperature. A step
 * without a known ambient is left out.
 */
export const doughStepAmbients = (process: Process): Readonly<Record<StepId, number>> => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  const steps = doughSteps(process) ?? [];
  if (!mix) return {};
  let ambientC = roomOf(mix, steps);
  const result: Record<StepId, number> = {};
  for (const step of steps) {
    ambientC = step.conditions?.temperatureC ?? ambientC;
    if (ambientC !== undefined) result[step.id] = ambientC;
  }
  return result;
};

/**
 * One stretch of the dough's path rebuilt from the recorded facts of a Preparation
 * (bake-session.md, Live recomputation): a part of a step during which its ambient and thermal
 * inputs did not change. `step` carries the thermal inputs in force; `hours` is absent for the one
 * stretch the model solves.
 */
export interface LiveUnit {
  readonly step: ProcessStep;
  readonly hours?: number;
  readonly ambientC: number;
}

/** The path of a dough from the recorded facts, in place of the plan's steps. */
export interface LivePlan {
  readonly units: readonly LiveUnit[];
  /** Index of the unit the model solves (the remainder of the model-driven or last step). */
  readonly openIndex: number;
  /** Steps still without a duration (they count as 0). */
  readonly unplanned: readonly StepId[];
}

const doughMass = (
  formula: Formula,
  process: Process,
  calibration: ReadinessProfile,
  defaulted: boolean,
  options: EstimateOptions,
  plan?: LivePlan,
): Mass | Failure => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return failure('insufficient_data', 'no_mix_step', ['mix']);
  const steps = doughSteps(process) ?? [];
  const last = steps.at(-1);
  if (!last) return failure('insufficient_data', 'no_fermentation_step');
  // The model solves one unknown: the model-driven step's time, else the last step's.
  const driven = steps.findIndex((s) => s.durationMode === 'model');
  const openIndex = driven < 0 ? steps.length - 1 : driven;
  const solved = steps[openIndex] as ProcessStep;
  // One dough, one timeline: each dough step must come after the previous one. Parallel dough
  // steps would be counted end to end, more time than really elapses (audit C2 of 15e52e3).
  const unordered = steps.filter((s, i) => {
    const previous = steps[i - 1];
    return previous !== undefined && !ancestors(process, s.id).has(previous.id);
  });
  if (unordered.length > 0) {
    return failure(
      'insufficient_data',
      'non_linear_dough_path',
      unordered.map((s) => s.id),
    );
  }
  const roomC = roomOf(mix, steps);
  if (roomC === undefined) {
    return failure('insufficient_data', 'temperature_unknown', [`${mix.id}.temperatureC`]);
  }
  const extrapolations = doughExtrapolations(formula);
  if (!Array.isArray(extrapolations)) return extrapolations;
  // The plan's steps, or the stretches of the recorded path (one unit per step in the plan).
  const units: readonly ProcessStep[] = plan ? plan.units.map((u) => u.step) : steps;
  const { segments, unplanned } = plan
    ? {
        segments: plan.units.map((u): Segment =>
          u.hours === undefined
            ? { ambientC: u.ambientC }
            : { hours: u.hours, ambientC: u.ambientC },
        ),
        unplanned: [...plan.unplanned],
      }
    : segmentsOf(steps, roomC, openIndex);
  const solvedId = plan ? (plan.units[plan.openIndex]?.step.id ?? solved.id) : solved.id;
  const target = mix.conditions?.doughTemperatureC;
  const resolved = resolveFormula(formula);
  const base: Mass = {
    stepId: solvedId,
    yeasts: formula.ingredients.filter(isYeast).map((i) => ({
      id: i.id,
      form: i.yeast.form,
      pct: i.bakerPct,
    })),
    toSuggested: 1,
    calibration,
    profile: calibration,
    startC: target ?? roomC,
    segments,
    stepIds: units.map((s) => s.id),
    dough: true,
    openIndex: plan ? plan.openIndex : openIndex,
    assumptions: [
      target === undefined ? 'dough_temperature_from_ambient' : 'dough_temperature_target',
      `ready_target_progress:${calibration.readyProgress}`,
      ...(defaulted ? ['readiness_default'] : []),
      ...unplannedAssumptions(unplanned),
    ],
    extrapolations,
    unplanned,
  };
  return withThermal(
    base,
    units,
    units.map((u) => units.findIndex((v) => v.id === u.id)),
    {
      massG: options.massG ?? (resolved.ok ? resolved.value.doughWeight : undefined),
      profile: options.thermalProfile,
    },
  );
};

const fermentingPhases = (
  process: Process,
  component: Component,
  components: ReadonlySet<string>,
): ProcessStep[] =>
  phasesOf(process, component.id, components).filter((s) => s.operation === 'preferment');

/** The last fermenting phase of a preferment, else its legacy step. */
const prefermentPhase = (
  process: Process,
  component: Component,
  components: ReadonlySet<string>,
): ProcessStep | undefined =>
  fermentingPhases(process, component, components).at(-1) ??
  process.steps.find((s) => s.id === component.id);

const prefermentMass = (
  formula: Formula,
  process: Process,
  component: Component,
): Mass | Failure => {
  // Fermenting phases of the component (process.md, Subjects and component phases).
  const components = new Set(formula.components.map((c) => c.id));
  const phases = fermentingPhases(process, component, components);
  if (phases.length > 1) {
    return failure(
      'insufficient_data',
      'component_phases_unmodelled',
      phases.map((s) => s.id),
    );
  }
  const step = phases[0] ?? process.steps.find((s) => s.id === component.id);
  if (!step) return failure('insufficient_data', 'no_preferment_step', [component.id]);
  const yeastForms = new Map(formula.ingredients.filter(isYeast).map((i) => [i.id, i.yeast.form]));
  const yeasts = (component.allocations ?? []).flatMap((a) => {
    const form = yeastForms.get(a.ingredient);
    // Allocations are percentages of total flour; the model wants the preferment's own flour.
    return form ? [{ id: a.ingredient, form, pct: (100 * a.bakerPct) / component.flourPct }] : [];
  });
  if (yeasts.length === 0) {
    return failure('insufficient_data', 'preferment_yeast_unknown', [`${component.id}.yeast`]);
  }
  const mix = process.steps.find((s) => s.operation === 'mix');
  const ambientC = step.conditions?.temperatureC ?? mix?.conditions?.temperatureC;
  if (ambientC === undefined) {
    return failure('insufficient_data', 'temperature_unknown', [`${step.id}.temperatureC`]);
  }
  return {
    stepId: step.id,
    yeasts,
    toSuggested: component.flourPct / 100,
    calibration: RIPE_TARGET,
    startC: ambientC,
    segments: [
      step.plannedDurationS === undefined
        ? { ambientC }
        : { hours: step.plannedDurationS / 3600, ambientC },
    ],
    stepIds: [step.id],
    dough: false,
    openIndex: 0,
    assumptions: [
      'dough_temperature_from_ambient',
      ...(step.conditions?.temperatureC === undefined ? ['preferment_at_room_temperature'] : []),
    ],
    extrapolations: ['preferment'],
    unplanned: [],
  };
};

/** The dough's mass with its readiness profile, or why there is none (fermentation.md). */
const doughOf = (
  formula: Formula,
  process: Process,
  override: ReadinessProfile | undefined,
  options: EstimateOptions,
  plan?: LivePlan,
): Mass | Failure => {
  const selected =
    override ?? (process.readiness ? findReadinessProfile(process.readiness) : MODEL_END_POINT);
  if (!selected) return failure('insufficient_data', 'readiness_profile_unknown', ['readiness']);
  if (!validReadinessTarget(selected)) return failure('unsupported', 'invalid_readiness_profile');
  return doughMass(
    formula,
    process,
    selected,
    override === undefined && !process.readiness,
    options,
    plan,
  );
};

/** The dough's mass for a live forecast (bake/forecast.ts): the recorded path in place of the plan. */
export type DoughMass = Mass;

export const liveDoughMass = (
  formula: Formula,
  process: Process,
  profile: ReadinessProfile | undefined,
  options: EstimateOptions,
  plan: LivePlan,
): DoughMass | Failure => doughOf(formula, process, profile, options, plan);

/** Estimates of a live dough mass; the dose is not solved (it makes no sense mid-bake). */
export const estimateLiveMass = (mass: DoughMass): MassEstimates =>
  estimateMass(mass, { dose: false });

/**
 * The lag of every dough step that carries thermal inputs, as the estimate uses it (central
 * `τ_eff`, its band, the personal factor, `Bi_R`, `γ_core`); empty when no step does. The
 * interface reads it to show the lag; the estimate itself is `estimateFermentation`.
 */
export const thermalStepLags = (
  formula: Formula,
  process: Process,
  profile?: ReadinessProfile,
  options: EstimateOptions = {},
): readonly ThermalStepLag[] | Failure => {
  const mass = doughOf(formula, process, profile, options);
  return 'status' in mass ? mass : (mass.thermal ?? []);
};

/** Base-temperature method (fermentation.md, Water temperature). */
const waterTemperature = (formula: Formula, process: Process): Estimate | undefined => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  const targetC = mix?.conditions?.doughTemperatureC;
  if (!mix || targetC === undefined) return undefined;
  const roomC = mix.conditions?.temperatureC;
  if (roomC === undefined) {
    return failure('insufficient_data', 'temperature_unknown', [`${mix.id}.temperatureC`]);
  }
  const preferments = formula.components.filter((c) => c.kind === 'preferment' && c.flourPct > 0);
  const assumptions: string[] = ['flour_at_room_temperature'];
  const components = new Set(formula.components.map((c) => c.id));
  const prefermentC = preferments.map((c) => {
    // The temperature of its last fermenting phase: the one it has when it joins the dough.
    const t = prefermentPhase(process, c, components)?.conditions?.temperatureC;
    if (t === undefined) assumptions.push('preferment_at_room_temperature');
    return t ?? roomC;
  });
  const frictionC = mix.conditions?.frictionC;
  if (frictionC === undefined) assumptions.push('friction_not_counted');
  const n = preferments.length > 0 ? 4 : 3;
  const baseC = n * targetC;
  const meanPrefermentC =
    prefermentC.length > 0 ? prefermentC.reduce((a, b) => a + b, 0) / prefermentC.length : 0;
  // Friction is heat the mixer adds: it lowers the water temperature.
  const value =
    baseC - roomC - roomC - (preferments.length > 0 ? meanPrefermentC : 0) - (frictionC ?? 0);
  if (value < 0) assumptions.push('water_below_0C');
  if (value > 60) assumptions.push('water_above_60C');
  return { status: 'ok', value, model: FERMENTATION_MODEL, assumptions };
};

/**
 * Provisional fermentation estimates of a recipe (docs/contracts/fermentation.md). Pure: never
 * changes the recipe; applying a suggestion is an explicit edit. The dough's end point is the
 * readiness profile the process selects (default: the model's own end point), apart from the
 * kinetic parameters; `profile` overrides it (tests, comparisons).
 */
export const estimateFermentation = (
  formula: Formula,
  process: Process,
  profile?: ReadinessProfile,
  options: EstimateOptions = {},
): FermentationEstimates => {
  const yeastIds = formula.ingredients.filter(isYeast).map((i) => i.id);
  const preferments = formula.components.filter((c) => c.kind === 'preferment' && c.flourPct > 0);
  const water = waterTemperature(formula, process);
  const withWater = water === undefined ? {} : { waterTemperatureC: water };
  const doughStepIds = (doughSteps(process) ?? []).map((s) => s.id);
  if (yeastIds.length === 0) {
    const none = failure('unsupported', 'no_commercial_yeast');
    return {
      dough: failed(none, [], doughStepIds),
      preferments: Object.fromEntries(preferments.map((c) => [c.id, failed(none, [])])),
      ...withWater,
    };
  }
  const estimate = (mass: Mass | Failure, ids: readonly string[], steps?: readonly StepId[]) =>
    'status' in mass ? failed(mass, ids, steps) : estimateMass(mass);
  const allocated = (c: Component) =>
    (c.allocations ?? []).map((a) => a.ingredient).filter((id) => yeastIds.includes(id));
  return {
    dough: estimate(doughOf(formula, process, profile, options), yeastIds, doughStepIds),
    preferments: Object.fromEntries(
      preferments.map((c) => [c.id, estimate(prefermentMass(formula, process, c), allocated(c))]),
    ),
    ...withWater,
  };
};

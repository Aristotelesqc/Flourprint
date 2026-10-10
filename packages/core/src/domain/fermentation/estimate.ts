import type { Component, Formula, Ingredient, YeastForm } from '../formula/types.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Process, ProcessStep, StepId } from '../process/types.js';
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
import {
  CENTRAL,
  CORNERS,
  DOMAIN,
  FERMENTATION_MODEL,
  type FermentationParameters,
} from './model.js';
import { HORIZON_S, simulate, solveDoseFactor, type Segment } from './simulate.js';

/** Estimates of one fermenting mass (fermentation.md, Results). */
export interface MassEstimates {
  /** The step whose duration is estimated: the last dough step, or the preferment step. */
  readonly stepId?: StepId;
  /** Seconds the step needs to reach the end point, the other durations being as planned. */
  readonly duration: Estimate;
  /** Progress at the end of the planned schedule, in percent of the planned fermentation (`F*`). */
  readonly progressPct: Estimate;
  /** Baker's percentage of each yeast for the planned schedule, in the ingredient's own form. */
  readonly yeastPct: Readonly<Record<string, Estimate>>;
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

const failed = (f: Failure, yeastIds: readonly string[]): MassEstimates => ({
  duration: f,
  progressPct: f,
  yeastPct: Object.fromEntries(yeastIds.map((id) => [id, f])),
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
  const all = [value, ...values.map((v) => (Number.isNaN(v) ? Infinity : v))];
  const unbounded = options.duration !== true && all.some((v) => !Number.isFinite(v));
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
  const temperatures = [mass.startC, ...mass.segments.map((s) => s.ambientC)];
  if (temperatures.some((t) => t < DOMAIN.minDoughC || t > DOMAIN.maxDoughC)) {
    return failure('out_of_domain', 'temperature_outside_domain');
  }
  return undefined;
};

const estimateMass = (mass: Mass): MassEstimates => {
  const open = mass.segments.map((s, i) =>
    i === mass.segments.length - 1 ? { ambientC: s.ambientC } : s,
  );
  const planned = mass.segments.every((s) => s.hours !== undefined);
  const yeastIds = mass.yeasts.map((y) => y.id);
  const domain = inDomain(mass);

  let duration: Estimate;
  if (domain) duration = domain;
  else {
    const run = (p: FermentationParameters, target: number) =>
      simulate(p, {
        freshPct: freshPct(p, mass.yeasts),
        startC: mass.startC,
        segments: open,
        target,
      });
    const central = run(CENTRAL, mass.calibration.readyProgress);
    if (central.kind !== 'remaining') {
      duration = failure('out_of_domain', 'end_point_not_reached');
    } else {
      const hours = corners(mass)
        .map(({ p, target }) => run(p, target))
        .map((r) => (r.kind === 'remaining' ? r.hours : Infinity));
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

  const missing = mass.segments.at(-1)?.hours === undefined ? [mass.stepId] : [];
  let progressPct: Estimate;
  if (!planned) progressPct = failure('insufficient_data', 'duration_unknown', missing);
  else if (domain) progressPct = domain;
  else {
    const at = (p: FermentationParameters, target: number) => {
      const r = simulate(p, {
        freshPct: freshPct(p, mass.yeasts),
        startC: mass.startC,
        segments: mass.segments,
      });
      return r.kind === 'progress' ? (100 * r.progress) / target : NaN;
    };
    progressPct = ok(
      at(CENTRAL, mass.calibration.readyProgress),
      corners(mass).map(({ p, target }) => at(p, target)),
      mass,
    );
  }

  const base: readonly Yeast[] = mass.yeasts.some((y) => y.pct > 0)
    ? mass.yeasts
    : mass.yeasts.map((y, i) => ({ ...y, pct: i === 0 ? 1 : 0 }));
  const yeastPct: Record<string, Estimate> = {};
  if (!planned) {
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
    const central = factor(CENTRAL, mass.calibration.readyProgress);
    const solvedDose = central === undefined ? undefined : freshPct(CENTRAL, base, central);
    const factors = corners(mass).map(({ p, target }) => factor(p, target));
    for (const yeast of base) {
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
        if (f === undefined) return false;
        const dose = freshPct(p, base, f);
        return dose < DOMAIN.minFreshPct || dose > DOMAIN.maxFreshPct;
      });
      yeastPct[yeast.id] = ok(
        (central ?? NaN) * scale,
        factors.map((f) => (f ?? Infinity) * scale),
        mass,
        outside ? { assumptions: [...mass.assumptions, 'band_outside_domain'] } : {},
      );
    }
  }

  return { stepId: mass.stepId, duration, progressPct, yeastPct };
};

const descendants = (process: Process, from: StepId): Set<StepId> => {
  const found = new Set<StepId>();
  for (const step of process.steps) {
    if (step.dependsOn.some((d) => d === from || found.has(d))) found.add(step.id);
  }
  return found;
};

const ancestors = (process: Process, of: StepId): Set<StepId> => {
  const byId = new Map(process.steps.map((s) => [s.id, s]));
  const found = new Set<StepId>();
  const visit = (id: StepId) => {
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (!found.has(d)) {
        found.add(d);
        visit(d);
      }
    }
  };
  visit(of);
  return found;
};

const isYeast = (i: Ingredient): i is Ingredient & { yeast: { form: YeastForm } } =>
  i.yeast !== undefined && i.role === 'dough';

const segmentsOf = (
  steps: readonly ProcessStep[],
  firstC: number,
): { segments: Segment[]; unplanned: StepId[] } => {
  let ambientC = firstC;
  const unplanned: StepId[] = [];
  const segments = steps.map((step, index) => {
    ambientC = step.conditions?.temperatureC ?? ambientC;
    const last = index === steps.length - 1;
    if (step.plannedDurationS === undefined && !last) unplanned.push(step.id);
    const hours =
      step.plannedDurationS === undefined ? (last ? undefined : 0) : step.plannedDurationS / 3600;
    return hours === undefined ? { ambientC } : { hours, ambientC };
  });
  return { segments, unplanned };
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

/** The `asap` steps between the mix and the bake, in process order (fermentation.md). */
const doughSteps = (process: Process): ProcessStep[] | undefined => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return undefined;
  const bake = process.steps.find((s) => s.operation === 'bake');
  const after = descendants(process, mix.id);
  const before = bake ? ancestors(process, bake.id) : undefined;
  return process.steps.filter(
    (s) => s.schedule === 'asap' && after.has(s.id) && s !== bake && (!before || before.has(s.id)),
  );
};

/**
 * The stage a dough is judged ready for on this step (bake-session.md): `bake` on the last dough
 * step, `shape` on an earlier one, none outside the dough steps.
 */
export const doughReadyStage = (process: Process, stepId: StepId): 'shape' | 'bake' | undefined => {
  const steps = doughSteps(process) ?? [];
  if (!steps.some((s) => s.id === stepId)) return undefined;
  return steps.at(-1)?.id === stepId ? 'bake' : 'shape';
};

/** The last step the dough ferments in before the bake, if the process has one. */
export const lastDoughStepId = (process: Process): StepId | undefined =>
  doughSteps(process)?.at(-1)?.id;

const doughMass = (
  formula: Formula,
  process: Process,
  calibration: ReadinessProfile,
  defaulted: boolean,
): Mass | Failure => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return failure('insufficient_data', 'no_mix_step', ['mix']);
  const steps = doughSteps(process) ?? [];
  const last = steps.at(-1);
  if (!last) return failure('insufficient_data', 'no_fermentation_step');
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
  const roomC =
    mix.conditions?.temperatureC ??
    steps.find((s) => s.conditions?.temperatureC !== undefined)?.conditions?.temperatureC;
  if (roomC === undefined) {
    return failure('insufficient_data', 'temperature_unknown', [`${mix.id}.temperatureC`]);
  }
  const extrapolations = doughExtrapolations(formula);
  if (!Array.isArray(extrapolations)) return extrapolations;
  const { segments, unplanned } = segmentsOf(steps, roomC);
  const target = mix.conditions?.doughTemperatureC;
  return {
    stepId: last.id,
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
    assumptions: [
      target === undefined ? 'dough_temperature_from_ambient' : 'dough_temperature_target',
      `ready_target_progress:${calibration.readyProgress}`,
      ...(defaulted ? ['readiness_default'] : []),
      ...unplannedAssumptions(unplanned),
    ],
    extrapolations,
    unplanned,
  };
};

const prefermentMass = (
  formula: Formula,
  process: Process,
  component: Component,
): Mass | Failure => {
  const step = process.steps.find((s) => s.id === component.id);
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
): Mass | Failure => {
  const selected =
    override ?? (process.readiness ? findReadinessProfile(process.readiness) : MODEL_END_POINT);
  if (!selected) return failure('insufficient_data', 'readiness_profile_unknown', ['readiness']);
  if (!validReadinessTarget(selected)) return failure('unsupported', 'invalid_readiness_profile');
  return doughMass(formula, process, selected, override === undefined && !process.readiness);
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
  const prefermentC = preferments.map((c) => {
    const t = process.steps.find((s) => s.id === c.id)?.conditions?.temperatureC;
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
): FermentationEstimates => {
  const yeastIds = formula.ingredients.filter(isYeast).map((i) => i.id);
  const preferments = formula.components.filter((c) => c.kind === 'preferment' && c.flourPct > 0);
  const water = waterTemperature(formula, process);
  const withWater = water === undefined ? {} : { waterTemperatureC: water };
  if (yeastIds.length === 0) {
    const none = failure('unsupported', 'no_commercial_yeast');
    return {
      dough: failed(none, []),
      preferments: Object.fromEntries(preferments.map((c) => [c.id, failed(none, [])])),
      ...withWater,
    };
  }
  const estimate = (mass: Mass | Failure, ids: readonly string[]) =>
    'status' in mass ? failed(mass, ids) : estimateMass(mass);
  const allocated = (c: Component) =>
    (c.allocations ?? []).map((a) => a.ingredient).filter((id) => yeastIds.includes(id));
  return {
    dough: estimate(doughOf(formula, process, profile), yeastIds),
    preferments: Object.fromEntries(
      preferments.map((c) => [c.id, estimate(prefermentMass(formula, process, c), allocated(c))]),
    ),
    ...withWater,
  };
};

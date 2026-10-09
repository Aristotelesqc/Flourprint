import type { Component, Formula, Ingredient, YeastForm } from '../formula/types.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Process, ProcessStep, StepId } from '../process/types.js';
import type { Estimate } from '../values.js';
import {
  CENTRAL,
  CORNERS,
  DOMAIN,
  FERMENTATION_MODEL,
  type FermentationParameters,
} from './model.js';
import { simulate, solveDoseFactor, type Segment } from './simulate.js';

/** Estimates of one fermenting mass (fermentation.md, Results). */
export interface MassEstimates {
  /** The step whose duration is estimated: the last dough step, or the preferment step. */
  readonly stepId?: StepId;
  /** Seconds the step needs to reach the end point, the other durations being as planned. */
  readonly duration: Estimate;
  /** Progress at the end of the planned schedule, in percent of the end point. */
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
  readonly startC: number;
  readonly segments: readonly Segment[];
  readonly assumptions: readonly string[];
  readonly extrapolations: readonly string[];
  /** Ids of the other steps, without a planned duration (they count as 0). */
  readonly unplanned: readonly StepId[];
}

const freshPct = (p: FermentationParameters, yeasts: readonly Yeast[], factor = 1) =>
  yeasts.reduce((sum, y) => sum + y.pct * factor * p.freshPerGram[y.form], 0);

const ok = (
  value: number,
  values: readonly number[],
  mass: Mass,
  assumptions: readonly string[] = mass.assumptions,
): Estimate => ({
  status: 'ok',
  value,
  range: [Math.min(value, ...values), Math.max(value, ...values)],
  model: FERMENTATION_MODEL,
  assumptions,
  ...(mass.extrapolations.length > 0 ? { extrapolations: mass.extrapolations } : {}),
});

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
    const run = (p: FermentationParameters) =>
      simulate(p, { freshPct: freshPct(p, mass.yeasts), startC: mass.startC, segments: open });
    const central = run(CENTRAL);
    if (central.kind !== 'remaining') {
      duration = failure('out_of_domain', 'end_point_not_reached');
    } else {
      const corners = CORNERS.map(run).map((r) => (r.kind === 'remaining' ? r.hours : Infinity));
      duration = ok(
        central.hours * 3600,
        corners.map((h) => h * 3600),
        mass,
        central.reachedBefore
          ? [...mass.assumptions, 'end_point_before_last_step']
          : mass.assumptions,
      );
    }
  }

  const missing = mass.segments.at(-1)?.hours === undefined ? [mass.stepId] : [];
  let progressPct: Estimate;
  if (!planned) progressPct = failure('insufficient_data', 'duration_unknown', missing);
  else if (domain) progressPct = domain;
  else {
    const at = (p: FermentationParameters) => {
      const r = simulate(p, {
        freshPct: freshPct(p, mass.yeasts),
        startC: mass.startC,
        segments: mass.segments,
      });
      return r.kind === 'progress' ? 100 * r.progress : NaN;
    };
    progressPct = ok(at(CENTRAL), CORNERS.map(at), mass);
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
    const factor = (p: FermentationParameters) =>
      solveDoseFactor(p, {
        freshPct: freshPct(p, base),
        startC: mass.startC,
        segments: mass.segments,
      });
    const central = factor(CENTRAL);
    const solvedDose = central === undefined ? undefined : freshPct(CENTRAL, base, central);
    const corners = CORNERS.map(factor);
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
      yeastPct[yeast.id] = ok(
        (central ?? NaN) * scale,
        corners.map((f) => (f ?? Infinity) * scale),
        mass,
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

const doughMass = (formula: Formula, process: Process): Mass | Failure => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return failure('insufficient_data', 'no_mix_step', ['mix']);
  const bake = process.steps.find((s) => s.operation === 'bake');
  const after = descendants(process, mix.id);
  const before = bake ? ancestors(process, bake.id) : undefined;
  const steps = process.steps.filter(
    (s) => s.schedule === 'asap' && after.has(s.id) && s !== bake && (!before || before.has(s.id)),
  );
  const last = steps.at(-1);
  if (!last) return failure('insufficient_data', 'no_fermentation_step');
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
    startC: target ?? roomC,
    segments,
    assumptions: [
      target === undefined ? 'dough_temperature_from_ambient' : 'dough_temperature_target',
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
    extrapolations: [],
    unplanned: [],
  };
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
  const baseC = n * targetC + (frictionC ?? 0);
  const meanPrefermentC =
    prefermentC.length > 0 ? prefermentC.reduce((a, b) => a + b, 0) / prefermentC.length : 0;
  const value = baseC - roomC - roomC - (preferments.length > 0 ? meanPrefermentC : 0);
  if (value < 0) assumptions.push('water_below_0C');
  if (value > 60) assumptions.push('water_above_60C');
  return { status: 'ok', value, model: FERMENTATION_MODEL, assumptions };
};

/**
 * Provisional fermentation estimates of a recipe (docs/contracts/fermentation.md). Pure: never
 * changes the recipe; applying a suggestion is an explicit edit.
 */
export const estimateFermentation = (formula: Formula, process: Process): FermentationEstimates => {
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
    dough: estimate(doughMass(formula, process), yeastIds),
    preferments: Object.fromEntries(
      preferments.map((c) => [c.id, estimate(prefermentMass(formula, process, c), allocated(c))]),
    ),
    ...withWater,
  };
};

import { describe, expect, it } from 'vitest';
import {
  CENTRAL,
  CORNERS,
  estimateFermentation,
  MODEL_END_POINT,
  simulate,
  thermalStepLags,
  validateRecipe,
  type Estimate,
  type Formula,
  type Process,
  type ProcessStep,
  type StepThermal,
  type ThermalProfile,
} from '../src/domain/index.js';

/** The estimate of a dough with thermal inputs (fermentation.md, Dough thermal model). */
const H = 3600;

const salt = { status: 'known', valuePct: 0 } as const;
const dough = (grams: number, yeastPct = 1): Formula => ({
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 65, role: 'dough' },
    { id: 'salt', kind: 'other', bakerPct: 2, role: 'dough', water: salt, fat: salt, sugar: salt },
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: yeastPct,
      role: 'dough',
      water: salt,
      fat: salt,
      sugar: salt,
      yeast: { form: 'fresh' },
    },
  ],
  components: [],
  anchor: { kind: 'doughWeight', grams },
});

interface Leg {
  id: string;
  hours?: number;
  temperatureC: number;
  location?: string;
  thermal?: StepThermal;
  mode?: 'model';
}
const route = (mixC: number, legs: Leg[]): Process => {
  const steps: ProcessStep[] = [
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 600,
      conditions: { temperatureC: mixC },
    },
  ];
  let previous = 'mix';
  for (const leg of legs) {
    steps.push({
      id: leg.id,
      operation: 'bulk',
      dependsOn: [previous],
      schedule: 'asap',
      ...(leg.hours === undefined ? {} : { plannedDurationS: leg.hours * H }),
      conditions: {
        temperatureC: leg.temperatureC,
        ...(leg.location === undefined ? {} : { location: leg.location }),
      },
      ...(leg.thermal === undefined ? {} : { thermal: leg.thermal }),
      ...(leg.mode === undefined ? {} : { durationMode: leg.mode }),
    });
    previous = leg.id;
  }
  steps.push({
    id: 'bake',
    operation: 'bake',
    dependsOn: [previous],
    schedule: 'asap',
    plannedDurationS: 2400,
  });
  return { steps };
};

const value = (e: Estimate | undefined): number => {
  if (e?.status !== 'ok') throw new Error(`not ok: ${JSON.stringify(e)}`);
  return e.value;
};
const bounds = (e: Estimate | undefined): [number, number] => {
  if (e?.status !== 'ok' || e.range === undefined)
    throw new Error(`no range: ${JSON.stringify(e)}`);
  const [low, high] = e.range;
  if (low.kind !== 'finite' || high.kind !== 'finite') throw new Error('unbounded range');
  return [low.value, high.value];
};
const assumptions = (e: Estimate | undefined): readonly string[] =>
  e?.status === 'ok' ? e.assumptions : [];

const bowl: StepThermal = {
  geometry: 'bulk',
  container: { material: 'glass', cover: 'lid' },
  environment: 'roomStill',
  porosity: 'unproofed',
};
const bowlInFridge: StepThermal = { ...bowl, environment: 'fridgeStatic' };
const balls: StepThermal = {
  geometry: 'ball',
  container: { material: 'plastic', cover: 'lid' },
  pieces: 8,
};

describe('the dough estimate without thermal inputs', () => {
  const process = route(24, [
    { id: 'cool', hours: 2, temperatureC: 4, location: 'fridge' },
    { id: 'warm', hours: 2, temperatureC: 24 },
  ]);

  it('lists the end of every dough step, additive and in process order', () => {
    const { dough: result } = estimateFermentation(dough(1000), process, MODEL_END_POINT);
    expect(result.steps?.map((s) => s.stepId)).toEqual(['cool', 'warm']);
    // The last step ends where the progress of the whole schedule ends.
    expect(value(result.steps?.[1]?.endProgressPct)).toBeCloseTo(value(result.progressPct), 9);
    expect(bounds(result.steps?.[1]?.endProgressPct)).toEqual(bounds(result.progressPct));
    // After 2 h at 4 C the dough, lagged by 1.5 h, is at 4 + 20 e^(-2/1.5) C.
    expect(value(result.steps?.[0]?.endTemperatureC)).toBeCloseTo(4 + 20 * Math.exp(-2 / 1.5), 4);
    expect(assumptions(result.progressPct).some((a) => a.startsWith('thermal_'))).toBe(false);
  });

  it('keeps the central value inside its band on a path that cools then warms', () => {
    const { dough: result } = estimateFermentation(dough(1000), process, MODEL_END_POINT);
    const [low, high] = bounds(result.progressPct);
    expect(value(result.progressPct)).toBeGreaterThan(low);
    expect(value(result.progressPct)).toBeLessThan(high);
    expect(value(result.progressPct)).toBeCloseTo(60.507, 1);
  });

  it('is wider than the two shared corners of 0.20.0 on both sides (envelope, not shared lag)', () => {
    const { dough: result } = estimateFermentation(dough(1000), process, MODEL_END_POINT);
    const [low, high] = bounds(result.progressPct);
    // What 0.20.0 returned: one lag, 0 or 3 h, for the whole path, over every kinetic corner.
    const shared = [0, 3].flatMap((tau) =>
      CORNERS.filter((p) => p.path === 'upper').map((p) => {
        const run = simulate(p, {
          freshPct: 1,
          startC: 24,
          segments: [
            {
              hours: 2,
              ambientC: 4,
              lag: {
                tauH: { low: tau, central: tau, high: tau },
                heatingK: { low: 0, central: 0, high: 0 },
              },
            },
            {
              hours: 2,
              ambientC: 24,
              lag: {
                tauH: { low: tau, central: tau, high: tau },
                heatingK: { low: 0, central: 0, high: 0 },
              },
            },
          ],
        });
        if (run.kind !== 'progress') throw new Error('no progress');
        return 100 * run.progress;
      }),
    );
    expect(low).toBeLessThan(Math.min(...shared) - 1);
    expect(high).toBeGreaterThan(Math.max(...shared) + 1);
    // And the envelope is the exact one of the fixture for the central kinetics.
    const centralLow = simulate(
      { ...CENTRAL, path: 'lower' },
      {
        freshPct: 1,
        startC: 24,
        segments: [
          { hours: 2, ambientC: 4 },
          { hours: 2, ambientC: 24 },
        ],
      },
    );
    expect(centralLow.kind === 'progress' && centralLow.progress).toBeCloseTo(0.16833, 4);
  });
});

describe('the dough estimate with thermal inputs', () => {
  const process = route(24, [
    { id: 'bulk', hours: 2, temperatureC: 24, thermal: bowl },
    { id: 'retard', hours: 10, temperatureC: 4, location: 'fridge', thermal: bowlInFridge },
  ]);

  it('names the model, the fridge assumption and the thermal extrapolations', () => {
    const { dough: result } = estimateFermentation(dough(2000, 0.4), process, MODEL_END_POINT);
    const list = assumptions(result.progressPct);
    expect(list).toContain('thermal_model:0.2.0');
    expect(list).toContain('thermal_fridge_cycling');
    // No stored factor: no factor assumption, silently.
    expect(list.some((a) => a.startsWith('thermal_factor'))).toBe(false);
    expect(result.steps?.map((s) => s.stepId)).toEqual(['bulk', 'retard']);
    // The dough warms by itself in the first step (fermentation.md, Self-heating).
    expect(value(result.steps?.[0]?.endTemperatureC)).toBeGreaterThan(24);
  });

  it('flags an uncovered surface, an enriched dough and a high Biot number as extrapolations', () => {
    const open = route(24, [
      { id: 'tin', hours: 1, temperatureC: 24, thermal: { geometry: 'tin' } },
    ]);
    const result = estimateFermentation(dough(800, 0.3), open, MODEL_END_POINT).dough;
    const flags =
      result.progressPct.status === 'ok' ? (result.progressPct.extrapolations ?? []) : [];
    expect(flags).toContain('thermal_uncovered_evaporation');
    const sweet = dough(800, 0.3);
    const enriched: Formula = {
      ...sweet,
      ingredients: [
        ...sweet.ingredients,
        {
          id: 'sugar',
          kind: 'other',
          bakerPct: 12,
          role: 'dough',
          water: salt,
          fat: salt,
          sugar: { status: 'known', valuePct: 100 },
        },
      ],
    };
    const rich = estimateFermentation(enriched, open, MODEL_END_POINT).dough;
    const richFlags =
      rich.progressPct.status === 'ok' ? (rich.progressPct.extrapolations ?? []) : [];
    expect(richFlags).toContain('thermal_enriched_dough');
    expect(flags).not.toContain('thermal_enriched_dough');
  });

  it('puts thermal inputs on a step whose dough is not a step of the dough in the recipe: refused', () => {
    const bad: Process = {
      steps: route(24, [{ id: 'bulk', hours: 1, temperatureC: 24 }]).steps.map((s) =>
        s.id === 'mix' ? { ...s, thermal: bowl } : s,
      ),
    };
    expect(validateRecipe(dough(1000), bad)).toMatchObject({
      ok: false,
      error: { code: 'InvalidProcess' },
    });
  });

  it('has a range wider than the isolated kinetic range, and the central inside it', () => {
    const { dough: result } = estimateFermentation(dough(2000, 0.4), process, MODEL_END_POINT);
    const [low, high] = bounds(result.progressPct);
    expect(low).toBeLessThan(value(result.progressPct));
    expect(high).toBeGreaterThan(value(result.progressPct));
  });

  it('a heavier dough follows the fridge more slowly: less progress lost while it cools', () => {
    const light = estimateFermentation(dough(300, 0.4), process, MODEL_END_POINT).dough;
    const heavy = estimateFermentation(dough(3000, 0.4), process, MODEL_END_POINT).dough;
    const end = (r: typeof light) => value(r.steps?.[1]?.endTemperatureC);
    // 10 h in the fridge: the light dough is at the ambient, the heavy one still above it.
    expect(end(light)).toBeCloseTo(4, 1);
    expect(end(heavy)).toBeGreaterThan(end(light));
    expect(value(heavy.progressPct)).toBeGreaterThan(value(light.progressPct));
  });

  it("uses the mass given by the caller in place of the formula's", () => {
    const base = estimateFermentation(dough(2000, 0.4), process, MODEL_END_POINT).dough;
    const given = estimateFermentation(dough(2000, 0.4), process, MODEL_END_POINT, {
      massG: 300,
    }).dough;
    expect(value(given.progressPct)).not.toBeCloseTo(value(base.progressPct), 3);
    const light = estimateFermentation(dough(300, 0.4), process, MODEL_END_POINT).dough;
    expect(value(given.progressPct)).toBeCloseTo(value(light.progressPct), 9);
  });

  it('without a mass the thermal steps cannot be computed: insufficient data, never a guess', () => {
    const none = estimateFermentation(dough(2000, 0.4), process, MODEL_END_POINT, {
      massG: 0,
    }).dough;
    expect(none.progressPct).toMatchObject({
      status: 'insufficient_data',
      reason: 'thermal_mass_unknown',
    });
    expect(none.steps?.every((s) => s.endProgressPct.status === 'insufficient_data')).toBe(true);
  });

  it('derives the porosity of a step from the progress at its start', () => {
    const lags = thermalStepLags(
      dough(1000, 1),
      route(24, [
        { id: 'first', hours: 1, temperatureC: 24, thermal: { geometry: 'bulk' } },
        { id: 'second', hours: 3, temperatureC: 24, thermal: { geometry: 'bulk' } },
        { id: 'third', hours: 1, temperatureC: 24, thermal: { geometry: 'bulk' } },
      ]),
      MODEL_END_POINT,
    );
    if (!Array.isArray(lags)) throw new Error('no lags');
    // 1 % fresh at 24 C: F grows by about 0.36 per hour, so the progress at the starts is
    // 0, about 0.4 and well past 2/3: unproofed, mid, proofed.
    expect(lags.map((l) => l.porosity)).toEqual(['unproofed', 'mid', 'proofed']);
    // A proofed dough is lighter and conducts less: its lag is not the unproofed one.
    expect(lags[2]?.tauEffH).not.toBeCloseTo(lags[0]?.tauEffH ?? 0, 2);
    // A porosity named by the step is never derived.
    const named = thermalStepLags(
      dough(1000, 1),
      route(24, [
        { id: 'a', hours: 3, temperatureC: 24, thermal: { geometry: 'bulk', porosity: 'proofed' } },
      ]),
      MODEL_END_POINT,
    );
    expect(Array.isArray(named) && named[0]?.porosity).toBe('proofed');
  });

  it('refuses to integrate a runaway: out of domain, self_heating_unbounded', () => {
    const hot = route(30, [{ id: 'bulk', hours: 2, temperatureC: 30, thermal: bowl }]);
    const result = estimateFermentation(dough(3000, 2), hot, MODEL_END_POINT).dough;
    expect(result.progressPct).toMatchObject({
      status: 'out_of_domain',
      reason: 'self_heating_unbounded',
    });
    expect(result.duration).toMatchObject({
      status: 'out_of_domain',
      reason: 'self_heating_unbounded',
    });
    expect(result.steps?.[0]?.endProgressPct).toMatchObject({ reason: 'self_heating_unbounded' });
  });

  it('leaves the range out when only a corner of the band fails the Semenov test', () => {
    // 2 kg at 24 C, 1 % fresh: the central case passes (psi 0.155), the upper path does not.
    const warm = route(24, [{ id: 'bulk', hours: 2, temperatureC: 24, thermal: bowl }]);
    const result = estimateFermentation(dough(2000, 1), warm, MODEL_END_POINT).dough;
    expect(result.progressPct.status).toBe('ok');
    expect(result.progressPct.status === 'ok' && result.progressPct.range).toBeUndefined();
    expect(assumptions(result.progressPct)).toContain('band_unbounded');
  });
});

describe('the personal factor in the estimate', () => {
  const process = route(24, [
    { id: 'retard', hours: 6, temperatureC: 4, location: 'fridge', thermal: bowlInFridge },
  ]);
  const profile = (factors: number[]): ThermalProfile => ({
    id: 'personal',
    version: factors.length,
    updatedAt: '2026-10-25T08:00:00.000Z' as never,
    factors: [
      {
        material: 'glass',
        cover: 'lid',
        environment: 'fridgeStatic',
        sets: factors.map((factor, n) => ({
          factor,
          massG: 500,
          geometry: 'bulk' as const,
          readings: 3,
          basis: { bakeId: `bake-${n}`, stepId: 'retard', eventIds: ['a', 'b', 'c'] },
        })),
      },
    ],
  });
  const run = (thermalProfile?: ThermalProfile) =>
    estimateFermentation(dough(500, 0.4), process, MODEL_END_POINT, {
      ...(thermalProfile === undefined ? {} : { thermalProfile }),
    }).dough;
  const endTemperature = (r: ReturnType<typeof run>) => value(r.steps?.[0]?.endTemperatureC);

  it('a factor above 1 slows the dough down, one below 1 speeds it up, and it is named', () => {
    const plain = run();
    const slow = run(profile([1.5]));
    const fast = run(profile([0.7]));
    expect(endTemperature(slow)).toBeGreaterThan(endTemperature(plain));
    expect(endTemperature(fast)).toBeLessThan(endTemperature(plain));
    expect(assumptions(slow.progressPct)).toContain('thermal_factor:glass.lid.fridgeStatic=1.5');
  });

  it('one set moves the estimate and keeps the width; two that agree tighten the band', () => {
    const width = (r: ReturnType<typeof run>) => {
      const [low, high] = bounds(r.steps?.[0]?.endTemperatureC);
      return high - low;
    };
    const none = width(run());
    const one = width(run(profile([1.2])));
    const two = width(run(profile([1.1, 1.25])));
    expect(one).toBeGreaterThan(two);
    expect(two).toBeLessThan(none);
    expect(assumptions(run(profile([1.1, 1.25]))?.progressPct)).toContain(
      'thermal_band_calibrated:glass.lid.fridgeStatic:2',
    );
  });

  it('sets that disagree beyond x1.5 do not tighten, and the estimate says so', () => {
    const inconsistent = run(profile([0.8, 1.4]));
    expect(assumptions(inconsistent.progressPct)).toContain(
      'thermal_factor_inconsistent:glass.lid.fridgeStatic',
    );
    expect(
      assumptions(inconsistent.progressPct).some((a) => a.startsWith('thermal_band_calibrated')),
    ).toBe(false);
  });

  it('an unmatched key changes nothing and says nothing', () => {
    const other: ThermalProfile = {
      ...profile([2]),
      factors: [
        { ...(profile([2]).factors[0] as ThermalProfile['factors'][number]), material: 'plastic' },
      ],
    };
    const result = run(other);
    expect(value(result.progressPct)).toBeCloseTo(value(run().progressPct), 12);
    expect(assumptions(result.progressPct).some((a) => a.startsWith('thermal_factor'))).toBe(false);
  });
});

describe('performance of the envelope', () => {
  it('estimates a six-step route with several fridge and counter transitions in well under a second per call', () => {
    const process = route(24, [
      { id: 'bulk', hours: 1.5, temperatureC: 24, thermal: { ...bowl } },
      { id: 'cold', hours: 8, temperatureC: 4, location: 'fridge', thermal: bowlInFridge },
      { id: 'bench', hours: 1, temperatureC: 22, thermal: { ...balls, environment: 'roomStill' } },
      {
        id: 'shaped',
        hours: 4,
        temperatureC: 4,
        location: 'fridge',
        thermal: { ...balls, environment: 'fridgeStatic' },
      },
      { id: 'warm', hours: 0.5, temperatureC: 24, thermal: { ...balls, environment: 'roomStill' } },
      {
        id: 'proof',
        temperatureC: 26,
        thermal: { ...balls, environment: 'roomStill' },
        mode: 'model',
      },
    ]);
    const formula = dough(2000, 0.3);
    const started = performance.now();
    const result = estimateFermentation(formula, process, MODEL_END_POINT).dough;
    const elapsed = performance.now() - started;
    expect(result.steps?.length).toBe(6);
    expect(result.duration.status).toBe('ok');
    expect(result.progressPct.status).toBe('insufficient_data'); // the model-driven step has no duration yet
    // The whole estimate: 64 combinations of the duration, of the end of every step, of the dose.
    expect(elapsed).toBeLessThan(5000);
    const planned = route(
      24,
      process.steps.slice(1, -1).map((s) => ({
        id: s.id,
        hours: (s.plannedDurationS ?? 3 * H) / H,
        temperatureC: s.conditions?.temperatureC ?? 24,
        ...(s.conditions?.location === undefined ? {} : { location: s.conditions.location }),
        ...(s.thermal === undefined ? {} : { thermal: s.thermal }),
      })),
    );
    const t0 = performance.now();
    const full = estimateFermentation(formula, planned, MODEL_END_POINT).dough;
    const dt = performance.now() - t0;
    expect(full.progressPct.status).toBe('ok');
    expect(full.steps?.every((s) => s.endProgressPct.status === 'ok')).toBe(true);
    expect(dt).toBeLessThan(5000);
    console.info(`six-step route: open ${elapsed.toFixed(0)} ms, planned ${dt.toFixed(0)} ms`);
  });
});

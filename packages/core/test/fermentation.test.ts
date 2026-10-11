import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  estimateFermentation,
  EXPERIMENTAL_READY,
  findReadinessProfile,
  MODEL_END_POINT,
  validateFormula,
  validateProcess,
  type Formula,
  type Process,
} from '../src/domain/index.js';

/** Hand-computed cases of docs/contracts/fixtures/fermentation (never engine output). */
interface Case {
  name: string;
  formula: Formula;
  process: Process;
  expected: Record<string, number | [number, number]>;
  tolerance?: number;
}
const file = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../docs/contracts/fixtures/fermentation/cases.json', import.meta.url),
    ),
    'utf8',
  ),
) as { tolerance: number; readiness: { id: string; version: string }; cases: Case[] };
// The cases are computed for the profile they name; the test passes it explicitly.
const fixtureProfile = findReadinessProfile(file.readiness);
if (!fixtureProfile) throw new Error('unknown fixture profile');

const at = (value: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (v, key) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined),
      value,
    );

describe('fermentation reference cases', () => {
  for (const c of file.cases) {
    it(c.name, () => {
      expect(validateFormula(c.formula).ok).toBe(true);
      expect(validateProcess(c.process).ok).toBe(true);
      const result = estimateFermentation(c.formula, c.process, fixtureProfile);
      const tolerance = c.tolerance ?? file.tolerance;
      for (const [path, expected] of Object.entries(c.expected)) {
        const actual = at(result, path);
        // Range bounds are portable objects; the fixtures list their finite values.
        const finite = (bound: unknown) =>
          typeof bound === 'object' && bound !== null && 'value' in bound ? bound.value : bound;
        const pairs = Array.isArray(expected)
          ? expected.map((e, i) => [finite((actual as unknown[] | undefined)?.[i]), e] as const)
          : [[actual, expected] as const];
        for (const [a, e] of pairs) {
          expect(typeof a, path).toBe('number');
          expect(Math.abs((a as number) - e), path).toBeLessThanOrEqual(tolerance);
        }
      }
    });
  }
});

const [reference] = file.cases;
if (!reference) throw new Error('no reference case');
const base = reference.formula;
const process = reference.process;
const withYeastForm = (formula: Formula, yeast: boolean): Formula => ({
  ...formula,
  ingredients: formula.ingredients.map((i) => {
    if (i.id !== 'yeast' || yeast) return i;
    const { yeast: _marker, ...rest } = i;
    return rest;
  }),
});
const mix = (conditions: Record<string, unknown>): Process => ({
  steps: process.steps.map((s) => (s.id === 'mix' ? { ...s, conditions } : s)),
});

describe('readiness profiles', () => {
  const planned: Process = {
    steps: process.steps.map((s) =>
      s.id === 'proof' ? { ...s, plannedDurationS: 3.43 * 3600 } : s,
    ),
  };
  const value = (e: { status: string; value?: number }) => (e.status === 'ok' ? e.value : NaN);

  it('defaults to the model end point, and says so', () => {
    // 1 % fresh at 21.1 °C for A hours reaches F = 1: the whole planned fermentation.
    const pct = estimateFermentation(base, planned).dough.progressPct;
    expect(value(pct)).toBeCloseTo(100, 6);
    expect(pct).toMatchObject({
      calibration: { id: MODEL_END_POINT.id, version: MODEL_END_POINT.version },
    });
    expect(pct.status === 'ok' && pct.assumptions).toEqual(
      expect.arrayContaining(['ready_target_progress:1', 'readiness_default']),
    );
  });

  it('uses the profile the process selects, which changes predictions and is named', () => {
    const selected: Process = {
      ...planned,
      readiness: { id: EXPERIMENTAL_READY.id, version: EXPERIMENTAL_READY.version },
    };
    const result = estimateFermentation(base, selected).dough;
    expect(value(result.progressPct)).toBeCloseTo(50, 6);
    expect(value(result.duration)).toBeCloseTo(2 * 3.43 * 3600, 3);
    expect(result.duration).toMatchObject({ calibration: { id: EXPERIMENTAL_READY.id } });
    expect(result.progressPct.status === 'ok' && result.progressPct.assumptions).not.toContain(
      'readiness_default',
    );
    // The band covers both ends of the profile band and the parameter corners.
    expect(result.progressPct.status === 'ok' && result.progressPct.range?.length).toBe(2);
    // The default recipe is not affected by another recipe's choice.
    expect(value(estimateFermentation(base, planned).dough.progressPct)).toBeCloseTo(100, 6);
  });

  it('names an unknown profile as missing data', () => {
    const unknown = { ...planned, readiness: { id: 'someone.else', version: '9' } };
    expect(estimateFermentation(base, unknown).dough.duration).toMatchObject({
      status: 'insufficient_data',
      reason: 'readiness_profile_unknown',
    });
  });

  it.each([
    ['zero', 0, [0, 0]],
    ['negative', -1, [-2, -0.5]],
    ['NaN', NaN, [1, 2]],
    ['infinite', Infinity, [1, Infinity]],
    ['inverted band', 2, [2.5, 1.5]],
    ['target outside its band', 3, [1.5, 2.5]],
  ] as const)(
    'refuses an invalid profile (%s), never an ok non-finite value',
    (_n, ready, band) => {
      const profile = {
        ...MODEL_END_POINT,
        readyProgress: ready,
        band: [band[0], band[1]] as const,
      };
      const result = estimateFermentation(base, planned, profile).dough;
      for (const e of [result.duration, result.progressPct, ...Object.values(result.yeastPct)]) {
        expect(e).toMatchObject({ status: 'unsupported', reason: 'invalid_readiness_profile' });
      }
    },
  );

  it('keeps every ok value finite and JSON-portable', () => {
    const result = estimateFermentation(base, planned);
    for (const e of [result.dough.duration, result.dough.progressPct]) {
      expect(JSON.parse(JSON.stringify(e))).toEqual(e);
    }
  });

  it('discloses dose band corners outside the domain, never clipped', () => {
    // 3.43 h at 21.1 °C with the experimental target needs ≈ 2.59 % fresh; corners go past 3 %.
    const selected: Process = {
      ...planned,
      readiness: { id: EXPERIMENTAL_READY.id, version: EXPERIMENTAL_READY.version },
    };
    const dose = estimateFermentation(base, selected).dough.yeastPct.yeast;
    expect(dose?.status).toBe('ok');
    if (dose?.status !== 'ok') return;
    expect(dose.assumptions).toContain('band_outside_domain');
    const high = dose.range?.[1];
    expect(high?.kind === 'finite' && high.value).toBeGreaterThan(3);
  });

  it('never puts Infinity in a range: an unreachable corner is beyondHorizon', () => {
    const lean: Formula = {
      ...base,
      ingredients: base.ingredients.map((i) => (i.id === 'yeast' ? { ...i, bakerPct: 0.1 } : i)),
    };
    // The experimental profile's high end (2.5) is the corner that never gets there.
    const duration = estimateFermentation(lean, mix({ temperatureC: 5 }), EXPERIMENTAL_READY).dough
      .duration;
    expect(duration.status).toBe('ok');
    if (duration.status !== 'ok') return;
    expect(JSON.parse(JSON.stringify(duration.range))).toEqual(duration.range);
    expect(duration.range?.[0].kind).toBe('finite');
    expect(duration.range?.[1]).toEqual({ kind: 'beyondHorizon', horizonS: 21 * 24 * 3600 });
  });
});

describe('fermentation domain', () => {
  it('is unsupported without an ingredient marked as commercial yeast', () => {
    const result = estimateFermentation(withYeastForm(base, false), process);
    expect(result.dough.duration).toMatchObject({
      status: 'unsupported',
      reason: 'no_commercial_yeast',
    });
  });

  it('names the missing temperature', () => {
    const result = estimateFermentation(base, mix({}));
    expect(result.dough.duration).toMatchObject({
      status: 'insufficient_data',
      missing: ['mix.temperatureC'],
    });
  });

  it('refuses a freezer as out of domain', () => {
    const result = estimateFermentation(base, mix({ temperatureC: -18 }));
    expect(result.dough.duration).toMatchObject({
      status: 'out_of_domain',
      reason: 'temperature_outside_domain',
    });
  });

  it('lists every extrapolation and keeps the estimate', () => {
    const rich: Formula = {
      ...base,
      ingredients: [
        ...base.ingredients.filter((i) => i.id !== 'salt'),
        {
          id: 'sugar',
          kind: 'other',
          bakerPct: 8,
          role: 'dough',
          water: { status: 'known', valuePct: 0 },
          fat: { status: 'known', valuePct: 0 },
          sugar: { status: 'known', valuePct: 100 },
        },
      ],
    };
    const duration = estimateFermentation(rich, process).dough.duration;
    expect(duration.status).toBe('ok');
    expect(duration.status === 'ok' && duration.extrapolations).toEqual([
      'sugar_above_5pct',
      'salt_outside_1_5_to_3pct',
    ]);
  });

  it('needs every duration for the yeast suggestion and the progress', () => {
    const result = estimateFermentation(base, process);
    expect(result.dough.progressPct).toMatchObject({
      status: 'insufficient_data',
      missing: ['proof'],
    });
    expect(result.dough.yeastPct.yeast).toMatchObject({ status: 'insufficient_data' });
  });

  it('reports a dough that reaches its end point before the last step', () => {
    const planned: Process = {
      steps: process.steps.flatMap((s) =>
        s.id === 'proof'
          ? [
              { ...s, id: 'bulk', operation: 'bulk', plannedDurationS: 10 * 3600 },
              { ...s, dependsOn: ['bulk'] },
            ]
          : [s],
      ),
    };
    const duration = estimateFermentation(base, planned).dough.duration;
    expect(duration).toMatchObject({ status: 'ok', value: 0 });
    expect(duration.status === 'ok' && duration.assumptions).toContain(
      'end_point_before_last_step',
    );
  });

  it('flags a water temperature above 60 °C instead of clipping it', () => {
    const water = estimateFermentation(
      base,
      mix({ temperatureC: 10, doughTemperatureC: 30 }),
    ).waterTemperatureC;
    expect(water).toMatchObject({ status: 'ok', value: 70 });
    expect(water?.status === 'ok' && water.assumptions).toContain('water_above_60C');
  });

  it('counts the preferment in the water temperature and estimates the preferment', () => {
    const formula: Formula = {
      ...base,
      components: [
        {
          id: 'poolish',
          kind: 'preferment',
          flourPct: 20,
          flourBlend: [{ flour: 'flour', sharePct: 100 }],
          hydrationPct: 100,
          allocations: [{ ingredient: 'yeast', bakerPct: 0.2 }],
        },
      ],
    };
    const withPoolish: Process = {
      steps: [
        {
          id: 'poolish',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          conditions: { temperatureC: 21.1 },
        },
        ...mix({ temperatureC: 20, doughTemperatureC: 25 }).steps.map((s) =>
          s.id === 'mix' ? { ...s, dependsOn: ['poolish'] } : s,
        ),
      ],
    };
    const result = estimateFermentation(formula, withPoolish);
    // 4 × 25 − 20 − 20 − 21.1
    expect(result.waterTemperatureC).toMatchObject({ status: 'ok', value: 38.9 });
    // 0.2 % of total flour over 20 % of it: 1 % fresh in the poolish at 21.1 °C → A hours.
    const poolish = result.preferments.poolish?.duration;
    expect(poolish?.status === 'ok' && poolish.value).toBeCloseTo(3.43 * 3600, 3);
    // The preferment's own estimate is qualified too (audit C4).
    expect(poolish?.status === 'ok' && poolish.extrapolations).toEqual(['preferment']);
    expect(result.dough.duration.status === 'ok' && result.dough.duration.extrapolations).toContain(
      'preferment',
    );
  });

  it('refuses parallel dough steps instead of adding their times (audit C2)', () => {
    const [mixStep] = process.steps;
    if (!mixStep) throw new Error('no mix step');
    const parallel: Process = {
      steps: [
        { ...mixStep, plannedDurationS: 0 },
        {
          id: 'rest-a',
          operation: 'rest',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 3600,
        },
        {
          id: 'rest-b',
          operation: 'rest',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 3600,
        },
        {
          id: 'proof',
          operation: 'proof',
          dependsOn: ['rest-a', 'rest-b'],
          schedule: 'asap',
          plannedDurationS: 3600,
        },
        ...process.steps
          .filter((s) => s.id === 'preheat' || s.id === 'bake')
          .map((s) => (s.id === 'bake' ? { ...s, dependsOn: ['proof', 'preheat'] } : s)),
      ],
    };
    expect(validateProcess(parallel).ok).toBe(true);
    expect(estimateFermentation(base, parallel).dough.duration).toMatchObject({
      status: 'insufficient_data',
      reason: 'non_linear_dough_path',
      missing: ['rest-b'],
    });
    // The parallel preheat branch is not on the dough path and stays allowed.
    expect(estimateFermentation(base, process).dough.duration.status).toBe('ok');
  });

  it('refuses dough temperature and friction outside the mix step', () => {
    const bad: Process = {
      steps: process.steps.map((s) =>
        s.id === 'proof' ? { ...s, conditions: { doughTemperatureC: 25 } } : s,
      ),
    };
    expect(validateProcess(bad)).toMatchObject({ ok: false, error: { code: 'InvalidProcess' } });
  });
});

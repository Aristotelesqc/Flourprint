import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  estimateFermentation,
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
) as { tolerance: number; cases: Case[] };

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
      const result = estimateFermentation(c.formula, c.process);
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

describe('ready to bake target (personal calibration)', () => {
  it('reports the dough in percent of the planned fermentation, not of a doubling', () => {
    // 1 % fresh at 21.1 °C for A hours reaches F = 1, half of the ready target 2.
    const planned: Process = {
      steps: process.steps.map((s) =>
        s.id === 'proof' ? { ...s, plannedDurationS: 3.43 * 3600 } : s,
      ),
    };
    const result = estimateFermentation(base, planned);
    const pct = result.dough.progressPct;
    expect(pct.status === 'ok' && pct.value).toBeCloseTo(50, 6);
    // The band covers both ends of the target band (1.5 and 2.5) and the parameter corners.
    expect(pct.status === 'ok' && pct.range?.every((b) => b.kind === 'finite')).toBe(true);
    expect(pct.status === 'ok' && pct.assumptions).toContain('ready_target_progress:2');
  });

  it('takes the calibration as its own input, apart from the kinetic parameters', () => {
    const duration = (readyProgress: number) => {
      const d = estimateFermentation(base, process, {
        readyProgress,
        band: [readyProgress, readyProgress],
      }).dough.duration;
      return d.status === 'ok' ? d.value : NaN;
    };
    expect(duration(1)).toBeCloseTo(3.43 * 3600, 3);
    expect(duration(2)).toBeCloseTo(2 * 3.43 * 3600, 3);
  });

  it('never puts Infinity in a range: an unreachable corner is beyondHorizon', () => {
    const lean: Formula = {
      ...base,
      ingredients: base.ingredients.map((i) => (i.id === 'yeast' ? { ...i, bakerPct: 0.1 } : i)),
    };
    const duration = estimateFermentation(lean, mix({ temperatureC: 5 })).dough.duration;
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

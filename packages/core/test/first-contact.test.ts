import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  doughContextOf,
  doughSteps,
  estimateFermentation,
  findReadinessProfile,
  firstContactStep,
  referenceMixingStep,
  validateProcess,
  type Estimate,
  type Formula,
  type Incorporation,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

/**
 * The dough clock starts at the first contact (process.md, First contact; fermentation.md, What it
 * predicts). The numeric reference cases are in docs/contracts/fixtures/fermentation and run in
 * fermentation.test.ts; these tests check what must hold whatever the numbers are.
 */
const file = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../docs/contracts/fixtures/fermentation/cases.json', import.meta.url),
    ),
    'utf8',
  ),
) as {
  readiness: { id: string; version: string };
  cases: { name: string; formula: Formula; process: Process }[];
};
const profile = findReadinessProfile(file.readiness);
if (!profile) throw new Error('unknown fixture profile');
const named = (prefix: string) => {
  const found = file.cases.find((c) => c.name.startsWith(prefix));
  if (!found) throw new Error(`no fixture case ${prefix}`);
  return found;
};
/** A direct dough with 1 % fresh yeast and 2 % salt (the reference case's formula). */
const direct = named('reference point').formula;
/** A poolish and a final dough. */
const withPoolish = named('first contact: a poolish').formula;

const MIN = 60;
const flourWater: Incorporation[] = [
  { item: 'flour', id: 'flour', sharePct: 100 },
  { item: 'water', sharePct: 100 },
];
const saltOnly: Incorporation[] = [{ item: 'ingredient', id: 'salt', sharePct: 100 }];
const yeastOnly: Incorporation[] = [{ item: 'ingredient', id: 'yeast', sharePct: 100 }];

/** A chain of asap steps (id, operation, minutes, incorporations) at one temperature, then a bake. */
const chain = (
  specs: readonly (readonly [string, string, number | undefined, Incorporation[]?])[],
  temperatureC = 24,
): Process => {
  const steps: ProcessStep[] = specs.map(([id, operation, minutes, incorporations], i) => ({
    id,
    operation,
    dependsOn: i === 0 ? [] : [specs[i - 1]?.[0] as string],
    schedule: 'asap',
    ...(minutes === undefined ? {} : { plannedDurationS: minutes * MIN }),
    conditions: { temperatureC },
    ...(incorporations === undefined ? {} : { incorporations }),
  }));
  const last = specs.at(-1)?.[0] as string;
  steps.push({
    id: 'bake',
    operation: 'bake',
    dependsOn: [last],
    schedule: 'asap',
    plannedDurationS: 2400,
  });
  return { steps };
};

const dough = (formula: Formula, process: Process) =>
  estimateFermentation(formula, process, profile).dough;
const value = (e: Estimate): number => {
  if (e.status !== 'ok') throw new Error(`not ok: ${JSON.stringify(e)}`);
  return e.value;
};
const firstContactId = (formula: Formula, process: Process) =>
  firstContactStep(process, doughContextOf(formula))?.id;

describe('the first-contact step (process.md)', () => {
  it('is the first main-dough mixing step when no incorporation is declared', () => {
    const process = chain([
      ['autolyse', 'autolyse', 30],
      ['frasage', 'frasage', 5],
      ['mix', 'mix', 10],
      ['bulk', 'bulk', 60],
    ]);
    // An autolyse is not a mixing step: a flour and water rest never starts the clock.
    expect(firstContactId(direct, process)).toBe('frasage');
    expect(referenceMixingStep(process)?.id).toBe('mix');
    expect(doughSteps(process, doughContextOf(direct))?.map((s) => s.id)).toEqual([
      'frasage',
      'mix',
      'bulk',
    ]);
  });

  it('is the first step that holds yeast when incorporations are declared', () => {
    const process = chain([
      ['autolyse', 'autolyse', 30, flourWater],
      ['mix', 'mix', 8, [...saltOnly, ...yeastOnly]],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(firstContactId(direct, process)).toBe('mix');
    // Salt alone is not a leaven: the clock waits for the step that brings the yeast.
    const saltFirst = chain([
      ['frasage', 'frasage', 5, [...flourWater, ...saltOnly]],
      ['mix', 'mix', 8, yeastOnly],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(firstContactId(direct, saltFirst)).toBe('mix');
    // An incorporation with no share is not an incorporation.
    const zero = chain([
      ['frasage', 'frasage', 5, [{ item: 'ingredient', id: 'yeast', sharePct: 0 }]],
      ['mix', 'mix', 8, yeastOnly],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(firstContactId(direct, zero)).toBe('mix');
  });

  it('is a fermentolyse, whatever it declares', () => {
    const process = chain([
      ['fermentolyse', 'fermentolyse', 45],
      ['mix', 'mix', 8, saltOnly],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(firstContactId(direct, process)).toBe('fermentolyse');
  });

  it('is the step that incorporates a preferment component, not the preferment', () => {
    const process = chain([
      ['poolish', 'preferment', undefined],
      [
        'mix',
        'mix',
        10,
        [
          { item: 'component', id: 'poolish', sharePct: 100 },
          ...flourWater,
          ...saltOnly,
          ...yeastOnly,
        ],
      ],
      ['bulk', 'bulk', 60, []],
    ]);
    // The poolish step is chained before the mix by the helper; the mix is where it joins.
    expect(firstContactId(withPoolish, process)).toBe('mix');
  });
});

describe('the dough estimate from the first contact', () => {
  it('counts the mixing and kneading as fermentation time: the total is what the dough needs', () => {
    // At a constant temperature the time to the end point is fixed; the open bulk is what the
    // counted steps leave. Whatever the split between kneading and bulk, the sum is the same.
    const totals = [0, 5, 10, 25].map((kneading) => {
      const process = chain([
        ['frasage', 'frasage', kneading],
        ['bulk', 'bulk', undefined],
      ]);
      return kneading * MIN + value(dough(direct, process).duration);
    });
    for (const total of totals) expect(total).toBeCloseTo(totals[0] as number, 3);
  });

  it('treats a kneading like any other step of the same temperature', () => {
    // Two kneadings in a row are one kneading of the summed duration; both start the clock.
    const split = dough(
      direct,
      chain([
        ['frasage', 'frasage', 5],
        ['mix', 'mix', 10],
        ['bulk', 'bulk', 120],
      ]),
    );
    const single = dough(
      direct,
      chain([
        ['mix', 'mix', 15],
        ['bulk', 'bulk', 120],
      ]),
    );
    expect(value(split.progressPct)).toBeCloseTo(value(single.progressPct), 6);
    expect(value(split.duration)).toBeCloseTo(value(single.duration), 6);
  });

  it('ignores a yeast-free autolyse ahead of the first contact', () => {
    const steps = (autolyse: boolean) =>
      chain([
        ...(autolyse ? ([['autolyse', 'autolyse', 45, flourWater]] as const) : []),
        ['mix', 'mix', 8, [...saltOnly, ...yeastOnly]],
        ['bulk', 'bulk', undefined, []],
      ]);
    const without = dough(direct, steps(false));
    const withAutolyse = dough(direct, steps(true));
    expect(value(withAutolyse.duration)).toBeCloseTo(value(without.duration), 6);
    expect(withAutolyse.steps?.map((s) => s.stepId)).toEqual(['mix', 'bulk']);
  });

  it('counts a fermentolyse before the final kneading instead of refusing it', () => {
    const result = dough(
      direct,
      chain([
        ['fermentolyse', 'fermentolyse', 45],
        ['mix', 'mix', 8, saltOnly],
        ['bulk', 'bulk', undefined, []],
      ]),
    );
    // It used to be insufficient_data (`leaven_before_mixing`, retired).
    expect(result.duration.status).toBe('ok');
    expect(result.steps?.map((s) => s.stepId)).toEqual(['fermentolyse', 'mix', 'bulk']);
    const reference = value(
      dough(
        direct,
        chain([
          ['mix', 'mix', 0],
          ['bulk', 'bulk', undefined],
        ]),
      ).duration,
    );
    // 53 min of the end point are already done at the start of the bulk.
    expect(value(result.duration)).toBeCloseTo(reference - 53 * MIN, 3);
  });

  it('keeps a preferment on its own clock, whatever the dough does', () => {
    const preferment = (process: Process) =>
      estimateFermentation(withPoolish, process, profile).preferments?.['poolish'];
    const incorporations = [
      { item: 'component', id: 'poolish', sharePct: 100 } as const,
      ...flourWater,
      ...saltOnly,
      ...yeastOnly,
    ];
    const shortMix = chain([
      ['poolish', 'preferment', undefined],
      ['mix', 'mix', 5, incorporations],
      ['bulk', 'bulk', 60, []],
    ]);
    const longMix = chain([
      ['poolish', 'preferment', undefined],
      ['mix', 'mix', 25, incorporations],
      ['bulk', 'bulk', 600, []],
    ]);
    const a = preferment(shortMix);
    const b = preferment(longMix);
    if (a?.duration.status !== 'ok' || b?.duration.status !== 'ok') throw new Error('no estimate');
    expect(a.duration.value).toBeCloseTo(b.duration.value, 6);
  });

  it('starts the target dough temperature at the first contact and lets the lag carry it', () => {
    const at = (doughTemperatureC?: number) =>
      dough(direct, {
        steps: chain([
          ['mix', 'mix', 10],
          ['bulk', 'bulk', 120],
        ]).steps.map((s) =>
          s.id === 'mix'
            ? {
                ...s,
                conditions: {
                  temperatureC: 20,
                  ...(doughTemperatureC === undefined ? {} : { doughTemperatureC }),
                },
              }
            : { ...s, conditions: { temperatureC: 20 } },
        ),
      });
    const basic = at();
    const advanced = at(26);
    // Basic mode: the dough is at the room's temperature all along.
    expect(value(basic.steps?.[0]?.endTemperatureC as Estimate)).toBeCloseTo(20, 6);
    // Advanced mode: it starts at the target, so it has cooled only part of the way after the
    // kneading, and it ferments faster than the basic dough.
    const afterMix = value(advanced.steps?.[0]?.endTemperatureC as Estimate);
    expect(afterMix).toBeGreaterThan(20);
    expect(afterMix).toBeLessThan(26);
    expect(value(advanced.progressPct)).toBeGreaterThan(value(basic.progressPct));
  });

  it('reads the target dough temperature on the reference mixing step, not the first contact', () => {
    const process = chain(
      [
        ['frasage', 'frasage', 5],
        ['mix', 'mix', 10],
        ['bulk', 'bulk', 120],
      ],
      20,
    );
    const target = (id: string): Process => ({
      steps: process.steps.map((s) =>
        s.id === id ? { ...s, conditions: { temperatureC: 20, doughTemperatureC: 26 } } : s,
      ),
    });
    // Accepted on either mixing step (process.md), read only on the reference one (the `mix`).
    expect(validateProcess(target('frasage')).ok).toBe(true);
    const onFrasage = dough(direct, target('frasage'));
    const onMix = dough(direct, target('mix'));
    const plain = dough(direct, process);
    expect(value(onFrasage.progressPct)).toBeCloseTo(value(plain.progressPct), 6);
    expect(value(onMix.progressPct)).toBeGreaterThan(value(plain.progressPct));
    // And a step that is not a mixing step still refuses it.
    const onBulk = {
      steps: process.steps.map((s) =>
        s.id === 'bulk' ? { ...s, conditions: { temperatureC: 20, doughTemperatureC: 26 } } : s,
      ),
    };
    expect(validateProcess(onBulk).ok).toBe(false);
  });
});

describe('what stops the estimate', () => {
  const reason = (e: Estimate) => (e.status === 'ok' ? undefined : e.reason);

  it('has no first-contact step when incorporations are declared and none holds yeast', () => {
    const process = chain([
      ['mix', 'mix', 10, [...flourWater, ...saltOnly]],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(firstContactId(direct, process)).toBeUndefined();
    const result = dough(direct, process);
    expect(result.duration).toMatchObject({
      status: 'insufficient_data',
      reason: 'no_first_contact_step',
    });
  });

  it('keeps no_commercial_yeast ahead of the steps and no_mix_step for a process with no mixing', () => {
    const noYeast: Formula = {
      ...direct,
      ingredients: direct.ingredients.filter((i) => i.id !== 'yeast'),
    };
    const process = chain([
      ['mix', 'mix', 10, flourWater],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(reason(dough(noYeast, process).duration)).toBe('no_commercial_yeast');
    const noMixing = chain([['bulk', 'bulk', 60]]);
    expect(reason(dough(direct, noMixing).duration)).toBe('no_mix_step');
  });

  it('refuses dough steps in parallel after the first contact, mixing steps included', () => {
    const base = chain([
      ['mix', 'mix', 10],
      ['bulk', 'bulk', 60],
    ]);
    const parallel: Process = {
      steps: [
        ...base.steps.filter((s) => s.id !== 'bake'),
        {
          id: 'rest',
          operation: 'rest',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 600,
          conditions: { temperatureC: 24 },
        },
        {
          id: 'bake',
          operation: 'bake',
          dependsOn: ['bulk', 'rest'],
          schedule: 'asap',
          plannedDurationS: 2400,
        },
      ],
    };
    expect(reason(dough(direct, parallel).duration)).toBe('non_linear_dough_path');
  });

  it('has no fermentation step to estimate when the dough steps are all mixing steps', () => {
    const onlyMixing = chain([
      ['frasage', 'frasage', 5],
      ['mix', 'mix', 10],
    ]);
    expect(reason(dough(direct, onlyMixing).duration)).toBe('no_fermentation_step');
  });
});

describe('thermal inputs on the first-contact step (process.md, Where it applies)', () => {
  const bowl = { geometry: 'bulk' } as const;
  const withThermal = (id: string, process: Process): Process => ({
    steps: process.steps.map((s) => (s.id === id ? { ...s, thermal: bowl } : s)),
  });

  it('are accepted on a kneading from the first contact and refused ahead of it', () => {
    const process = chain([
      ['autolyse', 'autolyse', 30],
      ['mix', 'mix', 10, [...flourWater, ...saltOnly, ...yeastOnly]],
      ['bulk', 'bulk', 60, []],
    ]);
    const context = doughContextOf(direct);
    expect(validateProcess(withThermal('mix', process), context).ok).toBe(true);
    expect(validateProcess(withThermal('autolyse', process), context).ok).toBe(false);
  });
});

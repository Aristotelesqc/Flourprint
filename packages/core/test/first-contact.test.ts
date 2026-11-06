import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applySchedule } from '../src/application/index.js';
import {
  doughContextOf,
  doughReadyStage,
  doughStepAmbients,
  doughSteps,
  estimateFermentation,
  fermentationSteps,
  findReadinessProfile,
  firstContactStep,
  stepsAfterReferenceMix,
  referenceMixingStep,
  validateProcess,
  type Estimate,
  type Formula,
  type Incorporation,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

/**
 * The dough clock starts at the END of the first-contact step (process.md, First contact;
 * fermentation.md, What it predicts). The numeric reference cases are in docs/contracts/fixtures/fermentation and run in
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
    // The first-contact step is not a dough step: the dough steps start after it.
    expect(doughSteps(process, doughContextOf(direct))?.map((s) => s.id)).toEqual(['mix', 'bulk']);
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

describe('the dough estimate from the end of the first contact', () => {
  it('does not count the first-contact step: its duration changes nothing', () => {
    // At a constant temperature the time to the end point is fixed; the open bulk is what the
    // counted steps leave. The first-contact step is excluded, whatever its length.
    const durations = [0, 5, 10, 25].map((minutes) =>
      value(
        dough(
          direct,
          chain([
            ['frasage', 'frasage', minutes],
            ['bulk', 'bulk', undefined],
          ]),
        ).duration,
      ),
    );
    for (const duration of durations) expect(duration).toBeCloseTo(durations[0] as number, 3);
    expect(
      dough(
        direct,
        chain([
          ['frasage', 'frasage', 25],
          ['bulk', 'bulk', undefined],
        ]),
      ).steps?.map((s) => s.stepId),
    ).toEqual(['bulk']);
  });

  it('counts the kneading after the first contact: the total is what the dough needs', () => {
    // Whatever the split between the kneading and the bulk, the sum is the same.
    const totals = [0, 5, 10, 25].map((kneading) => {
      const process = chain([
        ['frasage', 'frasage', 7],
        ['mix', 'mix', kneading],
        ['bulk', 'bulk', undefined],
      ]);
      return kneading * MIN + value(dough(direct, process).duration);
    });
    for (const total of totals) expect(total).toBeCloseTo(totals[0] as number, 3);
    // And that total is the time the end point needs from a clock started at the end of the frasage.
    const alone = value(
      dough(
        direct,
        chain([
          ['frasage', 'frasage', 7],
          ['bulk', 'bulk', undefined],
        ]),
      ).duration,
    );
    expect(totals[0]).toBeCloseTo(alone, 3);
  });

  it('treats a kneading like any other step of the same temperature', () => {
    // Two kneadings in a row after the first contact are one kneading of the summed duration.
    const split = dough(
      direct,
      chain([
        ['frasage', 'frasage', 5],
        ['mix', 'mix', 4],
        ['mix2', 'mix', 6],
        ['bulk', 'bulk', 120],
      ]),
    );
    const single = dough(
      direct,
      chain([
        ['frasage', 'frasage', 5],
        ['mix', 'mix', 10],
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
    // Neither the autolyse nor the mix that brings the yeast is a dough step.
    expect(withAutolyse.steps?.map((s) => s.stepId)).toEqual(['bulk']);
  });

  it('counts a kneading after a fermentolyse that holds the yeast, not the fermentolyse', () => {
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
    expect(result.steps?.map((s) => s.stepId)).toEqual(['mix', 'bulk']);
    const reference = value(
      dough(
        direct,
        chain([
          ['mix', 'mix', 0],
          ['bulk', 'bulk', undefined],
        ]),
      ).duration,
    );
    // 8 min of the end point are done at the start of the bulk; the 45 min of fermentolyse are not.
    expect(value(result.duration)).toBeCloseTo(reference - 8 * MIN, 3);
  });

  it('counts a fermentolyse after the frasage that brings the yeast', () => {
    const result = dough(
      direct,
      chain([
        ['frasage', 'frasage', 5, [...flourWater, ...saltOnly, ...yeastOnly]],
        ['fermentolyse', 'fermentolyse', 30],
        ['bulk', 'bulk', undefined, []],
      ]),
    );
    expect(result.steps?.map((s) => s.stepId)).toEqual(['fermentolyse', 'bulk']);
    const reference = value(
      dough(
        direct,
        chain([
          ['frasage', 'frasage', 5, [...flourWater, ...saltOnly, ...yeastOnly]],
          ['bulk', 'bulk', undefined, []],
        ]),
      ).duration,
    );
    expect(value(result.duration)).toBeCloseTo(reference - 30 * MIN, 3);
  });

  it('names no dough step when the first-contact step is followed by the bake', () => {
    const result = dough(direct, chain([['mix', 'mix', 10]]));
    expect(result.duration).toMatchObject({
      status: 'insufficient_data',
      reason: 'no_fermentation_step',
    });
  });

  it('gives the ambient of the first dough step from its own conditions, not the first contact', () => {
    const process = chain([
      ['mix', 'mix', 10],
      ['bulk', 'bulk', 60],
    ]);
    expect(doughStepAmbients(process, doughContextOf(direct))).toEqual({ bulk: 24 });
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

  it('does not count the preparatory mix of a preferment: it ripens the same time whatever the mix lasts', () => {
    const preferment = (mixMinutes: number | undefined) => {
      const process = chain([
        ...(mixMinutes === undefined ? [] : ([['poolish-mix', 'frasage', mixMinutes]] as const)),
        ['poolish', 'preferment', undefined],
        [
          'mix',
          'mix',
          10,
          [
            { item: 'component', id: 'poolish', sharePct: 100 } as const,
            ...flourWater,
            ...saltOnly,
            ...yeastOnly,
          ],
        ],
        ['bulk', 'bulk', 60, []],
      ]);
      const owned: Process = {
        steps: process.steps.map((st) =>
          st.id === 'poolish-mix' || st.id === 'poolish'
            ? { ...st, subject: { kind: 'component', id: 'poolish' } }
            : st,
        ),
      };
      const found = estimateFermentation(withPoolish, owned, profile).preferments['poolish'];
      if (found?.duration.status !== 'ok') throw new Error(JSON.stringify(found));
      return found.duration.value;
    };
    const none = preferment(undefined);
    for (const minutes of [5, 40, 180]) expect(preferment(minutes)).toBeCloseTo(none, 6);
  });

  it('starts the target dough temperature at the end of the first contact and lets the lag carry it', () => {
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

  it('are accepted on a kneading after the first contact and refused on it and ahead of it', () => {
    const process = chain([
      ['autolyse', 'autolyse', 30],
      ['frasage', 'frasage', 5, [...flourWater, ...saltOnly, ...yeastOnly]],
      ['mix', 'mix', 10, []],
      ['bulk', 'bulk', 60, []],
    ]);
    const context = doughContextOf(direct);
    expect(validateProcess(withThermal('mix', process), context).ok).toBe(true);
    expect(validateProcess(withThermal('bulk', process), context).ok).toBe(true);
    // The first-contact step has no clock, and the autolyse is ahead of it.
    expect(validateProcess(withThermal('frasage', process), context).ok).toBe(false);
    expect(validateProcess(withThermal('autolyse', process), context).ok).toBe(false);
  });

  it('are refused on a lone mix that is the first contact', () => {
    const process = chain([
      ['mix', 'mix', 10, [...flourWater, ...saltOnly, ...yeastOnly]],
      ['bulk', 'bulk', 60, []],
    ]);
    expect(validateProcess(withThermal('mix', process), doughContextOf(direct)).ok).toBe(false);
    expect(validateProcess(withThermal('mix', process)).ok).toBe(false);
    expect(validateProcess(withThermal('bulk', process)).ok).toBe(true);
  });
});

describe('a mixing step never follows the model nor is judged ready (fermentation.md, bake-session.md)', () => {
  const withModel = (process: Process, id: string): Process => ({
    steps: process.steps.map((s) => (s.id === id ? { ...s, durationMode: 'model' as const } : s)),
  });
  const kneadThenBulk = chain([
    ['frasage', 'frasage', 5],
    ['mix', 'mix', 10],
    ['bulk', 'bulk', undefined],
  ]);

  it('refuses durationMode model on a mixing step, with the step as the path', () => {
    for (const id of ['frasage', 'mix']) {
      const refused = validateProcess(withModel(kneadThenBulk, id), doughContextOf(direct));
      expect(refused).toMatchObject({
        ok: false,
        error: {
          code: 'InvalidProcess',
          details: { path: `steps[${id === 'mix' ? 1 : 0}].durationMode` },
        },
      });
      // Without the formula too: a mixing step is a mixing step whatever the dough steps are.
      expect(validateProcess(withModel(kneadThenBulk, id)).ok).toBe(false);
    }
    expect(validateProcess(withModel(kneadThenBulk, 'bulk'), doughContextOf(direct)).ok).toBe(true);
  });

  it('solves the last fermentation step when a kneading comes after it', () => {
    // An enriched dough: bulk, then the butter is kneaded in. The kneading keeps its 15 min.
    const enriched = chain([
      ['mix', 'mix', 10],
      ['bulk', 'bulk', undefined],
      ['butter', 'mix', 15],
    ]);
    const result = dough(direct, enriched);
    expect(result.stepId).toBe('bulk');
    expect(value(result.duration)).toBeGreaterThan(0);
    expect(fermentationSteps(enriched, doughContextOf(direct))?.map((s) => s.id)).toEqual(['bulk']);
    // The bulk is the last fermentation step, so a dough judged ready there is ready to bake.
    expect(doughReadyStage(enriched, 'bulk', doughContextOf(direct))).toBe('bake');
    expect(doughReadyStage(enriched, 'butter', doughContextOf(direct))).toBeUndefined();
    expect(doughReadyStage(enriched, 'mix', doughContextOf(direct))).toBeUndefined();
  });
});

describe('a schedule on a frasage-only process (drafts.md)', () => {
  it('replaces the steps after the reference mixing step, which is the frasage', () => {
    const noKnead = chain([
      ['frasage', 'frasage', 3],
      ['bulk', 'bulk', 600],
    ]);
    const context = doughContextOf(direct);
    expect(stepsAfterReferenceMix(noKnead, context)?.map((s) => s.id)).toEqual(['bulk']);
    const applied = applySchedule(noKnead, 'bulk-proof', context);
    if (!applied.ok) throw new Error(JSON.stringify(applied.error));
    expect(applied.value.steps[0]?.id).toBe('frasage');
    expect(referenceMixingStep(applied.value, context)?.id).toBe('frasage');
    expect(stepsAfterReferenceMix(applied.value, context)?.length).toBeGreaterThan(0);
  });
});

describe('a preferment without a temperature of its own (fermentation.md)', () => {
  it('takes the room temperature of the first-contact step, else of the reference mixing step', () => {
    const base = named('first contact: a poolish').process;
    const stripped: Process = {
      steps: base.steps.map((s) => {
        if (s.operation !== 'preferment') return s;
        const { conditions: _conditions, ...rest } = s;
        return rest;
      }),
    };
    const at = (celsius: number): Process => ({
      steps: stripped.steps.map((s) =>
        s.id === firstContactId(withPoolish, stripped)
          ? { ...s, conditions: { ...s.conditions, temperatureC: celsius } }
          : s,
      ),
    });
    const [component] = withPoolish.components;
    const hours = (celsius: number) => {
      const mass = estimateFermentation(withPoolish, at(celsius), profile).preferments[
        component?.id as string
      ];
      if (!mass) throw new Error('no preferment estimate');
      return value(mass.duration);
    };
    // A warmer room ripens the poolish sooner.
    expect(hours(27)).toBeLessThan(hours(20));
  });
});

describe('the two room temperatures (fermentation.md, Dough temperature)', () => {
  /** A frasage that brings the yeast, then a mix that is the reference mixing step. */
  const twoSteps = (frasageC: number | undefined, mixC: number | undefined): Process => ({
    steps: [
      {
        id: 'frasage',
        operation: 'frasage',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 5 * MIN,
        incorporations: [...flourWater, ...saltOnly, ...yeastOnly],
        ...(frasageC === undefined ? {} : { conditions: { temperatureC: frasageC } }),
      },
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: ['frasage'],
        schedule: 'asap',
        plannedDurationS: 8 * MIN,
        conditions: {
          doughTemperatureC: 26,
          ...(mixC === undefined ? {} : { temperatureC: mixC }),
        },
      },
      {
        id: 'bulk',
        operation: 'bulk',
        dependsOn: ['mix'],
        schedule: 'asap',
        plannedDurationS: 60 * MIN,
      },
      { id: 'bake', operation: 'bake', dependsOn: ['bulk'], schedule: 'asap' },
    ],
  });

  it('starts the dough at the first-contact step and calculates the water at the reference step', () => {
    const context = doughContextOf(direct);
    const process = twoSteps(24, undefined);
    expect(firstContactStep(process, context)?.id).toBe('frasage');
    expect(referenceMixingStep(process, context)?.id).toBe('mix');
    // The room is stated on the first-contact step only: the dough is estimated, but the water,
    // read on the reference step, is not (the reviewer's case, the interface now edits both).
    const onlyStart = estimateFermentation(direct, process, profile);
    expect(onlyStart.dough.duration.status).toBe('ok');
    expect(onlyStart.waterTemperatureC).toMatchObject({
      status: 'insufficient_data',
      reason: 'temperature_unknown',
      missing: ['mix.temperatureC'],
    });
    // Stating the room on the reference step as well gives the water: 3 × 26 − 24 − 24 = 30.
    const both = estimateFermentation(direct, twoSteps(24, 24), profile);
    expect(both.dough.duration.status).toBe('ok');
    expect(both.waterTemperatureC).toMatchObject({ status: 'ok', value: 30 });
    // The room of the reference step also carries on to the steps after it, so the water follows
    // it: 3 × 26 − 22 − 22 = 34.
    const warmer = estimateFermentation(direct, twoSteps(24, 22), profile);
    expect(warmer.waterTemperatureC).toMatchObject({ status: 'ok', value: 34 });
  });

  it('needs only one temperature when one step is both (every shipped template)', () => {
    const process = chain([
      ['mix', 'mix', 8, [...flourWater, ...saltOnly, ...yeastOnly]],
      ['bulk', 'bulk', 60, []],
    ]);
    const single: Process = {
      steps: process.steps.map((s) =>
        s.id === 'mix' ? { ...s, conditions: { temperatureC: 24, doughTemperatureC: 26 } } : s,
      ),
    };
    const estimates = estimateFermentation(direct, single, profile);
    expect(firstContactId(direct, single)).toBe(referenceMixingStep(single)?.id);
    expect(estimates.waterTemperatureC).toMatchObject({ status: 'ok', value: 30 });
  });
});

describe('thermal inputs on a process alone (process.md, Validation with and without the formula)', () => {
  const thermal = { geometry: 'bulk' } as const;
  const withThermal = (process: Process, ...ids: string[]): Process => ({
    steps: process.steps.map((s) => (ids.includes(s.id) ? { ...s, thermal } : s)),
  });
  const path = (process: Process, context?: ReturnType<typeof doughContextOf>) => {
    const result = validateProcess(process, context);
    return result.ok ? undefined : (result.error.details as { path?: string }).path;
  };

  it('refuses a step that is certainly not a dough step, with or without the formula', () => {
    const context = doughContextOf(direct);
    // An autolyse of flour and water ahead of the step that brings the ingredients.
    const flourWaterRest = withThermal(
      chain([
        ['autolyse', 'autolyse', 30, flourWater],
        ['mix', 'mix', 8, [...saltOnly, ...yeastOnly]],
        ['bulk', 'bulk', 60, []],
      ]),
      'autolyse',
    );
    expect(path(flourWaterRest)).toBe('steps[0].thermal');
    expect(path(flourWaterRest, context)).toBe('steps[0].thermal');
    // An autolyse that incorporates nothing, while the mix declares the ingredients.
    const empty = withThermal(
      chain([
        ['autolyse', 'autolyse', 30],
        ['mix', 'mix', 8, [...saltOnly, ...yeastOnly]],
        ['bulk', 'bulk', 60, []],
      ]),
      'autolyse',
    );
    expect(path(empty)).toBe('steps[0].thermal');
    // Nothing declared: every step ahead of the first mixing step.
    const undeclared = withThermal(
      chain([
        ['autolyse', 'autolyse', 30],
        ['mix', 'mix', 8],
        ['bulk', 'bulk', 60],
      ]),
      'autolyse',
    );
    expect(path(undeclared)).toBe('steps[0].thermal');
    expect(path(undeclared, context)).toBe('steps[0].thermal');
  });

  it('keeps the documented limit: a step that only the formula shows to hold no yeast', () => {
    const saltFirst = chain([
      ['frasage', 'frasage', 5, [...flourWater, ...saltOnly]],
      ['mix', 'mix', 8, yeastOnly],
      ['bulk', 'bulk', 60, []],
    ]);
    // On the process alone the salt could be yeast, so the frasage could be the first contact and
    // the mix a dough step: accepted. The recipe validation knows the mix is the first contact.
    expect(path(withThermal(saltFirst, 'mix'))).toBeUndefined();
    expect(path(withThermal(saltFirst, 'mix'), doughContextOf(direct))).toBe('steps[1].thermal');
    // The candidate itself is refused either way: it is the first contact or ahead of it.
    expect(path(withThermal(saltFirst, 'frasage'))).toBe('steps[0].thermal');
    expect(path(withThermal(saltFirst, 'frasage'), doughContextOf(direct))).toBe(
      'steps[0].thermal',
    );
    // A step after the real first contact is accepted by both.
    expect(path(withThermal(saltFirst, 'bulk'), doughContextOf(direct))).toBeUndefined();
  });
});

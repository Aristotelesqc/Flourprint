import { describe, expect, it } from 'vitest';
import { decodeProcess } from '../src/application/documents.js';
import { Refused } from '../src/application/decode.js';
import {
  checkRecipe,
  resolveThermal,
  updateStep,
  validateProcess,
  type Formula,
  type Process,
  type ProcessStep,
  type StepThermal,
} from '../src/domain/index.js';

/** Thermal inputs on a process step (process.md, Thermal inputs, #176). */

const step = (id: string, over: Partial<ProcessStep> = {}): ProcessStep => ({
  id,
  operation: 'bulk',
  dependsOn: [],
  schedule: 'asap',
  plannedDurationS: 3600,
  ...over,
});
const processWith = (thermal: unknown, id = 'bulk'): Process => ({
  steps: [
    step('mix', { operation: 'mix', plannedDurationS: 600 }),
    step('bulk', {
      dependsOn: ['mix'],
      ...(id === 'bulk' ? { thermal: thermal as StepThermal } : {}),
    }),
    step('bake', {
      operation: 'bake',
      dependsOn: ['bulk'],
      ...(id === 'bake' ? { thermal: thermal as StepThermal } : {}),
    }),
  ],
});
const reason = (process: Process) => {
  const result = validateProcess(process);
  return result.ok ? undefined : (result.error.details as { path?: string; reason?: string });
};

describe('validating thermal inputs', () => {
  it('accepts a dough step with only a geometry, and with every field', () => {
    expect(validateProcess(processWith({ geometry: 'bulk' })).ok).toBe(true);
    expect(
      validateProcess(
        processWith({
          geometry: 'ball',
          container: { material: 'plastic', cover: 'lid' },
          environment: 'fridgeVentilated',
          porosity: 'mid',
          pieces: 8,
          containerMassG: 120,
        }),
      ).ok,
    ).toBe(true);
    expect(
      validateProcess(
        processWith({
          geometry: 'bulk',
          container: { material: 'banneton', cover: 'cloth', liner: true },
        }),
      ).ok,
    ).toBe(true);
  });

  it.each<[string, unknown, string]>([
    ['an unknown geometry', { geometry: 'cube' }, 'steps[1].thermal.geometry'],
    ['no geometry', {}, 'steps[1].thermal.geometry'],
    [
      'an unknown material',
      { geometry: 'bulk', container: { material: 'wood', cover: 'lid' } },
      'steps[1].thermal.container.material',
    ],
    [
      'an unknown cover',
      { geometry: 'bulk', container: { material: 'glass', cover: 'foil' } },
      'steps[1].thermal.container.cover',
    ],
    [
      'an unknown environment',
      { geometry: 'bulk', environment: 'oven' },
      'steps[1].thermal.environment',
    ],
    ['an unknown porosity', { geometry: 'bulk', porosity: 'airy' }, 'steps[1].thermal.porosity'],
    ['pieces 0', { geometry: 'ball', pieces: 0 }, 'steps[1].thermal.pieces'],
    ['pieces 1.5', { geometry: 'ball', pieces: 1.5 }, 'steps[1].thermal.pieces'],
    [
      'a container mass of 0',
      { geometry: 'bulk', containerMassG: 0 },
      'steps[1].thermal.containerMassG',
    ],
    [
      'a negative container mass',
      { geometry: 'bulk', containerMassG: -5 },
      'steps[1].thermal.containerMassG',
    ],
    [
      'a container mass that is not finite',
      { geometry: 'bulk', containerMassG: Infinity },
      'steps[1].thermal.containerMassG',
    ],
    [
      'a liner outside a banneton',
      { geometry: 'bulk', container: { material: 'glass', cover: 'lid', liner: true } },
      'steps[1].thermal.container.liner',
    ],
    [
      'a banneton that is a tin',
      { geometry: 'tin', container: { material: 'banneton', cover: 'none' } },
      'steps[1].thermal.geometry',
    ],
    [
      'a banneton that is a sheet',
      { geometry: 'sheet', container: { material: 'banneton', cover: 'none' } },
      'steps[1].thermal.geometry',
    ],
    [
      'a glass tin',
      { geometry: 'tin', container: { material: 'glass', cover: 'none' } },
      'steps[1].thermal.container.material',
    ],
    [
      'a ceramic sheet',
      { geometry: 'sheet', container: { material: 'ceramic', cover: 'none' } },
      'steps[1].thermal.container.material',
    ],
    ['something that is not an object', 'bulk', 'steps[1].thermal'],
  ])('refuses %s', (_name, thermal, path) => {
    const result = validateProcess(processWith(thermal));
    expect(result).toMatchObject({ ok: false, error: { code: 'InvalidProcess' } });
    expect(reason(processWith(thermal))?.path).toBe(path);
  });

  it('refuses thermal inputs on a step that is not a dough step, with the step as the path', () => {
    expect(reason(processWith({ geometry: 'bulk' }, 'bake'))?.path).toBe('steps[2].thermal');
    const mixing: Process = {
      steps: [
        step('mix', { operation: 'mix', thermal: { geometry: 'bulk' } }),
        step('bulk', { dependsOn: ['mix'] }),
      ],
    };
    expect(reason(mixing)?.path).toBe('steps[0].thermal');
    // No mix step: there is no dough step at all.
    const noMix: Process = { steps: [step('bulk', { thermal: { geometry: 'bulk' } })] };
    expect(reason(noMix)?.path).toBe('steps[0].thermal');
    // A preferment's step and a step before a target are not dough steps either.
    const preferment: Process = {
      steps: [
        step('poolish', { operation: 'preferment', thermal: { geometry: 'bulk' } }),
        step('mix', { operation: 'mix', dependsOn: ['poolish'] }),
        step('bulk', { dependsOn: ['mix'] }),
      ],
    };
    expect(reason(preferment)?.path).toBe('steps[0].thermal');
    const preheat: Process = {
      steps: [
        step('mix', { operation: 'mix' }),
        step('bulk', { dependsOn: ['mix'] }),
        step('preheat', {
          operation: 'preheat',
          schedule: 'beforeTarget',
          plannedDurationS: undefined as never,
          target: 'bake',
          requiredWarmupS: 600,
          thermal: { geometry: 'bulk' },
        }),
        step('bake', { operation: 'bake', dependsOn: ['bulk'] }),
      ].map((s) => {
        const { plannedDurationS, ...rest } = s;
        return plannedDurationS === undefined ? rest : s;
      }),
    };
    expect(validateProcess(preheat).ok).toBe(false);
  });

  it('a dough step after a heat step is not a dough step', () => {
    const afterBake: Process = {
      steps: [
        step('mix', { operation: 'mix' }),
        step('bake', { operation: 'bake', dependsOn: ['mix'] }),
        step('glaze', { operation: 'glaze', dependsOn: ['bake'], thermal: { geometry: 'sheet' } }),
      ],
    };
    expect(reason(afterBake)?.path).toBe('steps[2].thermal');
  });
});

describe('the defaults of thermal inputs, applied when read and never stored', () => {
  it('the container follows the geometry', () => {
    const container = (geometry: StepThermal['geometry']) => {
      const r = resolveThermal({ geometry }, undefined);
      return `${r.material}/${r.cover}`;
    };
    expect(container('bulk')).toBe('glass/film');
    expect(container('ball')).toBe('plastic/lid');
    expect(container('tin')).toBe('steel/none');
    expect(container('sheet')).toBe('aluminium/none');
  });

  it('the environment follows the location of the step', () => {
    const env = (location?: string) => resolveThermal({ geometry: 'bulk' }, location).environment;
    expect(env('fridge')).toBe('fridgeStatic');
    expect(env('proofer')).toBe('provingBox');
    expect(env('counter')).toBe('roomStill');
    expect(env()).toBe('roomStill');
    // The ventilated fridge is always explicit.
    expect(
      resolveThermal({ geometry: 'bulk', environment: 'fridgeVentilated' }, 'fridge').environment,
    ).toBe('fridgeVentilated');
  });

  it('pieces default to 1, the container mass to none, the porosity is left to the progress', () => {
    const r = resolveThermal({ geometry: 'bulk' }, undefined);
    expect(r.pieces).toBe(1);
    expect(r.containerMassG).toBeUndefined();
    expect(r.porosity).toBeUndefined();
    expect(r.liner).toBe(false);
  });

  it('a step with thermal inputs is unchanged by reading it', () => {
    const thermal: StepThermal = { geometry: 'bulk' };
    const process = processWith(thermal);
    resolveThermal(thermal, 'fridge');
    expect(process.steps[1]?.thermal).toEqual({ geometry: 'bulk' });
  });

  it('is edited with updateStep, and removed with undefined', () => {
    const process = processWith({ geometry: 'bulk' });
    const edited = updateStep(process, 'bulk', { thermal: { geometry: 'ball', pieces: 4 } });
    expect(edited.steps[1]?.thermal).toEqual({ geometry: 'ball', pieces: 4 });
    const removed = updateStep(edited, 'bulk', { thermal: undefined });
    expect('thermal' in (removed.steps[1] as ProcessStep)).toBe(false);
  });
});

describe('thermal_pieces_changed (drafts.md)', () => {
  const formula: Formula = {
    flours: [{ id: 'flour', sharePct: 100 }],
    ingredients: [{ id: 'water', kind: 'water', bakerPct: 65, role: 'dough' }],
    components: [],
    anchor: { kind: 'flourTotal', grams: 1000 },
  };
  const issues = (process: Process) =>
    checkRecipe(formula, process).filter((i) => i.code === 'thermal_pieces_changed');
  const route = (...legs: Array<[string, string, StepThermal | undefined]>): Process => {
    const steps: ProcessStep[] = [step('mix', { operation: 'mix', plannedDurationS: 600 })];
    let previous = 'mix';
    for (const [id, operation, thermal] of legs) {
      steps.push(step(id, { operation, dependsOn: [previous], ...(thermal ? { thermal } : {}) }));
      previous = id;
    }
    steps.push(step('bake', { operation: 'bake', dependsOn: [previous] }));
    return { steps };
  };

  it('is raised when consecutive dough steps carry a different number of pieces, with no divide', () => {
    const found = issues(
      route(
        ['bulk', 'bulk', { geometry: 'bulk' }],
        ['proof', 'proof', { geometry: 'ball', pieces: 8 }],
      ),
    );
    expect(found).toEqual([
      {
        severity: 'warning',
        code: 'thermal_pieces_changed',
        path: 'steps.proof.thermal.pieces',
        details: { step: 'proof', from: 1, to: 8 },
      },
    ]);
  });

  it('is not raised when the pieces agree, when a divide lies between, or for a lone step', () => {
    expect(
      issues(
        route(
          ['bulk', 'bulk', { geometry: 'bulk', pieces: 8 }],
          ['proof', 'proof', { geometry: 'ball', pieces: 8 }],
        ),
      ),
    ).toEqual([]);
    expect(
      issues(
        route(
          ['bulk', 'bulk', { geometry: 'bulk' }],
          ['divide', 'divide', undefined],
          ['proof', 'proof', { geometry: 'ball', pieces: 8 }],
        ),
      ),
    ).toEqual([]);
    expect(
      issues(route(['bulk', 'bulk', { geometry: 'bulk' }], ['rest', 'rest', undefined])),
    ).toEqual([]);
  });

  it('looks past a step with no thermal inputs, and never blocks', () => {
    const process = route(
      ['bulk', 'bulk', { geometry: 'bulk' }],
      ['rest', 'rest', undefined],
      ['proof', 'proof', { geometry: 'ball', pieces: 2 }],
    );
    expect(issues(process)).toHaveLength(1);
    expect(checkRecipe(formula, process).filter((i) => i.severity === 'blocking')).toEqual([]);
  });
});

describe('decoding thermal inputs from untrusted JSON', () => {
  const decode = (thermal: unknown) =>
    decodeProcess({ steps: [{ ...step('bulk'), thermal }] }, 'process');

  it('accepts what the model reads', () => {
    expect(
      decode({ geometry: 'bulk', container: { material: 'glass', cover: 'lid' }, pieces: 2 })
        .steps[0]?.thermal,
    ).toEqual({
      geometry: 'bulk',
      container: { material: 'glass', cover: 'lid' },
      pieces: 2,
    });
  });

  it.each([
    ['an unknown field', { geometry: 'bulk', shape: 'round' }],
    ['an unknown geometry', { geometry: 'cube' }],
    ['no geometry', {}],
    ['a container without a cover', { geometry: 'bulk', container: { material: 'glass' } }],
    [
      'a liner that is not a boolean',
      { geometry: 'bulk', container: { material: 'banneton', cover: 'none', liner: 1 } },
    ],
    ['pieces that is not a number', { geometry: 'bulk', pieces: '8' }],
    ['an unknown environment', { geometry: 'bulk', environment: 'oven' }],
  ])('refuses %s', (_name, thermal) => {
    expect(() => decode(thermal)).toThrow(Refused);
  });
});

import { describe, expect, it } from 'vitest';
import { decodeProcess } from '../src/application/documents.js';
import {
  duplicateStep,
  estimateFermentation,
  moveStep,
  resolveFormula,
  subjectOf,
  validateRecipe,
  type Formula,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

/**
 * Subjects and component phases (process.md, #96, #106). The examples are the contract's
 * hand-checked ones; their numbers follow it.
 */

const formula: Formula = {
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
    { id: 'salt', kind: 'other', bakerPct: 2, role: 'dough' },
    { id: 'yeast', kind: 'other', bakerPct: 0.5, role: 'dough', yeast: { form: 'fresh' } },
  ],
  components: [
    {
      id: 'poolish',
      kind: 'preferment',
      flourPct: 30,
      flourBlend: [{ flour: 'flour', sharePct: 100 }],
      hydrationPct: 100,
      allocations: [{ ingredient: 'yeast', bakerPct: 0.1 }],
    },
  ],
  anchor: { kind: 'flourTotal', grams: 600 },
};

const poolish = { kind: 'component', id: 'poolish' } as const;

const step = (
  id: string,
  operation: string,
  dependsOn: string[],
  extra: Partial<ProcessStep> = {},
): ProcessStep => ({ id, operation, dependsOn, schedule: 'asap', ...extra });

const joinAll = [
  { item: 'flour', id: 'flour', sharePct: 100 },
  { item: 'water', sharePct: 100 },
  { item: 'ingredient', id: 'salt', sharePct: 100 },
  { item: 'ingredient', id: 'yeast', sharePct: 100 },
  { item: 'component', id: 'poolish', sharePct: 100 },
] as const;

// Example 1: poolish in three steps, then the main dough incorporating it once.
const threePhases: Process = {
  steps: [
    step('poolish-prepare', 'frasage', [], { subject: poolish, plannedDurationS: 600 }),
    step('poolish-counter', 'preferment', ['poolish-prepare'], {
      subject: poolish,
      plannedDurationS: 16 * 3600,
      conditions: { temperatureC: 21 },
    }),
    step('poolish-fridge', 'preferment', ['poolish-counter'], {
      subject: poolish,
      plannedDurationS: 8 * 3600,
      conditions: { temperatureC: 4 },
    }),
    step('mix', 'mix', ['poolish-fridge'], {
      plannedDurationS: 600,
      incorporations: [...joinAll],
      conditions: { temperatureC: 21 },
    }),
  ],
};

// Example 3: legacy, the step whose id is the component's.
const legacy: Process = {
  steps: [
    step('poolish', 'preferment', [], {
      plannedDurationS: 16 * 3600,
      conditions: { temperatureC: 21 },
    }),
    step('mix', 'mix', ['poolish'], { plannedDurationS: 600, conditions: { temperatureC: 21 } }),
  ],
};

const reason = (process: Process) => {
  const result = validateRecipe(formula, process);
  return result.ok ? undefined : result.error;
};

describe('subjects and component phases', () => {
  it('example 1: three phases of one poolish are valid; two fermenting phases are unmodelled', () => {
    expect(reason(threePhases)).toBeUndefined();
    const estimate = estimateFermentation(formula, threePhases).preferments['poolish']?.duration;
    expect(estimate).toMatchObject({
      status: 'insufficient_data',
      reason: 'component_phases_unmodelled',
    });
  });

  it('example 3: a legacy recipe means what it meant', () => {
    expect(reason(legacy)).toBeUndefined();
    expect(subjectOf(legacy, legacy.steps[0] as ProcessStep, new Set(['poolish']))).toEqual(
      poolish,
    );
    expect(estimateFermentation(formula, legacy).preferments['poolish']?.duration.status).toBe(
      'ok',
    );
  });

  it('example 4: a phase added to a legacy recipe is valid and makes two fermenting phases', () => {
    const added: Process = {
      steps: [
        legacy.steps[0] as ProcessStep,
        step('poolish-fridge', 'preferment', ['poolish'], {
          subject: poolish,
          plannedDurationS: 8 * 3600,
          conditions: { temperatureC: 4 },
        }),
        { ...(legacy.steps[1] as ProcessStep), dependsOn: ['poolish-fridge'] },
      ],
    };
    expect(reason(added)).toBeUndefined();
    expect(estimateFermentation(formula, added).preferments['poolish']?.duration).toMatchObject({
      reason: 'component_phases_unmodelled',
    });
  });

  it('example 5: incorporated before its last phase ends', () => {
    const early: Process = {
      steps: threePhases.steps.map((s) =>
        s.id === 'mix' ? { ...s, dependsOn: ['poolish-counter'] } : s,
      ),
    };
    expect(reason(early)).toMatchObject({
      code: 'InvalidProcess',
      details: { path: 'steps[2]' },
    });
  });

  it('example 6: the mass is counted once, however many steps prepare it', () => {
    const resolved = resolveFormula(formula);
    if (!resolved.ok) throw new Error(resolved.error.message);
    // 30 % of 600 g of flour.
    expect(resolved.value.components['poolish']?.flour).toBeCloseTo(180, 9);
  });

  it('example 8: an unknown component subject', () => {
    const levain: Process = {
      steps: threePhases.steps.map((s) =>
        s.id === 'poolish-prepare' ? { ...s, subject: { kind: 'component', id: 'levain' } } : s,
      ),
    };
    expect(reason(levain)).toMatchObject({
      code: 'InvalidProcess',
      details: { path: 'steps[0].subject' },
    });
  });

  it('example 9: a phase left after the join is refused', () => {
    const afterJoin: Process = {
      steps: [
        legacy.steps[0] as ProcessStep,
        step('poolish-fridge', 'preferment', ['poolish'], {
          subject: poolish,
          plannedDurationS: 8 * 3600,
        }),
        legacy.steps[1] as ProcessStep,
      ],
    };
    expect(reason(afterJoin)).toMatchObject({ code: 'InvalidProcess' });
  });

  it('refuses main dough as the subject of the step whose id is a component', () => {
    const contradictory: Process = {
      steps: legacy.steps.map((s) =>
        s.id === 'poolish' ? { ...s, subject: { kind: 'mainDough' } } : s,
      ),
    };
    expect(reason(contradictory)).toMatchObject({
      code: 'InvalidProcess',
      details: { path: 'steps[0].subject' },
    });
  });

  it('refuses a component joining the dough at one of its own phases', () => {
    const self: Process = {
      steps: threePhases.steps.map((s) => (s.id === 'mix' ? { ...s, subject: poolish } : s)),
    };
    expect(reason(self)).toMatchObject({ code: 'InvalidProcess' });
  });

  it('example 7: a chain move among the same subject keeps it valid', () => {
    const moved = moveStep(threePhases, 'poolish-counter', null);
    if (!moved.ok) throw new Error(JSON.stringify(moved.error));
    expect(moved.value.kind).toBe('chain');
    expect(moved.value.process.steps.map((s) => [s.id, s.dependsOn])).toEqual([
      ['poolish-counter', []],
      ['poolish-prepare', ['poolish-counter']],
      ['poolish-fridge', ['poolish-prepare']],
      ['mix', ['poolish-fridge']],
    ]);
    expect(reason(moved.value.process)).toBeUndefined();
  });

  it('example 7: the last phase moves before another phase of its component', () => {
    const moved = moveStep(threePhases, 'poolish-fridge', 'poolish-prepare');
    if (!moved.ok) throw new Error(JSON.stringify(moved.error));
    expect(moved.value.kind).toBe('chain');
    // T, the main-dough join, takes the fridge's dependency; the fridge goes after prepare.
    expect(moved.value.process.steps.map((s) => [s.id, s.dependsOn])).toEqual([
      ['poolish-prepare', []],
      ['poolish-fridge', ['poolish-prepare']],
      ['poolish-counter', ['poolish-fridge']],
      ['mix', ['poolish-counter']],
    ]);
    expect(reason(moved.value.process)).toBeUndefined();
  });

  it('a phase never crosses into a main-dough step that is not its join', () => {
    const withBulk: Process = {
      steps: [
        ...threePhases.steps,
        step('autolyse', 'autolyse', []),
        step('bulk', 'bulk', ['mix', 'autolyse']),
      ],
    };
    // autolyse is main dough and not the poolish's join.
    expect(moveStep(withBulk, 'poolish-prepare', 'autolyse')).toMatchObject({
      ok: false,
      error: { code: 'AmbiguousMove', details: { reason: 'crossesWorkpiece' } },
    });
  });

  it('a step with an explicit subject is duplicable and the copy keeps its subject', () => {
    const copied = duplicateStep(threePhases, 'poolish-counter', 'poolish-counter-2');
    if (!copied.ok) throw new Error(JSON.stringify(copied.error));
    expect(copied.value.copy.subject).toEqual(poolish);
    expect(subjectOf(copied.value.process, copied.value.copy)).toEqual(poolish);
    expect(reason(copied.value.process)).toBeUndefined();
  });

  it('documents keep the subject and refuse a malformed one', () => {
    const doc = JSON.parse(JSON.stringify(threePhases)) as unknown;
    expect(decodeProcess(doc, 'p')).toEqual(threePhases);
    const bad = (subject: unknown) => ({ steps: [{ ...legacy.steps[1], subject }] });
    expect(() => decodeProcess(bad({ kind: 'levain' }), 'p')).toThrow();
    expect(() => decodeProcess(bad({ kind: 'component' }), 'p')).toThrow();
    expect(() => decodeProcess(bad({ kind: 'mainDough', id: 'x' }), 'p')).toThrow();
    expect(() => decodeProcess(bad({ kind: 'mainDough' }), 'p')).not.toThrow();
  });
});

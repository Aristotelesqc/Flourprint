import { describe, expect, it } from 'vitest';
import { blankRecipe } from '../src/application/index.js';
import {
  checkRecipe,
  foldSchedule,
  insertStepAfter,
  phasesDurationS,
  removeStep,
  updateStep,
  validateProcess,
  type Instant,
  type Process,
  type ProcessStep,
  type StepTechnique,
} from '../src/domain/index.js';

/** docs/contracts/process.md, Techniques (#32, first slice); values computed by hand. */
const MIN = 60;
const bulk = (technique?: StepTechnique, plannedDurationS = 180 * MIN): ProcessStep => ({
  id: 'bulk',
  operation: 'bulk',
  dependsOn: ['mix'],
  schedule: 'asap',
  plannedDurationS,
  ...(technique === undefined ? {} : { technique }),
});
const process = (technique?: StepTechnique, plannedDurationS?: number): Process => ({
  steps: [
    { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 10 * MIN },
    bulk(technique, plannedDurationS),
    { id: 'shape', operation: 'shape', dependsOn: ['bulk'], schedule: 'asap' },
  ],
});
const failure = (technique: StepTechnique) => {
  const result = validateProcess(process(technique));
  return result.ok ? undefined : result.error;
};

describe('technique validation', () => {
  it('accepts recorded techniques, open codes included', () => {
    expect(
      validateProcess(
        process({
          method: 'hand',
          phases: [
            { speed: 'low', durationS: 180 },
            { speed: 'high', durationS: 300 },
          ],
          folds: { count: 4, intervalS: 30 * MIN, style: 'someHouseStyle' },
          endCheck: 'windowpane',
        }),
      ).ok,
    ).toBe(true);
  });

  it.each<[string, StepTechnique, string]>([
    ['a zero phase', { phases: [{ speed: 'low', durationS: 0 }] }, 'phases[0].durationS'],
    [
      'a negative phase',
      {
        phases: [
          { speed: 'low', durationS: 60 },
          { speed: 'medium', durationS: -60 },
        ],
      },
      'phases[1].durationS',
    ],
    [
      'an unknown speed',
      { phases: [{ speed: 'turbo' as 'low', durationS: 60 }] },
      'phases[0].speed',
    ],
    ['zero folds', { folds: { count: 0, intervalS: 1800 } }, 'folds.count'],
    ['a fractional count', { folds: { count: 2.5, intervalS: 1800 } }, 'folds.count'],
    ['a zero interval', { folds: { count: 2, intervalS: 0 } }, 'folds.intervalS'],
    ['an infinite interval', { folds: { count: 2, intervalS: Infinity } }, 'folds.intervalS'],
  ])('refuses %s as InvalidProcess', (_case, technique, field) => {
    expect(failure(technique)).toMatchObject({
      code: 'InvalidProcess',
      details: { path: `steps[1].technique.${field}` },
    });
  });
});

describe('technique helpers', () => {
  it('schedules fold sets from the start, one interval apart', () => {
    const start = '2026-10-07T09:00:00.000Z' as Instant;
    expect(foldSchedule(bulk({ folds: { count: 3, intervalS: 20 * MIN } }), start)).toEqual([
      '2026-10-07T09:20:00.000Z',
      '2026-10-07T09:40:00.000Z',
      '2026-10-07T10:00:00.000Z',
    ]);
    expect(foldSchedule(bulk(), start)).toEqual([]);
  });

  it('sums the mixing phases, and says nothing without phases', () => {
    expect(
      phasesDurationS({
        phases: [
          { speed: 'low', durationS: 3 * MIN },
          { speed: 'medium', durationS: 5 * MIN },
        ],
      }),
    ).toBe(8 * MIN);
    expect(phasesDurationS({ method: 'hand' })).toBeUndefined();
    expect(phasesDurationS({ phases: [] })).toBeUndefined();
    expect(phasesDurationS(undefined)).toBeUndefined();
  });
});

describe('folds_exceed_step (drafts.md)', () => {
  const blank = blankRecipe();
  const issues = (p: Process) =>
    checkRecipe(blank.formula, p).filter((i) => i.code === 'folds_exceed_step');

  it('warns when the sets outlast the planned step', () => {
    // 4 × 50 min = 200 min > 180 min.
    expect(issues(process({ folds: { count: 4, intervalS: 50 * MIN } }))).toEqual([
      {
        severity: 'warning',
        code: 'folds_exceed_step',
        path: 'steps.bulk.technique.folds',
        details: { step: 'bulk' },
      },
    ]);
  });

  it('says nothing when the sets fit, end with the step, or the duration is unknown', () => {
    expect(issues(process({ folds: { count: 4, intervalS: 30 * MIN } }))).toEqual([]);
    expect(issues(process({ folds: { count: 6, intervalS: 30 * MIN } }))).toEqual([]);
    const unknown: Process = {
      steps: process().steps.map((s) => {
        if (s.id !== 'bulk') return s;
        const { plannedDurationS: _, ...rest } = s;
        return { ...rest, technique: { folds: { count: 9, intervalS: 3600 } } };
      }),
    };
    expect(issues(unknown)).toEqual([]);
  });
});

describe('process edits', () => {
  const base = process();

  it('inserts a step after another and moves its successors behind the new step', () => {
    const next = insertStepAfter(base, 'bulk', {
      id: 'degas',
      operation: 'degas',
      schedule: 'asap',
    });
    expect(next.steps.map((s) => [s.id, s.dependsOn])).toEqual([
      ['mix', []],
      ['bulk', ['mix']],
      ['degas', ['bulk']],
      ['shape', ['degas']],
    ]);
    expect(validateProcess(next).ok).toBe(true);
  });

  it('inserts after the last step, and ignores an unknown anchor or a taken id', () => {
    const last = insertStepAfter(base, 'shape', {
      id: 'rest',
      operation: 'rest',
      schedule: 'asap',
    });
    expect(last.steps.at(-1)).toEqual({
      id: 'rest',
      operation: 'rest',
      dependsOn: ['shape'],
      schedule: 'asap',
    });
    expect(insertStepAfter(base, 'ghost', { id: 'x', operation: 'x', schedule: 'asap' })).toBe(
      base,
    );
    expect(insertStepAfter(base, 'mix', { id: 'bulk', operation: 'x', schedule: 'asap' })).toBe(
      base,
    );
  });

  it('keeps the readiness profile through insertions and removals', () => {
    const withProfile: Process = { ...base, readiness: { id: 'r', version: '1' } };
    const inserted = insertStepAfter(withProfile, 'mix', {
      id: 'rest',
      operation: 'rest',
      schedule: 'asap',
    });
    expect(inserted.readiness).toEqual({ id: 'r', version: '1' });
    expect(removeStep(inserted, 'rest')).toEqual(withProfile);
  });

  it('updates a step and removes the fields set to undefined', () => {
    const techniqued = updateStep(base, 'bulk', {
      label: 'Bulk in the tub',
      technique: { folds: { count: 3, intervalS: 20 * MIN } },
    });
    expect(techniqued.steps[1]).toMatchObject({
      label: 'Bulk in the tub',
      technique: { folds: { count: 3, intervalS: 1200 } },
    });
    const cleared = updateStep(techniqued, 'bulk', { label: undefined, technique: undefined });
    expect(cleared.steps[1]).toEqual(base.steps[1]);
    expect(updateStep(base, 'mix', { operation: 'autolyse' }).steps[0]?.operation).toBe('autolyse');
  });

  it('drops the provenance of an applied suggestion when the duration changes', () => {
    const accepted = {
      ...base,
      steps: base.steps.map((s) =>
        s.id === 'bulk'
          ? {
              ...s,
              accepted: {
                estimate: {
                  status: 'ok' as const,
                  value: 10800,
                  model: { id: 'm', version: '1' },
                  assumptions: [],
                },
                appliedValue: 10800,
                model: { id: 'm', version: '1' },
              },
            }
          : s,
      ),
    };
    expect(updateStep(accepted, 'bulk', { label: 'x' }).steps[1]?.accepted).toBeDefined();
    expect(
      updateStep(accepted, 'bulk', { plannedDurationS: 3600 }).steps[1]?.accepted,
    ).toBeUndefined();
  });
});

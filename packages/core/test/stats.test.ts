import { describe, expect, it } from 'vitest';
import {
  bakeStats,
  bakeWorld,
  median,
  type BakeDigest,
  type StepDigest,
} from '../src/application/index.js';
import type { BakeEvent, Instant } from '../src/domain/index.js';

const at = (hour: number, day = 1): Instant =>
  `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z` as Instant;

const estimate = (value: number) =>
  ({
    status: 'ok',
    value,
    model: { id: 'm', version: '1' },
    assumptions: [],
  }) as unknown as NonNullable<StepDigest['estimate']>;

const digest = (
  bakeId: string,
  recipe: string,
  status: BakeDigest['status'],
  day: number,
  extra: Partial<BakeDigest> = {},
): BakeDigest => ({
  bakeId,
  status,
  origin: 'simulation',
  recipe: { id: recipe, name: recipe.toUpperCase(), version: 1 },
  startedAt: at(8, day),
  ...(status === 'active' ? {} : { endedAt: at(14, day) }),
  manifest: { engineVersion: '0', contractVersion: '0', models: [] },
  steps: [],
  observations: [],
  adjustments: [],
  ...extra,
});

describe('bake statistics', () => {
  it('is empty for no bake', () => {
    const stats = bakeStats([]);
    expect(stats.counts).toEqual({
      total: 0,
      finished: 0,
      abandoned: 0,
      active: 0,
      results: { cooked: 0, dough: 0, cookedAndDough: 0, unknown: 0 },
    });
    expect(stats.cookingStages).toEqual([]);
    expect(stats.recipes).toEqual([]);
    expect(stats.durations).toEqual([]);
    expect(stats.readiness).toEqual({ marks: 0, compared: 0 });
    expect(stats.ratings).toEqual([]);
    expect(stats.recent).toEqual([]);
  });

  it('counts bakes by status and recipes by bakes', () => {
    const stats = bakeStats([
      digest('a', 'pain', 'finished', 1),
      digest('b', 'pizza', 'abandoned', 2),
      digest('c', 'pain', 'finished', 3),
      digest('d', 'pain', 'active', 4),
    ]);
    expect(stats.counts).toMatchObject({ total: 4, finished: 2, abandoned: 1, active: 1 });
    expect(stats.recipes).toEqual([
      { recipeId: 'pain', name: 'PAIN', count: 3 },
      { recipeId: 'pizza', name: 'PIZZA', count: 1 },
    ]);
    expect(stats.recent.map((r) => r.bakeId)).toEqual(['d', 'c', 'b', 'a']);
    expect(stats.recent[1]).toMatchObject({ status: 'finished', durationS: 6 * 3600 });
    expect(stats.recent[0]?.durationS).toBeUndefined();
  });

  it('keeps the last ten bakes only', () => {
    const bakes = Array.from({ length: 12 }, (_, i) => digest(`b${i}`, 'pain', 'finished', i + 1));
    const stats = bakeStats(bakes);
    expect(stats.recent).toHaveLength(10);
    expect(stats.recent[0]?.bakeId).toBe('b11');
    expect(stats.counts.total).toBe(12);
  });

  it('compares the plan at start with recorded durations by operation', () => {
    const step = (id: string, operation: string, planned: number, actual?: number): StepDigest => ({
      id,
      operation,
      cooking: false,
      baselineDurationS: planned,
      plannedDurationS: planned + 900, // adjusted during the bake: not the plan at start
      ...(actual === undefined ? {} : { actualDurationS: actual }),
    });
    const stats = bakeStats([
      digest('a', 'pain', 'finished', 1, {
        steps: [step('bulk', 'bulkFerment', 3600, 4200), step('mix', 'mix', 600, 600)],
      }),
      digest('b', 'pain', 'finished', 2, {
        steps: [step('bulk', 'bulkFerment', 3600, 3000), step('mix', 'mix', 600)],
      }),
      digest('c', 'pain', 'finished', 3, {
        steps: [step('bulk', 'bulkFerment', 7200, 9000)],
      }),
    ]);
    expect(stats.durations).toEqual([
      {
        operation: 'bulkFerment',
        n: 3,
        medianPlannedS: 3600,
        medianRecordedS: 4200,
        medianDifferenceS: 600,
      },
      { operation: 'mix', n: 1, medianPlannedS: 600, medianRecordedS: 600, medianDifferenceS: 0 },
    ]);
  });

  it('compares dough ready marks with the model estimate when there is one', () => {
    const stats = bakeStats([
      digest('a', 'pain', 'finished', 1, {
        steps: [{ id: 'bulk', operation: 'bulkFerment', cooking: false, estimate: estimate(3600) }],
        observations: [
          {
            at: at(10),
            recordedAt: at(10),
            stepId: 'bulk',
            elapsedInStepS: 4500,
            category: 'fermentation',
            kind: 'doughReady',
          },
        ],
      }),
      digest('b', 'pain', 'finished', 2, {
        steps: [{ id: 'bulk', operation: 'bulkFerment', cooking: false }],
        observations: [
          {
            at: at(10, 2),
            recordedAt: at(10, 2),
            stepId: 'bulk',
            elapsedInStepS: 3000,
            category: 'fermentation',
            kind: 'doughReady',
          },
        ],
      }),
    ]);
    expect(stats.readiness).toEqual({
      marks: 2,
      compared: 1,
      medianDifferenceS: 900,
      medianRecordedS: 4500,
      medianModelS: 3600,
    });
  });

  it('averages ratings by recipe', () => {
    const rating = (value: number) => ({
      at: at(15),
      recordedAt: at(15),
      category: 'other' as const,
      rating: value,
    });
    const stats = bakeStats([
      digest('a', 'pain', 'finished', 1, { observations: [rating(3)] }),
      digest('b', 'pain', 'finished', 2, { observations: [rating(4)] }),
      digest('c', 'pizza', 'finished', 3, { observations: [rating(5)] }),
    ]);
    expect(stats.ratings).toEqual([
      { recipeId: 'pizza', name: 'PIZZA', average: 5, n: 1 },
      { recipeId: 'pain', name: 'PAIN', average: 3.5, n: 2 },
    ]);
  });

  it('takes the median of odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('bake world', () => {
  const started = (origin?: 'physical' | 'simulation'): BakeEvent =>
    ({
      eventId: 'e1',
      bakeId: 'b',
      seq: 1,
      causationId: 'c',
      occurredAt: at(8),
      recordedAt: at(8),
      schemaVersion: 1,
      payload: { type: 'BakeStarted', snapshot: origin === undefined ? {} : { origin } },
    }) as unknown as BakeEvent;

  it('reads the origin of the start event; a bake without origin counts as real', () => {
    expect(bakeWorld([started('simulation')])).toBe('simulation');
    expect(bakeWorld([started('physical')])).toBe('physical');
    expect(bakeWorld([started()])).toBe('physical');
    expect(bakeWorld([])).toBe('physical');
  });
});

describe('results and cooking stages (history.md, Statistics, acceptance examples)', () => {
  const cook = (id: string, operation: string, done = true): StepDigest => ({
    id,
    operation,
    cooking: true,
    ...(done ? { startedAt: at(12), endedAt: at(13) } : {}),
  });
  const counts = (bake: BakeDigest) => {
    const stats = bakeStats([bake]);
    return { counts: stats.counts, stages: stats.cookingStages };
  };
  const results = (
    r: Partial<Record<'cooked' | 'dough' | 'cookedAndDough' | 'unknown', number>>,
  ) => ({
    cooked: 0,
    dough: 0,
    cookedAndDough: 0,
    unknown: 0,
    ...r,
  });

  it('frozen pizza dough: one finished dough, no stage', () => {
    const bake = digest('a', 'pizza', 'finished', 1, {
      outcome: { result: 'dough', dough: 'frozen' },
      outcomeSource: 'recipe',
    });
    expect(counts(bake)).toEqual({
      counts: { total: 1, finished: 1, abandoned: 0, active: 0, results: results({ dough: 1 }) },
      stages: [],
    });
  });

  it('bagels boiled twice then baked: one cooked result, three stages', () => {
    const bake = digest('a', 'bagel', 'finished', 1, {
      outcome: { result: 'cooked' },
      steps: [cook('boil', 'boil'), cook('boil-2', 'boil'), cook('bake', 'bake')],
    });
    expect(counts(bake).counts.results).toEqual(results({ cooked: 1 }));
    expect(counts(bake).stages).toEqual([
      { operation: 'boil', n: 2 },
      { operation: 'bake', n: 1 },
    ]);
  });

  it('a flatbread still active after its pan stage counts no result', () => {
    const bake = digest('a', 'flatbread', 'active', 1, {
      steps: [cook('pan', 'panCook'), cook('broil', 'bake', false)],
    });
    expect(counts(bake)).toEqual({
      counts: { total: 1, finished: 0, abandoned: 0, active: 1, results: results({}) },
      stages: [{ operation: 'panCook', n: 1 }],
    });
  });

  it('a finish without outcome is unknown, never cooked, whatever was baked', () => {
    const bake = digest('a', 'pain', 'finished', 1, {
      outcome: 'unknown',
      steps: [cook('bake', 'bake')],
    });
    expect(counts(bake).counts.results).toEqual(results({ unknown: 1 }));
    // A digest without the field (an older reader) reads the same.
    expect(counts(digest('b', 'pain', 'finished', 1)).counts.results).toEqual(
      results({ unknown: 1 }),
    );
  });

  it('an abandoned loaf keeps its stage but no result', () => {
    const bake = digest('a', 'pain', 'abandoned', 1, { steps: [cook('bake', 'bake')] });
    expect(counts(bake)).toEqual({
      counts: { total: 1, finished: 0, abandoned: 1, active: 0, results: results({}) },
      stages: [{ operation: 'bake', n: 1 }],
    });
  });

  it('a barbecue focaccia and a mixed result', () => {
    const stats = bakeStats([
      digest('a', 'focaccia', 'finished', 1, {
        outcome: { result: 'cooked' },
        steps: [cook('bbq', 'grill')],
      }),
      digest('b', 'pain', 'finished', 2, {
        outcome: { result: 'cookedAndDough', dough: 'frozen' },
        steps: [cook('bake', 'bake'), { id: 'proof', operation: 'proof', cooking: false }],
      }),
    ]);
    expect(stats.counts.results).toEqual(results({ cooked: 1, cookedAndDough: 1 }));
    expect(stats.cookingStages).toEqual([
      { operation: 'bake', n: 1 },
      { operation: 'grill', n: 1 },
    ]);
  });
});

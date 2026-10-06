import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  planIncorporations,
  projectProcess,
  resolveFormula,
  validateProcess,
  type Formula,
  type Instant,
  type Process,
  type ProcessStep,
  type Projection,
} from '../src/domain/index.js';

const H = 3600;
const at = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;
const evening = `2026-10-06T20:00:00.000Z` as Instant;

const step = (
  id: string,
  dependsOn: string[],
  hours: number | undefined,
  extra: Partial<ProcessStep> = {},
): ProcessStep => ({
  id,
  operation: id,
  dependsOn,
  schedule: 'asap',
  ...(hours === undefined ? {} : { plannedDurationS: hours * H }),
  ...extra,
});

/** Reference journey of #17: poolish + tangzhong, preheating during the final proof. */
const journey = (overrides: Partial<Record<string, Partial<ProcessStep>>> = {}): Process => ({
  steps: [
    step('poolish', [], 12),
    step('tangzhong', [], 1, { schedule: 'alap' }),
    step('mix', ['poolish', 'tangzhong'], 0.25),
    step('bulk', ['mix'], 3),
    step('shape', ['bulk'], 0.25),
    step('proof', ['shape'], 2),
    step('preheat', [], 1, { schedule: 'alap' }),
    step('bake', ['proof', 'preheat'], 40 / 60),
    step('cool', ['bake'], 2),
  ].map((s) => ({ ...s, ...overrides[s.id] }) as ProcessStep),
});

/** The process with step `id` left without a planned duration. */
const withoutDuration = (process: Process, id: string): Process => ({
  steps: process.steps.map((s) => {
    if (s.id !== id) return s;
    const { plannedDurationS, ...rest } = s;
    return rest;
  }),
});

const project = (process: Process, input: Parameters<typeof projectProcess>[1]): Projection => {
  const result = projectProcess(process, input);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const times = (projection: Projection, id: string) => {
  const s = projection.steps[id];
  return [s?.start, s?.end];
};

describe('projectProcess', () => {
  it('plans parallel preparations and preheating as late as their successors allow', () => {
    const p = project(journey(), { mode: { kind: 'startAt', at: evening } });
    expect(times(p, 'poolish')).toEqual([evening, at('08:00')]);
    expect(times(p, 'tangzhong')).toEqual([at('07:00'), at('08:00')]);
    expect(times(p, 'mix')).toEqual([at('08:00'), at('08:15')]);
    expect(times(p, 'proof')).toEqual([at('11:30'), at('13:30')]);
    expect(times(p, 'preheat')).toEqual([at('12:30'), at('13:30')]);
    expect(times(p, 'cool')).toEqual([at('14:10'), at('16:10')]);
  });

  it('moves a parallel alap step when an unrelated branch is delayed', () => {
    // Codex scenario: the proof is extended; preheating is not its successor but must follow.
    const p = project(journey({ proof: { plannedDurationS: 4 * H } }), {
      mode: { kind: 'startAt', at: evening },
    });
    expect(times(p, 'proof')).toEqual([at('11:30'), at('15:30')]);
    expect(times(p, 'preheat')).toEqual([at('14:30'), at('15:30')]);
  });

  it('plans backwards from a ready-by target', () => {
    const p = project(journey(), { mode: { kind: 'readyBy', at: at('16:10'), target: 'cool' } });
    expect(times(p, 'poolish')).toEqual([evening, at('08:00')]);
    expect(times(p, 'bake')).toEqual([at('13:30'), at('14:10')]);
  });

  it('freezes recorded facts and never plans before now', () => {
    const p = project(journey(), {
      mode: { kind: 'startAt', at: evening },
      facts: { poolish: { startedAt: evening, endedAt: at('08:30') } },
      now: at('08:30'),
    });
    expect(p.steps.poolish?.status).toBe('done');
    // The tangzhong was not made in time: it starts now and delays the mix.
    expect(times(p, 'tangzhong')).toEqual([at('08:30'), at('09:30')]);
    expect(times(p, 'mix')).toEqual([at('09:30'), at('09:45')]);
  });

  it('keeps an in-progress step at its recorded start', () => {
    const p = project(journey(), {
      mode: { kind: 'startAt', at: evening },
      facts: {
        poolish: { startedAt: evening, endedAt: at('08:00') },
        tangzhong: { startedAt: at('07:30') },
      },
      now: at('08:00'),
    });
    expect(p.steps.tangzhong?.status).toBe('inProgress');
    expect(times(p, 'mix')).toEqual([at('08:30'), at('08:45')]);
  });

  it('marks times blocked by an observed end criterion as unknown', () => {
    const process = journey({
      bulk: { endCriterion: { kind: 'observation', description: '+60 % volume' } },
    });
    const p = project(withoutDuration(process, 'bulk'), {
      mode: { kind: 'startAt', at: evening },
    });
    expect(times(p, 'bulk')).toEqual([at('08:15'), undefined]);
    expect(p.steps.bulk?.unknownAfter).toEqual(['bulk']);
    expect(p.steps.cool?.unknownAfter).toEqual(['bulk']);
    expect(p.steps.preheat?.unknownAfter).toEqual(['bulk']);
    expect(p.steps.mix?.unknownAfter).toEqual([]);
  });

  it('refuses ready-by after the bake started or with unknown durations', () => {
    expect(
      projectProcess(journey(), {
        mode: { kind: 'readyBy', at: at('16:10'), target: 'cool' },
        facts: { poolish: { startedAt: evening } },
      }),
    ).toMatchObject({ ok: false, error: { code: 'IncompatibleConstraint' } });
    expect(
      projectProcess(withoutDuration(journey(), 'bulk'), {
        mode: { kind: 'readyBy', at: at('16:10'), target: 'cool' },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'IncompatibleConstraint' },
    });
  });
});

describe('validateProcess', () => {
  const code = (process: Process) => {
    const result = validateProcess(process);
    return result.ok ? 'ok' : result.error.code;
  };

  it('accepts the reference journey', () => {
    expect(code(journey())).toBe('ok');
  });

  it('rejects alap steps without a successor or a duration', () => {
    expect(code({ steps: [step('a', [], 1, { schedule: 'alap' })] })).toBe('InvalidProcess');
    expect(
      code({ steps: [step('a', [], undefined, { schedule: 'alap' }), step('b', ['a'], 1)] }),
    ).toBe('InvalidProcess');
  });

  it('rejects lists that are not in dependency order, cycles and unknown references', () => {
    expect(code({ steps: [step('b', ['a'], 1), step('a', [], 1)] })).toBe('InvalidProcess');
    expect(code({ steps: [step('a', ['b'], 1), step('b', ['a'], 1)] })).toBe('DependencyCycle');
    expect(code({ steps: [step('a', ['x'], 1)] })).toBe('UnknownDependency');
  });
});

describe('planIncorporations', () => {
  const fixture = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL('../../../docs/contracts/fixtures/poolish-tangzhong.json', import.meta.url),
      ),
      'utf8',
    ),
  ) as { input: Formula };
  const resolved = resolveFormula(fixture.input);
  if (!resolved.ok) throw new Error('fixture does not resolve');
  const formula = resolved.value;

  const everything = [
    { item: 'flour', id: 'bread-flour', sharePct: 100 },
    { item: 'flour', id: 'whole-wheat', sharePct: 100 },
    { item: 'ingredient', id: 'salt', sharePct: 100 },
    { item: 'ingredient', id: 'instant-yeast', sharePct: 100 },
    { item: 'component', id: 'poolish', sharePct: 100 },
    { item: 'component', id: 'tangzhong', sharePct: 100 },
  ] as const;

  it('returns an empty plan when nothing is declared', () => {
    expect(planIncorporations(journey(), formula)).toEqual({ ok: true, value: {} });
  });

  it('splits staged water between steps in grams', () => {
    const process = journey({
      mix: { incorporations: [...everything, { item: 'water', sharePct: 80 }] },
      bulk: { incorporations: [{ item: 'water', sharePct: 20 }] },
    });
    const plan = planIncorporations(process, formula);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.value.mix?.find((a) => a.item === 'water')?.grams).toBeCloseTo(160, 9);
      expect(plan.value.bulk).toEqual([{ item: 'water', grams: 40 }]);
      expect(plan.value.mix?.find((a) => a.id === 'poolish')?.grams).toBeCloseTo(601, 9);
    }
  });

  it('rejects a plan that forgets part of the final mix', () => {
    const process = journey({
      mix: { incorporations: [...everything, { item: 'water', sharePct: 80 }] },
    });
    expect(planIncorporations(process, formula)).toMatchObject({
      ok: false,
      error: { code: 'IncompleteIncorporation', details: { item: 'water', sharePct: 80 } },
    });
  });

  it('rejects references outside the final mix', () => {
    const process = journey({
      mix: { incorporations: [{ item: 'ingredient', id: 'butter', sharePct: 100 }] },
    });
    expect(planIncorporations(process, formula)).toMatchObject({
      ok: false,
      error: { code: 'UnknownReference' },
    });
  });
});

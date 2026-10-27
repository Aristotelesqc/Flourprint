import { describe, expect, it } from 'vitest';
import {
  duplicateStep,
  moveStep,
  type Instant,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

/**
 * Step move and duplicate (process.md). Expected edges are the contract's hand-worked examples;
 * examples 11 to 14 need explicit subjects and `beforeTarget` steps (#106), so their legacy
 * equivalents are used here.
 */

const step = (
  id: string,
  dependsOn: string[] = [],
  extra: Partial<ProcessStep> = {},
): ProcessStep => ({
  id,
  operation: id.replace(/-\d+$/, ''),
  dependsOn,
  schedule: 'asap',
  plannedDurationS: 600,
  ...extra,
});

const edges = (process: Process): [string, readonly string[]][] =>
  process.steps.map((s) => [s.id, s.dependsOn]);

const moved = (process: Process, id: string, after: string | null) => {
  const result = moveStep(process, id, after);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const refusal = (process: Process, id: string, after: string | null) => {
  const result = moveStep(process, id, after);
  if (result.ok) throw new Error(`expected a refusal, got ${result.value.kind}`);
  return result.error;
};

// Example 1: mix, proof [mix], preheat [mix] (parallel), bake [proof, preheat].
const parallel: Process = {
  steps: [
    step('mix'),
    step('proof', ['mix']),
    step('preheat', ['mix']),
    step('bake', ['proof', 'preheat']),
  ],
};

// Example 3: a single chain.
const chain: Process = {
  steps: [
    step('mix'),
    step('bulk', ['mix']),
    step('shape', ['bulk']),
    step('proof', ['shape']),
    step('bake', ['proof']),
  ],
};

describe('moveStep', () => {
  it('example 1: identity is unchanged, every edge kept', () => {
    const result = moved(parallel, 'proof', 'mix');
    expect(result.kind).toBe('unchanged');
    expect(result.process).toBe(parallel);
    expect(moved(parallel, 'mix', null).kind).toBe('unchanged');
  });

  it('example 2: order only keeps every dependency', () => {
    const result = moved(parallel, 'preheat', 'mix');
    expect(result.kind).toBe('orderOnly');
    expect(edges(result.process)).toEqual([
      ['mix', []],
      ['preheat', ['mix']],
      ['proof', ['mix']],
      ['bake', ['proof', 'preheat']],
    ]);
    expect(result.process.steps.find((s) => s.id === 'preheat')).toEqual(parallel.steps[2]);
  });

  it('example 3: chain move rewrites the three edges', () => {
    const result = moved(chain, 'shape', 'mix');
    if (result.kind !== 'chain') throw new Error(result.kind);
    expect(edges(result.process)).toEqual([
      ['mix', []],
      ['shape', ['mix']],
      ['bulk', ['shape']],
      ['proof', ['bulk']],
      ['bake', ['proof']],
    ]);
    expect(result.changedEdges).toEqual([
      { step: 'proof', before: ['shape'], after: ['bulk'] },
      { step: 'shape', before: ['bulk'], after: ['mix'] },
      { step: 'bulk', before: ['mix'], after: ['shape'] },
    ]);
  });

  it('example 4: the join and the alap branch are kept', () => {
    const process: Process = {
      steps: [
        step('mix'),
        step('bulk', ['mix']),
        step('proof', ['bulk']),
        step('shape', ['proof']),
        step('preheat', [], { schedule: 'alap', plannedDurationS: 1800 }),
        step('bake', ['shape', 'preheat']),
      ],
    };
    const result = moved(process, 'shape', 'bulk');
    if (result.kind !== 'chain') throw new Error(result.kind);
    expect(edges(result.process)).toEqual([
      ['mix', []],
      ['bulk', ['mix']],
      ['shape', ['bulk']],
      ['proof', ['shape']],
      ['preheat', []],
      ['bake', ['proof', 'preheat']],
    ]);
    expect(result.changedEdges.map((e) => e.step)).toEqual(['bake', 'shape', 'proof']);
  });

  it('example 5: a target with two dependents is ambiguous', () => {
    const process: Process = {
      steps: [
        step('mix'),
        step('tangzhong', ['mix']),
        step('bulk', ['mix']),
        step('shape', ['bulk']),
        step('bake', ['shape', 'tangzhong']),
      ],
    };
    expect(refusal(process, 'shape', 'mix')).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'targetDependents' },
    });
  });

  it('example 6: an alap step that would precede its successor breaks dependencies', () => {
    const process: Process = {
      steps: [
        step('mix'),
        step('preheat', ['mix'], { schedule: 'alap', plannedDurationS: 1800 }),
        step('bake', ['preheat']),
      ],
    };
    expect(refusal(process, 'preheat', 'bake')).toMatchObject({
      code: 'MoveBreaksDependencies',
      details: { step: 'bake', dependsOn: 'preheat', path: 'steps[1].dependsOn' },
    });
  });

  it('example 7: an unknown step or target is a bad request, not a no-op', () => {
    expect(refusal(chain, 'missing', 'mix')).toMatchObject({
      code: 'UnknownReference',
      details: { path: 'stepId', id: 'missing' },
    });
    expect(refusal(chain, 'shape', 'missing')).toMatchObject({
      code: 'UnknownReference',
      details: { path: 'after' },
    });
    expect(refusal(chain, 'shape', 'shape')).toMatchObject({ code: 'UnknownReference' });
  });

  it('moves to the first position along the chain', () => {
    const result = moved(chain, 'bulk', null);
    if (result.kind !== 'chain') throw new Error(result.kind);
    expect(edges(result.process)).toEqual([
      ['bulk', []],
      ['mix', ['bulk']],
      ['shape', ['mix']],
      ['proof', ['shape']],
      ['bake', ['proof']],
    ]);
  });

  it('never moves a step below a step that depends on it', () => {
    expect(refusal(chain, 'bulk', 'shape')).toMatchObject({ code: 'MoveBreaksDependencies' });
  });

  it('refuses a step with several dependencies or dependents', () => {
    expect(refusal(parallel, 'bake', 'mix')).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'stepDependencies' },
    });
    const forked: Process = {
      steps: [
        step('mix'),
        step('bulk', ['mix']),
        step('a', ['bulk']),
        step('b', ['bulk']),
        step('c', ['b']),
      ],
    };
    expect(refusal(forked, 'c', 'bulk')).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'targetDependents' },
    });
    expect(refusal(forked, 'bulk', null)).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'stepDependents' },
    });
  });

  // Legacy equivalents of examples 12 and 13: the step whose id is a component's works on it.
  const poolish: Process = {
    steps: [
      step('poolish'),
      step('scale'),
      step('mix', ['poolish', 'scale'], {
        incorporations: [{ item: 'component', id: 'poolish', sharePct: 100 }],
      }),
      step('bulk', ['mix']),
      step('shape', ['bulk']),
    ],
  };

  it('a step that incorporates is moved by order only', () => {
    expect(refusal(poolish, 'mix', null)).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'incorporationStep' },
    });
  });

  it('a chain move never crosses into another workpiece', () => {
    // `poolish` works on the component, `mix` and `bulk` on the main dough.
    const withJoin: Process = {
      steps: [
        step('poolish'),
        step('mix', ['poolish']),
        step('bulk', ['mix'], {
          incorporations: [{ item: 'component', id: 'poolish', sharePct: 100 }],
        }),
      ],
    };
    expect(refusal(withJoin, 'bulk', null)).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'incorporationStep' },
    });
    expect(refusal(withJoin, 'mix', null)).toMatchObject({
      code: 'AmbiguousMove',
      details: { reason: 'crossesWorkpiece' },
    });
  });

  it('keeps the fields of a moved step and changes nothing on refusal', () => {
    const technique = { method: 'hand', folds: { count: 3, intervalS: 1800 } };
    const process: Process = {
      steps: chain.steps.map((s) => (s.id === 'shape' ? { ...s, technique } : s)),
    };
    const snapshot = JSON.stringify(process);
    const result = moved(process, 'shape', 'mix');
    expect(result.process.steps.find((s) => s.id === 'shape')?.technique).toEqual(technique);
    refusal(process, 'bulk', 'shape');
    expect(JSON.stringify(process)).toBe(snapshot);
  });
});

describe('duplicateStep', () => {
  const bulkChain = (extra: Partial<ProcessStep>): Process => ({
    steps: [
      step('mix'),
      step('bulk', ['mix'], { plannedDurationS: 10_800, ...extra }),
      step('shape', ['bulk']),
      step('bake', ['shape']),
    ],
  });
  const startAt = { mode: { kind: 'startAt' as const, at: '2026-10-18T08:00:00.000Z' as Instant } };

  it('example 8: a manual copy carries its duration and shifts the later steps', () => {
    const process = bulkChain({ technique: { method: 'hand' } });
    const result = duplicateStep(process, 'bulk', 'bulk-2', startAt);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(edges(result.value.process)).toEqual([
      ['mix', []],
      ['bulk', ['mix']],
      ['bulk-2', ['bulk']],
      ['shape', ['bulk-2']],
      ['bake', ['shape']],
    ]);
    expect(result.value.copy).toEqual({
      id: 'bulk-2',
      operation: 'bulk',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 10_800,
      technique: { method: 'hand' },
    });
    // mix 08:00-08:10, bulk 08:10-11:10, bulk-2 11:10-14:10, shape 14:10-14:20.
    expect(result.value.preview?.steps['shape']?.start).toBe('2026-10-18T14:10:00.000Z');
  });

  it('carries the thermal inputs of the original (process.md, Duplicate, 0.22.0)', () => {
    const thermal = {
      geometry: 'bulk' as const,
      container: { material: 'glass' as const, cover: 'lid' as const },
      environment: 'roomStill' as const,
      porosity: 'unproofed' as const,
    };
    const result = duplicateStep(bulkChain({ thermal }), 'bulk', 'bulk-2');
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.copy.thermal).toEqual(thermal);
    expect(result.value.notCarried).toEqual([]);
    // No thermal inputs on the original: none on the copy.
    const plain = duplicateStep(bulkChain({}), 'bulk', 'bulk-2');
    expect(plain.ok && 'thermal' in plain.value.copy).toBe(false);
  });

  it('example 9: a model-driven copy has no duration and blocks the later steps', () => {
    const process = bulkChain({
      plannedDurationS: 21_600,
      durationMode: 'model',
      incorporations: [{ item: 'water', sharePct: 10 }],
    });
    const result = duplicateStep(process, 'bulk', 'bulk-2', startAt);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.copy.plannedDurationS).toBeUndefined();
    expect(result.value.copy.durationMode).toBeUndefined();
    expect(result.value.copy.incorporations).toBeUndefined();
    expect(result.value.notCarried).toEqual(['incorporations', 'durationMode', 'plannedDurationS']);
    expect(result.value.preview?.steps['shape']).toMatchObject({ unknownAfter: ['bulk-2'] });
    expect(result.value.preview?.steps['shape']?.start).toBeUndefined();
  });

  it('example 10: alap, beforeTarget and component steps are not duplicable', () => {
    const process: Process = {
      steps: [
        step('poolish'),
        step('mix', ['poolish'], {
          incorporations: [{ item: 'component', id: 'poolish', sharePct: 100 }],
        }),
        step('preheat', [], { schedule: 'alap', plannedDurationS: 1800 }),
        step('warm', ['mix'], {
          operation: 'preheat',
          schedule: 'beforeTarget',
          target: 'bake',
          requiredWarmupS: 1800,
        }),
        step('bake', ['mix', 'preheat']),
      ],
    };
    for (const [id, reason] of [
      ['preheat', 'alap'],
      ['warm', 'beforeTarget'],
      ['poolish', 'workpieceStep'],
    ] as const) {
      expect(duplicateStep(process, id, `${id}-2`)).toMatchObject({
        ok: false,
        error: { code: 'NotDuplicable', details: { reason } },
      });
    }
  });

  it('refuses an unknown step and a taken id', () => {
    const process = bulkChain({});
    expect(duplicateStep(process, 'missing', 'x')).toMatchObject({
      ok: false,
      error: { code: 'UnknownReference' },
    });
    expect(duplicateStep(process, 'bulk', 'shape')).toMatchObject({
      ok: false,
      error: { code: 'DuplicateNodeId' },
    });
  });
});

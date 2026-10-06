import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  isTopologicalOrder,
  topologicalSort,
  validateReferences,
  type GraphNode,
} from '../src/domain/index.js';

const node = (id: string, ...dependsOn: string[]): GraphNode => ({ id, dependsOn });

describe('topologicalSort', () => {
  it('returns a valid order unchanged', () => {
    const nodes = [node('poolish'), node('tangzhong'), node('mix', 'poolish', 'tangzhong')];
    expect(topologicalSort(nodes)).toEqual({ ok: true, value: ['poolish', 'tangzhong', 'mix'] });
  });

  it('orders dependencies first, ties broken by input position', () => {
    const nodes = [node('load', 'proof', 'preheat'), node('proof'), node('preheat')];
    expect(topologicalSort(nodes)).toEqual({ ok: true, value: ['proof', 'preheat', 'load'] });
  });

  it('reports a cycle with its path', () => {
    const result = topologicalSort([node('a', 'c'), node('b', 'a'), node('c', 'b')]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DependencyCycle');
      const { cycle } = result.error.details as { cycle: string[] };
      expect(cycle[0]).toBe(cycle[cycle.length - 1]);
      expect(new Set(cycle)).toEqual(new Set(['a', 'b', 'c']));
    }
  });

  it('rejects unknown, self and duplicate references', () => {
    expect(validateReferences([node('a', 'x')])).toMatchObject({
      ok: false,
      error: { code: 'UnknownDependency' },
    });
    expect(validateReferences([node('a', 'a')])).toMatchObject({
      ok: false,
      error: { code: 'SelfDependency' },
    });
    expect(validateReferences([node('a'), node('a')])).toMatchObject({
      ok: false,
      error: { code: 'DuplicateNodeId' },
    });
  });
});

describe('isTopologicalOrder', () => {
  it('accepts lists where dependencies come first', () => {
    expect(isTopologicalOrder([node('a'), node('b', 'a')])).toBe(true);
    expect(isTopologicalOrder([node('b', 'a'), node('a')])).toBe(false);
  });
});

/** Random DAG: node i may only depend on nodes with a smaller index, then shuffled. */
const arbitraryDag = fc
  .integer({ min: 1, max: 25 })
  .chain((size) =>
    fc.tuple(
      fc.array(fc.array(fc.nat(), { maxLength: 4 }), { minLength: size, maxLength: size }),
      fc.shuffledSubarray(
        Array.from({ length: size }, (_, i) => i),
        { minLength: size, maxLength: size },
      ),
    ),
  )
  .map(([picks, permutation]) => {
    const nodes = picks.map((deps, i) =>
      node(`s${i}`, ...(i === 0 ? [] : [...new Set(deps.map((d) => `s${d % i}`))])),
    );
    return permutation.map((i) => nodes[i] as GraphNode);
  });

describe('topologicalSort properties', () => {
  it('orders every random DAG so that dependencies precede dependents', () => {
    fc.assert(
      fc.property(arbitraryDag, (nodes) => {
        const result = topologicalSort(nodes);
        if (!result.ok) return false;
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const ordered = result.value.map((id) => byId.get(id) as GraphNode);
        return ordered.length === nodes.length && isTopologicalOrder(ordered);
      }),
    );
  });

  it('detects a cycle whenever a back edge is added to a chain', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (size) => {
        const chain = Array.from({ length: size }, (_, i) =>
          i === 0 ? node('s0', `s${size - 1}`) : node(`s${i}`, `s${i - 1}`),
        );
        const result = topologicalSort(chain);
        return !result.ok && result.error.code === 'DependencyCycle';
      }),
    );
  });
});

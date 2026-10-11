import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyFormulaEdit,
  resolveFormula,
  type Formula,
  type FormulaEdit,
} from '../src/domain/index.js';

/** Runs the engine against the hand-computed reference fixtures (docs/contracts/fixtures). */
const fixturesDir = fileURLToPath(new URL('../../../docs/contracts/fixtures', import.meta.url));

interface Fixture {
  id: string;
  input: Formula;
  expected?: unknown;
  edits?: Array<{ id: string; command: FormulaEdit; expected: unknown }>;
  variants?: Array<{
    id: string;
    change: Record<string, unknown>;
    expected?: unknown;
    expectedError?: { code: string; details?: unknown };
  }>;
  tolerance: { relative: number };
}

const fixtures: Fixture[] = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as Fixture);

/** Every value in `expected` must be present in `actual`; numbers within `relative` tolerance. */
const mismatches = (actual: unknown, expected: unknown, relative: number, path = '$'): string[] => {
  if (typeof expected === 'number') {
    const ok =
      typeof actual === 'number' &&
      Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected));
    return ok ? [] : [`${path}: expected ${expected}, got ${String(actual)}`];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
    }
    return expected.flatMap((item, i) => mismatches(actual[i], item, relative, `${path}[${i}]`));
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return [`${path}: missing object`];
    return Object.entries(expected).flatMap(([key, value]) =>
      mismatches((actual as Record<string, unknown>)[key], value, relative, `${path}.${key}`),
    );
  }
  return actual === expected
    ? []
    : [`${path}: expected ${String(expected)}, got ${String(actual)}`];
};

/** Applies a fixture `change`; array segments select the element with the matching `id`. */
const withChange = (formula: Formula, change: Record<string, unknown>): Formula => {
  const copy = structuredClone(formula) as unknown as Record<string, unknown>;
  for (const [path, value] of Object.entries(change)) {
    const keys = path.split('.');
    const last = keys.pop() as string;
    let node: unknown = copy;
    for (const key of keys) {
      node = Array.isArray(node)
        ? node.find((item: { id?: string }) => item.id === key)
        : (node as Record<string, unknown>)[key];
    }
    (node as Record<string, unknown>)[last] = value;
  }
  return copy as unknown as Formula;
};

describe.each(fixtures)('fixture $id', (fixture) => {
  const tolerance = fixture.tolerance.relative;

  it('resolves to the expected values', () => {
    const resolved = resolveFormula(fixture.input);
    expect(resolved.ok, JSON.stringify(resolved)).toBe(true);
    if (resolved.ok && fixture.expected) {
      expect(mismatches(resolved.value, fixture.expected, tolerance)).toEqual([]);
    }
  });

  it.each(fixture.edits ?? [])('edit $id', (edit) => {
    const edited = applyFormulaEdit(fixture.input, edit.command);
    expect(edited.ok, JSON.stringify(edited)).toBe(true);
    if (!edited.ok) return;
    const resolved = resolveFormula(edited.value);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(mismatches(resolved.value, edit.expected, tolerance)).toEqual([]);
  });

  it.each(fixture.variants ?? [])('variant $id', (variant) => {
    const resolved = resolveFormula(withChange(fixture.input, variant.change));
    if (variant.expectedError) {
      expect(resolved.ok).toBe(false);
      if (!resolved.ok) {
        expect(mismatches(resolved.error, variant.expectedError, tolerance)).toEqual([]);
      }
      return;
    }
    expect(resolved.ok, JSON.stringify(resolved)).toBe(true);
    if (resolved.ok) expect(mismatches(resolved.value, variant.expected, tolerance)).toEqual([]);
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Sanity checks of the reference fixtures themselves (docs/contracts/fixtures). They do not use
 * the engine: they only guard the hand-computed values against typos and broken mass balances.
 */
const fixturesDir = fileURLToPath(new URL('../../../docs/contracts/fixtures', import.meta.url));

interface Fixture {
  format: string;
  id: string;
  input: { anchor: { kind: string; grams?: number } };
  expected: {
    flourTotal: number;
    grams: Record<string, number>;
    doughWeight: number;
    pureWaterTotal: number;
    pureWaterPct: number;
    totalWater: { value: number };
    totalWaterPct: number;
    components?: Record<string, { mass: number; waterLoss?: number }>;
    finalMix?: {
      flourByFlour: Record<string, number>;
      water: number;
      grams: Record<string, number>;
    };
  };
  edits?: Array<{ expected: Record<string, unknown>; exact?: Record<string, string> }>;
  tolerance: { relative: number };
}

const fixtures: Fixture[] = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as Fixture);

const sum = (values: Record<string, number>): number =>
  Object.values(values).reduce((total, value) => total + value, 0);

const close = (actual: number, expected: number, relative: number): boolean =>
  Math.abs(actual - expected) <= relative * Math.max(1, Math.abs(expected));

const fraction = (text: string): number => {
  const [numerator, denominator = '1'] = text.split('/');
  return Number(numerator) / Number(denominator);
};

const at = (object: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], object);

describe('reference fixtures', () => {
  it('exist', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it.each(fixtures)('$id declares the fixture format', (fixture) => {
    expect(fixture.format).toBe('flourprint-fixture/0');
  });

  it.each(fixtures)('$id balances dough mass', (fixture) => {
    const { expected } = fixture;
    const losses = sum(
      Object.fromEntries(
        Object.entries(expected.components ?? {}).map(([id, c]) => [id, c.waterLoss ?? 0]),
      ),
    );
    expect(expected.flourTotal + sum(expected.grams) - losses).toBeCloseTo(expected.doughWeight, 9);
  });

  it.each(fixtures)('$id final mix plus components equals the dough', (fixture) => {
    const { expected } = fixture;
    if (!expected.finalMix || !expected.components) return;
    const finalMixMass =
      sum(expected.finalMix.flourByFlour) + expected.finalMix.water + sum(expected.finalMix.grams);
    const componentMass = sum(
      Object.fromEntries(Object.entries(expected.components).map(([id, c]) => [id, c.mass])),
    );
    expect(finalMixMass + componentMass).toBeCloseTo(expected.doughWeight, 9);
  });

  it.each(fixtures)('$id water percentages use points of total flour', (fixture) => {
    const { expected } = fixture;
    expect(expected.pureWaterPct).toBeCloseTo(
      (100 * expected.pureWaterTotal) / expected.flourTotal,
      9,
    );
    expect(expected.totalWaterPct).toBeCloseTo(
      (100 * expected.totalWater.value) / expected.flourTotal,
      9,
    );
  });

  it.each(fixtures)('$id decimal values match their exact fractions', (fixture) => {
    for (const edit of fixture.edits ?? []) {
      for (const [path, exact] of Object.entries(edit.exact ?? {})) {
        const value = at(edit.expected, path);
        expect(typeof value, path).toBe('number');
        expect(close(value as number, fraction(exact), fixture.tolerance.relative), path).toBe(
          true,
        );
      }
    }
  });
});

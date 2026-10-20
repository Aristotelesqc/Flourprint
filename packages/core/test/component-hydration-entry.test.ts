import { describe, expect, it } from 'vitest';
import {
  hydrationForLiquidRatio,
  liquidRatioPct,
  type Component,
  type ContentPct,
  type Formula,
} from '../src/domain/index.js';

/**
 * Hydration entry (formula.md), computed by hand from the Shokupan milk tangzhong: 14 g flour,
 * 43 g water and 43 g milk at 89 % water, in a formula of 280 g flour.
 * Stored hydrationPct = 100 × 43 / 14 = 307.142857…; the milk brings 0.89 × 43 = 38.27 g of water,
 * 273.357142… points of the component flour; read hydration = 580.5 %.
 */
const milkTangzhong: Component = {
  id: 'tangzhong',
  kind: 'scald',
  flourPct: 5,
  flourBlend: [{ flour: 'bread', sharePct: 100 }],
  hydrationPct: (100 * 43) / 14,
  allocations: [{ ingredient: 'milk', bakerPct: (100 * 43) / 280 }],
};

const formula = (milkWater: ContentPct): Formula => ({
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 60, role: 'dough' },
    { id: 'milk', kind: 'other', bakerPct: 30, role: 'dough', water: milkWater },
  ],
  components: [milkTangzhong],
  anchor: { kind: 'flourTotal', grams: 280 },
});

const known = formula({ status: 'known', valuePct: 89, source: 'test' });

describe('hydration entry of a component', () => {
  it('reads 580.5 % and inverts back to the stored value', () => {
    expect(liquidRatioPct(known, milkTangzhong)).toBeCloseTo(580.5, 9);
    expect(milkTangzhong.hydrationPct).toBeCloseTo(307.142857142857, 9);
    const same = hydrationForLiquidRatio(known, milkTangzhong, 580.5);
    expect(same.ok && same.value).toBeCloseTo((100 * 43) / 14, 9);
  });

  it('typing 500 % stores 226.642857… %, that is 31.73 g of pool water', () => {
    const result = hydrationForLiquidRatio(known, milkTangzhong, 500);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value).toBeCloseTo(226.642857142857, 9);
    expect((14 * result.value) / 100).toBeCloseTo(31.73, 9);
    expect(liquidRatioPct(known, { ...milkTangzhong, hydrationPct: result.value })).toBeCloseTo(
      500,
      9,
    );
  });

  it('accepts the milk water exactly and stores no pool water', () => {
    // 100 × (0.89 × 43 / 280 × 100) / 5 = 273.357142…
    const milkOnly = (100 * ((0.89 * 43 * 100) / 280)) / 5;
    expect(milkOnly).toBeCloseTo(273.357142857, 9);
    expect(hydrationForLiquidRatio(known, milkTangzhong, milkOnly)).toEqual({ ok: true, value: 0 });
  });

  it('equals hydrationPct without allocations', () => {
    const plain = { ...milkTangzhong, allocations: [] };
    expect(hydrationForLiquidRatio(known, plain, 500)).toEqual({ ok: true, value: 500 });
    expect(hydrationForLiquidRatio(known, plain, 0)).toEqual({ ok: true, value: 0 });
    expect(hydrationForLiquidRatio(known, plain, -5)).toMatchObject({
      ok: false,
      error: {
        code: 'InvalidFormula',
        details: { path: 'hydration', reason: 'the hydration must be ≥ 0' },
      },
    });
  });

  it('refuses a target below the milk water, an unknown water, no flour and non-finite input', () => {
    const reason = (f: Formula, c: Component, t: number) => {
      const r = hydrationForLiquidRatio(f, c, t);
      return r.ok ? undefined : r.error.message;
    };
    // The milk alone brings 273.357… points.
    expect(reason(known, milkTangzhong, 273)).toMatch(/allocated/);
    expect(reason(known, milkTangzhong, 273.36)).toBeUndefined();
    expect(reason(formula({ status: 'unknown' }), milkTangzhong, 500)).toMatch(/unknown/);
    expect(reason(known, { ...milkTangzhong, flourPct: 0 }, 500)).toMatch(/no flour/);
    expect(reason(known, milkTangzhong, Number.NaN)).toMatch(/finite/);
    expect(reason(known, milkTangzhong, Infinity)).toMatch(/finite/);
    expect(hydrationForLiquidRatio(known, milkTangzhong, 273)).toMatchObject({
      ok: false,
      error: { code: 'InvalidFormula', details: { path: 'hydration' } },
    });
  });
});

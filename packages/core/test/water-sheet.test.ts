import { describe, expect, it } from 'vitest';
import { resolveFormula, waterSheet, type Formula, type Ingredient } from '../src/domain/index.js';

// Expected values are worked by hand in docs/contracts/formula.md (Hydration sheet read model).

const other = (id: string, bakerPct: number, valuePct: number): Ingredient => ({
  id,
  kind: 'other',
  bakerPct,
  role: 'dough',
  water: { status: 'known', valuePct },
});

const base: Formula = {
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
    other('milk', 10, 87),
    other('cream', 2, 86.5),
    other('honey', 2, 17),
    other('syrup', 0.5, 20),
    other('malt', 0.2, 30),
    other('spice', 0.1, 40),
    {
      id: 'seeds',
      kind: 'other',
      bakerPct: 0.1,
      role: 'dough',
      water: { status: 'estimated', valuePct: 35, rangePct: [30, 40] },
    },
    other('salt', 2, 0),
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};

const resolve = (formula: Formula) => {
  const res = resolveFormula(formula);
  if (!res.ok) throw new Error('formula should resolve');
  return res.value;
};

const displaySum = (rows: readonly { displayGrams: number }[]) =>
  Math.round(rows.reduce((t, r) => t + r.displayGrams, 0) * 1e9) / 1e9;

describe('waterSheet (formula.md, Hydration sheet read model)', () => {
  it('example 1: groups sources under 1 g and rounds so the rows add up', () => {
    const sheet = waterSheet(resolve(base));
    expect(sheet.rows.map((r) => [r.kind, r.sources, r.displayGrams])).toEqual([
      ['source', ['water'], 700],
      ['source', ['milk'], 87],
      ['source', ['cream'], 17],
      ['source', ['honey'], 4],
      ['source', ['syrup'], 1],
      ['others', ['malt', 'spice', 'seeds'], 1],
    ]);
    expect(sheet.displayTotalGrams).toBe(810);
    expect(displaySum(sheet.rows)).toBe(sheet.displayTotalGrams);
    expect(sheet.totalGrams).toBeCloseTo(810.05, 9);
    expect(sheet.completeness).toBe('complete');
    // Rounding each row on its own would give 809, which is not the displayed total.
    expect(sheet.rows.reduce((t, r) => t + Math.round(r.grams), 0)).toBe(809);

    const others = sheet.rows[5];
    expect(others?.grams).toBeCloseTo(1.35, 9);
    expect(others?.status).toBe('estimated');
    expect(others?.range?.[0]).toBeCloseTo(1.3, 9);
    expect(others?.range?.[1]).toBeCloseTo(1.4, 9);
    // The engine keeps full precision: rows carry the unrounded grams.
    expect(sheet.rows[3]?.grams).toBeCloseTo(3.4, 9);
    expect(sheet.rows[3]?.sharePct).toBeCloseTo((100 * 3.4) / 810.05, 9);
    expect(sheet.unknownSources).toEqual([]);
  });

  it('keeps a source of exactly the threshold as its own row', () => {
    const sheet = waterSheet(resolve(base));
    const syrup = sheet.rows.find((r) => r.sources[0] === 'syrup');
    expect(syrup?.kind).toBe('source');
    expect(syrup?.grams).toBeCloseTo(1, 9);
  });

  it('example 2: threshold 5 g', () => {
    const sheet = waterSheet(resolve(base), { thresholdGrams: 5 });
    expect(sheet.rows.map((r) => [r.kind, r.sources, r.displayGrams])).toEqual([
      ['source', ['water'], 700],
      ['source', ['milk'], 87],
      ['source', ['cream'], 17],
      ['others', ['honey', 'syrup', 'malt', 'spice', 'seeds'], 6],
    ]);
    expect(sheet.rows[3]?.grams).toBeCloseTo(5.75, 9);
    expect(sheet.displayTotalGrams).toBe(810);
    expect(displaySum(sheet.rows)).toBe(810);
  });

  it('example 3: step 0.1 g, half rounds up', () => {
    const sheet = waterSheet(resolve(base), { stepGrams: 0.1 });
    expect(sheet.rows.map((r) => r.displayGrams)).toEqual([700, 87, 17.3, 3.4, 1, 1.4]);
    expect(sheet.displayTotalGrams).toBe(810.1);
    expect(displaySum(sheet.rows)).toBe(810.1);
  });

  it('groups nothing with a threshold of 0 and no others row when none is small', () => {
    const none = waterSheet(resolve(base), { thresholdGrams: 0 });
    expect(none.rows.some((r) => r.kind === 'others')).toBe(false);
    expect(none.rows).toHaveLength(8);
    expect(displaySum(none.rows)).toBe(none.displayTotalGrams);

    const lean = waterSheet(resolve({ ...base, ingredients: base.ingredients.slice(0, 2) }));
    expect(lean.rows.map((r) => r.kind)).toEqual(['source', 'source']);
  });

  it('shows a single small source as an others row', () => {
    const formula: Formula = {
      ...base,
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
        other('spice', 0.1, 40),
      ],
    };
    const sheet = waterSheet(resolve(formula));
    expect(sheet.rows.map((r) => [r.kind, r.sources, r.displayGrams])).toEqual([
      ['source', ['water'], 700],
      ['others', ['spice'], 0],
    ]);
    expect(sheet.displayTotalGrams).toBe(700);
  });

  it('example 4: a loss under 1 g is its own row, never grouped, and has no share', () => {
    const formula: Formula = {
      flours: [{ id: 'bread', sharePct: 100 }],
      ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
      components: [
        {
          id: 'poolish',
          kind: 'preferment',
          flourPct: 1,
          hydrationPct: 100,
          waterLossPct: 4,
          flourBlend: [{ flour: 'bread', sharePct: 100 }],
        },
      ],
      anchor: { kind: 'flourTotal', grams: 1000 },
    };
    const sheet = waterSheet(resolve(formula));
    expect(sheet.rows).toHaveLength(2);
    const [water, loss] = sheet.rows;
    expect(water).toMatchObject({ kind: 'source', displayGrams: 700, sharePct: 100 });
    expect(loss).toMatchObject({ kind: 'loss', sources: ['poolish'], displayGrams: 0 });
    expect(loss?.grams).toBeCloseTo(-0.4, 9);
    expect(loss?.sharePct).toBeUndefined();
    expect(sheet.totalGrams).toBeCloseTo(699.6, 9);
    expect(sheet.displayTotalGrams).toBe(700);
  });

  it('example 5: an unknown contributor is listed apart and makes the total incomplete', () => {
    const formula: Formula = {
      ...base,
      ingredients: [
        ...base.ingredients,
        { id: 'tahini', kind: 'other', bakerPct: 1, role: 'dough' },
      ],
    };
    const sheet = waterSheet(resolve(formula));
    expect(sheet.unknownSources).toEqual(['tahini']);
    expect(sheet.completeness).toBe('incomplete');
    expect(sheet.rows.map((r) => r.displayGrams)).toEqual([700, 87, 17, 4, 1, 1]);
    expect(sheet.displayTotalGrams).toBe(810);
    expect(sheet.rows.flatMap((r) => r.sources)).not.toContain('tahini');
  });

  it('rejects an invalid threshold or step', () => {
    const resolved = resolve(base);
    expect(() => waterSheet(resolved, { stepGrams: 0 })).toThrow(RangeError);
    expect(() => waterSheet(resolved, { stepGrams: Number.NaN })).toThrow(RangeError);
    expect(() => waterSheet(resolved, { thresholdGrams: -1 })).toThrow(RangeError);
  });
});

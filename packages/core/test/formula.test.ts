import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyFormulaEdit,
  resolveFormula,
  sum,
  type Anchor,
  type Formula,
  type ResolvedFormula,
} from '../src/domain/index.js';

const close = (actual: number, expected: number) =>
  Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected));

const resolved = (formula: Formula): ResolvedFormula => {
  const result = resolveFormula(formula);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const edited = (formula: Formula, edit: Parameters<typeof applyFormulaEdit>[1]): Formula => {
  const result = applyFormulaEdit(formula, edit);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const anchorArb: fc.Arbitrary<Anchor> = fc.oneof(
  fc
    .double({ min: 50, max: 5000, noNaN: true })
    .map((grams) => ({ kind: 'flourTotal', grams }) as const),
  fc
    .double({ min: 100, max: 8000, noNaN: true })
    .map((grams) => ({ kind: 'doughWeight', grams }) as const),
  fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.double({ min: 50, max: 2000, noNaN: true }))
    .map(([count, gramsEach]) => ({ kind: 'pieces', count, gramsEach }) as const),
);

/** Valid random formulas: components draw at most 40 % of each flour and of the water. */
const formulaArb: fc.Arbitrary<Formula> = fc
  .record({
    weights: fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 3 }),
    waterPct: fc.double({ min: 50, max: 100, noNaN: true }),
    saltPct: fc.double({ min: 0, max: 3, noNaN: true }),
    milkPct: fc.option(fc.double({ min: 1, max: 40, noNaN: true }), { nil: undefined }),
    components: fc.array(
      fc.record({
        flourPct: fc.double({ min: 0, max: 20, noNaN: true }),
        hydrationPct: fc.double({ min: 0, max: 100, noNaN: true }),
        waterLossPct: fc.double({ min: 0, max: 20, noNaN: true }),
      }),
      { maxLength: 2 },
    ),
    anchor: anchorArb,
  })
  .map(({ weights, waterPct, saltPct, milkPct, components, anchor }) => {
    const total = sum(weights);
    const flours = weights.map((w, i) => ({ id: `flour-${i}`, sharePct: (100 * w) / total }));
    return {
      flours,
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: waterPct, role: 'dough' },
        {
          id: 'salt',
          kind: 'other',
          bakerPct: saltPct,
          role: 'dough',
          water: { status: 'known', valuePct: 0 },
        },
        ...(milkPct === undefined
          ? []
          : [
              {
                id: 'milk',
                kind: 'other',
                bakerPct: milkPct,
                role: 'dough',
                water: { status: 'known', valuePct: 87 },
              } as const,
            ]),
      ],
      // Every component draws proportionally from all flours, so 40 % of each flour suffices.
      components: components.map((c, i) => ({
        id: `component-${i}`,
        kind: 'preferment',
        flourBlend: flours.map((f) => ({ flour: f.id, sharePct: f.sharePct })),
        ...c,
      })),
      anchor,
    } satisfies Formula;
  });

describe('resolveFormula properties', () => {
  it('balances dough mass', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const r = resolved(formula);
        const doughGrams = sum(Object.values(r.grams));
        const finalMix =
          sum(Object.values(r.finalMix.flourByFlour)) +
          r.finalMix.water +
          sum(Object.values(r.finalMix.grams)) +
          sum(Object.values(r.finalMix.componentMasses));
        return (
          close(r.doughWeight, r.flourTotal + doughGrams - r.losses) &&
          close(finalMix, r.doughWeight) &&
          close(sum(Object.values(r.flourByFlour)), r.flourTotal)
        );
      }),
    );
  });

  it('reproduces the anchor', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const r = resolved(formula);
        const { anchor } = formula;
        if (anchor.kind === 'flourTotal') return close(r.flourTotal, anchor.grams);
        const weight = anchor.kind === 'pieces' ? anchor.count * anchor.gramsEach : anchor.grams;
        return close(r.doughWeight, weight);
      }),
    );
  });

  it('scales every mass linearly with the anchor and keeps percentages', () => {
    fc.assert(
      fc.property(formulaArb, fc.double({ min: 0.1, max: 10, noNaN: true }), (formula, k) => {
        const before = resolved(formula);
        const after = resolved(
          edited(formula, {
            type: 'SetAnchor',
            mode: 'rescale',
            anchor: { kind: 'flourTotal', grams: before.flourTotal * k },
          }),
        );
        return (
          Object.entries(before.grams).every(([id, g]) => close(after.grams[id] ?? NaN, g * k)) &&
          close(after.doughWeight, before.doughWeight * k) &&
          close(after.pureWaterPct, before.pureWaterPct)
        );
      }),
    );
  });

  it('keeps every other mass when editing grams with otherGrams', () => {
    fc.assert(
      fc.property(formulaArb, fc.double({ min: 0, max: 100, noNaN: true }), (formula, g) => {
        const before = resolved(formula);
        const after = resolved(
          edited(formula, { type: 'SetIngredientGrams', ingredient: 'salt', grams: g }),
        );
        return (
          close(after.grams.salt ?? NaN, g) &&
          close(after.grams.water ?? NaN, before.grams.water ?? NaN) &&
          close(after.flourTotal, before.flourTotal) &&
          Object.entries(before.components).every(([id, c]) =>
            close(after.components[id]?.mass ?? NaN, c.mass),
          ) &&
          after.anchor.kind === formula.anchor.kind
        );
      }),
    );
  });

  it('keeps the anchor when editing grams with hold anchor', () => {
    fc.assert(
      fc.property(formulaArb, fc.double({ min: 0, max: 20, noNaN: true }), (formula, g) => {
        const after = resolved(
          edited(formula, {
            type: 'SetIngredientGrams',
            ingredient: 'salt',
            grams: g,
            hold: 'anchor',
          }),
        );
        return (
          close(after.grams.salt ?? NaN, g) &&
          JSON.stringify(after.anchor) === JSON.stringify(formula.anchor)
        );
      }),
    );
  });
});

const lean: Formula = {
  flours: [
    { id: 'bread', sharePct: 80 },
    { id: 'rye', sharePct: 20 },
  ],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
    },
    { id: 'seeds', kind: 'other', bakerPct: 5, role: 'topping' },
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};

const errorCode = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? 'ok' : result.error?.code;

describe('formula edits and errors', () => {
  it('excludes toppings from dough weight, final mix and water balance', () => {
    const r = resolved(lean);
    expect(r.grams.seeds).toBe(50);
    expect(r.doughWeight).toBe(1720);
    expect(r.finalMix.grams).not.toHaveProperty('seeds');
    expect(r.totalWater.completeness).toBe('complete');
  });

  it('treats a missing water content as unknown', () => {
    const r = resolved({
      ...lean,
      ingredients: [
        ...lean.ingredients,
        { id: 'yeast', kind: 'other', bakerPct: 1, role: 'dough' },
      ],
    });
    expect(r.totalWater.completeness).toBe('incomplete');
    expect(r.totalWater.unknownContributors).toEqual(['yeast']);
  });

  it('rejects SetBakerPct on a flour', () => {
    expect(
      errorCode(applyFormulaEdit(lean, { type: 'SetBakerPct', ingredient: 'rye', pct: 30 })),
    ).toBe('IncompatibleConstraint');
  });

  it('needs an absorbing flour to edit a flour while holding the anchor', () => {
    const edit = {
      type: 'SetIngredientGrams',
      ingredient: 'rye',
      grams: 300,
      hold: 'anchor',
    } as const;
    expect(errorCode(applyFormulaEdit(lean, edit))).toBe('IncompatibleConstraint');
    const r = resolved(edited(lean, { ...edit, absorbInto: 'bread' }));
    expect(r.flourByFlour).toEqual({ bread: 700, rye: 300 });
    expect(r.flourTotal).toBe(1000);
  });

  it('changes total flour when editing a flour with otherGrams', () => {
    const r = resolved(edited(lean, { type: 'SetIngredientGrams', ingredient: 'rye', grams: 300 }));
    expect(r.flourTotal).toBeCloseTo(1100, 9);
    expect(r.grams.water).toBeCloseTo(700, 9);
    expect(r.anchor).toEqual({ kind: 'flourTotal', grams: 1100 });
  });

  it('keeps the piece count and recomputes the piece weight with otherGrams', () => {
    const pieces = { ...lean, anchor: { kind: 'pieces', count: 2, gramsEach: 860 } } as const;
    const r = resolved(
      edited(pieces, { type: 'SetIngredientGrams', ingredient: 'salt', grams: 22 }),
    );
    expect(r.anchor).toEqual({ kind: 'pieces', count: 2, gramsEach: 861 });
  });

  it('reinterprets the anchor without changing grams', () => {
    const r = resolved(
      edited(lean, { type: 'SetAnchor', mode: 'reinterpret', kind: 'pieces', count: 4 }),
    );
    expect(r.anchor).toEqual({ kind: 'pieces', count: 4, gramsEach: 430 });
    expect(r.flourTotal).toBeCloseTo(1000, 9);
    expect(
      errorCode(applyFormulaEdit(lean, { type: 'SetAnchor', mode: 'reinterpret', kind: 'pieces' })),
    ).toBe('IncompatibleConstraint');
  });

  it('rejects an ingredient heavier than the anchored dough', () => {
    const anchored = { ...lean, anchor: { kind: 'doughWeight', grams: 1000 } } as const;
    expect(
      errorCode(
        applyFormulaEdit(anchored, {
          type: 'SetIngredientGrams',
          ingredient: 'salt',
          grams: 1000,
          hold: 'anchor',
        }),
      ),
    ).toBe('IncompatibleConstraint');
  });

  it('rejects components that need more water than the pool', () => {
    const thirsty: Formula = {
      ...lean,
      components: [
        {
          id: 'scald',
          kind: 'scald',
          flourPct: 20,
          flourBlend: [{ flour: 'bread', sharePct: 100 }],
          hydrationPct: 400,
        },
      ],
    };
    expect(errorCode(resolveFormula(thirsty))).toBe('WaterAllocationExceeded');
  });

  it('rejects flour shares that do not sum to 100 and unknown references', () => {
    expect(errorCode(resolveFormula({ ...lean, flours: [{ id: 'bread', sharePct: 90 }] }))).toBe(
      'InvalidFormula',
    );
    expect(
      errorCode(
        resolveFormula({
          ...lean,
          components: [
            {
              id: 'poolish',
              kind: 'preferment',
              flourPct: 10,
              flourBlend: [{ flour: 'spelt', sharePct: 100 }],
              hydrationPct: 100,
            },
          ],
        }),
      ),
    ).toBe('UnknownReference');
  });
});

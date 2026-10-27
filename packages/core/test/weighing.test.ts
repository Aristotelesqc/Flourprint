import { describe, expect, it } from 'vitest';
import {
  resolveFormula,
  waterSources,
  weighingGroups,
  yieldOf,
  type Formula,
} from '../src/domain/index.js';

describe('weighing read model (formula.md, Weighing read model)', () => {
  const workedFormula: Formula = {
    flours: [{ id: 'bread', sharePct: 100 }],
    ingredients: [
      { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
      {
        id: 'salt',
        kind: 'other',
        bakerPct: 2,
        role: 'dough',
        water: { status: 'known', valuePct: 0 },
      },
      {
        id: 'yeast',
        kind: 'other',
        bakerPct: 0.5,
        role: 'dough',
        water: { status: 'known', valuePct: 0 },
        yeast: { form: 'instant' },
      },
    ],
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 30,
        hydrationPct: 100,
        flourBlend: [{ flour: 'bread', sharePct: 100 }],
        allocations: [{ ingredient: 'yeast', bakerPct: 0.1 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 1000 },
  };

  it('reproduces the contract worked example with a real resolved formula', () => {
    const res = resolveFormula(workedFormula);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const resolved = res.value;

    expect(resolved.flourTotal).toBe(1000);
    expect(resolved.doughWeight).toBe(1725);

    const groups = weighingGroups(workedFormula, resolved);
    expect(groups).toHaveLength(2);

    // Group 0: Poolish
    const poolish = groups[0];
    if (!poolish) throw new Error('Missing poolish group');
    expect(poolish.stage).toEqual({ kind: 'component', id: 'poolish' });
    expect(poolish.mass).toBe(601);
    expect(poolish.massPct).toBeCloseTo(60.1, 9);
    expect(poolish.flourPct).toBe(30);
    expect(poolish.inDough).toBe(true);
    expect(poolish.rows).toEqual([
      {
        stage: { kind: 'component', id: 'poolish' },
        item: { kind: 'ingredient', id: 'bread' },
        grams: 300,
        bakerPct: 30,
      },
      {
        stage: { kind: 'component', id: 'poolish' },
        item: { kind: 'water' },
        grams: 300,
        bakerPct: 30,
      },
      {
        stage: { kind: 'component', id: 'poolish' },
        item: { kind: 'ingredient', id: 'yeast' },
        grams: 1,
        bakerPct: 0.1,
      },
    ]);

    // Group 1: Final additions
    const finalGroup = groups[1];
    if (!finalGroup) throw new Error('Missing final group');
    expect(finalGroup.stage).toEqual({ kind: 'final' });
    expect(finalGroup.mass).toBe(1124);
    expect(finalGroup.massPct).toBeCloseTo(112.4, 9);
    expect(finalGroup.flourPct).toBeUndefined();
    expect(finalGroup.inDough).toBe(true);
    expect(finalGroup.rows).toEqual([
      {
        stage: { kind: 'final' },
        item: { kind: 'ingredient', id: 'bread' },
        grams: 700,
        bakerPct: 70,
      },
      {
        stage: { kind: 'final' },
        item: { kind: 'water' },
        grams: 400,
        bakerPct: 40,
      },
      {
        stage: { kind: 'final' },
        item: { kind: 'ingredient', id: 'salt' },
        grams: 20,
        bakerPct: 2,
      },
      {
        stage: { kind: 'final' },
        item: { kind: 'ingredient', id: 'yeast' },
        grams: 4,
        bakerPct: 0.4,
      },
    ]);

    // 601 + 1124 = 1725 = doughWeight
    expect(poolish.mass + finalGroup.mass).toBe(1725);
    expect(poolish.mass + finalGroup.mass).toBe(resolved.doughWeight);

    // yieldOf
    expect(yieldOf(workedFormula, resolved)).toEqual({ count: 1, gramsEach: 1725 });

    // waterSources: one entry, water 700 g, sharePct 100
    const sources = waterSources(resolved);
    expect(sources).toEqual([
      {
        source: 'water',
        kind: 'pureWater',
        grams: 700,
        status: 'known',
        sharePct: 100,
      },
    ]);

    // Contributions at 0 g (e.g. salt with 0% water) are not returned in waterSources
    expect(
      resolved.totalWater.contributions.some((c) => c.source === 'salt' && c.grams === 0),
    ).toBe(true);
    expect(sources.find((s) => s.source === 'salt')).toBeUndefined();
  });

  it('computes yield from a pieces anchor', () => {
    const piecesFormula: Formula = {
      ...workedFormula,
      anchor: { kind: 'pieces', count: 12, gramsEach: 90 },
    };
    const res = resolveFormula(piecesFormula);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(yieldOf(piecesFormula, res.value)).toEqual({ count: 12, gramsEach: 90 });
  });

  it('includes finishing group with inDough: false outside doughWeight', () => {
    const withTopping: Formula = {
      ...workedFormula,
      ingredients: [
        ...workedFormula.ingredients,
        { id: 'sesame', kind: 'other', bakerPct: 5, role: 'topping' },
      ],
    };
    const res = resolveFormula(withTopping);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const resolved = res.value;

    // Dough weight is unchanged by topping
    expect(resolved.doughWeight).toBe(1725);
    expect(resolved.grams.sesame).toBe(50);

    const groups = weighingGroups(withTopping, resolved);
    expect(groups).toHaveLength(3);

    const finishing = groups[2];
    if (!finishing) throw new Error('Missing finishing group');
    expect(finishing.stage).toEqual({ kind: 'finishing' });
    expect(finishing.mass).toBe(50);
    expect(finishing.massPct).toBeCloseTo(5, 9);
    expect(finishing.inDough).toBe(false);
    expect(finishing.flourPct).toBeUndefined();
    expect(finishing.rows).toEqual([
      {
        stage: { kind: 'finishing' },
        item: { kind: 'ingredient', id: 'sesame' },
        grams: 50,
        bakerPct: 5,
      },
    ]);

    // Sum of dough-in groups is still 1725
    const g0 = groups[0];
    const g1 = groups[1];
    if (!g0 || !g1) throw new Error('Missing expected groups');
    expect(g0.mass + g1.mass).toBe(1725);
  });

  it('represents unknown water contributor without grams and without share', () => {
    const withEgg: Formula = {
      ...workedFormula,
      ingredients: [
        ...workedFormula.ingredients,
        { id: 'egg', kind: 'other', bakerPct: 10, role: 'dough' },
      ],
    };
    const res = resolveFormula(withEgg);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const resolved = res.value;

    expect(resolved.totalWater.completeness).toBe('incomplete');
    expect(resolved.totalWater.unknownContributors).toEqual(['egg']);

    const sources = waterSources(resolved);
    const eggSource = sources.find((s) => s.source === 'egg');
    expect(eggSource).toEqual({
      source: 'egg',
      kind: 'ingredient',
      status: 'unknown',
    });
    expect(eggSource?.grams).toBeUndefined();
    expect(eggSource?.sharePct).toBeUndefined();

    const pureWaterSource = sources.find((s) => s.source === 'water');
    expect(pureWaterSource).toMatchObject({
      source: 'water',
      kind: 'pureWater',
      grams: 700,
      sharePct: 100,
    });
  });

  it('represents water loss with negative grams and no share', () => {
    const comp0 = workedFormula.components[0];
    if (!comp0) throw new Error('Missing component in workedFormula');
    const withLoss: Formula = {
      ...workedFormula,
      components: [
        {
          ...comp0,
          waterLossPct: 10,
        },
      ],
    };
    const res = resolveFormula(withLoss);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const resolved = res.value;

    expect(resolved.losses).toBe(30);

    const sources = waterSources(resolved);
    const lossSource = sources.find((s) => s.kind === 'loss');
    expect(lossSource).toEqual({
      source: 'poolish',
      kind: 'loss',
      grams: -30,
      status: 'known',
    });
    expect(lossSource?.sharePct).toBeUndefined();

    const pureWaterSource = sources.find((s) => s.source === 'water');
    expect(pureWaterSource).toMatchObject({
      source: 'water',
      kind: 'pureWater',
      grams: 700,
      sharePct: 100,
    });
  });

  it('omits rows at 0 g and empty groups', () => {
    // Flour blend with a 0% flour, allocation at 0%, ingredient at 0%
    const zeroFormula: Formula = {
      flours: [
        { id: 'bread', sharePct: 100 },
        { id: 'rye', sharePct: 0 },
      ],
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
        { id: 'salt', kind: 'other', bakerPct: 0, role: 'dough' },
      ],
      components: [
        {
          id: 'poolish',
          kind: 'preferment',
          flourPct: 20,
          hydrationPct: 100,
          flourBlend: [
            { flour: 'bread', sharePct: 100 },
            { flour: 'rye', sharePct: 0 },
          ],
          allocations: [{ ingredient: 'salt', bakerPct: 0 }],
        },
      ],
      anchor: { kind: 'flourTotal', grams: 1000 },
    };
    const res = resolveFormula(zeroFormula);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const groups = weighingGroups(zeroFormula, res.value);
    // Poolish has bread (200 g) and water (200 g); rye (0 g) and salt (0 g) omitted
    const poolishGroup = groups[0];
    if (!poolishGroup) throw new Error('Missing poolish group');
    expect(poolishGroup.rows).toHaveLength(2);
    expect(poolishGroup.rows.map((r) => r.item)).toEqual([
      { kind: 'ingredient', id: 'bread' },
      { kind: 'water' },
    ]);

    // Final mix has bread (800 g) and water (500 g); rye (0 g) and salt (0 g) omitted
    const finalMixGroup = groups[1];
    if (!finalMixGroup) throw new Error('Missing final group');
    expect(finalMixGroup.rows).toHaveLength(2);
    expect(finalMixGroup.rows.map((r) => r.item)).toEqual([
      { kind: 'ingredient', id: 'bread' },
      { kind: 'water' },
    ]);

    // No finishing group because no toppings
    expect(groups.find((g) => g.stage.kind === 'finishing')).toBeUndefined();
  });
});

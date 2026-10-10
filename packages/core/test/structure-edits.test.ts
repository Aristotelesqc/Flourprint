import { describe, expect, it } from 'vitest';
import {
  applyFormulaEdit,
  removeStep,
  resolveFormula,
  validateFormula,
  type Formula,
  type FormulaEdit,
  type Process,
} from '../src/domain/index.js';

/** Values computed by hand (formula.md, Structure edits and Locked total water). */
const enriched: Formula = {
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 60, role: 'dough' },
    {
      id: 'milk',
      kind: 'other',
      bakerPct: 20,
      role: 'dough',
      water: { status: 'known', valuePct: 88 },
    },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
    },
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};

const apply = (formula: Formula, ...edits: FormulaEdit[]): Formula =>
  edits.reduce((f, e) => {
    const next = applyFormulaEdit(f, e);
    if (!next.ok) throw new Error(JSON.stringify(next.error));
    return next.value;
  }, formula);

const pct = (formula: Formula, id: string) =>
  formula.ingredients.find((i) => i.id === id)?.bakerPct;

const totalWaterPct = (formula: Formula) => {
  const r = resolveFormula(formula);
  if (!r.ok) throw new Error(r.error.code);
  return r.value.totalWaterPct;
};

const lock = (totalWaterPct: number): FormulaEdit => ({
  type: 'LockTotalWater',
  totalWaterPct,
  water: 'water',
});

describe('locked total water', () => {
  it('derives the added water from the target', () => {
    // 75 − 20 × 0.88 − 2 × 0 = 57.4
    const locked = apply(enriched, lock(75));
    expect(pct(locked, 'water')).toBeCloseTo(57.4, 9);
    expect(totalWaterPct(locked)).toBeCloseTo(75, 9);
  });

  it('lowers the added water when an ingredient brings water', () => {
    // two eggs: 10 % at 76 % water bring 7.6 points: 57.4 − 7.6 = 49.8
    const locked = apply(enriched, lock(75), {
      type: 'AddIngredient',
      ingredient: {
        id: 'egg',
        kind: 'other',
        bakerPct: 10,
        role: 'dough',
        water: { status: 'known', valuePct: 76 },
      },
    });
    expect(pct(locked, 'water')).toBeCloseTo(49.8, 9);
    expect(totalWaterPct(locked)).toBeCloseTo(75, 9);
  });

  it('keeps the other grams and follows with the water when grams change', () => {
    // milk 200 → 300 g at 1000 g flour: water = 750 − 264 = 486 g
    const locked = apply(enriched, lock(75), {
      type: 'SetIngredientGrams',
      ingredient: 'milk',
      grams: 300,
    });
    const r = resolveFormula(locked);
    if (!r.ok) throw new Error(r.error.code);
    expect(r.value.flourTotal).toBeCloseTo(1000, 9);
    expect(r.value.grams.salt).toBeCloseTo(20, 9);
    expect(r.value.grams.water).toBeCloseTo(486, 9);
  });

  it('holds under a dough weight anchor', () => {
    const anchored: Formula = { ...enriched, anchor: { kind: 'doughWeight', grams: 1800 } };
    const locked = apply(anchored, lock(70), { type: 'SetBakerPct', ingredient: 'salt', pct: 2.5 });
    expect(totalWaterPct(locked)).toBeCloseTo(70, 9);
    const r = resolveFormula(locked);
    expect(r.ok && r.value.doughWeight).toBeCloseTo(1800, 9);
  });

  it('refuses a direct change of the absorbing water', () => {
    const locked = apply(enriched, lock(75));
    const edit = applyFormulaEdit(locked, { type: 'SetBakerPct', ingredient: 'water', pct: 50 });
    expect(edit).toMatchObject({
      ok: false,
      error: { code: 'IncompatibleConstraint', details: { field: 'waterTarget.locked' } },
    });
  });

  it('refuses an unknown water content, naming the ingredient', () => {
    const edit = applyFormulaEdit(
      apply(enriched, {
        type: 'AddIngredient',
        ingredient: { id: 'honey', kind: 'other', bakerPct: 3, role: 'dough' },
      }),
      lock(75),
    );
    expect(edit).toMatchObject({
      ok: false,
      error: { details: { field: 'waterTarget.unknown', ingredients: ['honey'] } },
    });
  });

  it('refuses a target below the water the other ingredients bring', () => {
    // milk alone brings 17.6 points
    expect(applyFormulaEdit(enriched, lock(15))).toMatchObject({
      ok: false,
      error: { details: { field: 'waterTarget.tooLow' } },
    });
  });

  it('unlocks without changing any quantity', () => {
    const locked = apply(enriched, lock(75));
    const unlocked = apply(locked, { type: 'UnlockTotalWater' });
    expect(unlocked.waterTarget).toBeUndefined();
    expect(pct(unlocked, 'water')).toBeCloseTo(57.4, 9);
    const moved = apply(unlocked, { type: 'SetBakerPct', ingredient: 'milk', pct: 30 });
    expect(totalWaterPct(moved)).toBeCloseTo(57.4 + 26.4, 9);
  });

  it('counts component losses and refuses a stored formula that does not match its lock', () => {
    const withLoss: Formula = {
      ...enriched,
      components: [
        {
          id: 'tz',
          kind: 'scald',
          flourPct: 5,
          flourBlend: [{ flour: 'bread', sharePct: 100 }],
          hydrationPct: 500,
          waterLossPct: 10,
        },
      ],
    };
    // loss = 5 × 5 × 0.1 = 2.5 points: water = 75 − 17.6 + 2.5 = 59.9
    const locked = apply(withLoss, lock(75));
    expect(pct(locked, 'water')).toBeCloseTo(59.9, 9);
    expect(totalWaterPct(locked)).toBeCloseTo(75, 9);
    const tampered: Formula = {
      ...locked,
      ingredients: locked.ingredients.map((i) => (i.id === 'water' ? { ...i, bakerPct: 50 } : i)),
    };
    expect(validateFormula(tampered)).toMatchObject({
      ok: false,
      error: { code: 'InvalidFormula' },
    });
  });
});

const poolish: Formula = {
  ...enriched,
  ingredients: [
    ...enriched.ingredients,
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: 0.5,
      role: 'dough',
      water: { status: 'known', valuePct: 5 },
    },
  ],
  components: [
    {
      id: 'poolish',
      kind: 'preferment',
      flourPct: 30,
      flourBlend: [{ flour: 'bread', sharePct: 100 }],
      hydrationPct: 100,
      allocations: [{ ingredient: 'yeast', bakerPct: 0.05 }],
    },
  ],
};

const [poolishComponent] = poolish.components as [Formula['components'][number]];

describe('locked total water with grams held on the anchor (audit C1 of 15e52e3)', () => {
  // W = 1800, H = 75 %, milk 86 % water, salt 2 %: F = (1800 − 0.14 × 300) / 1.77.
  const anchored: Formula = {
    ...enriched,
    ingredients: enriched.ingredients.map((i) =>
      i.id === 'milk' ? { ...i, water: { status: 'known', valuePct: 86 } } : i,
    ),
    anchor: { kind: 'doughWeight', grams: 1800 },
  };
  const resolved = (formula: Formula) => {
    const r = resolveFormula(formula);
    if (!r.ok) throw new Error(r.error.code);
    return r.value;
  };

  it('keeps the requested grams, the dough weight and the total water', () => {
    const edited = apply(anchored, lock(75), {
      type: 'SetIngredientGrams',
      ingredient: 'milk',
      grams: 300,
      hold: 'anchor',
    });
    const r = resolved(edited);
    expect(r.grams.milk).toBeCloseTo(300, 9);
    expect(r.doughWeight).toBeCloseTo(1800, 9);
    expect(r.totalWaterPct).toBeCloseTo(75, 9);
    expect(r.flourTotal).toBeCloseTo((1800 - 0.14 * 300) / 1.77, 9);
  });

  it('holds a pieces anchor the same way', () => {
    const pieces = apply(
      { ...anchored, anchor: { kind: 'pieces', count: 4, gramsEach: 450 } },
      lock(75),
      { type: 'SetIngredientGrams', ingredient: 'salt', grams: 25, hold: 'anchor' },
    );
    const r = resolved(pieces);
    expect(r.grams.salt).toBeCloseTo(25, 9);
    expect(r.doughWeight).toBeCloseTo(1800, 9);
    expect(r.totalWaterPct).toBeCloseTo(75, 9);
  });

  it('leaves the default hold (other grams) unchanged: the anchor follows', () => {
    const before = resolved(apply(anchored, lock(75)));
    const r = resolved(
      apply(anchored, lock(75), { type: 'SetIngredientGrams', ingredient: 'milk', grams: 300 }),
    );
    expect(r.grams.milk).toBeCloseTo(300, 9);
    expect(r.flourTotal).toBeCloseTo(before.flourTotal, 9);
    expect(r.totalWaterPct).toBeCloseTo(75, 9);
  });
});

describe('structure edits', () => {
  it('changes a preparation and refuses draws beyond the formula', () => {
    const wetter = apply(poolish, {
      type: 'UpdateComponent',
      component: 'poolish',
      changes: { hydrationPct: 60 },
    });
    expect(wetter.components[0]?.hydrationPct).toBe(60);
    // 70 % flour at 100 % needs 700 g water; the pool has 600 g
    const tooBig = applyFormulaEdit(poolish, {
      type: 'UpdateComponent',
      component: 'poolish',
      changes: { flourPct: 70 },
    });
    expect(tooBig).toMatchObject({ ok: false, error: { code: 'WaterAllocationExceeded' } });
  });

  it('removes and adds preparations; the final mix gets the flour and water back', () => {
    const without = apply(poolish, { type: 'RemoveComponent', component: 'poolish' });
    const r = resolveFormula(without);
    expect(r.ok && r.value.finalMix.water).toBeCloseTo(600, 9);
    const back = apply(without, { type: 'AddComponent', component: poolishComponent });
    expect(back.components).toHaveLength(1);
  });

  it('refuses to remove an ingredient a preparation uses', () => {
    expect(
      applyFormulaEdit(poolish, { type: 'RemoveIngredient', ingredient: 'yeast' }),
    ).toMatchObject({
      ok: false,
      error: { details: { field: 'allocation' } },
    });
    const noSalt = apply(poolish, { type: 'RemoveIngredient', ingredient: 'salt' });
    expect(noSalt.ingredients.map((i) => i.id)).toEqual(['water', 'milk', 'yeast']);
  });

  it('updates an ingredient composition and keeps its percentage', () => {
    const next = apply(enriched, {
      type: 'UpdateIngredient',
      ingredient: 'milk',
      changes: { water: { status: 'estimated', valuePct: 87, rangePct: [86, 91] } },
    });
    expect(pct(next, 'milk')).toBe(20);
    expect(next.ingredients[1]?.water).toEqual({
      status: 'estimated',
      valuePct: 87,
      rangePct: [86, 91],
    });
  });

  it('adds and removes flours through the blend', () => {
    const blended = apply(enriched, {
      type: 'SetFlourBlend',
      flours: [
        { id: 'bread', sharePct: 80 },
        { id: 'spelt', sharePct: 20 },
      ],
    });
    expect(blended.flours.map((f) => f.id)).toEqual(['bread', 'spelt']);
    // the poolish draws from bread only: removing bread is refused
    expect(
      applyFormulaEdit(poolish, { type: 'SetFlourBlend', flours: [{ id: 'spelt', sharePct: 100 }] })
        .ok,
    ).toBe(false);
  });
});

describe('step removal', () => {
  it('rewires successors to the removed step dependencies', () => {
    const process: Process = {
      steps: [
        {
          id: 'poolish',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 3600,
        },
        { id: 'tangzhong', operation: 'scald', dependsOn: [], schedule: 'asap' },
        { id: 'mix', operation: 'mix', dependsOn: ['poolish', 'tangzhong'], schedule: 'asap' },
        { id: 'bulk', operation: 'bulk', dependsOn: ['mix'], schedule: 'asap' },
      ],
    };
    expect(removeStep(process, 'tangzhong').steps.find((s) => s.id === 'mix')?.dependsOn).toEqual([
      'poolish',
    ]);
    expect(removeStep(process, 'mix').steps.find((s) => s.id === 'bulk')?.dependsOn).toEqual([
      'poolish',
      'tangzhong',
    ]);
  });
});

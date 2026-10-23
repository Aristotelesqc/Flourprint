import { describe, expect, it } from 'vitest';
import { shokupan } from '../src/application/templates/enriched.js';
import {
  applyFormulaEdit,
  type Component,
  resolveFormula,
  type Formula,
  type FormulaEdit,
} from '../src/domain/index.js';

/** Values computed by hand (formula.md, Stage grams). */
const resolve = (formula: Formula) => {
  const r = resolveFormula(formula);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

const stage = (ingredient: string, where: 'final' | string, grams: number): FormulaEdit => ({
  type: 'SetStageIngredientGrams',
  ingredient,
  stage: where === 'final' ? { kind: 'final' } : { kind: 'component', id: where },
  grams,
});

const edit = (formula: Formula, e: FormulaEdit): Formula => {
  const r = applyFormulaEdit(formula, e);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

const refused = (formula: Formula, e: FormulaEdit) => {
  const r = applyFormulaEdit(formula, e);
  if (r.ok) throw new Error('expected a refusal');
  return r.error;
};

const near = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 9);

const shokupanFormula = shokupan.formula;

describe('Shokupan template: 14 g flour, 43 g water, 43 g milk in the tangzhong', () => {
  it('starts as 314 g flour, 156 g milk (43 + 113), 699 g dough', () => {
    const r = resolve(shokupanFormula);
    near(r.grams.milk ?? 0, 156);
    near(r.finalMix.grams.milk ?? 0, 113); // 156 - 43
    near(r.doughWeight, 699); // 314+43+156+14+50+6+57+50+9
  });

  it('milk 120 g at the final mix keeps the tangzhong at 43 g: 43 + 120 = 163', () => {
    const next = edit(shokupanFormula, stage('milk', 'final', 120));
    const r = resolve(next);
    near(r.grams.milk ?? 0, 163); // 43 + 120
    near(r.components.tangzhong?.allocations.milk ?? 0, 43);
    near(r.finalMix.grams.milk ?? 0, 120);
    near(r.flourTotal, 314); // flour untouched
    near(r.bakerPct.milk ?? 0, (163 / 314) * 100); // 51.9108...
    near(r.doughWeight, 706); // 699 + (163 - 156)
    expect(next.anchor).toEqual({ kind: 'flourTotal', grams: 314 });
  });

  it('milk 20 g in the tangzhong keeps the final mix at 113 g: 20 + 113 = 133', () => {
    const r = resolve(edit(shokupanFormula, stage('milk', 'tangzhong', 20)));
    near(r.grams.milk ?? 0, 133);
    near(r.finalMix.grams.milk ?? 0, 113);
    near(r.doughWeight, 676); // 699 - 23
  });

  it('keeps the anchor kind: doughWeight 699 becomes 706, pieces keep their count', () => {
    const dough: Formula = { ...shokupanFormula, anchor: { kind: 'doughWeight', grams: 699 } };
    const next = edit(dough, stage('milk', 'final', 120));
    expect(next.anchor.kind).toBe('doughWeight');
    near(next.anchor.kind === 'doughWeight' ? next.anchor.grams : 0, 706);
    const pieces: Formula = {
      ...shokupanFormula,
      anchor: { kind: 'pieces', count: 4, gramsEach: 699 / 4 },
    };
    const p = edit(pieces, stage('milk', 'final', 120));
    expect(p.anchor).toMatchObject({ kind: 'pieces', count: 4 });
    near(p.anchor.kind === 'pieces' ? p.anchor.gramsEach : 0, 706 / 4);
  });

  it('flour 20 g in the tangzhong: total flour 320, water 43 g kept, hydration 215 %', () => {
    const next = edit(shokupanFormula, stage('bread-flour', 'tangzhong', 20));
    const r = resolve(next);
    near(r.flourTotal, 320); // 314 + (20 - 14)
    near(r.components.tangzhong?.flour ?? 0, 20);
    near(r.finalMix.flourByFlour['bread-flour'] ?? 0, 300); // unchanged
    near(r.components.tangzhong?.water ?? 0, 43);
    near(next.components[0]?.hydrationPct ?? 0, 215); // 43 / 20
    near(r.grams.milk ?? 0, 156);
    near(r.bakerPct.milk ?? 0, 48.75); // 156 / 320
    near(r.doughWeight, 705); // 699 + 6
    expect(next.anchor).toEqual({ kind: 'flourTotal', grams: 320 });
  });

  it('flour 310 g at the final mix: total flour 324, tangzhong untouched', () => {
    const r = resolve(edit(shokupanFormula, stage('bread-flour', 'final', 310)));
    near(r.flourTotal, 324); // 14 + 310
    near(r.components.tangzhong?.flour ?? 0, 14);
    near(r.bakerPct.sugar ?? 0, (50 / 324) * 100); // 15.432...
  });

  it('water 50 g in the tangzhong: hydration 50 / 14, total water 50, final mix 0', () => {
    const next = edit(shokupanFormula, stage('water', 'tangzhong', 50));
    const r = resolve(next);
    near(r.grams.water ?? 0, 50); // 43 + 7
    near(next.components[0]?.hydrationPct ?? 0, (50 / 14) * 100);
    near(r.finalMix.water, 0);
    near(r.doughWeight, 706);
  });

  it('water 10 g at the final mix: total 53, tangzhong keeps 43', () => {
    const r = resolve(edit(shokupanFormula, stage('water', 'final', 10)));
    near(r.grams.water ?? 0, 53); // 43 + 10
    near(r.components.tangzhong?.water ?? 0, 43);
  });

  it('allocates an ingredient the component did not draw: sugar 5 g in the tangzhong', () => {
    const next = edit(shokupanFormula, stage('sugar', 'tangzhong', 5));
    const r = resolve(next);
    near(r.grams.sugar ?? 0, 55); // 5 + 50 at the final mix
    near(r.finalMix.grams.sugar ?? 0, 50);
    near(r.components.tangzhong?.allocations.sugar ?? 0, 5);
  });

  it('0 g removes the allocation; the total is the final mix amount', () => {
    const next = edit(shokupanFormula, stage('milk', 'tangzhong', 0));
    expect(next.components[0]?.allocations).toEqual([]);
    near(resolve(next).grams.milk ?? 0, 113);
  });

  it('refuses without mutating: negative, unknown ingredient, unknown stage, water without flour', () => {
    const before = JSON.stringify(shokupanFormula);
    expect(refused(shokupanFormula, stage('milk', 'final', -1)).code).toBe(
      'IncompatibleConstraint',
    );
    expect(refused(shokupanFormula, stage('nope', 'final', 1))).toMatchObject({
      code: 'UnknownReference',
      details: { path: 'ingredient', id: 'nope' },
    });
    expect(refused(shokupanFormula, stage('milk', 'nope', 1))).toMatchObject({
      code: 'UnknownReference',
      details: { path: 'stage', id: 'nope' },
    });
    // 14 g flour to 0 while the tangzhong still holds 43 g of water
    expect(refused(shokupanFormula, stage('bread-flour', 'tangzhong', 0))).toMatchObject({
      code: 'IncompatibleConstraint',
      details: { field: 'stage' },
    });
    expect(JSON.stringify(shokupanFormula)).toBe(before);
  });

  it('refuses leaving no flour at all', () => {
    // flour 0 at the final mix and in the tangzhong would leave no flour: refused
    const noFinal = edit(shokupanFormula, stage('bread-flour', 'final', 0));
    near(resolve(noFinal).flourTotal, 14);
    expect(refused(noFinal, stage('bread-flour', 'tangzhong', 0)).code).toBe(
      'IncompatibleConstraint',
    );
  });
});

describe('simple poolish: 1000 g flour, 700 g water, 20 g salt, poolish 200 g flour + 200 g water', () => {
  const poolish: Formula = {
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
    ],
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 20,
        flourBlend: [{ flour: 'bread', sharePct: 100 }],
        hydrationPct: 100,
      },
    ],
    anchor: { kind: 'flourTotal', grams: 1000 },
  };

  it('flour 300 g in the poolish: total 1100, hydration 200 / 300, final flour 800', () => {
    const next = edit(poolish, stage('bread', 'poolish', 300));
    const r = resolve(next);
    near(r.flourTotal, 1100); // 1000 + 100
    near(next.components[0]?.flourPct ?? 0, (300 / 1100) * 100); // 27.2727
    near(next.components[0]?.hydrationPct ?? 0, (200 / 300) * 100); // water 200 kept
    near(r.finalMix.flourByFlour.bread ?? 0, 800);
    near(r.grams.water ?? 0, 700);
    near(r.bakerPct.water ?? 0, (700 / 1100) * 100); // 63.636
    expect(next.anchor).toEqual({ kind: 'flourTotal', grams: 1100 });
  });

  it('water 250 g in the poolish: total 750, hydration 125 %, final water 500', () => {
    const next = edit(poolish, stage('water', 'poolish', 250));
    const r = resolve(next);
    near(r.grams.water ?? 0, 750); // 700 + 50
    near(next.components[0]?.hydrationPct ?? 0, 125); // 250 / 200
    near(r.finalMix.water, 500);
  });

  it('flour 150 g at the final mix under a doughWeight anchor recomputes its value', () => {
    // dough 1000 + 700 + 20 = 1720; final flour 800 -> 150 removes 650 g of flour: total 350
    const dough: Formula = { ...poolish, anchor: { kind: 'doughWeight', grams: 1720 } };
    const r = resolve(edit(dough, stage('bread', 'final', 150)));
    near(r.flourTotal, 350); // 200 + 150
    near(r.doughWeight, 1070); // 350 + 700 + 20
    near(r.finalMix.flourByFlour.bread ?? 0, 150);
  });

  it('an allocation larger than the recipe cannot come from a stage edit: lowering the recipe total is refused', () => {
    const withSalt: Formula = {
      ...poolish,
      components: [
        {
          ...(poolish.components[0] as Component),
          allocations: [{ ingredient: 'salt', bakerPct: 1 }],
        },
      ],
    };
    // salt 20 g total, 10 g in the poolish: final = 10; setting the final mix to 0 leaves 10 g
    near(resolve(edit(withSalt, stage('salt', 'final', 0))).grams.salt ?? 0, 10);
    const lowered = applyFormulaEdit(withSalt, {
      type: 'SetIngredientGrams',
      ingredient: 'salt',
      grams: 5,
    });
    expect(lowered.ok).toBe(false);
  });
});

describe('locked total water', () => {
  const locked: Formula = {
    flours: [{ id: 'bread', sharePct: 100 }],
    ingredients: [
      { id: 'water', kind: 'water', bakerPct: 48.6, role: 'dough' },
      {
        id: 'milk',
        kind: 'other',
        bakerPct: 30,
        role: 'dough',
        water: { status: 'known', valuePct: 88 },
      },
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 1000 },
    waterTarget: { totalWaterPct: 75, absorbInto: 'water' },
  };

  it('a stage edit of another ingredient re-derives the absorbing water', () => {
    // milk 300 -> 200 g: water = 75 - 20 x 0.88 = 57.4 %
    const next = edit(locked, stage('milk', 'final', 200));
    near(next.ingredients.find((i) => i.id === 'water')?.bakerPct ?? 0, 57.4);
    near(resolve(next).totalWaterPct, 75);
  });

  it('editing the absorbing water in any stage is refused (unlock first)', () => {
    expect(refused(locked, stage('water', 'final', 400))).toMatchObject({
      code: 'IncompatibleConstraint',
      details: { field: 'waterTarget.locked' },
    });
  });
});

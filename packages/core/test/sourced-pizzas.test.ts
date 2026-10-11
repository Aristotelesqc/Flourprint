import { describe, expect, it } from 'vitest';
import {
  focaccia,
  pizzaChicago,
  pizzaNeoNeapolitan,
  pizzaNewYork,
  pizzaRoman,
  pizzaSicilian,
  pizzaTeglia,
} from '../src/application/templates/pizzas.js';
import {
  blockingIssues,
  checkRecipe,
  estimateFermentation,
  resolveFormula,
  validateRecipe,
} from '../src/domain/index.js';

describe('sourced pizza and flatbread templates (issue #34)', () => {
  const templates = [
    focaccia,
    pizzaNeoNeapolitan,
    pizzaRoman,
    pizzaNewYork,
    pizzaChicago,
    pizzaSicilian,
    pizzaTeglia,
  ];

  it('preserves stable IDs and increments versions', () => {
    expect(focaccia.version).toBe('4');
    expect(pizzaNeoNeapolitan.version).toBe('3');
    expect(pizzaRoman.version).toBe('3');
    expect(pizzaNewYork.version).toBe('3');
    expect(pizzaChicago.version).toBe('3');
    expect(pizzaSicilian.version).toBe('3');
    expect(pizzaTeglia.version).toBe('3');
  });

  it('all 7 templates validate cleanly and pass checkRecipe without warnings', () => {
    for (const t of templates) {
      const valid = validateRecipe(t.formula, t.process);
      expect(valid.ok, `${t.id} validity`).toBe(true);
      const issues = checkRecipe(t.formula, t.process);
      expect(blockingIssues(issues), `${t.id} blocking`).toEqual([]);
      expect(issues, `${t.id} warnings`).toEqual([]);
    }
  });

  it('keeps manual fermentation plans independent of prediction engine', () => {
    for (const t of templates) {
      const dough = estimateFermentation(t.formula, t.process).dough.duration;
      expect(
        ['ok', 'out_of_domain', 'unsupported', 'insufficient_data'],
        `${t.id} fermentation status: ${JSON.stringify(dough)}`,
      ).toContain(dough.status);
      expect(t.process.steps.every((s) => s.accepted === undefined)).toBe(true);
    }
  });

  it('verifies KAB Big and Bubbly Focaccia mass balances and step structure', () => {
    expect(focaccia.formula.anchor).toEqual({ kind: 'flourTotal', grams: 360 });
    const resolved = resolveFormula(focaccia.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['all-purpose-flour']).toBeCloseTo(360, 1);
    expect(grams.water).toBeCloseTo(284, 0);
    expect(grams['olive-oil']).toBeCloseTo(18, 1);
    expect(grams.salt).toBeCloseTo(9, 1);
    expect(grams.sugar).toBeCloseTo(5, 0);
    expect(grams['instant-yeast']).toBeCloseTo(3, 0);

    expect(focaccia.formula.ingredients.some((i) => i.role === 'topping')).toBe(false);

    const bulk = focaccia.process.steps.find((s) => s.id === 'bulk');
    expect(bulk?.technique?.folds).toEqual({ count: 4, intervalS: 900, style: 'stretchAndFold' });

    const finish = focaccia.process.steps.find((s) => s.id === 'bake-finish');
    expect(finish?.operation).toBe('bake');
    expect(finish?.plannedDurationS).toBe(360);
    expect(finish?.conditions?.temperatureC).toBeUndefined();
  });

  it('verifies Baking Steel 72-Hour dough mass balances and timeline', () => {
    expect(pizzaNeoNeapolitan.formula.anchor).toEqual({ kind: 'flourTotal', grams: 500 });
    const resolved = resolveFormula(pizzaNeoNeapolitan.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['bread-flour']).toBeCloseTo(500, 1);
    expect(grams.water).toBeCloseTo(350, 1);
    expect(grams.salt).toBeCloseTo(16, 1);
    expect(grams['instant-yeast']).toBeCloseTo(1, 1);
    expect(resolved.value.doughWeight).toBeCloseTo(867, 1);

    const stepIds = pizzaNeoNeapolitan.process.steps.map((s) => s.id);
    expect(stepIds).toEqual(['mix', 'bulk', 'retard', 'divide', 'proof', 'preheat', 'bake']);
    const retard = pizzaNeoNeapolitan.process.steps.find((s) => s.id === 'retard');
    expect(retard?.plannedDurationS).toBe(48 * 3600);
    expect(retard?.conditions?.temperatureC).toBe(4);
  });

  it('verifies Molino Vigevano DIRECT Roman formula and temperature semantics', () => {
    expect(pizzaRoman.formula.anchor).toEqual({ kind: 'flourTotal', grams: 1000 });
    const resolved = resolveFormula(pizzaRoman.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['flour']).toBeCloseTo(1000, 1);
    expect(grams.water).toBeCloseTo(600, 1);
    expect(grams.salt).toBeCloseTo(26, 1);
    expect(grams['fresh-yeast']).toBeCloseTo(2, 1);
    expect(resolved.value.doughWeight).toBeCloseTo(1628, 1);

    const yeast = pizzaRoman.formula.ingredients.find((i) => i.id === 'fresh-yeast');
    expect(yeast?.yeast).toEqual({ form: 'fresh' });

    const mix = pizzaRoman.process.steps.find((s) => s.id === 'mix');
    expect(mix?.conditions?.doughTemperatureC).toBe(24);
    const bake = pizzaRoman.process.steps.find((s) => s.id === 'bake');
    expect(bake?.conditions?.temperatureC).toBe(350);
  });

  it('verifies Feeling Foodish New York metric branch and yield conflict documentation', () => {
    expect(pizzaNewYork.formula.anchor).toEqual({ kind: 'flourTotal', grams: 796 });
    const resolved = resolveFormula(pizzaNewYork.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['bread-flour']).toBeCloseTo(796, 1);
    expect(grams.water).toBeCloseTo(493, 0);
    expect(grams.salt).toBeCloseTo(15.6, 1);
    expect(grams.sugar).toBeCloseTo(7.8, 1);
    expect(grams['olive-oil']).toBeCloseTo(11.8, 1);
    expect(grams['instant-yeast']).toBeCloseTo(3.5, 1);
    expect(resolved.value.doughWeight).toBeCloseTo(1327.7, 0);
    expect(pizzaNewYork.basis).toContain('1,327.7');
  });

  it('verifies Chicago deep-dish all-grain denominator, fat allocations, and proof absence', () => {
    expect(pizzaChicago.formula.anchor).toEqual({ kind: 'flourTotal', grams: 257 });
    const resolved = resolveFormula(pizzaChicago.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['all-purpose-flour']).toBeCloseTo(219, 0);
    expect(grams.cornmeal).toBeCloseTo(38, 0);
    expect(grams.water).toBeCloseTo(160, 0);
    expect(grams.salt).toBeCloseTo(4.5, 1);
    expect(grams.sugar).toBeCloseTo(4, 0);
    expect(grams['instant-yeast']).toBeCloseTo(3, 0);
    expect(grams.butter).toBeCloseTo(14, 0);
    expect(grams['olive-oil']).toBeCloseTo(14, 0);
    expect(resolved.value.doughWeight).toBeCloseTo(456.5, 0);

    expect(pizzaChicago.process.steps.some((s) => s.operation === 'proof')).toBe(false);
  });

  it('verifies KAB Sicilian same-day branch and non-dough onion oil exclusion', () => {
    expect(pizzaSicilian.formula.anchor).toEqual({ kind: 'flourTotal', grams: 540 });
    const resolved = resolveFormula(pizzaSicilian.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['bread-flour']).toBeCloseTo(540, 1);
    expect(grams.water).toBeCloseTo(397, 0);
    expect(grams.salt).toBeCloseTo(12, 1);
    expect(grams['instant-yeast']).toBeCloseTo(6, 0);

    expect(pizzaSicilian.formula.ingredients.some((i) => i.id === 'olive-oil')).toBe(false);
    expect(pizzaSicilian.process.steps.some((s) => s.operation === 'retard')).toBe(false);

    const bakeSteps = pizzaSicilian.process.steps
      .filter((s) => s.operation === 'bake')
      .map((s) => s.id);
    expect(bakeSteps).toEqual(['par-bake', 'bake']);
  });

  it('verifies Confraternita Teglia electric deck oven semantics and fresh yeast', () => {
    expect(pizzaTeglia.formula.anchor).toEqual({ kind: 'flourTotal', grams: 725 });
    const resolved = resolveFormula(pizzaTeglia.formula);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const grams = { ...resolved.value.flourByFlour, ...resolved.value.grams };
    expect(grams['bread-flour']).toBeCloseTo(725, 1);
    expect(grams.water).toBeCloseTo(580, 0);
    expect(grams.salt).toBeCloseTo(18, 0);
    expect(grams['olive-oil']).toBeCloseTo(15, 0);
    expect(grams['fresh-yeast']).toBeCloseTo(4, 0);

    const yeast = pizzaTeglia.formula.ingredients.find((i) => i.id === 'fresh-yeast');
    expect(yeast?.yeast).toEqual({ form: 'fresh' });

    const bake = pizzaTeglia.process.steps.find((s) => s.id === 'bake');
    expect(bake?.conditions?.temperatureC).toBeUndefined();
    expect(bake?.label).toContain('deck 300–320 °C, top 200 °C');
  });
});

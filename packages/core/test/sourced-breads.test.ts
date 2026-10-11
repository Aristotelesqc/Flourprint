import { describe, expect, it } from 'vitest';
import { bagels, baguette, bouleDutchOven, ciabatta } from '../src/application/templates/breads.js';
import {
  blockingIssues,
  checkRecipe,
  resolveFormula,
  validateRecipe,
  type RecipeTemplate,
} from '../src/domain/index.js';

const resolve = (template: Pick<RecipeTemplate, 'formula'>) => {
  const res = resolveFormula(template.formula);
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.value;
};

const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Expected source ingredient or process step');
  return value;
};

const close = (actual: number, expected: number, tolerance = 1e-4) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe('Sourced lean bread templates (issue #34)', () => {
  const templates = [baguette, bouleDutchOven, ciabatta, bagels];

  it('preserves stable IDs, categories, and increments versions by 1', () => {
    expect(baguette.id).toBe('baguette');
    expect(baguette.version).toBe('2');
    expect(baguette.category).toBe('bread');

    expect(bouleDutchOven.id).toBe('boule-dutch-oven');
    expect(bouleDutchOven.version).toBe('4');
    expect(bouleDutchOven.category).toBe('bread');

    expect(ciabatta.id).toBe('ciabatta');
    expect(ciabatta.version).toBe('4');
    expect(ciabatta.category).toBe('bread');

    expect(bagels.id).toBe('bagels');
    expect(bagels.version).toBe('3');
    expect(bagels.category).toBe('bread');
  });

  it('passes validateRecipe and checkRecipe with zero blocking issues or warnings', () => {
    for (const t of templates) {
      const valid = validateRecipe(t.formula, t.process);
      expect(valid.ok, `${t.id} validity`).toBe(true);

      const issues = checkRecipe(t.formula, t.process);
      expect(blockingIssues(issues), `${t.id} blocking issues`).toEqual([]);
      expect(issues, `${t.id} issues`).toEqual([]);
      expect(t.basis.length, `${t.id} basis`).toBeGreaterThan(50);
    }
  });

  describe('baguette (King Arthur Baking — Classic Baguettes)', () => {
    it('matches exact source gram accounting and poolish allocation', () => {
      const resolved = resolve(baguette);
      expect(baguette.formula.anchor).toEqual({ kind: 'flourTotal', grams: 540 });

      // Total flour
      expect(resolved.flourTotal).toBe(540);
      close(required(resolved.grams['water']), 368);
      close(required(resolved.grams['salt']), 12);
      close(required(resolved.grams['instant-yeast']), 4.6875);

      // Poolish component resolution
      const poolish = required(resolved.components['poolish']);
      expect(poolish).toBeDefined();
      close(poolish.flour, 120);
      close(poolish.water, 113);
      close(poolish.water / poolish.flour, 113 / 120);
      close(required(poolish.allocations['instant-yeast']), 0.1875);
      close(poolish.mass, 120 + 113 + 0.1875);

      // Final mix balance
      close(required(resolved.finalMix.flourByFlour['all-purpose-flour']), 420);
      close(resolved.finalMix.water, 255);
      close(required(resolved.finalMix.grams['salt']), 12);
      close(required(resolved.finalMix.grams['instant-yeast']), 4.5);

      // Total dough weight invariant
      const expectedDoughWeight = 540 + 368 + 12 + 4.6875;
      close(resolved.doughWeight, expectedDoughWeight);
    });

    it('enforces sourced operation order and step details', () => {
      const stepIds = baguette.process.steps.map((s) => s.id);
      expect(stepIds).toEqual([
        'poolish',
        'mix',
        'bulk',
        'divide',
        'bench-rest',
        'shape',
        'proof',
        'preheat',
        'bake',
        'cool',
      ]);

      const poolish = required(baguette.process.steps.find((s) => s.id === 'poolish'));
      expect(poolish.plannedDurationS).toBe(14 * 3600);
      expect(poolish.conditions?.temperatureC).toBe(21);

      const mix = required(baguette.process.steps.find((s) => s.id === 'mix'));
      expect(mix.dependsOn).toEqual(['poolish']);
      expect(mix.plannedDurationS).toBe(4 * 60);

      const bulk = required(baguette.process.steps.find((s) => s.id === 'bulk'));
      expect(bulk.plannedDurationS).toBe(90 * 60);
      expect(bulk.technique?.folds).toEqual({
        count: 1,
        intervalS: 45 * 60,
        style: 'stretchAndFold',
      });

      const proof = required(baguette.process.steps.find((s) => s.id === 'proof'));
      expect(proof.plannedDurationS).toBe(52.5 * 60);
      expect(proof.conditions?.temperatureC).toBe(20);

      const bake = required(baguette.process.steps.find((s) => s.id === 'bake'));
      expect(bake.dependsOn).toEqual(['proof', 'preheat']);
      expect(bake.plannedDurationS).toBe(26 * 60);
      expect(bake.conditions?.temperatureC).toBe(232);
    });
  });

  describe('bouleDutchOven (Leite’s Culinaria — Jim Lahey No-Knead Bread)', () => {
    it('matches volume-to-weight conversions and direct dough balance', () => {
      const resolved = resolve(bouleDutchOven);
      expect(bouleDutchOven.formula.anchor).toEqual({ kind: 'flourTotal', grams: 360 });

      expect(resolved.flourTotal).toBe(360);
      close(required(resolved.grams['water']), (227 * 4) / 3);
      close(required(resolved.grams['salt']), 7.5);
      close(required(resolved.grams['instant-yeast']), 0.75);

      expect(Object.keys(resolved.components)).toHaveLength(0);
      const expectedDoughWeight = 360 + (227 * 4) / 3 + 7.5 + 0.75;
      close(resolved.doughWeight, expectedDoughWeight);
    });

    it('enforces no-knead process without bulk fold sets', () => {
      const stepIds = bouleDutchOven.process.steps.map((s) => s.id);
      expect(stepIds).toEqual(['mix', 'bulk', 'shape', 'proof', 'preheat', 'bake', 'cool']);

      const mix = required(bouleDutchOven.process.steps.find((s) => s.id === 'mix'));
      expect(mix.plannedDurationS).toBe(30);

      const bulk = required(bouleDutchOven.process.steps.find((s) => s.id === 'bulk'));
      expect(bulk.plannedDurationS).toBe(15 * 3600);
      expect(bulk.conditions?.temperatureC).toBe(22.2);
      expect(bulk.technique?.folds).toBeUndefined();

      const proof = required(bouleDutchOven.process.steps.find((s) => s.id === 'proof'));
      expect(proof.plannedDurationS).toBe(2 * 3600);

      const preheat = required(bouleDutchOven.process.steps.find((s) => s.id === 'preheat'));
      expect(preheat.plannedDurationS).toBe(30 * 60);

      const bake = required(bouleDutchOven.process.steps.find((s) => s.id === 'bake'));
      expect(bake.plannedDurationS).toBe(52.5 * 60);
      expect(bake.conditions?.temperatureC).toBe(232);
      expect(bake.label).toContain('Dutch oven');
    });
  });

  describe('ciabatta (King Arthur Baking — Professional Ciabatta)', () => {
    it('matches professional 10 kg baseline and preserves unspecified yeast form', () => {
      const resolved = resolve(ciabatta);
      expect(ciabatta.formula.anchor).toEqual({ kind: 'flourTotal', grams: 10000 });

      expect(resolved.flourTotal).toBe(10000);
      close(required(resolved.grams['water']), 7600);
      close(required(resolved.grams['salt']), 200);
      close(required(resolved.grams['yeast']), 120);

      const yeastIng = required(ciabatta.formula.ingredients.find((i) => i.id === 'yeast'));
      expect(yeastIng).toBeDefined();
      expect(yeastIng.yeast).toBeUndefined();
      expect(yeastIng.water).toBeUndefined();
      expect(yeastIng.fat).toBeUndefined();
      expect(yeastIng.sugar).toBeUndefined();

      const biga = required(resolved.components['biga']);
      expect(biga).toBeDefined();
      close(biga.flour, 3000);
      close(biga.water, 1800);
      close(required(biga.allocations['yeast']), 3);
      close(biga.mass, 3000 + 1800 + 3);

      close(required(resolved.finalMix.flourByFlour['all-purpose-flour']), 7000);
      close(resolved.finalMix.water, 5800);
      close(required(resolved.finalMix.grams['salt']), 200);
      close(required(resolved.finalMix.grams['yeast']), 117);

      close(resolved.doughWeight, 17920);
    });

    it('enforces machine mix phases, DDT semantics, and direct proof after divide', () => {
      const stepIds = ciabatta.process.steps.map((s) => s.id);
      expect(stepIds).toEqual([
        'biga',
        'mix',
        'bulk',
        'divide',
        'proof',
        'preheat',
        'bake',
        'cool',
      ]);

      const biga = required(ciabatta.process.steps.find((s) => s.id === 'biga'));
      expect(biga.plannedDurationS).toBe(16 * 3600);

      const mix = required(ciabatta.process.steps.find((s) => s.id === 'mix'));
      expect(mix.plannedDurationS).toBe(7.5 * 60);
      expect(mix.conditions?.temperatureC).toBe(21);
      expect(mix.conditions?.doughTemperatureC).toBe(23.9);
      expect(mix.technique?.phases).toEqual([
        { speed: 'low', durationS: 3 * 60 },
        { speed: 'medium', durationS: 4.5 * 60 },
      ]);

      const bulk = required(ciabatta.process.steps.find((s) => s.id === 'bulk'));
      expect(bulk.plannedDurationS).toBe(2 * 3600);
      expect(bulk.technique?.folds).toEqual({
        count: 1,
        intervalS: 1 * 3600,
        style: 'stretchAndFold',
      });

      const divide = required(ciabatta.process.steps.find((s) => s.id === 'divide'));
      expect(divide.plannedDurationS).toBe(10 * 60);

      const proof = required(ciabatta.process.steps.find((s) => s.id === 'proof'));
      expect(proof.dependsOn).toEqual(['divide']);
      expect(proof.plannedDurationS).toBe(1 * 3600);

      const bake = required(ciabatta.process.steps.find((s) => s.id === 'bake'));
      expect(bake.plannedDurationS).toBe(36 * 60);
      expect(bake.conditions?.temperatureC).toBe(238);
    });
  });

  describe('bagels (King Arthur Baking — Water Bagels)', () => {
    it('matches non-diastatic malt powder and excludes water bath from dough', () => {
      const resolved = resolve(bagels);
      expect(bagels.formula.anchor).toEqual({ kind: 'flourTotal', grams: 690 });

      expect(resolved.flourTotal).toBe(690);
      close(required(resolved.grams['water']), 454);
      close(required(resolved.grams['non-diastatic-malt-powder']), 35);
      close(required(resolved.grams['sugar']), 25);
      close(required(resolved.grams['salt']), 18);
      close(required(resolved.grams['instant-yeast']), 6.75);

      const maltIng = required(
        bagels.formula.ingredients.find((i) => i.id === 'non-diastatic-malt-powder'),
      );
      expect(maltIng).toBeDefined();
      expect(maltIng.water).toBeUndefined();
      expect(maltIng.fat).toBeUndefined();
      expect(maltIng.sugar).toBeUndefined();

      expect(bagels.formula.ingredients.some((i) => i.id === 'bath-water')).toBe(false);
      expect(resolved.pureWaterTotal).toBe(454);

      const expectedDoughWeight = 690 + 454 + 35 + 25 + 18 + 6.75;
      close(resolved.doughWeight, expectedDoughWeight);
    });

    it('enforces direct boil after shape without separate final proof', () => {
      const stepIds = bagels.process.steps.map((s) => s.id);
      expect(stepIds).toEqual([
        'mix',
        'bulk',
        'divide',
        'shape',
        'preheat',
        'boil',
        'bake',
        'cool',
      ]);

      const boil = required(bagels.process.steps.find((s) => s.id === 'boil'));
      expect(boil.dependsOn).toEqual(['shape']);
      expect(boil.plannedDurationS).toBe(10 * 60);
      expect(boil.label).toContain('Simmer 30 s per side');

      const bake = required(bagels.process.steps.find((s) => s.id === 'bake'));
      expect(bake.dependsOn).toEqual(['boil', 'preheat']);
      expect(bake.plannedDurationS).toBe(20 * 60);
      expect(bake.conditions?.temperatureC).toBe(218);
    });
  });
});

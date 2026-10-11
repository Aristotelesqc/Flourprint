import { describe, expect, it } from 'vitest';
import { brioche, burgerBuns, pullman, shokupan } from '../src/application/templates/enriched.js';
import {
  blockingIssues,
  checkRecipe,
  resolveFormula,
  validateRecipe,
  type ResolvedFormula,
} from '../src/domain/index.js';

const resolve = (formula: Parameters<typeof resolveFormula>[0]): ResolvedFormula => {
  const res = resolveFormula(formula);
  if (!res.ok) throw new Error(`resolveFormula failed: ${JSON.stringify(res.error)}`);
  return res.value;
};

describe('Sourced enriched bread presets (#34)', () => {
  const templates = [brioche, burgerBuns, pullman, shokupan] as const;

  it('maintains stable IDs, bumped versions and valid domain recipes', () => {
    expect(brioche.id).toBe('brioche');
    expect(brioche.version).toBe('2');
    expect(brioche.category).toBe('enriched');

    expect(burgerBuns.id).toBe('burger-buns');
    expect(burgerBuns.version).toBe('3');
    expect(burgerBuns.category).toBe('enriched');

    expect(pullman.id).toBe('pullman');
    expect(pullman.version).toBe('3');
    expect(pullman.category).toBe('pan');

    expect(shokupan.id).toBe('shokupan');
    expect(shokupan.version).toBe('2');
    expect(shokupan.category).toBe('pan');

    for (const t of templates) {
      const valid = validateRecipe(t.formula, t.process);
      expect(valid.ok, `${t.id} validateRecipe`).toBe(true);
      const issues = checkRecipe(t.formula, t.process);
      expect(blockingIssues(issues), `${t.id} blocking issues`).toEqual([]);
      expect(issues, `${t.id} warnings`).toEqual([]);
      expect(t.basis.length).toBeGreaterThan(50);
    }
  });

  it('brioche: resolves exact Chef Philippe Nanterre measures from 500 g flour total', () => {
    expect(brioche.formula.anchor).toEqual({ kind: 'flourTotal', grams: 500 });
    const resolved = resolve(brioche.formula);

    expect(resolved.flourTotal).toBe(500);
    expect(resolved.pureWaterTotal).toBe(0);
    expect(resolved.grams['egg']).toBeCloseTo(300, 5);
    expect(resolved.grams['butter']).toBeCloseTo(250, 5);
    expect(resolved.grams['sugar']).toBeCloseTo(60, 5);
    expect(resolved.grams['salt']).toBeCloseTo(10, 5);
    expect(resolved.grams['fresh-yeast']).toBeCloseTo(20, 5);

    // Fresh yeast is an inline ingredient with fresh yeast form and unassumed composition
    const yeastIng = brioche.formula.ingredients.find((i) => i.id === 'fresh-yeast');
    expect(yeastIng?.yeast?.form).toBe('fresh');
    expect(yeastIng?.water).toBeUndefined();

    // Total dough mass: 500 + 300 + 250 + 60 + 10 + 20 = 1140 g
    expect(resolved.doughWeight).toBeCloseTo(1140, 5);
    expect(resolved.components).toEqual({});

    // DDT ceiling and proofer conditions
    const mix = brioche.process.steps.find((s) => s.id === 'mix');
    expect(mix?.conditions?.doughTemperatureC).toBe(24);
    const proof = brioche.process.steps.find((s) => s.id === 'proof');
    expect(proof?.conditions?.temperatureC).toBe(28);
    expect(proof?.plannedDurationS).toBe(7200); // 2 h

    // Cold stage is minimum 1 h cold, not invented overnight
    const retard = brioche.process.steps.find((s) => s.id === 'retard');
    expect(retard?.plannedDurationS).toBe(3600);
    expect(retard?.conditions?.temperatureC).toBe(4);
  });

  it('burger-buns: resolves exact KAB Moomie dough measures and excludes external glaze/topping', () => {
    expect(burgerBuns.formula.anchor).toEqual({ kind: 'flourTotal', grams: 420 });
    const resolved = resolve(burgerBuns.formula);

    expect(resolved.flourTotal).toBe(420);
    expect(resolved.grams['water']).toBeCloseTo(198, 5);
    expect(resolved.grams['butter']).toBeCloseTo(28, 5);
    expect(resolved.grams['sugar']).toBeCloseTo(50, 5);
    expect(resolved.grams['egg']).toBeCloseTo(50, 5);
    expect(resolved.grams['salt']).toBeCloseTo(7.5, 5);
    expect(resolved.grams['instant-yeast']).toBeCloseTo(9, 5);

    // Dough sum: 420 + 198 + 28 + 50 + 50 + 7.5 + 9 = 762.5 g
    expect(resolved.doughWeight).toBeCloseTo(762.5, 5);

    // Separate 43 g glaze butter and topping are not in dough ingredients
    expect(burgerBuns.formula.ingredients.map((i) => i.id)).not.toContain('butter-glaze');
    expect(burgerBuns.formula.ingredients.map((i) => i.id)).not.toContain('seed-topping');

    // Bake conditions: 375 °F converted to 191 °C, duration midpoint of 15-18 min = 16.5 min (990 s)
    const bake = burgerBuns.process.steps.find((s) => s.id === 'bake');
    expect(bake?.conditions?.temperatureC).toBe(191);
    expect(bake?.plannedDurationS).toBe(990);
  });

  it('pullman: resolves Modernist Cuisine errata formula and home oven 2-phase bake', () => {
    expect(pullman.formula.anchor).toEqual({ kind: 'flourTotal', grams: 560 });
    const resolved = resolve(pullman.formula);

    expect(resolved.flourTotal).toBe(560);
    expect(resolved.grams['water']).toBeCloseTo(360, 5);
    expect(resolved.grams['butter']).toBeCloseTo(35, 5);
    expect(resolved.grams['sugar']).toBeCloseTo(25, 5);
    expect(resolved.grams['salt']).toBeCloseTo(10, 5);
    expect(resolved.grams['instant-yeast']).toBeCloseTo(5, 5);
    expect(resolved.grams['barley-malt-syrup']).toBeCloseTo(2, 5);

    // Dough sum: 560 + 360 + 35 + 25 + 10 + 5 + 2 = 997 g
    expect(resolved.doughWeight).toBeCloseTo(997, 5);

    // No milk or egg in pullman
    expect(pullman.formula.ingredients.some((i) => i.id === 'milk' || i.id === 'egg')).toBe(false);

    // Sourced DDT: mix conditions.doughTemperatureC holds 25 °C (midpoint of 24-26 °C)
    const mix = pullman.process.steps.find((s) => s.id === 'mix');
    expect(mix?.conditions?.doughTemperatureC).toBe(25);
    expect(mix?.plannedDurationS).toBe(810); // midpoint 10-17 min = 13.5 min

    // Bulk technique: 1 fold at 45 min interval
    const bulk = pullman.process.steps.find((s) => s.id === 'bulk');
    expect(bulk?.technique?.folds).toEqual({ count: 1, intervalS: 2700, style: 'fold' });

    // Home oven 2-phase bake: covered in lidded pan (3150 s at 200 °C) then vented (600 s at 200 °C)
    const bakeCovered = pullman.process.steps.find((s) => s.id === 'bake');
    expect(bakeCovered?.conditions?.temperatureC).toBe(200);
    expect(bakeCovered?.plannedDurationS).toBe(3150); // midpoint 45-60 min

    const bakeVented = pullman.process.steps.find((s) => s.id === 'bake-vented');
    expect(bakeVented?.dependsOn).toEqual(['bake']);
    expect(bakeVented?.conditions?.temperatureC).toBe(200);
    expect(bakeVented?.plannedDurationS).toBe(600); // 10 min
  });

  it('shokupan: draws tangzhong scald accurately with pure water and milk allocation', () => {
    expect(shokupan.formula.anchor).toEqual({ kind: 'flourTotal', grams: 314 });
    const resolved = resolve(shokupan.formula);

    expect(resolved.flourTotal).toBe(314);
    expect(resolved.pureWaterTotal).toBeCloseTo(43, 5);
    expect(resolved.grams['milk']).toBeCloseTo(156, 5);
    expect(resolved.grams['milk-powder']).toBeCloseTo(14, 5);
    expect(resolved.grams['sugar']).toBeCloseTo(50, 5);
    expect(resolved.grams['salt']).toBeCloseTo(6, 5);
    expect(resolved.grams['butter']).toBeCloseTo(57, 5);
    expect(resolved.grams['egg']).toBeCloseTo(50, 5);
    expect(resolved.grams['instant-yeast']).toBeCloseTo(9, 5);

    // Dough sum: 314 + 43 + 156 + 14 + 50 + 6 + 57 + 50 + 9 = 699 g
    expect(resolved.doughWeight).toBeCloseTo(699, 5);

    // Tangzhong scald component draws:
    // 14 g flour, 43 g water, 43 g milk allocation -> component mass 100 g
    const tangzhong = resolved.components['tangzhong'];
    expect(tangzhong).toBeDefined();
    if (!tangzhong) throw new Error('missing tangzhong');
    expect(tangzhong.flour).toBeCloseTo(14, 5);
    expect(tangzhong.water).toBeCloseTo(43, 5);
    expect(tangzhong.allocations['milk']).toBeCloseTo(43, 5);
    expect(tangzhong.mass).toBeCloseTo(100, 5);

    // Final mix receives remainder: 300 g flour, 0 g pure water, 113 g milk, 100 g tangzhong mass
    expect(resolved.finalMix.flourByFlour['bread-flour']).toBeCloseTo(300, 5);
    expect(resolved.finalMix.water).toBeCloseTo(0, 5);
    expect(resolved.finalMix.grams['milk']).toBeCloseTo(113, 5);
    expect(resolved.finalMix.componentMasses['tangzhong']).toBeCloseTo(100, 5);

    // Tangzhong step is alap before mix; mix depends on tangzhong
    const scaldStep = shokupan.process.steps.find((s) => s.id === 'tangzhong');
    expect(scaldStep?.schedule).toBe('alap');
    const mixStep = shokupan.process.steps.find((s) => s.id === 'mix');
    expect(mixStep?.dependsOn).toContain('tangzhong-cool');
    expect(shokupan.process.steps.find((s) => s.id === 'tangzhong-cool')?.dependsOn).toEqual([
      'tangzhong',
    ]);
    expect(scaldStep?.plannedDurationS).toBe(240);

    // Bake: 350 °F -> 177 °C, midpoint 30-35 min = 32.5 min (1950 s)
    const bakeStep = shokupan.process.steps.find((s) => s.id === 'bake');
    expect(bakeStep?.conditions?.temperatureC).toBe(177);
    expect(bakeStep?.plannedDurationS).toBe(1950);
  });
});

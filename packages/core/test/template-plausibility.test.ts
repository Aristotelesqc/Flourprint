import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '../src/application/index.js';
import {
  checkRecipe,
  estimateFermentation,
  isTopologicalOrder,
  resolveFormula,
  validateRecipe,
  type ProcessStep,
  type RecipeTemplate,
} from '../src/domain/index.js';

/**
 * Home-scale plausibility of every built-in template (drafts.md, Templates; the home-scale rule
 * is a PROPOSAL awaiting the owner's approval). The sourced tests assert fidelity to the source;
 * these assert that a home baker can follow what ships. A template that must break a rule is on an
 * explicit exception list below, with its reason; the lists are the only way out.
 *
 * Every bound below is a PROPOSED DEFAULT, to be confirmed or changed by the owner.
 */
const BOUNDS = {
  /** Proposed: a home mixing bowl or stand mixer (g). */
  flourTotalG: { min: 100, max: 2500 },
  /** Proposed: the whole dough, preferments included (g). */
  doughWeightMaxG: 5000,
  /** Proposed: a home oven's setpoint range (°C). */
  bakeC: { min: 150, max: 300 },
} as const;

/** Bake steps that carry no `temperatureC`, with the reason. Proposed; owner to confirm. */
const BAKE_WITHOUT_TEMPERATURE: Readonly<Record<string, string>> = {
  'focaccia/bake-finish': 'finish with the oven turned off, on residual heat: there is no setpoint',
};

/** Templates whose fermentation estimate is `unsupported`, with the reason. */
const ESTIMATE_UNSUPPORTED: Readonly<Record<string, string>> = {
  ciabatta:
    'the source gives the yeast quantity without its form (style-guides.md, evidence gap); the form is the owner’s choice',
};

const bakeSteps = (t: RecipeTemplate): ProcessStep[] =>
  t.process.steps.filter((s) => s.operation === 'bake');

describe.each(RECIPE_TEMPLATES)('template $id is a home recipe', (template) => {
  const resolved = resolveFormula(template.formula);
  if (!resolved.ok) throw new Error(`${template.id} does not resolve`);
  const r = resolved.value;

  it('is valid and passes the recipe checks', () => {
    expect(validateRecipe(template.formula, template.process).ok).toBe(true);
    expect(checkRecipe(template.formula, template.process)).toEqual([]);
  });

  it('has a home-scale flour total and dough weight (proposed bounds)', () => {
    expect(r.flourTotal).toBeGreaterThanOrEqual(BOUNDS.flourTotalG.min);
    expect(r.flourTotal).toBeLessThanOrEqual(BOUNDS.flourTotalG.max);
    expect(r.doughWeight).toBeLessThan(BOUNDS.doughWeightMaxG);
  });

  it('has no ingredient, flour or component at or below 0 g', () => {
    for (const [id, grams] of Object.entries(r.flourByFlour)) expect(grams, id).toBeGreaterThan(0);
    for (const ingredient of template.formula.ingredients) {
      expect(r.grams[ingredient.id], ingredient.id).toBeGreaterThan(0);
    }
    for (const [id, component] of Object.entries(r.components)) {
      expect(component.flour, id).toBeGreaterThan(0);
      expect(component.mass, id).toBeGreaterThan(0);
    }
  });

  it('gives every bake step a home-oven temperature, or is on the exception list', () => {
    const bakes = bakeSteps(template);
    expect(bakes.length).toBeGreaterThan(0);
    for (const step of bakes) {
      const key = `${template.id}/${step.id}`;
      const celsius = step.conditions?.temperatureC;
      if (celsius === undefined) {
        expect(Object.keys(BAKE_WITHOUT_TEMPERATURE), `${key} has no temperature`).toContain(key);
      } else {
        expect(celsius, key).toBeGreaterThanOrEqual(BOUNDS.bakeC.min);
        expect(celsius, key).toBeLessThanOrEqual(BOUNDS.bakeC.max);
        expect(Object.keys(BAKE_WITHOUT_TEMPERATURE), `${key} is listed but has one`).not.toContain(
          key,
        );
      }
    }
  });

  it('has its steps in an executable order', () => {
    const { steps } = template.process;
    const ids = new Set(steps.map((s) => s.id));
    expect(ids.size, 'unique step ids').toBe(steps.length);
    for (const step of steps) {
      expect(step.plannedDurationS ?? 0, step.id).toBeGreaterThan(0);
      for (const dependency of step.dependsOn) expect(ids.has(dependency), step.id).toBe(true);
    }
    expect(isTopologicalOrder(steps)).toBe(true);

    const index = (id: string) => steps.findIndex((s) => s.id === id);
    const dough = steps.filter((s) => s.subject?.kind !== 'component');
    const firstMix = dough.find((s) => s.operation === 'mix');
    expect(firstMix, 'a mix step').toBeDefined();
    // Preparations (preferment, scald) come before the mix that uses them.
    for (const step of steps.filter((s) => s.subject?.kind === 'component')) {
      expect(index(step.id), step.id).toBeLessThan(index(firstMix?.id ?? ''));
    }
    // Nothing that works the dough comes after the first bake, nor does a bake come before the mix.
    const firstBake = bakeSteps(template)[0];
    expect(index(firstBake?.id ?? '')).toBeGreaterThan(index(firstMix?.id ?? ''));
    for (const step of dough) {
      if (['bulk', 'proof', 'divide', 'retard', 'degas'].includes(step.operation)) {
        expect(index(step.id), step.id).toBeGreaterThan(index(firstMix?.id ?? ''));
        expect(index(step.id), step.id).toBeLessThan(index(firstBake?.id ?? ''));
      }
    }
    // Cooling the dough closes the process (a scald's own cooling is a preparation step).
    for (const step of dough.filter((s) => s.operation === 'cool')) {
      for (const bake of bakeSteps(template))
        expect(index(step.id)).toBeGreaterThan(index(bake.id));
    }
  });

  it('has a fermentation estimate, or is on the exception list', () => {
    const estimate = estimateFermentation(template.formula, template.process).dough.duration;
    if (template.id in ESTIMATE_UNSUPPORTED) {
      expect(estimate.status).toBe('unsupported');
    } else {
      expect(estimate.status).not.toBe('unsupported');
    }
  });
});

describe('the exception lists stay honest', () => {
  it('name only existing templates and steps', () => {
    const ids = RECIPE_TEMPLATES.map((t) => t.id);
    for (const key of Object.keys(ESTIMATE_UNSUPPORTED)) expect(ids).toContain(key);
    for (const key of Object.keys(BAKE_WITHOUT_TEMPERATURE)) {
      const [templateId, stepId] = key.split('/');
      const template = RECIPE_TEMPLATES.find((t) => t.id === templateId);
      expect(
        template?.process.steps.some((s) => s.id === stepId && s.operation === 'bake'),
        key,
      ).toBe(true);
    }
  });
});

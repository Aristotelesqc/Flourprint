import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import type { ProcessStep } from '@flourprint/core/domain';
import { isImmediatelyPreceding } from '../src/blocks/RecipeMethod';
import { en, fr } from '../src/i18n/messages';
import { getCuratedStepPresentation, TEMPLATE_STEP_LABELS } from '../src/i18n/use-messages';

describe('production step dependency logic', () => {
  const steps: ProcessStep[] = [
    { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap' },
    { id: 'bulk', operation: 'bulk', dependsOn: ['mix'], schedule: 'asap' },
    { id: 'divide', operation: 'divide', dependsOn: ['bulk'], schedule: 'asap' },
    { id: 'rest', operation: 'rest', dependsOn: ['mix'], schedule: 'asap' },
    { id: 'bake', operation: 'bake', dependsOn: ['divide', 'rest'], schedule: 'asap' },
  ];

  const [mix, bulk, divide, rest, bake] = steps;
  if (!mix || !bulk || !divide || !rest || !bake) throw new Error('Missing test steps');

  it('evaluates linear consecutive vs non-immediate predecessor using production function', () => {
    expect(isImmediatelyPreceding(mix, steps)).toBe(false);
    expect(isImmediatelyPreceding(bulk, steps)).toBe(true);
    expect(isImmediatelyPreceding(divide, steps)).toBe(true);
    expect(isImmediatelyPreceding(rest, steps)).toBe(false);
    expect(isImmediatelyPreceding(bake, steps)).toBe(false);
  });
});

describe('curated recipe template step labels (Item 9)', () => {
  it('covers every built-in RECIPE_TEMPLATES step label in the production presentation map', () => {
    const allLabels: string[] = [];
    for (const template of RECIPE_TEMPLATES) {
      for (const step of template.process.steps) {
        if (step.label) {
          allLabels.push(step.label);
        }
      }
    }

    expect(allLabels.length).toBe(34);
    const uniqueLabels = Array.from(new Set(allLabels));
    expect(uniqueLabels.length).toBe(34);
    expect(Object.keys(TEMPLATE_STEP_LABELS).length).toBe(34);

    for (const label of uniqueLabels) {
      const curated = getCuratedStepPresentation(label);
      expect(curated, `Missing presentation mapping for label: ${label}`).toBeDefined();
      if (!curated) continue;

      // Both keys must exist in English and French catalogs
      expect(curated.shortKey in en, `Missing EN shortKey: ${curated.shortKey}`).toBe(true);
      expect(curated.shortKey in fr, `Missing FR shortKey: ${curated.shortKey}`).toBe(true);
      expect(curated.fullKey in en, `Missing EN fullKey: ${curated.fullKey}`).toBe(true);
      expect(curated.fullKey in fr, `Missing FR fullKey: ${curated.fullKey}`).toBe(true);

      // Messages must be non-empty
      const enShort = en[curated.shortKey].trim();
      const frShort = fr[curated.shortKey].trim();
      const enFull = en[curated.fullKey].trim();
      const frFull = fr[curated.fullKey].trim();

      expect(enShort.length).toBeGreaterThan(0);
      expect(frShort.length).toBeGreaterThan(0);
      expect(enFull.length).toBeGreaterThan(0);
      expect(frFull.length).toBeGreaterThan(0);

      // Short display names should be concise compared to full instructions
      expect(enShort.length).toBeLessThanOrEqual(enFull.length);
      expect(frShort.length).toBeLessThanOrEqual(frFull.length);

      // French typography: colons must have preceding space
      if (frFull.includes(':')) {
        expect(frFull).toMatch(/ :/);
      }
    }
  });

  it('preserves arbitrary custom user labels as literal and leaves instructions undefined', () => {
    const customLabels = [
      'My custom sourdough fold',
      'Étape personnalisée avec graines',
      'Custom 450 °F bake',
      '',
    ];

    for (const custom of customLabels) {
      const curated = getCuratedStepPresentation(custom);
      expect(curated).toBeUndefined();
    }

    expect(getCuratedStepPresentation(undefined)).toBeUndefined();
  });
});

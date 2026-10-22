import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '../src/application/index.js';
import { phasesOf, subjectOf, validateRecipe } from '../src/domain/index.js';

/** process.md, Subjects and component phases: the built-in templates attribute component phases explicitly. */

/** Hand-written: for each template, component id -> its phase step ids in process order. */
const EXPECTED_PHASES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  baguette: { poolish: ['poolish'] },
  ciabatta: { biga: ['biga'] },
  shokupan: { tangzhong: ['tangzhong', 'tangzhong-cool'] },
};

describe('template component phases', () => {
  it('lists the expected phases of every component of every template', () => {
    const seen = new Set<string>();
    for (const template of RECIPE_TEMPLATES) {
      const components = template.formula.components ?? [];
      const expected = EXPECTED_PHASES[template.id] ?? {};
      expect(Object.keys(expected).sort(), template.id).toEqual(components.map((c) => c.id).sort());
      if (components.length > 0) seen.add(template.id);
      for (const c of components) {
        expect(
          phasesOf(template.process, c.id).map((s) => s.id),
          `${template.id}/${c.id}`,
        ).toEqual(expected[c.id]);
        for (const id of expected[c.id] ?? []) {
          const found = template.process.steps.find((s) => s.id === id);
          if (!found) throw new Error(`${template.id}: no step ${id}`);
          expect(found.subject).toEqual({ kind: 'component', id: c.id });
          expect(subjectOf(template.process, found)).toEqual({ kind: 'component', id: c.id });
        }
      }
      expect(validateRecipe(template.formula, template.process).ok, template.id).toBe(true);
    }
    expect([...seen].sort()).toEqual(Object.keys(EXPECTED_PHASES).sort());
  });
});

import type { Formula, Process } from '@flourprint/core/domain';
import poolishTangzhong from '../../../../examples/poolish-tangzhong.formula.json' with { type: 'json' };

const H = 3600;

/**
 * Reference journey of #17, now a test fixture only: the app seeds no recipe (persistence.md,
 * Recipe trash). Unit tests build bakes from it and the browser journeys load it as a recipe.
 */
export const sampleRecipe: { id: string; name: string; formula: Formula; process: Process } = {
  id: 'poolish-tangzhong',
  name: 'Poolish + tangzhong',
  formula: {
    ...(poolishTangzhong as Formula),
    // Instant yeast is about 5 % water; an estimate keeps total water complete in the sample.
    ingredients: (poolishTangzhong as Formula).ingredients.map((i) =>
      i.id === 'instant-yeast'
        ? {
            ...i,
            water: { status: 'estimated', valuePct: 5, rangePct: [4, 6] },
            yeast: { form: 'instant' },
          }
        : i,
    ),
  },
  process: {
    steps: [
      {
        id: 'poolish',
        operation: 'preferment',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 12 * H,
      },
      { id: 'tangzhong', operation: 'scald', dependsOn: [], schedule: 'alap', plannedDurationS: H },
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: ['poolish', 'tangzhong'],
        schedule: 'asap',
        plannedDurationS: 0.25 * H,
      },
      {
        id: 'bulk',
        operation: 'bulk',
        dependsOn: ['mix'],
        schedule: 'asap',
        plannedDurationS: 3 * H,
      },
      {
        id: 'shape',
        operation: 'shape',
        dependsOn: ['bulk'],
        schedule: 'asap',
        plannedDurationS: 0.25 * H,
      },
      {
        id: 'proof',
        operation: 'proof',
        dependsOn: ['shape'],
        schedule: 'asap',
        plannedDurationS: 2 * H,
      },
      { id: 'preheat', operation: 'preheat', dependsOn: [], schedule: 'alap', plannedDurationS: H },
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: ['proof', 'preheat'],
        schedule: 'asap',
        plannedDurationS: 40 * 60,
      },
      {
        id: 'cool',
        operation: 'cool',
        dependsOn: ['bake'],
        schedule: 'asap',
        plannedDurationS: 2 * H,
      },
    ],
  },
};

/** The sample as a full backup document, which the browser build restores at start-up. */
export const sampleBackup = (createdAt = '2026-10-01T12:00:00.000Z') => ({
  kind: 'flourprint-backup',
  schemaVersion: 1,
  exportedAt: createdAt,
  recipes: [
    {
      id: sampleRecipe.id,
      name: sampleRecipe.name,
      revisions: [
        {
          recipeId: sampleRecipe.id,
          version: 1,
          formula: sampleRecipe.formula,
          process: sampleRecipe.process,
          createdAt,
        },
      ],
    },
  ],
  families: [],
  bakes: [],
});

/** The sample as a recipes file, for the native suites that import it through Advanced. */
export const sampleRecipesFile = (createdAt = '2026-10-01T12:00:00.000Z') => {
  const { recipes } = sampleBackup(createdAt);
  return {
    kind: 'flourprint-recipes',
    schemaVersion: 1,
    exportedAt: createdAt,
    recipes,
    families: [],
  };
};

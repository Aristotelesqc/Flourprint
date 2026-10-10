import type { Formula, Process } from '../../domain/index.js';
import { alapStep, H, MIN, preset, step } from './build.js';

/** The blank recipe of drafts.md: a lean straight dough to start from. */
export const blankRecipe = (): { formula: Formula; process: Process } => ({
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [preset('water', 65), preset('salt', 2), preset('instant-yeast', 0.5)],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, { conditions: { temperatureC: 21 } }),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('shape', 'shape', ['bulk'], 15 * MIN),
      step('proof', 'proof', ['shape'], H),
      alapStep('preheat', 'preheat', 45 * MIN),
      { ...step('bake', 'bake', ['proof', 'preheat'], 35 * MIN) },
    ],
  },
});

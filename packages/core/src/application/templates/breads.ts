import type { RecipeTemplate } from '../../domain/index.js';
import { alapStep, H, MIN, preset, step } from './build.js';

/** Lean breads (drafts.md, Templates): proportions are typical of the style, not tested recipes. */

const room = { conditions: { temperatureC: 21 } } as const;
const fridge = { conditions: { temperatureC: 4 } } as const;

export const baguette: RecipeTemplate = {
  id: 'baguette',
  version: '1',
  category: 'bread',
  basis:
    'Typical proportions of a poolish baguette from common bakery formulas (e.g. Hamelman, Bread): ' +
    'about a third of the flour in a 100 % hydration poolish, 68 % water, 2 % salt, little yeast. ' +
    'A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'flour', sharePct: 100 }],
    ingredients: [preset('water', 68), preset('salt', 2), preset('instant-yeast', 0.3)],
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 33,
        flourBlend: [{ flour: 'flour', sharePct: 100 }],
        hydrationPct: 100,
        allocations: [{ ingredient: 'instant-yeast', bakerPct: 0.03 }],
      },
    ],
    anchor: { kind: 'pieces', count: 3, gramsEach: 350 },
  },
  process: {
    steps: [
      step('poolish', 'preferment', [], 12 * H, room),
      step('mix', 'mix', ['poolish'], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('preshape', 'preshape', ['divide'], 25 * MIN),
      step('shape', 'shape', ['preshape'], 15 * MIN),
      step('proof', 'proof', ['shape'], H),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 25 * MIN),
      step('cool', 'cool', ['bake'], 30 * MIN),
    ],
  },
};

export const bouleDutchOven: RecipeTemplate = {
  id: 'boule-dutch-oven',
  version: '3',
  category: 'bread',
  basis:
    'Typical proportions of a lean country-style loaf with commercial yeast, from common bakery and ' +
    'home-baking formulas: bread flour with 10 % whole wheat, 75 % water, 2 % salt, 0.4 % instant ' +
    'yeast with a 5 h bulk, baked in a preheated Dutch oven. A starting point, not a tested recipe.' +
    ' Version 2 follows docs/science/data/style-guides.md (ranges read through search excerpts, unverified).' +
    ' Version 3 records the usual sets of stretch and folds during the bulk (process.md, Techniques): ' +
    'recorded only, nothing is predicted from them.',
  formula: {
    flours: [
      { id: 'bread-flour', sharePct: 90 },
      { id: 'whole-wheat', sharePct: 10 },
    ],
    ingredients: [preset('water', 75), preset('salt', 2), preset('instant-yeast', 0.4)],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 5 * H, {
        technique: { folds: { count: 4, intervalS: 30 * MIN, style: 'stretchAndFold' } },
      }),
      step('preshape', 'preshape', ['bulk'], 25 * MIN),
      step('shape', 'shape', ['preshape'], 10 * MIN),
      step('proof', 'proof', ['shape'], H),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['proof', 'preheat'], 45 * MIN),
      step('cool', 'cool', ['bake'], H),
    ],
  },
};

export const ciabatta: RecipeTemplate = {
  id: 'ciabatta',
  version: '3',
  category: 'bread',
  basis:
    'Typical proportions of a ciabatta with biga from common bakery formulas (e.g. Hamelman, ' +
    'Bread): 30 % of the flour in a stiff biga, about 77 % water overall, 2 % salt, little yeast. ' +
    'A starting point, not a tested recipe.' +
    ' Version 2 follows docs/science/data/style-guides.md (ranges read through search excerpts, unverified).' +
    ' Version 3 records the usual sets of stretch and folds during the bulk (process.md, Techniques): ' +
    'recorded only, nothing is predicted from them.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [preset('water', 77), preset('salt', 2), preset('instant-yeast', 0.4)],
    components: [
      {
        id: 'biga',
        kind: 'preferment',
        flourPct: 30,
        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
        hydrationPct: 55,
        allocations: [{ ingredient: 'instant-yeast', bakerPct: 0.05 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('biga', 'preferment', [], 14 * H, { conditions: { temperatureC: 18 } }),
      step('mix', 'mix', ['biga'], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2.5 * H, {
        technique: { folds: { count: 3, intervalS: 30 * MIN, style: 'stretchAndFold' } },
      }),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('proof', 'proof', ['divide'], 45 * MIN),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 25 * MIN),
      step('cool', 'cool', ['bake'], 30 * MIN),
    ],
  },
};

export const bagels: RecipeTemplate = {
  id: 'bagels',
  version: '2',
  category: 'bread',
  basis:
    'Typical proportions of New York-style bagels from common bakery formulas (e.g. Hamelman, ' +
    'Bread): a stiff dough of strong flour at about 57 % water, 2 % salt, malt syrup, retarded ' +
    'overnight, boiled then baked. A starting point, not a tested recipe.' +
    ' Version 2 follows docs/science/data/style-guides.md (ranges read through search excerpts, unverified).',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 57),
      preset('salt', 2),
      preset('instant-yeast', 0.7),
      preset('barley-malt-syrup', 3),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 8, gramsEach: 110 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 30 * MIN),
      step('divide', 'divide', ['bulk'], 15 * MIN),
      step('shape', 'shape', ['divide'], 20 * MIN),
      step('retard', 'retard', ['shape'], 12 * H, fridge),
      step('proof', 'proof', ['retard'], 45 * MIN, room),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('boil', 'boil', ['proof'], 15 * MIN),
      step('bake', 'bake', ['boil', 'preheat'], 18 * MIN),
      step('cool', 'cool', ['bake'], 30 * MIN),
    ],
  },
};

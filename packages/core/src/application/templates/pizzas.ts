import type { RecipeTemplate } from '../../domain/index.js';
import { alapStep, H, MIN, preset, step } from './build.js';

/** Focaccia and pizzas (drafts.md, Templates): typical proportions, not tested recipes. */

const room = { conditions: { temperatureC: 21 } } as const;
const fridge = { conditions: { temperatureC: 4 } } as const;

export const focaccia: RecipeTemplate = {
  id: 'focaccia',
  version: '1',
  category: 'flatbread',
  basis:
    'Typical proportions of a Genoese-style pan focaccia from common bakery and home-baking ' +
    'formulas: about 80 % water, 5 % olive oil in the dough, 2.5 % salt, baked in an oiled pan. ' +
    'A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 80),
      preset('olive-oil', 5),
      preset('salt', 2.5),
      preset('instant-yeast', 0.5),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 10 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('shape', 'shape', ['bulk'], 15 * MIN),
      step('proof', 'proof', ['shape'], 1.5 * H),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 25 * MIN),
      step('cool', 'cool', ['bake'], 15 * MIN),
    ],
  },
};

export const pizzaNeoNeapolitan: RecipeTemplate = {
  id: 'pizza-neo-neapolitan',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a Neapolitan-style dough within the AVPN disciplinare ranges ' +
    '(tipo 00 flour, about 58-62 % water, 2.8 % salt, very little yeast), adapted to a home ' +
    'oven with 24-48 h of cold fermentation. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'tipo-00-flour', sharePct: 100 }],
    ingredients: [preset('water', 62), preset('salt', 2.8), preset('instant-yeast', 0.1)],
    components: [],
    anchor: { kind: 'pieces', count: 4, gramsEach: 260 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('divide', 'divide', ['bulk'], 15 * MIN),
      step('retard', 'retard', ['divide'], 24 * H, fridge),
      step('proof', 'proof', ['retard'], 3 * H, room),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['proof', 'preheat'], 30 * MIN),
    ],
  },
};

export const pizzaRoman: RecipeTemplate = {
  id: 'pizza-roman',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a thin, crisp Roman tonda from common pizzeria formulas: tipo 00 ' +
    'flour, about 56 % water, 3 % olive oil, 2.5 % salt, small dough balls rolled thin, a day of ' +
    'cold fermentation. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'tipo-00-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 56),
      preset('olive-oil', 3),
      preset('salt', 2.5),
      preset('instant-yeast', 0.2),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 4, gramsEach: 200 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], H),
      step('divide', 'divide', ['bulk'], 15 * MIN),
      step('retard', 'retard', ['divide'], 24 * H, fridge),
      step('proof', 'proof', ['retard'], 2 * H, room),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['proof', 'preheat'], 30 * MIN),
    ],
  },
};

export const pizzaNewYork: RecipeTemplate = {
  id: 'pizza-new-york',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a New York-style dough from common pizzeria and home-baking formulas: ' +
    'strong flour, about 62 % water, 2 % olive oil, 1.5 % sugar, 2 % salt, 1-3 days of cold ' +
    'fermentation. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 62),
      preset('olive-oil', 2),
      preset('sugar', 1.5),
      preset('salt', 2),
      preset('instant-yeast', 0.4),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 4, gramsEach: 280 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('divide', 'divide', ['mix'], 15 * MIN),
      step('retard', 'retard', ['divide'], 24 * H, fridge),
      step('proof', 'proof', ['retard'], 2 * H, room),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['proof', 'preheat'], 40 * MIN),
    ],
  },
};

export const pizzaChicago: RecipeTemplate = {
  id: 'pizza-chicago',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a Chicago deep-dish crust from common home-baking formulas: ' +
    'all-purpose flour with optional cornmeal, a low water of about 52 %, about 18 % fat (butter ' +
    'and oil), 1.8 % salt, pressed into a 12-inch deep-dish pan. A starting point, not a tested ' +
    'recipe.',
  formula: {
    flours: [
      { id: 'flour', sharePct: 90 },
      { id: 'cornmeal', sharePct: 10 },
    ],
    ingredients: [
      preset('water', 52),
      preset('butter', 10),
      preset('olive-oil', 8),
      preset('sugar', 1.5),
      preset('salt', 1.8),
      preset('instant-yeast', 0.8),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 1, gramsEach: 700 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 10 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('shape', 'shape', ['bulk'], 15 * MIN),
      step('proof', 'proof', ['shape'], 30 * MIN),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 35 * MIN),
      step('cool', 'cool', ['bake'], 10 * MIN),
    ],
  },
};

export const pizzaSicilian: RecipeTemplate = {
  id: 'pizza-sicilian',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a thick Sicilian-style pan pizza from common pizzeria and ' +
    'home-baking formulas: strong flour, about 70 % water, 4 % olive oil, 1 % sugar, 2.2 % salt, ' +
    'one dough for an oiled half-sheet pan. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 70),
      preset('olive-oil', 4),
      preset('sugar', 1),
      preset('salt', 2.2),
      preset('instant-yeast', 0.5),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 1, gramsEach: 1000 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2 * H),
      step('shape', 'shape', ['bulk'], 15 * MIN),
      step('proof', 'proof', ['shape'], 1.5 * H),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 25 * MIN),
      step('cool', 'cool', ['bake'], 10 * MIN),
    ],
  },
};

export const pizzaTeglia: RecipeTemplate = {
  id: 'pizza-teglia',
  version: '1',
  category: 'pizza',
  basis:
    'Typical proportions of a Roman pan pizza (pizza in teglia) from common pizzeria formulas: ' +
    'strong flour, a very high water of about 80 %, 3 % olive oil, 2.5 % salt, 1-2 days of cold ' +
    'bulk fermentation, stretched into an oiled pan. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 80),
      preset('olive-oil', 3),
      preset('salt', 2.5),
      preset('instant-yeast', 0.3),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 1, gramsEach: 750 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 20 * MIN, room),
      step('bulk', 'bulk', ['mix'], H),
      step('retard', 'retard', ['bulk'], 24 * H, fridge),
      step('divide', 'divide', ['retard'], 15 * MIN, room),
      step('proof', 'proof', ['divide'], 3 * H),
      step('shape', 'shape', ['proof'], 15 * MIN),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['shape', 'preheat'], 25 * MIN),
      step('cool', 'cool', ['bake'], 10 * MIN),
    ],
  },
};

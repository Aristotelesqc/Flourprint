import type { RecipeTemplate } from '../../domain/index.js';
import { alapStep, H, MIN, preset, step } from './build.js';

/** Enriched and pan breads (drafts.md, Templates): typical proportions, not tested recipes. */

const room = { conditions: { temperatureC: 21 } } as const;
const warm = { conditions: { temperatureC: 24 } } as const;

export const brioche: RecipeTemplate = {
  id: 'brioche',
  version: '1',
  category: 'enriched',
  basis:
    'Typical proportions of a rich brioche from common bakery formulas (e.g. Hamelman, Bread; ' +
    'French pastry references): about 50 % butter, 50 % eggs, 12 % sugar, 2 % salt, a cold ' +
    'overnight rest before shaping. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'flour', sharePct: 100 }],
    ingredients: [
      preset('egg', 50),
      preset('milk', 10),
      preset('butter', 50),
      preset('sugar', 12),
      preset('salt', 2),
      preset('instant-yeast', 0.9),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 25 * MIN, room),
      step('bulk', 'bulk', ['mix'], H),
      step('retard', 'retard', ['bulk'], 12 * H, { conditions: { temperatureC: 4 } }),
      step('divide', 'divide', ['retard'], 10 * MIN, room),
      step('shape', 'shape', ['divide'], 20 * MIN),
      step('proof', 'proof', ['shape'], 2.5 * H, warm),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 30 * MIN),
      step('cool', 'cool', ['bake'], H),
    ],
  },
};

export const burgerBuns: RecipeTemplate = {
  id: 'burger-buns',
  version: '1',
  category: 'enriched',
  basis:
    'Typical proportions of soft burger buns from common bakery and home-baking formulas: ' +
    'water and milk, about 10 % egg, 10 % butter, 8 % sugar, 2 % salt. A starting point, not a ' +
    'tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 30),
      preset('milk', 30),
      preset('egg', 10),
      preset('butter', 10),
      preset('sugar', 8),
      preset('salt', 2),
      preset('instant-yeast', 0.9),
    ],
    components: [],
    anchor: { kind: 'pieces', count: 8, gramsEach: 90 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 1.5 * H),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('shape', 'shape', ['divide'], 15 * MIN),
      step('proof', 'proof', ['shape'], H, warm),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 18 * MIN),
      step('cool', 'cool', ['bake'], 30 * MIN),
    ],
  },
};

export const pullman: RecipeTemplate = {
  id: 'pullman',
  version: '1',
  category: 'pan',
  basis:
    'Typical proportions of a pullman (pain de mie) sandwich loaf from common bakery formulas: ' +
    'water and milk, about 6 % butter, 6 % sugar, 2 % salt, about 1000 g of dough for a 13-inch ' +
    'lidded pan. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 45),
      preset('milk', 20),
      preset('butter', 6),
      preset('sugar', 6),
      preset('salt', 2),
      preset('instant-yeast', 0.8),
    ],
    components: [],
    anchor: { kind: 'doughWeight', grams: 1000 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 1.5 * H),
      step('shape', 'shape', ['bulk'], 15 * MIN),
      step('proof', 'proof', ['shape'], H, warm),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 40 * MIN),
      step('cool', 'cool', ['bake'], 2 * H),
    ],
  },
};

export const shokupan: RecipeTemplate = {
  id: 'shokupan',
  version: '1',
  category: 'pan',
  basis:
    'Typical proportions of a Japanese milk bread (shokupan) from common home-baking formulas: ' +
    '5 % of the flour cooked in a tangzhong at 1:5, water and milk, about 8 % butter, 8 % sugar, ' +
    '1.8 % salt, about 650 g of dough for a loaf pan. A starting point, not a tested recipe.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 38),
      preset('milk', 35),
      preset('butter', 8),
      preset('sugar', 8),
      preset('salt', 1.8),
      preset('instant-yeast', 0.9),
    ],
    components: [
      {
        id: 'tangzhong',
        kind: 'scald',
        flourPct: 5,
        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
        hydrationPct: 500,
        waterLossPct: 0,
      },
    ],
    anchor: { kind: 'doughWeight', grams: 650 },
  },
  process: {
    steps: [
      alapStep('tangzhong', 'scald', H),
      step('mix', 'mix', ['tangzhong'], 20 * MIN, room),
      step('bulk', 'bulk', ['mix'], H),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('rest', 'rest', ['divide'], 15 * MIN),
      step('shape', 'shape', ['rest'], 15 * MIN),
      step('proof', 'proof', ['shape'], H, warm),
      alapStep('preheat', 'preheat', 45 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 30 * MIN),
      step('cool', 'cool', ['bake'], 2 * H),
    ],
  },
};

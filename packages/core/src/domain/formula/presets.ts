import type { Ingredient } from './types.js';

/**
 * A few common ingredients with their composition, until the editable registry (#26) replaces
 * them. Contents per 100 g are estimates from food composition tables (USDA SR Legacy, approx.)
 * with ranges; the user can change any of them in the recipe.
 */
export interface IngredientPreset {
  readonly id: string;
  readonly ingredient: Omit<Ingredient, 'id' | 'bakerPct'>;
}

const usda = 'USDA SR Legacy (approx.)';
const est = (valuePct: number, low: number, high: number, source = usda) =>
  ({ status: 'estimated', valuePct, rangePct: [low, high], source }) as const;
const known = (valuePct: number, source: string) =>
  ({ status: 'known', valuePct, source }) as const;

export const INGREDIENT_PRESETS: readonly IngredientPreset[] = [
  { id: 'water', ingredient: { kind: 'water', role: 'dough' } },
  {
    id: 'salt',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: known(0, 'sodium chloride'),
      fat: known(0, 'sodium chloride'),
      sugar: known(0, 'sodium chloride'),
    },
  },
  {
    id: 'instant-yeast',
    ingredient: {
      kind: 'other',
      role: 'dough',
      yeast: { form: 'instant' },
      water: est(5, 4, 8),
      fat: est(4.5, 1.3, 7.6),
      sugar: est(0, 0, 1),
    },
  },
  {
    id: 'active-dry-yeast',
    ingredient: {
      kind: 'other',
      role: 'dough',
      yeast: { form: 'active-dry' },
      water: est(6, 5, 8),
      fat: est(4.5, 1.3, 7.6),
      sugar: est(0, 0, 1),
    },
  },
  {
    id: 'milk',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(89, 87.5, 91),
      fat: est(2, 0.1, 3.6),
      sugar: est(5, 4.8, 5.2),
    },
  },
  {
    id: 'egg',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(76, 75, 77),
      fat: est(9.5, 9, 10.5),
      sugar: est(0.4, 0.2, 0.6),
    },
  },
  {
    id: 'butter',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(16, 15, 18),
      fat: est(81, 80, 83),
      sugar: est(0, 0, 0.1),
    },
  },
  {
    id: 'honey',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(17, 15, 20),
      fat: known(0, usda),
      sugar: est(82, 79, 85),
    },
  },
  {
    id: 'sugar',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: known(0, 'granulated sugar'),
      fat: known(0, 'granulated sugar'),
      sugar: known(100, 'granulated sugar'),
    },
  },
  {
    id: 'olive-oil',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: known(0, 'oil contains no water'),
      fat: known(100, 'oil'),
      sugar: known(0, 'oil'),
    },
  },
  {
    id: 'sour-cream',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(76, 71, 80),
      fat: est(16, 12, 20),
      sugar: est(3, 2.5, 4),
    },
  },
  {
    id: 'diastatic-malt',
    ingredient: {
      kind: 'other',
      role: 'dough',
      water: est(6, 5.5, 7, 'supplier specifications (approx.)'),
    },
  },
];

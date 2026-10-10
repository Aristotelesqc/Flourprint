import type { RecipeTemplate } from '../../domain/index.js';
import { bagels, baguette, bouleDutchOven, ciabatta } from './breads.js';
import { brioche, burgerBuns, pullman, shokupan } from './enriched.js';
import {
  focaccia,
  pizzaChicago,
  pizzaNeoNeapolitan,
  pizzaNewYork,
  pizzaRoman,
  pizzaSicilian,
  pizzaTeglia,
} from './pizzas.js';

/** Templates shipped with the app (drafts.md, Templates). */
export const RECIPE_TEMPLATES: readonly RecipeTemplate[] = [
  baguette,
  bouleDutchOven,
  brioche,
  burgerBuns,
  pullman,
  shokupan,
  ciabatta,
  bagels,
  focaccia,
  pizzaNeoNeapolitan,
  pizzaRoman,
  pizzaNewYork,
  pizzaChicago,
  pizzaSicilian,
  pizzaTeglia,
];

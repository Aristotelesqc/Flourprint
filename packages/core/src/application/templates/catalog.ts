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
import { STYLE_GUIDES } from './guides.js';

const TEMPLATES: readonly RecipeTemplate[] = [
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

/** Templates shipped with the app (drafts.md, Templates), each with its style guide when known. */
export const RECIPE_TEMPLATES: readonly RecipeTemplate[] = TEMPLATES.map((template) => {
  const guide = STYLE_GUIDES[template.id];
  return guide ? { ...template, guide } : template;
});

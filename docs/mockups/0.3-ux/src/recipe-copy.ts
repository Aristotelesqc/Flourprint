import type { Locale } from './messages';

export const recipeCopyMap = {
  removeAction: ['Retirer', 'Remove'],
  removeComponentConsequence: [
    'Retirer cette préparation et réintégrer ses ingrédients au mélange final.',
    'Remove this component and return its ingredients to the final mix.',
  ],
  removeIngredientConsequence: [
    'Retirer cet ingrédient de la recette.',
    'Remove this ingredient from the recipe.',
  ],
  lockedHint: [
    'Cible verrouillée : déverrouiller pour modifier.',
    'Locked target: unlock to modify.',
  ],
} as const;

export type RecipeCopyKey = keyof typeof recipeCopyMap;

export function recipeCopy(locale: Locale, key: RecipeCopyKey): string {
  return recipeCopyMap[key][locale === 'fr' ? 0 : 1];
}

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
  stageGramsLabel: ['Grammes à cette étape', 'Stage grams'],
  absorbingWaterLocked: [
    'Eau absorbante verrouillée par la cible d’hydratation',
    'Absorbing water locked by hydration target',
  ],
  flourDisclosureTitle: ['Farine(s)', 'Flour(s)'],
  addFlour: ['Ajouter une farine', 'Add flour'],
  preDoughsTitle: ['Pré-ferments', 'Pre-doughs'],
  noPreDough: ['Aucun pré-ferment dans cette recette.', 'No pre-dough in this recipe.'],
  waterSourcesTitle: ['Origine de l’eau', 'Water sources'],
  waterLossLabel: ['Pertes à la cuisson du pré-ferment', 'Pre-dough cooking loss'],
  unknownWaterLabel: [
    'Teneur en eau non renseignée (explique le ≥)',
    'Unknown water content (explains ≥)',
  ],
  incompleteProfile: ['Profil incomplet', 'Incomplete profile'],
  incompleteProfileWaterFatSugar: [
    'Profil incomplet : teneur en eau, gras et sucres non renseignée pour',
    'Incomplete profile: water, fat and sugar content not provided for',
  ],
  incompleteProfileTitle: ['Profil nutritionnel incomplet', 'Incomplete nutritional profile'],
  incompleteProfileExplanation: [
    'Certains ingrédients n’ont pas de composition détaillée. Le moteur affiche des totaux minorés (≥) pour garantir que les quantités réelles ne sont pas surestimées.',
    'Some ingredients lack detailed composition data. The engine displays lower bounds (≥) to ensure quantities are never overestimated.',
  ],
  fatContributions: ['Répartition des matières grasses', 'Fat contributions'],
  sugarContributions: ['Répartition des sucres', 'Sugar contributions'],
  piece: ['pièce', 'piece'],
  pieces: ['pièces', 'pieces'],
} as const;

export type RecipeCopyKey = keyof typeof recipeCopyMap;

export function recipeCopy(locale: Locale, key: RecipeCopyKey): string {
  return recipeCopyMap[key][locale === 'fr' ? 0 : 1];
}

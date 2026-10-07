/**
 * Message catalogs (ADR 0009). English is the source locale; every catalog has the same keys.
 * ICU message syntax for plurals and interpolation.
 */
export const en = {
  'app.title': 'Flourprint',
  'recipes.title': 'Recipes',
  'recipes.empty': 'No recipe yet.',
  'recipes.version': 'Version {version}',
  'formula.title': 'Formula',
  'formula.anchor.flourTotal': 'Total flour {grams}',
  'formula.anchor.doughWeight': 'Dough weight {grams}',
  'formula.anchor.pieces': '{count, plural, one {# piece} other {# pieces}} of {grams}',
  'formula.column.ingredient': 'Ingredient',
  'formula.column.bakerPct': 'Baker %',
  'formula.column.grams': 'Grams',
  'formula.total.flour': 'Total flour',
  'formula.total.dough': 'Dough weight',
  'formula.total.pureWater': 'Pure water',
  'formula.total.water': 'Total water',
  'formula.water.incomplete': 'Incomplete: unknown water in {ingredients}',
  'formula.components': 'Components',
  'formula.finalMix': 'Final mix',
  'formula.save': 'Save as version {version}',
  'formula.saved': 'Saved as version {version}.',
  'formula.unsaved': 'Unsaved changes',
  'formula.discard': 'Discard changes',
  'explain.title': 'How total water is obtained',
  'explain.pureWater': '{name} (pure water)',
  'explain.ingredient': '{name} ({status, select, known {known} estimated {estimated} other {}})',
  'explain.loss': 'Loss in {name}',
  'explain.unknown': '{name}: unknown',
  'explain.close': 'Close',
  'field.invalidNumber': 'Enter a number.',
  'error.unknown': 'Something went wrong ({code}).',
  'error.FlourAllocationExceeded':
    'The components need {required} of {flour}, but the formula only has {available}.',
  'error.WaterAllocationExceeded':
    'The components need {required} of water, but the formula only has {available}.',
  'error.IncompatibleConstraint': 'This change is not possible with the current anchor.',
  'error.InvalidFormula': 'This value is not valid.',
  'error.HeadConflict': 'The recipe changed meanwhile. Reload it before saving.',
} as const;

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;

export const fr: Catalog = {
  'app.title': 'Flourprint',
  'recipes.title': 'Recettes',
  'recipes.empty': 'Aucune recette pour l’instant.',
  'recipes.version': 'Version {version}',
  'formula.title': 'Formule',
  'formula.anchor.flourTotal': 'Farine totale {grams}',
  'formula.anchor.doughWeight': 'Poids de pâte {grams}',
  'formula.anchor.pieces': '{count, plural, one {# pâton} other {# pâtons}} de {grams}',
  'formula.column.ingredient': 'Ingrédient',
  'formula.column.bakerPct': '% boulanger',
  'formula.column.grams': 'Grammes',
  'formula.total.flour': 'Farine totale',
  'formula.total.dough': 'Poids de pâte',
  'formula.total.pureWater': 'Eau pure',
  'formula.total.water': 'Eau totale',
  'formula.water.incomplete': 'Incomplet : eau inconnue dans {ingredients}',
  'formula.components': 'Composants',
  'formula.finalMix': 'Pétrissage final',
  'formula.save': 'Enregistrer la version {version}',
  'formula.saved': 'Version {version} enregistrée.',
  'formula.unsaved': 'Modifications non enregistrées',
  'formula.discard': 'Annuler les modifications',
  'explain.title': 'D’où vient l’eau totale',
  'explain.pureWater': '{name} (eau pure)',
  'explain.ingredient': '{name} ({status, select, known {connue} estimated {estimée} other {}})',
  'explain.loss': 'Perte dans {name}',
  'explain.unknown': '{name} : inconnue',
  'explain.close': 'Fermer',
  'field.invalidNumber': 'Entrez un nombre.',
  'error.unknown': 'Une erreur est survenue ({code}).',
  'error.FlourAllocationExceeded':
    'Les composants demandent {required} de {flour}, mais la formule n’en contient que {available}.',
  'error.WaterAllocationExceeded':
    'Les composants demandent {required} d’eau, mais la formule n’en contient que {available}.',
  'error.IncompatibleConstraint': 'Cette modification est impossible avec l’ancre actuelle.',
  'error.InvalidFormula': 'Cette valeur n’est pas valide.',
  'error.HeadConflict': 'La recette a changé entre-temps. Rechargez-la avant d’enregistrer.',
};

export const catalogs = { en, fr } as const;
export type Locale = keyof typeof catalogs;

/** Picks the first supported language of the device, English otherwise. */
export const pickLocale = (languages: readonly string[]): Locale => {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'fr' || base === 'en') return base;
  }
  return 'en';
};

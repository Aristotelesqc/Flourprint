import { ingredientName, type Locale } from './messages';
import type { ComponentPreset, ComponentStyle, FormulaError } from '@flourprint/core/domain';

export const defaultsCopyMap = {
  settingsTitle: ['Composants par défaut', 'Component defaults'],
  settingsDescription: [
    'Les nouveaux composants ajoutés à une recette démarrent avec ces valeurs par défaut. Modifier ces valeurs ne modifie pas les recettes existantes.',
    'New components added to a recipe start from these default values. Changing these values never alters existing recipes.',
  ],
  poolish: ['Poolish', 'Poolish'],
  tangzhong: ['Tangzhong (roux d’eau)', 'Tangzhong (water roux)'],
  yudane: ['Yudane', 'Yudane'],
  flourShare: ['% de la farine totale', '% of total flour'],
  hydration: ['Hydratation', 'Hydration'],
  ratio: ['Ratio farine:liquide', 'Flour:liquid ratio'],
  ratioPrefix: ['1:', '1:'],
  resetDefaults: ['Rétablir les valeurs par défaut', 'Reset to built-in defaults'],
  resetConfirmTitle: ['Rétablir les valeurs par défaut ?', 'Reset defaults?'],
  resetConfirmMessage: [
    'Rétablir les valeurs par défaut d’origine ? Les modifications et saisies non valides seront effacées.',
    'Reset to built-in defaults? Any modifications and invalid entries will be cleared.',
  ],
  confirmAction: ['Rétablir', 'Reset'],
  cancelAction: ['Annuler', 'Cancel'],
  invalidNumber: ['Saisir un nombre complet et valide.', 'Enter a complete valid number.'],
  addPoolish: ['Ajouter une poolish', 'Add poolish'],
  addTangzhong: ['Ajouter un tangzhong', 'Add tangzhong'],
  addYudane: ['Ajouter un yudane', 'Add yudane'],
  addCustom: ['Ajouter un composant personnalisé', 'Add custom component'],
  addComponentHint: [
    'Chaque nouveau composant démarre avec les proportions définies dans les réglages avancés.',
    'Every new component starts with proportions configured in advanced settings.',
  ],
  adjustRatioHint: [
    'Ajuster le ratio farine:liquide ou les ingrédients alloués.',
    'Adjust the flour:liquid ratio or allocated ingredients.',
  ],
} as const;

export type DefaultsCopyKey = keyof typeof defaultsCopyMap;

export function defaultsCopy(locale: Locale, key: DefaultsCopyKey): string {
  const entry = defaultsCopyMap[key];
  if (!entry) return key;
  return entry[locale === 'fr' ? 0 : 1];
}

/**
 * Safely extracts the reason field from structured FormulaError details without any type casts.
 */
export function extractFormulaErrorReason(error: FormulaError | undefined): string | undefined {
  if (!error) return undefined;
  if ('details' in error && typeof error.details === 'object' && error.details !== null) {
    const details = error.details as Record<string, unknown>;
    if ('reason' in details && typeof details.reason === 'string') {
      return details.reason;
    }
  }
  return undefined;
}

/**
 * Localized mapping of engine reasons from domain errors (L3 primary localized explanation).
 * Developer error strings are never leaked directly into user copy (ADR 0009).
 */
export function formatEngineReason(
  locale: Locale,
  reason?: string,
  preset?: ComponentPreset | ComponentStyle,
): string {
  if (!reason) {
    return locale === 'fr'
      ? 'Modification refusée par le moteur.'
      : 'Change refused by the engine.';
  }

  if (reason.includes('flourPct must be within ]0, 100]')) {
    return locale === 'fr'
      ? 'La part de farine doit être strictement supérieure à 0 % et au plus de 100 %.'
      : 'Flour share must be within ]0, 100]%.';
  }

  if (reason.includes('hydrationPct must be ≥ 0')) {
    return locale === 'fr'
      ? 'L’hydratation doit être supérieure ou égale à 0 %.'
      : 'Hydration must be ≥ 0%.';
  }

  if (reason.includes('the ratio no longer names the component a poolish')) {
    return locale === 'fr'
      ? 'Le ratio ne correspond plus à une poolish (ratio ≥ 90 % requis).'
      : 'The ratio no longer qualifies as a poolish (ratio ≥ 90% required).';
  }

  if (reason.includes('the ratio no longer names the component a tangzhong')) {
    return locale === 'fr'
      ? 'Le ratio ne correspond plus à un tangzhong (ratio ≥ 300 % ou 1:3 requis).'
      : 'The ratio no longer qualifies as a tangzhong (ratio ≥ 300% or 1:3 required).';
  }

  if (reason.includes('the ratio no longer names the component a yudane')) {
    return locale === 'fr'
      ? 'Le ratio ne correspond plus à un yudane (ratio ≤ 150 % ou 1:1,5 requis).'
      : 'The ratio no longer qualifies as a yudane (ratio ≤ 150% or 1:1.5 required).';
  }

  if (reason.includes('the liquid parts must be > 0')) {
    return locale === 'fr'
      ? 'La part de liquide doit être strictement supérieure à 0.'
      : 'The liquid parts must be > 0.';
  }

  if (reason.includes('the component has no flour')) {
    return locale === 'fr'
      ? 'Le composant doit comporter une part de farine non nulle.'
      : 'The component must have a non-zero flour share.';
  }

  if (
    reason.includes('A component needs a flour in the formula') ||
    reason.includes('the formula has no flour')
  ) {
    return locale === 'fr'
      ? 'La formule doit comporter au moins une farine pour ajouter un composant.'
      : 'The formula must have at least one flour to add a component.';
  }

  if (reason.includes('the allocated ingredients alone exceed the ratio')) {
    return locale === 'fr'
      ? 'Les ingrédients alloués dépassent à eux seuls le ratio demandé.'
      : 'Allocated ingredients alone exceed the requested ratio.';
  }

  if (preset && reason.includes('the ratio no longer names the component')) {
    return locale === 'fr'
      ? `Le ratio ne correspond plus au style ${preset}.`
      : `The ratio no longer qualifies as a ${preset}.`;
  }

  if (reason.includes('the hydration is below the water the allocated ingredients bring')) {
    return locale === 'fr'
      ? 'L’hydratation demandée est inférieure à l’eau apportée par les ingrédients alloués.'
      : 'The requested hydration is below the water brought by allocated ingredients.';
  }

  if (reason.includes('an allocated ingredient has an unknown water content')) {
    return locale === 'fr'
      ? 'Un ingrédient alloué a une teneur en eau non renseignée.'
      : 'An allocated ingredient has an unknown water content.';
  }

  if (reason.includes('the hydration must be a finite number')) {
    return locale === 'fr'
      ? 'L’hydratation doit être un nombre valide.'
      : 'Hydration must be a valid number.';
  }

  if (reason.includes('must sum to 100') || reason.includes('shares must sum to 100')) {
    return locale === 'fr'
      ? 'La somme des parts de farine doit être égale à 100 %.'
      : 'Flour shares must sum to 100%.';
  }

  return locale === 'fr' ? 'Modification refusée par le moteur.' : 'Change refused by the engine.';
}

/**
 * Localized formatter for any structured FormulaError.
 * Maps stable error codes and structured details to meaningful user explanations (ADR 0009).
 */
export function formatFormulaError(
  locale: Locale,
  error: FormulaError,
  names?: Record<string, string>,
): string {
  if (!error.details) return formatEngineReason(locale);
  if (error.code === 'InvalidFormula') {
    const details = error.details;
    if (
      details.path === 'flours' &&
      (details.reason.includes('must sum to 100') ||
        details.reason.includes('shares must sum to 100'))
    ) {
      return locale === 'fr'
        ? 'La somme des parts de farine doit être égale à 100 %.'
        : 'Flour shares must sum to 100%.';
    }
    if (details.reason) {
      return formatEngineReason(locale, details.reason);
    }
    return locale === 'fr' ? 'Formule non valide.' : 'Invalid formula.';
  }

  if (error.code === 'FlourAllocationExceeded') {
    const flourName = ingredientName(locale, error.details.flour, names ?? {});
    return locale === 'fr'
      ? `La farine « ${flourName} » requise dépasse la quantité disponible.`
      : `Required flour "${flourName}" exceeds available flour.`;
  }

  if (error.code === 'WaterAllocationExceeded') {
    return locale === 'fr'
      ? 'La quantité d’eau requise dépasse l’eau disponible.'
      : 'Required water exceeds available water.';
  }

  if (error.code === 'IngredientAllocationExceeded') {
    const ingName = ingredientName(locale, error.details.ingredient, names ?? {});
    return locale === 'fr'
      ? `La quantité de « ${ingName} » requise dépasse la quantité disponible.`
      : `Required quantity for "${ingName}" exceeds available quantity.`;
  }

  if (error.code === 'IncompatibleConstraint') {
    if (error.details.field === 'waterTarget.locked') {
      return locale === 'fr'
        ? 'Cible d’hydratation verrouillée : déverrouiller pour modifier.'
        : 'Locked target: unlock to modify.';
    }
    if (error.details.field === 'waterTarget.tooLow') {
      return locale === 'fr'
        ? 'L’eau apportée par les autres ingrédients dépasse la cible d’hydratation. Augmenter la cible ou ajuster les ingrédients.'
        : 'Other ingredients bring more water than the target. Raise target or adjust ingredients.';
    }
    if (error.details.field === 'waterTarget.unknown' && error.details.ingredients?.length) {
      const ingList = error.details.ingredients
        .map((id) => ingredientName(locale, id, names ?? {}))
        .join(', ');
      return locale === 'fr'
        ? `Teneur en eau non renseignée pour ${ingList}. Profil requis pour verrouiller l’hydratation.`
        : `Unknown water content for ${ingList}. Composition required to lock hydration.`;
    }
    if (error.details?.reason) {
      return formatEngineReason(locale, error.details.reason);
    }
    return locale === 'fr'
      ? 'Contrainte incompatible dans la formule.'
      : 'Incompatible constraint in formula.';
  }

  if (error.code === 'UnknownReference') {
    return locale === 'fr'
      ? 'Référence introuvable dans la formule.'
      : 'Unknown reference in formula.';
  }

  const reason = extractFormulaErrorReason(error);
  if (reason) {
    return formatEngineReason(locale, reason);
  }

  return locale === 'fr' ? 'Modification refusée par le moteur.' : 'Change refused by the engine.';
}

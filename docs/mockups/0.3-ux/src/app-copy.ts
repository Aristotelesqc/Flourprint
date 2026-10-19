import type { Locale } from './messages';

export const appCopy = {
  // Step design options (Requirement 1 & 2)
  stepDesignHeading: [
    'Options de présentation des étapes (sélection propriétaire)',
    'Step presentation options (owner selection)',
  ],
  stepDesignExplanation: [
    'Trois présentations visuelles des étapes sont proposées au choix du propriétaire : compact, rail ou contour. Aucun choix O n’est arrêté. Chaque lien ouvre un nouveau contexte sur le gabarit Shokupan en modification d’étapes.',
    'Three visual step presentations are offered for owner selection: compact, rail, or outline. No O-item is settled. Each link opens a fresh context with the Shokupan fixture in step edit.',
  ],
  currentStepDesign: ['Présentation active', 'Active design'],
  stepDesign_compact: ['1. Compact', '1. Compact'],
  stepDesign_rail: ['2. Rail', '2. Rail'],
  stepDesign_outline: ['3. Contour', '3. Outline'],
  activeOption: ['Actif', 'Active'],

  // Direct A/B labels (Requirement 2)
  navA: ['Variante A (barre basse)', 'Variant A (bottom bar)'],
  navB: ['Variante B (destinations)', 'Variant B (destinations)'],

  // Recipe card status labels (Requirement 4, L44)
  neverPrepared: ['Jamais préparée', 'Never prepared'],
  statusCooked: ['Cuite', 'Cooked'],
  statusDough: ['Pâte préparée', 'Dough prepared'],

  // Reset confirmation dialog (Requirement 5, L65)
  confirmResetTitle: ['Réinitialiser le brouillon ?', 'Reset draft?'],
  confirmResetAction: ['Réinitialiser', 'Reset'],
} as const;

export type AppCopyKey = keyof typeof appCopy;

export function copyT(locale: Locale, key: AppCopyKey): string {
  const entry = appCopy[key];
  if (!entry) return key;
  return locale === 'fr' ? entry[0] : entry[1];
}

export function formatResetMessage(locale: Locale, baselineText: string): string {
  if (locale === 'fr') {
    return `Rétablir l’état initial depuis ${baselineText} ? Toutes les modifications non enregistrées de cette session seront perdues.`;
  }
  return `Revert to baseline from ${baselineText}? All unsaved draft modifications from this session will be lost.`;
}

export function getBaselineDescription(
  recipe: { version: number; templateId: string; revisions: unknown[] },
  locale: Locale,
  templateName?: string,
): string {
  if (recipe.version > 0) {
    const revLabel = locale === 'fr' ? 'la révision enregistrée' : 'saved revision';
    return `${revLabel} (v${recipe.version})`;
  }
  if (recipe.templateId === 'blank' || !recipe.templateId) {
    return locale === 'fr' ? 'la recette vierge' : 'blank recipe';
  }
  const name = templateName ?? recipe.templateId;
  const tplLabel = locale === 'fr' ? 'le modèle initial' : 'initial template';
  return `${tplLabel} (${name})`;
}

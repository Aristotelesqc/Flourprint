import type { Locale } from './messages';

export const appCopy = {
  // Step design & drag activation (L112 settled)
  stepDesignHeading: [
    'Présentation des étapes & activation (décision L112)',
    'Step presentation & activation (decision L112)',
  ],
  stepDesignExplanation: [
    'La présentation Compact avec activation par maintien de 350 ms est sélectionnée (L112). Les présentations rail et contour restent conservées pour compatibilité et historique. Les points O3 ouverts (glissement inter-groupes, chaîne descendante, mode poignée) restent à évaluer.',
    'The Compact treatment with 350ms hold activation is selected (L112). Rail and outline presentations are retained for compatibility and history. Open O-items (cross-group drag, downward-chain moves, handle mode) remain under evaluation.',
  ],
  currentStepDesign: ['Présentation active', 'Active design'],
  stepDesign_compact: ['1. Compact (sélectionné L112)', '1. Compact (selected L112)'],
  stepDesign_rail: ['2. Rail (archivé)', '2. Rail (archived)'],
  stepDesign_outline: ['3. Contour (archivé)', '3. Outline (archived)'],
  selectedOption: ['Sélectionné', 'Selected'],
  activeOption: ['Actif', 'Active'],

  // Direct A/B labels (Requirement 2)
  navA: ['Variante A (barre basse)', 'Variant A (bottom bar)'],
  navB: ['Variante B (destinations)', 'Variant B (destinations)'],

  // Recipe card status labels (Requirement 4, L44)
  neverPrepared: ['Jamais préparée', 'Never prepared'],
  statusCooked: ['Cuite', 'Cooked'],
  statusDough: ['Pâte préparée', 'Dough prepared'],
  statusMixed: ['Mélangée', 'Mixed'],

  // Reset confirmation dialog (Requirement 5, L65)
  confirmResetTitle: ['Réinitialiser le brouillon ?', 'Reset draft?'],
  confirmResetAction: ['Réinitialiser', 'Reset'],

  // Trash view labels (L30)
  trashTitle: ['Corbeille', 'Trash'],
  trashDescription: [
    'Recettes supprimées pouvant être restaurées.',
    'Deleted recipes that can be restored.',
  ],
  trashEmpty: ['Aucune recette dans la corbeille', 'No recipes in trash'],
  restoreAction: ['Restaurer', 'Restore'],
  openTrashAction: ['Ouvrir la corbeille', 'Open trash'],
  trashCount: ['Recettes dans la corbeille', 'Trashed recipes'],
  advancedSection: ['Avancé', 'Advanced'],
  startAnotherPreparation: ['Démarrer une autre préparation', 'Start another preparation'],
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

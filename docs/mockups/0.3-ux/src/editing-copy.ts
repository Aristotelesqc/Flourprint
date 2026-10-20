import type { Locale } from './messages';

export const editingCopy = {
  editInSteps: ['Modifier dans les étapes', 'Edit in Steps'],
  editInStepsAria: [
    'Modifier cette étape dans les étapes de la recette',
    'Edit this step in Recipe Steps',
  ],
  returnToPlanning: ['Retour au planning', 'Return to Planning'],
  editingFromPlanningNotice: ['Modification depuis le planning', 'Editing from Planning'],
  statusAbandoned: ['Abandonnée', 'Abandoned'],
} as const;

export type EditingCopyKey = keyof typeof editingCopy;

export function editingCopyT(locale: Locale, key: EditingCopyKey): string {
  const entry = editingCopy[key];
  if (!entry) return key;
  return locale === 'fr' ? entry[0] : entry[1];
}

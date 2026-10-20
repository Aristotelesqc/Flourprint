import type { Locale } from './messages';

export type HistoryErrorCode =
  'HeadConflict' | 'AlreadyReferenced' | 'UnknownRevision' | 'RecipeTrashed';

export interface HistoryError {
  code: HistoryErrorCode;
  number?: number;
}

const historyStrings: Record<Locale, Record<string, string>> = {
  fr: {
    savedHistoryTitle: 'Historique enregistré',
    savedHistorySubtitle: 'Révisions conservées à chaque enregistrement.',
    referenceVersionsTitle: 'Versions de référence',
    referenceVersionsSubtitle: 'Jalons numérotés définis à partir d’une révision.',
    preparationsTitle: 'Historique des préparations',
    currentSavedHead: 'État enregistré actuel',
    revisionItem: 'Révision #{version}',
    referenceVersionBadge: 'Version {number}',
    sourceRevision: 'Révision source : #{version}',
    savedAt: 'Enregistré le {date}',
    createdAt: 'Créé le {date}',
    emptyReferenceVersions:
      'Aucune version de référence définie. Il est possible de promouvoir une révision pour créer un jalon numéroté.',
    emptyRevisions: 'Aucune révision antérieure enregistrée pour cette recette.',
    emptyPreparations: 'Aucune préparation enregistrée pour cette recette.',
    draftBannerTitle: 'Brouillon en cours',
    draftBannerSubtitle:
      'La restauration et la promotion s’appliquent uniquement aux révisions enregistrées ; le brouillon ouvert reste inchangé.',
    restoreAction: 'Restaurer',
    promoteAction: 'Promouvoir',
    saveAction: 'Enregistrer',
    confirmAction: 'Confirmer la restauration',
    cancelAction: 'Annuler',
    promoteDialogTitle: 'Définir une version de référence',
    promoteDialogDescription:
      'Attribuer un jalon numéroté (Version {nextNumber}) à la révision #{version}.',
    promoteNameLabel: 'Nom du jalon (optionnel)',
    promoteNamePlaceholder: 'ex. Levain d’hiver, Cuisson fonte...',
    promoteSubmit: 'Promouvoir',
    restoreDialogTitle: 'Restaurer cette révision',
    restoreDialogDescription:
      'Restaurer ajoutera un nouvel état enregistré à partir de la révision #{version}. L’historique antérieur reste conservé et le brouillon ouvert ne sera pas remplacé.',
    restoreSubmit: 'Restaurer',
    revisionBaseline: 'Révision {version}',
    noRating: 'Non notée',
    anchorFlour: 'Farine totale',
    anchorDough: 'Poids du pâton',
    anchorPieces: 'Pièces',
    errorHeadConflict:
      'Conflit d’historique : la recette a été enregistrée ailleurs. Concilier le brouillon avant d’enregistrer.',
    errorAlreadyReferenced: 'Cette révision correspond déjà à la Version {number}.',
    errorUnknownRevision: 'Révision introuvable dans l’historique.',
    errorRecipeTrashed: 'Action impossible : recette placée dans la corbeille.',
    errorGeneric: 'Une erreur est survenue lors de l’opération sur l’historique.',
  },
  en: {
    savedHistoryTitle: 'Saved history',
    savedHistorySubtitle: 'Revisions preserved with each save.',
    referenceVersionsTitle: 'Reference versions',
    referenceVersionsSubtitle: 'Numbered milestones created from a saved revision.',
    preparationsTitle: 'Preparation history',
    currentSavedHead: 'Current saved state',
    revisionItem: 'Revision #{version}',
    referenceVersionBadge: 'Version {number}',
    sourceRevision: 'Source revision: #{version}',
    savedAt: 'Saved on {date}',
    createdAt: 'Created on {date}',
    emptyReferenceVersions:
      'No reference versions defined. Promote a saved revision to establish a numbered milestone.',
    emptyRevisions: 'No prior revisions saved for this recipe.',
    emptyPreparations: 'No preparations recorded for this recipe.',
    draftBannerTitle: 'Active uncommitted draft',
    draftBannerSubtitle:
      'Restore and promote operations act strictly on saved history; open drafts remain unchanged.',
    restoreAction: 'Restore',
    promoteAction: 'Promote',
    saveAction: 'Save',
    confirmAction: 'Confirm restore',
    cancelAction: 'Cancel',
    promoteDialogTitle: 'Promote to reference version',
    promoteDialogDescription:
      'Assign a numbered milestone (Version {nextNumber}) to revision #{version}.',
    promoteNameLabel: 'Milestone name (optional)',
    promoteNamePlaceholder: 'e.g. Winter sourdough, Dutch oven bake...',
    promoteSubmit: 'Promote',
    restoreDialogTitle: 'Restore this revision',
    restoreDialogDescription:
      'Restoring will append a new saved state copied from revision #{version}. Prior history remains preserved and any open draft is not replaced.',
    restoreSubmit: 'Restore',
    revisionBaseline: 'Revision {version}',
    noRating: 'Unrated',
    anchorFlour: 'Total flour',
    anchorDough: 'Dough weight',
    anchorPieces: 'Pieces',
    errorHeadConflict:
      'History conflict: the recipe was modified elsewhere. Reconcile draft before saving.',
    errorAlreadyReferenced: 'This revision is already referenced as Version {number}.',
    errorUnknownRevision: 'Revision could not be found in history.',
    errorRecipeTrashed: 'Action refused: recipe is currently in trash.',
    errorGeneric: 'An unexpected error occurred during the history operation.',
  },
};

export type HistoryCopyKey = keyof typeof historyStrings.fr;

export function historyCopyT(
  locale: Locale,
  key: HistoryCopyKey,
  params?: Record<string, string | number>,
): string {
  const dict = historyStrings[locale] ?? historyStrings.fr;
  let text = dict[key] ?? historyStrings.fr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function formatHistoryDate(dateStr: string | undefined, locale: Locale): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatHistoryError(error: HistoryError | undefined, locale: Locale): string {
  if (!error) return '';
  switch (error.code) {
    case 'HeadConflict':
      return historyCopyT(locale, 'errorHeadConflict');
    case 'AlreadyReferenced':
      return historyCopyT(locale, 'errorAlreadyReferenced', {
        number: error.number ?? '?',
      });
    case 'UnknownRevision':
      return historyCopyT(locale, 'errorUnknownRevision');
    case 'RecipeTrashed':
      return historyCopyT(locale, 'errorRecipeTrashed');
    default:
      return historyCopyT(locale, 'errorGeneric');
  }
}

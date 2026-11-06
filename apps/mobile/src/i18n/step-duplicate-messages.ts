/**
 * Bilingual step duplication messages (ADR 0009).
 * French text uses impersonal infinitives without addressing the user directly.
 */
export const stepDuplicateEn = {
  'step.duplicate': 'Duplicate step',
  'step.duplicate.error.alap': 'Steps scheduled as late as possible cannot be duplicated.',
  'step.duplicate.error.beforeTarget':
    'Preheating and steps scheduled before a target cannot be duplicated.',
  'step.duplicate.error.workpieceStep':
    'Component preparation steps cannot be duplicated directly.',
  'step.duplicate.error.blocked':
    'Resolve incomplete or invalid fields before duplicating this step.',
  'step.duplicate.error.processChanged':
    'The recipe changed while reviewing the duplicate. Try duplicating again.',
  'step.duplicate.error.failed': 'Unable to duplicate this step.',
  'step.duplicateReview.title': 'Duplicate step proposal',
  'step.duplicate.proposalStep': 'Proposed copy: {step}',
  'step.duplicate.originalStep': 'Original step: {step}',
  'step.duplicate.operation': 'Operation: {operation}',
  'step.duplicate.durationRequired': 'Duration required',
  'step.duplicate.copiedDuration': 'Planned duration: {duration}',
  'step.duplicate.noDuration': 'No planned duration',
  'step.duplicate.notCarried.title': 'Not carried over',
  'step.duplicate.notCarried.incorporations': 'Ingredient and component incorporations',
  'step.duplicate.notCarried.accepted': 'Previously accepted estimate',
  'step.duplicate.notCarried.durationMode': 'Duration setting',
  'step.duplicate.notCarried.plannedDurationS': 'Calculated fermentation duration',
  'step.duplicate.dependencies.title': 'Dependencies',
  'step.duplicate.dependsOn': 'Follows {step}',
  'step.duplicate.rewiredDependents': 'Steps that will follow the copy: {steps}',
  'step.duplicate.noRewiredDependents': 'No subsequent steps depend on this step',
  'step.duplicate.schedule.title': 'Schedule impact',
  'step.duplicate.schedule.copy': 'Proposed copy',
  'step.duplicate.schedule.before': 'Before: {timing}',
  'step.duplicate.schedule.after': 'After: {timing}',
  'step.duplicate.schedule.range': '{start} – {end}',
  'step.duplicate.schedule.afterOffset': 'after {time}',
  'step.duplicate.schedule.unknownAfter': 'Timing unknown after {steps}',
  'step.duplicate.schedule.unknown': 'Timing unknown',
  'step.duplicate.keep': 'Keep copy',
} as const;

export const stepDuplicateFr: Record<keyof typeof stepDuplicateEn, string> = {
  'step.duplicate': "Dupliquer l'étape",
  'step.duplicate.error.alap': 'Les étapes planifiées au plus tard ne peuvent pas être dupliquées.',
  'step.duplicate.error.beforeTarget':
    'Le préchauffage et les étapes planifiées avant une cible ne peuvent pas être dupliqués.',
  'step.duplicate.error.workpieceStep':
    'Les étapes de préparation de composant ne peuvent pas être dupliquées directement.',
  'step.duplicate.error.blocked':
    'Corriger les champs incomplets ou non valides avant de dupliquer cette étape.',
  'step.duplicate.error.processChanged':
    "La recette a été modifiée pendant l'examen de la copie. Réessayer de dupliquer.",
  'step.duplicate.error.failed': 'Impossible de dupliquer cette étape.',
  'step.duplicateReview.title': "Proposition de duplication d'étape",
  'step.duplicate.proposalStep': 'Copie proposée : {step}',
  'step.duplicate.originalStep': "Étape d'origine : {step}",
  'step.duplicate.operation': 'Opération : {operation}',
  'step.duplicate.durationRequired': 'Durée requise',
  'step.duplicate.copiedDuration': 'Durée prévue : {duration}',
  'step.duplicate.noDuration': 'Aucune durée prévue',
  'step.duplicate.notCarried.title': 'Éléments non repris',
  'step.duplicate.notCarried.incorporations': "Incorporations d'ingrédients et de composants",
  'step.duplicate.notCarried.accepted': 'Estimation précédemment acceptée',
  'step.duplicate.notCarried.durationMode': 'Réglage de la durée',
  'step.duplicate.notCarried.plannedDurationS': 'Durée calculée de fermentation',
  'step.duplicate.dependencies.title': 'Dépendances',
  'step.duplicate.dependsOn': 'Fait suite à {step}',
  'step.duplicate.rewiredDependents': 'Étapes qui suivront la copie : {steps}',
  'step.duplicate.noRewiredDependents': 'Aucune étape suivante ne dépend de cette étape',
  'step.duplicate.schedule.title': 'Impact sur le calendrier',
  'step.duplicate.schedule.copy': 'Copie proposée',
  'step.duplicate.schedule.before': 'Avant : {timing}',
  'step.duplicate.schedule.after': 'Après : {timing}',
  'step.duplicate.schedule.range': '{start} – {end}',
  'step.duplicate.schedule.afterOffset': 'après {time}',
  'step.duplicate.schedule.unknownAfter': 'Horaire indéterminé après {steps}',
  'step.duplicate.schedule.unknown': 'Horaire indéterminé',
  'step.duplicate.keep': 'Conserver la copie',
};

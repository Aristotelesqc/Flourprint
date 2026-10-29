import type { Process, ProcessStep } from '@flourprint/core/domain';
import type { MessageKey } from './messages';

export const recipeSortEn = {
  'recipe.sort.dragHandle': 'Drag to reorder step {step}',
  'recipe.sort.unknownStep': 'this step',
  'recipe.sort.start': 'start',
  'recipe.sort.instructions.draggable':
    'Press Space or Enter to reorder. Use Arrow keys to move, Space or Enter to drop, Escape to cancel.',
  'recipe.sort.announcement.dragStarted': 'Picked up step {step}, position {position} of {total}.',
  'recipe.sort.announcement.dragEnded': 'Dropped step {step} after {after}.',
  'recipe.sort.announcement.dragEndedStart': 'Moved step {step} to the beginning.',
  'recipe.sort.announcement.dragCancelled': 'Reordering cancelled for step {step}.',
  'recipe.sort.error.breaksDependencies':
    'Cannot move "{step}" because it depends on "{dependsOn}".',
  'recipe.sort.error.ambiguous.incorporationStep':
    'Cannot move "{step}" because it incorporates a recipe component.',
  'recipe.sort.error.ambiguous.stepDependencies':
    'Cannot move "{step}" because its dependencies are ambiguous.',
  'recipe.sort.error.ambiguous.stepDependents':
    'Cannot move "{step}" because subsequent steps depend on it.',
  'recipe.sort.error.ambiguous.targetDependents':
    'Cannot place "{step}" here because target steps depend on it.',
  'recipe.sort.error.ambiguous.crossesWorkpiece':
    'Cannot move "{step}" across another dough component.',
  'recipe.sort.error.ambiguous.scheduledFromTarget':
    'Cannot move "{step}" because timing is scheduled from the target step.',
  'recipe.sort.error.ambiguous.default':
    'Cannot move "{step}" because the step order is ambiguous.',
  'recipe.sort.error.generic': 'Cannot move this step to the requested position.',
  'recipe.sort.chainNotice': 'Step dependencies updated: {summary}',
  'recipe.sort.edgeSummary': '{step}: {before} → {after}',
} as const;

export const recipeSortFr = {
  'recipe.sort.dragHandle': 'Glisser pour réorganiser l’étape {step}',
  'recipe.sort.unknownStep': 'cette étape',
  'recipe.sort.start': 'début',
  'recipe.sort.instructions.draggable':
    'Appuyer sur Espace ou Entrée pour réorganiser. Utiliser les flèches pour déplacer, Espace ou Entrée pour déposer, Échap pour annuler.',
  'recipe.sort.announcement.dragStarted':
    'Étape {step} sélectionnée, position {position} sur {total}.',
  'recipe.sort.announcement.dragEnded': 'Étape {step} déposée après {after}.',
  'recipe.sort.announcement.dragEndedStart': 'Étape {step} placée au début.',
  'recipe.sort.announcement.dragCancelled': 'Réorganisation annulée pour l’étape {step}.',
  'recipe.sort.error.breaksDependencies':
    'Impossible de déplacer « {step} » car elle dépend de « {dependsOn} ».',
  'recipe.sort.error.ambiguous.incorporationStep':
    'Impossible de déplacer « {step} » car elle incorpore un composant.',
  'recipe.sort.error.ambiguous.stepDependencies':
    'Impossible de déplacer « {step} » en raison de dépendances ambiguës.',
  'recipe.sort.error.ambiguous.stepDependents':
    'Impossible de déplacer « {step} » car d’autres étapes en dépendent.',
  'recipe.sort.error.ambiguous.targetDependents':
    'Impossible de placer « {step} » ici car les étapes cibles en dépendent.',
  'recipe.sort.error.ambiguous.crossesWorkpiece':
    'Impossible de déplacer « {step} » à travers un autre composant.',
  'recipe.sort.error.ambiguous.scheduledFromTarget':
    'Impossible de déplacer « {step} » car le calendrier dépend de l’étape cible.',
  'recipe.sort.error.ambiguous.default':
    'Impossible de déplacer « {step} » car l’ordre des dépendances est ambigu.',
  'recipe.sort.error.generic': 'Impossible de déplacer cette étape vers la position demandée.',
  'recipe.sort.chainNotice': 'Dépendances d’étapes mises à jour : {summary}',
  'recipe.sort.edgeSummary': '« {step} » : {before} → {after}',
} as const;

export interface MoveErrorLike {
  readonly code: string;
  readonly details?: {
    readonly step?: string;
    readonly dependsOn?: string;
    readonly reason?: string;
    readonly [key: string]: unknown;
  };
}

export const formatMoveError = (
  error: MoveErrorLike | unknown,
  movingStepId: string,
  process: Process,
  t: (key: MessageKey, values?: Record<string, string | number>) => string,
  stepName: (step: ProcessStep) => string,
): string => {
  if (!error || typeof error !== 'object') {
    return t('recipe.sort.error.generic');
  }
  const err = error as MoveErrorLike;
  const stepId = err.details?.step ?? movingStepId;
  const stepObj = process.steps.find((s) => s.id === stepId);
  const stepLabel = stepObj ? stepName(stepObj) : t('recipe.sort.unknownStep');

  if (err.code === 'MoveBreaksDependencies') {
    const depId = err.details?.dependsOn;
    const depObj = depId ? process.steps.find((s) => s.id === depId) : undefined;
    const depLabel = depObj ? stepName(depObj) : t('recipe.sort.unknownStep');
    return t('recipe.sort.error.breaksDependencies', {
      step: stepLabel,
      dependsOn: depLabel,
    });
  }

  if (err.code === 'AmbiguousMove') {
    const reason = err.details?.reason;
    switch (reason) {
      case 'incorporationStep':
        return t('recipe.sort.error.ambiguous.incorporationStep', { step: stepLabel });
      case 'stepDependencies':
        return t('recipe.sort.error.ambiguous.stepDependencies', { step: stepLabel });
      case 'stepDependents':
        return t('recipe.sort.error.ambiguous.stepDependents', { step: stepLabel });
      case 'targetDependents':
        return t('recipe.sort.error.ambiguous.targetDependents', { step: stepLabel });
      case 'crossesWorkpiece':
        return t('recipe.sort.error.ambiguous.crossesWorkpiece', { step: stepLabel });
      case 'scheduledFromTarget':
        return t('recipe.sort.error.ambiguous.scheduledFromTarget', { step: stepLabel });
      default:
        return t('recipe.sort.error.ambiguous.default', { step: stepLabel });
    }
  }

  return t('recipe.sort.error.generic');
};

export interface ChangedEdge {
  readonly step: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
}

export const formatChangedEdges = (
  changedEdges: readonly ChangedEdge[],
  process: Process,
  t: (key: MessageKey, values?: Record<string, string | number>) => string,
  stepName: (step: ProcessStep) => string,
): string => {
  const formatList = (ids: readonly string[]) => {
    if (ids.length === 0) return t('recipe.sort.start');
    return ids
      .map((id) => {
        const s = process.steps.find((x) => x.id === id);
        return s ? stepName(s) : t('recipe.sort.unknownStep');
      })
      .join(', ');
  };

  const parts = changedEdges.map((edge) => {
    const stepObj = process.steps.find((s) => s.id === edge.step);
    const stepLabel = stepObj ? stepName(stepObj) : t('recipe.sort.unknownStep');
    const beforeLabel = formatList(edge.before);
    const afterLabel = formatList(edge.after);
    return t('recipe.sort.edgeSummary', {
      step: stepLabel,
      before: beforeLabel,
      after: afterLabel,
    });
  });
  return t('recipe.sort.chainNotice', { summary: parts.join('; ') });
};

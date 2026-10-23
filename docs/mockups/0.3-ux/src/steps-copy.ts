import type { Locale } from './messages';

export type StepsCopyKey =
  | 'plannedResult'
  | 'dragHandle'
  | 'dragHandleHint'
  | 'moveUp'
  | 'moveDown'
  | 'duplicate'
  | 'remove'
  | 'editDependencies'
  | 'editStep'
  | 'stepActions'
  | 'confirmRemoveTitle'
  | 'removeConsequence'
  | 'dragGrabbed'
  | 'dragDropped'
  | 'dragCancelled'
  | 'orderChanged'
  | 'dependencyEditorTitle'
  | 'dependencyEditorHelp'
  | 'noEligibleDependencies'
  | 'applyDependencies'
  | 'understood'
  | 'refusalNextSteps'
  | 'currentDependenciesLabel'
  | 'noDirectDependencies'
  | 'addPredecessorLabel'
  | 'addPredecessorAction'
  | 'choosePredecessorPlaceholder'
  | 'noAdditionalDependencies'
  | 'closeToInspect'
  | 'temperature'
  | 'instructionCoolFinal'
  | 'unsetPlan'
  | 'preheatWarmup'
  | 'preheatInsufficient'
  | 'cookingGroup';

const stepsCopy: Record<Locale, Record<StepsCopyKey, string>> = {
  fr: {
    plannedResult: 'Résultat prévu',
    dragHandle: 'Glisser pour réordonner',
    dragHandleHint: 'Glisser pour réordonner, ou utiliser Flèche Haut / Bas',
    moveUp: 'Monter l’étape',
    moveDown: 'Descendre l’étape',
    duplicate: 'Dupliquer l’étape',
    remove: 'Supprimer l’étape',
    editDependencies: 'Modifier les dépendances',
    editStep: 'Modifier l’étape',
    stepActions: 'Actions de l’étape',
    confirmRemoveTitle: 'Supprimer l’étape',
    removeConsequence: 'Cette action retire l’étape du déroulement de la recette.',
    dragGrabbed: 'Étape saisie. Déplacer vers la position souhaitée.',
    dragDropped: 'Étape déplacée.',
    dragCancelled: 'Déplacement annulé.',
    orderChanged: 'Ordre des étapes mis à jour.',
    dependencyEditorTitle: 'Dépendances directes',
    dependencyEditorHelp:
      'Choisir uniquement les étapes qui doivent immédiatement précéder celle-ci. Les choix circulaires sont exclus.',
    noEligibleDependencies: 'Aucune étape disponible sans créer de dépendance circulaire.',
    applyDependencies: 'Enregistrer les dépendances',
    understood: 'Compris',
    refusalNextSteps:
      'Déplacement incompatible avec l’enchaînement des étapes. Fermer pour inspecter la séquence.',
    currentDependenciesLabel: 'Dépendances actuelles',
    noDirectDependencies: 'Aucune étape préalable directe.',
    addPredecessorLabel: 'Ajouter une étape préalable',
    addPredecessorAction: 'Ajouter',
    choosePredecessorPlaceholder: 'Choisir une étape…',
    noAdditionalDependencies: 'Aucune autre étape disponible sans créer de dépendance circulaire.',
    closeToInspect: 'Fermer et inspecter',
    temperature: 'Température',
    instructionCoolFinal: 'Laisser refroidir sur une grille après la cuisson.',
    unsetPlan: 'Choisir une heure pour planifier les étapes',
    preheatWarmup: 'Préchauffage',
    preheatInsufficient: 'Temps de préchauffage insuffisant',
    cookingGroup: 'Cuisson',
  },
  en: {
    plannedResult: 'Planned result',
    dragHandle: 'Drag to reorder',
    dragHandleHint: 'Drag to reorder, or use Arrow Up / Down',
    moveUp: 'Move step up',
    moveDown: 'Move step down',
    duplicate: 'Duplicate step',
    remove: 'Remove step',
    editDependencies: 'Edit dependencies',
    editStep: 'Edit step',
    stepActions: 'Step actions',
    confirmRemoveTitle: 'Remove step',
    removeConsequence: 'This action removes the step from the recipe workflow.',
    dragGrabbed: 'Step grabbed. Move to the target position.',
    dragDropped: 'Step moved.',
    dragCancelled: 'Move cancelled.',
    orderChanged: 'Step order updated.',
    dependencyEditorTitle: 'Direct dependencies',
    dependencyEditorHelp:
      'Choose only steps that must immediately precede this one. Circular options are excluded.',
    noEligibleDependencies: 'No step available without creating a circular dependency.',
    applyDependencies: 'Save dependencies',
    understood: 'Understood',
    refusalNextSteps: 'Move incompatible with sequence constraints. Close to inspect the workflow.',
    currentDependenciesLabel: 'Current dependencies',
    noDirectDependencies: 'No direct preceding step.',
    addPredecessorLabel: 'Add preceding step',
    addPredecessorAction: 'Add',
    choosePredecessorPlaceholder: 'Choose a step…',
    noAdditionalDependencies: 'No other step available without creating a circular dependency.',
    closeToInspect: 'Close to inspect',
    temperature: 'Temperature',
    instructionCoolFinal: 'Allow to cool on a wire rack after baking.',
    unsetPlan: 'Choose a time to schedule steps',
    preheatWarmup: 'Preheat',
    preheatInsufficient: 'Insufficient preheat time',
    cookingGroup: 'Baking',
  },
};

export const stepCopy = (locale: Locale, key: StepsCopyKey): string =>
  stepsCopy[locale]?.[key] ?? stepsCopy.en[key];

// Dynamic helper for removal with step title
export const removeConsequenceText = (locale: Locale, stepTitle: string): string =>
  locale === 'fr'
    ? `Cette action retire « ${stepTitle} » du déroulement de la recette.`
    : `This action removes “${stepTitle}” from the recipe workflow.`;

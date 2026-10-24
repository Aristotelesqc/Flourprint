import type { Locale } from './messages';

export const PREPARATION_COPY = {
  activePreparations: {
    fr: 'Préparations en cours',
    en: 'Active preparations',
  },
  selectPreparation: {
    fr: 'Choisir la préparation active',
    en: 'Select active preparation',
  },
  prepHeading: {
    fr: 'Préparation · {recipe}',
    en: 'Preparation · {recipe}',
  },
  stepLine: {
    fr: '{current} / {total} · {step}',
    en: '{current} / {total} · {step}',
  },
  estimatedRemainingTime: {
    fr: 'Temps restant estimé',
    en: 'Estimated remaining time',
  },
  adjustmentLabel: {
    fr: 'Ajustement : {adj}',
    en: 'Adjustment: {adj}',
  },
  countdownRow: {
    fr: 'Compte à rebours',
    en: 'Countdown',
  },
  progressionRow: {
    fr: 'Progression',
    en: 'Progression',
  },
  actionPrev: {
    fr: '← Précédent',
    en: '← Previous',
  },
  actionNext: {
    fr: 'Suivant →',
    en: 'Next →',
  },
  actionMinus15: {
    fr: '−15 min',
    en: '−15 min',
  },
  actionPlus15: {
    fr: '+15 min',
    en: '+15 min',
  },
  actionUndo: {
    fr: 'Annuler',
    en: 'Undo',
  },
  nextStepCompletedNotice: {
    fr: 'Étape terminée',
    en: 'Step completed',
  },
  actionPause: {
    fr: 'Pause',
    en: 'Pause',
  },
  actionResume: {
    fr: 'Reprendre',
    en: 'Resume',
  },
  pauseActive: {
    fr: 'En pause',
    en: 'Paused',
  },
  overdue: {
    fr: 'Dépassement',
    en: 'Overdue',
  },
  pauseUnavailableExplanation: {
    fr: 'Pause indisponible dans cette version du moteur',
    en: 'Pause unavailable in this engine version',
  },
  finishPreparation: {
    fr: 'Terminer la préparation',
    en: 'Finish preparation',
  },
  retractRefusalTitle: {
    fr: 'Étape suivante déjà commencée',
    en: 'Following step already started',
  },
  retractRefusalExplanation: {
    fr: 'L’étape suivante a déjà été commencée. Impossible d’annuler directement l’étape précédente.',
    en: 'The following step has already started. Cannot directly retract previous step.',
  },
  retractBlockedNotCompleted: {
    fr: 'L’étape précédente n’est pas terminée.',
    en: 'Previous step is not completed.',
  },
  correctTimeAction: {
    fr: 'Corriger l’horaire',
    en: 'Correct time',
  },
  repeatStepAction: {
    fr: 'Répéter l’étape',
    en: 'Repeat step',
  },
  correctTimeTitle: {
    fr: 'Corriger l’horaire de fin de l’étape précédente',
    en: 'Correct end time of previous step',
  },
  repeatStepTitle: {
    fr: 'Insérer une répétition d’étape',
    en: 'Insert step repetition',
  },
  newTimeLabel: {
    fr: 'Minutes écoulées',
    en: 'Elapsed minutes',
  },
  repeatDurationLabel: {
    fr: 'Durée prévue pour la répétition (minutes)',
    en: 'Planned duration for repetition (minutes)',
  },
  retractCompletion: {
    fr: 'Annulation de fin d’étape',
    en: 'Step completion retraction',
  },
  technicalEventGeneric: {
    fr: 'Événement technique',
    en: 'Technical event',
  },
  technicalJournal: {
    fr: 'Journal d’événements techniques',
    en: 'Technical event journal',
  },
  technicalEventsCount: {
    fr: '{count} événements techniques',
    en: '{count} technical events',
  },
  outcomeRequired: {
    fr: 'Choix du résultat requis',
    en: 'Outcome choice required',
  },
  outcomeRequiredExplanation: {
    fr: 'Aucune étape de cuisson n’a été réalisée. Choisir le résultat de la préparation avant de terminer.',
    en: 'No cooking step has been completed. Choose preparation outcome before finishing.',
  },
  errorPendingDependencies: {
    fr: 'Impossible de continuer : terminer d’abord {steps}.',
    en: 'Cannot proceed: complete {steps} first.',
  },
  pendingPrecedingStep: {
    fr: 'étape précédente',
    en: 'preceding step',
  },
  errorStepNotRunning: {
    fr: 'L’étape n’est pas en cours.',
    en: 'Step is not running.',
  },
  errorStepAlreadyCompleted: {
    fr: 'L’étape est déjà terminée.',
    en: 'Step is already completed.',
  },
  errorInvalidTime: {
    fr: 'Horaire invalide.',
    en: 'Invalid time.',
  },
  errorBakeNotActive: {
    fr: 'La préparation n’est pas active.',
    en: 'Preparation is not active.',
  },
  errorGenericCommand: {
    fr: 'Impossible d’exécuter la commande.',
    en: 'Cannot execute command.',
  },
  backToRecipe: {
    fr: 'Retour à la recette',
    en: 'Back to recipe',
  },
  ovenTemperature: {
    fr: 'Température du four',
    en: 'Oven temperature',
  },
  roomTemperature: {
    fr: 'Température ambiante',
    en: 'Room temperature',
  },
  closeAction: {
    fr: 'Fermer',
    en: 'Close',
  },
  applyAction: {
    fr: 'Appliquer',
    en: 'Apply',
  },
  preheatTitle: {
    fr: 'Préchauffage du four',
    en: 'Oven preheating',
  },
  preheatProjected: {
    fr: 'Chauffe projetée',
    en: 'Projected heating',
  },
  preheatHeating: {
    fr: 'Chauffe en cours',
    en: 'Heating in progress',
  },
  preheatMissedWindow: {
    fr: 'Créneau préchauffage dépassé',
    en: 'Missed preheat window',
  },
  preheatReady: {
    fr: 'Four prêt',
    en: 'Oven ready',
  },
  startHeating: {
    fr: 'Allumer le four',
    en: 'Start heating',
  },
  markPreheatReady: {
    fr: 'Observer four prêt',
    en: 'Mark oven ready',
  },
  forStep: {
    fr: 'Pour',
    en: 'For',
  },
  sessionFinished: {
    fr: 'Terminée',
    en: 'Finished',
  },
  sessionRunning: {
    fr: 'En cours',
    en: 'Running',
  },
  technique: {
    fr: 'Technique',
    en: 'Technique',
  },
  method: {
    fr: 'Méthode',
    en: 'Method',
  },
  folds: {
    fr: 'Rabats',
    en: 'Folds',
  },
  phases: {
    fr: 'Phases',
    en: 'Phases',
  },
  endCheck: {
    fr: 'Contrôle de fin',
    en: 'End check',
  },
  appliance: {
    fr: 'Appareil',
    en: 'Appliance',
  },
  support: {
    fr: 'Support',
    en: 'Support',
  },
  incorporationsTitle: {
    fr: 'Ingrédients à incorporer',
    en: 'Ingredients to incorporate',
  },
  heatingStartedAt: {
    fr: 'Chauffe démarrée',
    en: 'Heating started',
  },
  preheatObservedAt: {
    fr: 'Four prêt observé',
    en: 'Oven ready observed',
  },
  targetDoughMass: {
    fr: 'Pâte totale cible',
    en: 'Target dough mass',
  },
  openWeighing: {
    fr: 'Peser',
    en: 'Weigh',
  },
  contextualDetails: {
    fr: 'Paramètres de l’étape',
    en: 'Step parameters',
  },
  plannedStepEnd: {
    fr: 'Fin d’étape prévue : {time}',
    en: 'Planned step end: {time}',
  },
  actualStepEnd: {
    fr: 'Fin réelle : {time}',
    en: 'Actual end: {time}',
  },
  projectedStepStart: {
    fr: 'Début projeté : {time}',
    en: 'Projected start: {time}',
  },
  actualStepStart: {
    fr: 'Début réel : {time}',
    en: 'Actual start: {time}',
  },
  stepNotStarted: {
    fr: 'Début réel : en attente d’action',
    en: 'Actual start: pending action',
  },
  actualStepProgress: {
    fr: 'Progression',
    en: 'Progress',
  },
} as const;

export type PreparationCopyKey = keyof typeof PREPARATION_COPY;

export function prepCopy(
  locale: Locale,
  key: PreparationCopyKey,
  params?: Record<string, string | number>,
): string {
  const entry = PREPARATION_COPY[key];
  if (!entry) return key;
  let text: string = entry[locale] ?? entry.en;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function locationLabel(location: string, locale: Locale): string {
  const locMap: Record<string, { fr: string; en: string }> = {
    counter: { fr: 'Plan de travail', en: 'Counter' },
    fridge: { fr: 'Réfrigérateur', en: 'Fridge' },
    proofer: { fr: 'Chambre de pousse', en: 'Proofer' },
    oven: { fr: 'Four', en: 'Oven' },
    room: { fr: 'Température ambiante', en: 'Room temperature' },
  };
  const match = locMap[location.toLowerCase()];
  if (match) return match[locale] ?? match.en;
  return location;
}

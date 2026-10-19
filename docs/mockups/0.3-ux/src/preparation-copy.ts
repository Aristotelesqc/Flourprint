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
} as const;

export type PreparationCopyKey = keyof typeof PREPARATION_COPY;

export function prepCopy(locale: Locale, key: PreparationCopyKey): string {
  const entry = PREPARATION_COPY[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en;
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

import type { Locale } from './messages';

export const PREPARATION_ACTIONS_COPY = {
  confirmEarlyFinishTitle: {
    fr: 'Confirmer la fin anticipée',
    en: 'Confirm early finish',
  },
  confirmEarlyFinishAction: {
    fr: 'Terminer la préparation',
    en: 'Finish preparation',
  },
  abandonPreparation: {
    fr: 'Abandonner la préparation',
    en: 'Abandon preparation',
  },
  confirmAbandonTitle: {
    fr: 'Abandonner la préparation',
    en: 'Abandon preparation',
  },
  sessionAbandoned: {
    fr: 'Abandonnée',
    en: 'Abandoned',
  },
  sessionAbandonedTitle: {
    fr: 'Préparation abandonnée',
    en: 'Preparation abandoned',
  },
  noUsableOutcome: {
    fr: 'Aucun résultat utilisable enregistré',
    en: 'No usable outcome recorded',
  },
  journalAbandonment: {
    fr: 'Préparation abandonnée',
    en: 'Preparation abandoned',
  },
} as const;

export type PreparationActionsCopyKey = keyof typeof PREPARATION_ACTIONS_COPY;

export function prepActionsCopy(locale: Locale, key: PreparationActionsCopyKey): string {
  const entry = PREPARATION_ACTIONS_COPY[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en;
}

export function formatEarlyFinishPrompt(
  locale: Locale,
  recipeName: string,
  outcomeLabel?: string,
): string {
  if (!outcomeLabel) {
    return locale === 'fr'
      ? `Terminer la préparation « ${recipeName} » de façon anticipée ?`
      : `Finish preparation “${recipeName}” early?`;
  }
  return locale === 'fr'
    ? `Terminer la préparation « ${recipeName} » avec le résultat : ${outcomeLabel} ?`
    : `Finish preparation “${recipeName}” with outcome: ${outcomeLabel}?`;
}

export function formatAbandonPrompt(locale: Locale, recipeName: string): string {
  return locale === 'fr'
    ? `Abandonner la préparation « ${recipeName} » ? Aucun résultat utilisable ne sera enregistré. L'historique et le journal sont conservés.`
    : `Abandon preparation “${recipeName}”? No usable outcome will be recorded. History and journal are kept.`;
}

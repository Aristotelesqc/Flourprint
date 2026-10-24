import type { Locale } from './messages';

export type PlanningCopyKey = 'commercialYeastModel';

const planningCopyDict: Record<Locale, Record<PlanningCopyKey, string>> = {
  fr: {
    commercialYeastModel: 'Modèle de levure commerciale',
  },
  en: {
    commercialYeastModel: 'Commercial yeast model',
  },
};

export const planningCopy = (locale: Locale, key: PlanningCopyKey): string =>
  planningCopyDict[locale]?.[key] ?? planningCopyDict.en[key];

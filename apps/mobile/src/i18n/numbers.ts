/**
 * Locale-aware number input and display (ADR 0009, #23). Presentation only: rounding here never
 * feeds back into the engine (ADR 0006).
 */

/** Parses kitchen input: one decimal separator, comma or point, spaces ignored. */
export const parseDecimal = (text: string): number | undefined => {
  const compact = text.replace(/[\s\u00a0\u202f]/g, '');
  if (!/^\d*(?:[.,]\d*)?$/.test(compact) || !/\d/.test(compact)) return undefined;
  const value = Number(compact.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};

/** Grams under 100 keep one decimal so salt and yeast stay weighable. */
export const formatGrams = (grams: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: grams < 100 ? 1 : 0,
    minimumFractionDigits: grams < 100 ? 1 : 0,
  }).format(grams)} g`;

export const formatPct = (pct: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(pct)} %`;

/** Editable text for a value, without grouping so it parses back. */
export const editableNumber = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);

import { useIntl } from 'react-intl';
import type { DomainError } from '@flourprint/core/domain';
import { en, type MessageKey } from './messages';
import { formatGrams, formatPct } from './numbers';

type Values = Record<string, string | number>;

/** Typed access to the catalogs and to locale-aware formatting. */
export const useMessages = () => {
  const intl = useIntl();
  const t = (key: MessageKey, values?: Values): string => intl.formatMessage({ id: key }, values);
  const grams = (value: number) => formatGrams(value, intl.locale);
  const pct = (value: number) => formatPct(value, intl.locale);

  /** Maps an engine error code to a localized message (engine messages are never shown). */
  const error = (failure: DomainError): string => {
    const key = `error.${failure.code}`;
    if (!(key in en)) return t('error.unknown', { code: failure.code });
    const details = (failure.details ?? {}) as Record<string, unknown>;
    const values: Values = {};
    for (const [name, value] of Object.entries(details)) {
      if (typeof value === 'number') values[name.replace(/Grams$/, '')] = grams(value);
      else if (typeof value === 'string') values[name] = value;
    }
    return t(key as MessageKey, values);
  };

  return { t, grams, pct, error, locale: intl.locale };
};

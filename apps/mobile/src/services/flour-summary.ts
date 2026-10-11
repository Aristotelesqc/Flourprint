import {
  FLOUR_PROPERTY_KEYS,
  FLOUR_PROPERTY_KINDS,
  type FlourEntry,
  type PropertyValue,
} from '@flourprint/core/domain';
import type { MessageKey } from '../i18n/messages';
import { formatNumber, formatPct } from '../i18n/numbers';

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

/**
 * One line of what the registry knows about a flour (flours.md): known values plain, estimated
 * ones with ≈, unknown ones left out; a boolean shows only when true. Display only: nothing is
 * derived from the values.
 */
export const flourSummary = (entry: FlourEntry, t: Translate, locale: string): string => {
  const shown = (property: PropertyValue, text: (value: number) => string): string | undefined => {
    if (property.status === 'unknown' || typeof property.value !== 'number') return undefined;
    const value = text(property.value);
    return property.status === 'estimated' ? t('flours.summary.estimate', { value }) : value;
  };
  const flag = (property: PropertyValue, key: MessageKey): string | undefined => {
    if (property.status === 'unknown' || property.value !== true) return undefined;
    return property.status === 'estimated'
      ? t('flours.summary.estimate', { value: t(key) })
      : t(key);
  };
  const parts: (string | undefined)[] = FLOUR_PROPERTY_KEYS.map((key) => {
    const property = entry.properties[key];
    if (key === 'malted') return flag(property, 'flours.summary.malted');
    const kind = FLOUR_PROPERTY_KINDS[key];
    const value = shown(property, (n) =>
      kind.type === 'pct'
        ? formatPct(n, locale)
        : kind.unit === 's'
          ? `${formatNumber(n, locale)} s`
          : formatNumber(n, locale),
    );
    return value === undefined ? undefined : t(`flours.summary.${key}`, { value });
  });
  const classification = entry.classification
    ? `${entry.classification.system} ${entry.classification.code}`
    : undefined;
  return [
    parts[0],
    classification,
    flag(entry.organic, 'flours.summary.organic'),
    ...parts.slice(1),
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
};

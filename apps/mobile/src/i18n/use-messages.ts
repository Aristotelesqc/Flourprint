import { useIntl } from 'react-intl';
import {
  componentStyle,
  type Component,
  type DomainError,
  type Formula,
} from '@flourprint/core/domain';
import { en, type MessageKey } from './messages';
import { formatGrams, formatPct } from './numbers';

type Values = Record<string, string | number>;

/** Typed access to the catalogs and to locale-aware formatting. */
export const useMessages = () => {
  const intl = useIntl();
  const t = (key: MessageKey, values?: Values): string => intl.formatMessage({ id: key }, values);
  const grams = (value: number) => formatGrams(value, intl.locale);
  const pct = (value: number) => formatPct(value, intl.locale);

  /**
   * Display name of an ingredient, flour or component. Interim: known ids map to catalog keys
   * until the ingredient registry (#26) provides names; an unknown id is shown as is.
   */
  const name = (id: string): string => {
    const key = `name.${id}`;
    return key in en ? t(key as MessageKey) : id;
  };

  /** Display name of a component: its style from the liquid ratio, else its kind (formula.md). */
  const componentName = (formula: Formula, component: Component): string =>
    t(`style.${componentStyle(formula, component) ?? component.kind}`);

  /** Display name of a process step: its own label, else its operation. */
  const stepName = (step: { readonly operation: string; readonly label?: string }): string => {
    if (step.label) return step.label;
    const key = `operation.${step.operation}`;
    return key in en ? t(key as MessageKey) : step.operation;
  };

  const nameOf = (id: string) => name(id);

  /** Maps an engine error code to a localized message (engine messages are never shown). */
  const error = (failure: DomainError): string => {
    const details = (failure.details ?? {}) as Record<string, unknown>;
    // A refusal may name its field for a more precise message (e.g. a locked total water).
    const precise = `error.${failure.code}.${String(details.field)}`;
    const key = precise in en ? precise : `error.${failure.code}`;
    if (!(key in en)) return t('error.unknown', { code: failure.code });
    const values: Values = {};
    for (const [name, value] of Object.entries(details)) {
      if (typeof value === 'number') values[name.replace(/Grams$/, '')] = grams(value);
      else if (typeof value === 'string') values[name] = value;
      else if (Array.isArray(value)) values[name] = value.map(String).map(nameOf).join(', ');
    }
    return t(key as MessageKey, values);
  };

  return { t, grams, pct, name, componentName, stepName, error, locale: intl.locale };
};

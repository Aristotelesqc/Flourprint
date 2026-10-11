import {
  DOMAIN,
  type Estimate,
  type Process,
  type RangeBound,
  type StepConditions,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../../i18n/messages';
import { useTemperature } from '../../i18n/temperature';
import { useMessages } from '../../i18n/use-messages';

/** Presentation helpers of the fermentation card: wording only, no baking math. */

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/** Sets or removes (`undefined`) condition fields of one step; an empty `conditions` goes away. */
export const withConditions = (
  process: Process,
  stepId: string,
  changes: { [K in keyof StepConditions]?: StepConditions[K] | undefined },
): Process => ({
  ...process,
  steps: process.steps.map((s) => {
    if (s.id !== stepId) return s;
    const conditions = Object.fromEntries(
      Object.entries({ ...s.conditions, ...changes }).filter(([, v]) => v !== undefined),
    );
    const { conditions: _, ...rest } = s;
    return Object.keys(conditions).length === 0
      ? rest
      : { ...rest, conditions: conditions as StepConditions };
  }),
});

export const useEstimateText = () => {
  const { t, pct } = useMessages();
  const temperature = useTemperature();
  /** A percentage for the main line: whole numbers only, never "100,03 %". */
  const wholePct = (value: number) => pct(Math.round(value));
  const bound = (value: RangeBound, format: (v: number) => string) =>
    value.kind === 'finite'
      ? format(value.value)
      : t('fermentation.unbounded', { days: Math.round(value.horizonS / 86_400) });
  /** The two ends of an estimate's band, formatted, when it has one. */
  const ends = (e: Estimate, format: (v: number) => string) =>
    e.status === 'ok' && e.range
      ? { low: bound(e.range[0], format), high: bound(e.range[1], format) }
      : undefined;
  const reason = (e: Estimate) => {
    if (e.status === 'ok') return '';
    const key = `fermentation.reason.${e.reason}`;
    // The model's temperature domain, in the device's unit.
    const limits = {
      low: temperature.format(DOMAIN.minDoughC, 'ambient'),
      high: temperature.format(DOMAIN.maxDoughC, 'ambient'),
    };
    return isKey(key) ? t(key, limits) : t('fermentation.reason.other', { reason: e.reason });
  };
  const extrapolations = (e: Estimate) => {
    if (e.status !== 'ok' || !e.extrapolations || e.extrapolations.length === 0) return '';
    const reasons = e.extrapolations.map((code) => {
      const key = `fermentation.extra.${code}`;
      return isKey(key) ? t(key) : code;
    });
    return t('fermentation.extrapolated', { reasons: reasons.join(', ') });
  };
  return { ends, reason, extrapolations, pct, wholePct };
};

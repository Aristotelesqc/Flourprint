import type { WaterBalance } from '@flourprint/core/domain';
import type { MessageKey } from '../i18n/messages';

/**
 * How a water, fat or sugar total is labelled. It reads as exact only when every contribution
 * is known; an unknown contributor, a range or any estimated contribution (even without a range)
 * makes it an estimate, never a bound: the engine gives no bound when a contributor is unknown.
 */
export const totalWaterKey = (balance: WaterBalance): MessageKey =>
  balance.completeness === 'complete' &&
  balance.range === undefined &&
  balance.contributions.every((c) => c.status === 'known')
    ? 'formula.stat.totalWaterValue'
    : 'formula.stat.totalWaterEstimate';

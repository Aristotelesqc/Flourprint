import type { WaterBalance } from '@flourprint/core/domain';
import type { MessageKey } from '../i18n/messages';

/**
 * How a water, fat or sugar total is labelled (L16, L125).
 * 1. Complete with all contributions known: exact value ({pct}).
 * 2. Complete with estimated contributions or ranges: estimate (≈ {pct}).
 * 3. Incomplete with all specified contributions known: lower bound (≥ {pct}), since known contributions establish a floor.
 * 4. Incomplete with estimated contributions or ranges: specified part estimated ('Specified part (estimated): {pct}'),
 *    never a lower bound since the true sum could fall below the estimated mean.
 */
export const totalWaterKey = (balance: WaterBalance): MessageKey => {
  const hasEstimateOrRange =
    balance.range !== undefined || balance.contributions.some((c) => c.status !== 'known');

  if (balance.completeness === 'incomplete') {
    return hasEstimateOrRange
      ? 'formula.stat.totalWaterSpecifiedEstimate'
      : 'formula.stat.totalWaterLowerBound';
  }

  return hasEstimateOrRange ? 'formula.stat.totalWaterEstimate' : 'formula.stat.totalWaterValue';
};

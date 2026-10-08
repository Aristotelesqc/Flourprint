import type { WaterBalance } from '@flourprint/core/domain';
import type { MessageKey } from '../i18n/messages';

/**
 * How total water is labelled. An incomplete or ranged total is an estimate, never shown as a
 * bound: the engine gives no lower bound when a contributor is unknown (PR #31 follow-up).
 */
export const totalWaterKey = (water: WaterBalance): MessageKey =>
  water.completeness === 'complete' && water.range === undefined
    ? 'formula.stat.totalWaterValue'
    : 'formula.stat.totalWaterEstimate';

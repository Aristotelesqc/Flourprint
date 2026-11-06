/**
 * Hydration sheet read model (docs/contracts/formula.md, Hydration sheet read model, L126, L147).
 *
 * The rows the hydration detail sheet shows, grouped and rounded so that they add up to the total
 * water shown. An interface formats these figures and never sums, divides or rounds grams. The
 * engine's own outputs (`totalWater`, `waterSources`) stay at full precision; this is a view.
 */

import { RELATIVE_TOLERANCE, sum } from '../numeric.js';
import type { ResolvedFormula } from './types.js';
import { waterSources } from './weighing.js';

/** L147: a water source under 1 g is grouped. L148 will make the threshold a preference. */
export const DEFAULT_OTHERS_THRESHOLD_GRAMS = 1;

/** Display step of the sheet: whole grams. L148 may pass a finer step. */
export const DEFAULT_SHEET_STEP_GRAMS = 1;

export interface WaterSheetOptions {
  /** A known or estimated source strictly under this many grams joins "others". Default 1. */
  readonly thresholdGrams?: number;
  /** Grid of the displayed grams: every displayed figure is a multiple of it. Default 1. */
  readonly stepGrams?: number;
}

export interface WaterSheetRow {
  /** `source`: one ingredient; `others`: the grouped sub-threshold sources; `loss`: a declared loss. */
  readonly kind: 'source' | 'others' | 'loss';
  /** Ingredient ids (component id for a loss): one for `source` and `loss`, one or more for `others`. */
  readonly sources: readonly string[];
  /** Full precision; negative for a loss. For `others`, the exact sum of its members. */
  readonly grams: number;
  /** `grams` on the display grid; the displayed rows add up to `displayTotalGrams`. */
  readonly displayGrams: number;
  /** 100 × grams / Σ grams of the non-loss rows; full precision; omitted for a loss. */
  readonly sharePct?: number;
  /** `estimated` as soon as one member is. */
  readonly status: 'known' | 'estimated';
  /** Sum of the members' ranges (a member without range counts at its value); estimated only. */
  readonly range?: readonly [number, number];
  /**
   * `others` only: each grouped source at full precision, in contribution order, for the optional
   * detail of the row (owner, 2026-11-06). Never rounded here: the interface formats each value.
   */
  readonly members?: readonly WaterSheetMember[];
}

export interface WaterSheetMember {
  readonly source: string;
  readonly grams: number;
  readonly status: 'known' | 'estimated';
  readonly range?: readonly [number, number];
}

export interface WaterSheet {
  /** Sources by decreasing grams, then `others`, then losses (declared order). */
  readonly rows: readonly WaterSheetRow[];
  /** Ingredients whose water content is unknown (no grams, hatched, the reason of the "≥"). */
  readonly unknownSources: readonly string[];
  /** `totalWater.value`, full precision. */
  readonly totalGrams: number;
  /** `totalGrams` on the display grid; equals the sum of the `displayGrams` of the rows. */
  readonly displayTotalGrams: number;
  /** `totalWater.completeness`: `incomplete` is shown as "≥ total". */
  readonly completeness: 'complete' | 'incomplete';
  /** `totalWater.range`, when some contribution is estimated. */
  readonly totalRange?: readonly [number, number];
}

const onGrid = (units: number, step: number): number => {
  // Multiples of a decimal step are cleaned of binary noise (3 × 0.1 → 0.3); `+ 0` drops −0.
  return Math.round(units * step * 1e9) / 1e9 + 0;
};

/**
 * Largest-remainder rounding on the grid: each figure goes to the multiple of `step` just under it,
 * then the units still missing to reach the rounded total go, one each, to the largest remainders
 * (ties: earlier row). Returns multiples of `step` as integers of units.
 */
const roundToTotal = (values: readonly number[], step: number): number[] => {
  const scaled = values.map((v) => v / step);
  const floors = scaled.map((q) => Math.floor(q + RELATIVE_TOLERANCE));
  const totalUnits = Math.round(sum(scaled) + RELATIVE_TOLERANCE);
  let missing = totalUnits - sum(floors);
  const order = scaled
    .map((q, index) => ({ index, remainder: q - (floors[index] ?? 0) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const units = [...floors];
  for (const { index } of order) {
    if (missing <= 0) break;
    units[index] = (units[index] ?? 0) + 1;
    missing -= 1;
  }
  return units;
};

/**
 * The rows of the hydration sheet (formula.md, Hydration sheet read model). Known and estimated
 * sources strictly under `thresholdGrams` are summed into one `others` row; losses and unknown
 * contributors are never grouped. The displayed grams are rounded to the `stepGrams` grid by the
 * largest-remainder rule so that the displayed rows add up to the displayed total.
 */
export const waterSheet = (
  resolved: ResolvedFormula,
  options: WaterSheetOptions = {},
): WaterSheet => {
  const thresholdGrams = options.thresholdGrams ?? DEFAULT_OTHERS_THRESHOLD_GRAMS;
  const stepGrams = options.stepGrams ?? DEFAULT_SHEET_STEP_GRAMS;
  if (!Number.isFinite(thresholdGrams) || thresholdGrams < 0) {
    throw new RangeError('thresholdGrams must be a finite number of grams, 0 or more');
  }
  if (!Number.isFinite(stepGrams) || stepGrams <= 0) {
    throw new RangeError('stepGrams must be a finite number of grams, above 0');
  }

  const ranges = new Map(
    resolved.totalWater.contributions.map((c) => [`${c.kind}:${c.source}`, c.range] as const),
  );
  const entries = waterSources(resolved);
  const small = (grams: number): boolean =>
    grams < thresholdGrams - RELATIVE_TOLERANCE * Math.max(1, thresholdGrams);

  type Member = {
    id: string;
    grams: number;
    status: 'known' | 'estimated';
    range: readonly [number, number] | undefined;
    sharePct: number;
  };
  const members: Member[] = [];
  const losses: WaterSheetRow[] = [];
  const unknownSources: string[] = [];
  for (const e of entries) {
    if (e.status === 'unknown' || e.grams === undefined) {
      unknownSources.push(e.source);
    } else if (e.kind === 'loss') {
      losses.push({
        kind: 'loss',
        sources: [e.source],
        grams: e.grams,
        displayGrams: 0,
        status: e.status,
      });
    } else {
      members.push({
        id: e.source,
        grams: e.grams,
        status: e.status,
        range: ranges.get(`${e.kind}:${e.source}`),
        sharePct: e.sharePct ?? 0,
      });
    }
  }

  const rowOf = (kind: 'source' | 'others', group: readonly Member[]): WaterSheetRow => {
    const status = group.some((m) => m.status === 'estimated') ? 'estimated' : 'known';
    const range: readonly [number, number] | undefined =
      status === 'estimated'
        ? [
            sum(group.map((m) => m.range?.[0] ?? m.grams)),
            sum(group.map((m) => m.range?.[1] ?? m.grams)),
          ]
        : undefined;
    return {
      kind,
      sources: group.map((m) => m.id),
      grams: sum(group.map((m) => m.grams)),
      displayGrams: 0,
      sharePct: sum(group.map((m) => m.sharePct)),
      status,
      ...(range ? { range } : {}),
      ...(kind === 'others'
        ? {
            members: group.map((m) => ({
              source: m.id,
              grams: m.grams,
              status: m.status,
              ...(m.range ? { range: m.range } : {}),
            })),
          }
        : {}),
    };
  };

  const shown = members
    .filter((m) => !small(m.grams))
    .sort((a, b) => b.grams - a.grams)
    .map((m) => rowOf('source', [m]));
  const tiny = members.filter((m) => small(m.grams));
  const rows = [...shown, ...(tiny.length > 0 ? [rowOf('others', tiny)] : []), ...losses];

  const totalGrams = resolved.totalWater.value;
  const units = roundToTotal(
    rows.map((r) => r.grams),
    stepGrams,
  );
  // The rows cover every contribution that is not 0 g, so their sum is `totalGrams` and the
  // displayed total is the rounded total by construction.
  const displayTotalGrams = onGrid(sum(units), stepGrams);
  return {
    rows: rows.map((r, i) => ({ ...r, displayGrams: onGrid(units[i] ?? 0, stepGrams) })),
    unknownSources,
    totalGrams,
    displayTotalGrams,
    completeness: resolved.totalWater.completeness,
    ...(resolved.totalWater.range ? { totalRange: resolved.totalWater.range } : {}),
  };
};

import { projectProcess, type Instant, type Process } from '@flourprint/core/domain';

/**
 * How long a recipe takes from now, for its card. `complete` only when every step's end is
 * known; otherwise `atLeast` gives the known part, a true lower bound since an unknown duration
 * is never negative (process.md). Nothing is filled in for the unknown steps.
 */
export type RecipeDuration =
  | { readonly kind: 'complete'; readonly seconds: number }
  | { readonly kind: 'atLeast'; readonly seconds: number }
  | { readonly kind: 'unknown' };

export const recipeDuration = (process: Process, now: Instant): RecipeDuration => {
  const projection = projectProcess(process, { mode: { kind: 'startAt', at: now } });
  if (!projection.ok) return { kind: 'unknown' };
  const steps = Object.values(projection.value.steps);
  const ends = steps.flatMap((s) => (s.end ? [Date.parse(s.end)] : []));
  if (ends.length === 0) return { kind: 'unknown' };
  const seconds = (Math.max(...ends) - Date.parse(now)) / 1000;
  return steps.every((s) => s.end !== undefined)
    ? { kind: 'complete', seconds }
    : { kind: 'atLeast', seconds };
};

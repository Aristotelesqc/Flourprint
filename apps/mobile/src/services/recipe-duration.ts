import {
  projectProcess,
  type Instant,
  type Process,
  type ProcessStep,
} from '@flourprint/core/domain';

/**
 * How long a recipe takes from now, for its card. `complete` only when every step's end is
 * known; otherwise `atLeast` gives the known part, a true lower bound since an unknown duration
 * is never negative (process.md). Nothing is filled in for the unknown steps.
 */
export type RecipeDuration =
  | { readonly kind: 'complete'; readonly seconds: number }
  | { readonly kind: 'atLeast'; readonly seconds: number }
  | { readonly kind: 'unknown' };

export interface RecipeDurationDetails {
  readonly duration: RecipeDuration;
  /** Last planned non-preheat step when every step end is known. */
  readonly endStep?: ProcessStep;
}

const isPreheatStep = (step: ProcessStep): boolean =>
  step.operation === 'preheat' || step.schedule === 'beforeTarget';

export const recipeDurationDetails = (process: Process, now: Instant): RecipeDurationDetails => {
  const projection = projectProcess(process, { mode: { kind: 'startAt', at: now } });
  if (!projection.ok) return { duration: { kind: 'unknown' } };
  const steps = Object.values(projection.value.steps);
  const ends = steps.flatMap((s) => (s.end ? [Date.parse(s.end)] : []));
  if (ends.length === 0) return { duration: { kind: 'unknown' } };
  const latestEndMs = Math.max(...ends);
  const seconds = (latestEndMs - Date.parse(now)) / 1000;
  if (!steps.every((s) => s.end !== undefined)) {
    return { duration: { kind: 'atLeast', seconds } };
  }
  const matchingLatest = process.steps.filter((step) => {
    const end = projection.value.steps[step.id]?.end;
    return end !== undefined && Date.parse(end) === latestEndMs;
  });
  const endStep = matchingLatest.filter((step) => !isPreheatStep(step)).at(-1);
  return {
    duration: { kind: 'complete', seconds },
    ...(endStep === undefined ? {} : { endStep }),
  };
};

export const recipeDuration = (process: Process, now: Instant): RecipeDuration =>
  recipeDurationDetails(process, now).duration;

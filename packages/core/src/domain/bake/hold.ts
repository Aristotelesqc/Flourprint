import type { Instant } from '../instant.js';
import type { StepId } from '../process/types.js';
import type { BakeState, StepHold, StepRecord } from './types.js';

const seconds = (instant: Instant): number => Date.parse(instant) / 1000;

/** The open hold of a step record, if its countdown is frozen. */
export const openHold = (record: StepRecord | undefined): StepHold | undefined => {
  const last = record?.holds?.[record.holds.length - 1];
  return last !== undefined && last.to === undefined ? last : undefined;
};

/**
 * Seconds of countdown hold accumulated by a step at `now`: closed holds plus the open one so far
 * (bake-session.md, Step countdown hold). A hold never counts negative time.
 */
export const heldSeconds = (record: StepRecord | undefined, now: Instant): number =>
  (record?.holds ?? []).reduce(
    (total, hold) => total + Math.max(0, seconds(hold.to ?? now) - seconds(hold.from)),
    0,
  );

/** Whether the step's countdown is frozen. */
export const isStepHeld = (state: BakeState, stepId: StepId): boolean =>
  openHold(state.steps[stepId]) !== undefined;

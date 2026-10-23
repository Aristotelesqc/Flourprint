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
 * Seconds of countdown hold accumulated by a step at `now`: closed holds plus the open one so far,
 * counting only the part of each hold inside the step's recorded start and end, so that a time
 * correction cannot inflate it (bake-session.md, Step countdown hold).
 */
export const heldSeconds = (record: StepRecord | undefined, now: Instant): number =>
  (record?.holds ?? []).reduce((total, hold) => {
    const from = Math.max(
      seconds(hold.from),
      record?.startedAt === undefined ? -Infinity : seconds(record.startedAt),
    );
    const to = Math.min(
      seconds(hold.to ?? now),
      record?.endedAt === undefined ? Infinity : seconds(record.endedAt),
    );
    return total + Math.max(0, to - from);
  }, 0);

/** Whether the step's countdown is frozen. */
export const isStepHeld = (state: BakeState, stepId: StepId): boolean =>
  openHold(state.steps[stepId]) !== undefined;

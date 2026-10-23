import type { StepId } from '../process/types.js';
import type { BakeState } from './types.js';

/** Steps depending on `stepId` that have a recorded start: they block a retraction of its end. */
export const startedDependents = (state: BakeState, stepId: StepId): StepId[] =>
  (state.process?.steps ?? [])
    .filter((s) => s.dependsOn.includes(stepId) && state.steps[s.id]?.startedAt !== undefined)
    .map((s) => s.id);

export type PreviousAction =
  /** Nothing real happened after: `RetractCompletion` with this target resumes the step. */
  | { readonly kind: 'retract'; readonly targetEventId: string }
  /** A fact is recorded after the completion (or there is none): nothing is rewritten. */
  | {
      readonly kind: 'blocked';
      readonly reason: 'notCompleted' | 'dependentStarted';
      readonly dependents: readonly StepId[];
    };

/**
 * What the UI's Previous button does for the step that was just completed, by the same rule as
 * `RetractCompletion`. When blocked, the UI offers `CorrectStepTime` or `InsertStepAfter`; a
 * deliberate repetition is always the latter, never a retraction.
 */
export const previousAction = (state: BakeState, stepId: StepId): PreviousAction => {
  const record = state.steps[stepId];
  if (record?.endedAt === undefined || record.endEventId === undefined) {
    return { kind: 'blocked', reason: 'notCompleted', dependents: [] };
  }
  const dependents = startedDependents(state, stepId);
  return dependents.length > 0
    ? { kind: 'blocked', reason: 'dependentStarted', dependents }
    : { kind: 'retract', targetEventId: record.endEventId };
};

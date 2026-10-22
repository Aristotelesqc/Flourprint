import type { Process, ProcessStep } from './types.js';

/**
 * Cooking operations (process.md): the cooking stages of a Preparation (bake-session.md) and the
 * heat steps that end the fermentation (fermentation.md). `preheat` heats equipment, not the
 * dough; a `proof` held in an oven's Proof mode is fermentation, whatever the appliance.
 */
export const COOKING_OPERATIONS: readonly string[] = [
  'bake',
  'boil',
  'steam',
  'fry',
  'panCook',
  'grill',
];

export const isCookingStep = (step: Pick<ProcessStep, 'operation'>): boolean =>
  COOKING_OPERATIONS.includes(step.operation);

/** What came of a Preparation (bake-session.md, Outcome). */
export interface PreparationOutcome {
  readonly result: 'cooked' | 'dough' | 'cookedAndDough';
  /** What became of the raw dough. */
  readonly dough?: 'frozen' | 'refrigerated' | 'given' | 'sold' | 'other';
  /** Raw dough pieces kept, for a later inventory (#56). */
  readonly pieces?: number;
}

export const OUTCOME_RESULTS: readonly PreparationOutcome['result'][] = [
  'cooked',
  'dough',
  'cookedAndDough',
];
export const DOUGH_DISPOSITIONS: readonly NonNullable<PreparationOutcome['dough']>[] = [
  'frozen',
  'refrigerated',
  'given',
  'sold',
  'other',
];

/** Why an outcome is invalid, as `{ field, reason }`, or undefined when it is valid. */
export const outcomeProblem = (
  outcome: PreparationOutcome,
): { field: string; reason: string } | undefined => {
  if (!OUTCOME_RESULTS.includes(outcome.result)) {
    return { field: 'result', reason: 'must be cooked, dough or cookedAndDough' };
  }
  const keepsDough = outcome.result !== 'cooked';
  if (outcome.dough !== undefined) {
    if (!keepsDough) return { field: 'dough', reason: 'only with a dough result' };
    if (!DOUGH_DISPOSITIONS.includes(outcome.dough)) {
      return { field: 'dough', reason: 'unknown disposition' };
    }
  }
  if (outcome.pieces !== undefined) {
    if (!keepsDough) return { field: 'pieces', reason: 'only with a dough result' };
    if (!(Number.isInteger(outcome.pieces) && outcome.pieces >= 1)) {
      return { field: 'pieces', reason: 'must be an integer ≥ 1' };
    }
  }
  return undefined;
};

/**
 * The outcome a recipe ends with (bake-session.md): its own `intendedOutcome`, else `cooked` when
 * the process has a cooking step, else a raw `dough` with no disposition.
 */
export const intendedOutcome = (process: Process): PreparationOutcome =>
  process.intendedOutcome ??
  (process.steps.some(isCookingStep) ? { result: 'cooked' } : { result: 'dough' });

/**
 * Whether finishing must be told its outcome (bake-session.md, Finishing): the process intends a
 * cooked result (`cooked` or `cookedAndDough`) but no cooking step is completed, so the intended outcome cannot be assumed.
 * A recipe whose intended outcome is a dough finishes with it at once.
 */
export const outcomeChoiceRequired = (
  process: Process,
  isCompleted: (stepId: string) => boolean,
): boolean =>
  intendedOutcome(process).result !== 'dough' &&
  !process.steps.some((step) => isCookingStep(step) && isCompleted(step.id));

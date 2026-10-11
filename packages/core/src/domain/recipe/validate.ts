import type { FormulaError } from '../formula/errors.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Formula, ResolvedFormula } from '../formula/types.js';
import { planIncorporations, type IncorporatedAmount } from '../process/incorporations.js';
import type { Process, StepId } from '../process/types.js';
import { validateProcess, type ProcessError } from '../process/validate.js';
import { ok, type Result } from '../result.js';

export type RecipeError = FormulaError | ProcessError;

export interface ValidRecipe {
  readonly resolved: ResolvedFormula;
  /** Grams added at each step; empty when the process declares no incorporation. */
  readonly incorporations: Readonly<Record<StepId, readonly IncorporatedAmount[]>>;
}

/**
 * Validates a formula and its process together (process.md, persistence.md): each on its own,
 * then the declared incorporations against the formula's final mix. Every operation that saves,
 * starts or changes either side goes through this check.
 */
export const validateRecipe = (
  formula: Formula,
  process: Process,
): Result<ValidRecipe, RecipeError> => {
  const resolved = resolveFormula(formula);
  if (!resolved.ok) return resolved;
  const valid = validateProcess(process);
  if (!valid.ok) return valid;
  const incorporations = planIncorporations(process, resolved.value);
  if (!incorporations.ok) return incorporations;
  return ok({ resolved: resolved.value, incorporations: incorporations.value });
};

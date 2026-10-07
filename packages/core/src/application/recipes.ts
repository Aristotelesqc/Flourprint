import {
  err,
  projectProcess,
  resolveFormula,
  type FormulaError,
  type ProcessError,
  type Result,
  type Revision,
} from '../domain/index.js';
import type { RecipeRepository, RecipeStoreError, SaveRevisionInput } from './ports.js';

export type SaveRevisionError = FormulaError | ProcessError | RecipeStoreError;

/** Validates a formula and its process with the engine, then stores a new immutable revision. */
export const saveRevision = async (
  repository: RecipeRepository,
  input: SaveRevisionInput,
): Promise<Result<Revision, SaveRevisionError>> => {
  const resolved = resolveFormula(input.formula);
  if (!resolved.ok) return resolved;
  const projected = projectProcess(input.process, {
    mode: { kind: 'startAt', at: input.createdAt },
  });
  if (!projected.ok) return err(projected.error);
  return repository.saveRevision(input);
};

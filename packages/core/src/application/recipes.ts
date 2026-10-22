import {
  err,
  projectProcess,
  validateRecipe,
  type RecipeError,
  type Instant,
  type Result,
  type Revision,
} from '../domain/index.js';
import type { RecipeRepository, RecipeStoreError, SaveRevisionInput } from './ports.js';

export type SaveRevisionError = RecipeError | RecipeStoreError;

/**
 * Validates a formula and its process together with the engine (incorporations included), then
 * stores a new immutable revision.
 */
export const saveRevision = async (
  repository: RecipeRepository,
  input: SaveRevisionInput,
): Promise<Result<Revision, SaveRevisionError>> => {
  const valid = validateRecipe(input.formula, input.process);
  if (!valid.ok) return valid;
  const projected = projectProcess(input.process, {
    mode: { kind: 'startAt', at: input.createdAt },
  });
  if (!projected.ok) return err(projected.error);
  return repository.saveRevision(input);
};

/** Restores a saved revision as the new head (persistence.md, Recipe history). */
export const restoreRevision = (
  repository: RecipeRepository,
  recipeId: string,
  version: number,
  expectedHead: number,
  createdAt: Instant,
) => repository.restoreRevision(recipeId, version, expectedHead, createdAt);

/** Promotes a saved revision to a reference version (persistence.md, Recipe history). */
export const promoteReferenceVersion = (
  repository: RecipeRepository,
  recipeId: string,
  version: number,
  name: string | undefined,
  expectedHead: number,
  createdAt: Instant,
) => repository.promoteReferenceVersion(recipeId, version, name, expectedHead, createdAt);

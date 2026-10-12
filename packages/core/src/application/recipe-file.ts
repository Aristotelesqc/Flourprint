import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type DomainError,
  type Instant,
  type RecipeFamily,
  type Result,
} from '../domain/index.js';
import { decodeRecipes, recordedRecipes, type BackupError } from './backup.js';
import { isCount, isInstant, isObject, Refused } from './decode.js';
import type {
  RecipeImportOutcome,
  RecipeImportPlan,
  RecipeRepository,
  RecordedRecipe,
} from './ports.js';

/** Recipes only, never bakes; named distinctly from a full backup (persistence.md). */
export interface RecipeFile {
  readonly kind: 'flourprint-recipes';
  readonly schemaVersion: number;
  readonly exportedAt: Instant;
  readonly recipes: readonly RecordedRecipe[];
  readonly families: readonly RecipeFamily[];
}

export type RecipeFileError =
  | DomainError<'InvalidRecipeFile', { reason: string }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>;

const invalid = (reason: string): RecipeFileError =>
  domainError('InvalidRecipeFile', `Invalid recipe file: ${reason}`, { reason });

/** Exports every recipe outside the trash with all its revisions, and every family. */
export const exportRecipes = async (
  repository: RecipeRepository,
  exportedAt: Instant,
): Promise<Result<RecipeFile, BackupError>> => {
  const recipes = await recordedRecipes(repository);
  if (!recipes.ok) return recipes;
  return ok({
    kind: 'flourprint-recipes',
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    exportedAt,
    recipes: recipes.value,
    // A pin on a recipe left in the trash is not shared: the file stays self-consistent.
    families: (await repository.listFamilies()).map(({ pinnedRecipeId, ...family }) =>
      pinnedRecipeId !== undefined && recipes.value.some((r) => r.id === pinnedRecipeId)
        ? { ...family, pinnedRecipeId }
        : family,
    ),
  });
};

/** Decodes and checks a recipe file as strictly as a backup, before anything is written. */
export const decodeRecipeFile = (input: unknown): Result<RecipeImportPlan, RecipeFileError> => {
  if (!isObject(input) || input.kind !== 'flourprint-recipes') {
    return err(invalid('not a Flourprint recipe file'));
  }
  if (!isCount(input.schemaVersion)) return err(invalid('missing schema version'));
  if (input.schemaVersion > DOCUMENT_SCHEMA_VERSION) {
    return err(
      domainError(
        'UnsupportedDocumentVersion',
        `Recipe file schema ${input.schemaVersion} is not supported`,
        { schemaVersion: input.schemaVersion },
      ),
    );
  }
  if (!isInstant(input.exportedAt)) return err(invalid('no valid exportedAt'));
  try {
    const plan = decodeRecipes(input.recipes, input.families);
    // Sharing never sends the trash: a recipes file carries no trashed recipe.
    if (plan.recipes.some((recipe) => recipe.trashedAt !== undefined)) {
      return err(invalid('a recipes file carries no recipe from the trash'));
    }
    return ok(plan);
  } catch (error) {
    if (error instanceof Refused) return err(invalid(error.reason));
    return err(invalid('malformed content'));
  }
};

/**
 * Adds the recipes of a file (persistence.md): absent ids are written as recorded, present ids
 * are skipped and never overwritten. Importing the same file twice imports nothing.
 */
export const importRecipes = async (
  repository: RecipeRepository,
  input: unknown,
): Promise<Result<RecipeImportOutcome, RecipeFileError>> => {
  const plan = decodeRecipeFile(input);
  if (!plan.ok) return plan;
  return ok(await repository.importRecipes(plan.value));
};

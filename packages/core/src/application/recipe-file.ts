import {
  EXPORT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type DomainError,
  type IngredientEntry,
  type Instant,
  type RecipeFamily,
  type Result,
} from '../domain/index.js';
import { decodeIngredients, decodeRecipes, recordedRecipes, type BackupError } from './backup.js';
import { isCount, isInstant, isObject, Refused } from './decode.js';
import { pinnedIngredientEntries } from './ingredients.js';
import type {
  IngredientRegistry,
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
  /** The personal ingredient entry versions its revisions pin (ingredients.md); optional. */
  readonly ingredients?: readonly IngredientEntry[];
}

export type RecipeFileError =
  | DomainError<'InvalidRecipeFile', { reason: string }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>;

const invalid = (reason: string): RecipeFileError =>
  domainError('InvalidRecipeFile', `Invalid recipe file: ${reason}`, { reason });

/**
 * Exports every recipe outside the trash with all its revisions, and every family. With the
 * ingredient registry, it also carries the personal entry versions the revisions pin
 * (ingredients.md); a pin that does not resolve is left out and blocks nothing.
 */
export const exportRecipes = async (
  repository: RecipeRepository,
  exportedAt: Instant,
  ingredientRegistry?: IngredientRegistry,
): Promise<Result<RecipeFile, BackupError>> => {
  const recipes = await recordedRecipes(repository);
  if (!recipes.ok) return recipes;
  const pinned = ingredientRegistry
    ? (
        await pinnedIngredientEntries(
          ingredientRegistry,
          recipes.value.flatMap((recipe) => recipe.revisions.map((revision) => revision.formula)),
        )
      ).filter((entry) => !entry.builtIn)
    : [];
  return ok({
    kind: 'flourprint-recipes',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    recipes: recipes.value,
    // A pin on a recipe left in the trash is not shared: the file stays self-consistent.
    families: (await repository.listFamilies()).map(({ pinnedRecipeId, ...family }) =>
      pinnedRecipeId !== undefined && recipes.value.some((r) => r.id === pinnedRecipeId)
        ? { ...family, pinnedRecipeId }
        : family,
    ),
    ...(pinned.length === 0 ? {} : { ingredients: pinned }),
  });
};

/** Decodes and checks a recipe file as strictly as a backup, before anything is written. */
export const decodeRecipeFile = (input: unknown): Result<RecipeImportPlan, RecipeFileError> => {
  if (!isObject(input) || input.kind !== 'flourprint-recipes') {
    return err(invalid('not a Flourprint recipe file'));
  }
  if (!isCount(input.schemaVersion)) return err(invalid('missing schema version'));
  if (input.schemaVersion > EXPORT_SCHEMA_VERSION) {
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
    const ingredients = decodeIngredients(input.ingredients, 'ingredients');
    return ok(ingredients.length === 0 ? plan : { ...plan, ingredients });
  } catch (error) {
    if (error instanceof Refused) return err(invalid(error.reason));
    return err(invalid('malformed content'));
  }
};

/**
 * Adds the recipes of a file (persistence.md): absent ids are written as recorded, present ids
 * are skipped and never overwritten; so are the ingredient entry versions it carries
 * (ingredients.md). Importing the same file twice imports nothing.
 */
export const importRecipes = async (
  repository: RecipeRepository,
  input: unknown,
): Promise<Result<RecipeImportOutcome, RecipeFileError>> => {
  const plan = decodeRecipeFile(input);
  if (!plan.ok) return plan;
  return ok(await repository.importRecipes(plan.value));
};

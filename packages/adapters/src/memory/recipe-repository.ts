import type {
  RecipeRepository,
  RecipeStoreError,
  SaveRevisionInput,
} from '@flourprint/core/application';
import {
  domainError,
  err,
  ok,
  type Recipe,
  type Result,
  type Revision,
} from '@flourprint/core/domain';

/** In-memory recipe repository; same contract as the SQLite implementations. */
export class MemoryRecipeRepository implements RecipeRepository {
  readonly #recipes = new Map<string, Recipe>();
  readonly #revisions = new Map<string, Revision>();

  async saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>> {
    const currentHead = this.#recipes.get(input.recipeId)?.headVersion ?? 0;
    if (currentHead !== input.expectedHead) {
      return err(
        domainError('HeadConflict', `Recipe ${input.recipeId} is at version ${currentHead}`, {
          recipeId: input.recipeId,
          currentHead,
        }),
      );
    }
    const revision: Revision = {
      recipeId: input.recipeId,
      version: currentHead + 1,
      formula: input.formula,
      process: input.process,
      createdAt: input.createdAt,
      ...(input.note === undefined ? {} : { note: input.note }),
    };
    this.#revisions.set(
      `${input.recipeId}@${revision.version}`,
      JSON.parse(JSON.stringify(revision)) as Revision,
    );
    this.#recipes.set(input.recipeId, {
      id: input.recipeId,
      name: input.name,
      headVersion: revision.version,
      updatedAt: input.createdAt,
    });
    return ok(revision);
  }

  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    return this.#recipes.get(recipeId);
  }

  async listRecipes(): Promise<readonly Recipe[]> {
    return [...this.#recipes.values()];
  }

  async getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>> {
    const revision = this.#revisions.get(`${recipeId}@${version}`);
    return ok(
      revision === undefined ? undefined : (JSON.parse(JSON.stringify(revision)) as Revision),
    );
  }
}

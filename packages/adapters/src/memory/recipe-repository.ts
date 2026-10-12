import type {
  FamilyError,
  RecipeImportOutcome,
  RecipeImportPlan,
  RecipeRepository,
  RecipeStoreError,
  RecordedRecipe,
  SaveRevisionInput,
  Draft,
  TrashError,
} from '@flourprint/core/application';
import {
  domainError,
  err,
  ok,
  type Instant,
  type Recipe,
  type RecipeFamily,
  type Result,
  type Revision,
} from '@flourprint/core/domain';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** In-memory recipe repository; same contract as the SQLite implementations. */
export class MemoryRecipeRepository implements RecipeRepository {
  readonly #recipes = new Map<string, Recipe>();
  readonly #revisions = new Map<string, Revision>();
  readonly #families = new Map<string, RecipeFamily>();
  readonly #drafts = new Map<string, Draft>();

  async saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>> {
    const current = this.#recipes.get(input.recipeId);
    if (current?.trashedAt !== undefined) {
      return err(
        domainError('RecipeTrashed', `Recipe ${input.recipeId} is in the trash`, {
          recipeId: input.recipeId,
        }),
      );
    }
    if (current === undefined && input.expectedHead > 0) {
      return err(
        domainError('NotFound', `Recipe ${input.recipeId} does not exist`, {
          recipeId: input.recipeId,
        }),
      );
    }
    const currentHead = current?.headVersion ?? 0;
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
    this.#writeRevision(input.name, revision);
    if (input.fromDraft !== undefined) this.#drafts.delete(input.fromDraft);
    return ok(revision);
  }

  #writeRevision(name: string, revision: Revision): void {
    this.#revisions.set(`${revision.recipeId}@${revision.version}`, copy(revision));
    const { familyId, trashedAt } = this.#recipes.get(revision.recipeId) ?? {};
    this.#recipes.set(revision.recipeId, {
      id: revision.recipeId,
      name,
      headVersion: revision.version,
      updatedAt: revision.createdAt,
      ...(familyId === undefined ? {} : { familyId }),
      ...(trashedAt === undefined ? {} : { trashedAt }),
    });
  }

  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    const recipe = this.#recipes.get(recipeId);
    return recipe && { ...recipe };
  }

  async listRecipes(): Promise<readonly Recipe[]> {
    // Same order as the SQLite stores: most recently updated first.
    return [...this.#recipes.values()]
      .filter((recipe) => recipe.trashedAt === undefined)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((recipe) => ({ ...recipe }));
  }

  async listTrash(): Promise<readonly Recipe[]> {
    return [...this.#recipes.values()]
      .filter((recipe) => recipe.trashedAt !== undefined)
      .sort(
        (a, b) =>
          Date.parse(b.trashedAt as string) - Date.parse(a.trashedAt as string) ||
          (a.id < b.id ? -1 : 1),
      )
      .map((recipe) => ({ ...recipe }));
  }

  async trashRecipe(recipeId: string, at: Instant): Promise<Result<void, TrashError>> {
    const recipe = this.#recipes.get(recipeId);
    if (!recipe) return err(trashNotFound(recipeId));
    if (recipe.trashedAt !== undefined) {
      return err(domainError('AlreadyTrashed', `Recipe ${recipeId} is in the trash`, { recipeId }));
    }
    this.#recipes.set(recipeId, { ...recipe, trashedAt: at });
    return ok(undefined);
  }

  async restoreRecipe(recipeId: string): Promise<Result<void, TrashError>> {
    const recipe = this.#recipes.get(recipeId);
    if (!recipe) return err(trashNotFound(recipeId));
    if (recipe.trashedAt === undefined) return err(notTrashed(recipeId));
    const { trashedAt: _, ...rest } = recipe;
    this.#recipes.set(recipeId, rest);
    return ok(undefined);
  }

  async deleteRecipe(recipeId: string): Promise<Result<void, TrashError>> {
    const recipe = this.#recipes.get(recipeId);
    if (!recipe) return err(trashNotFound(recipeId));
    if (recipe.trashedAt === undefined) return err(notTrashed(recipeId));
    this.#remove(recipeId);
    return ok(undefined);
  }

  async emptyTrash(): Promise<readonly string[]> {
    const ids = (await this.listTrash()).map((recipe) => recipe.id);
    for (const id of ids) this.#remove(id);
    return ids;
  }

  /** Deletes a recipe and its revisions; it leaves its family first (pin, empty family). */
  #remove(recipeId: string): void {
    const recipe = this.#recipes.get(recipeId);
    if (!recipe) return;
    this.#setFamily(recipeId, undefined);
    for (let version = 1; version <= recipe.headVersion; version++) {
      this.#revisions.delete(`${recipeId}@${version}`);
    }
    this.#recipes.delete(recipeId);
  }

  async listFamilies(options?: { readonly all?: boolean }): Promise<readonly RecipeFamily[]> {
    return [...this.#families.values()]
      .filter(
        (family) =>
          options?.all === true ||
          [...this.#recipes.values()].some(
            (r) => r.familyId === family.id && r.trashedAt === undefined,
          ),
      )
      .map((family) => ({ ...family }));
  }

  async groupRecipes(
    family: { readonly id: string; readonly name: string },
    recipeIds: readonly string[],
  ): Promise<Result<void, FamilyError>> {
    const missing = recipeIds.find((id) => !this.#recipes.has(id));
    if (missing !== undefined) return err(recipeNotFound(missing));
    const current = this.#families.get(family.id);
    this.#families.set(family.id, { ...current, id: family.id, name: family.name });
    for (const id of recipeIds) this.#setFamily(id, family.id);
    return ok(undefined);
  }

  async leaveFamily(recipeId: string): Promise<Result<void, FamilyError>> {
    if (!this.#recipes.has(recipeId)) return err(recipeNotFound(recipeId));
    this.#setFamily(recipeId, undefined);
    return ok(undefined);
  }

  async pinVariant(
    familyId: string,
    recipeId: string | undefined,
  ): Promise<Result<void, FamilyError>> {
    const family = this.#families.get(familyId);
    if (!family) return err(familyNotFound(familyId));
    if (recipeId !== undefined && this.#recipes.get(recipeId)?.familyId !== familyId) {
      return err(notInFamily(recipeId, familyId));
    }
    const { pinnedRecipeId: _, ...rest } = family;
    this.#families.set(
      familyId,
      recipeId === undefined ? rest : { ...rest, pinnedRecipeId: recipeId },
    );
    return ok(undefined);
  }

  /** Moves a recipe between families; clears a pin it held and deletes an emptied family. */
  #setFamily(recipeId: string, familyId: string | undefined): void {
    const recipe = this.#recipes.get(recipeId);
    if (!recipe) return;
    const previous = recipe.familyId;
    const { familyId: _, ...rest } = recipe;
    this.#recipes.set(recipeId, familyId === undefined ? rest : { ...rest, familyId });
    if (previous === undefined || previous === familyId) return;
    const old = this.#families.get(previous);
    if (!old) return;
    if (![...this.#recipes.values()].some((r) => r.familyId === previous)) {
      this.#families.delete(previous);
    } else if (old.pinnedRecipeId === recipeId) {
      const { pinnedRecipeId: __, ...unpinned } = old;
      this.#families.set(previous, unpinned);
    }
  }

  async importRecipes(plan: RecipeImportPlan): Promise<RecipeImportOutcome> {
    const imported: string[] = [];
    const skipped: string[] = [];
    const created = plan.families.filter((family) => !this.#families.has(family.id));
    for (const family of created) this.#families.set(family.id, copy(family));
    for (const recipe of plan.recipes) {
      if (this.#recipes.has(recipe.id)) {
        skipped.push(recipe.id);
        continue;
      }
      this.write(recipe);
      imported.push(recipe.id);
    }
    // Recipes may have been skipped: a new family keeps only members, and a pin only a member.
    for (const { id, pinnedRecipeId } of created) {
      if (![...this.#recipes.values()].some((r) => r.familyId === id)) {
        this.#families.delete(id);
      } else if (
        pinnedRecipeId !== undefined &&
        this.#recipes.get(pinnedRecipeId)?.familyId !== id
      ) {
        await this.pinVariant(id, undefined);
      }
    }
    return { imported, skipped };
  }

  /** Writes a recorded recipe synchronously; restores and imports use it to stay atomic. */
  write(recipe: RecordedRecipe): void {
    for (const revision of recipe.revisions) this.#writeRevision(recipe.name, revision);
    if (recipe.familyId !== undefined) this.#setFamily(recipe.id, recipe.familyId);
    if (recipe.trashedAt !== undefined) {
      const written = this.#recipes.get(recipe.id);
      if (written) this.#recipes.set(recipe.id, { ...written, trashedAt: recipe.trashedAt });
    }
  }

  /** Writes a family as recorded (restores). */
  writeFamily(family: RecipeFamily): void {
    this.#families.set(family.id, copy(family));
  }

  get isEmpty(): boolean {
    return this.#recipes.size === 0;
  }

  async getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>> {
    const revision = this.#revisions.get(`${recipeId}@${version}`);
    return ok(revision === undefined ? undefined : copy(revision));
  }

  async listDrafts(): Promise<readonly Draft[]> {
    return [...this.#drafts.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
      .map(copy);
  }

  async getDraft(draftId: string): Promise<Draft | undefined> {
    const draft = this.#drafts.get(draftId);
    return draft && copy(draft);
  }

  async saveDraft(draft: Draft): Promise<void> {
    this.#drafts.set(draft.id, copy(draft));
  }

  async deleteDraft(draftId: string): Promise<void> {
    this.#drafts.delete(draftId);
  }

  /** Restore support: writes drafts as recorded. */
  restoreDraft(draft: Draft): void {
    this.#drafts.set(draft.id, copy(draft));
  }
}

const recipeNotFound = (recipeId: string): FamilyError =>
  domainError('RecipeNotFound', `Recipe ${recipeId} does not exist`, { recipeId });
const trashNotFound = (recipeId: string): TrashError =>
  domainError('NotFound', `Recipe ${recipeId} does not exist`, { recipeId });
const notTrashed = (recipeId: string): TrashError =>
  domainError('NotTrashed', `Recipe ${recipeId} is not in the trash`, { recipeId });
const familyNotFound = (familyId: string): FamilyError =>
  domainError('FamilyNotFound', `Family ${familyId} does not exist`, { familyId });
const notInFamily = (recipeId: string, familyId: string): FamilyError =>
  domainError('NotInFamily', `Recipe ${recipeId} is not a variant of ${familyId}`, {
    recipeId,
    familyId,
  });

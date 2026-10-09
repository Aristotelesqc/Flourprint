import type {
  FamilyError,
  RecipeImportOutcome,
  RecipeImportPlan,
  RecipeRepository,
  RecipeStoreError,
  RecordedRecipe,
  SaveRevisionInput,
} from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type Recipe,
  type RecipeFamily,
  type Result,
  type Revision,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface RecipeRow {
  id: string;
  name: string;
  head_version: number;
  updated_at: string;
  family_id: string | null;
}

interface FamilyRow {
  id: string;
  name: string;
  pinned_recipe_id: string | null;
}

const toRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  name: row.name,
  headVersion: Number(row.head_version),
  updatedAt: row.updated_at as Recipe['updatedAt'],
  ...(row.family_id === null ? {} : { familyId: row.family_id }),
});

const toFamily = (row: FamilyRow): RecipeFamily => ({
  id: row.id,
  name: row.name,
  ...(row.pinned_recipe_id === null ? {} : { pinnedRecipeId: row.pinned_recipe_id }),
});

const recipeNotFound = (recipeId: string): FamilyError =>
  domainError('RecipeNotFound', `Recipe ${recipeId} does not exist`, { recipeId });

/**
 * Moves a recipe to a family (or out of any), clears a pin it held elsewhere and deletes a
 * family left without members.
 */
const setFamily = async (
  tx: SqlExecutor,
  recipeId: string,
  familyId: string | null,
): Promise<void> => {
  const [row] = await tx.query<{ family_id: string | null }>(
    'SELECT family_id FROM recipes WHERE id = ?',
    [recipeId],
  );
  const previous = row?.family_id ?? null;
  await tx.run('UPDATE recipes SET family_id = ? WHERE id = ?', [familyId, recipeId]);
  if (previous === null || previous === familyId) return;
  await tx.run(
    'UPDATE recipe_families SET pinned_recipe_id = NULL WHERE id = ? AND pinned_recipe_id = ?',
    [previous, recipeId],
  );
  await tx.run(
    'DELETE FROM recipe_families WHERE id = ? AND NOT EXISTS (SELECT 1 FROM recipes WHERE family_id = ?)',
    [previous, previous],
  );
};

/** Writes a recorded recipe with its revisions and family; used by restores and imports. */
export const insertRecipe = async (tx: SqlExecutor, recipe: RecordedRecipe): Promise<void> => {
  for (const revision of recipe.revisions) await insertRevision(tx, recipe.name, revision);
  if (recipe.familyId !== undefined) await setFamily(tx, recipe.id, recipe.familyId);
};

export const insertFamily = async (tx: SqlExecutor, family: RecipeFamily): Promise<void> => {
  await tx.run('INSERT INTO recipe_families (id, name, pinned_recipe_id) VALUES (?, ?, ?)', [
    family.id,
    family.name,
    family.pinnedRecipeId ?? null,
  ]);
};

/** Writes one revision and moves the recipe head to it; used by saves and restores. */
export const insertRevision = async (
  tx: SqlExecutor,
  name: string,
  revision: Revision,
): Promise<void> => {
  await tx.run(
    'INSERT INTO revisions (recipe_id, version, schema_version, document, created_at) VALUES (?, ?, ?, ?, ?)',
    [
      revision.recipeId,
      revision.version,
      DOCUMENT_SCHEMA_VERSION,
      JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...revision }),
      revision.createdAt,
    ],
  );
  await tx.run(
    `INSERT INTO recipes (id, name, head_version, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name,
       head_version = excluded.head_version, updated_at = excluded.updated_at`,
    [revision.recipeId, name, revision.version, revision.createdAt],
  );
};

/** Recipes and immutable revisions on any SQLite driver (docs/contracts/persistence.md). */
export class SqlRecipeRepository implements RecipeRepository {
  constructor(private readonly driver: SqlDriver) {}

  saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [current] = await tx.query<{ head_version: number }>(
        'SELECT head_version FROM recipes WHERE id = ?',
        [input.recipeId],
      );
      const currentHead = Number(current?.head_version ?? 0);
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
      await insertRevision(tx, input.name, revision);
      return ok(revision);
    });
  }

  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    const [row] = await this.driver.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [
      recipeId,
    ]);
    return row ? toRecipe(row) : undefined;
  }

  async listRecipes(): Promise<readonly Recipe[]> {
    const rows = await this.driver.query<RecipeRow>(
      'SELECT * FROM recipes ORDER BY updated_at DESC',
    );
    return rows.map(toRecipe);
  }

  async listFamilies(): Promise<readonly RecipeFamily[]> {
    const rows = await this.driver.query<FamilyRow>('SELECT * FROM recipe_families ORDER BY id');
    return rows.map(toFamily);
  }

  groupRecipes(
    family: { readonly id: string; readonly name: string },
    recipeIds: readonly string[],
  ): Promise<Result<void, FamilyError>> {
    return this.driver.transaction(async (tx) => {
      for (const id of recipeIds) {
        const [row] = await tx.query<{ id: string }>('SELECT id FROM recipes WHERE id = ?', [id]);
        if (!row) return err(recipeNotFound(id));
      }
      await tx.run(
        `INSERT INTO recipe_families (id, name) VALUES (?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name`,
        [family.id, family.name],
      );
      for (const id of recipeIds) await setFamily(tx, id, family.id);
      return ok(undefined);
    });
  }

  leaveFamily(recipeId: string): Promise<Result<void, FamilyError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ id: string }>('SELECT id FROM recipes WHERE id = ?', [
        recipeId,
      ]);
      if (!row) return err(recipeNotFound(recipeId));
      await setFamily(tx, recipeId, null);
      return ok(undefined);
    });
  }

  pinVariant(familyId: string, recipeId: string | undefined): Promise<Result<void, FamilyError>> {
    return this.driver.transaction(async (tx) => {
      const [family] = await tx.query<{ id: string }>(
        'SELECT id FROM recipe_families WHERE id = ?',
        [familyId],
      );
      if (!family) {
        return err(
          domainError('FamilyNotFound', `Family ${familyId} does not exist`, { familyId }),
        );
      }
      if (recipeId !== undefined) {
        const [member] = await tx.query<{ id: string }>(
          'SELECT id FROM recipes WHERE id = ? AND family_id = ?',
          [recipeId, familyId],
        );
        if (!member) {
          return err(
            domainError('NotInFamily', `Recipe ${recipeId} is not a variant of ${familyId}`, {
              recipeId,
              familyId,
            }),
          );
        }
      }
      await tx.run('UPDATE recipe_families SET pinned_recipe_id = ? WHERE id = ?', [
        recipeId ?? null,
        familyId,
      ]);
      return ok(undefined);
    });
  }

  importRecipes(plan: RecipeImportPlan): Promise<RecipeImportOutcome> {
    return this.driver.transaction(async (tx) => {
      const created: RecipeFamily[] = [];
      for (const family of plan.families) {
        const [row] = await tx.query<{ id: string }>(
          'SELECT id FROM recipe_families WHERE id = ?',
          [family.id],
        );
        if (row) continue;
        await insertFamily(tx, family);
        created.push(family);
      }
      const imported: string[] = [];
      const skipped: string[] = [];
      for (const recipe of plan.recipes) {
        const [row] = await tx.query<{ id: string }>('SELECT id FROM recipes WHERE id = ?', [
          recipe.id,
        ]);
        if (row) {
          skipped.push(recipe.id);
          continue;
        }
        await insertRecipe(tx, recipe);
        imported.push(recipe.id);
      }
      // Recipes may have been skipped: a new family keeps only members, and a pin only a member.
      for (const family of created) {
        await tx.run(
          'DELETE FROM recipe_families WHERE id = ? AND NOT EXISTS (SELECT 1 FROM recipes WHERE family_id = ?)',
          [family.id, family.id],
        );
        await tx.run(
          `UPDATE recipe_families SET pinned_recipe_id = NULL WHERE id = ? AND NOT EXISTS
             (SELECT 1 FROM recipes WHERE id = recipe_families.pinned_recipe_id AND family_id = ?)`,
          [family.id, family.id],
        );
      }
      return { imported, skipped };
    });
  }

  async getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>> {
    const [row] = await this.driver.query<{ schema_version: number; document: string }>(
      'SELECT schema_version, document FROM revisions WHERE recipe_id = ? AND version = ?',
      [recipeId, version],
    );
    if (!row) return ok(undefined);
    if (Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Revision schema ${row.schema_version} is not supported`,
          { schemaVersion: Number(row.schema_version) },
        ),
      );
    }
    const { schemaVersion, ...revision } = JSON.parse(row.document) as Revision & {
      schemaVersion: number;
    };
    return ok(revision);
  }
}

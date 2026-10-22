import type {
  FamilyError,
  RecipeImportOutcome,
  RecipeHistoryError,
  RecipeImportPlan,
  RecipeRepository,
  RecipeStoreError,
  RecordedRecipe,
  SaveRevisionInput,
  Draft,
  TrashError,
} from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  sameRecipeContent,
  type Instant,
  type Recipe,
  type RecipeFamily,
  type ReferenceVersion,
  type Result,
  type Revision,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';
import { insertIngredientIfAbsent } from './ingredient-registry.js';

interface RecipeRow {
  id: string;
  name: string;
  head_version: number;
  updated_at: string;
  family_id: string | null;
  trashed_at: string | null;
}

interface FamilyRow {
  id: string;
  name: string;
  pinned_recipe_id: string | null;
}

/** Some drivers return a missing value as `undefined` rather than `null`. */
const inTrash = (trashedAt: string | null | undefined): boolean =>
  trashedAt !== null && trashedAt !== undefined;

interface ReferenceRow {
  recipe_id: string;
  number: number;
  version: number;
  name: string | null;
  created_at: string;
}

const toReference = (row: ReferenceRow): ReferenceVersion => ({
  recipeId: row.recipe_id,
  number: Number(row.number),
  version: Number(row.version),
  ...(row.name === null || row.name === undefined ? {} : { name: row.name }),
  createdAt: row.created_at as Instant,
});

/** Parses a stored revision document; the schema version is checked by the caller. */
const parseRevision = (document: string): Revision => {
  const { schemaVersion: _version, ...revision } = JSON.parse(document) as Revision & {
    schemaVersion: number;
  };
  return revision;
};

const toRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  name: row.name,
  headVersion: Number(row.head_version),
  updatedAt: row.updated_at as Recipe['updatedAt'],
  ...(row.family_id === null ? {} : { familyId: row.family_id }),
  ...(inTrash(row.trashed_at) ? { trashedAt: row.trashed_at as Instant } : {}),
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
  for (const reference of recipe.referenceVersions ?? []) {
    await tx.run(
      'INSERT INTO reference_versions (recipe_id, number, version, name, created_at) VALUES (?, ?, ?, ?, ?)',
      [recipe.id, reference.number, reference.version, reference.name ?? null, reference.createdAt],
    );
  }
  if (recipe.familyId !== undefined) await setFamily(tx, recipe.id, recipe.familyId);
  if (recipe.trashedAt !== undefined) {
    await tx.run('UPDATE recipes SET trashed_at = ? WHERE id = ?', [recipe.trashedAt, recipe.id]);
  }
};

const trashNotFound = (recipeId: string): TrashError =>
  domainError('NotFound', `Recipe ${recipeId} does not exist`, { recipeId });
const notTrashed = (recipeId: string): TrashError =>
  domainError('NotTrashed', `Recipe ${recipeId} is not in the trash`, { recipeId });

/** Deletes a trashed recipe with its revisions; it leaves its family first (pin, empty family). */
const removeRecipe = async (tx: SqlExecutor, recipeId: string): Promise<void> => {
  await setFamily(tx, recipeId, null);
  await tx.run('DELETE FROM reference_versions WHERE recipe_id = ?', [recipeId]);
  await tx.run('DELETE FROM revisions WHERE recipe_id = ?', [recipeId]);
  await tx.run('DELETE FROM recipes WHERE id = ?', [recipeId]);
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

/** Writes or replaces a draft; used by saves and restores (persistence.md, Drafts). */
export const writeDraft = async (tx: SqlExecutor, draft: Draft): Promise<void> => {
  await tx.run(
    `INSERT INTO drafts (id, name, document, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, document = excluded.document,
       updated_at = excluded.updated_at`,
    [
      draft.id,
      draft.name,
      JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...draft }),
      draft.updatedAt,
    ],
  );
};

const toDraft = (document: string): Draft => {
  const { schemaVersion: _version, ...draft } = JSON.parse(document) as Draft & {
    schemaVersion: number;
  };
  return draft;
};

/** Shared checks of Restore and Promote: existence, trash, head, then the revision. */
const guardHistory = async (
  tx: SqlExecutor,
  recipeId: string,
  version: number,
  expectedHead: number,
): Promise<Result<{ name: string; head: Revision; source: Revision }, RecipeHistoryError>> => {
  const [recipe] = await tx.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [recipeId]);
  if (!recipe) {
    return err(domainError('NotFound', `Recipe ${recipeId} does not exist`, { recipeId }));
  }
  if (inTrash(recipe.trashed_at)) {
    return err(domainError('RecipeTrashed', `Recipe ${recipeId} is in the trash`, { recipeId }));
  }
  const currentHead = Number(recipe.head_version);
  if (currentHead !== expectedHead) {
    return err(
      domainError('HeadConflict', `Recipe ${recipeId} is at version ${currentHead}`, {
        recipeId,
        currentHead,
      }),
    );
  }
  const rows = await tx.query<{ version: number; schema_version: number; document: string }>(
    'SELECT version, schema_version, document FROM revisions WHERE recipe_id = ? AND version IN (?, ?)',
    [recipeId, version, currentHead],
  );
  const unsupported = rows.find((row) => Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION);
  if (unsupported) {
    return err(
      domainError(
        'UnsupportedDocumentVersion',
        `Revision schema ${unsupported.schema_version} is not supported`,
        { schemaVersion: Number(unsupported.schema_version) },
      ),
    );
  }
  const source = rows.find((row) => Number(row.version) === version);
  const head = rows.find((row) => Number(row.version) === currentHead);
  if (!source || !head) {
    return err(
      domainError('UnknownRevision', `Revision ${recipeId}@${version} does not exist`, {
        recipeId,
        version,
      }),
    );
  }
  return ok({
    name: recipe.name,
    head: parseRevision(head.document),
    source: parseRevision(source.document),
  });
};

/** Recipes and immutable revisions on any SQLite driver (docs/contracts/persistence.md). */
export class SqlRecipeRepository implements RecipeRepository {
  constructor(private readonly driver: SqlDriver) {}

  saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [current] = await tx.query<{ head_version: number; trashed_at: string | null }>(
        'SELECT head_version, trashed_at FROM recipes WHERE id = ?',
        [input.recipeId],
      );
      if (inTrash(current?.trashed_at)) {
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
      const currentHead = Number(current?.head_version ?? 0);
      if (currentHead !== input.expectedHead) {
        return err(
          domainError('HeadConflict', `Recipe ${input.recipeId} is at version ${currentHead}`, {
            recipeId: input.recipeId,
            currentHead,
          }),
        );
      }
      if (currentHead > 0) {
        const [head] = await tx.query<{ document: string }>(
          'SELECT document FROM revisions WHERE recipe_id = ? AND version = ?',
          [input.recipeId, currentHead],
        );
        if (head && sameRecipeContent(parseRevision(head.document), input)) {
          return ok(parseRevision(head.document));
        }
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
      if (input.fromDraft !== undefined) {
        await tx.run('DELETE FROM drafts WHERE id = ?', [input.fromDraft]);
      }
      return ok(revision);
    });
  }

  restoreRevision(
    recipeId: string,
    version: number,
    expectedHead: number,
    createdAt: Instant,
  ): Promise<Result<Revision, RecipeHistoryError>> {
    return this.driver.transaction(async (tx) => {
      const guard = await guardHistory(tx, recipeId, version, expectedHead);
      if (!guard.ok) return guard;
      const { name, head, source } = guard.value;
      if (sameRecipeContent(head, source)) return ok(head);
      const revision: Revision = {
        recipeId,
        version: head.version + 1,
        formula: source.formula,
        process: source.process,
        createdAt,
        ...(source.note === undefined ? {} : { note: source.note }),
      };
      await insertRevision(tx, name, revision);
      return ok(revision);
    });
  }

  promoteReferenceVersion(
    recipeId: string,
    version: number,
    name: string | undefined,
    expectedHead: number,
    createdAt: Instant,
  ): Promise<Result<ReferenceVersion, RecipeHistoryError>> {
    return this.driver.transaction(async (tx) => {
      const guard = await guardHistory(tx, recipeId, version, expectedHead);
      if (!guard.ok) return guard;
      const [existing] = await tx.query<{ number: number }>(
        'SELECT number FROM reference_versions WHERE recipe_id = ? AND version = ?',
        [recipeId, version],
      );
      if (existing) {
        return err(
          domainError(
            'AlreadyReferenced',
            `Revision ${recipeId}@${version} is already referenced`,
            { recipeId, version, number: Number(existing.number) },
          ),
        );
      }
      const [last] = await tx.query<{ n: number | null }>(
        'SELECT MAX(number) AS n FROM reference_versions WHERE recipe_id = ?',
        [recipeId],
      );
      const reference: ReferenceVersion = {
        recipeId,
        number: Number(last?.n ?? 0) + 1,
        version,
        ...(name === undefined ? {} : { name }),
        createdAt,
      };
      await tx.run(
        'INSERT INTO reference_versions (recipe_id, number, version, name, created_at) VALUES (?, ?, ?, ?, ?)',
        [recipeId, reference.number, version, name ?? null, createdAt],
      );
      return ok(reference);
    });
  }

  async listReferenceVersions(recipeId: string): Promise<readonly ReferenceVersion[]> {
    const rows = await this.driver.query<ReferenceRow>(
      'SELECT * FROM reference_versions WHERE recipe_id = ? ORDER BY number',
      [recipeId],
    );
    return rows.map(toReference);
  }

  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    const [row] = await this.driver.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [
      recipeId,
    ]);
    return row ? toRecipe(row) : undefined;
  }

  async listRecipes(): Promise<readonly Recipe[]> {
    const rows = await this.driver.query<RecipeRow>(
      'SELECT * FROM recipes WHERE trashed_at IS NULL ORDER BY updated_at DESC',
    );
    return rows.map(toRecipe);
  }

  async listTrash(): Promise<readonly Recipe[]> {
    const rows = await this.driver.query<RecipeRow>(
      'SELECT * FROM recipes WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC, id',
    );
    return rows.map(toRecipe);
  }

  trashRecipe(recipeId: string, at: Instant): Promise<Result<void, TrashError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [recipeId]);
      if (!row) return err(trashNotFound(recipeId));
      if (inTrash(row.trashed_at)) {
        return err(
          domainError('AlreadyTrashed', `Recipe ${recipeId} is in the trash`, { recipeId }),
        );
      }
      await tx.run('UPDATE recipes SET trashed_at = ? WHERE id = ?', [at, recipeId]);
      return ok(undefined);
    });
  }

  restoreRecipe(recipeId: string): Promise<Result<void, TrashError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [recipeId]);
      if (!row) return err(trashNotFound(recipeId));
      if (!inTrash(row.trashed_at)) return err(notTrashed(recipeId));
      await tx.run('UPDATE recipes SET trashed_at = NULL WHERE id = ?', [recipeId]);
      return ok(undefined);
    });
  }

  deleteRecipe(recipeId: string): Promise<Result<void, TrashError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [recipeId]);
      if (!row) return err(trashNotFound(recipeId));
      if (!inTrash(row.trashed_at)) return err(notTrashed(recipeId));
      await removeRecipe(tx, recipeId);
      return ok(undefined);
    });
  }

  emptyTrash(): Promise<readonly string[]> {
    return this.driver.transaction(async (tx) => {
      const rows = await tx.query<{ id: string }>(
        'SELECT id FROM recipes WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC, id',
      );
      for (const { id } of rows) await removeRecipe(tx, id);
      return rows.map((row) => row.id);
    });
  }

  async listFamilies(options?: { readonly all?: boolean }): Promise<readonly RecipeFamily[]> {
    const rows = await this.driver.query<FamilyRow>(
      options?.all === true
        ? 'SELECT * FROM recipe_families ORDER BY id'
        : `SELECT * FROM recipe_families WHERE EXISTS
             (SELECT 1 FROM recipes WHERE family_id = recipe_families.id AND trashed_at IS NULL)
           ORDER BY id`,
    );
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
      // Pinned entry versions: absent ones are written, present ones skipped (ingredients.md).
      for (const entry of plan.ingredients ?? []) await insertIngredientIfAbsent(tx, entry);
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

  async listDrafts(): Promise<readonly Draft[]> {
    const rows = await this.driver.query<{ document: string }>(
      'SELECT document FROM drafts ORDER BY updated_at DESC, id',
    );
    return rows.map((row) => toDraft(row.document));
  }

  async getDraft(draftId: string): Promise<Draft | undefined> {
    const [row] = await this.driver.query<{ document: string }>(
      'SELECT document FROM drafts WHERE id = ?',
      [draftId],
    );
    return row ? toDraft(row.document) : undefined;
  }

  saveDraft(draft: Draft): Promise<void> {
    return this.driver.transaction((tx) => writeDraft(tx, draft));
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.driver.run('DELETE FROM drafts WHERE id = ?', [draftId]);
  }
}

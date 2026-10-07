import type {
  RecipeRepository,
  RecipeStoreError,
  SaveRevisionInput,
} from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type Recipe,
  type Result,
  type Revision,
} from '@flourprint/core/domain';
import type { SqlDriver } from './driver.js';

interface RecipeRow {
  id: string;
  name: string;
  head_version: number;
  updated_at: string;
}

const toRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  name: row.name,
  headVersion: Number(row.head_version),
  updatedAt: row.updated_at as Recipe['updatedAt'],
});

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
        [input.recipeId, input.name, revision.version, input.createdAt],
      );
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

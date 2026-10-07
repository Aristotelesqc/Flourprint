import type { DatabaseSync } from 'node:sqlite';
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
import { immediate } from './database.js';

interface RecipeRow {
  id: string;
  name: string;
  head_version: number;
  updated_at: string;
}

const toRecipe = (row: RecipeRow): Recipe => ({
  id: row.id,
  name: row.name,
  headVersion: row.head_version,
  updatedAt: row.updated_at as Recipe['updatedAt'],
});

/** Recipes and immutable revisions on SQLite (docs/contracts/persistence.md). */
export class SqliteNodeRecipeRepository implements RecipeRepository {
  constructor(private readonly db: DatabaseSync) {}

  async saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>> {
    return immediate(this.db, () => {
      const current = this.db
        .prepare('SELECT head_version FROM recipes WHERE id = ?')
        .get(input.recipeId) as { head_version: number } | undefined;
      const currentHead = current?.head_version ?? 0;
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
      this.db
        .prepare(
          'INSERT INTO revisions (recipe_id, version, schema_version, document, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(
          revision.recipeId,
          revision.version,
          DOCUMENT_SCHEMA_VERSION,
          JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...revision }),
          revision.createdAt,
        );
      this.db
        .prepare(
          `INSERT INTO recipes (id, name, head_version, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET name = excluded.name,
             head_version = excluded.head_version, updated_at = excluded.updated_at`,
        )
        .run(input.recipeId, input.name, revision.version, input.createdAt);
      return ok(revision);
    });
  }

  async getRecipe(recipeId: string): Promise<Recipe | undefined> {
    const row = this.db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as
      RecipeRow | undefined;
    return row ? toRecipe(row) : undefined;
  }

  async listRecipes(): Promise<readonly Recipe[]> {
    const rows = this.db
      .prepare('SELECT * FROM recipes ORDER BY updated_at DESC')
      .all() as unknown as RecipeRow[];
    return rows.map(toRecipe);
  }

  async getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>> {
    const row = this.db
      .prepare('SELECT schema_version, document FROM revisions WHERE recipe_id = ? AND version = ?')
      .get(recipeId, version) as { schema_version: number; document: string } | undefined;
    if (!row) return ok(undefined);
    if (row.schema_version > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Revision schema ${row.schema_version} is not supported`,
          {
            schemaVersion: row.schema_version,
          },
        ),
      );
    }
    const { schemaVersion, ...revision } = JSON.parse(row.document) as Revision & {
      schemaVersion: number;
    };
    return ok(revision);
  }
}

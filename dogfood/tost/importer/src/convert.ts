import {
  decodeRecipeFile,
  type RecipeFile,
} from '../../../../packages/core/dist/application/index.js';
import type { Instant } from '../../../../packages/core/dist/domain/index.js';
import { FIELDS } from './fields.js';
import { parseTostExport } from './legacy.js';
import { migrateRecipe, MigrationError, type Decisions, type RecipeReport } from './migrate.js';

export interface Conversion {
  readonly file: RecipeFile;
  readonly reports: readonly RecipeReport[];
}

const order = (id: string) => Number(id.replace(/\D/g, ''));

/** Legacy export → intermediate representation → migration → recipe file checked by the app. */
export const convert = (text: string, decisions: Decisions): Conversion => {
  const tost = parseTostExport(text).sort((a, b) => order(a.id) - order(b.id));
  for (const recipe of tost) {
    const unknown = Object.keys(recipe.raw).filter((key) => !(key in FIELDS));
    if (unknown.length > 0) {
      throw new MigrationError(`${recipe.id}: unclassified fields ${unknown.join(', ')}`);
    }
  }
  const migrated = tost.map((recipe) => migrateRecipe(recipe, decisions));
  const used = new Set(migrated.map((m) => m.recipe.familyId));
  const file: RecipeFile = {
    kind: 'flourprint-recipes',
    schemaVersion: 1,
    exportedAt: decisions.source.exportedAt as Instant,
    recipes: migrated.map((m) => m.recipe),
    families: decisions.families
      .filter((f) => used.has(f.id))
      .map((f) => ({ id: f.id, name: f.name })),
  };
  const decoded = decodeRecipeFile(JSON.parse(JSON.stringify(file)));
  if (!decoded.ok) throw new MigrationError(`The app refuses the file: ${decoded.error.message}`);
  return { file, reports: migrated.map((m) => m.report) };
};

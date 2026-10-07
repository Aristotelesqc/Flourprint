import { describe, it } from 'vitest';
import type { BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import { MemoryBakeEventStore, MemoryRecipeRepository } from '../src/memory/index.js';
import {
  openNodeSqlite,
  SqlBakeEventStore,
  SqlRecipeRepository,
} from '../src/sqlite-node/index.js';
import { bakeEventStoreChecks, recipeRepositoryChecks } from '../src/testing/index.js';

/** The shared store contract, run on every implementation available on Node. */
const sqlite = async () => {
  const db = await openNodeSqlite(':memory:');
  if (!db.ok) throw new Error(JSON.stringify(db.error));
  return db.value.driver;
};

const implementations: Array<
  [string, () => Promise<BakeEventStore>, () => Promise<RecipeRepository>]
> = [
  ['memory', async () => new MemoryBakeEventStore(), async () => new MemoryRecipeRepository()],
  [
    'sqlite-node',
    async () => new SqlBakeEventStore(await sqlite()),
    async () => new SqlRecipeRepository(await sqlite()),
  ],
];

describe.each(implementations)('%s store contract', (_name, makeBakes, makeRecipes) => {
  it.each(bakeEventStoreChecks)('bakes: $name', (check) => check.run(makeBakes));
  it.each(recipeRepositoryChecks)('recipes: $name', (check) => check.run(makeRecipes));
});

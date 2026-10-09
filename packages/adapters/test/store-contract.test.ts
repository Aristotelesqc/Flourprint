import { describe, it } from 'vitest';
import type { BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import { MemoryBakeEventStore, MemoryRecipeRepository } from '../src/memory/index.js';
import { openBridgeSqlite } from '../src/sqlite-bridge/index.js';
import {
  nodeSqliteBridge,
  openNodeDatabase,
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

/** The desktop driver: the bridge, answered in process by `node:sqlite` (ADR 0011). */
const bridged = async () => {
  const db = await openBridgeSqlite(nodeSqliteBridge(openNodeDatabase(':memory:')));
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
  [
    'sqlite-bridge',
    async () => new SqlBakeEventStore(await bridged()),
    async () => new SqlRecipeRepository(await bridged()),
  ],
];

describe.each(implementations)('%s store contract', (_name, makeBakes, makeRecipes) => {
  it.each(bakeEventStoreChecks)('bakes: $name', (check) => check.run(makeBakes));
  it.each(recipeRepositoryChecks)('recipes: $name', (check) => check.run(makeRecipes));
});

import { describe, it } from 'vitest';
import type {
  BakeEventStore,
  EquipmentRegistry,
  FlourRegistry,
  IngredientRegistry,
  RecipeRepository,
  ThermalProfileStore,
} from '@flourprint/core/application';
import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryIngredientRegistry,
  MemoryRecipeRepository,
  MemoryThermalProfileStore,
} from '../src/memory/index.js';
import { openBridgeSqlite } from '../src/sqlite-bridge/index.js';
import {
  nodeSqliteBridge,
  openNodeDatabase,
  openNodeSqlite,
  SqlBakeEventStore,
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlIngredientRegistry,
  SqlRecipeRepository,
  SqlThermalProfileStore,
} from '../src/sqlite-node/index.js';
import {
  bakeEventStoreChecks,
  equipmentRegistryChecks,
  flourRegistryChecks,
  ingredientRegistryChecks,
  recipeRepositoryChecks,
  thermalProfileStoreChecks,
} from '../src/testing/index.js';

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
  [
    string,
    () => Promise<BakeEventStore>,
    () => Promise<RecipeRepository>,
    () => Promise<FlourRegistry>,
    () => Promise<EquipmentRegistry>,
    () => Promise<IngredientRegistry>,
    () => Promise<ThermalProfileStore>,
  ]
> = [
  [
    'memory',
    async () => new MemoryBakeEventStore(),
    async () => new MemoryRecipeRepository(),
    async () => new MemoryFlourRegistry(),
    async () => new MemoryEquipmentRegistry(),
    async () => new MemoryIngredientRegistry(),
    async () => new MemoryThermalProfileStore(),
  ],
  [
    'sqlite-node',
    async () => new SqlBakeEventStore(await sqlite()),
    async () => new SqlRecipeRepository(await sqlite()),
    async () => new SqlFlourRegistry(await sqlite()),
    async () => new SqlEquipmentRegistry(await sqlite()),
    async () => new SqlIngredientRegistry(await sqlite()),
    async () => new SqlThermalProfileStore(await sqlite()),
  ],
  [
    'sqlite-bridge',
    async () => new SqlBakeEventStore(await bridged()),
    async () => new SqlRecipeRepository(await bridged()),
    async () => new SqlFlourRegistry(await bridged()),
    async () => new SqlEquipmentRegistry(await bridged()),
    async () => new SqlIngredientRegistry(await bridged()),
    async () => new SqlThermalProfileStore(await bridged()),
  ],
];

describe.each(implementations)(
  '%s store contract',
  (_name, makeBakes, makeRecipes, makeFlours, makeEquipment, makeIngredients, makeThermal) => {
    it.each(bakeEventStoreChecks)('bakes: $name', (check) => check.run(makeBakes));
    it.each(recipeRepositoryChecks)('recipes: $name', (check) => check.run(makeRecipes));
    it.each(flourRegistryChecks)('flours: $name', (check) => check.run(makeFlours));
    it.each(equipmentRegistryChecks)('equipment: $name', (check) => check.run(makeEquipment));
    it.each(ingredientRegistryChecks)('ingredients: $name', (check) => check.run(makeIngredients));
    it.each(thermalProfileStoreChecks)('thermal profile: $name', (check) => check.run(makeThermal));
  },
);

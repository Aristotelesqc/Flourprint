import { Capacitor } from '@capacitor/core';
import { createContext, useContext, type ReactNode } from 'react';
import type {
  BakeEventStore,
  Clock,
  IdGenerator,
  RecipeRepository,
} from '@flourprint/core/application';
import { saveRevision } from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import { MemoryBakeEventStore, MemoryRecipeRepository } from '@flourprint/adapters/memory';
import type { SqlBridge } from '@flourprint/adapters/sqlite-bridge';
import { sampleRecipe } from './seed';

/**
 * Composition root of the app (ADR 0001). On the device the stores are SQLite through Capacitor
 * (spike #24), in the desktop shell SQLite through its bridge (ADR 0011); in a browser they live
 * in memory and are lost on reload.
 */
export interface Services {
  readonly recipes: RecipeRepository;
  readonly bakes: BakeEventStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly storage: 'sqlite' | 'memory';
  /** SQLite library version, for the device checks page. */
  readonly sqliteVersion: () => Promise<string | undefined>;
}

const clock: Clock = { now: () => new Date().toISOString() as Instant };
const ids: IdGenerator = { next: () => crypto.randomUUID() };

const seedIfEmpty = async (recipes: RecipeRepository): Promise<void> => {
  if ((await recipes.listRecipes()).length > 0) return;
  await saveRevision(recipes, {
    recipeId: sampleRecipe.id,
    name: sampleRecipe.name,
    expectedHead: 0,
    formula: sampleRecipe.formula,
    process: sampleRecipe.process,
    createdAt: clock.now(),
  });
};

/** The SQLite bridge the desktop shell exposes (ADR 0011); absent in a browser and on Android. */
const desktopBridge = (): SqlBridge | undefined => {
  const candidate = (window as { flourprintDesktop?: { sql?: unknown } }).flourprintDesktop?.sql;
  return typeof candidate === 'function' ? { call: candidate as SqlBridge['call'] } : undefined;
};

export const createServices = async (): Promise<Services> => {
  if (Capacitor.isNativePlatform()) {
    const { openCapacitorSqlite, SqlBakeEventStore, SqlRecipeRepository } =
      await import('@flourprint/adapters/sqlite-capacitor');
    const db = await openCapacitorSqlite('flourprint');
    if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
    const recipes = new SqlRecipeRepository(db.value.driver);
    await seedIfEmpty(recipes);
    return {
      recipes,
      bakes: new SqlBakeEventStore(db.value.driver),
      clock,
      ids,
      storage: 'sqlite',
      sqliteVersion: async () =>
        (await db.value.driver.query<{ v: string }>('SELECT sqlite_version() AS v'))[0]?.v,
    };
  }
  const desktop = desktopBridge();
  if (desktop) {
    const { openBridgeSqlite, SqlBakeEventStore, SqlRecipeRepository } =
      await import('@flourprint/adapters/sqlite-bridge');
    const db = await openBridgeSqlite(desktop);
    if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
    const recipes = new SqlRecipeRepository(db.value.driver);
    await seedIfEmpty(recipes);
    return {
      recipes,
      bakes: new SqlBakeEventStore(db.value.driver),
      clock,
      ids,
      storage: 'sqlite',
      sqliteVersion: async () =>
        (await db.value.driver.query<{ v: string }>('SELECT sqlite_version() AS v'))[0]?.v,
    };
  }
  const recipes = new MemoryRecipeRepository();
  await seedIfEmpty(recipes);
  return {
    recipes,
    bakes: new MemoryBakeEventStore(),
    clock,
    ids,
    storage: 'memory',
    sqliteVersion: async () => undefined,
  };
};

const ServicesContext = createContext<Services | undefined>(undefined);

export const ServicesProvider = ({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) => <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;

export const useServices = (): Services => {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('ServicesProvider is missing');
  return services;
};

import { Capacitor } from '@capacitor/core';
import { createContext, useContext, type ReactNode } from 'react';
import type {
  BakeEventStore,
  Clock,
  EquipmentRegistry,
  FlourRegistry,
  IdGenerator,
  RecipeRepository,
} from '@flourprint/core/application';
import { saveRevision } from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
} from '@flourprint/adapters/memory';
import type { SqlBridge } from '@flourprint/adapters/sqlite-bridge';
import {
  browserSnapshotAvailable,
  clearBrowserSnapshot,
  keepBrowserSnapshot,
  restoreBrowserSnapshot,
  type SnapshotLoad,
} from './browser-snapshot';
import { createNotifier, type Notifier } from './notifications';
import { createPreferences, currentWorld, worldClock, type PreferenceStore } from './preferences';
import { sampleRecipe } from './seed';
import { worldBakes, type WorldBakeStore } from './world-bakes';

/**
 * Composition root of the app (ADR 0001). On the device the stores are SQLite through Capacitor
 * (spike #24), in the desktop shell SQLite through its bridge (ADR 0011); in a browser they live
 * in memory, kept across reloads by a snapshot in IndexedDB (ADR 0015).
 */
export interface Services {
  readonly recipes: RecipeRepository;
  /** The bakes of the current world only, real or simulated (ADR 0014). */
  readonly bakes: WorldBakeStore;
  /** Every bake of both worlds: backups, the browser snapshot and the feedback export. */
  readonly allBakes: BakeEventStore;
  /** Personal flour entries (flours.md); built-in entries are code. */
  readonly flours: FlourRegistry;
  /** Personal equipment entries (equipment.md); built-in entries are code. */
  readonly equipment: EquipmentRegistry;
  /** The clock of the current world: the real one plus the offset in simulation (ADR 0014). */
  readonly clock: Clock;
  /** The real clock, for what both worlds share: recipes, drafts, flours, exports. */
  readonly realClock: Clock;
  /** Device preferences: simulation mode, its offset, temperature units. */
  readonly preferences: PreferenceStore;
  readonly ids: IdGenerator;
  readonly storage: 'sqlite' | 'memory';
  /** Where the app runs: the phone, the PC shell (ADR 0011) or a plain browser. */
  readonly platform: 'android' | 'desktop' | 'web';
  /** Reminders of running bakes (ADR 0012). */
  readonly notifier: Notifier;
  /** SQLite library version, for the device checks page. */
  readonly sqliteVersion: () => Promise<string | undefined>;
  /** Browser only (ADR 0015): what the start-up restore found, and erasing the saved data. */
  readonly browserData?: {
    readonly loaded: SnapshotLoad;
    readonly erase: () => Promise<void>;
    /** Saves the browser snapshot now; false when it could not be saved. */
    readonly flush: () => Promise<boolean>;
  };
}

const PLATFORM = Capacitor.getPlatform() === 'android' ? 'android' : 'web';
const realClock: Clock = { now: () => new Date().toISOString() as Instant };
const ids: IdGenerator = { next: () => crypto.randomUUID() };

const seedIfEmpty = async (recipes: RecipeRepository): Promise<void> => {
  if ((await recipes.listRecipes()).length > 0) return;
  await saveRevision(recipes, {
    recipeId: sampleRecipe.id,
    name: sampleRecipe.name,
    expectedHead: 0,
    formula: sampleRecipe.formula,
    process: sampleRecipe.process,
    createdAt: realClock.now(),
  });
};

/** What every platform shares around its stores: the preferences, the world view and clocks. */
const worlds = (bakes: BakeEventStore) => {
  const preferences = createPreferences();
  return {
    bakes: worldBakes(bakes, () => currentWorld(preferences.get())),
    allBakes: bakes,
    clock: worldClock(preferences, realClock),
    realClock,
    preferences,
  };
};

/** The SQLite bridge the desktop shell exposes (ADR 0011); absent in a browser and on Android. */
const desktopBridge = (): SqlBridge | undefined => {
  const candidate = (window as { flourprintDesktop?: { sql?: unknown } }).flourprintDesktop?.sql;
  return typeof candidate === 'function' ? { call: candidate as SqlBridge['call'] } : undefined;
};

export const createServices = async (options: {
  /** Name of the Android notification channel, in the device language. */
  readonly reminderChannel: string;
}): Promise<Services> => {
  const notifier = createNotifier(options.reminderChannel);
  if (Capacitor.isNativePlatform()) {
    const {
      openCapacitorSqlite,
      SqlBakeEventStore,
      SqlEquipmentRegistry,
      SqlFlourRegistry,
      SqlRecipeRepository,
    } = await import('@flourprint/adapters/sqlite-capacitor');
    const db = await openCapacitorSqlite('flourprint');
    if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
    const recipes = new SqlRecipeRepository(db.value.driver);
    await seedIfEmpty(recipes);
    return {
      recipes,
      ...worlds(new SqlBakeEventStore(db.value.driver)),
      flours: new SqlFlourRegistry(db.value.driver),
      equipment: new SqlEquipmentRegistry(db.value.driver),
      ids,
      storage: 'sqlite',
      platform: PLATFORM,
      notifier,
      sqliteVersion: async () =>
        (await db.value.driver.query<{ v: string }>('SELECT sqlite_version() AS v'))[0]?.v,
    };
  }
  const desktop = desktopBridge();
  if (desktop) {
    const {
      openBridgeSqlite,
      SqlBakeEventStore,
      SqlEquipmentRegistry,
      SqlFlourRegistry,
      SqlRecipeRepository,
    } = await import('@flourprint/adapters/sqlite-bridge');
    const db = await openBridgeSqlite(desktop);
    if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
    const recipes = new SqlRecipeRepository(db.value.driver);
    await seedIfEmpty(recipes);
    return {
      recipes,
      ...worlds(new SqlBakeEventStore(db.value.driver)),
      flours: new SqlFlourRegistry(db.value.driver),
      equipment: new SqlEquipmentRegistry(db.value.driver),
      ids,
      storage: 'sqlite',
      platform: 'desktop',
      notifier,
      sqliteVersion: async () =>
        (await db.value.driver.query<{ v: string }>('SELECT sqlite_version() AS v'))[0]?.v,
    };
  }
  const recipes = new MemoryRecipeRepository();
  const bakes = new MemoryBakeEventStore();
  const flours = new MemoryFlourRegistry();
  const equipment = new MemoryEquipmentRegistry();
  let browserData: Services['browserData'];
  if (browserSnapshotAvailable()) {
    const loaded = await restoreBrowserSnapshot(
      new MemoryRestoreTarget(recipes, bakes, flours, equipment),
    );
    await seedIfEmpty(recipes);
    const keeper = keepBrowserSnapshot({ recipes, bakes, flours, equipment }, realClock.now);
    browserData = {
      loaded,
      erase: async () => {
        keeper.stop();
        await clearBrowserSnapshot();
      },
      flush: keeper.flush,
    };
  } else {
    await seedIfEmpty(recipes);
  }
  return {
    recipes,
    ...worlds(bakes),
    flours,
    equipment,
    ids,
    storage: 'memory',
    platform: 'web',
    notifier,
    sqliteVersion: async () => undefined,
    ...(browserData ? { browserData } : {}),
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

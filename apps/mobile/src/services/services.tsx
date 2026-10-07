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
import { sampleRecipe } from './seed';

/**
 * Composition root of the app (ADR 0001). In the browser the memory adapters are used: data is
 * lost on reload. The Capacitor SQLite adapter replaces them after spike #24.
 */
export interface Services {
  readonly recipes: RecipeRepository;
  readonly bakes: BakeEventStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export const createBrowserServices = async (): Promise<Services> => {
  const clock: Clock = { now: () => new Date().toISOString() as Instant };
  const services: Services = {
    recipes: new MemoryRecipeRepository(),
    bakes: new MemoryBakeEventStore(),
    clock,
    ids: { next: () => crypto.randomUUID() },
  };
  await saveRevision(services.recipes, {
    recipeId: sampleRecipe.id,
    name: sampleRecipe.name,
    expectedHead: 0,
    formula: sampleRecipe.formula,
    process: sampleRecipe.process,
    createdAt: clock.now(),
  });
  return services;
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

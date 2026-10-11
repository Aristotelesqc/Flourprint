import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BUILT_IN_FLOURS, type FlourEntry } from '@flourprint/core/domain';
import { useServices } from './services';

/**
 * The flour registry as the screens see it (flours.md): built-in entries (code) and the latest
 * version of each personal entry, archived ones included. Reloaded after every write.
 */
export interface FlourCatalog {
  /** Latest version of each personal entry, archived ones included. */
  readonly personal: readonly FlourEntry[];
  /** The entry a formula flour id refers to, if any. */
  readonly entry: (id: string) => FlourEntry | undefined;
  readonly reload: () => Promise<void>;
}

const builtIns = new Map(BUILT_IN_FLOURS.map((entry) => [entry.id, entry]));

const catalogOf = (personal: readonly FlourEntry[], reload: () => Promise<void>): FlourCatalog => {
  const byId = new Map(personal.map((entry) => [entry.id, entry]));
  return { personal, entry: (id) => byId.get(id) ?? builtIns.get(id), reload };
};

const FlourContext = createContext<FlourCatalog>(catalogOf([], async () => undefined));

export const FlourCatalogProvider = ({ children }: { children: ReactNode }) => {
  const { flours } = useServices();
  const [personal, setPersonal] = useState<readonly FlourEntry[]>([]);
  const reload = useCallback(async () => {
    try {
      setPersonal(await flours.listFlours());
    } catch (error) {
      // Names fall back to the ids; the flours screen reports its own read failures.
      console.error(error);
    }
  }, [flours]);
  useEffect(() => void reload(), [reload]);
  const value = useMemo(() => catalogOf(personal, reload), [personal, reload]);
  return <FlourContext.Provider value={value}>{children}</FlourContext.Provider>;
};

export const useFlourCatalog = (): FlourCatalog => useContext(FlourContext);

/**
 * A new personal flour id: readable (from the name) and unique, never a built-in id. Formulas
 * refer to flours by id only (formula.md), so a readable id still says something without the
 * registry.
 */
export const newFlourId = (name: string, random: string, taken: (id: string) => boolean) => {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'flour';
  const suffix = random.replace(/[^a-z0-9]/gi, '').toLowerCase();
  for (let length = 4; length <= suffix.length; length++) {
    const id = `${slug}-${suffix.slice(0, length)}`;
    if (!taken(id)) return id;
  }
  return `${slug}-${suffix}`;
};

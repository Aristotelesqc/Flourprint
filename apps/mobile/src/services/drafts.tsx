import { createContext, useContext, useRef, type ReactNode } from 'react';
import type { Formula, Process } from '@flourprint/core/domain';

export interface RecipeDraft {
  readonly formula: Formula;
  readonly process: Process;
}

/**
 * Draft policy (#23): an unsaved formula or process edit survives navigation inside the app (going back to
 * the list and returning keeps it) but not closing the app. Saving creates a revision; nothing
 * else persists a draft.
 */
export interface Drafts {
  get(recipeId: string, baseVersion: number): RecipeDraft | undefined;
  set(recipeId: string, baseVersion: number, draft: RecipeDraft): void;
  clear(recipeId: string): void;
}

const DraftsContext = createContext<Drafts | undefined>(undefined);

export const DraftsProvider = ({ children }: { children: ReactNode }) => {
  const store = useRef(new Map<string, { baseVersion: number; draft: RecipeDraft }>());
  const drafts: Drafts = {
    get: (recipeId, baseVersion) => {
      const draft = store.current.get(recipeId);
      return draft?.baseVersion === baseVersion ? draft.draft : undefined;
    },
    set: (recipeId, baseVersion, draft) => store.current.set(recipeId, { baseVersion, draft }),
    clear: (recipeId) => store.current.delete(recipeId),
  };
  return <DraftsContext.Provider value={drafts}>{children}</DraftsContext.Provider>;
};

export const useDrafts = (): Drafts => {
  const drafts = useContext(DraftsContext);
  if (!drafts) throw new Error('DraftsProvider is missing');
  return drafts;
};

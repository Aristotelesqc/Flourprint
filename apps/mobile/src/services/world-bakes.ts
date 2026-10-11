import { bakeWorld, type BakeEventStore } from '@flourprint/core/application';
import type { BakeOrigin, BakeSummary } from '@flourprint/core/domain';

/** The bake store as one world sees it, plus what the erase actions need (ADR 0014). */
export interface WorldBakeStore extends BakeEventStore {
  /** Summaries of the bakes of one world, whichever is current. */
  listBakesOf(world: BakeOrigin): Promise<readonly BakeSummary[]>;
}

/**
 * The one place where the two worlds are kept apart (ADR 0014): every screen, reminders and
 * statistics read bakes through this view, which shows only the bakes of the current world. A
 * bake's world comes from its BakeStarted snapshot (history.md); a bake without `origin` counts as
 * real. Summaries do not carry the origin (persistence.md), so it is read once per bake and kept:
 * it never changes after the start.
 */
export const worldBakes = (store: BakeEventStore, world: () => BakeOrigin): WorldBakeStore => {
  const worlds = new Map<string, BakeOrigin>();
  const worldOf = async (bakeId: string): Promise<BakeOrigin> => {
    const known = worlds.get(bakeId);
    if (known) return known;
    const events = await store.loadEvents(bakeId);
    const found = bakeWorld(events);
    // A bake with no event yet has no world to remember.
    if (events.length > 0) worlds.set(bakeId, found);
    return found;
  };
  const listBakesOf = async (target: BakeOrigin) => {
    const summaries = await store.listBakes();
    const kept = await Promise.all(
      summaries.map(async (s) => ((await worldOf(s.bakeId)) === target ? [s] : [])),
    );
    return kept.flat();
  };
  return {
    findCommand: (commandId) => store.findCommand(commandId),
    // A bake of the other world reads as absent: bake mode never shows it.
    loadEvents: async (bakeId) => {
      const events = await store.loadEvents(bakeId);
      if (events.length === 0) return events;
      worlds.set(bakeId, bakeWorld(events));
      return bakeWorld(events) === world() ? events : [];
    },
    append: async (input) => {
      const result = await store.append(input);
      if (result.ok && input.events.some((e) => e.payload.type === 'BakeStarted')) {
        worlds.set(input.command.bakeId, bakeWorld(input.events));
      }
      return result;
    },
    listBakes: () => listBakesOf(world()),
    listBakesOf,
    deleteBakes: async (origin) => {
      const deleted = await store.deleteBakes(origin);
      worlds.clear();
      return deleted;
    },
  };
};

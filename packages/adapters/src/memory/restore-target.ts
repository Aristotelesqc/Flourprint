import type { RestoreError, RestorePlan, RestoreTarget } from '@flourprint/core/application';
import { domainError, err, ok, type Result } from '@flourprint/core/domain';
import type { MemoryBakeEventStore } from './bake-event-store.js';
import type { MemoryFlourRegistry } from './flour-registry.js';
import type { MemoryRecipeRepository } from './recipe-repository.js';

/**
 * Restores into memory stores atomically: every check runs first, then every write happens
 * synchronously, so a failure leaves both stores untouched.
 */
export class MemoryRestoreTarget implements RestoreTarget {
  constructor(
    private readonly recipes: MemoryRecipeRepository,
    private readonly bakes: MemoryBakeEventStore,
    private readonly flours: MemoryFlourRegistry,
  ) {}

  async restore(plan: RestorePlan): Promise<Result<void, RestoreError>> {
    if (!this.recipes.isEmpty || !this.bakes.isEmpty || !this.flours.isEmpty) {
      return err(
        domainError('TargetNotEmpty', 'Backups are restored into an empty database', undefined),
      );
    }
    const eventIds = new Set<string>();
    for (const bake of plan.bakes) {
      this.bakes.check(bake);
      for (const event of bake.events) {
        if (eventIds.has(event.eventId)) throw new Error(`Duplicate event id ${event.eventId}`);
        eventIds.add(event.eventId);
      }
    }
    for (const family of plan.families) this.recipes.writeFamily(family);
    for (const recipe of plan.recipes) this.recipes.write(recipe);
    for (const draft of plan.drafts ?? []) this.recipes.restoreDraft(draft);
    for (const entry of plan.flours ?? []) this.flours.write(entry);
    for (const bake of plan.bakes) this.bakes.write(bake);
    return ok(undefined);
  }
}

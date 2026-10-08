import type { RestorePlan, RestoreError, RestoreTarget } from '@flourprint/core/application';
import { domainError, err, ok, type Result } from '@flourprint/core/domain';
import { writeAppend } from './bake-event-store.js';
import type { SqlDriver } from './driver.js';
import { insertFamily, insertRecipe } from './recipe-repository.js';

/**
 * Restores a checked backup plan in one transaction (persistence.md): the emptiness check and
 * every write commit together, or a failure rolls everything back.
 */
export class SqlRestoreTarget implements RestoreTarget {
  constructor(private readonly driver: SqlDriver) {}

  restore(plan: RestorePlan): Promise<Result<void, RestoreError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ n: number }>(
        'SELECT (SELECT COUNT(*) FROM recipes) + (SELECT COUNT(*) FROM bakes) AS n',
      );
      if (Number(row?.n ?? 0) > 0) {
        return err(
          domainError('TargetNotEmpty', 'Backups are restored into an empty database', undefined),
        );
      }
      for (const family of plan.families) await insertFamily(tx, family);
      for (const recipe of plan.recipes) await insertRecipe(tx, recipe);
      for (const bake of plan.bakes) await writeAppend(tx, bake);
      return ok(undefined);
    });
  }
}

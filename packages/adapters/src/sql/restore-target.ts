import type { RestorePlan, RestoreError, RestoreTarget } from '@flourprint/core/application';
import { domainError, err, ok, type Result } from '@flourprint/core/domain';
import { writeAppend } from './bake-event-store.js';
import type { SqlDriver } from './driver.js';
import { insertRevision } from './recipe-repository.js';

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
      for (const recipe of plan.recipes) {
        for (const revision of recipe.revisions) await insertRevision(tx, recipe.name, revision);
      }
      for (const bake of plan.bakes) await writeAppend(tx, bake);
      return ok(undefined);
    });
  }
}

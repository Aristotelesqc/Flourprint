import {
  bakeSummary,
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  replayBake,
  resolveFormula,
  validateProcess,
  type BakeEvent,
  type DomainError,
  type Instant,
  type Result,
  type Revision,
} from '../domain/index.js';
import type { BakeEventStore, RecipeRepository } from './ports.js';

/** Full backup document (docs/contracts/history.md, persistence.md). */
export interface Backup {
  readonly kind: 'flourprint-backup';
  readonly schemaVersion: number;
  readonly exportedAt: Instant;
  readonly recipes: readonly {
    readonly id: string;
    readonly name: string;
    readonly revisions: readonly Revision[];
  }[];
  readonly bakes: readonly { readonly bakeId: string; readonly events: readonly BakeEvent[] }[];
}

export interface BackupStores {
  readonly recipes: RecipeRepository;
  readonly bakes: BakeEventStore;
}

export type BackupError =
  | DomainError<'InvalidBackup', { reason: string }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>
  | DomainError<'TargetNotEmpty'>;

const invalid = (reason: string): BackupError =>
  domainError('InvalidBackup', `Invalid backup: ${reason}`, { reason });

/** Exports every recipe revision and every bake event log. */
export const exportBackup = async (
  stores: BackupStores,
  exportedAt: Instant,
): Promise<Result<Backup, BackupError>> => {
  const recipes: Backup['recipes'][number][] = [];
  for (const recipe of await stores.recipes.listRecipes()) {
    const revisions: Revision[] = [];
    for (let version = 1; version <= recipe.headVersion; version++) {
      const revision = await stores.recipes.getRevision(recipe.id, version);
      if (!revision.ok) return err(revision.error as BackupError);
      if (!revision.value) return err(invalid(`missing revision ${recipe.id}@${version}`));
      revisions.push(revision.value);
    }
    recipes.push({ id: recipe.id, name: recipe.name, revisions });
  }
  const bakes: Backup['bakes'][number][] = [];
  for (const summary of await stores.bakes.listBakes()) {
    bakes.push({ bakeId: summary.bakeId, events: await stores.bakes.loadEvents(summary.bakeId) });
  }
  return ok({
    kind: 'flourprint-backup',
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    exportedAt,
    recipes,
    bakes,
  });
};

/**
 * Restores a backup into empty stores. Revisions keep their versions and dates; bake logs are
 * written as they were recorded, so history reads exactly as before (no recomputation).
 */
export const importBackup = async (
  stores: BackupStores,
  backup: Backup,
): Promise<Result<void, BackupError>> => {
  if (backup.kind !== 'flourprint-backup') return err(invalid('not a Flourprint backup'));
  if (backup.schemaVersion > DOCUMENT_SCHEMA_VERSION) {
    return err(
      domainError(
        'UnsupportedDocumentVersion',
        `Backup schema ${backup.schemaVersion} is not supported`,
        {
          schemaVersion: backup.schemaVersion,
        },
      ),
    );
  }
  if (
    (await stores.recipes.listRecipes()).length > 0 ||
    (await stores.bakes.listBakes()).length > 0
  ) {
    return err(
      domainError('TargetNotEmpty', 'Backups are restored into an empty database', undefined),
    );
  }

  for (const recipe of backup.recipes) {
    for (const [index, revision] of recipe.revisions.entries()) {
      if (revision.version !== index + 1 || revision.recipeId !== recipe.id) {
        return err(invalid(`revisions of ${recipe.id} are not numbered 1..n`));
      }
      if (!resolveFormula(revision.formula).ok || !validateProcess(revision.process).ok) {
        return err(invalid(`revision ${recipe.id}@${revision.version} is not valid`));
      }
      const saved = await stores.recipes.saveRevision({
        recipeId: recipe.id,
        name: recipe.name,
        expectedHead: index,
        formula: revision.formula,
        process: revision.process,
        createdAt: revision.createdAt,
        ...(revision.note === undefined ? {} : { note: revision.note }),
      });
      if (!saved.ok) return err(invalid(saved.error.message));
    }
  }

  for (const bake of backup.bakes) {
    const events = bake.events;
    if (events.some((event, index) => event.bakeId !== bake.bakeId || event.seq !== index + 1)) {
      return err(invalid(`events of ${bake.bakeId} are not numbered 1..n`));
    }
    const last = events.at(-1);
    if (!last) continue;
    const appended = await stores.bakes.append({
      command: { commandId: `import:${bake.bakeId}`, bakeId: bake.bakeId, content: 'import' },
      expectedVersion: 0,
      events,
      summary: bakeSummary(replayBake(bake.bakeId, events), last.recordedAt),
    });
    if (!appended.ok) return err(invalid(appended.error.message));
  }
  return ok(undefined);
};

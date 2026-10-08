import {
  bakeSummary,
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  isReservedId,
  ok,
  parseInstant,
  replayBake,
  upcastEvent,
  validateRecipe,
  type BakeEvent,
  type DomainError,
  type Formula,
  type Instant,
  type Process,
  type Result,
  type Revision,
} from '../domain/index.js';
import type {
  AppendInput,
  BakeEventStore,
  RecipeRepository,
  RestorePlan,
  RestoreTarget,
} from './ports.js';

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
  | DomainError<'UnsupportedEventVersion', { eventId: string; schemaVersion: number }>
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

// Decoding helpers: the backup is untrusted JSON until every field below has been checked.

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && !isReservedId(value);
const isInstant = (value: unknown): value is Instant =>
  typeof value === 'string' && parseInstant(value).ok;
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

class Refused extends Error {
  constructor(readonly error: BackupError) {
    super(error.message);
  }
}
const refuse = (reason: string): never => {
  throw new Refused(invalid(reason));
};

const decodeRevision = (recipeId: string, index: number, value: unknown): Revision => {
  const where = `revision ${recipeId}@${index + 1}`;
  if (!isObject(value)) return refuse(`${where} is not an object`);
  if (value.recipeId !== recipeId || value.version !== index + 1) {
    return refuse(`revisions of ${recipeId} are not numbered 1..n`);
  }
  if (!isInstant(value.createdAt)) return refuse(`${where} has no valid createdAt`);
  if (value.note !== undefined && typeof value.note !== 'string') {
    return refuse(`${where} has an invalid note`);
  }
  let valid: ReturnType<typeof validateRecipe>;
  try {
    valid = validateRecipe(value.formula as Formula, value.process as Process);
  } catch {
    return refuse(`${where} is malformed`);
  }
  if (!valid.ok) return refuse(`${where} is not valid: ${valid.error.code}`);
  return {
    recipeId,
    version: index + 1,
    formula: value.formula as Formula,
    process: value.process as Process,
    createdAt: value.createdAt,
    ...(value.note === undefined ? {} : { note: value.note }),
  };
};

const decodeEvent = (bakeId: string, index: number, value: unknown): BakeEvent => {
  const where = `event ${index + 1} of ${bakeId}`;
  if (!isObject(value)) return refuse(`${where} is not an object`);
  if (value.bakeId !== bakeId || value.seq !== index + 1) {
    return refuse(`events of ${bakeId} are not numbered 1..n`);
  }
  if (!isId(value.eventId) || typeof value.causationId !== 'string') {
    return refuse(`${where} has invalid identifiers`);
  }
  if (!isInstant(value.occurredAt) || !isInstant(value.recordedAt)) {
    return refuse(`${where} has invalid times`);
  }
  if (!isCount(value.schemaVersion)) return refuse(`${where} has no schema version`);
  if (!isObject(value.payload) || typeof value.payload.type !== 'string') {
    return refuse(`${where} has no payload`);
  }
  const upcast = upcastEvent(value as unknown as BakeEvent);
  if (!upcast.ok) throw new Refused(upcast.error);
  return upcast.value;
};

/**
 * Decodes and checks a whole backup before anything is written (persistence.md): versions,
 * identifiers, numbering, formula/process consistency, event envelopes and references.
 */
export const decodeBackup = (input: unknown): Result<RestorePlan, BackupError> => {
  try {
    if (!isObject(input) || input.kind !== 'flourprint-backup') {
      return err(invalid('not a Flourprint backup'));
    }
    const { schemaVersion } = input;
    if (!isCount(schemaVersion)) return err(invalid('missing schema version'));
    if (schemaVersion > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Backup schema ${schemaVersion} is not supported`,
          {
            schemaVersion,
          },
        ),
      );
    }
    if (!isInstant(input.exportedAt)) return err(invalid('no valid exportedAt'));
    if (!Array.isArray(input.recipes) || !Array.isArray(input.bakes)) {
      return err(invalid('recipes and bakes must be lists'));
    }

    const recipes: RestorePlan['recipes'][number][] = [];
    const recipeIds = new Set<string>();
    for (const recipe of input.recipes as unknown[]) {
      if (!isObject(recipe) || !isId(recipe.id) || typeof recipe.name !== 'string') {
        return err(invalid('a recipe has no valid id or name'));
      }
      if (recipeIds.has(recipe.id)) return err(invalid(`duplicate recipe ${recipe.id}`));
      recipeIds.add(recipe.id);
      if (!Array.isArray(recipe.revisions) || recipe.revisions.length === 0) {
        return err(invalid(`recipe ${recipe.id} has no revision`));
      }
      const id = recipe.id;
      recipes.push({
        id,
        name: recipe.name,
        revisions: (recipe.revisions as unknown[]).map((r, i) => decodeRevision(id, i, r)),
      });
    }

    const bakes: AppendInput[] = [];
    const bakeIds = new Set<string>();
    const eventIds = new Set<string>();
    for (const bake of input.bakes as unknown[]) {
      if (!isObject(bake) || !isId(bake.bakeId) || !Array.isArray(bake.events)) {
        return err(invalid('a bake has no valid id or events'));
      }
      const bakeId = bake.bakeId;
      if (bakeIds.has(bakeId)) return err(invalid(`duplicate bake ${bakeId}`));
      bakeIds.add(bakeId);
      const events = (bake.events as unknown[]).map((e, i) => decodeEvent(bakeId, i, e));
      for (const event of events) {
        if (eventIds.has(event.eventId)) return err(invalid(`duplicate event ${event.eventId}`));
        eventIds.add(event.eventId);
      }
      const last = events.at(-1);
      if (!last) continue;
      const state = replayBake(bakeId, events);
      const ref = state.snapshot?.revisions.formula;
      const recipe = ref && recipes.find((r) => r.id === ref.id);
      if (ref && !recipe?.revisions.some((r) => r.version === ref.version)) {
        return err(invalid(`bake ${bakeId} refers to a revision missing from the backup`));
      }
      bakes.push({
        command: { commandId: `import:${bakeId}`, bakeId, content: 'import' },
        expectedVersion: 0,
        events,
        summary: bakeSummary(state, last.recordedAt),
      });
    }
    return ok({ recipes, bakes });
  } catch (error) {
    if (error instanceof Refused) return err(error.error);
    return err(invalid('malformed content'));
  }
};

/**
 * Restores a backup into an empty target, atomically. Revisions keep their versions and dates;
 * bake logs are written as they were recorded, so history reads exactly as before.
 */
export const importBackup = async (
  target: RestoreTarget,
  input: unknown,
): Promise<Result<void, BackupError>> => {
  const plan = decodeBackup(input);
  if (!plan.ok) return plan;
  return target.restore(plan.value);
};

import {
  bakeSummary,
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  upcastEvent,
  validateRecipe,
  type BakeEvent,
  type DomainError,
  type Instant,
  type RecipeFamily,
  type Result,
  type Revision,
} from '../domain/index.js';
import { checkBakeLog } from './backup-events.js';
import { decodeFormula, decodeProcess } from './documents.js';
import { isCount, isId, isInstant, isObject, Refused, refuse } from './decode.js';
import type {
  AppendInput,
  BakeEventStore,
  RecipeRepository,
  RecordedRecipe,
  RestorePlan,
  RestoreTarget,
} from './ports.js';

/** Full backup document (docs/contracts/history.md, persistence.md). */
export interface Backup {
  readonly kind: 'flourprint-backup';
  readonly schemaVersion: number;
  readonly exportedAt: Instant;
  readonly recipes: readonly RecordedRecipe[];
  /** Optional so that backups written before families still restore. */
  readonly families?: readonly RecipeFamily[];
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

/** Every recipe with all its revisions, as recorded. */
export const recordedRecipes = async (
  repository: RecipeRepository,
): Promise<Result<RecordedRecipe[], BackupError>> => {
  const recipes: RecordedRecipe[] = [];
  for (const recipe of await repository.listRecipes()) {
    const revisions: Revision[] = [];
    for (let version = 1; version <= recipe.headVersion; version++) {
      const revision = await repository.getRevision(recipe.id, version);
      if (!revision.ok) return err(revision.error as BackupError);
      if (!revision.value) return err(invalid(`missing revision ${recipe.id}@${version}`));
      revisions.push(revision.value);
    }
    recipes.push({
      id: recipe.id,
      name: recipe.name,
      ...(recipe.familyId === undefined ? {} : { familyId: recipe.familyId }),
      revisions,
    });
  }
  return ok(recipes);
};

/** Exports every recipe revision, every family and every bake event log. */
export const exportBackup = async (
  stores: BackupStores,
  exportedAt: Instant,
): Promise<Result<Backup, BackupError>> => {
  const recipes = await recordedRecipes(stores.recipes);
  if (!recipes.ok) return recipes;
  const families = await stores.recipes.listFamilies();
  const bakes: Backup['bakes'][number][] = [];
  for (const summary of await stores.bakes.listBakes()) {
    bakes.push({ bakeId: summary.bakeId, events: await stores.bakes.loadEvents(summary.bakeId) });
  }
  return ok({
    kind: 'flourprint-backup',
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    exportedAt,
    recipes: recipes.value,
    families,
    bakes,
  });
};

/** A refusal that carries its own typed error (an unsupported event version). */
class RefusedWith extends Error {
  constructor(readonly error: BackupError) {
    super(error.message);
  }
}

export const decodeRevision = (recipeId: string, index: number, value: unknown): Revision => {
  const where = `revision ${recipeId}@${index + 1}`;
  if (!isObject(value)) return refuse(`${where} is not an object`);
  if (value.recipeId !== recipeId || value.version !== index + 1) {
    return refuse(`revisions of ${recipeId} are not numbered 1..n`);
  }
  if (!isInstant(value.createdAt)) return refuse(`${where} has no valid createdAt`);
  if (value.note !== undefined && typeof value.note !== 'string') {
    return refuse(`${where} has an invalid note`);
  }
  const formula = decodeFormula(value.formula, `${where} formula`);
  const process = decodeProcess(value.process, `${where} process`);
  const valid = validateRecipe(formula, process);
  if (!valid.ok) return refuse(`${where} is not valid: ${valid.error.code}`);
  return {
    recipeId,
    version: index + 1,
    formula,
    process,
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
  if (!upcast.ok) throw new RefusedWith(upcast.error);
  return upcast.value;
};

/**
 * Decodes recipes with their revisions and the families they refer to (backups and recipe
 * files). Throws `Refused` on the first problem.
 */
export const decodeRecipes = (
  recipeInput: unknown,
  familyInput: unknown,
): { recipes: RecordedRecipe[]; families: RecipeFamily[] } => {
  if (!Array.isArray(recipeInput) || !Array.isArray(familyInput)) {
    return refuse('recipes and families must be lists');
  }
  const families: RecipeFamily[] = [];
  for (const family of familyInput as unknown[]) {
    if (!isObject(family) || !isId(family.id) || typeof family.name !== 'string') {
      return refuse('a family has no valid id or name');
    }
    if (families.some((f) => f.id === family.id)) return refuse(`duplicate family ${family.id}`);
    if (family.pinnedRecipeId !== undefined && !isId(family.pinnedRecipeId)) {
      return refuse(`family ${family.id} has an invalid pin`);
    }
    families.push({
      id: family.id,
      name: family.name,
      ...(family.pinnedRecipeId === undefined ? {} : { pinnedRecipeId: family.pinnedRecipeId }),
    });
  }
  const recipes: RecordedRecipe[] = [];
  for (const recipe of recipeInput as unknown[]) {
    if (!isObject(recipe) || !isId(recipe.id) || typeof recipe.name !== 'string') {
      return refuse('a recipe has no valid id or name');
    }
    const id = recipe.id;
    if (recipes.some((r) => r.id === id)) return refuse(`duplicate recipe ${id}`);
    if (!Array.isArray(recipe.revisions) || recipe.revisions.length === 0) {
      return refuse(`recipe ${id} has no revision`);
    }
    const { familyId } = recipe;
    if (familyId !== undefined && !families.some((f) => f.id === familyId)) {
      return refuse(`recipe ${id} refers to a missing family`);
    }
    recipes.push({
      id,
      name: recipe.name,
      ...(typeof familyId === 'string' ? { familyId } : {}),
      revisions: (recipe.revisions as unknown[]).map((r, i) => decodeRevision(id, i, r)),
    });
  }
  for (const family of families) {
    const pin = family.pinnedRecipeId;
    if (pin !== undefined && !recipes.some((r) => r.id === pin && r.familyId === family.id)) {
      return refuse(`family ${family.id} pins a recipe that is not its variant`);
    }
  }
  return { recipes, families };
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

    const { recipes, families } = decodeRecipes(input.recipes, input.families ?? []);

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
      const state = checkBakeLog(bakeId, events);
      for (const ref of Object.values(state.snapshot?.revisions ?? {})) {
        const recipe = recipes.find((r) => r.id === ref.id);
        if (!recipe?.revisions.some((r) => r.version === ref.version)) {
          return err(invalid(`bake ${bakeId} refers to a revision missing from the backup`));
        }
      }
      bakes.push({
        command: { commandId: `import:${bakeId}`, bakeId, content: 'import' },
        expectedVersion: 0,
        events,
        summary: bakeSummary(state, last.recordedAt),
      });
    }
    return ok({ recipes, families, bakes });
  } catch (error) {
    if (error instanceof RefusedWith) return err(error.error);
    if (error instanceof Refused) return err(invalid(error.reason));
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

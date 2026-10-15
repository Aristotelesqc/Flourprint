import {
  bakeSummary,
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  upcastEvent,
  validateRecipe,
  builtInEquipment,
  builtInFlour,
  canonicalJson,
  type BakeEvent,
  type EquipmentEntry,
  type FlourEntry,
  type IngredientEntry,
  type DomainError,
  type Instant,
  type RecipeFamily,
  type Result,
  type Revision,
} from '../domain/index.js';
import { checkBakeLog } from './backup-events.js';
import { decodeFormula, decodeProcess } from './documents.js';
import { isCount, isId, isInstant, isObject, Refused, refuse } from './decode.js';
import { decodeDraft } from './drafts.js';
import { decodeEquipmentEntry } from './equipment.js';
import { decodeFlourEntry } from './flours.js';
import { decodeIngredientEntry } from './ingredients.js';
import type {
  AppendInput,
  Draft,
  BakeEventStore,
  EquipmentRegistry,
  FlourRegistry,
  IngredientRegistry,
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
  /** Optional so that backups written before drafts still restore (persistence.md). */
  readonly drafts?: readonly Draft[];
  /** Every personal flour entry version (flours.md); optional, so older backups still restore. */
  readonly flours?: readonly FlourEntry[];
  /** Every personal equipment entry version (equipment.md); optional, so older backups restore. */
  readonly equipment?: readonly EquipmentEntry[];
  /**
   * Every personal ingredient entry version, customizations included (ingredients.md); optional,
   * so older backups restore.
   */
  readonly ingredients?: readonly IngredientEntry[];
}

export interface BackupStores {
  readonly recipes: RecipeRepository;
  readonly bakes: BakeEventStore;
  readonly flours: FlourRegistry;
  readonly equipment: EquipmentRegistry;
  readonly ingredients: IngredientRegistry;
}

export type BackupError =
  | DomainError<'InvalidBackup', { reason: string }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>
  | DomainError<'UnsupportedEventVersion', { eventId: string; schemaVersion: number }>
  | DomainError<'TargetNotEmpty'>;

const invalid = (reason: string): BackupError =>
  domainError('InvalidBackup', `Invalid backup: ${reason}`, { reason });

/**
 * Every recipe with all its revisions, as recorded. Recipes in the trash are included only when
 * `withTrash` is set (full backups); a recipes file never carries them (persistence.md).
 */
export const recordedRecipes = async (
  repository: RecipeRepository,
  options: { readonly withTrash?: boolean } = {},
): Promise<Result<RecordedRecipe[], BackupError>> => {
  const recipes: RecordedRecipe[] = [];
  const listed = [
    ...(await repository.listRecipes()),
    ...(options.withTrash ? await repository.listTrash() : []),
  ];
  for (const recipe of listed) {
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
      ...(recipe.trashedAt === undefined ? {} : { trashedAt: recipe.trashedAt }),
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
  const recipes = await recordedRecipes(stores.recipes, { withTrash: true });
  if (!recipes.ok) return recipes;
  const families = await stores.recipes.listFamilies({ all: true });
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
    drafts: await stores.recipes.listDrafts(),
    flours: await stores.flours.listFlourVersions(),
    equipment: await stores.equipment.listEquipmentVersions(),
    ingredients: await stores.ingredients.listIngredientVersions(),
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
    const { familyId, trashedAt } = recipe;
    if (trashedAt !== undefined && !isInstant(trashedAt)) {
      return refuse(`recipe ${id} has an invalid trashedAt`);
    }
    if (familyId !== undefined && !families.some((f) => f.id === familyId)) {
      return refuse(`recipe ${id} refers to a missing family`);
    }
    recipes.push({
      id,
      name: recipe.name,
      ...(typeof familyId === 'string' ? { familyId } : {}),
      ...(trashedAt === undefined ? {} : { trashedAt }),
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

/** Personal flour entries: each one valid, versions of an id numbered 1..n (flours.md). */
const decodeFlours = (input: readonly unknown[]): FlourEntry[] => {
  const flours = input.map((value, i) => decodeFlourEntry(value, `flour ${i + 1}`));
  const versions = new Map<string, number[]>();
  for (const entry of flours) {
    if (entry.builtIn) return refuse(`flour ${entry.id} is a built-in entry`);
    versions.set(entry.id, [...(versions.get(entry.id) ?? []), entry.version]);
  }
  for (const [id, list] of versions) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((version, i) => version !== i + 1)) {
      return refuse(`versions of flour ${id} are not numbered 1..n`);
    }
  }
  return flours;
};

/** Personal equipment entries: each one valid, versions of an id numbered 1..n (equipment.md). */
const decodeEquipment = (input: readonly unknown[]): EquipmentEntry[] => {
  const entries = input.map((value, i) => decodeEquipmentEntry(value, `equipment ${i + 1}`));
  const versions = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.builtIn) return refuse(`equipment ${entry.id} is a built-in entry`);
    versions.set(entry.id, [...(versions.get(entry.id) ?? []), entry.version]);
  }
  for (const [id, list] of versions) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((version, i) => version !== i + 1)) {
      return refuse(`versions of equipment ${id} are not numbered 1..n`);
    }
  }
  return entries;
};

/**
 * Personal ingredient entries (ingredients.md): each one valid, personal, and written once. A
 * missing version is not an error: a pin that does not resolve never blocks a restore, and a
 * device may hold only the versions a recipes file carried.
 */
export const decodeIngredients = (input: unknown, where: string): IngredientEntry[] => {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return refuse(`${where} must be a list`);
  const entries = (input as unknown[]).map((value, i) =>
    decodeIngredientEntry(value, `ingredient ${i + 1}`),
  );
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.builtIn) return refuse(`ingredient ${entry.id} is a built-in entry`);
    const key = `${entry.id}@${entry.version}`;
    if (seen.has(key)) return refuse(`duplicate ingredient ${key}`);
    seen.add(key);
  }
  return entries;
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
    if (input.flours !== undefined && !Array.isArray(input.flours)) {
      return err(invalid('flours must be a list'));
    }
    const flours = decodeFlours((input.flours ?? []) as unknown[]);
    if (input.equipment !== undefined && !Array.isArray(input.equipment)) {
      return err(invalid('equipment must be a list'));
    }
    const equipment = decodeEquipment((input.equipment ?? []) as unknown[]);
    const ingredients = decodeIngredients(input.ingredients, 'ingredients');

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
      // A bake carries its own snapshot, so a recipe deleted from the trash may be absent from the
      // backup (persistence.md, Recipe trash); a recipe that is present must hold the revision.
      for (const ref of Object.values(state.snapshot?.revisions ?? {})) {
        const recipe = recipes.find((r) => r.id === ref.id);
        if (recipe && !recipe.revisions.some((r) => r.version === ref.version)) {
          return err(invalid(`bake ${bakeId} refers to a revision missing from the backup`));
        }
      }
      for (const ref of state.snapshot?.flours ?? []) {
        const known =
          flours.some((f) => f.id === ref.id && f.version === ref.version) ||
          builtInFlour(ref.id, ref.version) !== undefined;
        if (!known) {
          return err(invalid(`bake ${bakeId} refers to a flour entry missing from the backup`));
        }
      }
      // Copies in a bake are immutable: a built-in one is its code definition, a personal one the entry version of the registry.
      for (const copy of state.equipment ?? []) {
        const entry = copy.builtIn
          ? builtInEquipment(copy.id, copy.version)
          : equipment.find((e) => e.id === copy.id && e.version === copy.version);
        if (!entry || canonicalJson(entry) !== canonicalJson(copy)) {
          return err(
            invalid(
              `bake ${bakeId} refers to an equipment entry missing from the backup or differing from it`,
            ),
          );
        }
      }
      bakes.push({
        command: { commandId: `import:${bakeId}`, bakeId, content: 'import' },
        expectedVersion: 0,
        events,
        summary: bakeSummary(state, last.recordedAt),
      });
    }
    if (input.drafts !== undefined && !Array.isArray(input.drafts)) {
      return err(invalid('drafts must be a list'));
    }
    const drafts = ((input.drafts ?? []) as unknown[]).map(decodeDraft);
    if (new Set(drafts.map((d) => d.id)).size !== drafts.length) {
      return err(invalid('duplicate draft'));
    }
    return ok({ recipes, families, bakes, drafts, flours, equipment, ingredients });
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

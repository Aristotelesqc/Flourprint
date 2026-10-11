import type {
  BakeEvent,
  BakeSummary,
  DomainError,
  FlourEntry,
  Formula,
  Instant,
  Process,
  Recipe,
  RecipeFamily,
  Result,
  Revision,
} from '../domain/index.js';

/** Injected clock: the domain never reads the system time itself. */
export interface Clock {
  now(): Instant;
}

/** Injected id source (commandId, eventId, entity ids). */
export interface IdGenerator {
  next(): string;
}

export interface StoredCommand {
  readonly commandId: string;
  readonly bakeId: string;
  /** Canonical JSON of the command content, compared on retries. */
  readonly content: string;
  readonly events: readonly BakeEvent[];
}

export type AppendError =
  | DomainError<'VersionConflict', { currentVersion: number }>
  | DomainError<'CommandIdReused', { commandId: string }>;

export interface AppendInput {
  readonly command: Omit<StoredCommand, 'events'>;
  readonly expectedVersion: number;
  readonly events: readonly BakeEvent[];
  /** Summary of the bake after these events, written in the same transaction. */
  readonly summary: BakeSummary;
}

/**
 * Append-only bake event store (docs/contracts/bake-session.md). `append` is one transaction:
 * the command id is checked first (same content → stored events, different → CommandIdReused),
 * then the expected version, then events, summary and command are written together.
 */
export interface BakeEventStore {
  findCommand(commandId: string): Promise<StoredCommand | undefined>;
  loadEvents(bakeId: string): Promise<readonly BakeEvent[]>;
  append(input: AppendInput): Promise<Result<readonly BakeEvent[], AppendError>>;
  listBakes(): Promise<readonly BakeSummary[]>;
}

export interface SaveRevisionInput {
  readonly recipeId: string;
  readonly name: string;
  /** Head version the edit was based on; 0 for a new recipe. */
  readonly expectedHead: number;
  readonly formula: Formula;
  readonly process: Process;
  readonly createdAt: Instant;
  readonly note?: string;
  /** The draft this revision comes from, deleted in the same transaction (drafts.md). */
  readonly fromDraft?: string;
}

/** A recipe being built, not yet a revision (docs/contracts/drafts.md); it may fail the checks. */
export interface Draft {
  readonly id: string;
  readonly name: string;
  readonly origin:
    | { readonly kind: 'blank' }
    | {
        readonly kind: 'template';
        readonly template: { readonly id: string; readonly version: string };
      }
    | { readonly kind: 'revision'; readonly recipeId: string; readonly baseVersion: number };
  readonly formula: Formula;
  readonly process: Process;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

export type RecipeStoreError =
  | DomainError<'HeadConflict', { recipeId: string; currentHead: number }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>;

export type FamilyError =
  | DomainError<'RecipeNotFound', { recipeId: string }>
  | DomainError<'FamilyNotFound', { familyId: string }>
  | DomainError<'NotInFamily', { recipeId: string; familyId: string }>;

/** A recipe with all its revisions, as recorded (backups, recipe files). */
export interface RecordedRecipe {
  readonly id: string;
  readonly name: string;
  readonly familyId?: string;
  readonly revisions: readonly Revision[];
}

/** Recipes and families to add; checked before any write (persistence.md). */
export interface RecipeImportPlan {
  readonly recipes: readonly RecordedRecipe[];
  readonly families: readonly RecipeFamily[];
}

export interface RecipeImportOutcome {
  readonly imported: readonly string[];
  readonly skipped: readonly string[];
}

/** Recipes, immutable revisions and families (docs/contracts/persistence.md). */
export interface RecipeRepository {
  saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>>;
  getRecipe(recipeId: string): Promise<Recipe | undefined>;
  listRecipes(): Promise<readonly Recipe[]>;
  getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>>;
  listFamilies(): Promise<readonly RecipeFamily[]>;
  /** Creates or renames the family and adds the recipes to it, in one transaction. */
  groupRecipes(
    family: { readonly id: string; readonly name: string },
    recipeIds: readonly string[],
  ): Promise<Result<void, FamilyError>>;
  /** Removes the recipe from its family; a family left empty is deleted. */
  leaveFamily(recipeId: string): Promise<Result<void, FamilyError>>;
  /** Pins the default variant of a family, or unpins it with `undefined`. */
  pinVariant(familyId: string, recipeId: string | undefined): Promise<Result<void, FamilyError>>;
  /**
   * Additive import in one transaction: absent recipe ids are written as recorded, present ones
   * are skipped; absent families are created, present ones are left unchanged.
   */
  importRecipes(plan: RecipeImportPlan): Promise<RecipeImportOutcome>;
  /** Drafts, most recently updated first (drafts.md). */
  listDrafts(): Promise<readonly Draft[]>;
  getDraft(draftId: string): Promise<Draft | undefined>;
  /** Writes or replaces the draft; last write wins. */
  saveDraft(draft: Draft): Promise<void>;
  deleteDraft(draftId: string): Promise<void>;
}

/** Everything a restore writes: revisions as recorded, one append per bake log. */
export interface RestorePlan {
  readonly recipes: readonly RecordedRecipe[];
  readonly families: readonly RecipeFamily[];
  /** Optional so that plans and backups written before drafts still restore. */
  readonly drafts?: readonly Draft[];
  /** Every personal flour entry version (flours.md); optional, like drafts. */
  readonly flours?: readonly FlourEntry[];
  readonly bakes: readonly AppendInput[];
}

export type RestoreError = DomainError<'TargetNotEmpty'>;

/**
 * Writes a checked restore plan atomically into an empty store (persistence.md): everything or
 * nothing, the emptiness check included in the same transaction.
 */
export interface RestoreTarget {
  restore(plan: RestorePlan): Promise<Result<void, RestoreError>>;
}

export type FlourStoreError =
  | DomainError<'HeadConflict', { flourId: string; currentHead: number }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>;

/**
 * Personal flour entries (docs/contracts/flours.md, persistence.md): stored by (id, version), a
 * version is never rewritten. Built-in entries are code and are never stored here.
 */
export interface FlourRegistry {
  /** The latest version of every personal entry, archived ones included, by id. */
  listFlours(): Promise<readonly FlourEntry[]>;
  getFlour(id: string, version: number): Promise<Result<FlourEntry | undefined, FlourStoreError>>;
  /** Every version of every personal entry, by id then version (backups). */
  listFlourVersions(): Promise<readonly FlourEntry[]>;
  /** Writes the entry when its version is the next one for its id, else `HeadConflict`. */
  saveFlour(entry: FlourEntry): Promise<Result<FlourEntry, FlourStoreError>>;
}

import type {
  BakeEvent,
  BakeSummary,
  DomainError,
  Formula,
  Instant,
  Process,
  Recipe,
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
}

export type RecipeStoreError =
  | DomainError<'HeadConflict', { recipeId: string; currentHead: number }>
  | DomainError<'UnsupportedDocumentVersion', { schemaVersion: number }>;

/** Recipes and immutable revisions (docs/contracts/persistence.md). */
export interface RecipeRepository {
  saveRevision(input: SaveRevisionInput): Promise<Result<Revision, RecipeStoreError>>;
  getRecipe(recipeId: string): Promise<Recipe | undefined>;
  listRecipes(): Promise<readonly Recipe[]>;
  getRevision(
    recipeId: string,
    version: number,
  ): Promise<Result<Revision | undefined, RecipeStoreError>>;
}

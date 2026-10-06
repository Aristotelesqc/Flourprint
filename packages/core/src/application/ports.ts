import type { BakeEvent, DomainError, Instant, Result } from '../domain/index.js';

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
}

/**
 * Append-only bake event store (docs/contracts/bake-session.md). `append` is one transaction:
 * the command id is checked first (same content → stored events, different → CommandIdReused),
 * then the expected version, then events and the command are written together.
 */
export interface BakeEventStore {
  findCommand(commandId: string): Promise<StoredCommand | undefined>;
  loadEvents(bakeId: string): Promise<readonly BakeEvent[]>;
  append(input: AppendInput): Promise<Result<readonly BakeEvent[], AppendError>>;
}

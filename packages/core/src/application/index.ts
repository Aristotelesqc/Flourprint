import type { Instant } from '../domain/index.js';

/** Injected clock: the domain never reads the system time itself. */
export interface Clock {
  now(): Instant;
}

/** Injected id source (commandId, eventId, entity ids). */
export interface IdGenerator {
  next(): string;
}

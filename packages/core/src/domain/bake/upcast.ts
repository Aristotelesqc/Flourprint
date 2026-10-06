import { domainError, type DomainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import type { BakeEvent } from './types.js';

/** Current event schema version (docs/contracts/history.md). */
export const EVENT_SCHEMA_VERSION = 1;

export type UpcastError = DomainError<
  'UnsupportedEventVersion',
  { eventId: string; schemaVersion: number }
>;

/**
 * Brings a stored event to the current representation without reinterpreting business values.
 * Version 1 is the only version so far; newer versions are refused explicitly.
 */
export const upcastEvent = (event: BakeEvent): Result<BakeEvent, UpcastError> =>
  event.schemaVersion === EVENT_SCHEMA_VERSION
    ? ok(event)
    : err(
        domainError(
          'UnsupportedEventVersion',
          `Event schema ${event.schemaVersion} is not supported`,
          {
            eventId: event.eventId,
            schemaVersion: event.schemaVersion,
          },
        ),
      );

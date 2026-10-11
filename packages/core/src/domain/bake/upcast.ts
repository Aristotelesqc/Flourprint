import { domainError, type DomainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { HORIZON_S } from '../fermentation/simulate.js';
import type { BakeEvent, BakeSnapshot } from './types.js';

/** Current event schema version (docs/contracts/history.md). */
export const EVENT_SCHEMA_VERSION = 1;

export type UpcastError = DomainError<
  'UnsupportedEventVersion',
  { eventId: string; schemaVersion: number }
>;

/**
 * Range bounds before contract 0.4.0 were raw numbers (an infinite one came back from JSON as
 * `null`). They become portable bounds; a finite number keeps its value (history.md).
 */
const upcastBound = (bound: unknown): unknown =>
  typeof bound === 'number'
    ? { kind: 'finite', value: bound }
    : bound === null
      ? { kind: 'beyondHorizon', horizonS: HORIZON_S }
      : bound;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Tolerant of malformed input: backups are untrusted and checked later (backup-events). */
const upcastSnapshot = (snapshot: BakeSnapshot): BakeSnapshot => {
  if (!isRecord(snapshot) || !isRecord(snapshot.estimates)) return snapshot;
  return {
    ...snapshot,
    estimates: Object.fromEntries(
      Object.entries(snapshot.estimates as Record<string, unknown>).map(([id, estimate]) => [
        id,
        isRecord(estimate) && Array.isArray(estimate.range)
          ? { ...estimate, range: estimate.range.map(upcastBound) }
          : estimate,
      ]),
    ) as BakeSnapshot['estimates'],
  };
};

/**
 * Brings a stored event to the current representation without reinterpreting business values.
 * Version 1 is the only version so far; newer versions are refused explicitly. Snapshot
 * estimate ranges are read in both representations and always rewritten as portable bounds.
 */
export const upcastEvent = (event: BakeEvent): Result<BakeEvent, UpcastError> =>
  event.schemaVersion === EVENT_SCHEMA_VERSION
    ? ok(
        event.payload.type === 'BakeStarted'
          ? {
              ...event,
              payload: { ...event.payload, snapshot: upcastSnapshot(event.payload.snapshot) },
            }
          : event,
      )
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

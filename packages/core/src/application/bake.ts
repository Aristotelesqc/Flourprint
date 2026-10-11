import {
  bakeSummary,
  canonicalJson,
  decide,
  evolve,
  domainError,
  err,
  EVENT_SCHEMA_VERSION,
  ok,
  replayBake,
  upcastEvent,
  type BakeCommand,
  type BakeError,
  type BakeEvent,
  type BakeOrigin,
  type BakeState,
  type Result,
  type UpcastError,
} from '../domain/index.js';
import type { AppendError, BakeEventStore, Clock, IdGenerator } from './ports.js';

export interface BakeDependencies {
  readonly store: BakeEventStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export interface BakeCommandResult {
  readonly events: readonly BakeEvent[];
  readonly state: BakeState;
}

export type ExecuteBakeError = BakeError | AppendError | UpcastError;

/** Reads a bake from its log; never calls the calculation engine (history.md). */
export const loadBake = async (
  store: BakeEventStore,
  bakeId: string,
): Promise<Result<BakeState, UpcastError>> => {
  const upcast: BakeEvent[] = [];
  for (const event of await store.loadEvents(bakeId)) {
    const current = upcastEvent(event);
    if (!current.ok) return current;
    upcast.push(current.value);
  }
  return ok(replayBake(bakeId, upcast));
};

/**
 * The world a bake belongs to (history.md, ADR 0014), read from its BakeStarted snapshot: a bake
 * without `origin` (recorded before 0.6.0, or with no start event) counts as real.
 */
export const bakeWorld = (events: readonly BakeEvent[]): BakeOrigin => {
  const started = events.find((e) => e.payload.type === 'BakeStarted');
  return (started?.payload.type === 'BakeStarted' && started.payload.snapshot.origin) || 'physical';
};

const contentOf = (command: BakeCommand): string =>
  canonicalJson({
    bakeId: command.bakeId,
    expectedVersion: command.expectedVersion,
    payload: command.payload,
  });

/** Executes one bake command with the D7 protocol: idempotency, version check, atomic append. */
export const executeBakeCommand = async (
  deps: BakeDependencies,
  command: BakeCommand,
): Promise<Result<BakeCommandResult, ExecuteBakeError>> => {
  const content = contentOf(command);
  const previous = await deps.store.findCommand(command.commandId);
  if (previous) {
    if (previous.content !== content) {
      return err(
        domainError(
          'CommandIdReused',
          `Command ${command.commandId} was used with another content`,
          {
            commandId: command.commandId,
          },
        ),
      );
    }
    const state = await loadBake(deps.store, command.bakeId);
    return state.ok ? ok({ events: previous.events, state: state.value }) : state;
  }

  const loaded = await loadBake(deps.store, command.bakeId);
  if (!loaded.ok) return loaded;
  const state = loaded.value;
  if (state.version !== command.expectedVersion) {
    return err(
      domainError('VersionConflict', `Bake ${command.bakeId} is at version ${state.version}`, {
        currentVersion: state.version,
      }),
    );
  }

  const now = deps.clock.now();
  const drafts = decide(state, command.payload, now);
  if (!drafts.ok) return drafts;
  const events: BakeEvent[] = drafts.value.map((draft, index) => ({
    eventId: deps.ids.next(),
    bakeId: command.bakeId,
    seq: state.version + index + 1,
    causationId: command.commandId,
    occurredAt: draft.occurredAt,
    recordedAt: now,
    schemaVersion: EVENT_SCHEMA_VERSION,
    payload: draft.payload,
  }));

  const next = events.reduce(evolve, state);
  const appended = await deps.store.append({
    command: { commandId: command.commandId, bakeId: command.bakeId, content },
    expectedVersion: command.expectedVersion,
    events,
    summary: bakeSummary(next, now),
  });
  if (!appended.ok) return appended;
  if (appended.value !== events) {
    // A concurrent retry of the same command was stored first: read what was recorded.
    const reloaded = await loadBake(deps.store, command.bakeId);
    return reloaded.ok ? ok({ events: appended.value, state: reloaded.value }) : reloaded;
  }
  return ok({ events, state: next });
};

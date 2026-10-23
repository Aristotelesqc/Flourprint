import {
  decide,
  evolve,
  liveProjection,
  stepFacts,
  initialBakeState,
  outcomeChoiceRequired,
  heldSeconds,
  isStepHeld,
  adjustedDurationS,
  previousAction,
  type PreviousAction,
  visibleEvents,
  EVENT_SCHEMA_VERSION,
  type BakeState,
  type BakeEvent,
  type BakeCommandPayload,
  type BakeError,
  type Formula,
  type Process,
  type ProcessStep,
  type StepId,
  type Instant,
  type BakeSnapshot,
} from '@flourprint/core/domain';
import type { Locale } from './messages';
import { prepCopy } from './preparation-copy';

export interface EngineBakeSession {
  readonly bakeId: string;
  readonly state: BakeState;
  readonly events: readonly BakeEvent[];
  readonly seq: number;
}

export function formatCountdownHHMMSS(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return '--:--:--';
  }
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatStepAdjustment(
  currentPlannedDurationS: number | undefined,
  baselinePlannedDurationS: number | undefined,
  locale: Locale,
): string {
  const base = baselinePlannedDurationS ?? 0;
  const curr = currentPlannedDurationS ?? 0;
  const diffMinutes = Math.round((curr - base) / 60);
  const sign = diffMinutes >= 0 ? '+' : '';
  const text = `${sign}${diffMinutes} min`;
  return prepCopy(locale, 'adjustmentLabel', { adj: text });
}

export function createEngineBakeSession(
  bakeId: string,
  formula: Formula,
  process: Process,
  startedAt: Instant,
  revisions?: BakeSnapshot['revisions'],
  recipeId = 'recipe',
): { ok: true; session: EngineBakeSession } | { ok: false; error: BakeError } {
  let state = initialBakeState(bakeId);
  const startCommand: BakeCommandPayload = {
    type: 'StartBake',
    revisions: revisions ?? {
      formula: { id: recipeId, version: 1 },
      process: { id: recipeId, version: 1 },
    },
    formula,
    process,
    mode: { kind: 'startAt', at: startedAt },
  };

  const draftsResult = decide(state, startCommand, startedAt);
  if (!draftsResult.ok) {
    return { ok: false, error: draftsResult.error };
  }

  let seq = 1;
  const events: BakeEvent[] = [];
  for (const draft of draftsResult.value) {
    const event: BakeEvent = {
      eventId: crypto.randomUUID(),
      bakeId,
      seq: seq++,
      causationId: startCommand.type,
      occurredAt: draft.occurredAt,
      recordedAt: startedAt,
      schemaVersion: EVENT_SCHEMA_VERSION,
      payload: draft.payload,
    };
    state = evolve(state, event);
    events.push(event);
  }

  return {
    ok: true,
    session: {
      bakeId,
      state,
      events,
      seq,
    },
  };
}

export function dispatchEngineCommand(
  current: EngineBakeSession,
  payload: BakeCommandPayload,
  now: Instant,
):
  | { ok: true; session: EngineBakeSession; newEvents: BakeEvent[] }
  | { ok: false; error: BakeError } {
  const draftsResult = decide(current.state, payload, now);
  if (!draftsResult.ok) {
    return { ok: false, error: draftsResult.error };
  }

  let state = current.state;
  let seq = current.seq;
  const newEvents: BakeEvent[] = [];

  for (const draft of draftsResult.value) {
    const event: BakeEvent = {
      eventId: crypto.randomUUID(),
      bakeId: current.bakeId,
      seq: seq++,
      causationId: payload.type,
      occurredAt: draft.occurredAt,
      recordedAt: now,
      schemaVersion: EVENT_SCHEMA_VERSION,
      payload: draft.payload,
    };
    state = evolve(state, event);
    newEvents.push(event);
  }

  return {
    ok: true,
    session: {
      bakeId: current.bakeId,
      state,
      events: [...current.events, ...newEvents],
      seq,
    },
    newEvents,
  };
}

export {
  decide,
  evolve,
  liveProjection,
  stepFacts,
  outcomeChoiceRequired,
  heldSeconds,
  isStepHeld,
  adjustedDurationS,
  previousAction,
  type PreviousAction,
  visibleEvents,
  type BakeState,
  type BakeEvent,
  type BakeCommandPayload,
  type BakeError,
  type ProcessStep,
  type StepId,
  type Instant,
};

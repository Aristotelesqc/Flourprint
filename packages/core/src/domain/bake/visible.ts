import type { BakeEvent } from './types.js';

/**
 * The events of the visible (business) timeline of a Preparation: a completion that was retracted
 * and its retraction are hidden. The technical log and the exports keep every event
 * (bake-session.md, Retracted completions).
 */
export const visibleEvents = (events: readonly BakeEvent[]): BakeEvent[] => {
  const retracted = new Set(
    events.flatMap((e) =>
      e.payload.type === 'StepCompletionRetracted' ? [e.payload.targetEventId] : [],
    ),
  );
  return events.filter(
    (e) => e.payload.type !== 'StepCompletionRetracted' && !retracted.has(e.eventId),
  );
};

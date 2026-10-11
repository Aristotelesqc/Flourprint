import type { AppendInput } from '@flourprint/core/application';

/**
 * Integrity checks every store enforces before writing (SQLite enforces them through keys too).
 * A violation is a programming error, not a business outcome: it throws and writes nothing.
 */
export const assertAppendable = (
  input: AppendInput,
  existingEventIds: ReadonlySet<string>,
): void => {
  const ids = new Set<string>();
  input.events.forEach((event, index) => {
    if (event.bakeId !== input.command.bakeId) {
      throw new Error(`Event ${event.eventId} belongs to another bake`);
    }
    if (event.seq !== input.expectedVersion + index + 1) {
      throw new Error(
        `Event ${event.eventId} has seq ${event.seq}, expected ${input.expectedVersion + index + 1}`,
      );
    }
    if (ids.has(event.eventId) || existingEventIds.has(event.eventId)) {
      throw new Error(`Duplicate event id ${event.eventId}`);
    }
    ids.add(event.eventId);
  });
};

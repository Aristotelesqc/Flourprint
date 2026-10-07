import type {
  AppendError,
  AppendInput,
  BakeEventStore,
  StoredCommand,
} from '@flourprint/core/application';
import {
  domainError,
  err,
  ok,
  type BakeEvent,
  type BakeSummary,
  type Result,
} from '@flourprint/core/domain';
import { assertAppendable } from '../shared/append-checks.js';

/**
 * In-memory implementation of the bake event store protocol. Used by tests, the CLI and UI
 * exploration; it loses data when the process ends and does not validate SQLite behavior (#24).
 */
export class MemoryBakeEventStore implements BakeEventStore {
  readonly #events = new Map<string, BakeEvent[]>();
  readonly #commands = new Map<string, StoredCommand>();
  readonly #summaries = new Map<string, BakeSummary>();

  async findCommand(commandId: string): Promise<StoredCommand | undefined> {
    return this.#commands.get(commandId);
  }

  async loadEvents(bakeId: string): Promise<readonly BakeEvent[]> {
    return [...(this.#events.get(bakeId) ?? [])];
  }

  async listBakes(): Promise<readonly BakeSummary[]> {
    return [...this.#summaries.values()];
  }

  async append(input: AppendInput): Promise<Result<readonly BakeEvent[], AppendError>> {
    const previous = this.#commands.get(input.command.commandId);
    if (previous) {
      return previous.content === input.command.content
        ? ok(previous.events)
        : err(
            domainError(
              'CommandIdReused',
              `Command ${input.command.commandId} was used with another content`,
              { commandId: input.command.commandId },
            ),
          );
    }
    const log = this.#events.get(input.command.bakeId) ?? [];
    const currentVersion = log.at(-1)?.seq ?? 0;
    if (currentVersion !== input.expectedVersion) {
      return err(
        domainError('VersionConflict', `Bake is at version ${currentVersion}`, { currentVersion }),
      );
    }
    assertAppendable(input, new Set([...this.#events.values()].flat().map((e) => e.eventId)));
    this.#events.set(input.command.bakeId, [...log, ...input.events]);
    this.#commands.set(input.command.commandId, { ...input.command, events: input.events });
    this.#summaries.set(input.command.bakeId, input.summary);
    return ok(input.events);
  }
}

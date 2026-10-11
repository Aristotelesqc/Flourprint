import {
  bakeWorld,
  type AppendError,
  type AppendInput,
  type BakeEventStore,
  type StoredCommand,
} from '@flourprint/core/application';
import {
  domainError,
  err,
  ok,
  type BakeEvent,
  type BakeOrigin,
  type BakeSummary,
  type Result,
} from '@flourprint/core/domain';
import { assertAppendable } from '../shared/append-checks.js';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * In-memory implementation of the bake event store protocol. Used by tests, the CLI and UI
 * exploration; it loses data when the process ends and does not validate SQLite behavior (#24).
 */
export class MemoryBakeEventStore implements BakeEventStore {
  readonly #events = new Map<string, BakeEvent[]>();
  readonly #commands = new Map<string, StoredCommand>();
  readonly #summaries = new Map<string, BakeSummary>();

  // Values are copied in and out, like rows of a database: a caller can never alter history.
  async findCommand(commandId: string): Promise<StoredCommand | undefined> {
    const command = this.#commands.get(commandId);
    return command && copy(command);
  }

  async loadEvents(bakeId: string): Promise<readonly BakeEvent[]> {
    return copy(this.#events.get(bakeId) ?? []);
  }

  async listBakes(): Promise<readonly BakeSummary[]> {
    return copy([...this.#summaries.values()]);
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
    this.check(input);
    this.write(input);
    return ok(copy(input.events));
  }

  async deleteBakes(origin: BakeOrigin): Promise<number> {
    // Every map is changed synchronously: no other call can see a half-erased history.
    const bakeIds = new Set(
      [...new Set([...this.#events.keys(), ...this.#summaries.keys()])].filter(
        (bakeId) => bakeWorld(this.#events.get(bakeId) ?? []) === origin,
      ),
    );
    for (const bakeId of bakeIds) {
      this.#events.delete(bakeId);
      this.#summaries.delete(bakeId);
    }
    for (const [commandId, command] of this.#commands) {
      if (bakeIds.has(command.bakeId)) this.#commands.delete(commandId);
    }
    return bakeIds.size;
  }

  /** Throws on an integrity violation, before anything is written. */
  check(input: AppendInput): void {
    assertAppendable(input, new Set([...this.#events.values()].flat().map((e) => e.eventId)));
  }

  /** Writes a checked append synchronously; restores use it to stay atomic. */
  write(input: AppendInput): void {
    const log = this.#events.get(input.command.bakeId) ?? [];
    this.#events.set(input.command.bakeId, [...log, ...copy(input.events)]);
    this.#commands.set(input.command.commandId, copy({ ...input.command, events: input.events }));
    this.#summaries.set(input.command.bakeId, copy(input.summary));
  }

  get isEmpty(): boolean {
    return this.#summaries.size === 0 && this.#events.size === 0;
  }
}

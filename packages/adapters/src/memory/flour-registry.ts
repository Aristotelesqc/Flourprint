import type { FlourRegistry, FlourStoreError } from '@flourprint/core/application';
import { domainError, err, ok, type FlourEntry, type Result } from '@flourprint/core/domain';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** In-memory personal flour entries; same contract as the SQLite implementations. */
export class MemoryFlourRegistry implements FlourRegistry {
  /** Versions of each id, in order: index i holds version i + 1. */
  readonly #entries = new Map<string, FlourEntry[]>();

  async listFlours(): Promise<readonly FlourEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => this.#entries.get(id)?.slice(-1) ?? [])
      .map(copy);
  }

  async getFlour(id: string, version: number): Promise<Result<FlourEntry | undefined, never>> {
    const entry = this.#entries.get(id)?.[version - 1];
    return ok(entry && copy(entry));
  }

  async listFlourVersions(): Promise<readonly FlourEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => (this.#entries.get(id) ?? []).map(copy));
  }

  async saveFlour(entry: FlourEntry): Promise<Result<FlourEntry, FlourStoreError>> {
    const currentHead = this.#entries.get(entry.id)?.length ?? 0;
    if (entry.version !== currentHead + 1) {
      return err(
        domainError('HeadConflict', `Flour ${entry.id} is at version ${currentHead}`, {
          flourId: entry.id,
          currentHead,
        }),
      );
    }
    this.write(entry);
    return ok(copy(entry));
  }

  /** Writes a checked version synchronously (restores). */
  write(entry: FlourEntry): void {
    const versions = this.#entries.get(entry.id) ?? [];
    versions[entry.version - 1] = copy(entry);
    this.#entries.set(entry.id, versions);
  }

  get isEmpty(): boolean {
    return this.#entries.size === 0;
  }
}

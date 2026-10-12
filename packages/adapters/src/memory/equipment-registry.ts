import type { EquipmentRegistry, EquipmentStoreError } from '@flourprint/core/application';
import { domainError, err, ok, type EquipmentEntry, type Result } from '@flourprint/core/domain';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** In-memory personal equipment entries; same contract as the SQLite implementations. */
export class MemoryEquipmentRegistry implements EquipmentRegistry {
  /** Versions of each id, in order: index i holds version i + 1. */
  readonly #entries = new Map<string, EquipmentEntry[]>();

  async listEquipment(): Promise<readonly EquipmentEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => this.#entries.get(id)?.slice(-1) ?? [])
      .map(copy);
  }

  async getEquipment(
    id: string,
    version: number,
  ): Promise<Result<EquipmentEntry | undefined, never>> {
    const entry = this.#entries.get(id)?.[version - 1];
    return ok(entry && copy(entry));
  }

  async listEquipmentVersions(): Promise<readonly EquipmentEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => (this.#entries.get(id) ?? []).map(copy));
  }

  async saveEquipment(entry: EquipmentEntry): Promise<Result<EquipmentEntry, EquipmentStoreError>> {
    const currentHead = this.#entries.get(entry.id)?.length ?? 0;
    if (entry.version !== currentHead + 1) {
      return err(
        domainError('HeadConflict', `Equipment ${entry.id} is at version ${currentHead}`, {
          equipmentId: entry.id,
          currentHead,
        }),
      );
    }
    this.write(entry);
    return ok(copy(entry));
  }

  /** Writes a checked version synchronously (restores). */
  write(entry: EquipmentEntry): void {
    const versions = this.#entries.get(entry.id) ?? [];
    versions[entry.version - 1] = copy(entry);
    this.#entries.set(entry.id, versions);
  }

  get isEmpty(): boolean {
    return this.#entries.size === 0;
  }
}

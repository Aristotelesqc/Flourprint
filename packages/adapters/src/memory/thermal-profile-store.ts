import type { ThermalProfileStore, ThermalStoreError } from '@flourprint/core/application';
import { domainError, err, ok, type Result, type ThermalProfile } from '@flourprint/core/domain';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * In-memory personal thermal profile; same contract as the SQLite implementations: a version is
 * written only when it is the next one for its id, and never rewritten.
 */
export class MemoryThermalProfileStore implements ThermalProfileStore {
  /** Versions of each id, by version number. */
  readonly #profiles = new Map<string, Map<number, ThermalProfile>>();

  #versions(id: string): ThermalProfile[] {
    return [...(this.#profiles.get(id)?.values() ?? [])].sort((a, b) => a.version - b.version);
  }

  async getThermalProfile(
    id: string,
    version: number,
  ): Promise<Result<ThermalProfile | undefined, never>> {
    const profile = this.#profiles.get(id)?.get(version);
    return ok(profile && copy(profile));
  }

  async listThermalProfileVersions(): Promise<readonly ThermalProfile[]> {
    return [...this.#profiles.keys()]
      .sort()
      .flatMap((id) => this.#versions(id))
      .map(copy);
  }

  async saveThermalProfile(
    profile: ThermalProfile,
  ): Promise<Result<ThermalProfile, ThermalStoreError>> {
    const currentHead = this.#versions(profile.id).at(-1)?.version ?? 0;
    if (profile.version !== currentHead + 1) {
      return err(
        domainError('HeadConflict', `Thermal profile ${profile.id} is at version ${currentHead}`, {
          profileId: profile.id,
          currentHead,
        }),
      );
    }
    this.write(profile);
    return ok(copy(profile));
  }

  /** Writes a checked version synchronously (restores). */
  write(profile: ThermalProfile): void {
    const versions = this.#profiles.get(profile.id) ?? new Map<number, ThermalProfile>();
    versions.set(profile.version, copy(profile));
    this.#profiles.set(profile.id, versions);
  }

  get isEmpty(): boolean {
    return this.#profiles.size === 0;
  }
}

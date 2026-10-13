import type { IngredientRegistry, IngredientStoreError } from '@flourprint/core/application';
import { domainError, err, ok, type IngredientEntry, type Result } from '@flourprint/core/domain';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * In-memory personal ingredient entries, customizations included; same contract as the SQLite
 * implementations. Versions of an id may have gaps: an import writes only the versions a recipes
 * file pins (ingredients.md).
 */
export class MemoryIngredientRegistry implements IngredientRegistry {
  /** Versions of each id, by version number. */
  readonly #entries = new Map<string, Map<number, IngredientEntry>>();

  #versions(id: string): IngredientEntry[] {
    return [...(this.#entries.get(id)?.values() ?? [])].sort((a, b) => a.version - b.version);
  }

  async listIngredients(): Promise<readonly IngredientEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => this.#versions(id).slice(-1))
      .map(copy);
  }

  async getIngredient(
    id: string,
    version: number,
  ): Promise<Result<IngredientEntry | undefined, never>> {
    const entry = this.#entries.get(id)?.get(version);
    return ok(entry && copy(entry));
  }

  async listIngredientVersions(): Promise<readonly IngredientEntry[]> {
    return [...this.#entries.keys()]
      .sort()
      .flatMap((id) => this.#versions(id))
      .map(copy);
  }

  async saveIngredient(
    entry: IngredientEntry,
  ): Promise<Result<IngredientEntry, IngredientStoreError>> {
    const currentHead = this.#versions(entry.id).at(-1)?.version ?? 0;
    if (entry.version !== currentHead + 1) {
      return err(
        domainError('HeadConflict', `Ingredient ${entry.id} is at version ${currentHead}`, {
          ingredientId: entry.id,
          currentHead,
        }),
      );
    }
    this.write(entry);
    return ok(copy(entry));
  }

  /** Whether that version is stored (imports skip it). */
  has(id: string, version: number): boolean {
    return this.#entries.get(id)?.has(version) ?? false;
  }

  /** Writes a checked version synchronously (restores and imports). */
  write(entry: IngredientEntry): void {
    const versions = this.#entries.get(entry.id) ?? new Map<number, IngredientEntry>();
    versions.set(entry.version, copy(entry));
    this.#entries.set(entry.id, versions);
  }

  get isEmpty(): boolean {
    return this.#entries.size === 0;
  }
}

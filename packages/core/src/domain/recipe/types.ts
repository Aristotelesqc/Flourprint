import { canonicalJson } from '../canonical-json.js';
import type { Formula } from '../formula/types.js';
import type { Instant } from '../instant.js';
import type { Process } from '../process/types.js';

/** Recipes and revisions (docs/contracts/persistence.md). */

/** Schema version of persisted documents (revisions, backups). */
export const DOCUMENT_SCHEMA_VERSION = 1;

/**
 * Schema version of the full backup and the recipe export. 2 adds `referenceVersions` per recipe
 * (persistence.md, Recipe history); 3 adds `thermal` on process steps and `thermalProfiles`
 * (persistence.md, Personal thermal profile, #176). Older readers must refuse a newer document
 * rather than drop a field; documents of version 1 and 2 are read unchanged, as no thermal data.
 */
export const EXPORT_SCHEMA_VERSION = 3;

/** The explicit promotion of one saved revision (persistence.md, Recipe history). */
export interface ReferenceVersion {
  readonly recipeId: string;
  /** Own sequence per recipe (1, 2, 3, ...), unrelated to `version`. */
  readonly number: number;
  /** The promoted saved revision. */
  readonly version: number;
  readonly name?: string;
  readonly createdAt: Instant;
}

/**
 * Whether two revisions hold the same formula and process; `note`, timestamps and key order do
 * not count (persistence.md, Recipe history).
 */
export const sameRecipeContent = (
  a: { readonly formula: unknown; readonly process: unknown },
  b: { readonly formula: unknown; readonly process: unknown },
): boolean =>
  canonicalJson(a.formula) === canonicalJson(b.formula) &&
  canonicalJson(a.process) === canonicalJson(b.process);

export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly headVersion: number;
  readonly updatedAt: Instant;
  /** Family this recipe is a variant of, if any. */
  readonly familyId?: string;
  /** When the recipe was put in the trash; absent for a recipe that is not (persistence.md). */
  readonly trashedAt?: Instant;
}

/** Variants of one recipe (persistence.md, Recipe families). */
export interface RecipeFamily {
  readonly id: string;
  readonly name: string;
  readonly pinnedRecipeId?: string;
}

/**
 * The variant shown for a family: the pinned member, otherwise the most recently updated one
 * (ties: smallest id). Members in the trash never count.
 */
export const defaultVariant = (
  family: RecipeFamily,
  recipes: readonly Recipe[],
): Recipe | undefined => {
  const members = recipes.filter((r) => r.familyId === family.id && r.trashedAt === undefined);
  const pinned = members.find((r) => r.id === family.pinnedRecipeId);
  if (pinned) return pinned;
  return [...members].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || (a.id < b.id ? -1 : 1),
  )[0];
};

/** Immutable once written; holds the formula and the process together in Alpha. */
export interface Revision {
  readonly recipeId: string;
  readonly version: number;
  readonly formula: Formula;
  readonly process: Process;
  readonly createdAt: Instant;
  readonly note?: string;
}

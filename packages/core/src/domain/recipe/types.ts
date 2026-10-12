import type { Formula } from '../formula/types.js';
import type { Instant } from '../instant.js';
import type { Process } from '../process/types.js';

/** Recipes and revisions (docs/contracts/persistence.md). */

/** Schema version of persisted documents (revisions, backups). */
export const DOCUMENT_SCHEMA_VERSION = 1;

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
  const members = recipes.filter(
    (r) => r.familyId === family.id && r.trashedAt === undefined,
  );
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

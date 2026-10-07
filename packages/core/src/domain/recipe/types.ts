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
}

/** Immutable once written; holds the formula and the process together in Alpha. */
export interface Revision {
  readonly recipeId: string;
  readonly version: number;
  readonly formula: Formula;
  readonly process: Process;
  readonly createdAt: Instant;
  readonly note?: string;
}

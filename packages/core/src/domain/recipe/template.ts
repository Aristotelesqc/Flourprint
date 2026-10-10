import type { Formula } from '../formula/types.js';
import type { Process } from '../process/types.js';

/** A recipe shipped with the app as a starting point (docs/contracts/drafts.md, Templates). */
export interface RecipeTemplate {
  readonly id: string;
  /** A change of the data is a new version. */
  readonly version: string;
  readonly category: 'bread' | 'enriched' | 'pan' | 'pizza' | 'flatbread';
  readonly formula: Formula;
  readonly process: Process;
  /** Where the proportions come from (English). */
  readonly basis: string;
}

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
  /** Typical ranges of the style, shown as a guide; never used in a calculation (drafts.md). */
  readonly guide?: {
    /** Stable codes; the unit follows the suffix (`_pct`, `_h`, `_c`, `_min`, `_s`, `_g`, `_w`). */
    readonly ranges: readonly {
      readonly key: string;
      readonly low: number;
      readonly high: number;
    }[];
    /** The document the ranges come from. */
    readonly reference: string;
    /** False until the sources were read in full. */
    readonly verified: boolean;
  };
}

import type { Instant } from '../instant.js';
import type { BakeState } from './types.js';

/** Index row of a bake, rebuildable from its events (docs/contracts/persistence.md). */
export interface BakeSummary {
  readonly bakeId: string;
  readonly status: BakeState['status'];
  readonly version: number;
  readonly recipeId?: string;
  readonly recipeVersion?: number;
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
  readonly updatedAt: Instant;
}

export const bakeSummary = (state: BakeState, updatedAt: Instant): BakeSummary => {
  const revision = state.snapshot?.revisions.formula;
  return {
    bakeId: state.bakeId,
    status: state.status,
    version: state.version,
    ...(revision === undefined ? {} : { recipeId: revision.id, recipeVersion: revision.version }),
    ...(state.startedAt === undefined ? {} : { startedAt: state.startedAt }),
    ...(state.endedAt === undefined ? {} : { endedAt: state.endedAt }),
    updatedAt,
  };
};

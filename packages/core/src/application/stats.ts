import type { Instant } from '../domain/index.js';
import type { BakeDigest } from './feedback.js';

/**
 * Statistics of a set of bakes (ADR 0014), read from their digests only (history.md): the
 * caller passes the bakes of one world, real or simulated. Durations are in seconds.
 */
export interface BakeStats {
  readonly counts: {
    readonly total: number;
    readonly finished: number;
    readonly abandoned: number;
    readonly active: number;
    /** Finished sessions by result; the four add up to `finished` (history.md, Statistics). */
    readonly results: {
      readonly cooked: number;
      readonly dough: number;
      readonly cookedAndDough: number;
      readonly unknown: number;
    };
  };
  /**
   * Completed cooking steps by operation, over every session whatever its status (most first). A
   * completed stage never counts a session as cooked.
   */
  readonly cookingStages: readonly CookingStageStat[];
  /** Recipes by number of bakes, most baked first (ties: most recent bake first). */
  readonly recipes: readonly RecipeCount[];
  /**
   * Plan at start versus recorded duration of completed steps, by operation (most measured
   * first). A positive difference means the step took longer than planned.
   */
  readonly durations: readonly DurationStat[];
  /** "Dough ready" marks (bake-session.md) and how they compare with the model estimate. */
  readonly readiness: ReadinessStat;
  /** Average rating of review notes, by recipe (best first). */
  readonly ratings: readonly RatingStat[];
  /** The last bakes, most recently started first. */
  readonly recent: readonly RecentBake[];
}

export interface CookingStageStat {
  readonly operation: string;
  readonly n: number;
}

export interface RecipeCount {
  readonly recipeId: string;
  readonly name?: string;
  readonly count: number;
}

export interface DurationStat {
  readonly operation: string;
  readonly n: number;
  readonly medianPlannedS: number;
  readonly medianRecordedS: number;
  /** Median of (recorded − planned) over the same steps. */
  readonly medianDifferenceS: number;
}

export interface ReadinessStat {
  readonly marks: number;
  /** Marks on a step whose accepted model estimate is known. */
  readonly compared: number;
  /** Median of (time in step at the mark − model estimate), when `compared` > 0. */
  readonly medianDifferenceS?: number;
  readonly medianRecordedS?: number;
  readonly medianModelS?: number;
}

export interface RatingStat {
  readonly recipeId: string;
  readonly name?: string;
  readonly average: number;
  readonly n: number;
}

export interface RecentBake {
  readonly bakeId: string;
  readonly recipeId: string;
  readonly name?: string;
  readonly status: BakeDigest['status'];
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
  readonly durationS?: number;
}

/** Median of a non-empty list; the mean of the two middle values for an even count. */
export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
};

const time = (instant: Instant | undefined): number =>
  instant === undefined ? Number.NEGATIVE_INFINITY : Date.parse(instant);

const RECENT = 10;

export const bakeStats = (bakes: readonly BakeDigest[]): BakeStats => {
  const byRecent = [...bakes].sort(
    (a, b) => time(b.startedAt) - time(a.startedAt) || a.bakeId.localeCompare(b.bakeId),
  );
  const name = (bake: BakeDigest) =>
    bake.recipe.name === undefined ? {} : { name: bake.recipe.name };

  const recipes = new Map<string, RecipeCount>();
  for (const bake of byRecent) {
    const known = recipes.get(bake.recipe.id);
    recipes.set(bake.recipe.id, {
      recipeId: bake.recipe.id,
      ...name(bake),
      ...(known?.name === undefined ? {} : { name: known.name }),
      count: (known?.count ?? 0) + 1,
    });
  }

  const durations = new Map<string, { planned: number[]; recorded: number[] }>();
  for (const bake of bakes) {
    for (const step of bake.steps) {
      const planned = step.baselineDurationS ?? step.plannedDurationS;
      if (planned === undefined || step.actualDurationS === undefined) continue;
      const entry = durations.get(step.operation) ?? { planned: [], recorded: [] };
      entry.planned.push(planned);
      entry.recorded.push(step.actualDurationS);
      durations.set(step.operation, entry);
    }
  }

  let marks = 0;
  const recorded: number[] = [];
  const model: number[] = [];
  const ratings = new Map<string, { name?: string; values: number[] }>();
  for (const bake of byRecent) {
    for (const observation of bake.observations) {
      if (observation.kind === 'doughReady') {
        marks += 1;
        const estimate = bake.steps.find((s) => s.id === observation.stepId)?.estimate;
        if (
          observation.elapsedInStepS !== undefined &&
          estimate?.status === 'ok' &&
          Number.isFinite(estimate.value)
        ) {
          recorded.push(observation.elapsedInStepS);
          model.push(estimate.value);
        }
      }
      if (observation.rating !== undefined && Number.isFinite(observation.rating)) {
        const entry = ratings.get(bake.recipe.id) ?? { ...name(bake), values: [] };
        entry.values.push(observation.rating);
        ratings.set(bake.recipe.id, entry);
      }
    }
  }

  const finished = bakes.filter((b) => b.status === 'finished');
  const result = (bake: BakeDigest) =>
    bake.outcome === undefined || bake.outcome === 'unknown' ? 'unknown' : bake.outcome.result;
  const stages = new Map<string, number>();
  for (const bake of bakes) {
    for (const step of bake.steps) {
      if (step.cooking && step.endedAt !== undefined) {
        stages.set(step.operation, (stages.get(step.operation) ?? 0) + 1);
      }
    }
  }

  return {
    counts: {
      total: bakes.length,
      finished: finished.length,
      abandoned: bakes.filter((b) => b.status === 'abandoned').length,
      active: bakes.filter((b) => b.status === 'active').length,
      results: {
        cooked: finished.filter((b) => result(b) === 'cooked').length,
        dough: finished.filter((b) => result(b) === 'dough').length,
        cookedAndDough: finished.filter((b) => result(b) === 'cookedAndDough').length,
        unknown: finished.filter((b) => result(b) === 'unknown').length,
      },
    },
    cookingStages: [...stages.entries()]
      .map(([operation, n]) => ({ operation, n }))
      .sort((a, b) => b.n - a.n || a.operation.localeCompare(b.operation)),
    recipes: [...recipes.values()].sort((a, b) => b.count - a.count),
    durations: [...durations.entries()]
      .map(([operation, { planned, recorded: actual }]) => ({
        operation,
        n: planned.length,
        medianPlannedS: median(planned),
        medianRecordedS: median(actual),
        medianDifferenceS: median(actual.map((value, i) => value - (planned[i] as number))),
      }))
      .sort((a, b) => b.n - a.n || a.operation.localeCompare(b.operation)),
    readiness: {
      marks,
      compared: recorded.length,
      ...(recorded.length === 0
        ? {}
        : {
            medianDifferenceS: median(recorded.map((value, i) => value - (model[i] as number))),
            medianRecordedS: median(recorded),
            medianModelS: median(model),
          }),
    },
    ratings: [...ratings.entries()]
      .map(([recipeId, { name: recipeName, values }]) => ({
        recipeId,
        ...(recipeName === undefined ? {} : { name: recipeName }),
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        n: values.length,
      }))
      .sort((a, b) => b.average - a.average || b.n - a.n),
    recent: byRecent.slice(0, RECENT).map((bake) => {
      const durationS =
        bake.startedAt === undefined || bake.endedAt === undefined
          ? undefined
          : Math.round((Date.parse(bake.endedAt) - Date.parse(bake.startedAt)) / 1000);
      return {
        bakeId: bake.bakeId,
        recipeId: bake.recipe.id,
        ...name(bake),
        status: bake.status,
        ...(bake.startedAt === undefined ? {} : { startedAt: bake.startedAt }),
        ...(bake.endedAt === undefined ? {} : { endedAt: bake.endedAt }),
        ...(durationS === undefined ? {} : { durationS }),
      };
    }),
  };
};

import { domainError } from '../errors.js';
import type { Instant } from '../instant.js';
import { err, ok, type Result } from '../result.js';
import { isCookingStep } from './cooking.js';
import { descendants } from './dough.js';
import { componentIds, subjectOf } from './move.js';
import { projectProcess } from './project.js';
import type { Process, StepId, Warmup } from './types.js';
import type { ProcessError } from './validate.js';

/**
 * Relative timeline and groups (docs/contracts/process.md). Everything here is derived from
 * `projectProcess`; nothing is persisted and no wall-clock date is part of a `RelativeTimeline`.
 */

/** Seconds from the origin (time 0 = the earliest planned start of the process). */
export type Timing =
  | { readonly status: 'known'; readonly startS: number; readonly endS: number }
  | { readonly status: 'unknown'; readonly unknownAfter: readonly StepId[] };

export type Window =
  | {
      readonly status: 'complete';
      readonly startS: number;
      readonly endS: number;
      readonly elapsedS: number;
    }
  | { readonly status: 'partial' | 'unknown'; readonly reasons: readonly StepId[] };

export interface StepTiming {
  readonly stepId: StepId;
  /** The step's own planned duration, where known (absent for a `beforeTarget` step). */
  readonly durationS?: number;
  readonly timing: Timing;
  /** `beforeTarget` steps only: the projection's warm-up reading, unchanged. */
  readonly warmup?: Warmup;
}

export interface GroupTiming {
  /** `component:<id>`, `mainDough` or `cooking`. */
  readonly id: string;
  readonly stepIds: readonly StepId[];
  readonly window: Window;
}

export interface RelativeTimeline {
  readonly steps: readonly StepTiming[];
  readonly groups: readonly GroupTiming[];
  readonly total: Window;
}

export interface RelativeTimelineOptions {
  /** The formula's component ids; absent = the components the process names. */
  readonly components?: ReadonlySet<string>;
}

// The scheduler works on instants; the offsets below are differences, so any origin gives the
// same result. It is internal and never appears in a returned value.
const INTERNAL_ORIGIN_MS = 0;

/** Window of a set of timings: no envelope unless every member is known (never a sum). */
export const windowOf = (timings: readonly StepTiming[]): Window => {
  const knownTimings = timings.flatMap((t) => (t.timing.status === 'known' ? [t.timing] : []));
  if (knownTimings.length === timings.length && timings.length > 0) {
    const startS = Math.min(...knownTimings.map((t) => t.startS));
    const endS = Math.max(...knownTimings.map((t) => t.endS));
    return { status: 'complete', startS, endS, elapsedS: endS - startS };
  }
  const reasons = [
    ...new Set(
      timings.flatMap((t) => {
        if (t.timing.status === 'known') return [];
        // An unavailable warm-up has no blocker step but itself.
        return t.timing.unknownAfter.length > 0 ? t.timing.unknownAfter : [t.stepId];
      }),
    ),
  ].sort();
  return { status: knownTimings.length > 0 ? 'partial' : 'unknown', reasons };
};

/**
 * Projects the process once from an internal origin and reads it as offsets from the earliest
 * planned start. Groups: one per component (subject), `mainDough`, `cooking`; a step belongs to
 * exactly one, cooking taking precedence.
 */
export const relativeTimeline = (
  process: Process,
  options: RelativeTimelineOptions = {},
): Result<RelativeTimeline, ProcessError> => {
  const projected = projectProcess(process, {
    mode: { kind: 'startAt', at: new Date(INTERNAL_ORIGIN_MS).toISOString() as Instant },
  });
  if (!projected.ok) return projected;
  const at = (instant: Instant | undefined): number | undefined =>
    instant === undefined ? undefined : Date.parse(instant) / 1000;
  const starts = process.steps.flatMap((s) => {
    const v = at(projected.value.steps[s.id]?.start);
    return v === undefined ? [] : [v];
  });
  const origin = starts.length > 0 ? Math.min(...starts) : 0;

  const steps: StepTiming[] = process.steps.map((step) => {
    const slot = projected.value.steps[step.id];
    const start = at(slot?.start);
    const end = at(slot?.end);
    const timing: Timing =
      start !== undefined && end !== undefined
        ? { status: 'known', startS: start - origin, endS: end - origin }
        : { status: 'unknown', unknownAfter: slot?.unknownAfter ?? [] };
    return {
      stepId: step.id,
      ...(step.plannedDurationS === undefined ? {} : { durationS: step.plannedDurationS }),
      timing,
      ...(slot?.warmup === undefined ? {} : { warmup: slot.warmup }),
    };
  });
  const timingOf = new Map(steps.map((s) => [s.stepId, s]));

  const components = options.components ?? componentIds(process);
  const cooking = new Set<StepId>();
  for (const step of process.steps) {
    if (isCookingStep(step) || step.operation === 'preheat') cooking.add(step.id);
  }
  for (const step of process.steps) {
    if (isCookingStep(step)) for (const id of descendants(process, step.id)) cooking.add(id);
  }
  const members = new Map<string, StepId[]>();
  const add = (group: string, id: StepId) =>
    members.set(group, [...(members.get(group) ?? []), id]);
  for (const step of process.steps) {
    if (cooking.has(step.id)) {
      add('cooking', step.id);
      continue;
    }
    const subject = subjectOf(process, step, components);
    add(subject.kind === 'component' ? `component:${subject.id}` : 'mainDough', step.id);
  }

  const order = (id: string) => (id === 'cooking' ? 2 : id === 'mainDough' ? 1 : 0);
  const groups: GroupTiming[] = [...members.entries()]
    .sort(([a], [b]) => order(a) - order(b)) // stable: components keep first-step order
    .map(([id, stepIds]) => ({
      id,
      stepIds,
      window: windowOf(stepIds.map((s) => timingOf.get(s) as StepTiming)),
    }));
  return ok({ steps, groups, total: windowOf(steps) });
};

export type TimelineAnchor =
  | { readonly kind: 'startAt'; readonly at: Instant }
  | { readonly kind: 'readyBy'; readonly at: Instant; readonly target: StepId };

export type AnchoredWindow =
  | {
      readonly status: 'complete';
      readonly start: Instant;
      readonly end: Instant;
      readonly elapsedS: number;
    }
  | { readonly status: 'partial' | 'unknown'; readonly reasons: readonly StepId[] };

export interface AnchoredTimeline {
  readonly anchor: TimelineAnchor;
  readonly steps: readonly {
    readonly stepId: StepId;
    readonly start?: Instant;
    readonly end?: Instant;
  }[];
  readonly groups: readonly { readonly id: string; readonly window: AnchoredWindow }[];
  readonly total: AnchoredWindow;
}

/**
 * The wall-clock view of a relative timeline (Planning): each instant is the anchor plus the
 * offset. With `readyBy` the origin is shifted so the target ends at `at`; it needs the target's
 * timing to be known, as in `projectProcess`.
 */
export const anchorTimeline = (
  timeline: RelativeTimeline,
  anchor: TimelineAnchor,
): Result<AnchoredTimeline, ProcessError> => {
  let originMs = Date.parse(anchor.at);
  if (anchor.kind === 'readyBy') {
    const target = timeline.steps.find((s) => s.stepId === anchor.target);
    if (target === undefined) {
      return err(
        domainError('UnknownReference', `mode.target references unknown ${anchor.target}`, {
          path: 'mode.target',
          id: anchor.target,
        }),
      );
    }
    if (target.timing.status !== 'known') {
      return err(
        domainError(
          'IncompatibleConstraint',
          'The target end depends on steps without a duration',
          {
            reason: `unknown durations before ${anchor.target}`,
            field: 'mode.target',
          },
        ),
      );
    }
    originMs -= target.timing.endS * 1000;
  }
  const instant = (s: number): Instant =>
    new Date(Math.round(originMs + s * 1000)).toISOString() as Instant;
  const win = (w: Window): AnchoredWindow =>
    w.status === 'complete'
      ? { status: 'complete', start: instant(w.startS), end: instant(w.endS), elapsedS: w.elapsedS }
      : w;
  return ok({
    anchor,
    steps: timeline.steps.map((s) => ({
      stepId: s.stepId,
      ...(s.timing.status === 'known'
        ? { start: instant(s.timing.startS), end: instant(s.timing.endS) }
        : {}),
    })),
    groups: timeline.groups.map((g) => ({ id: g.id, window: win(g.window) })),
    total: win(timeline.total),
  });
};

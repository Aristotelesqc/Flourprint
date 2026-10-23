import {
  foldSchedule,
  isStepHeld,
  liveProjection,
  type BakeState,
  type Instant,
  type ProcessStep,
  type ProjectedStep,
  type StepId,
} from '@flourprint/core/domain';

/**
 * What bake mode shows (#8 "what do I do now?"), read from the bake state and its live projection.
 * Presentation only: times come from the engine's projection, never recomputed here.
 */
export interface BakeStepView {
  readonly step: ProcessStep;
  readonly projected?: ProjectedStep;
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
  /** Every dependency has ended: the step can start now (an early start is the user's choice). */
  readonly ready: boolean;
}

export interface BakeView {
  /** The step to act on: the running step ending first, else the next step that can start. */
  readonly focus?: BakeStepView & { readonly running: boolean };
  /** Other running steps (parallel branches such as an overnight preferment). */
  readonly alsoRunning: readonly BakeStepView[];
  /** Steps that can start and whose planned start has come, besides the focus (preheat during proof). */
  readonly due: readonly BakeStepView[];
  /** Upcoming steps after the focus, in planned order. */
  readonly next: readonly BakeStepView[];
  /** 1-based position of the focus in planned order. */
  readonly position: number;
  readonly total: number;
  readonly allDone: boolean;
}

export interface LogEntry {
  readonly at: Instant;
  readonly kind: 'started' | 'completed' | 'note' | 'doughReady' | 'fold';
  readonly stepId?: StepId;
  readonly text?: string;
  /** Stable code of what the baker went by, for a dough ready mark. */
  readonly criterion?: string;
  /** Dough ready mark: the stage the dough was ready for (absent on marks before 0.6.0). */
  readonly stage?: 'shape' | 'bake';
  /** Overall rating of a review note, 0 to 5. */
  readonly rating?: number;
  /** Fold mark: the set done and the step's set count. */
  readonly set?: number;
  readonly count?: number;
}

const time = (instant: Instant | undefined): number =>
  instant === undefined ? Number.POSITIVE_INFINITY : Date.parse(instant);

/** Every step with its record and live projection, in process order. */
const stepViews = (state: BakeState, now: Instant): BakeStepView[] | undefined => {
  const process = state.process;
  const projection = liveProjection(state, now);
  if (!process || !projection?.ok) return undefined;
  const done = (id: StepId) => state.steps[id]?.endedAt !== undefined;
  return process.steps.map((step) => {
    const record = state.steps[step.id];
    const projected = projection.value.steps[step.id];
    return {
      step,
      ready:
        record?.startedAt === undefined &&
        record?.endedAt === undefined &&
        step.dependsOn.every(done),
      ...(projected === undefined ? {} : { projected }),
      ...(record?.startedAt === undefined ? {} : { startedAt: record.startedAt }),
      ...(record?.endedAt === undefined ? {} : { endedAt: record.endedAt }),
    };
  });
};

export const bakeView = (state: BakeState, now: Instant): BakeView | undefined => {
  const process = state.process;
  const views = stepViews(state, now);
  if (!process || !views) return undefined;
  const order = [...views].sort(
    (a, b) =>
      time(a.startedAt ?? a.projected?.start) - time(b.startedAt ?? b.projected?.start) ||
      process.steps.indexOf(a.step) - process.steps.indexOf(b.step),
  );
  const running = order
    .filter((v) => v.startedAt !== undefined && v.endedAt === undefined)
    .sort((a, b) => time(a.projected?.end) - time(b.projected?.end));
  const ready = order.filter((v) => v.ready);
  const focusView = running[0] ?? ready[0];
  const focus = focusView && { ...focusView, running: focusView.startedAt !== undefined };
  const upcoming = order.filter(
    (v) => v.startedAt === undefined && v.endedAt === undefined && v !== focusView,
  );

  const due = ready.filter((v) => v !== focusView && time(v.projected?.start) <= time(now));

  return {
    ...(focus === undefined ? {} : { focus }),
    alsoRunning: running.filter((v) => v !== focusView),
    due,
    next: upcoming.filter((v) => !due.includes(v)).slice(0, 3),
    position: focusView ? order.indexOf(focusView) + 1 : order.length,
    total: order.length,
    allDone: views.every((v) => v.endedAt !== undefined),
  };
};

/** Fold sets of a running step (bake-session.md): which are recorded, and the next one due. */
export interface FoldStatus {
  readonly count: number;
  /** Distinct sets recorded, in increasing order. */
  readonly done: readonly number[];
  /** The lowest set not recorded yet, with its due time from the recorded start. */
  readonly next?: { readonly set: number; readonly at: Instant };
}

export const foldStatus = (state: BakeState, stepId: StepId): FoldStatus | undefined => {
  const step = state.process?.steps.find((s) => s.id === stepId);
  const folds = step?.technique?.folds;
  const startedAt = state.steps[stepId]?.startedAt;
  if (!step || !folds || startedAt === undefined) return undefined;
  const done = [
    ...new Set(
      state.observations.flatMap((o) =>
        o.payload.kind === 'fold' && o.payload.stepId === stepId && o.payload.set !== undefined
          ? [o.payload.set]
          : [],
      ),
    ),
  ].sort((a, b) => a - b);
  const due = foldSchedule(step, startedAt);
  const index = due.findIndex((_, i) => !done.includes(i + 1));
  const at = due[index];
  return {
    count: folds.count,
    done,
    ...(at === undefined ? {} : { next: { set: index + 1, at } }),
  };
};

/** Starts, completions, dough ready marks, fold sets and notes, most recent first. */
export const bakeLog = (state: BakeState): LogEntry[] => {
  const entries: LogEntry[] = [];
  for (const [stepId, record] of Object.entries(state.steps)) {
    if (record.startedAt) entries.push({ at: record.startedAt, kind: 'started', stepId });
    if (record.endedAt) entries.push({ at: record.endedAt, kind: 'completed', stepId });
  }
  for (const observation of state.observations) {
    if (observation.payload.kind === 'doughReady') {
      const { stepId, stage, criterion, text } = observation.payload;
      entries.push({
        at: observation.occurredAt,
        kind: 'doughReady',
        ...(stepId === undefined ? {} : { stepId }),
        ...(stage === undefined ? {} : { stage }),
        ...(criterion === undefined ? {} : { criterion }),
        ...(text ? { text } : {}),
      });
    } else if (observation.payload.kind === 'fold') {
      const { stepId, set, text } = observation.payload;
      const count = state.process?.steps.find((s) => s.id === stepId)?.technique?.folds?.count;
      entries.push({
        at: observation.occurredAt,
        kind: 'fold',
        ...(stepId === undefined ? {} : { stepId }),
        ...(set === undefined ? {} : { set }),
        ...(count === undefined ? {} : { count }),
        ...(text ? { text } : {}),
      });
    } else if (observation.payload.text || observation.payload.rating !== undefined) {
      const { text, rating, stepId } = observation.payload;
      entries.push({
        at: observation.occurredAt,
        kind: 'note',
        ...(text ? { text } : {}),
        ...(rating === undefined ? {} : { rating }),
        ...(stepId === undefined ? {} : { stepId }),
      });
    }
  }
  return entries.sort((a, b) => time(b.at) - time(a.at));
};

/**
 * Share of a running step's planned time already elapsed, in [0, 1]. An instantaneous step (no
 * planned span) reads full once its planned instant is reached; it never ends the step itself.
 */
export const stepProgress = (startMs: number, endMs: number, nowMs: number): number => {
  if (![startMs, endMs, nowMs].every(Number.isFinite)) return 0;
  const span = endMs - startMs;
  if (!(span > 0)) return nowMs >= endMs ? 1 : 0;
  return Math.min(1, Math.max(0, (nowMs - startMs) / span));
};

/**
 * A moment the baker has to act: a running step ends, a ready step's planned start, or a fold set
 * of a running step falls due.
 */
export interface BakeAlert {
  readonly stepId: StepId;
  readonly kind: 'end' | 'start' | 'fold';
  readonly at: Instant;
  /** Fold alerts: the set due and the step's set count. */
  readonly set?: number;
  readonly count?: number;
}

/**
 * The coming moments to act on a bake, soonest first, read from the live projection. A step that
 * waits on a running one is not listed: the end of the running step already calls the baker. A
 * step whose countdown is held has no end alert until it is released.
 */
export const bakeAlerts = (state: BakeState, now: Instant): BakeAlert[] => {
  const views = state.status === 'active' ? stepViews(state, now) : undefined;
  if (!views) return [];
  const running = views.filter((v) => v.startedAt !== undefined && v.endedAt === undefined);
  const ready = views.filter((v) => v.ready);
  const alerts: BakeAlert[] = [
    // A step whose countdown is held has no end reminder: it moves with the clock, and the
    // release schedules it again from the new projection (bake-session.md, countdown hold).
    ...running.flatMap((v) =>
      v.projected?.end && !isStepHeld(state, v.step.id)
        ? [{ stepId: v.step.id, kind: 'end' as const, at: v.projected.end }]
        : [],
    ),
    ...ready.flatMap((v) =>
      v.projected?.start
        ? [{ stepId: v.step.id, kind: 'start' as const, at: v.projected.start }]
        : [],
    ),
    // Each fold set not recorded yet, at its due time from the recorded start (bake-session.md).
    ...running.flatMap((v) => {
      const folds = v.step.technique?.folds;
      if (!folds || v.startedAt === undefined) return [];
      const done = foldStatus(state, v.step.id)?.done ?? [];
      return foldSchedule(v.step, v.startedAt).flatMap((at, i) =>
        done.includes(i + 1)
          ? []
          : [{ stepId: v.step.id, kind: 'fold' as const, at, set: i + 1, count: folds.count }],
      );
    }),
  ];
  return alerts.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
};

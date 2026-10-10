import {
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
  readonly kind: 'started' | 'completed' | 'note' | 'doughReady';
  readonly stepId?: StepId;
  readonly text?: string;
  /** Stable code of what the baker went by, for a dough ready mark. */
  readonly criterion?: string;
}

const time = (instant: Instant | undefined): number =>
  instant === undefined ? Number.POSITIVE_INFINITY : Date.parse(instant);

export const bakeView = (state: BakeState, now: Instant): BakeView | undefined => {
  const process = state.process;
  const projection = liveProjection(state, now);
  if (!process || !projection?.ok) return undefined;

  const done = (id: StepId) => state.steps[id]?.endedAt !== undefined;
  const views: BakeStepView[] = process.steps.map((step) => {
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

/** Starts, completions, dough ready marks and notes, most recent first. */
export const bakeLog = (state: BakeState): LogEntry[] => {
  const entries: LogEntry[] = [];
  for (const [stepId, record] of Object.entries(state.steps)) {
    if (record.startedAt) entries.push({ at: record.startedAt, kind: 'started', stepId });
    if (record.endedAt) entries.push({ at: record.endedAt, kind: 'completed', stepId });
  }
  for (const observation of state.observations) {
    if (observation.payload.kind === 'doughReady') {
      entries.push({
        at: observation.occurredAt,
        kind: 'doughReady',
        ...(observation.payload.stepId === undefined ? {} : { stepId: observation.payload.stepId }),
        ...(observation.payload.criterion === undefined
          ? {}
          : { criterion: observation.payload.criterion }),
      });
    } else if (observation.payload.text) {
      entries.push({
        at: observation.occurredAt,
        kind: 'note',
        text: observation.payload.text,
        ...(observation.payload.stepId === undefined ? {} : { stepId: observation.payload.stepId }),
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

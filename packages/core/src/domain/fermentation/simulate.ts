import { progressPerHour, type FermentationParameters } from './model.js';

/** One stretch of time at one ambient temperature; `hours` is undefined for the open last step. */
export interface Segment {
  readonly hours?: number;
  readonly ambientC: number;
}

export interface SimulationInput {
  readonly freshPct: number;
  /** Dough temperature at the start of the first segment. */
  readonly startC: number;
  readonly segments: readonly Segment[];
  /** Progress `F*` of the end point (default 1). */
  readonly target?: number;
}

export type SimulationResult =
  /** Every segment has a duration: progress at the end (in the unit of `F`, not of the target). */
  | { readonly kind: 'progress'; readonly progress: number }
  /** The open last segment: hours it needs to reach the end point (0 if already reached). */
  | { readonly kind: 'remaining'; readonly hours: number; readonly reachedBefore: boolean }
  | { readonly kind: 'notReached' };

/** Integration step, hours. */
const DT_H = 0.05;
/** An open segment that has not reached the end point after this long never will, for us. */
export const MAX_OPEN_H = 21 * 24;
/** The same search horizon in seconds, as reported by `beyondHorizon` bounds. */
export const HORIZON_S = MAX_OPEN_H * 3600;

const temperatureAt = (p: FermentationParameters, fromC: number, ambientC: number, h: number) =>
  p.tauH === 0 ? ambientC : ambientC + (fromC - ambientC) * Math.exp(-h / p.tauH);

/** Progress gained over [h0, h1] of a segment (Simpson on one interval). */
const gain = (
  p: FermentationParameters,
  freshPct: number,
  fromC: number,
  ambientC: number,
  h0: number,
  h1: number,
) => {
  const f = (h: number) => progressPerHour(p, freshPct, temperatureAt(p, fromC, ambientC, h));
  return ((h1 - h0) / 6) * (f(h0) + 4 * f((h0 + h1) / 2) + f(h1));
};

/**
 * Forward model of docs/contracts/fermentation.md: one progress state, never reset between
 * segments; the dough temperature follows each ambient with a first-order lag.
 */
export const simulate = (p: FermentationParameters, input: SimulationInput): SimulationResult => {
  const target = input.target ?? 1;
  let progress = 0;
  let doughC = input.startC;
  for (const [index, segment] of input.segments.entries()) {
    const open = segment.hours === undefined;
    if (open && index !== input.segments.length - 1) throw new Error('only the last is open');
    if (open && progress >= target) return { kind: 'remaining', hours: 0, reachedBefore: true };
    const total = segment.hours ?? MAX_OPEN_H;
    const n = Math.max(1, Math.ceil(total / DT_H));
    const dt = total / n;
    for (let i = 0; i < n; i++) {
      const g = gain(p, input.freshPct, doughC, segment.ambientC, i * dt, (i + 1) * dt);
      if (open && progress + g >= target) {
        return {
          kind: 'remaining',
          hours: i * dt + (dt * (target - progress)) / g,
          reachedBefore: false,
        };
      }
      progress += g;
    }
    if (open) return { kind: 'notReached' };
    doughC = temperatureAt(p, doughC, segment.ambientC, total);
  }
  return { kind: 'progress', progress };
};

/**
 * Inverse model: the factor applied to the dose so that progress reaches the target at the end of a fully
 * planned schedule, by bisection on `simulate` (never a separate formula).
 */
export const solveDoseFactor = (
  p: FermentationParameters,
  input: SimulationInput,
): number | undefined => {
  const progressWith = (factor: number) => {
    const result = simulate(p, { ...input, freshPct: input.freshPct * factor });
    return result.kind === 'progress' ? result.progress : NaN;
  };
  let low = Math.log(1e-4);
  let high = Math.log(1e4);
  const target = input.target ?? 1;
  if (!(progressWith(Math.exp(high)) >= target) || progressWith(Math.exp(low)) >= target) {
    return undefined;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (progressWith(Math.exp(mid)) >= target) high = mid;
    else low = mid;
  }
  return Math.exp((low + high) / 2);
};

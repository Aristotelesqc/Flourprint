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
}

export type SimulationResult =
  /** Every segment has a duration: progress at the end (1 = end point). */
  | { readonly kind: 'progress'; readonly progress: number }
  /** The open last segment: hours it needs to reach the end point (0 if already reached). */
  | { readonly kind: 'remaining'; readonly hours: number; readonly reachedBefore: boolean }
  | { readonly kind: 'notReached' };

/** Integration step, hours. */
const DT_H = 0.05;
/** An open segment that has not reached the end point after this long never will, for us. */
export const MAX_OPEN_H = 21 * 24;

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
  let progress = 0;
  let doughC = input.startC;
  for (const [index, segment] of input.segments.entries()) {
    const open = segment.hours === undefined;
    if (open && index !== input.segments.length - 1) throw new Error('only the last is open');
    if (open && progress >= 1) return { kind: 'remaining', hours: 0, reachedBefore: true };
    const total = segment.hours ?? MAX_OPEN_H;
    const n = Math.max(1, Math.ceil(total / DT_H));
    const dt = total / n;
    for (let i = 0; i < n; i++) {
      const g = gain(p, input.freshPct, doughC, segment.ambientC, i * dt, (i + 1) * dt);
      if (open && progress + g >= 1) {
        return {
          kind: 'remaining',
          hours: i * dt + (dt * (1 - progress)) / g,
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
 * Inverse model: the factor applied to the dose so that progress reaches 1 at the end of a fully
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
  if (!(progressWith(Math.exp(high)) >= 1) || progressWith(Math.exp(low)) >= 1) return undefined;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (progressWith(Math.exp(mid)) >= 1) high = mid;
    else low = mid;
  }
  return Math.exp((low + high) / 2);
};

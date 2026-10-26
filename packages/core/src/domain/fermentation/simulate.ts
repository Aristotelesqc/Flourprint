import { DEFAULT_LAG, type SegmentLag } from './lag.js';
import {
  DOMAIN,
  GAS_CONSTANT,
  progressPerHour,
  T_REF_K,
  type FermentationParameters,
} from './model.js';
import { SEMENOV_LIMIT, semenovPsi } from './thermal.js';

/**
 * One stretch of time at one ambient temperature; `hours` is undefined for the open step. A step
 * without `lag` has the default lag (fermentation.md, Scope and default).
 */
export interface Segment {
  readonly hours?: number;
  readonly ambientC: number;
  /** Lag and self-heating of the step's dough (thermal inputs); absent = the default lag. */
  readonly lag?: SegmentLag;
  /**
   * A measured mean dough temperature at the start of the segment, which replaces the simulated
   * state from there for every path (fermentation.md, Dough temperature).
   */
  readonly resetC?: number;
}

export interface SimulationInput {
  readonly freshPct: number;
  /** Dough temperature at the start of the first segment. */
  readonly startC: number;
  readonly segments: readonly Segment[];
  /** Progress `F*` of the end point (default 1). */
  readonly target?: number;
}

/** The state at the end of a segment: progress `F` and the mean dough temperature. */
export interface SegmentEnd {
  readonly progress: number;
  readonly doughC: number;
}

/**
 * The simulation refuses to integrate a runaway (fermentation.md, Self-heating): the Semenov test
 * failed, or the dough reached the temperature gate of the Domain table.
 */
export interface Unbounded {
  readonly kind: 'unbounded';
  readonly reason: 'self_heating_unbounded' | 'temperature_outside_domain';
}

export type SimulationResult =
  /** Every segment has a duration: progress at the end (in the unit of `F`, not of the target). */
  | { readonly kind: 'progress'; readonly progress: number; readonly ends: readonly SegmentEnd[] }
  /** The open last segment: hours it needs to reach the end point (0 if already reached). */
  | { readonly kind: 'remaining'; readonly hours: number; readonly reachedBefore: boolean }
  | { readonly kind: 'notReached' }
  | Unbounded;

/** Integration step, hours. */
const DT_H = 0.05;
/** An open segment that has not reached the end point after this long never will, for us. */
export const MAX_OPEN_H = 21 * 24;
/** The same search horizon in seconds, as reported by `beyondHorizon` bounds. */
export const HORIZON_S = MAX_OPEN_H * 3600;

/**
 * Once the dough is within this of the ambient (°C), the rest of the segment is integrated in
 * closed form: the rate is linearized around the ambient, `f ≈ f_a × (1 + κ δ e^(−h/τ))`, whose
 * integral is exact; the neglected term is of order (κ δ)², about 1e-6 of the rate here. Long cold
 * retards would otherwise cost thousands of integration steps. Same model, same equations.
 */
const SETTLED_C = 0.01;

const unbounded = (reason: Unbounded['reason']): Unbounded => ({ kind: 'unbounded', reason });

/**
 * The lag of the path at one instant (fermentation.md, The band and the envelope): the `upper`
 * path takes `τ` at the top of the step's band while the dough is above its ambient (it stays
 * warm) and at the bottom while it is below (it warms at once); the `lower` path the opposite.
 */
const tauFor = (
  path: FermentationParameters['path'],
  lag: SegmentLag,
  doughC: number,
  ambientC: number,
): number =>
  path === 'central'
    ? lag.tauH.central
    : doughC >= ambientC === (path === 'upper')
      ? lag.tauH.high
      : lag.tauH.low;

/** `ΔT_ad` of the path: the top of its range for `upper`, the bottom for `lower`. */
const heatingFor = (path: FermentationParameters['path'], lag: SegmentLag): number =>
  path === 'central'
    ? lag.heatingK.central
    : path === 'upper'
      ? lag.heatingK.high
      : lag.heatingK.low;

// --- Steps without self-heating: closed-form temperature ------------------------------------

const temperatureAt = (tau: number, fromC: number, ambientC: number, h: number) =>
  tau === 0 ? ambientC : ambientC + (fromC - ambientC) * Math.exp(-h / tau);

interface Tail {
  /** Rate at the ambient, per hour. */
  readonly rate: number;
  /** Progress gained over the next `hours`. */
  readonly over: (hours: number) => number;
  /** Hours needed to gain `needed`, or undefined beyond `within`. */
  readonly hoursFor: (needed: number, within: number) => number | undefined;
}

/** The closed-form rest of a segment from `h`, when the dough is settled there. */
const tailFrom = (
  p: FermentationParameters,
  freshPct: number,
  tau: number,
  fromC: number,
  ambientC: number,
  h: number,
): Tail | undefined => {
  const delta = temperatureAt(tau, fromC, ambientC, h) - ambientC;
  if (Math.abs(delta) >= SETTLED_C) return undefined;
  const rate = progressPerHour(p, freshPct, ambientC);
  // d ln f / dT at the ambient, numerically, so that this does not restate the rate law.
  const eps = 0.01;
  const kappa =
    rate > 0
      ? (Math.log(progressPerHour(p, freshPct, ambientC + eps)) -
          Math.log(progressPerHour(p, freshPct, ambientC - eps))) /
        (2 * eps)
      : 0;
  const over = (hours: number) =>
    rate * (hours + (tau === 0 ? 0 : kappa * delta * tau * (1 - Math.exp(-hours / tau))));
  const hoursFor = (needed: number, within: number) => {
    if (needed <= 0) return 0;
    if (!(rate > 0) || over(within) < needed) return undefined;
    let hours = Math.min(within, needed / rate);
    for (let i = 0; i < 20; i++) {
      const slope = rate * (1 + (tau === 0 ? 0 : kappa * delta * Math.exp(-hours / tau)));
      const next = Math.min(within, Math.max(0, hours - (over(hours) - needed) / slope));
      if (Math.abs(next - hours) < 1e-12) return next;
      hours = next;
    }
    return hours;
  };
  return { rate, over, hoursFor };
};

/** Progress gained over [h0, h1] of a segment (Simpson on one interval). */
const gain = (
  p: FermentationParameters,
  freshPct: number,
  tau: number,
  fromC: number,
  ambientC: number,
  h0: number,
  h1: number,
) => {
  const f = (h: number) => progressPerHour(p, freshPct, temperatureAt(tau, fromC, ambientC, h));
  return ((h1 - h0) / 6) * (f(h0) + 4 * f((h0 + h1) / 2) + f(h1));
};

/** The outcome of running one segment. */
type Run =
  | { readonly kind: 'end'; readonly progress: number; readonly doughC: number }
  /** An open segment reached the target after `hours`. */
  | { readonly kind: 'reached'; readonly hours: number }
  | { readonly kind: 'notReached' }
  | Unbounded;

const closedSegment = (
  p: FermentationParameters,
  freshPct: number,
  from: SegmentEnd,
  segment: Segment,
  lag: SegmentLag,
  target: number,
): Run => {
  const open = segment.hours === undefined;
  const tau = tauFor(p.path, lag, from.doughC, segment.ambientC);
  const total = segment.hours ?? MAX_OPEN_H;
  const n = Math.max(1, Math.ceil(total / DT_H));
  const dt = total / n;
  let progress = from.progress;
  for (let i = 0; i < n; i++) {
    const tail = tailFrom(p, freshPct, tau, from.doughC, segment.ambientC, i * dt);
    if (tail) {
      const left = total - i * dt;
      if (open) {
        const needed = tail.hoursFor(target - progress, left);
        return needed === undefined
          ? { kind: 'notReached' }
          : { kind: 'reached', hours: i * dt + needed };
      }
      progress += tail.over(left);
      break;
    }
    const g = gain(p, freshPct, tau, from.doughC, segment.ambientC, i * dt, (i + 1) * dt);
    if (open && progress + g >= target) {
      return { kind: 'reached', hours: i * dt + (dt * (target - progress)) / g };
    }
    progress += g;
  }
  if (open) return { kind: 'notReached' };
  return {
    kind: 'end',
    progress,
    doughC: temperatureAt(tau, from.doughC, segment.ambientC, total),
  };
};

// --- Steps with self-heating: dT/dt = (T_amb − T)/τ + ΔT_ad · rate(T) ------------------------

const heatedSegment = (
  p: FermentationParameters,
  freshPct: number,
  from: SegmentEnd,
  segment: Segment,
  lag: SegmentLag,
  target: number,
): Run => {
  const open = segment.hours === undefined;
  const ambientC = segment.ambientC;
  const heating = heatingFor(p.path, lag);
  const scale = freshPct > 0 ? freshPct ** p.k / p.aH : 0;
  const rateAt = (c: number) =>
    scale * Math.exp((p.eaJ / GAS_CONSTANT) * (1 / T_REF_K - 1 / (c + 273.15)));
  const tauAt = (c: number) => Math.max(tauFor(p.path, lag, c, ambientC), 1e-6);

  // The Semenov bound, in the regime where the equilibrium lies (above the ambient): an
  // equilibrium exists only if ψ ≤ 1/e, and the forecast never integrates a runaway.
  const psi = semenovPsi(p.eaJ, ambientC, tauAt(ambientC), heating, rateAt(ambientC));
  if (psi > SEMENOV_LIMIT) return unbounded('self_heating_unbounded');

  const f = (c: number) => (ambientC - c) / tauAt(c) + heating * rateAt(c);
  const tauSmall = p.path === 'central' ? lag.tauH.central : Math.min(lag.tauH.low, lag.tauH.high);
  const h0 = Math.min(0.1, Math.max(0.005, tauSmall / 6));
  const total = segment.hours ?? MAX_OPEN_H;
  const n = Math.max(1, Math.ceil(total / h0));
  const dt = total / n;
  let c = from.doughC;
  let progress = from.progress;
  for (let i = 0; i < n; i++) {
    // Settled on the moving equilibrium: the rest is closed form around it (see SETTLED_C).
    const tau = tauAt(c);
    const r = rateAt(c);
    const kappaHere = p.eaJ / (GAS_CONSTANT * (c + 273.15) ** 2);
    const slope = 1 / tau - heating * r * kappaHere;
    const fHere = (ambientC - c) / tau + heating * r;
    if (slope > 1e-9 && Math.abs(fHere) / slope < SETTLED_C) {
      const star = c + fHere / slope;
      if (star > DOMAIN.maxDoughC) return unbounded('temperature_outside_domain');
      const delta = c - star;
      const rStar = rateAt(star);
      const kappa = p.eaJ / (GAS_CONSTANT * (star + 273.15) ** 2);
      const lambda = 1 / tauAt(star) - heating * rStar * kappa;
      if (lambda > 1e-9) {
        const left = total - i * dt;
        const over = (hours: number) =>
          rStar * (hours + (kappa * delta * (1 - Math.exp(-lambda * hours))) / lambda);
        if (open) {
          const needed = target - progress;
          if (needed <= 0) return { kind: 'reached', hours: i * dt };
          if (!(rStar > 0) || over(left) < needed) return { kind: 'notReached' };
          let hours = Math.min(left, needed / rStar);
          for (let k = 0; k < 20; k++) {
            const d = rStar * (1 + kappa * delta * Math.exp(-lambda * hours));
            const next = Math.min(left, Math.max(0, hours - (over(hours) - needed) / d));
            if (Math.abs(next - hours) < 1e-12) {
              hours = next;
              break;
            }
            hours = next;
          }
          return { kind: 'reached', hours: i * dt + hours };
        }
        return {
          kind: 'end',
          progress: progress + over(left),
          doughC: star + delta * Math.exp(-lambda * left),
        };
      }
    }
    // One step of RK4 on (T, F).
    const k1 = fHere;
    const r1 = r;
    const c2 = c + (dt / 2) * k1;
    const r2 = rateAt(c2);
    const k2 = f(c2);
    const c3 = c + (dt / 2) * k2;
    const r3 = rateAt(c3);
    const k3 = f(c3);
    const c4 = c + dt * k3;
    const r4 = rateAt(c4);
    const k4 = f(c4);
    const next = c + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    const g = (dt / 6) * (r1 + 2 * r2 + 2 * r3 + r4);
    if (!(next <= DOMAIN.maxDoughC)) return unbounded('temperature_outside_domain');
    if (open && progress + g >= target) {
      return { kind: 'reached', hours: i * dt + (dt * (target - progress)) / g };
    }
    progress += g;
    c = next;
  }
  if (open) return { kind: 'notReached' };
  return { kind: 'end', progress, doughC: c };
};

/** Runs one segment from `from`. */
const runSegment = (
  p: FermentationParameters,
  freshPct: number,
  from: SegmentEnd,
  segment: Segment,
  target: number,
): Run => {
  const lag = segment.lag ?? DEFAULT_LAG;
  const start = segment.resetC === undefined ? from : { ...from, doughC: segment.resetC };
  if (heatingFor(p.path, lag) === 0) return closedSegment(p, freshPct, start, segment, lag, target);
  // A step with no time in it changes nothing, whatever its lag.
  if (segment.hours !== undefined && segment.hours <= 0) return { kind: 'end', ...start };
  return heatedSegment(p, freshPct, start, segment, lag, target);
};

/**
 * Forward model of docs/contracts/fermentation.md: one progress state, never reset between
 * segments; the dough temperature follows each ambient with a first-order lag, and warms by
 * itself in a step with thermal inputs. The path of `p` picks, at every instant, the lag within
 * the step's band (The band and the envelope).
 */
export const simulate = (p: FermentationParameters, input: SimulationInput): SimulationResult => {
  const target = input.target ?? 1;
  let state: SegmentEnd = { progress: 0, doughC: input.startC };
  const ends: SegmentEnd[] = [];
  for (const [index, segment] of input.segments.entries()) {
    const open = segment.hours === undefined;
    if (open && index !== input.segments.length - 1) throw new Error('only the last is open');
    if (open && state.progress >= target)
      return { kind: 'remaining', hours: 0, reachedBefore: true };
    const run = runSegment(p, input.freshPct, state, segment, target);
    switch (run.kind) {
      case 'unbounded':
      case 'notReached':
        return run;
      case 'reached':
        return { kind: 'remaining', hours: run.hours, reachedBefore: false };
      case 'end':
        state = { progress: run.progress, doughC: run.doughC };
        ends.push(state);
    }
  }
  return { kind: 'progress', progress: state.progress, ends };
};

/** Runs one planned segment, with the same steps as `simulate`. */
const advance = (
  p: FermentationParameters,
  freshPct: number,
  state: SegmentEnd,
  segment: Segment & { readonly hours: number },
): SegmentEnd | Unbounded => {
  const run = runSegment(p, freshPct, state, segment, Infinity);
  return run.kind === 'end'
    ? { progress: run.progress, doughC: run.doughC }
    : run.kind === 'unbounded'
      ? run
      : state;
};

/**
 * The hours the one open segment needs so that progress reaches the target at the end of the
 * schedule, every other segment as planned (fermentation.md, Model-driven duration). An open last
 * segment is `simulate`; an open earlier one is solved by bisection on the same forward model,
 * never by a separate formula. Segments other than the open one need their hours.
 */
export const solveOpenSegment = (
  p: FermentationParameters,
  input: SimulationInput,
): SimulationResult => {
  const index = input.segments.findIndex((s) => s.hours === undefined);
  if (index < 0 || index === input.segments.length - 1) return simulate(p, input);
  const target = input.target ?? 1;
  const planned = (s: Segment): Segment & { hours: number } => ({ ...s, hours: s.hours ?? 0 });
  let start: SegmentEnd = { progress: 0, doughC: input.startC };
  for (const s of input.segments.slice(0, index)) {
    const next = advance(p, input.freshPct, start, planned(s));
    if ('kind' in next) return next;
    start = next;
  }
  const open = input.segments[index] as Segment;
  const tail = input.segments.slice(index + 1).map(planned);
  // Progress at the end of the schedule if the open segment lasts `hours`; a runaway counts as
  // "enough" while searching, and is reported only if the solution itself lies in it.
  const at = (hours: number): number | Unbounded => {
    let state = advance(p, input.freshPct, start, { ...open, hours });
    for (const s of tail) {
      if ('kind' in state) return state;
      state = advance(p, input.freshPct, state, s);
    }
    return 'kind' in state ? state : state.progress;
  };
  const value = (hours: number) => {
    const r = at(hours);
    return typeof r === 'number' ? r : Infinity;
  };
  if (value(0) >= target) {
    const r = at(0);
    return typeof r === 'number' ? { kind: 'remaining', hours: 0, reachedBefore: true } : r;
  }
  // Doubling, then bisection: the open step is usually hours, not weeks.
  let low = 0;
  let high = 1;
  while (value(high) < target) {
    if (high >= MAX_OPEN_H) return { kind: 'notReached' };
    low = high;
    high = Math.min(MAX_OPEN_H, high * 2);
  }
  for (let i = 0; i < 30 && high - low > 1e-4; i++) {
    const mid = (low + high) / 2;
    if (value(mid) >= target) high = mid;
    else low = mid;
  }
  const solved = (low + high) / 2;
  const check = at(solved);
  if (typeof check !== 'number') return check;
  return { kind: 'remaining', hours: solved, reachedBefore: false };
};

export type DoseFactorResult =
  { readonly kind: 'factor'; readonly factor: number } | { readonly kind: 'none' } | Unbounded;

/**
 * Inverse model: the factor applied to the dose so that progress reaches the target at the end of a fully
 * planned schedule, by bisection on `simulate` (never a separate formula). A runaway at some dose
 * counts as "enough" while searching; if the solution itself lies in one, it is reported.
 */
export const solveDoseFactor = (
  p: FermentationParameters,
  input: SimulationInput,
): DoseFactorResult => {
  const run = (factor: number) => simulate(p, { ...input, freshPct: input.freshPct * factor });
  const progressWith = (factor: number) => {
    const result = run(factor);
    if (result.kind === 'unbounded') return Infinity;
    return result.kind === 'progress' ? result.progress : NaN;
  };
  let low = Math.log(1e-4);
  let high = Math.log(1e4);
  const target = input.target ?? 1;
  if (!(progressWith(Math.exp(high)) >= target) || progressWith(Math.exp(low)) >= target) {
    return { kind: 'none' };
  }
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (progressWith(Math.exp(mid)) >= target) high = mid;
    else low = mid;
  }
  const factor = Math.exp((low + high) / 2);
  const check = run(factor);
  return check.kind === 'unbounded' ? check : { kind: 'factor', factor };
};

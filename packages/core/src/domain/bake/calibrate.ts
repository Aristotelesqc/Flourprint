import { domainError, type DomainError } from '../errors.js';
import {
  CENTRAL,
  guggenheim,
  progressPerHour,
  SELF_HEATING_K,
  semenovPsi,
  setFactor,
  TRANSIENT_SHARE,
  twoPointTauH,
  type CalibrationError,
  type ThermalKey,
  type ThermalReading,
  type ThermalSet,
} from '../fermentation/index.js';
import type { Instant } from '../instant.js';
import type { StepId } from '../process/types.js';
import { err, ok, type Result } from '../result.js';
import { liveContext } from './forecast.js';
import { thermalSegments } from './thermal.js';
import type { BakeState } from './types.js';

/**
 * The personal thermal factor from the `doughTemperature` readings of one step of a Preparation
 * (docs/contracts/fermentation.md, Personal correction; bake-session.md): one calibration set per
 * bake and step. Readings are kept with the thermal segment that was in force; the set uses the
 * readings of one segment taken after the initial transient, at a stable ambient.
 */

export interface CalibrationOptions {
  readonly method: 'twoPoint' | 'guggenheim';
  /** Which thermal segment of the step to use (default: the last one). */
  readonly segment?: number;
  /** The fermenting mass in grams, overriding the formula's. */
  readonly massG?: number;
}

/** What a calibration gives: the set to store under its key, and how it was computed. */
export interface StepCalibration {
  readonly key: ThermalKey;
  readonly set: ThermalSet;
  /** `τ_obs` from the readings, hours. */
  readonly tauObsH: number;
  /** `τ_eff` of the model for this step, hours. */
  readonly tauEffH: number;
  /** `ψ₁`: the Semenov number at the reading's ambient with the model's lag and factor 1. */
  readonly psi: number;
  /** `ψ = f · ψ₁` of the fitted factor (the coupled stretch the factor removes). */
  readonly psiOfFactor: number;
  /** Guggenheim only: the temperature the readings tend to, which captures a shelf offset. */
  readonly infinityC?: number;
}

export type CalibrationUnavailable = DomainError<'CalibrationUnavailable', { reason: string }>;

const unavailable = (reason: string) =>
  err(domainError('CalibrationUnavailable', `No calibration: ${reason}`, { reason }));

/** Equal spacing for Guggenheim: the two gaps differ by at most this share of their mean. */
const SPACING_TOLERANCE = 0.1;

export const calibrateStepThermal = (
  state: BakeState,
  stepId: StepId,
  now: Instant,
  options: CalibrationOptions,
): Result<StepCalibration, CalibrationError | CalibrationUnavailable> => {
  const segments = thermalSegments(state, stepId);
  const index = options.segment ?? segments.length - 1;
  const segment = segments[index];
  if (segment?.thermal === undefined) return unavailable('the step has no thermal inputs');
  const fromMs = Date.parse(segment.from);
  const toMs =
    segments[index + 1] === undefined
      ? Math.min(Date.parse(state.steps[stepId]?.endedAt ?? now), Date.parse(now))
      : Date.parse((segments[index + 1] as { from: Instant }).from);

  // A calibration is read after the bake as well: readings are facts of an ended session too.
  // No stored profile is given: the set depends on the readings and the model only, never on
  // factors stored earlier (fermentation.md, Personal correction).
  const context = liveContext(state, now, {
    includeEnded: true,
    ...(options.massG === undefined ? {} : { massG: options.massG }),
  });
  if (context === undefined || 'status' in context.mass) return unavailable('no forecast');
  const { mass, stretches } = context;
  const own = stretches.flatMap((s, i) =>
    s.unit.step.id === stepId && s.fromMs >= fromMs && s.fromMs < toMs ? [i] : [],
  );
  const first = own[0];
  const lag = mass.thermal?.find((l) => l.unit === first);
  const ambients = new Set(own.map((i) => stretches[i]?.unit.ambientC));
  if (first === undefined || lag === undefined) return unavailable('the segment has no stretch');
  if (ambients.size !== 1) {
    return unavailable('the ambient changed during the segment: no stable ambient');
  }
  const ambientC = stretches[first]?.unit.ambientC as number;

  // Readings of the segment, after the initial transient.
  const taken = state.observations
    .flatMap((o) => {
      const p = o.payload;
      if (p.kind !== 'doughTemperature' || p.stepId !== stepId || p.measurement === undefined) {
        return [];
      }
      const atMs = Date.parse(p.measurement.observedAt);
      return atMs >= fromMs && atMs <= toMs
        ? [{ eventId: o.eventId, tH: (atMs - fromMs) / 3_600_000, c: p.measurement.value }]
        : [];
    })
    .sort((a, b) => a.tH - b.tH);
  const usable = taken.filter((r) => r.tH >= TRANSIENT_SHARE * lag.tauEffH);

  let used: readonly (ThermalReading & { readonly eventId: string })[];
  let tauObsH: number;
  let infinityC: number | undefined;
  if (options.method === 'twoPoint') {
    const a = usable[0];
    const b = usable.at(-1);
    if (a === undefined || b === undefined || a === b) {
      return err(
        domainError('readings_invalid', 'readings_invalid: two readings are needed', {
          reason: 'fewer than two readings after the transient',
        }),
      );
    }
    const tau = twoPointTauH(a, b, ambientC);
    if (!tau.ok) return tau;
    used = [a, b];
    tauObsH = tau.value;
  } else {
    // The widest equally spaced triple that gives a valid result (Guggenheim needs equal gaps);
    // a failed wider triple does not hide a narrower valid one. Ties go to the earliest triple.
    type Reading = (typeof usable)[number];
    let best: { triple: [Reading, Reading, Reading]; tauH: number; infinityC: number } | undefined;
    let firstFailure: Result<never, CalibrationError> | undefined;
    let spaced = 0;
    for (const [i, x] of usable.entries()) {
      for (const [j, y] of usable.entries()) {
        if (j <= i) continue;
        for (const z of usable.slice(j + 1)) {
          const gap1 = y.tH - x.tH;
          const gap2 = z.tH - y.tH;
          if (Math.abs(gap1 - gap2) > SPACING_TOLERANCE * ((gap1 + gap2) / 2)) continue;
          spaced += 1;
          const g = guggenheim(x.c, y.c, z.c, (z.tH - x.tH) / 2);
          if (!g.ok) {
            firstFailure ??= g;
            continue;
          }
          if (best === undefined || z.tH - x.tH > best.triple[2].tH - best.triple[0].tH) {
            best = { triple: [x, y, z], tauH: g.value.tauH, infinityC: g.value.infinityC };
          }
        }
      }
    }
    if (best === undefined) {
      if (spaced > 0 && firstFailure !== undefined) return firstFailure;
      return err(
        domainError('readings_invalid', 'readings_invalid: no three equally spaced readings', {
          reason: 'no three readings after the transient are equally spaced',
        }),
      );
    }
    used = best.triple;
    tauObsH = best.tauH;
    infinityC = best.infinityC;
  }

  const dose = mass.yeasts.reduce((sum, y) => sum + y.pct * CENTRAL.freshPerGram[y.form], 0);
  // ψ₁: the model's own lag (never `f · τ_eff` of a stored factor), the central ΔT_ad, factor 1.
  const psi = semenovPsi(
    CENTRAL.eaJ,
    ambientC,
    lag.tauEffH,
    SELF_HEATING_K.central,
    progressPerHour(CENTRAL, dose, ambientC),
  );
  const factor = setFactor(tauObsH, lag.tauEffH, psi);
  if (!factor.ok) return factor;
  return ok({
    key: lag.key,
    set: {
      factor: factor.value,
      massG: lag.massG,
      geometry: segment.thermal.geometry,
      readings: used.length,
      basis: { bakeId: state.bakeId, stepId, eventIds: used.map((r) => r.eventId) },
    },
    tauObsH,
    tauEffH: lag.tauEffH,
    psi,
    psiOfFactor: factor.value * psi,
    ...(infinityC === undefined ? {} : { infinityC }),
  });
};

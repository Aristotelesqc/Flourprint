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
  type ThermalProfile,
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
  /** The stored profile in force: the factor already applied is part of `ψ`. */
  readonly thermalProfile?: ThermalProfile;
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
  /** `ψ` of the reading's ambient. */
  readonly psi: number;
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

  const context = liveContext(state, now, {
    ...(options.thermalProfile === undefined ? {} : { thermalProfile: options.thermalProfile }),
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
    const a = usable[0];
    const c = usable.at(-1);
    const middle = usable
      .slice(1, -1)
      .sort(
        (x, y) =>
          Math.abs(x.tH - ((a?.tH ?? 0) + (c?.tH ?? 0)) / 2) -
          Math.abs(y.tH - ((a?.tH ?? 0) + (c?.tH ?? 0)) / 2),
      )[0];
    if (a === undefined || c === undefined || middle === undefined) {
      return err(
        domainError('readings_invalid', 'readings_invalid: three readings are needed', {
          reason: 'fewer than three readings after the transient',
        }),
      );
    }
    const gap1 = middle.tH - a.tH;
    const gap2 = c.tH - middle.tH;
    if (Math.abs(gap1 - gap2) > SPACING_TOLERANCE * ((gap1 + gap2) / 2)) {
      return err(
        domainError('readings_invalid', 'readings_invalid: not equally spaced', {
          reason: 'the readings are not equally spaced',
        }),
      );
    }
    const g = guggenheim(a.c, middle.c, c.c, (gap1 + gap2) / 2);
    if (!g.ok) return g;
    used = [a, middle, c];
    tauObsH = g.value.tauH;
    infinityC = g.value.infinityC;
  }

  const dose = mass.yeasts.reduce((sum, y) => sum + y.pct * CENTRAL.freshPerGram[y.form], 0);
  const psi = semenovPsi(
    CENTRAL.eaJ,
    ambientC,
    lag.effectiveTauH.central,
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
    ...(infinityC === undefined ? {} : { infinityC }),
  });
};

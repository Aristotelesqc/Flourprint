import { domainError, type DomainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { FACTOR_BOUNDS } from './thermal-profile.js';

/**
 * Estimators of the personal thermal factor (docs/contracts/fermentation.md, Personal correction,
 * Estimators): from the readings of a probe after a step to a stable ambient. They calibrate a
 * personal factor and nothing else; a reading never rewrites a constant of the contract.
 */

/** A reading: time in hours (any origin) and temperature in °C. */
export interface ThermalReading {
  readonly tH: number;
  readonly c: number;
}

/** The three ways a calibration is refused (fermentation.md, Flags and limits). */
export type CalibrationFlag =
  'readings_invalid' | 'self_heating_confounds' | 'thermal_factor_implausible';

export type CalibrationError = DomainError<CalibrationFlag, { reason: string }>;

const refused = (flag: CalibrationFlag, reason: string): CalibrationError =>
  domainError(flag, `${flag}: ${reason}`, { reason });

/** `ψ` above this makes the readings unusable for the factor (the heat is not removed). */
export const PSI_CONFOUNDS = 0.1;
/** Readings before this share of `τ_eff` after the step are kept in the journal but not used. */
export const TRANSIENT_SHARE = 0.5;

/**
 * Two points, the first and the last reading taken after the initial transient, with `T_amb`
 * known: `τ_obs = (t₂ − t₁) / ln((T₁ − T_amb)/(T₂ − T_amb))`. The late-time slope is the same at
 * the core and on average, so it does not depend on the probe position.
 */
export const twoPointTauH = (
  first: ThermalReading,
  last: ThermalReading,
  ambientC: number,
): Result<number, CalibrationError> => {
  const a = first.c - ambientC;
  const b = last.c - ambientC;
  const tau = (last.tH - first.tH) / Math.log(a / b);
  // The dough must approach the ambient: same side, closer, time moving forward.
  if (
    !(last.tH > first.tH) ||
    !(a * b > 0) ||
    !(Math.abs(a) > Math.abs(b)) ||
    !(tau > 0) ||
    !Number.isFinite(tau)
  ) {
    return err(refused('readings_invalid', 'the readings do not approach the ambient'));
  }
  return ok(tau);
};

/**
 * Three equally spaced points (Guggenheim, `Δt` apart): `τ_obs = Δt / ln((T₁ − T₂)/(T₂ − T₃))`,
 * `T∞ = (T₁T₃ − T₂²)/(T₁ − 2T₂ + T₃)`. It also gives `T∞`, which captures a shelf offset or
 * self-heating without knowing the shelf temperature. A set with `(T₁ − T₂)/(T₂ − T₃) ≤ 1` or a
 * non-finite result is rejected.
 */
export const guggenheim = (
  t1: number,
  t2: number,
  t3: number,
  dtH: number,
): Result<{ readonly tauH: number; readonly infinityC: number }, CalibrationError> => {
  const ratio = (t1 - t2) / (t2 - t3);
  const tauH = dtH / Math.log(ratio);
  const infinityC = (t1 * t3 - t2 * t2) / (t1 - 2 * t2 + t3);
  if (
    !(dtH > 0) ||
    !(ratio > 1) ||
    !Number.isFinite(tauH) ||
    !(tauH > 0) ||
    !Number.isFinite(infinityC)
  ) {
    return err(refused('readings_invalid', 'the three readings are not a decay'));
  }
  return ok({ tauH, infinityC });
};

/**
 * The factor of a calibration set. The observed lag is the coupled one,
 * `τ_obs = f · τ_eff / (1 − ψ)` with `ψ = f · ψ₁`, where `ψ₁` is the Semenov number at the
 * reading's ambient with the model's `τ_eff` and factor 1. With `r = τ_obs / τ_eff`, solving
 * `f = r · (1 − f · ψ₁)` gives `f = r / (1 + r · ψ₁)`: the readings and the model only, never a
 * factor stored earlier. A set with `f · ψ₁ > 0.1` is rejected (`self_heating_confounds`); a factor
 * outside 0.25 to 4 is refused (`thermal_factor_implausible`, a guard against a wrong probe
 * position). With `ψ₁ = 0` the factor is `r`.
 */
export const setFactor = (
  tauObsH: number,
  tauEffH: number,
  psi1: number,
): Result<number, CalibrationError> => {
  const r = tauObsH / tauEffH;
  const factor = r / (1 + r * psi1);
  if (!(factor * psi1 <= PSI_CONFOUNDS)) {
    return err(
      refused(
        'self_heating_confounds',
        `ψ = ${(factor * psi1).toFixed(3)} is above ${PSI_CONFOUNDS}`,
      ),
    );
  }
  if (!Number.isFinite(factor) || factor < FACTOR_BOUNDS[0] || factor > FACTOR_BOUNDS[1]) {
    return err(
      refused('thermal_factor_implausible', `factor ${factor.toFixed(3)} is outside 0.25 to 4`),
    );
  }
  return ok(factor);
};

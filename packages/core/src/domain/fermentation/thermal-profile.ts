import { domainError, type DomainError } from '../errors.js';
import type { Instant } from '../instant.js';
import {
  CONTAINER_COVERS,
  CONTAINER_MATERIALS,
  THERMAL_ENVIRONMENTS,
  THERMAL_GEOMETRIES,
} from '../process/thermal.js';
import type {
  ContainerCover,
  ContainerMaterial,
  ThermalEnvironment,
  ThermalGeometry,
} from '../process/types.js';
import { err, ok, type Result } from '../result.js';
import type { Band3 } from './lag.js';

/**
 * The personal thermal profile (docs/contracts/persistence.md, Personal thermal profile, and
 * fermentation.md, Personal correction, #176): a versioned personal object that scales the lag of
 * the dough thermal model on the baker's own containers. Never part of a recipe, never changes a
 * kinetic constant.
 */

export const THERMAL_PROFILE_ID = 'personal';

/** A factor outside this range is refused (`thermal_factor_implausible`, an ASSUMED guard). */
export const FACTOR_BOUNDS = [0.25, 4] as const;
/** Sets of a key agree when `max f_i / min f_i` is at most this (ASSUMED). */
export const CONSISTENCY_RATIO = 1.5;
/** A narrowed band is never inside `f τ_eff × [0.85, 1.15]` (ASSUMED floor). */
export const CALIBRATED_FLOOR = [0.85, 1.15] as const;

/** The key of a personal factor: nothing else, to stay simple (Personal correction). */
export interface ThermalKey {
  readonly material: ContainerMaterial;
  readonly cover: ContainerCover;
  readonly environment: ThermalEnvironment;
}

/** The text form of a key in assumption codes: `glass.lid.fridgeStatic`. */
export const thermalKeyCode = (key: ThermalKey): string =>
  `${key.material}.${key.cover}.${key.environment}`;

/** One calibration set: the readings of one step of one bake, and the factor they gave. */
export interface ThermalSet {
  /** `f_i`, multiplies `τ_eff`, within 0.25 to 4. */
  readonly factor: number;
  /** Fermenting mass of the step, grams (per piece when divided). */
  readonly massG: number;
  readonly geometry: ThermalGeometry;
  /** Count of readings behind it. */
  readonly readings: number;
  /** The `doughTemperature` observations used. */
  readonly basis: {
    readonly bakeId: string;
    readonly stepId: string;
    readonly eventIds: readonly string[];
  };
}

export interface ThermalFactor extends ThermalKey {
  /** One set per calibrated step of one bake; the key's factor is their geometric mean. */
  readonly sets: readonly ThermalSet[];
}

export interface ThermalProfile {
  /** `personal`. */
  readonly id: string;
  /** 1, 2, 3…: a version is never rewritten. */
  readonly version: number;
  /** An absent key has factor 1. */
  readonly factors: readonly ThermalFactor[];
  readonly updatedAt: Instant;
}

/** Why a profile (or a set of it) cannot be stored, as a stable reason. */
export const thermalSetProblem = (set: ThermalSet): string | undefined => {
  if (
    !Number.isFinite(set.factor) ||
    set.factor < FACTOR_BOUNDS[0] ||
    set.factor > FACTOR_BOUNDS[1]
  ) {
    return 'thermal_factor_implausible';
  }
  if (!(Number.isFinite(set.massG) && set.massG > 0)) return 'massG must be > 0';
  if (!THERMAL_GEOMETRIES.includes(set.geometry)) return 'unknown geometry';
  if (!(Number.isInteger(set.readings) && set.readings >= 2)) return 'readings must be ≥ 2';
  if (
    typeof set.basis.bakeId !== 'string' ||
    set.basis.bakeId.length === 0 ||
    typeof set.basis.stepId !== 'string' ||
    set.basis.stepId.length === 0 ||
    !Array.isArray(set.basis.eventIds) ||
    !set.basis.eventIds.every((id) => typeof id === 'string' && id.length > 0)
  ) {
    return 'basis must name a bake, a step and the observations used';
  }
  return undefined;
};

/** What makes a stored profile invalid (a decoder refuses it); `undefined` when it is valid. */
export const thermalProfileProblem = (profile: ThermalProfile): string | undefined => {
  if (typeof profile.id !== 'string' || profile.id.length === 0) return 'id must be a string';
  if (!(Number.isInteger(profile.version) && profile.version >= 1)) {
    return 'version must be an integer ≥ 1';
  }
  const seen = new Set<string>();
  for (const factor of profile.factors) {
    if (
      !CONTAINER_MATERIALS.includes(factor.material) ||
      !CONTAINER_COVERS.includes(factor.cover) ||
      !THERMAL_ENVIRONMENTS.includes(factor.environment)
    ) {
      return 'unknown key';
    }
    const code = thermalKeyCode(factor);
    if (seen.has(code)) return `duplicate key ${code}`;
    seen.add(code);
    if (factor.sets.length === 0) return `key ${code} has no set`;
    const bases = new Set<string>();
    for (const set of factor.sets) {
      const problem = thermalSetProblem(set);
      if (problem) return `key ${code}: ${problem}`;
      const basis = `${set.basis.bakeId}/${set.basis.stepId}`;
      if (bases.has(basis)) return `key ${code}: two sets for ${basis}`;
      bases.add(basis);
    }
  }
  return undefined;
};

export type ThermalProfileError = DomainError<'InvalidThermalProfile', { reason: string }>;

/**
 * The next version of a profile with `set` added to `key`: a set of the same bake and step
 * replaces the earlier one (a recalibration), any other is added. Nothing is rewritten: the
 * result is a new version (persistence.md).
 */
export const withThermalSet = (
  profile: ThermalProfile | undefined,
  key: ThermalKey,
  set: ThermalSet,
  updatedAt: Instant,
): Result<ThermalProfile, ThermalProfileError> => {
  const problem = thermalSetProblem(set);
  if (problem) {
    return err(
      domainError('InvalidThermalProfile', `Invalid thermal set: ${problem}`, { reason: problem }),
    );
  }
  const code = thermalKeyCode(key);
  const others = (profile?.factors ?? []).filter((f) => thermalKeyCode(f) !== code);
  const mine = (profile?.factors ?? []).find((f) => thermalKeyCode(f) === code);
  const kept = (mine?.sets ?? []).filter(
    (s) => !(s.basis.bakeId === set.basis.bakeId && s.basis.stepId === set.basis.stepId),
  );
  return ok({
    id: profile?.id ?? THERMAL_PROFILE_ID,
    version: (profile?.version ?? 0) + 1,
    factors: [
      ...others,
      {
        material: key.material,
        cover: key.cover,
        environment: key.environment,
        sets: [...kept, set],
      },
    ],
    updatedAt,
  });
};

/** The geometric mean of the factors of a key's sets. */
export const geometricMean = (values: readonly number[]): number =>
  Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length);

/** The personal correction of the lag of one step (fermentation.md, Personal correction). */
export interface PersonalCorrection {
  /** `f`, 1 without a stored factor. */
  readonly factor: number;
  /** The band of the effective `τ` of the step, in hours: central is `f τ_eff`. */
  readonly tauH: Band3;
  /** Assumption codes the estimate names (empty for an unmatched key). */
  readonly assumptions: readonly string[];
}

/** Rounded the way assumption codes print a factor. */
export const factorText = (factor: number): string => String(Number(factor.toPrecision(4)));

/**
 * Applies the stored sets of `key` to the central `τ_eff` and its thermal band: no set, factor 1
 * and the thermal band; one set, the band scaled without tightening; two or more that agree
 * within ×1.5, the band narrowed to their spread, never inside ±15 % of the calibrated value;
 * sets that disagree, the union of the scaled band and the spread, flagged (the table of
 * Personal correction). An unmatched key is silent.
 */
export const personalCorrection = (
  profile: ThermalProfile | undefined,
  key: ThermalKey,
  tauEffH: number,
  thermalBandH: Pick<Band3, 'low' | 'high'>,
): PersonalCorrection => {
  const code = thermalKeyCode(key);
  const sets = profile?.factors.find((f) => thermalKeyCode(f) === code)?.sets ?? [];
  if (sets.length === 0) {
    return {
      factor: 1,
      tauH: { low: thermalBandH.low, central: tauEffH, high: thermalBandH.high },
      assumptions: [],
    };
  }
  const factors = sets.map((s) => s.factor);
  const f = geometricMean(factors);
  const named = `thermal_factor:${code}=${factorText(f)}`;
  const scaled = { low: f * thermalBandH.low, high: f * thermalBandH.high };
  if (sets.length === 1) {
    return { factor: f, tauH: { ...scaled, central: f * tauEffH }, assumptions: [named] };
  }
  const spread = { low: Math.min(...factors) * tauEffH, high: Math.max(...factors) * tauEffH };
  if (Math.max(...factors) / Math.min(...factors) > CONSISTENCY_RATIO) {
    return {
      factor: f,
      tauH: {
        low: Math.min(scaled.low, spread.low),
        central: f * tauEffH,
        high: Math.max(scaled.high, spread.high),
      },
      assumptions: [named, `thermal_factor_inconsistent:${code}`],
    };
  }
  return {
    factor: f,
    tauH: {
      low: Math.min(spread.low, CALIBRATED_FLOOR[0] * f * tauEffH),
      central: f * tauEffH,
      high: Math.max(spread.high, CALIBRATED_FLOOR[1] * f * tauEffH),
    },
    assumptions: [named, `thermal_band_calibrated:${code}:${sets.length}`],
  };
};

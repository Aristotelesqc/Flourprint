import {
  calibrateStepThermal,
  replayBake,
  THERMAL_PROFILE_ID,
  thermalProfileProblem,
  withThermalSet,
  type BakeEvent,
  type CalibrationError,
  type CalibrationOptions,
  type CalibrationUnavailable,
  type DomainError,
  type Instant,
  type Result,
  type StepCalibration,
  type ThermalProfile,
  type ThermalProfileError,
} from '../domain/index.js';
import { err, ok } from '../domain/index.js';
import { isCount, isId, isInstant, isNumber, isObject, refuse, type Json } from './decode.js';
import type { ThermalProfileStore, ThermalStoreError } from './ports.js';

/**
 * Decodes a personal thermal profile from untrusted JSON (backups, stored documents): structure
 * first, then the domain's checks (persistence.md, Personal thermal profile). Throws `Refused` on
 * the first problem.
 */
export const decodeThermalProfile = (value: unknown, where = 'thermal profile'): ThermalProfile => {
  const only = (json: Json, allowed: readonly string[], at: string) => {
    const extra = Object.keys(json).find((key) => !allowed.includes(key));
    if (extra !== undefined) refuse(`${at} has an unknown field ${extra}`);
  };
  if (!isObject(value) || !isId(value.id)) return refuse(`${where} has no valid id`);
  const at = `${where} ${value.id}`;
  only(value, ['id', 'version', 'factors', 'updatedAt'], at);
  if (!isCount(value.version)) return refuse(`${at} has no valid version`);
  if (!isInstant(value.updatedAt)) return refuse(`${at} has no valid updatedAt`);
  if (!Array.isArray(value.factors)) return refuse(`${at} has no factors`);
  for (const [i, factor] of (value.factors as unknown[]).entries()) {
    const here = `${at} factor ${i + 1}`;
    if (!isObject(factor)) return refuse(`${here} is not an object`);
    only(factor, ['material', 'cover', 'environment', 'sets'], here);
    if (!Array.isArray(factor.sets)) return refuse(`${here} has no sets`);
    for (const [j, set] of (factor.sets as unknown[]).entries()) {
      const inSet = `${here} set ${j + 1}`;
      if (!isObject(set)) return refuse(`${inSet} is not an object`);
      only(set, ['factor', 'massG', 'geometry', 'readings', 'basis'], inSet);
      if (!isNumber(set.factor) || !isNumber(set.massG) || !isNumber(set.readings)) {
        return refuse(`${inSet} has an invalid number`);
      }
      const basis = set.basis;
      if (!isObject(basis)) return refuse(`${inSet} has no basis`);
      only(basis, ['bakeId', 'stepId', 'eventIds'], `${inSet} basis`);
      if (!Array.isArray(basis.eventIds)) return refuse(`${inSet} basis has no eventIds`);
    }
  }
  const profile = value as unknown as ThermalProfile;
  const problem = thermalProfileProblem(profile);
  if (problem !== undefined) return refuse(`${at}: ${problem}`);
  return profile;
};

/**
 * Decodes the profiles of a backup (every version of every id), each one valid, versions of an id
 * numbered 1..n. Absent means none.
 */
export const decodeThermalProfiles = (input: unknown, where: string): ThermalProfile[] => {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return refuse(`${where} must be a list`);
  const profiles = (input as unknown[]).map((value, i) =>
    decodeThermalProfile(value, `thermal profile ${i + 1}`),
  );
  const versions = new Map<string, number[]>();
  for (const profile of profiles) {
    versions.set(profile.id, [...(versions.get(profile.id) ?? []), profile.version]);
  }
  for (const [id, list] of versions) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((version, i) => version !== i + 1)) {
      return refuse(`versions of thermal profile ${id} are not numbered 1..n`);
    }
  }
  return profiles;
};

/** The personal thermal profile in force (its latest version), if any was ever stored. */
export const currentThermalProfile = async (
  store: ThermalProfileStore,
): Promise<ThermalProfile | undefined> => {
  const all = await store.listThermalProfileVersions();
  return all.filter((p) => p.id === THERMAL_PROFILE_ID).sort((a, b) => b.version - a.version)[0];
};

export type RecordCalibrationError =
  | CalibrationError
  | CalibrationUnavailable
  | ThermalProfileError
  | ThermalStoreError
  | DomainError<'UnknownBake', { bakeId: string }>;

/**
 * Calibrates the personal factor from the `doughTemperature` readings of one step of a bake and
 * stores it as the next version of the personal profile (fermentation.md, Personal correction):
 * one calibration set per bake and step, a recalibration of the same step replacing its set. The
 * estimators refuse readings that cannot give a factor; nothing is stored then.
 */
export const recordThermalCalibration = async (
  store: ThermalProfileStore,
  events: readonly BakeEvent[],
  stepId: string,
  options: CalibrationOptions,
  now: Instant,
): Promise<
  Result<{ profile: ThermalProfile; calibration: StepCalibration }, RecordCalibrationError>
> => {
  const first = events[0];
  if (first === undefined) {
    return err({ code: 'UnknownBake', message: 'No events', details: { bakeId: '' } });
  }
  const current = await currentThermalProfile(store);
  const state = replayBake(first.bakeId, events);
  const calibration = calibrateStepThermal(state, stepId, now, options);
  if (!calibration.ok) return calibration;
  const next = withThermalSet(current, calibration.value.key, calibration.value.set, now);
  if (!next.ok) return next;
  const saved = await store.saveThermalProfile(next.value);
  if (!saved.ok) return saved;
  return ok({ profile: saved.value, calibration: calibration.value });
};

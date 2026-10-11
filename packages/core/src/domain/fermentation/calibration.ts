/**
 * Readiness profiles (docs/contracts/fermentation.md): when a dough is "ready to bake", kept apart
 * from the kinetic parameters of `model.ts`. They say when the baker bakes, not how fast the yeast
 * works.
 */

/** Target of a fermenting mass, in Craig's unit (1 = "about doubled once"). */
export interface ReadinessTarget {
  /** Progress `F*` at which the mass is ready. */
  readonly readyProgress: number;
  /** Low and high `F*` used for the band of an estimate. */
  readonly band: readonly [number, number];
}

export interface ReadinessRef {
  readonly id: string;
  readonly version: string;
}

export interface ReadinessProfile extends ReadinessRef, ReadinessTarget {
  /** Where the values come from. */
  readonly basis: string;
}

/** The default: the model's own end point, uncalibrated. */
export const MODEL_END_POINT: ReadinessProfile = {
  id: 'flourprint.model-end-point',
  version: '1',
  readyProgress: 1,
  band: [1, 1],
  basis: 'the model\'s own end point, Craig\'s "about doubled once"; uncalibrated',
};

/**
 * An assumed prior, selectable only: planned TOST schedules, read as examples (not calibration
 * data), imply about twice Craig's time for "ready to bake" after degassing, shaping and proof
 * (#33). The band is a sensitivity range, not a prediction error.
 */
export const EXPERIMENTAL_READY: ReadinessProfile = {
  id: 'flourprint.experimental-ready',
  version: '1',
  readyProgress: 2,
  band: [1.5, 2.5],
  basis: 'assumed prior from planned schedules (TOST examples), not measured',
};

export const READINESS_PROFILES: readonly ReadinessProfile[] = [
  MODEL_END_POINT,
  EXPERIMENTAL_READY,
];

export const findReadinessProfile = (ref: ReadinessRef): ReadinessProfile | undefined =>
  READINESS_PROFILES.find((p) => p.id === ref.id && p.version === ref.version);

/** Finite, positive, and the target within its band (fermentation.md). */
export const validReadinessTarget = (target: ReadinessTarget): boolean => {
  const [low, high] = target.band;
  const values = [target.readyProgress, low, high];
  return (
    values.every((v) => Number.isFinite(v) && v > 0) &&
    low <= target.readyProgress &&
    target.readyProgress <= high
  );
};

/** A preferment is ripe at progress 1, with no band of its own; it is not a profile. */
export const RIPE_TARGET: ReadinessTarget = { readyProgress: 1, band: [1, 1] };

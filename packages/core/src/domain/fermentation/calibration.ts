/**
 * Personal calibration of the end point (docs/contracts/fermentation.md, Personal calibration).
 * It is the baker's readiness decision, kept apart from the kinetic parameters of `model.ts`: it
 * says when a dough is "ready to bake", not how fast the yeast works.
 */
export interface PersonalCalibration {
  /** Progress `F*` at which the dough is ready to bake (Craig's unit: 1 = "about doubled once"). */
  readonly readyProgress: number;
  /** Low and high `F*` used for the band of an estimate. */
  readonly band: readonly [number, number];
}

/**
 * Provisional. Source: the owner's TOST schedules, used as examples (not calibration data); they
 * imply about twice Craig's time to "doubled once" for "ready to bake" after degassing, shaping
 * and proof. To be recalibrated from recorded "dough ready" observations (bake-session.md).
 */
export const READY_CALIBRATION: PersonalCalibration = { readyProgress: 2, band: [1.5, 2.5] };

/** A preferment is ripe at progress 1, with no band of its own. */
export const RIPE_TARGET: PersonalCalibration = { readyProgress: 1, band: [1, 1] };

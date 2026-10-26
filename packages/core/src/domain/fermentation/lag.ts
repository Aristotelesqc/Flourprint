/**
 * The lag of the dough temperature behind its ambient, as the simulation reads it
 * (docs/contracts/fermentation.md, Dough temperature and The band and the envelope). Hours and
 * K per hour, the same formulas as the contract's SI ones.
 */

/** A value with the ends of its band. */
export interface Band3 {
  readonly low: number;
  readonly central: number;
  readonly high: number;
}

/**
 * The lag of one step: `tauH` is the first-order time constant of the dough behind the ambient
 * and `heatingK` the self-heating `ΔT_ad`, in K per unit of progress `F`. The envelope takes its
 * ends instant by instant (`simulate.ts`), never as one value shared by the whole path.
 */
export interface SegmentLag {
  readonly tauH: Band3;
  readonly heatingK: Band3;
}

/**
 * A step without thermal inputs: `τ` 1.5 h within 0 to 3 h, no self-heating (fermentation.md,
 * Scope and default).
 */
export const DEFAULT_LAG: SegmentLag = {
  tauH: { low: 0, central: 1.5, high: 3 },
  heatingK: { low: 0, central: 0, high: 0 },
};

/** `ΔT_ad`, K per unit of `F`: central 0.85 within 0.6 to 1.2 (fermentation.md, Self-heating). */
export const SELF_HEATING_K: Band3 = { low: 0.6, central: 0.85, high: 1.2 };

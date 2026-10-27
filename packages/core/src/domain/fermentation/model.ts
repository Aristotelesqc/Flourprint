import type { YeastForm } from '../formula/types.js';
import type { ModelRef } from '../values.js';

/** Provisional commercial-yeast model, docs/contracts/fermentation.md (version 0.1.0). */
export const FERMENTATION_MODEL: ModelRef = { id: 'flourprint.commercial-yeast', version: '0.1.0' };

export interface FermentationParameters {
  /** Hours to the end point at 1 % fresh yeast and 21.1 °C. */
  readonly aH: number;
  /** Dose exponent. */
  readonly k: number;
  /** Activation energy, J/mol. */
  readonly eaJ: number;
  /** Fresh-equivalent mass per gram of each form. */
  readonly freshPerGram: Readonly<Record<YeastForm, number>>;
  /**
   * Which thermal trajectory the lag follows (fermentation.md, The band and the envelope):
   * `central` the central lag; `upper` the lag that keeps the dough warmest at every instant,
   * with the largest self-heating; `lower` the opposite ends. Never one lag shared by the path.
   */
  readonly path: ThermalPath;
}

export type ThermalPath = 'central' | 'upper' | 'lower';

export const CENTRAL: FermentationParameters = {
  aH: 3.43,
  k: 0.729,
  eaJ: 98_300,
  freshPerGram: { fresh: 1, 'active-dry': 1 / 0.4, instant: 1 / 0.33 },
  path: 'central',
};

/** Every combination of the parameter ranges; the band is their minimum and maximum. */
export const CORNERS: readonly FermentationParameters[] = (() => {
  const corners: FermentationParameters[] = [];
  for (const aH of [3.43 * 0.75, 3.43 * 1.25])
    for (const k of [0.6, 0.9])
      for (const eaJ of [50_000, 100_000])
        for (const [instant, activeDry] of [
          [0.32, 0.4],
          [0.42, 0.5],
        ] as const)
          for (const path of ['upper', 'lower'] as const)
            corners.push({
              aH,
              k,
              eaJ,
              freshPerGram: { fresh: 1, 'active-dry': 1 / activeDry, instant: 1 / instant },
              path,
            });
  return corners;
})();

/** Gas constant, J/(mol·K). */
export const GAS_CONSTANT = 8.314_462_618;
const R = GAS_CONSTANT;
/** Reference temperature of the kinetic law, K (21.1 °C). */
export const T_REF_K = 294.25;

/** Relative rate, 1 at 21.1 °C. */
export const rate = (p: FermentationParameters, temperatureC: number): number =>
  Math.exp((p.eaJ / R) * (1 / T_REF_K - 1 / (temperatureC + 273.15)));

/** Progress per hour at a constant temperature, for a fresh-equivalent dose in %. */
export const progressPerHour = (
  p: FermentationParameters,
  freshPct: number,
  temperatureC: number,
): number => (freshPct > 0 ? (freshPct ** p.k / p.aH) * rate(p, temperatureC) : 0);

export const DOMAIN = {
  minFreshPct: 0.01,
  maxFreshPct: 3,
  minDoughC: 1.7,
  maxDoughC: 35,
} as const;

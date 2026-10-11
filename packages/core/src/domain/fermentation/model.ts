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
  /** Dough thermal lag, hours (0: the dough follows the ambient at once). */
  readonly tauH: number;
}

export const CENTRAL: FermentationParameters = {
  aH: 3.43,
  k: 0.729,
  eaJ: 98_300,
  freshPerGram: { fresh: 1, 'active-dry': 1 / 0.4, instant: 1 / 0.33 },
  tauH: 1.5,
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
          for (const tauH of [0, 3])
            corners.push({
              aH,
              k,
              eaJ,
              freshPerGram: { fresh: 1, 'active-dry': 1 / activeDry, instant: 1 / instant },
              tauH,
            });
  return corners;
})();

const R = 8.314_462_618;
const T_REF_K = 294.25;

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

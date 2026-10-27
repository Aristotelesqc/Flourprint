import type { ModelRef } from '../values.js';
import type {
  ContainerCover,
  ContainerMaterial,
  DoughPorosity,
  ThermalEnvironment,
  ThermalGeometry,
} from '../process/types.js';
import type { ResolvedThermal } from '../process/thermal.js';
import { SELF_HEATING_K, type Band3, type SegmentLag } from './lag.js';
import { GAS_CONSTANT } from './model.js';

/**
 * Dough thermal model (docs/contracts/fermentation.md, Dough thermal model, #176): the lag `τ_eff`
 * of the mean dough temperature behind its ambient, from the mass, the shape, the container and
 * the surroundings, with the band the tables of the contract give. The kinetic law is untouched;
 * this changes only the temperature it is evaluated on. SI inside (kg, m, W, K, J), hours at the
 * boundary of the simulation.
 */

/** Sub-model `flourprint.dough-thermal` 0.2.0, named in the assumptions as `thermal_model:0.2.0`. */
export const THERMAL_MODEL: ModelRef = { id: 'flourprint.dough-thermal', version: '0.2.0' };

/** Properties by porosity class: `ρ` kg/m³ and `k` W/(m·K), with the range of `k` (unused by the band). */
export const POROSITY_PROPERTIES: Readonly<
  Record<
    DoughPorosity,
    { readonly rho: number; readonly k: number; readonly kRange: readonly [number, number] }
  >
> = {
  unproofed: { rho: 1100, k: 0.38, kRange: [0.36, 0.46] },
  mid: { rho: 750, k: 0.28, kRange: [0.22, 0.34] },
  proofed: { rho: 400, k: 0.18, kRange: [0.12, 0.22] },
};

/** `cp`, J/(kg·K), with its range. */
export const CP: { readonly central: number; readonly range: readonly [number, number] } = {
  central: 2800,
  range: [2700, 2930],
};

/** Thickness of the `sheet` class, m (ASSUMED convenience geometry). */
const SHEET_THICKNESS_M = 0.006;

/** `R_wall`, m²·K/W: the container wall in contact with the dough. */
const WALL_RESISTANCE: Readonly<Record<ContainerMaterial, number>> = {
  glass: 0.004,
  plastic: 0.008,
  ceramic: 0.006,
  steel: 6.9e-5,
  aluminium: 1e-5,
  banneton: 0.063,
};
const LINER_RESISTANCE = 0.02;

/** `R_cover`, m²·K/W: central value and range of the band. */
const COVER_RESISTANCE: Readonly<
  Record<ContainerCover, { readonly central: number; readonly range: readonly [number, number] }>
> = {
  lid: { central: 0.14, range: [0.04, 0.39] },
  film: { central: 0.07, range: [0.01, 0.14] },
  cloth: { central: 0.04, range: [0.02, 0.1] },
  none: { central: 0, range: [0, 0] },
};

/** `h_ext`, W/(m²·K): central value and range of the band. */
const EXTERNAL_COEFFICIENT: Readonly<
  Record<
    ThermalEnvironment | 'fridgeStaticMetal',
    { readonly central: number; readonly range: readonly [number, number] }
  >
> = {
  fridgeStatic: { central: 8, range: [4, 10] },
  fridgeStaticMetal: { central: 5, range: [3, 6] },
  fridgeVentilated: { central: 12, range: [8, 18] },
  roomStill: { central: 9, range: [6, 12] },
  provingBox: { central: 10, range: [5, 15] },
};

/** `G_shelf`, W/K: a container on a solid shelf, in the two fridge classes only. */
const SHELF_CONDUCTANCE = { central: 0.025, range: [0, 0.25] } as const;

/** Share of the container that follows the dough (ASSUMED) and its specific heat, J/(kg·K). */
const CONTAINER_SHARE = 0.5;
const CONTAINER_HEAT: Readonly<Record<ContainerMaterial, number>> = {
  glass: 840,
  ceramic: 880,
  plastic: 1700,
  steel: 500,
  aluminium: 900,
  banneton: 1400,
};

const isFridge = (environment: ThermalEnvironment) =>
  environment === 'fridgeStatic' || environment === 'fridgeVentilated';
const isMetal = (material: ContainerMaterial) => material === 'steel' || material === 'aluminium';

/** The inputs of the lag once defaults, mass and porosity are known. */
export interface ThermalInputs extends ResolvedThermal {
  readonly porosity: DoughPorosity;
}

/** The four constants the band varies (fermentation.md, The band and the envelope). */
export interface ThermalConstants {
  readonly hExt: number;
  readonly gShelf: number;
  readonly rCover: number;
  readonly cp: number;
}

/** Central values and ranges of `h_ext`, `G_shelf`, `R_cover` and `cp` for a step. */
export const thermalConstantRanges = (
  t: Pick<ThermalInputs, 'material' | 'cover' | 'environment'>,
): {
  readonly central: ThermalConstants;
  readonly hExt: readonly [number, number];
  readonly gShelf: readonly [number, number];
  readonly rCover: readonly [number, number];
  readonly cp: readonly [number, number];
} => {
  const h =
    EXTERNAL_COEFFICIENT[
      t.environment === 'fridgeStatic' && isMetal(t.material) ? 'fridgeStaticMetal' : t.environment
    ];
  const fridge = isFridge(t.environment);
  const cover = COVER_RESISTANCE[t.cover];
  return {
    central: {
      hExt: h.central,
      gShelf: fridge ? SHELF_CONDUCTANCE.central : 0,
      rCover: cover.central,
      cp: CP.central,
    },
    hExt: h.range,
    gShelf: fridge ? SHELF_CONDUCTANCE.range : [0, 0],
    rCover: cover.range,
    cp: CP.range,
  };
};

/** The geometry class of the contract: contact area, top area, `p` and the volume. */
export const geometryOf = (
  geometry: ThermalGeometry,
  volumeM3: number,
): { readonly p: number; readonly aw: number; readonly at: number } => {
  switch (geometry) {
    case 'bulk': {
      const r = ((3 * volumeM3) / (2 * Math.PI)) ** (1 / 3);
      return { p: 3, aw: 2 * Math.PI * r * r, at: Math.PI * r * r };
    }
    case 'ball': {
      const r = ((3 * volumeM3) / (4 * Math.PI)) ** (1 / 3);
      return { p: 3, aw: 2 * Math.PI * r * r, at: 2 * Math.PI * r * r };
    }
    case 'tin': {
      const a = (volumeM3 / 2) ** (1 / 3);
      return { p: 2, aw: 8 * a * a, at: 2 * a * a };
    }
    case 'sheet':
      return { p: 1, aw: volumeM3 / SHEET_THICKNESS_M, at: volumeM3 / SHEET_THICKNESS_M };
  }
};

/** The lag of one step at one set of constants (fermentation.md, Conductance and Lag). */
export interface ThermalLag {
  /** `UA`, W/K. */
  readonly ua: number;
  /** `A = A_w + A_t`, m². */
  readonly area: number;
  /** `U_eff = UA / A`, W/(m²·K). */
  readonly ueff: number;
  /** Characteristic length `R0 = p V / A`, m. */
  readonly r0: number;
  /** `Bi_R = U_eff R0 / k`. */
  readonly bi: number;
  readonly volumeM3: number;
  readonly awM2: number;
  readonly atM2: number;
  readonly tauLumpedS: number;
  readonly tauEffS: number;
  readonly tauEffH: number;
  /** `γ_core = (1 + Bi_R/2) / (1 + Bi_R/(p+2))`. */
  readonly gammaCore: number;
  readonly p: number;
}

/**
 * `τ_lumped = (m cp + C_container) / UA`, `τ_eff = τ_lumped (1 + Bi_R/(p+2))`, with
 * `UA = U_w A_w + U_t A_t + G_shelf`. `massKg` is the mass of the piece the step carries.
 */
export const thermalLag = (massKg: number, t: ThermalInputs, c: ThermalConstants): ThermalLag => {
  const { rho, k } = POROSITY_PROPERTIES[t.porosity];
  const volumeM3 = massKg / rho;
  const g = geometryOf(t.geometry, volumeM3);
  const wall =
    WALL_RESISTANCE[t.material] + (t.liner && t.material === 'banneton' ? LINER_RESISTANCE : 0);
  const uw = 1 / (wall + 1 / c.hExt);
  const ut = 1 / (c.rCover + 1 / c.hExt);
  const ua = uw * g.aw + ut * g.at + c.gShelf;
  const area = g.aw + g.at;
  const ueff = ua / area;
  const r0 = (g.p * volumeM3) / area;
  const bi = (ueff * r0) / k;
  const containerCapacity =
    t.containerMassG === undefined
      ? 0
      : CONTAINER_SHARE * (t.containerMassG / 1000) * CONTAINER_HEAT[t.material];
  const tauLumpedS = (massKg * c.cp + containerCapacity) / ua;
  const tauEffS = tauLumpedS * (1 + bi / (g.p + 2));
  return {
    ua,
    area,
    ueff,
    r0,
    bi,
    volumeM3,
    awM2: g.aw,
    atM2: g.at,
    tauLumpedS,
    tauEffS,
    tauEffH: tauEffS / 3600,
    gammaCore: (1 + bi / 2) / (1 + bi / (g.p + 2)),
    p: g.p,
  };
};

/** `τ_eff` at the central constants, and its band over every corner of the four ranges. */
export interface ThermalBand {
  readonly central: ThermalLag;
  /** `τ_eff` in hours: the minimum and maximum over `h_ext`, `R_cover`, `G_shelf` and `cp`. */
  readonly tauH: Band3;
}

export const thermalBand = (massKg: number, t: ThermalInputs): ThermalBand => {
  const ranges = thermalConstantRanges(t);
  const central = thermalLag(massKg, t, ranges.central);
  let low = Infinity;
  let high = -Infinity;
  for (const hExt of ranges.hExt)
    for (const gShelf of ranges.gShelf)
      for (const rCover of ranges.rCover)
        for (const cp of ranges.cp) {
          const h = thermalLag(massKg, t, { hExt, gShelf, rCover, cp }).tauEffH;
          low = Math.min(low, h);
          high = Math.max(high, h);
        }
  // The central constants lie inside their ranges, so the band holds the central value.
  return {
    central,
    tauH: {
      low: Math.min(low, central.tauEffH),
      central: central.tauEffH,
      high: Math.max(high, central.tauEffH),
    },
  };
};

/** The lag of a thermal step: the band of `τ_eff` and the `ΔT_ad` band. */
export const segmentLagOf = (tauH: Band3): SegmentLag => ({ tauH, heatingK: SELF_HEATING_K });

/**
 * The semenov number `ψ = (Ea / (R T_amb²)) τ ΔT_ad rate(T_amb, d)`; an equilibrium exists only
 * for `ψ ≤ 1/e` (fermentation.md, Self-heating). `ratePerH` is `dF/dt` at the ambient, 1/h.
 */
export const semenovPsi = (
  eaJ: number,
  ambientC: number,
  tauH: number,
  heatingK: number,
  ratePerH: number,
): number => {
  const kelvin = ambientC + 273.15;
  return (eaJ / (GAS_CONSTANT * kelvin * kelvin)) * tauH * heatingK * ratePerH;
};

/** `1/e`, the limit of `ψ`. */
export const SEMENOV_LIMIT = Math.exp(-1);

/** `Bi_R` beyond which the first-order closure is extrapolated (`thermal_biot_high`). */
export const BIOT_HIGH = 2;

/**
 * The temperature a probe in the centre reads (fermentation.md, Core temperature):
 * `T_core − T_eq = γ_core (T̄ − T_eq)`, clamped between the temperature at the start of the
 * transition and `T_eq`; when the mean lies beyond both ends the core is the mean. `equilibriumC`
 * is the ambient, or the moving equilibrium `T_amb + ΔT_ad rate τ_eff` with self-heating.
 */
export const coreTemperatureC = (
  startC: number,
  equilibriumC: number,
  meanC: number,
  gammaCore: number,
): number => {
  const low = Math.min(startC, equilibriumC);
  const high = Math.max(startC, equilibriumC);
  if (meanC < low || meanC > high) return meanC;
  const core = equilibriumC + gammaCore * (meanC - equilibriumC);
  return Math.min(Math.max(core, low), high);
};

/**
 * The mean temperature behind a core reading, the inverse of `coreTemperatureC`: a reading beyond
 * both ends is taken as the mean.
 */
export const meanFromCoreC = (
  startC: number,
  equilibriumC: number,
  coreC: number,
  gammaCore: number,
): number => {
  const low = Math.min(startC, equilibriumC);
  const high = Math.max(startC, equilibriumC);
  if (coreC < low || coreC > high) return coreC;
  return equilibriumC + (coreC - equilibriumC) / gammaCore;
};

/**
 * The class of porosity from the progress at the start of the step, `f = F / F*`: below 1/3
 * `unproofed`, below 2/3 `mid`, otherwise `proofed` (fermentation.md, Properties by porosity class).
 */
export const porosityFromProgress = (f: number): DoughPorosity =>
  f < 1 / 3 ? 'unproofed' : f < 2 / 3 ? 'mid' : 'proofed';

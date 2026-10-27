import type {
  ContainerCover,
  ContainerMaterial,
  DoughPorosity,
  StepThermal,
  ThermalEnvironment,
  ThermalGeometry,
} from './types.js';

/** Thermal inputs of a dough step: validation and read-time defaults (process.md, #176). */

export const THERMAL_GEOMETRIES: readonly ThermalGeometry[] = ['sheet', 'tin', 'ball', 'bulk'];
export const CONTAINER_MATERIALS: readonly ContainerMaterial[] = [
  'glass',
  'plastic',
  'ceramic',
  'steel',
  'aluminium',
  'banneton',
];
export const CONTAINER_COVERS: readonly ContainerCover[] = ['lid', 'film', 'cloth', 'none'];
export const THERMAL_ENVIRONMENTS: readonly ThermalEnvironment[] = [
  'fridgeStatic',
  'fridgeVentilated',
  'roomStill',
  'provingBox',
];
export const DOUGH_POROSITIES: readonly DoughPorosity[] = ['unproofed', 'mid', 'proofed'];

export interface ThermalProblem {
  readonly path: string;
  readonly reason: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * What cannot be meant by a `thermal` object (process.md, Thermal inputs, Validation): unknown
 * discriminants, a bad `pieces` or `containerMassG`, a liner outside a banneton, a banneton that
 * is neither a ball nor a bulk, a tin or a sheet in glass, ceramic or a banneton. Whether the step
 * is a dough step is the caller's rule.
 */
export const thermalProblem = (thermal: StepThermal, path: string): ThermalProblem | undefined => {
  const value = thermal as unknown;
  if (!isRecord(value)) return { path, reason: 'must be an object' };
  if (!THERMAL_GEOMETRIES.includes(value.geometry as ThermalGeometry)) {
    return { path: `${path}.geometry`, reason: 'must be sheet, tin, ball or bulk' };
  }
  const geometry = value.geometry as ThermalGeometry;
  let material: ContainerMaterial | undefined;
  if (value.container !== undefined) {
    const container = value.container;
    if (!isRecord(container)) return { path: `${path}.container`, reason: 'must be an object' };
    if (!CONTAINER_MATERIALS.includes(container.material as ContainerMaterial)) {
      return { path: `${path}.container.material`, reason: 'unknown container material' };
    }
    if (!CONTAINER_COVERS.includes(container.cover as ContainerCover)) {
      return { path: `${path}.container.cover`, reason: 'must be lid, film, cloth or none' };
    }
    material = container.material as ContainerMaterial;
    if (container.liner !== undefined && typeof container.liner !== 'boolean') {
      return { path: `${path}.container.liner`, reason: 'must be true or false' };
    }
    if (container.liner !== undefined && material !== 'banneton') {
      return { path: `${path}.container.liner`, reason: 'a liner is for a banneton only' };
    }
    if (material === 'banneton' && geometry !== 'ball' && geometry !== 'bulk') {
      return { path: `${path}.geometry`, reason: 'a banneton holds a ball or a bulk' };
    }
  }
  const unfit = material === 'glass' || material === 'ceramic' || material === 'banneton';
  if ((geometry === 'tin' || geometry === 'sheet') && unfit) {
    return {
      path: `${path}.container.material`,
      reason: 'a tin or a sheet is not glass, ceramic or a banneton',
    };
  }
  if (
    value.environment !== undefined &&
    !THERMAL_ENVIRONMENTS.includes(value.environment as ThermalEnvironment)
  ) {
    return { path: `${path}.environment`, reason: 'unknown environment class' };
  }
  if (value.porosity !== undefined && !DOUGH_POROSITIES.includes(value.porosity as DoughPorosity)) {
    return { path: `${path}.porosity`, reason: 'must be unproofed, mid or proofed' };
  }
  if (
    value.pieces !== undefined &&
    !(typeof value.pieces === 'number' && Number.isInteger(value.pieces) && value.pieces >= 1)
  ) {
    return { path: `${path}.pieces`, reason: 'must be an integer ≥ 1' };
  }
  if (
    value.containerMassG !== undefined &&
    !(
      typeof value.containerMassG === 'number' &&
      Number.isFinite(value.containerMassG) &&
      value.containerMassG > 0
    )
  ) {
    return { path: `${path}.containerMassG`, reason: 'must be > 0' };
  }
  return undefined;
};

/** The container of a geometry when the step names none (process.md, Defaults). */
export const DEFAULT_CONTAINER: Readonly<
  Record<ThermalGeometry, { readonly material: ContainerMaterial; readonly cover: ContainerCover }>
> = {
  bulk: { material: 'glass', cover: 'film' },
  ball: { material: 'plastic', cover: 'lid' },
  tin: { material: 'steel', cover: 'none' },
  sheet: { material: 'aluminium', cover: 'none' },
};

/** The environment a step implies from its `conditions.location` (process.md, Defaults). */
export const defaultEnvironment = (location: string | undefined): ThermalEnvironment =>
  location === 'fridge' ? 'fridgeStatic' : location === 'proofer' ? 'provingBox' : 'roomStill';

/** Thermal inputs with their read-time defaults applied; never stored (process.md). */
export interface ResolvedThermal {
  readonly geometry: ThermalGeometry;
  readonly material: ContainerMaterial;
  readonly cover: ContainerCover;
  readonly liner: boolean;
  readonly environment: ThermalEnvironment;
  /** Absent: derived from the progress at the start of the step (fermentation.md). */
  readonly porosity?: DoughPorosity;
  readonly pieces: number;
  readonly containerMassG?: number;
}

/** Applies the defaults of a `thermal` object for a step at `location`. */
export const resolveThermal = (
  thermal: StepThermal,
  location: string | undefined,
): ResolvedThermal => {
  const container = thermal.container ?? DEFAULT_CONTAINER[thermal.geometry];
  return {
    geometry: thermal.geometry,
    material: container.material,
    cover: container.cover,
    liner: thermal.container?.liner === true,
    environment: thermal.environment ?? defaultEnvironment(location),
    ...(thermal.porosity === undefined ? {} : { porosity: thermal.porosity }),
    pieces: thermal.pieces ?? 1,
    ...(thermal.containerMassG === undefined ? {} : { containerMassG: thermal.containerMassG }),
  };
};

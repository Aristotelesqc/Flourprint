import type { Instant } from '../instant.js';
import type { PropertyValue } from '../values.js';
import type { Cereal, FlourEntry, FlourProperties, Refinement } from './types.js';

const UNKNOWN: PropertyValue = { status: 'unknown' };

/** Every property unknown: a generic name does not justify a composition (flours.md, #26). */
export const unknownFlourProperties = (): FlourProperties => ({
  proteinPct: UNKNOWN,
  ashPct: UNKNOWN,
  fallingNumberS: UNKNOWN,
  alveographW: UNKNOWN,
  alveographPL: UNKNOWN,
  malted: UNKNOWN,
});

/** When the built-in entries of versions 1 and 2 were defined (flours.md, owner decisions). */
const BUILT_IN_AT = '2026-10-11T00:00:00.000Z' as Instant;

/** Where the typical values of version 2 come from; unverified until #34 checks them. */
export const TYPICAL_FLOUR_SOURCE = 'Typical range for the category (Canada); unverified, see #34';

/**
 * A typical protein of a category (flours.md, version 2): estimated, as sold, the central value of
 * the typical range with half the range as uncertainty.
 */
const typicalProtein = (value: number, halfRange: number): PropertyValue => ({
  status: 'estimated',
  value,
  uncertainty: halfRange,
  unit: 'pct',
  basis: 'asIs',
  source: { kind: 'reference', detail: TYPICAL_FLOUR_SOURCE },
});

interface Definition {
  readonly id: string;
  readonly cereal: Cereal;
  readonly refinement: Refinement;
  readonly classification?: FlourEntry['classification'];
  /** Typical protein of version 2: central value and half the range, points as sold. */
  readonly protein?: readonly [number, number];
}

/** The built-ins (flours.md), in the order the registry lists them. */
const DEFINITIONS: readonly Definition[] = [
  { id: 'all-purpose-flour', cereal: 'wheat', refinement: 'white', protein: [12.5, 1.0] },
  { id: 'bread-flour', cereal: 'wheat', refinement: 'white', protein: [13.5, 1.0] },
  { id: 'bise-flour', cereal: 'wheat', refinement: 'partial', protein: [12.5, 1.5] },
  { id: 'whole-wheat', cereal: 'wheat', refinement: 'partial', protein: [13.5, 1.5] },
  { id: 'whole-grain-wheat', cereal: 'wheat', refinement: 'wholeGrain', protein: [13.5, 1.5] },
  { id: 'flour', cereal: 'wheat', refinement: 'unknown' },
  { id: 'spelt-flour', cereal: 'spelt', refinement: 'unknown', protein: [13.0, 2.0] },
  { id: 'brown-flour', cereal: 'wheat', refinement: 'partial', protein: [12.5, 1.5] },
  {
    id: 'tipo-00-flour',
    cereal: 'wheat',
    refinement: 'white',
    classification: { system: 'IT', code: '00' },
    protein: [12.0, 1.5],
  },
  { id: 'cornmeal', cereal: 'corn', refinement: 'unknown', protein: [7.5, 1.0] },
];

/** Version 1: every property unknown. Version 2: the typical protein where one is given. */
const entryOf = (definition: Definition, version: 1 | 2): FlourEntry => {
  const { id, cereal, refinement, classification, protein } = definition;
  return {
    id,
    version,
    builtIn: true,
    cereal,
    refinement,
    ...(classification === undefined ? {} : { classification }),
    organic: UNKNOWN,
    properties: {
      ...unknownFlourProperties(),
      ...(version === 2 && protein ? { proteinPct: typicalProtein(protein[0], protein[1]) } : {}),
    },
    archived: false,
    createdAt: BUILT_IN_AT,
  };
};

/** Current version of the built-ins: a bake started now records it (flours.md). */
export const BUILT_IN_FLOUR_VERSION = 2;

/**
 * Every version of the built-in entries (flours.md): code, never stored, never edited; named by
 * message key `name.<id>` and described by `flour.<id>.description`. An earlier version stays
 * resolvable for the bakes and backups that recorded it.
 */
export const BUILT_IN_FLOUR_VERSIONS: readonly FlourEntry[] = ([1, 2] as const).flatMap((version) =>
  DEFINITIONS.map((definition) => entryOf(definition, version)),
);

/** The current version of each built-in entry, the generic `flour` included. */
export const BUILT_IN_FLOURS: readonly FlourEntry[] = BUILT_IN_FLOUR_VERSIONS.filter(
  (entry) => entry.version === BUILT_IN_FLOUR_VERSION,
);

/** Built-ins kept for the recipes that name them, neither listed nor offered (flours.md). */
const HIDDEN_BUILT_IN_FLOURS: ReadonlySet<string> = new Set(['flour']);

/** The built-ins the registry lists and the flour picker offers (current versions). */
export const OFFERED_BUILT_IN_FLOURS: readonly FlourEntry[] = BUILT_IN_FLOURS.filter(
  (entry) => !HIDDEN_BUILT_IN_FLOURS.has(entry.id),
);

/** A built-in entry: its current version, or the given one; undefined if there is none. */
export const builtInFlour = (id: string, version?: number): FlourEntry | undefined =>
  BUILT_IN_FLOUR_VERSIONS.find(
    (entry) => entry.id === id && entry.version === (version ?? BUILT_IN_FLOUR_VERSION),
  );

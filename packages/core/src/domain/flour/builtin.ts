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

/** When the built-in entries of version 1 were defined (flours.md). */
const BUILT_IN_AT = '2026-10-11T00:00:00.000Z' as Instant;

const builtIn = (
  id: string,
  cereal: Cereal,
  refinement: Refinement,
  classification?: FlourEntry['classification'],
): FlourEntry => ({
  id,
  version: 1,
  builtIn: true,
  cereal,
  refinement,
  ...(classification === undefined ? {} : { classification }),
  organic: UNKNOWN,
  properties: unknownFlourProperties(),
  archived: false,
  createdAt: BUILT_IN_AT,
});

/**
 * Built-in entries (flours.md): code, never stored, never edited; named by message key
 * `name.<id>`. A new version of one never overwrites a personal entry.
 */
export const BUILT_IN_FLOURS: readonly FlourEntry[] = [
  builtIn('all-purpose-flour', 'wheat', 'white'),
  builtIn('bread-flour', 'wheat', 'white'),
  builtIn('bise-flour', 'wheat', 'partial'),
  builtIn('whole-wheat', 'wheat', 'partial'),
  builtIn('whole-grain-wheat', 'wheat', 'wholeGrain'),
  builtIn('flour', 'wheat', 'unknown'),
  builtIn('spelt-flour', 'spelt', 'unknown'),
  builtIn('brown-flour', 'wheat', 'partial'),
  builtIn('tipo-00-flour', 'wheat', 'white', { system: 'IT', code: '00' }),
  builtIn('cornmeal', 'corn', 'unknown'),
];

export const builtInFlour = (id: string): FlourEntry | undefined =>
  BUILT_IN_FLOURS.find((entry) => entry.id === id);

import type { ProcessStep } from './process/types.js';

/**
 * Temperature display units (docs/contracts/values-and-units.md). Values are stored in °C; a
 * device shows and reads each context in °C or °F. Nothing here is ever persisted.
 */
export type TemperatureContext = 'oven' | 'cold' | 'ambient';
export type TemperatureUnit = 'C' | 'F';

const OVEN_OPERATIONS: ReadonlySet<string> = new Set(['bake', 'preheat', 'boil']);

/** The context of a step's temperatures: oven, cold, or ambient for every other step. */
export const temperatureContext = (
  step: Pick<ProcessStep, 'operation' | 'conditions'>,
): TemperatureContext => {
  const location = step.conditions?.location;
  if (OVEN_OPERATIONS.has(step.operation) || location === 'oven') return 'oven';
  if (location === 'fridge' || location === 'freezer' || step.operation === 'retard') return 'cold';
  return 'ambient';
};

/**
 * A stored °C value in the display unit. A difference (a mixer friction) converts by the scale
 * only: `× 9 / 5`, without the 32° shift.
 */
export const celsiusTo = (celsius: number, unit: TemperatureUnit, difference = false): number =>
  unit === 'C' ? celsius : celsius * (9 / 5) + (difference ? 0 : 32);

/** A value typed in the display unit, in °C for storage: `(F − 32) × 5 / 9`, or `× 5 / 9`. */
export const celsiusFrom = (value: number, unit: TemperatureUnit, difference = false): number =>
  unit === 'C' ? value : (value - (difference ? 0 : 32)) * (5 / 9);

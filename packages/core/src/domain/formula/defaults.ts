import { domainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import type { FormulaError } from './errors.js';
import type { Component, Formula } from './types.js';

/** The components a recipe can add from a default (formula.md, Component defaults). */
export type ComponentPreset = 'poolish' | 'tangzhong' | 'yudane';

export const COMPONENT_PRESETS: readonly ComponentPreset[] = ['poolish', 'tangzhong', 'yudane'];

export interface ComponentDefault {
  readonly flourPct: number;
  readonly hydrationPct: number;
}

export type ComponentDefaults = Readonly<Record<ComponentPreset, ComponentDefault>>;

export const BUILT_IN_COMPONENT_DEFAULTS: ComponentDefaults = {
  poolish: { flourPct: 20, hydrationPct: 100 },
  tangzhong: { flourPct: 5, hydrationPct: 500 },
  yudane: { flourPct: 5, hydrationPct: 100 },
};

export const presetKind = (preset: ComponentPreset): Component['kind'] =>
  preset === 'poolish' ? 'preferment' : 'scald';

/** The ratio a preset must keep to keep its name (formula.md, Component style). */
const keepsName = (preset: ComponentPreset, ratio: number): boolean =>
  preset === 'poolish' ? ratio >= 90 : preset === 'tangzhong' ? ratio >= 300 : ratio <= 150;

/** Checks a default for a preset; a new component has no allocation, so its ratio is its hydration. */
export const validateComponentDefault = (
  preset: ComponentPreset,
  value: ComponentDefault,
): Result<ComponentDefault, FormulaError> => {
  const refuse = (field: keyof ComponentDefault, reason: string) =>
    err(
      domainError('InvalidFormula', `Invalid ${preset} default: ${reason}`, {
        path: `defaults.${preset}.${field}`,
        reason,
      }),
    );
  const { flourPct, hydrationPct } = value;
  if (!Number.isFinite(flourPct) || flourPct <= 0 || flourPct > 100) {
    return refuse('flourPct', 'flourPct must be within ]0, 100]');
  }
  if (!Number.isFinite(hydrationPct) || hydrationPct < 0) {
    return refuse('hydrationPct', 'hydrationPct must be ≥ 0');
  }
  if (!keepsName(preset, hydrationPct)) {
    return refuse('hydrationPct', `the ratio no longer names the component a ${preset}`);
  }
  return ok({ flourPct, hydrationPct });
};

/** The `hydrationPct` of a default typed as flour:liquid 1:`parts` (no allocation). */
export const defaultHydrationForRatio = (parts: number): Result<number, FormulaError> =>
  Number.isFinite(parts) && parts > 0
    ? ok(100 * parts)
    : err(
        domainError('InvalidFormula', 'Invalid ratio: the liquid parts must be > 0', {
          path: 'ratio',
          reason: 'the liquid parts must be > 0',
        }),
      );

/**
 * The defaults to use from stored ones of unknown shape: each preset keeps a valid stored default,
 * otherwise falls back to its built-in one.
 */
export const componentDefaultsFrom = (stored: unknown): ComponentDefaults => {
  const record = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<
    string,
    unknown
  >;
  const pick = (preset: ComponentPreset): ComponentDefault => {
    const value = record[preset] as Partial<Record<keyof ComponentDefault, unknown>> | undefined;
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof value.flourPct !== 'number' ||
      typeof value.hydrationPct !== 'number'
    ) {
      return BUILT_IN_COMPONENT_DEFAULTS[preset];
    }
    const valid = validateComponentDefault(preset, {
      flourPct: value.flourPct,
      hydrationPct: value.hydrationPct,
    });
    return valid.ok ? valid.value : BUILT_IN_COMPONENT_DEFAULTS[preset];
  };
  return { poolish: pick('poolish'), tangzhong: pick('tangzhong'), yudane: pick('yudane') };
};

/**
 * A new component for `preset` from `defaults`, with id `id` and the formula's largest flour as its
 * whole blend (the first one on a tie). Adding it is still an `AddComponent` edit.
 */
export const newComponent = (
  formula: Formula,
  preset: ComponentPreset,
  id: string,
  defaults: ComponentDefaults = BUILT_IN_COMPONENT_DEFAULTS,
): Result<Component, FormulaError> => {
  const main = formula.flours.reduce<Formula['flours'][number] | undefined>(
    (best, f) => (best === undefined || f.sharePct > best.sharePct ? f : best),
    undefined,
  );
  if (main === undefined) {
    return err(
      domainError('InvalidFormula', 'A component needs a flour in the formula', {
        path: 'flours',
        reason: 'the formula has no flour',
      }),
    );
  }
  const { flourPct, hydrationPct } = defaults[preset];
  return ok({
    id,
    kind: presetKind(preset),
    flourPct,
    flourBlend: [{ flour: main.id, sharePct: 100 }],
    hydrationPct,
  });
};

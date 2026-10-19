import {
  BUILT_IN_COMPONENT_DEFAULTS,
  componentDefaultsFrom,
  liquidMassRatio,
  presetKind,
  type Component,
  type ComponentDefault,
  type ComponentDefaults,
  type ComponentPreset,
} from '@flourprint/core/domain';

export const COMPONENT_DEFAULTS_STORAGE_KEY = 'flourprint:mockup:component-defaults';

/**
 * Loads and validates component defaults from localStorage (L102).
 * Falls back safely to BUILT_IN_COMPONENT_DEFAULTS if uninitialized or invalid.
 */
export function loadComponentDefaults(): ComponentDefaults {
  if (typeof localStorage === 'undefined') {
    return BUILT_IN_COMPONENT_DEFAULTS;
  }
  try {
    const raw = localStorage.getItem(COMPONENT_DEFAULTS_STORAGE_KEY);
    if (!raw) return BUILT_IN_COMPONENT_DEFAULTS;
    const parsed = JSON.parse(raw);
    return componentDefaultsFrom(parsed);
  } catch {
    return BUILT_IN_COMPONENT_DEFAULTS;
  }
}

/**
 * Persists validated component defaults to localStorage.
 * Does not modify any existing recipe.
 */
export function saveComponentDefaults(defaults: ComponentDefaults): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COMPONENT_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('flourprint:component-defaults-changed', { detail: defaults }),
      );
    }
  } catch {
    // Storage unavailable or quota exceeded; preferences stay in memory.
  }
}

/**
 * Resets preferences to BUILT_IN_COMPONENT_DEFAULTS and saves.
 */
export function resetComponentDefaults(): ComponentDefaults {
  saveComponentDefaults(BUILT_IN_COMPONENT_DEFAULTS);
  return BUILT_IN_COMPONENT_DEFAULTS;
}

/**
 * Calculates the flour:liquid ratio (1:n parts) for a default component without allocation,
 * strictly via the core domain's liquidMassRatio rather than reimplementing ratio arithmetic in the UI.
 */
export function defaultRatioForComponentDefault(
  preset: ComponentPreset,
  value: ComponentDefault,
): number {
  const synthetic: Component = {
    id: preset,
    kind: presetKind(preset),
    flourPct: value.flourPct,
    hydrationPct: value.hydrationPct,
    flourBlend: [{ flour: 'synthetic-base', sharePct: 100 }],
  };
  return liquidMassRatio(synthetic) ?? 1;
}

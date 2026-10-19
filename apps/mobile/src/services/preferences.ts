import type { Clock } from '@flourprint/core/application';
import {
  BUILT_IN_COMPONENT_DEFAULTS,
  componentDefaultsFrom,
  validateComponentDefault,
  type BakeOrigin,
  type ComponentDefault,
  type ComponentDefaults,
  type ComponentPreset,
  type FormulaError,
  type Instant,
  type Result,
  type TemperatureContext,
  type TemperatureUnit,
} from '@flourprint/core/domain';

export type ThemePreference = 'system' | 'light' | 'dark' | 'amoled';

/**
 * Settings of this device, never written into a document, a backup or an export: the simulation
 * mode and its clock offset (ADR 0014), the temperature units (values-and-units.md), the
 * theme preference, and the defaults of new components (formula.md, Component defaults).
 */
export interface DevicePreferences {
  readonly simulation: boolean;
  /** Simulated time ahead of the real clock, in milliseconds; it only grows. */
  readonly offsetMs: number;
  readonly units: Readonly<Record<TemperatureContext, TemperatureUnit>>;
  readonly theme: ThemePreference;
  readonly componentDefaults: ComponentDefaults;
}

export interface PreferenceStore {
  get(): DevicePreferences;
  setSimulation(on: boolean): void;
  /** Moves the simulated clock forward; a negative or invalid step is ignored. */
  advance(ms: number): void;
  setUnit(context: TemperatureContext, unit: TemperatureUnit): void;
  setTheme(theme: ThemePreference): void;
  /** Sets the default of new components of a preset; an invalid default is refused unchanged. */
  setComponentDefault(
    preset: ComponentPreset,
    value: ComponentDefault,
  ): Result<ComponentDefault, FormulaError>;
  subscribe(listener: () => void): () => void;
}

const KEY = 'flourprint.device-preferences';

export const DEFAULT_PREFERENCES: DevicePreferences = {
  simulation: false,
  offsetMs: 0,
  units: { oven: 'C', cold: 'C', ambient: 'C' },
  theme: 'system',
  componentDefaults: BUILT_IN_COMPONENT_DEFAULTS,
};

const decodeTheme = (theme: unknown): ThemePreference =>
  theme === 'light' || theme === 'dark' || theme === 'amoled' ? theme : 'system';

/** Reads stored preferences field by field: anything unreadable keeps its default. */
export const decodePreferences = (raw: string | null | undefined): DevicePreferences => {
  let value: unknown;
  try {
    value = raw ? JSON.parse(raw) : undefined;
  } catch {
    value = undefined;
  }
  const stored = (typeof value === 'object' && value !== null ? value : {}) as Record<
    string,
    unknown
  >;
  const units = (
    typeof stored.units === 'object' && stored.units !== null ? stored.units : {}
  ) as Record<string, unknown>;
  const unit = (context: TemperatureContext): TemperatureUnit =>
    units[context] === 'F' ? 'F' : 'C';
  return {
    simulation: stored.simulation === true,
    offsetMs:
      typeof stored.offsetMs === 'number' && Number.isFinite(stored.offsetMs) && stored.offsetMs > 0
        ? stored.offsetMs
        : 0,
    units: { oven: unit('oven'), cold: unit('cold'), ambient: unit('ambient') },
    theme: decodeTheme(stored.theme),
    componentDefaults: componentDefaultsFrom(stored.componentDefaults),
  };
};

/** Browser storage may be missing or refuse access: preferences then last for the session. */
const read = (): string | null => {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
};
const write = (preferences: DevicePreferences): void => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error(error);
  }
};

/** Synchronously reads stored preferences from storage. */
export const readStoredPreferences = (): DevicePreferences => decodePreferences(read());

/** Synchronously reads the stored theme preference from storage. */
export const readStoredTheme = (): ThemePreference => readStoredPreferences().theme;

export const createPreferences = (): PreferenceStore => {
  let current = decodePreferences(read());
  const listeners = new Set<() => void>();
  const change = (next: DevicePreferences) => {
    current = next;
    write(next);
    for (const listener of listeners) listener();
  };
  return {
    get: () => current,
    setSimulation: (on) => change({ ...current, simulation: on }),
    advance: (ms) => {
      if (Number.isFinite(ms) && ms > 0) change({ ...current, offsetMs: current.offsetMs + ms });
    },
    setUnit: (context, unit) =>
      change({ ...current, units: { ...current.units, [context]: unit } }),
    setTheme: (theme) => change({ ...current, theme: decodeTheme(theme) }),
    setComponentDefault: (preset, value) => {
      const valid = validateComponentDefault(preset, value);
      if (valid.ok) {
        change({
          ...current,
          componentDefaults: { ...current.componentDefaults, [preset]: valid.value },
        });
      }
      return valid;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/** The world of the bakes shown and started: simulated while the mode is on (ADR 0014). */
export const currentWorld = (preferences: DevicePreferences): BakeOrigin =>
  preferences.simulation ? 'simulation' : 'physical';

/** The app's clock: real, plus the offset while the simulation mode is on (ADR 0014). */
export const worldClock = (preferences: PreferenceStore, real: Clock): Clock => ({
  now: () => {
    const { simulation, offsetMs } = preferences.get();
    return !simulation || offsetMs === 0
      ? real.now()
      : (new Date(Date.parse(real.now()) + offsetMs).toISOString() as Instant);
  },
});

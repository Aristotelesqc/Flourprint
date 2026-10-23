import { useState, useLayoutEffect } from 'react';
import {
  celsiusFrom,
  celsiusTo,
  temperatureContext,
  type TemperatureContext,
  type TemperatureUnit,
  type ProcessStep,
} from '@flourprint/core/domain';
import type { Locale } from './messages';

export {
  celsiusFrom,
  celsiusTo,
  temperatureContext,
  type TemperatureContext,
  type TemperatureUnit,
};

export type ThemePreference = 'system' | 'light' | 'dark' | 'amoled';
export type ResolvedTheme = 'light' | 'dark' | 'amoled';

export type ContextTemperatureUnits = Record<TemperatureContext, TemperatureUnit>;

export interface DevicePreferences {
  readonly theme: ThemePreference;
  readonly temperatureUnits: ContextTemperatureUnits;
}

const STORAGE_KEY = 'flourprint.mockup.03.devicePreferences';

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
};

export const getInitialDevicePreferences = (): DevicePreferences => {
  let storedTheme: ThemePreference = 'system';
  let storedUnits: ContextTemperatureUnits = {
    oven: 'C',
    cold: 'C',
    ambient: 'C',
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (['system', 'light', 'dark', 'amoled'].includes(parsed.theme)) {
            storedTheme = parsed.theme;
          }
          if (parsed.temperatureUnits && typeof parsed.temperatureUnits === 'object') {
            storedUnits = {
              oven: parsed.temperatureUnits.oven === 'F' ? 'F' : 'C',
              cold: parsed.temperatureUnits.cold === 'F' ? 'F' : 'C',
              ambient: parsed.temperatureUnits.ambient === 'F' ? 'F' : 'C',
            };
          }
        }
      }
    } catch {
      // Storage access or JSON parsing fallback
    }
  }

  return {
    theme: storedTheme,
    temperatureUnits: storedUnits,
  };
};

export const applyThemeToDocument = (resolved: ResolvedTheme): void => {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = resolved;
  }
};

let currentPreferences: DevicePreferences = getInitialDevicePreferences();
let currentResolvedTheme: ResolvedTheme = resolveTheme(currentPreferences.theme);

// Synchronously apply resolved theme immediately upon module evaluation to eliminate light flash
if (typeof window !== 'undefined') {
  applyThemeToDocument(currentResolvedTheme);
}

type PreferenceListener = (prefs: DevicePreferences, resolved: ResolvedTheme) => void;
const subscribers = new Set<PreferenceListener>();

// MatchMedia listener for system theme preference changes
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSchemeChange = () => {
    if (currentPreferences.theme === 'system') {
      currentResolvedTheme = resolveTheme('system');
      applyThemeToDocument(currentResolvedTheme);
      for (const listener of subscribers) {
        listener(currentPreferences, currentResolvedTheme);
      }
    }
  };
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handleSchemeChange);
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(handleSchemeChange);
  }
}

export const getDevicePreferences = (): DevicePreferences => currentPreferences;
export const getThemePreference = (): ThemePreference => currentPreferences.theme;
export const getResolvedTheme = (): ResolvedTheme => currentResolvedTheme;

export const setDevicePreferences = (patch: {
  theme?: ThemePreference;
  temperatureUnits?: Partial<ContextTemperatureUnits>;
}): void => {
  currentPreferences = {
    theme: patch.theme ?? currentPreferences.theme,
    temperatureUnits: {
      ...currentPreferences.temperatureUnits,
      ...(patch.temperatureUnits ?? {}),
    },
  };
  currentResolvedTheme = resolveTheme(currentPreferences.theme);
  applyThemeToDocument(currentResolvedTheme);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(currentPreferences));
    } catch {
      // Storage write fallback
    }
  }

  for (const listener of subscribers) {
    listener(currentPreferences, currentResolvedTheme);
  }
};

export const setThemePreference = (theme: ThemePreference): void => {
  setDevicePreferences({ theme });
};

export const setContextTemperatureUnit = (
  context: TemperatureContext,
  unit: TemperatureUnit,
): void => {
  setDevicePreferences({
    temperatureUnits: {
      ...currentPreferences.temperatureUnits,
      [context]: unit,
    },
  });
};

export const subscribeDevicePreferences = (listener: PreferenceListener): (() => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

export function useDevicePreferences(): {
  preferences: DevicePreferences;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  setContextTemperatureUnit: (context: TemperatureContext, unit: TemperatureUnit) => void;
} {
  const [state, setState] = useState<{
    preferences: DevicePreferences;
    resolvedTheme: ResolvedTheme;
  }>(() => ({
    preferences: currentPreferences,
    resolvedTheme: currentResolvedTheme,
  }));

  useLayoutEffect(() => {
    return subscribeDevicePreferences((prefs, resolved) => {
      setState({ preferences: prefs, resolvedTheme: resolved });
    });
  }, []);

  return {
    preferences: state.preferences,
    themePreference: state.preferences.theme,
    resolvedTheme: state.resolvedTheme,
    setThemePreference,
    setContextTemperatureUnit,
  };
}

export function useThemePreference(): {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
} {
  const { themePreference, resolvedTheme, setThemePreference } = useDevicePreferences();
  return { themePreference, resolvedTheme, setThemePreference };
}

export function useTemperatureUnit(context: TemperatureContext): {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
} {
  const { preferences, setContextTemperatureUnit } = useDevicePreferences();
  return {
    unit: preferences.temperatureUnits[context],
    setUnit: (unit: TemperatureUnit) => setContextTemperatureUnit(context, unit),
  };
}

/** Formatter helper using core domain unit equations only. */
export const formatTemperature = (
  celsius: number,
  contextOrUnit: TemperatureContext | TemperatureUnit,
  locale: Locale,
  difference = false,
): string => {
  const unit: TemperatureUnit =
    contextOrUnit === 'C' || contextOrUnit === 'F'
      ? contextOrUnit
      : (currentPreferences.temperatureUnits[contextOrUnit] ?? 'C');
  const converted = celsiusTo(celsius, unit, difference);
  const formatted = new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    maximumFractionDigits: 1,
  }).format(converted);
  return `${formatted} °${unit}`;
};

/** Parsing helper returning Celsius for domain storage. */
export const parseTemperature = (
  displayValue: number,
  contextOrUnit: TemperatureContext | TemperatureUnit,
  difference = false,
): number => {
  const unit: TemperatureUnit =
    contextOrUnit === 'C' || contextOrUnit === 'F'
      ? contextOrUnit
      : (currentPreferences.temperatureUnits[contextOrUnit] ?? 'C');
  return celsiusFrom(displayValue, unit, difference);
};

export const getTemperatureUnit = (context: TemperatureContext): TemperatureUnit => {
  return currentPreferences.temperatureUnits[context] ?? 'C';
};

export const formatTemperatureForStep = (
  step: Pick<ProcessStep, 'operation' | 'conditions'>,
  celsius: number,
  locale: Locale,
  difference = false,
): string => {
  const ctx = temperatureContext(step);
  return formatTemperature(celsius, ctx, locale, difference);
};

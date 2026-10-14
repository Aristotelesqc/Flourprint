import {
  type PreferenceStore,
  readStoredTheme,
  type ThemePreference,
} from '../services/preferences';

export type ConcreteTheme = 'light' | 'dark' | 'amoled';

/** Resolves an explicit or automatic theme preference to a concrete theme palette. */
export const resolveConcreteTheme = (
  preference: ThemePreference | string | null | undefined,
  systemIsDark: boolean,
): ConcreteTheme => {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (preference === 'amoled') return 'amoled';
  return systemIsDark ? 'dark' : 'light';
};

const getSystemIsDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getMediaQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia('(prefers-color-scheme: dark)');
};

/**
 * Applies the concrete theme attributes and Ionic dark palette class to document root.
 */
export const applyThemeToDocument = (theme: ConcreteTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  if (theme === 'dark' || theme === 'amoled') {
    root.classList.add('ion-palette-dark');
  } else {
    root.classList.remove('ion-palette-dark');
  }
};

/**
 * Reads stored theme synchronously and applies it immediately to prevent a light flash
 * during async service/storage initialization.
 */
export const initializeDocumentTheme = (): ConcreteTheme => {
  const preference = readStoredTheme();
  const systemIsDark = getSystemIsDark();
  const concrete = resolveConcreteTheme(preference, systemIsDark);
  applyThemeToDocument(concrete);
  return concrete;
};

/**
 * Subscribes to device preferences and system color scheme changes, updating root attributes
 * without mutating stored preference or leaking listeners.
 */
export const attachThemeSync = (preferences: PreferenceStore): (() => void) => {
  const update = () => {
    const preference = preferences.get().theme;
    const systemIsDark = getSystemIsDark();
    const concrete = resolveConcreteTheme(preference, systemIsDark);
    applyThemeToDocument(concrete);
  };

  update();

  const unsubscribePrefs = preferences.subscribe(update);
  const mediaQuery = getMediaQuery();

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
    } else if (typeof (mediaQuery as { addListener?: unknown }).addListener === 'function') {
      (mediaQuery as { addListener: (cb: () => void) => void }).addListener(update);
    }
  }

  return () => {
    unsubscribePrefs();
    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', update);
      } else if (
        typeof (mediaQuery as { removeListener?: unknown }).removeListener === 'function'
      ) {
        (mediaQuery as { removeListener: (cb: () => void) => void }).removeListener(update);
      }
    }
  };
};

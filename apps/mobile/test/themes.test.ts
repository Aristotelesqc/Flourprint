import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreferences, decodePreferences } from '../src/services/preferences';
import { attachThemeSync, initializeDocumentTheme } from '../src/theme/device-theme';

afterEach(() => vi.unstubAllGlobals());

describe('device theme compatibility and persistence', () => {
  it.each(['system', 'light', 'dark', 'amoled'] as const)(
    'reads the explicit %s preference',
    (theme) => {
      expect(decodePreferences(JSON.stringify({ theme })).theme).toBe(theme);
    },
  );

  it('keeps legacy device settings while unknown or unreadable themes follow the system', () => {
    for (const theme of [undefined, null, 42, 'black', {}, ['amoled']]) {
      expect(
        decodePreferences(
          JSON.stringify({
            theme,
            simulation: true,
            offsetMs: 900_000,
            units: { ambient: 'F', oven: 'F' },
          }),
        ),
      ).toEqual({
        theme: 'system',
        simulation: true,
        offsetMs: 900_000,
        units: { oven: 'F', cold: 'C', ambient: 'F' },
      });
    }
    expect(decodePreferences('{broken').theme).toBe('system');
  });

  it('persists AMOLED through the central preference store without losing unrelated settings', () => {
    let raw = JSON.stringify({ simulation: true, offsetMs: 900_000, units: { oven: 'F' } });
    vi.stubGlobal('localStorage', {
      getItem: () => raw,
      setItem: (_key: string, next: string) => {
        raw = next;
      },
    });
    const preferences = createPreferences();
    const subscriber = vi.fn();
    const unsubscribe = preferences.subscribe(subscriber);
    preferences.setTheme('amoled');
    expect(subscriber).toHaveBeenCalledTimes(1);
    preferences.setUnit('ambient', 'F');
    preferences.advance(60_000);
    const reloaded = createPreferences();
    expect(reloaded.get()).toEqual({
      theme: 'amoled',
      simulation: true,
      offsetMs: 960_000,
      units: { oven: 'F', cold: 'C', ambient: 'F' },
    });
    unsubscribe();
    preferences.setTheme('light');
    expect(subscriber).toHaveBeenCalledTimes(3);
  });

  it('applies the stored AMOLED palette before services open, regardless of the OS', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ theme: 'amoled' }) });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const attributes = new Map<string, string>();
    const classes = new Set<string>();
    const root = {
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      style: { colorScheme: '' },
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    };
    vi.stubGlobal('document', { documentElement: root });
    expect(initializeDocumentTheme()).toBe('amoled');
    expect(attributes.get('data-theme')).toBe('amoled');
    expect(root.style.colorScheme).toBe('dark');
    expect(classes.has('ion-palette-dark')).toBe(true);
  });

  it('tracks the OS only for System, keeps explicit choices and removes both listeners', () => {
    let raw: string | null = null;
    vi.stubGlobal('localStorage', {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    });
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('window', { matchMedia: () => media });
    const setAttribute = vi.fn();
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute,
        style: { colorScheme: '' },
        classList: { add: vi.fn(), remove: vi.fn() },
      },
    });
    const preferences = createPreferences();
    const dispose = attachThemeSync(preferences);
    expect(setAttribute).toHaveBeenLastCalledWith('data-theme', 'light');
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(setAttribute).toHaveBeenLastCalledWith('data-theme', 'dark');
    expect(raw).toBeNull();
    preferences.setTheme('amoled');
    const stored = raw;
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(setAttribute).toHaveBeenLastCalledWith('data-theme', 'amoled');
    expect(raw).toBe(stored);
    dispose();
    const applied = setAttribute.mock.calls.length;
    preferences.setTheme('light');
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(setAttribute).toHaveBeenCalledTimes(applied);
  });
});

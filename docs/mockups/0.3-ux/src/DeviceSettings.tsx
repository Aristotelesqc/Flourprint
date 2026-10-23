import React from 'react';
import type { Locale } from './messages';
import { Button } from './ui';
import {
  useDevicePreferences,
  type ThemePreference,
  type TemperatureContext,
  type TemperatureUnit,
} from './device-preferences';
import { preferencesCopy, contextLabel, themeLabel } from './preferences-copy';
import './preferences.css';

export interface DeviceSettingsProps {
  readonly locale: Locale;
}

const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark', 'amoled'];
const TEMPERATURE_CONTEXTS: readonly TemperatureContext[] = ['oven', 'cold', 'ambient'];

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ locale }) => {
  const {
    preferences,
    themePreference,
    resolvedTheme,
    setThemePreference,
    setContextTemperatureUnit,
  } = useDevicePreferences();

  return (
    <div className="fp-device-settings">
      <div className="fp-device-settings-section">
        <h3 className="fp-device-settings-heading">{preferencesCopy(locale, 'appearanceTitle')}</h3>
        <p className="fp-device-settings-description">
          {preferencesCopy(locale, 'appearanceDescription')}
        </p>

        <div
          className="fp-device-settings-options"
          role="group"
          aria-label={preferencesCopy(locale, 'appearanceTitle')}
        >
          {THEME_OPTIONS.map((theme) => {
            const isSelected = themePreference === theme;
            return (
              <Button
                key={theme}
                type="button"
                className="fp-device-settings-btn"
                variant={isSelected ? 'primary' : 'secondary'}
                aria-pressed={isSelected}
                onClick={() => setThemePreference(theme)}
              >
                {themeLabel(locale, theme)}
                {theme === 'system' && isSelected && (
                  <span className="fp-device-settings-badge">
                    ({preferencesCopy(locale, 'systemActivePrefix')}{' '}
                    {themeLabel(locale, resolvedTheme)})
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="fp-device-settings-section">
        <h3 className="fp-device-settings-heading">{preferencesCopy(locale, 'unitsTitle')}</h3>
        <p className="fp-device-settings-description">
          {preferencesCopy(locale, 'unitsDescription')}
        </p>

        {TEMPERATURE_CONTEXTS.map((ctx) => {
          const currentUnit = preferences.temperatureUnits[ctx];
          return (
            <div key={ctx} className="fp-device-settings-row">
              <span className="fp-device-settings-label">{contextLabel(locale, ctx)}</span>
              <div
                className="fp-device-settings-button-group"
                role="group"
                aria-label={contextLabel(locale, ctx)}
              >
                {(['C', 'F'] as const).map((unit: TemperatureUnit) => (
                  <Button
                    key={unit}
                    type="button"
                    className="fp-device-settings-btn"
                    variant={currentUnit === unit ? 'primary' : 'secondary'}
                    aria-pressed={currentUnit === unit}
                    onClick={() => setContextTemperatureUnit(ctx, unit)}
                  >
                    {preferencesCopy(locale, unit === 'C' ? 'unitCelsius' : 'unitFahrenheit')}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

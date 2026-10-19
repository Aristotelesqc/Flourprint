import type { Locale } from './messages';
import type { TemperatureContext } from '@flourprint/core/domain';
import type { ThemePreference } from './device-preferences';

export const preferencesCopyMap = {
  settingsTitle: ['Réglages de l’appareil', 'Device settings'],
  advancedTitle: ['Options avancées et appareil', 'Advanced device options'],
  appearanceTitle: ['Apparence de l’interface', 'Interface appearance'],
  appearanceDescription: [
    'Choisir le thème visuel appliqué à l’appareil, sans scintillement au chargement.',
    'Select the visual theme applied to this device, without light flash on load.',
  ],
  themeSystem: ['Système', 'System'],
  themeLight: ['Clair', 'Light'],
  themeDark: ['Sombre chaud', 'Warm dark'],
  themeAmoled: ['AMOLED', 'AMOLED'],
  systemActivePrefix: ['Actif :', 'Active:'],
  unitsTitle: ['Unités d’affichage des températures', 'Temperature display units'],
  unitsDescription: [
    'Afficher les températures en °C ou °F selon le contexte. Les valeurs sont toujours stockées en °C.',
    'Display temperatures in °C or °F by context. Storage always stays in °C.',
  ],
  contextOven: ['Cuisson au four', 'Oven cooking'],
  contextCold: ['Froid (réfrigérateur / congélateur)', 'Cold (refrigerator / freezer)'],
  contextAmbient: ['Ambiante et température de pâte', 'Ambient and dough temperature'],
  unitCelsius: ['°C', '°C'],
  unitFahrenheit: ['°F', '°F'],
} as const;

export type PreferencesCopyKey = keyof typeof preferencesCopyMap;

export function preferencesCopy(locale: Locale, key: PreferencesCopyKey): string {
  const entry = preferencesCopyMap[key];
  if (!entry) return key;
  return entry[locale === 'fr' ? 0 : 1];
}

export function contextLabel(locale: Locale, context: TemperatureContext): string {
  switch (context) {
    case 'oven':
      return preferencesCopy(locale, 'contextOven');
    case 'cold':
      return preferencesCopy(locale, 'contextCold');
    case 'ambient':
      return preferencesCopy(locale, 'contextAmbient');
  }
}

export function themeLabel(locale: Locale, theme: ThemePreference): string {
  switch (theme) {
    case 'system':
      return preferencesCopy(locale, 'themeSystem');
    case 'light':
      return preferencesCopy(locale, 'themeLight');
    case 'dark':
      return preferencesCopy(locale, 'themeDark');
    case 'amoled':
      return preferencesCopy(locale, 'themeAmoled');
  }
}

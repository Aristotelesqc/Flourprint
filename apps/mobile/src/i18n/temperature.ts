import {
  celsiusFrom,
  celsiusTo,
  type TemperatureContext,
  type TemperatureUnit,
} from '@flourprint/core/domain';
import { useIntl } from 'react-intl';
import { usePreferences } from '../services/use-preferences';

/**
 * The one formatter and parser of temperatures (values-and-units.md, Temperature display units):
 * every temperature shown or typed goes through it, in the unit the device chose for its context.
 * Presentation only: stored values stay in °C and rounding here never feeds back.
 */

/** Whole degrees in °F (smaller degrees), tenths in °C. */
const digits = (unit: TemperatureUnit) => (unit === 'F' ? 0 : 1);

export interface TemperatureOptions {
  /** A difference such as a mixer friction: converted by the scale only. */
  readonly difference?: boolean;
  /** Fraction digits shown, when the default of the unit is too fine. */
  readonly digits?: number;
}

/** `21 °C`, `70 °F`. */
export const formatTemperature = (
  celsius: number,
  unit: TemperatureUnit,
  locale: string,
  options: TemperatureOptions = {},
): string =>
  `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: options.digits ?? digits(unit),
  }).format(celsiusTo(celsius, unit, options.difference))} °${unit}`;

/** Text of a temperature field in the display unit, without grouping so it parses back. */
export const editableTemperature = (
  celsius: number,
  unit: TemperatureUnit,
  locale: string,
  difference = false,
): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: digits(unit), useGrouping: false }).format(
    celsiusTo(celsius, unit, difference),
  );

export const useTemperature = () => {
  const { units } = usePreferences();
  const { locale } = useIntl();
  return {
    /** `°C` or `°F` for a context. */
    unit: (context: TemperatureContext) => `°${units[context]}`,
    format: (celsius: number, context: TemperatureContext, options?: TemperatureOptions) =>
      formatTemperature(celsius, units[context], locale, options),
    editable: (celsius: number, context: TemperatureContext, difference = false) =>
      editableTemperature(celsius, units[context], locale, difference),
    /** A value typed in the context's unit, in °C. */
    toCelsius: (value: number, context: TemperatureContext, difference = false) =>
      celsiusFrom(value, units[context], difference),
  };
};

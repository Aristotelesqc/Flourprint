/**
 * Locale-aware times and durations (ADR 0009). Presentation only: instants stay UTC and durations
 * stay in seconds everywhere else.
 */
import { parseDecimal } from './numbers';

/** `1 h 42 min`, `12 h`, `15 min`; rounded to the minute. "h" and "min" read the same in en and fr. */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(Math.abs(seconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** Text of a duration field, shortest form that parses back. */
export const editableDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
};

/**
 * Parses kitchen input into seconds: `90` and `90 min` are minutes, `2 h`, `1,5 h`, `1h30`,
 * `1 h 30 min` mix hours and minutes. Anything else is refused rather than guessed.
 */
export const parseDuration = (text: string): number | undefined => {
  const compact = text.toLowerCase().replace(/[\s\u00a0\u202f]/g, '');
  if (compact === '') return undefined;
  const hours = /^(\d+(?:[.,]\d+)?)h(?:(\d+)(?:min|m)?)?$/.exec(compact);
  if (hours) {
    const h = parseDecimal(hours[1] ?? '');
    const m = hours[2] === undefined ? 0 : Number(hours[2]);
    if (h === undefined || m >= 60) return undefined;
    return Math.round(h * 3600 + m * 60);
  }
  const minutes = /^(\d+(?:[.,]\d+)?)(?:min|m)?$/.exec(compact);
  if (minutes) {
    const m = parseDecimal(minutes[1] ?? '');
    return m === undefined ? undefined : Math.round(m * 60);
  }
  return undefined;
};

export const formatTime = (instant: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(instant));

export const formatDay = (instant: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(instant),
  );

export const formatDayTime = (instant: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));

/** Local calendar day of an instant, as a grouping key. */
export const localDayKey = (instant: string): string => {
  const date = new Date(instant);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

/** `il y a 4 jours`, `hier`, `in 2 hours`. */
export const formatRelative = (instant: string, now: string, locale: string): string => {
  const seconds = (Date.parse(instant) - Date.parse(now)) / 1000;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  return format.format(Math.round(seconds / 86400), 'day');
};

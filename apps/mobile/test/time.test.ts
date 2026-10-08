import { describe, expect, it } from 'vitest';
import { editableDuration, formatDuration, parseDuration } from '../src/i18n/time';

describe('durations', () => {
  it('formats to the minute', () => {
    expect(formatDuration(12 * 3600)).toBe('12 h');
    expect(formatDuration(6120)).toBe('1 h 42 min');
    expect(formatDuration(900)).toBe('15 min');
    expect(formatDuration(-720)).toBe('12 min');
  });

  it('parses kitchen input in minutes or hours', () => {
    expect(parseDuration('90')).toBe(5400);
    expect(parseDuration('45 min')).toBe(2700);
    expect(parseDuration('2 h')).toBe(7200);
    expect(parseDuration('1,5 h')).toBe(5400);
    expect(parseDuration('1h30')).toBe(5400);
    expect(parseDuration('1 h 30 min')).toBe(5400);
  });

  it('refuses ambiguous input instead of guessing', () => {
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('1 h 75')).toBeUndefined();
    expect(parseDuration('soon')).toBeUndefined();
  });

  it('round-trips its own editable text', () => {
    for (const seconds of [900, 3600, 5400, 43200]) {
      expect(parseDuration(editableDuration(seconds))).toBe(seconds);
    }
  });
});

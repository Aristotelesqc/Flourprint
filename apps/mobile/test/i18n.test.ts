import { describe, expect, it } from 'vitest';
import { catalogs, en, pickLocale } from '../src/i18n/messages';
import { editableNumber, formatGrams, parseDecimal } from '../src/i18n/numbers';

describe('message catalogs', () => {
  it.each(Object.entries(catalogs))('%s has exactly the English keys', (_locale, catalog) => {
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(catalog).every((text) => text.trim().length > 0)).toBe(true);
  });

  it('picks the first supported device language', () => {
    expect(pickLocale(['de-DE', 'fr-CA', 'en'])).toBe('fr');
    expect(pickLocale(['es'])).toBe('en');
  });
});

describe('decimal input', () => {
  it('accepts a comma or a point as decimal separator', () => {
    expect(parseDecimal('2,2')).toBe(2.2);
    expect(parseDecimal('2.2')).toBe(2.2);
    expect(parseDecimal(' 12,5 ')).toBe(12.5);
    expect(parseDecimal('1 000')).toBe(1000);
  });

  it('rejects incomplete or ambiguous input instead of guessing', () => {
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal(',')).toBeUndefined();
    expect(parseDecimal('1,234.5')).toBeUndefined();
    expect(parseDecimal('abc')).toBeUndefined();
  });

  it('formats for display and editing per locale', () => {
    expect(formatGrams(22.5, 'fr-CA')).toBe('22,5 g');
    expect(formatGrams(1776.5, 'en')).toBe('1,777 g');
    expect(editableNumber(2.25, 'fr')).toBe('2,25');
    expect(parseDecimal(editableNumber(1234.5, 'fr'))).toBe(1234.5);
  });
});

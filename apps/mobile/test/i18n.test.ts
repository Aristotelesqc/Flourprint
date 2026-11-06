import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import { catalogs, en, pickLocale } from '../src/i18n/messages';
import {
  editableNumber,
  formatGrams,
  formatPct,
  formatWholePct,
  parseDecimal,
} from '../src/i18n/numbers';

describe('message catalogs', () => {
  it('localizes every selected-source guide key and ingredient name', () => {
    for (const template of RECIPE_TEMPLATES) {
      for (const range of template.guide?.ranges ?? []) {
        expect(Object.hasOwn(en, `guide.key.${range.key}`), `${template.id}: ${range.key}`).toBe(
          true,
        );
      }
      for (const ingredient of template.formula.ingredients) {
        expect(Object.hasOwn(en, `name.${ingredient.id}`), `${template.id}: ${ingredient.id}`).toBe(
          true,
        );
      }
    }
  });

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
    expect(formatGrams(22.5, 'fr-CA')).toBe('23 g');
    expect(formatGrams(1776.5, 'en')).toBe('1,777 g');
    expect(editableNumber(2.25, 'fr')).toBe('2,25');
    expect(parseDecimal(editableNumber(1234.5, 'fr'))).toBe(1234.5);
  });
});

it.each([
  [0, '0', '0'],
  [0.35, '0.35', '0,35'],
  [0.004, '0', '0'],
  [0.005, '0.01', '0,01'],
  [0.999, '1', '1'],
  [1, '1', '1'],
  [3.24, '3.2', '3,2'],
  [8.55, '8.6', '8,6'],
  [9.99, '10', '10'],
  [10, '10', '10'],
  [10.49, '10', '10'],
  [10.5, '11', '11'],
  [-0.35, '-0.35', '-0,35'],
  [-3.24, '-3.2', '-3,2'],
  [-10.5, '-11', '-11'],
] as const)('formats %s grams consistently by magnitude', (value, en, fr) => {
  expect(formatGrams(value, 'en')).toBe(`${en} g`);
  expect(formatGrams(value, 'fr')).toBe(`${fr} g`);
});

it('keeps editable values separate from rounded gram display', () => {
  const quantity = 22.55;
  expect(formatGrams(quantity, 'fr')).toBe('23 g');
  expect(editableNumber(quantity, 'fr')).toBe('22,55');
  expect(parseDecimal(editableNumber(quantity, 'fr'))).toBe(quantity);
  expect(formatGrams(0.35, 'en')).toBe('0.35 g');
  expect(editableNumber(0.35, 'en')).toBe('0.35');
});

it('formats percentage points with locale typography and display-only rounding', () => {
  expect(formatPct(70, 'en')).toBe('70%');
  expect(formatPct(6.4, 'en')).toBe('6.4%');
  expect(formatWholePct(75.02, 'en')).toBe('75%');
  expect(formatPct(6.4, 'fr')).toBe('6,4\u00a0%');
  expect(formatWholePct(75.02, 'fr')).toBe('75\u00a0%');
  expect(formatPct(0, 'en')).toBe('0%');
});

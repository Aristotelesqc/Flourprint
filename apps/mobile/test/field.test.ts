import { describe, expect, it } from 'vitest';
import { editableNumber, parseDecimal } from '../src/i18n/numbers';
import { editableDuration, parseDuration } from '../src/i18n/time';
import { decideCommit } from '../src/ui/Field';

const number = (text: string) => {
  const value = parseDecimal(text);
  return value === undefined ? ({ ok: false } as const) : ({ ok: true, value } as const);
};
const duration = (text: string) => {
  const value = parseDuration(text);
  return value === undefined ? ({ ok: false } as const) : ({ ok: true, value } as const);
};

describe('leaving a field (Codex audit finding 1)', () => {
  it.each(['en', 'fr'])('never commits an untouched rounded number in %s', (locale) => {
    const precise = 2.2025912838633688;
    const shown = editableNumber(precise, locale);
    expect(shown).toBe(locale === 'fr' ? '2,2' : '2.2');
    expect(decideCommit(shown, shown, number)).toEqual({ kind: 'none' });
  });

  it('never commits an untouched duration that is not a whole minute', () => {
    const shown = editableDuration(61);
    expect(decideCommit(shown, shown, duration)).toEqual({ kind: 'none' });
  });

  it('commits what was typed, in either decimal style', () => {
    expect(decideCommit('2,5', '2,2', number)).toEqual({ kind: 'commit', value: 2.5 });
    expect(decideCommit('2.5', '2.2', number)).toEqual({ kind: 'commit', value: 2.5 });
    expect(decideCommit('1 h 30', '1 h', duration)).toEqual({ kind: 'commit', value: 5400 });
  });

  it('keeps an incomplete draft as invalid instead of guessing', () => {
    expect(decideCommit('2,', '2,2', number)).toEqual({ kind: 'commit', value: 2 });
    expect(decideCommit(',', '2,2', number)).toEqual({ kind: 'invalid' });
    expect(decideCommit('soon', '1 h', duration)).toEqual({ kind: 'invalid' });
  });
});

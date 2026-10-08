import { describe, expect, it } from 'vitest';
import { parseInstant } from '../src/domain/index.js';

describe('parseInstant', () => {
  it('accepts UTC ISO instants', () => {
    expect(parseInstant('2026-10-06T14:05:00Z').ok).toBe(true);
    expect(parseInstant('2026-10-06T14:05:00.123Z').ok).toBe(true);
  });

  it('rejects offsets, local times and impossible dates', () => {
    expect(parseInstant('2026-10-06T14:05:00+02:00').ok).toBe(false);
    expect(parseInstant('2026-10-06T14:05:00').ok).toBe(false);
    expect(parseInstant('2026-13-45T99:00:00Z').ok).toBe(false);
  });

  it('rejects calendar dates that do not exist instead of rolling them over', () => {
    expect(parseInstant('2026-02-30T12:00:00Z').ok).toBe(false);
    expect(parseInstant('2026-04-31T12:00:00Z').ok).toBe(false);
    expect(parseInstant('2025-02-29T12:00:00Z').ok).toBe(false);
    expect(parseInstant('2028-02-29T12:00:00Z').ok).toBe(true);
    expect(parseInstant('2026-10-06T23:59:59.5Z').ok).toBe(true);
  });
});

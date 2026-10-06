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
});

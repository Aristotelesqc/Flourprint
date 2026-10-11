import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_FLOURS,
  builtInFlour,
  customizeFlour,
  FLOUR_PROPERTY_KEYS,
  newFlourEntry,
  nextFlourVersion,
  validateFlourEntry,
  type FlourEntry,
  type Instant,
} from '../src/domain/index.js';
import { decodeFlourEntry } from '../src/application/index.js';
import { Refused } from '../src/application/decode.js';

const at = '2026-10-11T09:00:00.000Z' as Instant;
const later = '2026-10-11T10:00:00.000Z' as Instant;

describe('built-in flour entries (flours.md)', () => {
  it('are the ten listed entries, valid, version 1, with every property unknown', () => {
    expect(BUILT_IN_FLOURS.map((f) => f.id)).toEqual([
      'all-purpose-flour',
      'bread-flour',
      'bise-flour',
      'whole-wheat',
      'whole-grain-wheat',
      'flour',
      'spelt-flour',
      'brown-flour',
      'tipo-00-flour',
      'cornmeal',
    ]);
    for (const entry of BUILT_IN_FLOURS) {
      expect(validateFlourEntry(entry).ok).toBe(true);
      expect(entry).toMatchObject({ version: 1, builtIn: true, archived: false });
      expect(entry.name).toBeUndefined();
      expect(entry.organic).toEqual({ status: 'unknown' });
      for (const key of FLOUR_PROPERTY_KEYS) {
        expect(entry.properties[key]).toEqual({ status: 'unknown' });
      }
    }
    expect(builtInFlour('tipo-00-flour')?.classification).toEqual({ system: 'IT', code: '00' });
    expect(builtInFlour('whole-grain-wheat')?.refinement).toBe('wholeGrain');
    expect(builtInFlour('cornmeal')?.cereal).toBe('corn');
  });
});

describe('personal flour entries', () => {
  const bread = builtInFlour('bread-flour') as FlourEntry;

  it('customizes a built-in into a personal entry based on its version', () => {
    const mine = customizeFlour(bread, { id: 'mine', name: 'Farine à pain', createdAt: at });
    expect(mine).toEqual({
      ...bread,
      id: 'mine',
      name: 'Farine à pain',
      builtIn: false,
      basedOn: { id: 'bread-flour', version: 1 },
      createdAt: at,
    });
    expect(validateFlourEntry(mine).ok).toBe(true);
  });

  it('writes the next version with the changes, never for a built-in', () => {
    const mine = newFlourEntry({ id: 'mine', name: 'Mine', createdAt: at });
    const next = nextFlourVersion(
      mine,
      {
        brand: 'Mill',
        properties: {
          ...mine.properties,
          proteinPct: {
            status: 'known',
            value: 13.2,
            unit: 'pct',
            basis: 'asIs',
            source: { kind: 'package' },
          },
        },
      },
      later,
    );
    expect(next).toMatchObject({ ok: true, value: { id: 'mine', version: 2, brand: 'Mill' } });
    // Clearing an optional field removes it.
    if (!next.ok) throw new Error('refused');
    const cleared = nextFlourVersion(next.value, { brand: undefined }, later);
    expect(cleared.ok && 'brand' in cleared.value).toBe(false);
    expect(nextFlourVersion(bread, { brand: 'X' }, later)).toMatchObject({ ok: false });
  });

  it.each<[string, Partial<FlourEntry>]>([
    ['a personal entry without a name', { name: ' ' }],
    ['a personal entry with a built-in id', { id: 'bread-flour' }],
    ['an unknown cereal', { cereal: 'barley' as FlourEntry['cereal'] }],
    [
      'a protein with a per-serving basis',
      {
        properties: {
          ...newFlourEntry({ id: 'x', name: 'X', createdAt: at }).properties,
          proteinPct: {
            status: 'known',
            value: 4,
            basis: 'perServing',
            source: { kind: 'package' },
          },
        },
      },
    ],
    [
      'a malted value that is not a boolean',
      {
        properties: {
          ...newFlourEntry({ id: 'x', name: 'X', createdAt: at }).properties,
          malted: { status: 'known', value: 1, source: { kind: 'producer' } },
        },
      },
    ],
    [
      'a falling number with a percentage unit',
      {
        properties: {
          ...newFlourEntry({ id: 'x', name: 'X', createdAt: at }).properties,
          fallingNumberS: { status: 'known', value: 300, unit: 'pct', source: { kind: 'lab' } },
        },
      },
    ],
    ['a classification without a code', { classification: { system: 'FR', code: '' } }],
  ])('refuses %s', (_case, changes) => {
    const entry = { ...newFlourEntry({ id: 'mine', name: 'Mine', createdAt: at }), ...changes };
    expect(validateFlourEntry(entry)).toMatchObject({
      ok: false,
      error: { code: 'InvalidFlourEntry' },
    });
  });

  it('decodes a stored entry and refuses unknown fields', () => {
    const mine = customizeFlour(bread, { id: 'mine', name: 'Mine', createdAt: at });
    const json = JSON.parse(JSON.stringify(mine)) as Record<string, unknown>;
    expect(decodeFlourEntry(json)).toEqual(mine);
    expect(() => decodeFlourEntry({ ...json, extra: 1 })).toThrow(Refused);
    expect(() =>
      decodeFlourEntry({ ...json, organic: { status: 'unknown', value: false } }),
    ).toThrow(Refused);
  });
});

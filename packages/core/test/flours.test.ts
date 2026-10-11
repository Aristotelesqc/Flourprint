import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_FLOUR_VERSION,
  BUILT_IN_FLOUR_VERSIONS,
  BUILT_IN_FLOURS,
  builtInFlour,
  OFFERED_BUILT_IN_FLOURS,
  customizeFlour,
  FLOUR_PROPERTY_KEYS,
  newFlourEntry,
  nextFlourVersion,
  validateFlourEntry,
  type FlourEntry,
  type Instant,
} from '../src/domain/index.js';
import { decodeFlourEntry, flourRefsOf } from '../src/application/index.js';
import { Refused } from '../src/application/decode.js';

const at = '2026-10-11T09:00:00.000Z' as Instant;
const later = '2026-10-11T10:00:00.000Z' as Instant;

describe('built-in flour entries (flours.md)', () => {
  const ids = [
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
  ];

  it('are the ten listed entries, valid, at version 2', () => {
    expect(BUILT_IN_FLOUR_VERSION).toBe(2);
    expect(BUILT_IN_FLOURS.map((f) => f.id)).toEqual(ids);
    for (const entry of BUILT_IN_FLOURS) {
      expect(validateFlourEntry(entry).ok).toBe(true);
      expect(entry).toMatchObject({ version: 2, builtIn: true, archived: false });
      expect(entry.name).toBeUndefined();
      expect(entry.organic).toEqual({ status: 'unknown' });
      for (const key of FLOUR_PROPERTY_KEYS.filter((k) => k !== 'proteinPct')) {
        expect(entry.properties[key]).toEqual({ status: 'unknown' });
      }
    }
    expect(builtInFlour('tipo-00-flour')?.classification).toEqual({ system: 'IT', code: '00' });
    expect(builtInFlour('whole-grain-wheat')?.refinement).toBe('wholeGrain');
    expect(builtInFlour('cornmeal')?.cereal).toBe('corn');
  });

  it('give version 2 a typical protein, estimated with half the range, from a reference', () => {
    const typical = Object.fromEntries(
      BUILT_IN_FLOURS.map((f) => {
        const p = f.properties.proteinPct;
        return [f.id, p.status === 'unknown' ? undefined : [p.value, p.uncertainty]];
      }),
    );
    expect(typical).toEqual({
      'all-purpose-flour': [12.5, 1],
      'bread-flour': [13.5, 1],
      'bise-flour': [12.5, 1.5],
      'whole-wheat': [13.5, 1.5],
      'whole-grain-wheat': [13.5, 1.5],
      flour: undefined,
      'spelt-flour': [13, 2],
      'brown-flour': [12.5, 1.5],
      'tipo-00-flour': [12, 1.5],
      cornmeal: [7.5, 1],
    });
    expect(builtInFlour('bread-flour')?.properties.proteinPct).toEqual({
      status: 'estimated',
      value: 13.5,
      uncertainty: 1,
      unit: 'pct',
      basis: 'asIs',
      source: {
        kind: 'reference',
        detail: 'Typical range for the category (Canada); unverified, see #34',
      },
    });
  });

  it('keep version 1 resolvable, with every property unknown', () => {
    for (const id of ids) {
      const first = builtInFlour(id, 1);
      expect(first).toMatchObject({ id, version: 1, builtIn: true });
      expect(validateFlourEntry(first as FlourEntry).ok).toBe(true);
      for (const key of FLOUR_PROPERTY_KEYS) {
        expect(first?.properties[key]).toEqual({ status: 'unknown' });
      }
      expect(builtInFlour(id, 2)).toBe(builtInFlour(id));
    }
    expect(builtInFlour('bread-flour', 3)).toBeUndefined();
    expect(BUILT_IN_FLOUR_VERSIONS).toHaveLength(20);
  });

  it('offer every built-in but the generic flour, which stays resolvable', () => {
    expect(OFFERED_BUILT_IN_FLOURS.map((f) => f.id)).toEqual(ids.filter((id) => id !== 'flour'));
    expect(builtInFlour('flour')).toMatchObject({ id: 'flour', version: 2 });
  });

  it('are recorded by a bake at their current version', () => {
    const mine = newFlourEntry({ id: 'mine', name: 'Mine', createdAt: at });
    expect(flourRefsOf(['bread-flour', 'mine', 'typed', 'bread-flour'], [mine])).toEqual([
      { id: 'bread-flour', version: 2 },
      { id: 'mine', version: 1 },
    ]);
  });
});

describe('personal flour entries', () => {
  const bread = builtInFlour('bread-flour') as FlourEntry;

  it('customizes a built-in into a personal entry based on its version', () => {
    const mine = customizeFlour(bread, { id: 'mine', name: 'Farine à pain', createdAt: at });
    expect(mine).toEqual({
      ...bread,
      id: 'mine',
      version: 1,
      name: 'Farine à pain',
      builtIn: false,
      basedOn: { id: 'bread-flour', version: 2 },
      createdAt: at,
    });
    // The typical values are copied, still estimated: the baker replaces them.
    expect(mine.properties.proteinPct).toEqual(bread.properties.proteinPct);
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

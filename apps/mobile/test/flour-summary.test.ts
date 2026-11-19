import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_FLOURS,
  builtInFlour,
  newFlourEntry,
  type FlourEntry,
  type Instant,
} from '@flourprint/core/domain';
import { en, fr, type MessageKey } from '../src/i18n/messages';
import { flourForm, formChanges, withPropertyValue } from '../src/services/flour-form';
import { flourSummary } from '../src/services/flour-summary';

const translate =
  (catalog: Record<MessageKey, string>) =>
  (key: MessageKey, values: Record<string, string | number> = {}) =>
    catalog[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

const at = '2026-10-11T09:00:00.000Z' as Instant;

describe('flour summary (Formula tab, Flours screen)', () => {
  it('shows estimated values with ≈ and leaves unknown ones out', () => {
    const bread = builtInFlour('bread-flour') as FlourEntry;
    expect(flourSummary(bread, translate(fr), 'fr-CA')).toBe('Protéines ≈ 13,5\u00a0%');
    const tipo = builtInFlour('tipo-00-flour') as FlourEntry;
    expect(flourSummary(tipo, translate(en), 'en')).toBe('Protein ≈ 12% · IT 00');
    expect(flourSummary(builtInFlour('flour') as FlourEntry, translate(fr), 'fr')).toBe('');
    expect(flourSummary(builtInFlour('bread-flour', 1) as FlourEntry, translate(fr), 'fr')).toBe(
      '',
    );
  });

  it('shows known values plain, true flags only', () => {
    const mine: FlourEntry = {
      ...newFlourEntry({ id: 'mine', name: 'Mine', createdAt: at }),
      classification: { system: 'FR', code: 'T65' },
      organic: { status: 'known', value: true, source: { kind: 'package' } },
      properties: {
        ...newFlourEntry({ id: 'mine', name: 'Mine', createdAt: at }).properties,
        proteinPct: {
          status: 'known',
          value: 13.5,
          unit: 'pct',
          basis: 'asIs',
          source: { kind: 'package' },
        },
        fallingNumberS: { status: 'known', value: 320, unit: 's', source: { kind: 'lab' } },
        malted: { status: 'known', value: false, source: { kind: 'producer' } },
      },
    };
    expect(flourSummary(mine, translate(fr), 'fr-CA')).toBe(
      'Protéines 13,5\u00a0% · FR T65 · bio · Indice de chute 320 s',
    );
  });

  it('describes every built-in in both languages', () => {
    for (const entry of BUILT_IN_FLOURS) {
      const key = `flour.${entry.id}.description`;
      expect(key in en && key in fr).toBe(true);
    }
  });
});

describe('flour form over a typical value', () => {
  const custom: FlourEntry = {
    ...(builtInFlour('bread-flour') as FlourEntry),
    id: 'mine',
    name: 'Mine',
    builtIn: false,
    basedOn: { id: 'bread-flour', version: 2 },
  };

  it('keeps an untouched estimate as recorded', () => {
    const form = flourForm(custom, 'Mine', 'fr');
    expect(form.properties.proteinPct.estimated).toBe(true);
    const read = formChanges(form, custom, 'fr');
    expect(read.ok && read.changes.properties?.proteinPct).toEqual(custom.properties.proteinPct);
  });

  it('replaces it with a known value from the package once the baker types one', () => {
    const form = flourForm(custom, 'Mine', 'fr');
    const typed = withPropertyValue(form.properties.proteinPct, '13,2');
    expect(typed).toMatchObject({ estimated: false, source: 'package', detail: '' });
    const read = formChanges(
      { ...form, properties: { ...form.properties, proteinPct: typed } },
      custom,
      'fr',
    );
    expect(read.ok && read.changes.properties?.proteinPct).toEqual({
      status: 'known',
      value: 13.2,
      unit: 'pct',
      basis: 'asIs',
      source: { kind: 'package' },
    });
  });
});

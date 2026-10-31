import { describe, expect, it } from 'vitest';
import { resolveFormula, type Formula } from '@flourprint/core/domain';
import { totalWaterKey } from '../src/blocks/water-label';
import { en, fr } from '../src/i18n/messages';

const formula = (extra: Formula['ingredients']): Formula => ({
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }, ...extra],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
});

const keyFor = (f: Formula) => {
  const resolved = resolveFormula(f);
  if (!resolved.ok) throw new Error(resolved.error.code);
  return { key: totalWaterKey(resolved.value.totalWater), water: resolved.value.totalWater };
};

describe('total water label (PR #31 follow-up)', () => {
  it('never presents an estimate with an unknown contributor as a lower bound', () => {
    // 700 g water, 100 g at 80 % (70–90 %) and 1 g unknown: 771 g is possible, below 780 g.
    const { key, water } = keyFor(
      formula([
        {
          id: 'milk',
          kind: 'other',
          bakerPct: 10,
          role: 'dough',
          water: { status: 'estimated', valuePct: 80, rangePct: [70, 90] },
        },
        { id: 'yeast', kind: 'other', bakerPct: 0.1, role: 'dough', water: { status: 'unknown' } },
      ]),
    );
    expect(water.value).toBe(780);
    expect(water.completeness).toBe('incomplete');
    expect(key).toBe('formula.stat.totalWaterSpecifiedEstimate');
    expect(en[key]).toBe('Specified part (estimated): {pct}');
    expect(fr[key]).toBe('Partie renseignée (estimée) : {pct}');
    expect(en[key]).not.toContain('≥');
    expect(fr[key]).not.toContain('≥');
  });

  it('uses a lower bound only when every specified contribution is known', () => {
    const { key, water } = keyFor(
      formula([
        {
          id: 'milk',
          kind: 'other',
          bakerPct: 10,
          role: 'dough',
          water: { status: 'known', valuePct: 80 },
        },
        { id: 'yeast', kind: 'other', bakerPct: 0.1, role: 'dough', water: { status: 'unknown' } },
      ]),
    );
    expect(water.value).toBe(780);
    expect(water.completeness).toBe('incomplete');
    expect(water.range).toBeUndefined();
    expect(water.unknownContributors).toEqual(['yeast']);
    expect(key).toBe('formula.stat.totalWaterLowerBound');
    expect(en[key]).toBe('≥ {pct}');
    expect(fr[key]).toBe('≥ {pct}');
  });
  it('shows a plain value only when every contribution is known exactly', () => {
    expect(keyFor(formula([])).key).toBe('formula.stat.totalWaterValue');
    expect(
      keyFor(
        formula([
          {
            id: 'milk',
            kind: 'other',
            bakerPct: 10,
            role: 'dough',
            water: { status: 'estimated', valuePct: 80, rangePct: [70, 90] },
          },
        ]),
      ).key,
    ).toBe('formula.stat.totalWaterEstimate');
  });

  it('marks an estimate without a range as an estimate too', () => {
    const { key, water } = keyFor(
      formula([
        {
          id: 'milk',
          kind: 'other',
          bakerPct: 10,
          role: 'dough',
          water: { status: 'estimated', valuePct: 88 },
        },
      ]),
    );
    expect(water.range).toBeUndefined();
    expect(key).toBe('formula.stat.totalWaterEstimate');
  });
});

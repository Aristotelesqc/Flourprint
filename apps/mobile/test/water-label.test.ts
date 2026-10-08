import { describe, expect, it } from 'vitest';
import { resolveFormula, type Formula } from '@flourprint/core/domain';
import { totalWaterKey } from '../src/blocks/water-label';
import { en } from '../src/i18n/messages';

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
    expect(key).toBe('formula.stat.totalWaterEstimate');
    expect(en[key]).not.toContain('≥');
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
});

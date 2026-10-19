import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_COMPONENT_DEFAULTS,
  applyFormulaEdit,
  componentDefaultsFrom,
  componentStyle,
  defaultHydrationForRatio,
  newComponent,
  validateComponentDefault,
  type Formula,
} from '../src/domain/index.js';

/** Values computed by hand (formula.md, Component defaults). */
const formula: Formula = {
  flours: [
    { id: 'whole', sharePct: 30 },
    { id: 'bread', sharePct: 70 },
  ],
  ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};

describe('component defaults', () => {
  it('starts from the built-in defaults', () => {
    expect(BUILT_IN_COMPONENT_DEFAULTS).toEqual({
      poolish: { flourPct: 20, hydrationPct: 100 },
      tangzhong: { flourPct: 5, hydrationPct: 500 },
      yudane: { flourPct: 5, hydrationPct: 100 },
    });
  });

  it('builds a new component from the largest flour, and the engine accepts it', () => {
    const made = newComponent(formula, 'tangzhong', 'tangzhong');
    if (!made.ok) throw new Error(made.error.message);
    expect(made.value).toEqual({
      id: 'tangzhong',
      kind: 'scald',
      flourPct: 5,
      flourBlend: [{ flour: 'bread', sharePct: 100 }],
      hydrationPct: 500,
    });
    // 50 g of bread flour and 250 g of water: 1:5, named tangzhong.
    const added = applyFormulaEdit(formula, { type: 'AddComponent', component: made.value });
    if (!added.ok) throw new Error(added.error.message);
    expect(componentStyle(added.value, made.value)).toBe('tangzhong');
  });

  it('takes the first flour on a tie and refuses a formula without flour', () => {
    const tie: Formula = {
      ...formula,
      flours: [
        { id: 'a', sharePct: 50 },
        { id: 'b', sharePct: 50 },
      ],
    };
    const made = newComponent(tie, 'poolish', 'poolish');
    expect(made.ok && made.value.flourBlend).toEqual([{ flour: 'a', sharePct: 100 }]);
    expect(newComponent({ ...formula, flours: [] }, 'yudane', 'yudane')).toMatchObject({
      ok: false,
      error: { code: 'InvalidFormula', details: { path: 'flours' } },
    });
  });

  it('uses the user default for new components', () => {
    const defaults = {
      ...BUILT_IN_COMPONENT_DEFAULTS,
      poolish: { flourPct: 30, hydrationPct: 100 },
    };
    const made = newComponent(formula, 'poolish', 'poolish', defaults);
    expect(made.ok && made.value).toMatchObject({ kind: 'preferment', flourPct: 30 });
  });

  it('keeps each preset named by its ratio, at the thresholds', () => {
    const at = (preset: 'poolish' | 'tangzhong' | 'yudane', hydrationPct: number) =>
      validateComponentDefault(preset, { flourPct: 5, hydrationPct }).ok;
    expect([at('tangzhong', 300), at('tangzhong', 299)]).toEqual([true, false]);
    expect([at('yudane', 150), at('yudane', 151)]).toEqual([true, false]);
    expect([at('poolish', 90), at('poolish', 89)]).toEqual([true, false]);
    expect(validateComponentDefault('yudane', { flourPct: 5, hydrationPct: 151 })).toMatchObject({
      error: { details: { path: 'defaults.yudane.hydrationPct' } },
    });
  });

  it('refuses a flour share outside ]0, 100] and a negative or non-finite hydration', () => {
    const flour = (flourPct: number) =>
      validateComponentDefault('poolish', { flourPct, hydrationPct: 100 }).ok;
    expect([flour(0), flour(0.1), flour(100), flour(100.1), flour(Number.NaN)]).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(validateComponentDefault('yudane', { flourPct: 5, hydrationPct: -1 }).ok).toBe(false);
    expect(validateComponentDefault('tangzhong', { flourPct: 5, hydrationPct: Infinity }).ok).toBe(
      false,
    );
  });

  it('reads a ratio 1:n as n × 100 % hydration', () => {
    expect(defaultHydrationForRatio(5)).toEqual({ ok: true, value: 500 });
    expect(defaultHydrationForRatio(1)).toEqual({ ok: true, value: 100 });
    expect(defaultHydrationForRatio(0).ok).toBe(false);
  });

  it('falls back preset by preset when stored defaults are missing or invalid', () => {
    expect(componentDefaultsFrom(undefined)).toEqual(BUILT_IN_COMPONENT_DEFAULTS);
    expect(
      componentDefaultsFrom({
        poolish: { flourPct: 25, hydrationPct: 100 },
        tangzhong: { flourPct: 5, hydrationPct: 200 },
        yudane: 'x',
      }),
    ).toEqual({
      poolish: { flourPct: 25, hydrationPct: 100 },
      tangzhong: BUILT_IN_COMPONENT_DEFAULTS.tangzhong,
      yudane: BUILT_IN_COMPONENT_DEFAULTS.yudane,
    });
  });
});

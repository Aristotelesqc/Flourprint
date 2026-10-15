import { describe, expect, it } from 'vitest';
import { parseFormula } from '../src/contracts/index.js';
import {
  componentStyle,
  hydrationForRatio,
  liquidMassRatio,
  liquidRatioPct,
  resolveFormula,
  type Component,
  type Formula,
} from '../src/domain/index.js';

/** 1000 g flour; values computed by hand (formula.md, Fat and sugar). */
const enriched: Formula = {
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 50, role: 'dough' },
    {
      id: 'milk',
      kind: 'other',
      bakerPct: 20,
      role: 'dough',
      water: { status: 'estimated', valuePct: 88, rangePct: [87, 91] },
      fat: { status: 'estimated', valuePct: 3.25, rangePct: [0.1, 3.6], source: 'USDA' },
      sugar: { status: 'known', valuePct: 5 },
    },
    {
      id: 'butter',
      kind: 'other',
      bakerPct: 10,
      role: 'dough',
      water: { status: 'known', valuePct: 16 },
      fat: { status: 'known', valuePct: 81 },
      sugar: { status: 'known', valuePct: 0 },
    },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      fat: { status: 'known', valuePct: 0 },
    },
    {
      id: 'oil-topping',
      kind: 'other',
      bakerPct: 5,
      role: 'topping',
      fat: { status: 'known', valuePct: 100 },
    },
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};

const resolve = (formula: Formula) => {
  const result = resolveFormula(formula);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

describe('fat and sugar totals', () => {
  it('sums the added fat of dough ingredients, with ranges', () => {
    const r = resolve(enriched);
    // milk 200 g × 3.25 % = 6.5 g; butter 100 g × 81 % = 81 g; salt 0; topping excluded
    expect(r.totalFat?.value).toBeCloseTo(87.5, 9);
    expect(r.totalFat?.range?.[0]).toBeCloseTo(0.2 + 81, 9);
    expect(r.totalFat?.range?.[1]).toBeCloseTo(7.2 + 81, 9);
    expect(r.totalFatPct).toBeCloseTo(8.75, 9);
    expect(r.totalFat?.completeness).toBe('complete');
  });

  it('never counts an unknown content as zero', () => {
    const r = resolve(enriched);
    // salt has no sugar content: the sugar total is incomplete
    expect(r.totalSugar?.value).toBeCloseTo(10, 9);
    expect(r.totalSugar?.completeness).toBe('incomplete');
    expect(r.totalSugar?.unknownContributors).toEqual(['salt']);
  });

  it('accepts composition with a source at the boundary and refuses more than 100 %', () => {
    expect(parseFormula(enriched).ok).toBe(true);
    const tooMuch = {
      ...enriched,
      ingredients: [
        {
          id: 'oil',
          kind: 'other',
          bakerPct: 5,
          role: 'dough',
          fat: { status: 'known', valuePct: 120 },
        },
      ],
    };
    expect(parseFormula(tooMuch).ok).toBe(false);
  });
});

describe('composition checks in the domain', () => {
  const butter = (content: Record<string, unknown>): Formula => ({
    ...enriched,
    ingredients: [
      { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
      { id: 'butter', kind: 'other', bakerPct: 10, role: 'dough', ...content },
    ],
  });

  it.each([
    ['fat above 100 %', { fat: { status: 'known', valuePct: 250 } }],
    ['a reversed sugar range', { sugar: { status: 'estimated', valuePct: 5, rangePct: [8, 2] } }],
    [
      'a range that misses its value',
      { fat: { status: 'estimated', valuePct: 5, rangePct: [6, 9] } },
    ],
    ['an unknown status', { water: { status: 'guessed', valuePct: 5 } }],
  ])('refuses %s', (_case, content) => {
    expect(resolveFormula(butter(content)).ok).toBe(false);
  });

  it('refuses an unknown role, kind or anchor', () => {
    const role = {
      ...enriched,
      ingredients: [{ id: 'b', kind: 'other', bakerPct: 10, role: 'doh' }],
    };
    expect(resolveFormula(role as unknown as Formula).ok).toBe(false);
    const anchor = { ...enriched, anchor: {} };
    expect(resolveFormula(anchor as unknown as Formula).ok).toBe(false);
  });

  it('counts nothing unknown about an ingredient at 0 g', () => {
    const formula: Formula = {
      ...enriched,
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
        { id: 'malt', kind: 'other', bakerPct: 0, role: 'dough' },
      ],
    };
    const r = resolve(formula);
    expect(r.totalWater.completeness).toBe('complete');
    expect(r.totalFat?.unknownContributors).toEqual([]);
    expect(r.totalSugar?.completeness).toBe('complete');
  });
});

const withComponent = (component: Component, extra: Formula['ingredients'] = []): Formula => ({
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [{ id: 'water', kind: 'water', bakerPct: 80, role: 'dough' }, ...extra],
  components: [component],
  anchor: { kind: 'flourTotal', grams: 1000 },
});

const scald = (hydrationPct: number): Component => ({
  id: 'scald',
  kind: 'scald',
  flourPct: 5,
  flourBlend: [{ flour: 'bread', sharePct: 100 }],
  hydrationPct,
});

const preferment = (hydrationPct: number): Component => ({
  id: 'pf',
  kind: 'preferment',
  flourPct: 20,
  flourBlend: [{ flour: 'bread', sharePct: 100 }],
  hydrationPct,
});

const only = (formula: Formula): Component => {
  const [component] = formula.components;
  if (!component) throw new Error('no component');
  return component;
};

describe('component style', () => {
  it.each([
    [500, 'tangzhong'],
    [300, 'tangzhong'],
    [200, 'scald'],
    [150, 'yudane'],
    [100, 'yudane'],
  ])('a scald at %i %% is a %s', (ratio, style) => {
    const formula = withComponent(scald(ratio));
    expect(componentStyle(formula, only(formula))).toBe(style);
  });

  it.each([
    [100, 'poolish'],
    [90, 'poolish'],
    [75, 'preferment'],
    [65, 'biga'],
    [50, 'biga'],
  ])('a preferment at %i %% is a %s', (ratio, style) => {
    const formula = withComponent(preferment(ratio));
    expect(componentStyle(formula, only(formula))).toBe(style);
  });

  it('counts the water of allocated ingredients: a milk tangzhong', () => {
    // 5 % flour, no pool water, 25 % milk at 88 % water: r = 100 × 22 / 5 = 440
    const milk = {
      id: 'milk',
      kind: 'other' as const,
      bakerPct: 25,
      role: 'dough' as const,
      water: { status: 'known' as const, valuePct: 88 },
    };
    const formula = withComponent(
      { ...scald(0), allocations: [{ ingredient: 'milk', bakerPct: 25 }] },
      [milk],
    );
    expect(liquidRatioPct(formula, only(formula))).toBeCloseTo(440, 9);
    expect(componentStyle(formula, only(formula))).toBe('tangzhong');
  });

  it('is undefined when an allocated ingredient has an unknown water content', () => {
    const formula = withComponent(
      { ...scald(0), allocations: [{ ingredient: 'milk', bakerPct: 25 }] },
      [{ id: 'milk', kind: 'other', bakerPct: 25, role: 'dough' }],
    );
    expect(componentStyle(formula, only(formula))).toBeUndefined();
  });
});

describe('ratio entry by mass (formula.md, Ratio entry)', () => {
  const milk = {
    id: 'milk',
    kind: 'other' as const,
    bakerPct: 25,
    role: 'dough' as const,
    water: { status: 'known' as const, valuePct: 88 },
  };
  const milkScald = withComponent(
    { ...scald(0), allocations: [{ ingredient: 'milk', bakerPct: 25 }] },
    [milk],
  );

  it('a 1:6 tangzhong of water is 600 % hydration, and reads back as 1:6', () => {
    const formula = withComponent(scald(500));
    expect(hydrationForRatio(only(formula), 6)).toEqual({ ok: true, value: 600 });
    const updated = withComponent(scald(600));
    expect(liquidMassRatio(only(updated))).toBeCloseTo(6, 9);
  });

  it('counts the milk itself, not its water: 5 % flour and 25 % milk is 1:5', () => {
    expect(liquidMassRatio(only(milkScald))).toBeCloseTo(5, 9);
    // The style still counts water: 22 points over 5 is 440 %, a tangzhong.
    expect(liquidRatioPct(milkScald, only(milkScald))).toBeCloseTo(440, 9);
  });

  it('tops a milk tangzhong up with water to reach 1:6', () => {
    // 1:6 needs 30 points of liquid; the milk gives 25: 5 points of water, 100 % of 5 % flour.
    const result = hydrationForRatio(only(milkScald), 6);
    expect(result.ok && result.value).toBeCloseTo(100, 9);
  });

  it.each([
    ['zero parts', 0],
    ['negative parts', -1],
    ['not a number', Number.NaN],
  ])('refuses %s', (_, parts) => {
    const formula = withComponent(scald(500));
    expect(hydrationForRatio(only(formula), parts).ok).toBe(false);
  });

  it('refuses when the milk alone exceeds the ratio', () => {
    expect(hydrationForRatio(only(milkScald), 4).ok).toBe(false);
  });
});

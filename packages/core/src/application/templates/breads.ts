import type { RecipeTemplate } from '../../domain/index.js';
import { alapStep, component, H, MIN, preset, step } from './build.js';

/** Lean breads (drafts.md, Templates): selected published variants; editable plans are not prediction validation. */

const room = { conditions: { temperatureC: 21 } } as const;

export const baguette: RecipeTemplate = {
  id: 'baguette',
  version: '2',
  category: 'bread',
  basis:
    'King Arthur Baking — Classic Baguettes (https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe). ' +
    'Selected primary published recipe; poolish branch with instant yeast. Original measures: 540 g total ' +
    'flour (120 g poolish + 420 g final dough), 368 g water (113 g poolish [94.167 % hydration] + 255 g final ' +
    '[68.148 % total hydration]), 12 g table salt (2.222 %). Instant yeast: 1/16 tsp poolish + 1.5 tsp final; ' +
    'converted using KAB weight chart (3 g/tsp) to 0.1875 g poolish (0.0347 % total flour) and 4.5 g final, ' +
    'totaling 4.6875 g (0.8681 %). Editorial planned values: poolish 14 h at 21 °C (room unspecified); mix 4 min; ' +
    'bulk 90 min at 21 °C with 1 fold at 45 min; divide 10 min (editorial default); bench rest 37.5 min ' +
    '(midpoint of 15–60 min); shape 10 min (editorial default); proof 52.5 min (midpoint of 45–60 min) at ' +
    'sourced 20 °C (68 °F); preheat 30 min (editorial default) to 450 °F (232 °C); bake 26 min (midpoint ' +
    'of 24–28 min) on stone or pan with steam; cool 60 min (editorial default). Optional ADY branch and ' +
    '3 h low-yeast bulk alternative omitted.',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (368 / 540) * 100),
      preset('salt', (12 / 540) * 100),
      preset('instant-yeast', (4.6875 / 540) * 100),
    ],
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: (120 / 540) * 100,
        flourBlend: [{ flour: 'all-purpose-flour', sharePct: 100 }],
        hydrationPct: (113 / 120) * 100,
        allocations: [{ ingredient: 'instant-yeast', bakerPct: (0.1875 / 540) * 100 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 540 },
  },
  process: {
    steps: [
      step('poolish', 'preferment', [], 14 * H, { ...room, subject: component('poolish') }),
      step('mix', 'mix', ['poolish'], 4 * MIN, room),
      step('bulk', 'bulk', ['mix'], 90 * MIN, {
        conditions: room.conditions,
        technique: { folds: { count: 1, intervalS: 45 * MIN, style: 'stretchAndFold' } },
      }),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('bench-rest', 'rest', ['divide'], 37.5 * MIN),
      step('shape', 'shape', ['bench-rest'], 10 * MIN),
      step('proof', 'proof', ['shape'], 52.5 * MIN, { conditions: { temperatureC: 20 } }),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 26 * MIN, {
        conditions: { temperatureC: 232 },
        label: 'Bake at 450 °F (232 °C) on stone or pan with steam',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

export const bouleDutchOven: RecipeTemplate = {
  id: 'boule-dutch-oven',
  version: '4',
  category: 'bread',
  basis:
    'Leite’s Culinaria — Jim Lahey’s No-Knead Bread (https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html). ' +
    'Attributed Lahey recipe (Sullivan Street Bakery) via David Leite. Normalized measures using KAB weight chart: ' +
    '3 cups AP flour (360 g), 1 1/3 cups lukewarm water (302.667 g, 84.074 % hydration), 1/4 tsp instant yeast ' +
    '(0.75 g, 0.2083 %), 1 1/4 tsp salt with explicit table-salt assumption (6 g/tsp = 7.5 g, 2.083 %). ' +
    'Direct dough, no preferment. Editorial planned values: mix 30 s (sourced); bulk planned at 15 h (editorial ' +
    'midpoint of 12–18 h range, noting source’s preferred 18 h recommendation) at sourced ideal 22.2 °C (72 °F); ' +
    'shape/fold 10 min (editorial default); proof 2 h (sourced) at 21 °C (room unspecified); preheat 30 min ' +
    '(sourced) with 6–8 qt lidded Dutch oven at 450 °F (232 °C); bake planned at 52.5 min (editorial midpoint ' +
    'of 45–60 min: 30 min covered + 22.5 min uncovered [15–30 min range]) at 450 °F (232 °C); cool 60 min ' +
    '(sourced: at least 1 h).',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', ((227 * 4) / 3 / 360) * 100),
      preset('salt', (7.5 / 360) * 100),
      preset('instant-yeast', (0.75 / 360) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 360 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 30, room),
      step('bulk', 'bulk', ['mix'], 15 * H, { conditions: { temperatureC: 22.2 } }),
      step('shape', 'shape', ['bulk'], 10 * MIN),
      step('proof', 'proof', ['shape'], 2 * H, room),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 52.5 * MIN, {
        conditions: { temperatureC: 232 },
        label:
          'Bake in preheated 6–8 qt Dutch oven at 450 °F (232 °C): 30 min covered, then 22.5 min uncovered',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

export const ciabatta: RecipeTemplate = {
  id: 'ciabatta',
  version: '4',
  category: 'bread',
  basis:
    'King Arthur Baking — Professional Ciabatta (https://www.kingarthurbaking.com/pro/formulas/ciabatta). ' +
    'Professional published formula. Original measures: 10 kg total flour (Sir Galahad flour), 7.6 kg water (76 %), ' +
    '0.2 kg salt (2 %), 0.12 kg yeast (1.2 %). Biga: 3 kg flour (30 % preferment), 1.8 kg water (60 % component ' +
    'hydration), 3 g yeast (0.03 % total flour); ripened ~16 h at 21 °C (room unspecified). Final dough additions: ' +
    '7 kg flour, 5.8 kg water, 200 g salt, 117 g yeast. Evidence gap: yeast form is unspecified in the professional ' +
    'source; preserved as an inline dough ingredient without yeast marker, with unknown composition, avoiding ' +
    'unsupported assumptions of fresh vs instant. Editorial planned values: mix 7.5 min (3 min low speed + ' +
    '4.5 min medium speed [midpoint of 4–5 min range]) with DDT 23.9 °C (75 °F) at 21 °C room; bulk 2 h at 21 °C ' +
    'with 1 fold at 1 h; divide 10 min (editorial default) into 0.57 kg rectangles; proof 1 h at 21 °C (room ' +
    'unspecified); preheat 30 min (editorial default); bake 36 min at 460 °F (238 °C) with steam; cool 60 min ' +
    '(editorial default).',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 76),
      preset('salt', 2),
      {
        id: 'yeast',
        kind: 'other',
        role: 'dough',
        bakerPct: 1.2,
      },
    ],
    components: [
      {
        id: 'biga',
        kind: 'preferment',
        flourPct: 30,
        flourBlend: [{ flour: 'all-purpose-flour', sharePct: 100 }],
        hydrationPct: 60,
        allocations: [{ ingredient: 'yeast', bakerPct: 0.03 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 10000 },
  },
  process: {
    steps: [
      step('biga', 'preferment', [], 16 * H, { ...room, subject: component('biga') }),
      step('mix', 'mix', ['biga'], 7.5 * MIN, {
        conditions: { temperatureC: 21, doughTemperatureC: 23.9 },
        technique: {
          method: 'standMixer',
          phases: [
            { speed: 'low', durationS: 3 * MIN },
            { speed: 'medium', durationS: 4.5 * MIN },
          ],
        },
      }),
      step('bulk', 'bulk', ['mix'], 2 * H, {
        conditions: room.conditions,
        technique: { folds: { count: 1, intervalS: 1 * H, style: 'stretchAndFold' } },
      }),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('proof', 'proof', ['divide'], 1 * H, room),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 36 * MIN, {
        conditions: { temperatureC: 238 },
        label: 'Bake at 460 °F (238 °C) with steam',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

export const bagels: RecipeTemplate = {
  id: 'bagels',
  version: '3',
  category: 'bread',
  basis:
    'King Arthur Baking — Water Bagels (https://www.kingarthurbaking.com/recipes/water-bagels-recipe). ' +
    'Selected primary published recipe; same-day water bagel variant by Arnold Golfman. Original measures: ' +
    '690 g AP flour, 454 g water (65.797 %), 35 g non-diastatic malt powder (5.072 %), 25 g granulated sugar ' +
    '(3.623 %), 18 g table salt (2.609 %), 6.75 g instant yeast (0.9783 %, converted from 2 1/4 tsp via KAB ' +
    'weight chart at 3 g/tsp). Malt represented as inline non-diastatic malt powder with unknown composition, ' +
    'avoiding substitution with barley malt syrup or diastatic malt. External water bath (1814 g water, 18 g malt ' +
    'powder, 14 g sugar) and optional toppings excluded from dough formula. Editorial planned values: mix 8 min ' +
    '(editorial default, source unstated); bulk 75 min (midpoint of 1–1.5 h range to double) at 21 °C (room ' +
    'unstated); divide 10 min (editorial default) into 16 pieces; shape 10 min (editorial default); no separate ' +
    'final proof prescribed (dough moves directly from shaping to simmering bath); preheat 30 min (editorial ' +
    'default) to 425 °F (218 °C); simmer planned at 10 min (editorial batch logistics for 16 bagels in batches ' +
    'of 3–4, simmered 30 s per side); bake 20 min on parchment-lined sheet at 425 °F (218 °C); cool 60 min ' +
    '(editorial default). Overnight refrigeration alternative omitted to retain same-day baseline.',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (454 / 690) * 100),
      {
        id: 'non-diastatic-malt-powder',
        kind: 'other',
        role: 'dough',
        bakerPct: (35 / 690) * 100,
      },
      preset('sugar', (25 / 690) * 100),
      preset('salt', (18 / 690) * 100),
      preset('instant-yeast', (6.75 / 690) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 690 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 8 * MIN, room),
      step('bulk', 'bulk', ['mix'], 75 * MIN, room),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('shape', 'shape', ['divide'], 10 * MIN),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('boil', 'boil', ['shape'], 10 * MIN, {
        label: 'Simmer 30 s per side in gentle water bath in batches of 3–4',
      }),
      step('bake', 'bake', ['boil', 'preheat'], 20 * MIN, {
        conditions: { temperatureC: 218 },
        label: 'Bake on parchment-lined sheet pan at 425 °F (218 °C)',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

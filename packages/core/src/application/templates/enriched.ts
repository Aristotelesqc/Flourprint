import type { RecipeTemplate } from '../../domain/index.js';
import { alapStep, component, H, MIN, preset, step } from './build.js';

/**
 * Enriched and pan bread templates (drafts.md, Templates).
 * Coherent baselines sourced from verified publications (issue #34).
 */

const room = { conditions: { temperatureC: 21 } } as const;
const fridge = { conditions: { temperatureC: 4 } } as const;

export const brioche: RecipeTemplate = {
  id: 'brioche',
  version: '2',
  category: 'enriched',
  basis:
    'Meilleur du Chef / Chef Philippe — Classic Brioche Loaf (https://www.meilleurduchef.com/en/recipe/brioche-loaf.html; Nanterre loaf). ' +
    'Formula: 500 g T45 flour (100 %), 300 g whole eggs (60 %), 250 g butter (50 % ingredient mass), ' +
    "60 g castor sugar (12 %), 10 g salt (2 %), 20 g fresh baker's yeast (4 %). Direct dough with no milk " +
    'or pure water; egg wash (1 egg, pinch of salt) and optional pearl sugar excluded from dough. ' +
    'Process: mix 18 min (2 min low speed + 8 min medium speed, plus editorial 8 min for gradual butter incorporation; ' +
    'editorial DDT target 24 °C, below sourced <=26 °C ceiling); bulk 30 min at editorial 21 °C room; degas 1 min (editorial); ' +
    'retard 1 h cold at editorial 4 °C fridge (sourced minimum of >=1 h cold; overnight branch preserved in notes); ' +
    'divide 10 min into 50 g balls (editorial); shape 10 min into 7 balls per tin (editorial); proof 2 h in proofer at sourced 28 °C; ' +
    'preheat 30 min (editorial default); bake in fan oven at 180 °C for 27.5 min (editorial midpoint of sourced 25–30 min range); ' +
    'cool 60 min (editorial default). Fresh yeast composition unknown beyond form; T45 protein unstated.',
  formula: {
    flours: [{ id: 'flour', sharePct: 100 }],
    ingredients: [
      preset('egg', 60),
      preset('butter', 50),
      preset('sugar', 12),
      preset('salt', 2),
      {
        id: 'fresh-yeast',
        kind: 'other',
        role: 'dough',
        bakerPct: 4,
        yeast: { form: 'fresh' },
      },
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 18 * MIN, {
        conditions: { doughTemperatureC: 24 },
        label:
          'Mix 2 min low speed, 8 min medium speed, then incorporate butter gradually (DDT <=26 °C)',
      }),
      step('bulk', 'bulk', ['mix'], 30 * MIN, room),
      step('degas', 'degas', ['bulk'], MIN),
      step('retard', 'retard', ['degas'], H, fridge),
      step('divide', 'divide', ['retard'], 10 * MIN),
      step('shape', 'shape', ['divide'], 10 * MIN, {
        label: 'Shape into 50 g balls, arrange 7 per loaf tin',
      }),
      step('proof', 'proof', ['shape'], 2 * H, {
        conditions: { temperatureC: 28 },
        label: 'Proof in proofer at 28 °C',
      }),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 1650, {
        conditions: { temperatureC: 180 },
        label: 'Brush with separate egg wash, then bake in fan-assisted oven at 180 °C',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

export const burgerBuns: RecipeTemplate = {
  id: 'burger-buns',
  version: '3',
  category: 'enriched',
  basis:
    'King Arthur Baking / Ellen Dorsey ("Moomie") — Beautiful Burger Buns (https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe). ' +
    'Formula: 420 g AP flour (100 %), 198 g lukewarm water (47.143 %), 28 g room-temperature butter (6.667 % ingredient mass), ' +
    '50 g granulated sugar (11.905 %), 9 g instant yeast (2.143 %), 1 large egg assumed 50 g (11.905 %), ' +
    'table salt 1 1/4 tsp normalized to 7.5 g via KAB chart (1.786 %). No milk or preferment in dough. ' +
    'Separate butter glaze (43 g melted butter) and optional seed topping (1 egg white + 2 tbsp cold water, sesame seeds) excluded from dough. ' +
    'Process: mix 8 min (editorial default for unsourced mix duration) at editorial 21 °C room; ' +
    'bulk 1.5 h (editorial midpoint of sourced 1–2 h range) at editorial 21 °C room; ' +
    'deflate and divide 10 min into 8 buns (~95 g each, sourced ~100 g claim; editorial duration); ' +
    'shape 10 min into balls and flatten to 3 inches (editorial duration); ' +
    'proof 60 min (sourced "about an hour") at editorial 21 °C room; ' +
    'preheat 30 min (editorial default); ' +
    'bake 16.5 min (990 s, editorial midpoint of sourced 15–18 min range) on baking sheet at 375 °F (191 °C converted); ' +
    'cool 60 min on rack (editorial default).',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (198 / 420) * 100),
      preset('butter', (28 / 420) * 100),
      preset('sugar', (50 / 420) * 100),
      preset('egg', (50 / 420) * 100),
      preset('salt', (7.5 / 420) * 100),
      preset('instant-yeast', (9 / 420) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 420 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 8 * MIN, room),
      step('bulk', 'bulk', ['mix'], 90 * MIN, room),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('shape', 'shape', ['divide'], 10 * MIN, {
        label: 'Shape each piece into a ball and flatten to about 3 inches',
      }),
      step('proof', 'proof', ['shape'], 60 * MIN, room),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 990, {
        conditions: { temperatureC: 191 },
        label:
          'Brush with half the separate 43 g melted butter, then bake on sheet at 375 °F (191 °C)',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN, {
        label: 'Brush with remaining glaze butter and cool on rack',
      }),
    ],
  },
};

export const pullman: RecipeTemplate = {
  id: 'pullman',
  version: '3',
  category: 'pan',
  basis:
    'Modernist Cuisine — Pain de Mie, volume 4 p.296 errata (https://modernistcuisine.com/wp-content/uploads/2018/12/BREAD_Vol4_296_Errata.pdf; home oven branch in 13x4x4-inch lidded Pullman pan). ' +
    'Formula: 560 g bread flour (100 %), 360 g water (64.286 % pure water), 35 g softened butter (6.25 % ingredient mass), ' +
    '25 g sugar (4.464 %), 10 g fine salt (1.786 %), 5 g osmotolerant instant yeast (0.893 %), 2 g barley malt syrup (0.357 % ingredient mass). ' +
    'Total dough 997 g. No milk, egg, or preferment in formula. Net lipid/moisture table in errata reports net compositions rather than added baker percentages. ' +
    'Process: machine mix 13.5 min (810 s, editorial midpoint of sourced 10–17 min range; DDT setpoint 25 °C within sourced 24–26 °C range); ' +
    'bulk ferment 1.5 h at editorial 21 °C room with 1 fold after 45 min recorded in technique; ' +
    'shape oblong bâtard 1.5 min (90 s, editorial midpoint of sourced 1–2 min range); ' +
    'final proof in lidded 13x4x4-inch pan selects 21 °C room branch for 2.75 h (9900 s, editorial midpoint of sourced 2.5–3 h range at 21 °C; ' +
    'proofer branch 1.5–2 h at 27 °C/65 % RH preserved in science notes); ' +
    'preheat 30 min (editorial default); ' +
    'home bake phase 1 covered in lidded pan at 200 °C for 52.5 min (3150 s, editorial midpoint of sourced 45–60 min range); ' +
    'home bake phase 2 vented inverted on wire rack at 200 °C for 10 min (600 s); ' +
    'cool 60 min (editorial default). Convection alternative 185 °C for 30–35 min + 10 min vented preserved in notes.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (360 / 560) * 100),
      preset('butter', (35 / 560) * 100),
      preset('sugar', (25 / 560) * 100),
      preset('salt', (10 / 560) * 100),
      preset('instant-yeast', (5 / 560) * 100),
      preset('barley-malt-syrup', (2 / 560) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 560 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 810, {
        conditions: { doughTemperatureC: 25 },
        label: 'Mix by machine to full gluten development (DDT 24–26 °C)',
      }),
      step('bulk', 'bulk', ['mix'], 90 * MIN, {
        ...room,
        technique: { folds: { count: 1, intervalS: 45 * MIN, style: 'fold' } },
      }),
      step('shape', 'shape', ['bulk'], 90, {
        label: 'Shape oblong bâtard and place in prepared lidded 13x4x4-inch Pullman pan',
      }),
      step('proof', 'proof', ['shape'], 9900, {
        ...room,
        label: 'Proof in prepared 13x4x4-inch Pullman pan with the lid off',
      }),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 3150, {
        conditions: { temperatureC: 200 },
        label: 'Home bake covered in lidded 13x4x4-inch Pullman pan at 200 °C',
      }),
      step('bake-vented', 'bake', ['bake'], 10 * MIN, {
        conditions: { temperatureC: 200 },
        label: 'Remove lid, invert loaf onto wire rack, bake vented at 200 °C',
      }),
      step('cool', 'cool', ['bake-vented'], 60 * MIN),
    ],
  },
};

export const shokupan: RecipeTemplate = {
  id: 'shokupan',
  version: '2',
  category: 'pan',
  basis:
    'King Arthur Baking / Charlotte Rutledge — Japanese Milk Bread (https://www.kingarthurbaking.com/recipes/japanese-milk-bread-recipe; tangzhong loaf in 9x5-inch pan). ' +
    'Formula: 314 g bread flour total (14 g tangzhong + 300 g final dough); 43 g pure water (13.694 % of total flour), ' +
    'allocated entirely to tangzhong (scald hydration 307.143 % relative to scald flour); 156 g whole milk (49.682 % of total flour), ' +
    'allocated 43 g to tangzhong (43/314*100 = 13.694 % of total flour) and 113 g to final dough; ' +
    '14 g dry milk powder (4.459 %, inline ingredient; water estimated at 3.5 % [3, 5] from USDA SR Legacy nonfat dry milk, fat and sugar unknown); 50 g granulated sugar (15.924 %); ' +
    '6 g table salt (1.911 %); 57 g unsalted butter (18.153 % ingredient mass); 1 large egg assumed 50 g (15.924 %); ' +
    'instant yeast 1 tbsp normalized via KAB chart to 9 g (2.866 %). Separate milk wash excluded from dough. ' +
    'Process: tangzhong cooked 4 min (editorial midpoint of sourced 3–5 min range) on low heat, then cooled to lukewarm ' +
    '(editorial cooling duration 60 min, separate from the 4 min cook step); machine mix/knead 15 min (sourced "almost 15 minutes") at editorial 21 °C room; ' +
    'bulk 75 min (editorial midpoint of sourced 1–1.5 h range) at editorial 21 °C room; ' +
    'deflate and divide 10 min into 4 equal pieces (~170–175 g each; editorial duration); ' +
    'shape 10 min into rolled logs and arrange in greased 9x5-inch loaf pan (editorial duration); ' +
    'proof 45 min (editorial midpoint of sourced 40–50 min range) at editorial 21 °C room; ' +
    'preheat 30 min (editorial default); ' +
    'bake 32.5 min (1950 s, editorial midpoint of sourced 30–35 min range) at 350 °F (177 °C converted) in 9x5-inch loaf pan; ' +
    'cool 60 min on rack (editorial default).',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (43 / 314) * 100),
      preset('milk', (156 / 314) * 100),
      {
        id: 'milk-powder',
        kind: 'other',
        role: 'dough',
        bakerPct: (14 / 314) * 100,
        // Nonfat dry milk: USDA SR Legacy lists 3.2 to 3.9 g water per 100 g (ndb 01085, 01092) and
        // the US standard caps moisture at 5 %, hence 3.5 % within [3, 5].
        water: {
          status: 'estimated',
          valuePct: 3.5,
          rangePct: [3, 5],
          source: 'USDA SR Legacy (approx.)',
        },
      },
      preset('sugar', (50 / 314) * 100),
      preset('salt', (6 / 314) * 100),
      preset('butter', (57 / 314) * 100),
      preset('egg', (50 / 314) * 100),
      preset('instant-yeast', (9 / 314) * 100),
    ],
    components: [
      {
        id: 'tangzhong',
        kind: 'scald',
        flourPct: (14 / 314) * 100,
        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
        hydrationPct: (43 / 14) * 100,
        waterLossPct: 0,
        allocations: [{ ingredient: 'milk', bakerPct: (43 / 314) * 100 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 314 },
  },
  process: {
    steps: [
      {
        ...alapStep('tangzhong', 'scald', 4 * MIN),
        subject: component('tangzhong'),
        label: 'Cook 14 g flour, 43 g water and 43 g milk on low heat until thickened',
      },
      step('tangzhong-cool', 'cool', ['tangzhong'], 60 * MIN, {
        subject: component('tangzhong'),
        label:
          'Cool tangzhong to lukewarm before mixing; 60 min is an editable editorial allowance',
      }),
      step('mix', 'mix', ['tangzhong-cool'], 15 * MIN, room),
      step('bulk', 'bulk', ['mix'], 75 * MIN, room),
      step('divide', 'divide', ['bulk'], 10 * MIN),
      step('shape', 'shape', ['divide'], 10 * MIN, {
        label: 'Roll and fold each piece into a 4-inch log, place in 9x5-inch loaf pan',
      }),
      step('proof', 'proof', ['shape'], 45 * MIN, room),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 1950, {
        conditions: { temperatureC: 177 },
        label: 'Brush with separate milk wash, then bake in 9x5-inch loaf pan at 350 °F (177 °C)',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

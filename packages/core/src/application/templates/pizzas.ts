import type { Ingredient, RecipeTemplate } from '../../domain/index.js';
import { alapStep, H, MIN, preset, step } from './build.js';

/**
 * Focaccia and pizza templates (drafts.md, Templates): updated to coherent, verified source
 * baselines (issue #34). All formulas keep original yields and ratios intact; all fermentation
 * durations remain manually planned.
 */

const room = { conditions: { temperatureC: 21 } } as const;
const fridge = { conditions: { temperatureC: 4 } } as const;

/** An inline fresh yeast ingredient with unknown composition (issue #34). */
const freshYeast = (bakerPct: number): Ingredient => ({
  id: 'fresh-yeast',
  bakerPct,
  kind: 'other',
  role: 'dough',
  yeast: { form: 'fresh' },
});

export const focaccia: RecipeTemplate = {
  id: 'focaccia',
  version: '4',
  category: 'flatbread',
  basis:
    'King Arthur Baking — Big and Bubbly Focaccia (https://www.kingarthurbaking.com/recipes/big-and-bubbly-focaccia-recipe). ' +
    'High-hydration pan variant (one 9-inch square pan). ' +
    'Original measures: 360 g all-purpose flour, 284 g water (78.889 %), 18 g olive oil in dough (5.0 %), 9 g table salt (2.5 %), ' +
    '5 g sugar (1.389 %), 3 g instant yeast (0.833 %). ' +
    'Non-dough exclusions: 26 g divided olive oil (pan coating and top drizzle) and flaky sea salt topping are excluded from dough. ' +
    'Sourced vs. editorial choices: mix duration is 8 min editorial default (unspecified in source); DDT 29 °C is editorial midpoint ' +
    'of sourced 82–86 °F (27.8–30.0 °C); bulk is 2 h (four bowl fold sets at 15 min intervals followed by 1 h rest) at 22.5 °C ' +
    '(midpoint of sourced 70–75 °F / 21.1–23.9 °C); pan transfer/stretch is 10 min editorial default; pan proof temperature 22.5 °C is an editorial reuse of the bulk setting; duration is 75 min (midpoint of ' +
    'sourced 1–1.5 h) at 22.5 °C; preheat is 30 min editorial default at 475 °F (246 °C); lower-rack bake is 16.5 min (midpoint of ' +
    'sourced 15–18 min) at 475 °F (246 °C), optional broil omitted; rack finish is 6 min (midpoint of sourced 5–7 min) directly on ' +
    'lower rack in a switched-off oven using residual heat (no active temperature setpoint); cooling is 60 min editorial default.',
  formula: {
    flours: [{ id: 'all-purpose-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (284 / 360) * 100),
      preset('olive-oil', 5),
      preset('salt', 2.5),
      preset('sugar', (5 / 360) * 100),
      preset('instant-yeast', (3 / 360) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 360 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 8 * MIN, {
        conditions: { temperatureC: 21, doughTemperatureC: 29 },
      }),
      step('bulk', 'bulk', ['mix'], 2 * H, {
        conditions: { temperatureC: 22.5 },
        technique: { folds: { count: 4, intervalS: 15 * MIN, style: 'stretchAndFold' } },
      }),
      step('pan', 'shape', ['bulk'], 10 * MIN),
      step('proof', 'proof', ['pan'], 75 * MIN, { conditions: { temperatureC: 22.5 } }),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['proof', 'preheat'], 990, {
        conditions: { temperatureC: 246 },
        label: 'Bake in pan on lower rack at 475 °F (246 °C)',
      }),
      step('bake-finish', 'bake', ['bake'], 6 * MIN, {
        label: 'Finish out of pan on lower rack with oven turned off (residual heat)',
      }),
      step('cool', 'cool', ['bake-finish'], 60 * MIN),
    ],
  },
};

export const pizzaNeoNeapolitan: RecipeTemplate = {
  id: 'pizza-neo-neapolitan',
  version: '3',
  category: 'pizza',
  basis:
    'Baking Steel / Andris Lagsdin — 72-Hour Pizza Dough (https://bakingsteel.com/blogs/recipes/72-hour-pizza-dough). ' +
    'Domestic Baking Steel variant (adaptation of Jim Lahey no-knead lineage for home baking steel). ' +
    'Original measures: 500 g bread flour, 350 g water (70 %), 16 g sea salt (3.2 %), 1 g instant yeast (0.2 %). ' +
    'Total dough weight 867 g, yielding 3 balls of ~289 g each for 12–14 inch pizzas. ' +
    'Sourced vs. editorial choices: mix is 2.5 min (midpoint of sourced 2–3 min in-bowl knead); unstated room temperature is 21 °C ' +
    'editorial default for mix, initial bulk, divide, and final proof; cold retard is 48 h at editorial 4 °C fridge; "72-hour" name ' +
    'covers the 24 h room bulk + 48 h cold retard, excluding the subsequent divide and final room-temperature proof; divide/ball is ' +
    '10 min editorial default; final proof is 3.5 h (midpoint of sourced 3–4 h); preheat is 60 min sourced preheat on Baking Steel at ' +
    '274 °C (midpoint of sourced 500–550 °F / 260–288 °C); bake is 6.5 min (midpoint of sourced 5–8 min) at 274 °C on Baking Steel.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [preset('water', 70), preset('salt', 3.2), preset('instant-yeast', 0.2)],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 150, room),
      step('bulk', 'bulk', ['mix'], 24 * H, room),
      step('retard', 'retard', ['bulk'], 48 * H, fridge),
      step('divide', 'divide', ['retard'], 10 * MIN, room),
      step('proof', 'proof', ['divide'], 210 * MIN, room),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['proof', 'preheat'], 390, {
        conditions: { temperatureC: 274 },
        label: 'Bake on Baking Steel at 500–550 °F (274 °C)',
      }),
    ],
  },
};

export const pizzaRoman: RecipeTemplate = {
  id: 'pizza-roman',
  version: '3',
  category: 'pizza',
  basis:
    'Molino Vigevano / Gabriele Valdes — Pizza Scrocchiarella Romana (https://molinovigevano.com/pizza-scrocchiarella-romana/). ' +
    'Direct method with cold fermentation (not the 40 % poolish branch). ' +
    'Original formula: 1,000 g tipo 0 flour (W 280–300), 600 g water (60 %), 26 g fine sea salt (2.6 %), 2 g fresh yeast (0.2 %). ' +
    'Total dough weight 1,628 g, dividing into 180 g balls for thin, crispy tonda romana. No dough fat or sugar. ' +
    'Sourced vs. editorial choices: retains professional pizza oven (≤350 °C, 120–180 s; midpoint 2.5 min = 150 s), not converted to ' +
    'domestic oven; mix duration is 8 min editorial default; DDT 24 °C is sourced; bench bulk is 1 h at editorial room 21 °C; divide ' +
    'is 10 min editorial default into 180 g balls; ambient ball rest is 90 min at 23.5 °C (midpoint of sourced 22–25 °C); cold retard ' +
    'is 24 h editorial duration at sourced 4 °C (source prescribes "use within 48 h" without establishing a mandatory minimum duration); ' +
    'warm-up/temper before rolling is 2 h editorial default at 21 °C; stretch/roll is 10 min editorial default; preheat is 30 min ' +
    'editorial default at 350 °C. The source specifies tipo 0, represented by generic flour rather than incorrectly marking it tipo 00.',
  formula: {
    flours: [{ id: 'flour', sharePct: 100 }],
    ingredients: [preset('water', 60), preset('salt', 2.6), freshYeast(0.2)],
    components: [],
    anchor: { kind: 'flourTotal', grams: 1000 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 8 * MIN, {
        conditions: { temperatureC: 21, doughTemperatureC: 24 },
      }),
      step('bulk', 'bulk', ['mix'], H, room),
      step('divide', 'divide', ['bulk'], 10 * MIN, room),
      step('rest', 'rest', ['divide'], 90 * MIN, { conditions: { temperatureC: 23.5 } }),
      step('retard', 'retard', ['rest'], 24 * H, fridge),
      step('proof', 'proof', ['retard'], 2 * H, room),
      step('shape', 'shape', ['proof'], 10 * MIN),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['shape', 'preheat'], 150, {
        conditions: { temperatureC: 350 },
        label: 'Bake in professional pizza oven (≤350 °C)',
      }),
    ],
  },
};

export const pizzaNewYork: RecipeTemplate = {
  id: 'pizza-new-york',
  version: '3',
  category: 'pizza',
  basis:
    'Feeling Foodish / Marie — The Best New York Style Pizza Dough (https://feelingfoodish.com/the-best-new-york-style-pizza-dough/). ' +
    'Metric branch for four 14-inch pizzas (distinct from US volume branch). ' +
    'Original formula: 796 g bread flour, 493 g water (61.935 %), 15.6 g salt (1.960 %), 7.8 g sugar (0.980 %), ' +
    '11.8 g olive oil (1.482 %), 3.5 g instant dry yeast (0.4397 %). ' +
    'Yield conflict noted: Total formula dough weight is 1,327.7 g (4 × 331.9 g), which conflicts with the source text claim of ' +
    'four 11.5 oz (~326 g) dough balls (1,304 g total). ' +
    'Sourced vs. editorial choices: mix is 4.5 min (midpoint of sourced 4–5 min); DDT 27 °C is an editorial target informed by the qualitative high-70s to low-80s °F ' +
    'guidance; divide/ball is 10 min editorial default; cold retard is 48 h (midpoint of sourced 24–72 h range; author ' +
    'notes day 3 is optimal) at editorial 4 °C fridge; temper/relaxation is 40 min (midpoint of 20–60 min body guidance / within 1 h) ' +
    'at editorial 21 °C room; stretch and top is 10 min editorial default; preheat is 60 min sourced preheat at 550 °F (288 °C) on ' +
    'stone/steel; bake is 5 min (midpoint of sourced 4–6 min) at 550 °F (288 °C).',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (493 / 796) * 100),
      preset('olive-oil', (11.8 / 796) * 100),
      preset('sugar', (7.8 / 796) * 100),
      preset('salt', (15.6 / 796) * 100),
      preset('instant-yeast', (3.5 / 796) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 796 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 270, {
        conditions: { temperatureC: 21, doughTemperatureC: 27 },
      }),
      step('divide', 'divide', ['mix'], 10 * MIN, room),
      step('retard', 'retard', ['divide'], 48 * H, fridge),
      step('proof', 'proof', ['retard'], 40 * MIN, room),
      step('shape', 'shape', ['proof'], 10 * MIN),
      alapStep('preheat', 'preheat', H),
      step('bake', 'bake', ['shape', 'preheat'], 300, {
        conditions: { temperatureC: 288 },
        label: 'Bake on preheated stone or steel at 550 °F (288 °C)',
      }),
    ],
  },
};

export const pizzaChicago: RecipeTemplate = {
  id: 'pizza-chicago',
  version: '3',
  category: 'pizza',
  basis:
    'Bake from Scratch — Baking School module 4, Chicago Deep-Dish Pizza (https://bakefromscratch.com/wp-content/uploads/2022/04/Module-4-Low-Res.pdf). ' +
    'Cornmeal deep-dish variant baked in a 10¼-inch Lodge cast-iron baker\'s skillet (noted skillet mismatch: header says "Makes 1 (9-inch) ' +
    'deep-dish pizza", body specifies 10¼-inch skillet; mismatch retained). ' +
    'Original formula: all-grain denominator 257 g total flour composed of 219 g all-purpose flour (85.214 %) and 38 g fine yellow cornmeal ' +
    '(14.786 %). Water 160 g (62.257 % all-grain hydration; 73.059 % wheat-only), kosher salt 4.5 g (1.751 %), instant yeast 3 g (1.167 %), ' +
    'sugar 4 g (1.556 %), dough olive oil 14 g (5.447 %), dough melted butter 14 g (5.447 %). ' +
    'Non-dough exclusions: vegetable oil for sautéing (14 g), skillet butter (10 g), and layered toppings (mushrooms, onion, green bell ' +
    'pepper, Italian sausage, pepperoni, mozzarella, provolone, pizza sauce, Parmesan) are excluded from dough. ' +
    'Sourced vs. editorial choices: hot water 120–130 °F (49–54 °C) is mixing liquid, not dough or ambient temperature; knead duration is ' +
    '12 min (sourced); bulk rise is 37.5 min (midpoint of sourced 30–45 min) at sourced 75 °F (24 °C); pan/stretch is 10 min editorial default; ' +
    'assembly is 10 min editorial default; no separate final proof stage (dough is assembled and baked immediately); preheat is 30 min ' +
    'editorial default at 450 °F (230 °C); bake is 27.5 min (midpoint of sourced 25–30 min) at 450 °F (230 °C), tented with foil after 20 min; ' +
    'cool is 12.5 min (midpoint of sourced 10–15 min).',
  formula: {
    flours: [
      { id: 'all-purpose-flour', sharePct: (219 / 257) * 100 },
      { id: 'cornmeal', sharePct: (38 / 257) * 100 },
    ],
    ingredients: [
      preset('water', (160 / 257) * 100),
      preset('butter', (14 / 257) * 100),
      preset('olive-oil', (14 / 257) * 100),
      preset('sugar', (4 / 257) * 100),
      preset('salt', (4.5 / 257) * 100),
      preset('instant-yeast', (3 / 257) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 257 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 12 * MIN, room),
      step('bulk', 'bulk', ['mix'], 2250, { conditions: { temperatureC: 24 } }),
      step('pan', 'shape', ['bulk'], 10 * MIN),
      step('assembly', 'shape', ['pan'], 10 * MIN, {
        label: 'Layer cheeses, vegetables, meats, and sauce in skillet',
      }),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['assembly', 'preheat'], 1650, {
        conditions: { temperatureC: 230 },
        label: 'Bake in cast-iron skillet at 450 °F (230 °C), tent with foil after 20 min',
      }),
      step('cool', 'cool', ['bake'], 750),
    ],
  },
};

export const pizzaSicilian: RecipeTemplate = {
  id: 'pizza-sicilian',
  version: '3',
  category: 'pizza',
  basis:
    'King Arthur Baking — Sicilian-Style Pizza (https://www.kingarthurbaking.com/recipes/sicilian-style-pizza-recipe). ' +
    'Same-day pan pizza adaptation for an 18×13-inch half-sheet pan (the optional up to 24 h refrigeration is documented as an ' +
    'alternative branch, not forced into the baseline). ' +
    'Original formula: 540 g high-gluten flour, up to 397 g water (up to 73.519 %), 12 g table salt (2.222 %), 2 tsp instant yeast ' +
    '(6 g via KAB weight chart, 1.111 %). ' +
    'Non-dough exclusions: the listed 14 g olive oil belongs exclusively to the sautéed onion topping, not the dough. Pan coating oil, ' +
    '8 g optional pizza flavor, and toppings (onions, tomato sauce, anchovies, mozzarella, herbs) are excluded from dough. ' +
    'Sourced vs. editorial choices: mix is 8 min editorial default at editorial room 21 °C; bulk is 1 h at editorial room 21 °C (same-day ' +
    'branch); pan/stretch is 10 min editorial default in oiled half-sheet pan; pan proof is 1.5 h (midpoint of sourced 1–2 h) at editorial ' +
    'room 21 °C; preheat is 30 min editorial default at 450 °F (232 °C); two-stage bake: par-bake untopped crust for 11 min (midpoint of ' +
    'sourced 10–12 min) at 450 °F (232 °C); 10 min editorial default assembly; final bake 17.5 min (midpoint of sourced 15–20 min) at ' +
    '450 °F (232 °C); rest is 10 min sourced rest before slicing.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', (397 / 540) * 100),
      preset('salt', (12 / 540) * 100),
      preset('instant-yeast', (6 / 540) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 540 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 8 * MIN, room),
      step('bulk', 'bulk', ['mix'], H, room),
      step('pan', 'shape', ['bulk'], 10 * MIN),
      step('pan-rest', 'rest', ['pan'], 12.5 * MIN, room),
      step('finish-stretch', 'shape', ['pan-rest'], 5 * MIN, {
        label: 'Stretch to fill pan; repeat 10–15 min rest and stretch manually if needed',
      }),
      step('proof', 'proof', ['finish-stretch'], 1.5 * H, room),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('par-bake', 'bake', ['proof', 'preheat'], 11 * MIN, {
        conditions: { temperatureC: 232 },
        label: 'Par-bake untopped crust in 18×13-inch half-sheet pan at 450 °F (232 °C)',
      }),
      step('assembly', 'shape', ['par-bake'], 10 * MIN, {
        label: 'Top par-baked crust with sauce, cheese, and toppings',
      }),
      step('bake', 'bake', ['assembly'], 1050, {
        conditions: { temperatureC: 232 },
        label: 'Bake topped pizza at 450 °F (232 °C)',
      }),
      step('cool', 'cool', ['bake'], 10 * MIN, { label: 'Rest before slicing' }),
    ],
  },
};

export const pizzaTeglia: RecipeTemplate = {
  id: 'pizza-teglia',
  version: '3',
  category: 'pizza',
  basis:
    'La Confraternita della Pizza — Disciplinare Autentica Pizza in Teglia alla Romana ' +
    '(https://laconfraternitadellapizza.net/documenti/Disciplinare-Autentica-Pizza-In-Teglia-Alla-Romana.pdf). ' +
    'Normative disciplinare 48 h machine-mixed example for a 40×60 cm blue-steel pan (teglia in ferro blu). ' +
    'Original formula: 725 g flour (W 300–380), 580 g water at 4 °C (80 %), 18 g salt (2.483 %), 15 g olive oil (2.069 %), ' +
    '4 g compressed fresh yeast (0.552 %). Total dough ~1,342 g. ' +
    'Sourced vs. editorial choices & equipment: retains professional electric deck oven; generic ambient temperature is left unset ' +
    'because floor (platea 300–320 °C) and top (cielo 200 °C) have independent controls; bake duration is 10.5 min (midpoint of sourced ' +
    '8–13 min); water at 4 °C is an ingredient operating temperature, not an ambient proofing condition; machine mix duration is 22.5 min ' +
    '(midpoint of sourced 20–25 min); target DDT is 22 °C (midpoint of preferred 21–23 °C range); bench rest is 1 h (tied to finished dough ' +
    'temperature in source); room 21 °C is an editorial default, not a published ambient fact; cold retard is 44 h at sourced 4 °C; ' +
    'staglio (divide) is 10 min editorial default; appretto (proof) is 3.5 h (midpoint of sourced 3–4 h) at editorial room 21 °C; ' +
    'stesura (pan stretch) is 10 min editorial default; dough core must be ≥19 °C before stretching into lightly oiled blue-steel pan; ' +
    'cooling is 60 min editorial default on wire rack.',
  formula: {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      preset('water', 80),
      preset('olive-oil', (15 / 725) * 100),
      preset('salt', (18 / 725) * 100),
      freshYeast((4 / 725) * 100),
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 725 },
  },
  process: {
    steps: [
      step('mix', 'mix', [], 1350, {
        conditions: { temperatureC: 21, doughTemperatureC: 22 },
      }),
      step('bulk', 'bulk', ['mix'], H, room),
      step('retard', 'retard', ['bulk'], 44 * H, fridge),
      step('divide', 'divide', ['retard'], 10 * MIN, room),
      step('proof', 'proof', ['divide'], 210 * MIN, room),
      step('shape', 'shape', ['proof'], 10 * MIN),
      alapStep('preheat', 'preheat', 30 * MIN),
      step('bake', 'bake', ['shape', 'preheat'], 630, {
        label: 'Bake in electric deck oven (deck 300–320 °C, top 200 °C, static)',
      }),
      step('cool', 'cool', ['bake'], 60 * MIN),
    ],
  },
};

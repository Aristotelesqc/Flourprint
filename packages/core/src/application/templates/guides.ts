import type { RecipeTemplate } from '../../domain/index.js';

/** Selected-source reference data; verification means full source reading, not consensus or prediction validation. */
export const STYLE_GUIDES: Readonly<Record<string, NonNullable<RecipeTemplate['guide']>>> = {
  baguette: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 68.14814814814815,
        high: 68.14814814814815,
      },
      {
        key: 'salt_pct',
        low: 2.2222222222222223,
        high: 2.2222222222222223,
      },
      {
        key: 'preferment_pct',
        low: 22.22222222222222,
        high: 22.22222222222222,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.8680555555555556,
        high: 0.8680555555555556,
      },
      {
        key: 'poolish_h',
        low: 14,
        high: 14,
      },
      {
        key: 'bulk_h',
        low: 1.5,
        high: 1.5,
      },
      {
        key: 'proof_h',
        low: 0.75,
        high: 1,
      },
      {
        key: 'bake_c',
        low: 232,
        high: 232,
      },
      {
        key: 'bake_min',
        low: 24,
        high: 28,
      },
    ],
  },
  'boule-dutch-oven': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 84.07407407407408,
        high: 84.07407407407408,
      },
      {
        key: 'salt_pct',
        low: 2.083333333333333,
        high: 2.083333333333333,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.20833333333333334,
        high: 0.20833333333333334,
      },
      {
        key: 'bulk_h',
        low: 12,
        high: 18,
      },
      {
        key: 'proof_h',
        low: 2,
        high: 2,
      },
      {
        key: 'bake_c',
        low: 232,
        high: 232,
      },
      {
        key: 'bake_min',
        low: 45,
        high: 60,
      },
    ],
  },
  ciabatta: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 76,
        high: 76,
      },
      {
        key: 'salt_pct',
        low: 2.0,
        high: 2.0,
      },
      {
        key: 'preferment_pct',
        low: 30,
        high: 30,
      },
      {
        key: 'biga_hydration_pct',
        low: 60,
        high: 60,
      },
      {
        key: 'biga_h',
        low: 16,
        high: 16,
      },
      {
        key: 'bulk_h',
        low: 2,
        high: 2,
      },
      {
        key: 'proof_h',
        low: 1,
        high: 1,
      },
      {
        key: 'bake_c',
        low: 238,
        high: 238,
      },
      {
        key: 'bake_min',
        low: 36,
        high: 36,
      },
    ],
  },
  bagels: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 65.79710144927536,
        high: 65.79710144927536,
      },
      {
        key: 'salt_pct',
        low: 2.608695652173913,
        high: 2.608695652173913,
      },
      {
        key: 'sugar_pct',
        low: 3.6231884057971016,
        high: 3.6231884057971016,
      },
      {
        key: 'non_diastatic_malt_pct',
        low: 5.072463768115942,
        high: 5.072463768115942,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.9782608695652175,
        high: 0.9782608695652175,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 1.5,
      },
      {
        key: 'simmer_per_side_s',
        low: 30,
        high: 30,
      },
      {
        key: 'bake_c',
        low: 218,
        high: 218,
      },
      {
        key: 'bake_min',
        low: 20,
        high: 20,
      },
    ],
  },
  focaccia: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 78.88888888888889,
        high: 78.88888888888889,
      },
      {
        key: 'oil_pct',
        low: 5.0,
        high: 5.0,
      },
      {
        key: 'salt_pct',
        low: 2.5,
        high: 2.5,
      },
      {
        key: 'sugar_pct',
        low: 1.3888888888888888,
        high: 1.3888888888888888,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.8333333333333334,
        high: 0.8333333333333334,
      },
      {
        key: 'proof_h',
        low: 1,
        high: 1.5,
      },
      {
        key: 'bake_c',
        low: 246,
        high: 246,
      },
      {
        key: 'bake_min',
        low: 15,
        high: 18,
      },
    ],
  },
  brioche: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'egg_pct',
        low: 60,
        high: 60,
      },
      {
        key: 'butter_pct',
        low: 50,
        high: 50,
      },
      {
        key: 'sugar_pct',
        low: 12,
        high: 12,
      },
      {
        key: 'salt_pct',
        low: 2.0,
        high: 2.0,
      },
      {
        key: 'cold_retard_min_h',
        low: 1,
        high: 1,
      },
      {
        key: 'proof_h',
        low: 2,
        high: 2,
      },
      {
        key: 'bake_c',
        low: 180,
        high: 180,
      },
      {
        key: 'bake_min',
        low: 25,
        high: 30,
      },
    ],
  },
  'burger-buns': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 47.14285714285714,
        high: 47.14285714285714,
      },
      {
        key: 'egg_pct',
        low: 11.904761904761903,
        high: 11.904761904761903,
      },
      {
        key: 'butter_pct',
        low: 6.666666666666667,
        high: 6.666666666666667,
      },
      {
        key: 'sugar_pct',
        low: 11.904761904761903,
        high: 11.904761904761903,
      },
      {
        key: 'salt_pct',
        low: 1.7857142857142856,
        high: 1.7857142857142856,
      },
      {
        key: 'yeast_instant_pct',
        low: 2.142857142857143,
        high: 2.142857142857143,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 2,
      },
      {
        key: 'proof_h',
        low: 1,
        high: 1,
      },
      {
        key: 'bake_c',
        low: 191,
        high: 191,
      },
      {
        key: 'bake_min',
        low: 15,
        high: 18,
      },
    ],
  },
  pullman: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 64.28571428571429,
        high: 64.28571428571429,
      },
      {
        key: 'butter_pct',
        low: 6.25,
        high: 6.25,
      },
      {
        key: 'sugar_pct',
        low: 4.464285714285714,
        high: 4.464285714285714,
      },
      {
        key: 'salt_pct',
        low: 1.7857142857142856,
        high: 1.7857142857142856,
      },
      {
        key: 'malt_syrup_pct',
        low: 0.35714285714285715,
        high: 0.35714285714285715,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.8928571428571428,
        high: 0.8928571428571428,
      },
      {
        key: 'dough_g_13in',
        low: 997,
        high: 997,
      },
      {
        key: 'bulk_h',
        low: 1.5,
        high: 1.5,
      },
      {
        key: 'proof_h',
        low: 2.5,
        high: 3,
      },
      {
        key: 'bake_c',
        low: 200,
        high: 200,
      },
      {
        key: 'bake_min',
        low: 55,
        high: 70,
      },
    ],
  },
  shokupan: {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 13.694267515923567,
        high: 13.694267515923567,
      },
      {
        key: 'milk_pct',
        low: 49.681528662420384,
        high: 49.681528662420384,
      },
      {
        key: 'liquid_pct',
        low: 63.37579617834395,
        high: 63.37579617834395,
      },
      {
        key: 'scald_flour_pct',
        low: 4.45859872611465,
        high: 4.45859872611465,
      },
      {
        key: 'butter_pct',
        low: 18.152866242038215,
        high: 18.152866242038215,
      },
      {
        key: 'sugar_pct',
        low: 15.92356687898089,
        high: 15.92356687898089,
      },
      {
        key: 'salt_pct',
        low: 1.910828025477707,
        high: 1.910828025477707,
      },
      {
        key: 'egg_pct',
        low: 15.92356687898089,
        high: 15.92356687898089,
      },
      {
        key: 'yeast_instant_pct',
        low: 2.8662420382165608,
        high: 2.8662420382165608,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 1.5,
      },
      {
        key: 'proof_h',
        low: 0.6666666666666666,
        high: 0.8333333333333334,
      },
      {
        key: 'bake_c',
        low: 177,
        high: 177,
      },
      {
        key: 'bake_min',
        low: 30,
        high: 35,
      },
    ],
  },
  'pizza-neo-neapolitan': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 70,
        high: 70,
      },
      {
        key: 'salt_pct',
        low: 3.2,
        high: 3.2,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.2,
        high: 0.2,
      },
      {
        key: 'ball_g',
        low: 289,
        high: 289,
      },
      {
        key: 'bulk_h',
        low: 24,
        high: 24,
      },
      {
        key: 'cold_retard_h',
        low: 48,
        high: 48,
      },
      {
        key: 'proof_h',
        low: 3,
        high: 4,
      },
      {
        key: 'bake_c',
        low: 260,
        high: 288,
      },
      {
        key: 'bake_min',
        low: 5,
        high: 8,
      },
    ],
  },
  'pizza-roman': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 60,
        high: 60,
      },
      {
        key: 'salt_pct',
        low: 2.6,
        high: 2.6,
      },
      {
        key: 'flour_w',
        low: 280,
        high: 300,
      },
      {
        key: 'ball_g',
        low: 180,
        high: 180,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 1,
      },
      {
        key: 'proof_h',
        low: 1.5,
        high: 1.5,
      },
      {
        key: 'cold_retard_max_h',
        low: 48,
        high: 48,
      },
      {
        key: 'bake_max_c',
        low: 350,
        high: 350,
      },
      {
        key: 'bake_min',
        low: 2,
        high: 3,
      },
    ],
  },
  'pizza-teglia': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 80,
        high: 80,
      },
      {
        key: 'flour_w',
        low: 300,
        high: 380,
      },
      {
        key: 'salt_pct',
        low: 2.4827586206896552,
        high: 2.4827586206896552,
      },
      {
        key: 'oil_pct',
        low: 2.0689655172413794,
        high: 2.0689655172413794,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 1,
      },
      {
        key: 'cold_retard_h',
        low: 44,
        high: 44,
      },
      {
        key: 'proof_h',
        low: 3,
        high: 4,
      },
      {
        key: 'bake_min',
        low: 8,
        high: 13,
      },
    ],
  },
  'pizza-new-york': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 61.93467336683417,
        high: 61.93467336683417,
      },
      {
        key: 'oil_pct',
        low: 1.4824120603015076,
        high: 1.4824120603015076,
      },
      {
        key: 'sugar_pct',
        low: 0.9798994974874372,
        high: 0.9798994974874372,
      },
      {
        key: 'salt_pct',
        low: 1.9597989949748744,
        high: 1.9597989949748744,
      },
      {
        key: 'yeast_instant_pct',
        low: 0.4396984924623116,
        high: 0.4396984924623116,
      },
      {
        key: 'ball_g',
        low: 331.925,
        high: 331.925,
      },
      {
        key: 'cold_retard_h',
        low: 24,
        high: 72,
      },
      {
        key: 'proof_h',
        low: 0.3333333333333333,
        high: 1,
      },
      {
        key: 'bake_c',
        low: 288,
        high: 288,
      },
      {
        key: 'bake_min',
        low: 4,
        high: 6,
      },
    ],
  },
  'pizza-sicilian': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_max_pct',
        low: 73.51851851851852,
        high: 73.51851851851852,
      },
      {
        key: 'salt_pct',
        low: 2.2222222222222223,
        high: 2.2222222222222223,
      },
      {
        key: 'yeast_instant_pct',
        low: 1.1111111111111112,
        high: 1.1111111111111112,
      },
      {
        key: 'oil_pct',
        low: 0,
        high: 0,
      },
      {
        key: 'dough_g_half_sheet',
        low: 955,
        high: 955,
      },
      {
        key: 'bulk_h',
        low: 1,
        high: 1,
      },
      {
        key: 'proof_h',
        low: 1,
        high: 2,
      },
      {
        key: 'bake_c',
        low: 232,
        high: 232,
      },
      {
        key: 'bake_min',
        low: 25,
        high: 32,
      },
    ],
  },
  'pizza-chicago': {
    reference: 'docs/science/data/style-guides.md',
    verified: true,
    ranges: [
      {
        key: 'hydration_pct',
        low: 62.2568093385214,
        high: 62.2568093385214,
      },
      {
        key: 'added_fats_pct',
        low: 10.894941634241246,
        high: 10.894941634241246,
      },
      {
        key: 'cornmeal_pct',
        low: 14.785992217898833,
        high: 14.785992217898833,
      },
      {
        key: 'salt_pct',
        low: 1.7509727626459144,
        high: 1.7509727626459144,
      },
      {
        key: 'sugar_pct',
        low: 1.556420233463035,
        high: 1.556420233463035,
      },
      {
        key: 'yeast_instant_pct',
        low: 1.1673151750972763,
        high: 1.1673151750972763,
      },
      {
        key: 'bulk_h',
        low: 0.5,
        high: 0.75,
      },
      {
        key: 'bake_c',
        low: 230,
        high: 230,
      },
      {
        key: 'bake_min',
        low: 25,
        high: 30,
      },
    ],
  },
};

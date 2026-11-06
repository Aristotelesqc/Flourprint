#!/usr/bin/env node

/**
 * baseline_published.mjs
 *
 * Baseline evaluation of Flourprint fermentation model against the published-recipe dataset
 * (published-recipes-2026-10.json) collected for issue #33, chantier 3.
 *
 * Rules:
 *  - Durations / temperatures with ranges resolve to midpoints.
 *  - Temperature defaults: room_unspecified -> 21 °C, fridge_unspecified -> 4 °C,
 *    warm_unspecified -> 27 °C.
 *  - A stage temperature of kind "not_stated" or duration "not_stated" / null hours makes the
 *    recipe "incomplete_schedule" (not simulated).
 *  - The dough clock starts at the END of the first mechanical mixing stage, where the yeast
 *    first meets the flour and water (process.md, First contact; owner decisions of 2026-11-04,
 *    #231): that stage's own duration does not count, and the kneading stages after it do.
 *    Yeast-free `pre_mix` stages (autolyse, bloom) never start it. A stage ahead of the first
 *    mixing stage stays outside the clock and outside T, in its real place. A recipe with no
 *    mixing stage gets a default 3 min mix, the first contact, which does not count.
 *  - Stage roles are looked up in an explicit table:
 *      * pre_mix: not in dough clock (activate yeast, autolyse, bloom, etc.). Dropped from process.
 *      * mix: mechanical mixing/kneading stages; the first one is the first contact (not counted).
 *      * ferment: all bulk, proof, fold, and rest stages.
 *      * Unsplit compound stages retain their assigned role in STAGE_ROLES.
 *  - Preferment gaps: the dough estimate uses the formula's total yeast and the steps after the first contact.
 *    A real preferment's missing duration or temperature uses a technical placeholder proved by
 *    checkPrefermentSensitivity not to affect the dough result, recording assumptions
 *    'preferment_duration_not_stated' and 'preferment_temperature_not_stated'.
 *  - Yeast in preferment is allocated to preferment component as in baguette template.
 *  - Tangzhong and yudane are scalds, not fermenting preferments: no preferment component and
 *    no preferment step. Their flour stays in the total, water stays in the dough, and yeast is
 *    retained in the formula. Recorded as assumption 'scald_not_modelled_as_preferment'.
 *  - Real preferments with non-ok status preserve the dough estimate and record the assumption
 *    'preferment_estimate_<status>'.
 *  - Unstated salt defaults to 2% and records assumption 'salt_defaulted_2pct'.
 *  - Real source hold-out: sourceGroup built via Union-Find over URL hostname (strip www.),
 *    exact independence_key, and independence_key prefix before ':' (excluding prefix 'lineage').
 *  - Engine refusals (dose_outside_domain, no_commercial_yeast, etc.) are reported without patching.
 *  - Outputs:
 *     (a) Markdown table per recipe: id, style, progress % at end of schedule (central & band),
 *         status/reason, assumptions, confidence.
 *     (b) Summary table per style and overall: coverage, geometric mean of progress / 100,
 *         SD log ratio, leave-one-source-out RMS factor exp(RMS) and share within ×1.5.
 *     (c) The same summary table excluding recipes with confidence: "low".
 *     (d) Status and reason breakdown (all recipes).
 *     (e) Leave-one-source-out timing prediction comparison against naive rules (all and excluding
 *         low confidence), including temperature-weighted rules (Q10 = 2 and fitted Q10 / dose).
 *  - Prints to stdout; no file writes.
 *  - Run directly, it prints the report. Imported (uncertainty_published.mjs), it only exports
 *    the dataset and the helpers below.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { estimateFermentation } from '../../../packages/core/dist/domain/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../data/published-recipes-2026-10.json');

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));

// Stage name to role mapping covering every stage in published-recipes-2026-10.json
const STAGE_ROLES = {
  // Outside the dough clock
  'activate yeast': 'pre_mix',
  autolyse: 'pre_mix',
  bloom: 'pre_mix',
  'bloom and autolyse': 'pre_mix',
  'bloom yeast': 'pre_mix',
  'dissolve yeast': 'pre_mix',
  'foam yeast': 'pre_mix',
  'proof yeast': 'pre_mix',
  // Mechanical mixing
  'food processor butter cut-in and mix': 'mix',
  knead: 'mix',
  mix: 'mix',
  'mix and knead': 'mix',
  'mix low': 'mix',
  pulse: 'mix',
  // In the dough clock, compound names whole
  acclimate: 'ferment',
  balls: 'ferment',
  'balls at room temperature': 'ferment',
  'balls in fridge': 'ferment',
  'balls rest': 'ferment',
  'bench and shape': 'ferment',
  'bench rest': 'ferment',
  bulk: 'ferment',
  'bulk ferment': 'ferment',
  chill: 'ferment',
  cold: 'ferment',
  'cold ferment': 'ferment',
  'cold proof': 'ferment',
  'combine and rest': 'ferment',
  'counter rest': 'ferment',
  'covered fridge': 'ferment',
  'divide and pre-shape rest': 'ferment',
  'dough rest': 'ferment',
  'dough rests and folds': 'ferment',
  ferment: 'ferment',
  'final proof': 'ferment',
  'final rise': 'ferment',
  'final shape': 'ferment',
  'first proof': 'ferment',
  'first proof and folds': 'ferment',
  'first rest': 'ferment',
  'first rest with folds': 'ferment',
  'first rise': 'ferment',
  'first rise with folds': 'ferment',
  'fold and rest': 'ferment',
  folds: 'ferment',
  'folds and lifts': 'ferment',
  'folds and rests': 'ferment',
  fridge: 'ferment',
  'fridge bulk': 'ferment',
  'fridge overnight': 'ferment',
  'fridge retard': 'ferment',
  'fridge uncovered': 'ferment',
  'further fermentation': 'ferment',
  'knead and rests': 'ferment',
  'mix and rest': 'ferment',
  'out before baking': 'ferment',
  'out of fridge': 'ferment',
  'out of fridge before baking': 'ferment',
  'pan and rise': 'ferment',
  'pan proof': 'ferment',
  'pan rest': 'ferment',
  'pan rise': 'ferment',
  'pre-shape rest': 'ferment',
  proof: 'ferment',
  'proof shaped buns': 'ferment',
  'refrigerator rise': 'ferment',
  relax: 'ferment',
  rest: 'ferment',
  'rest after shaping': 'ferment',
  'rest and ball': 'ferment',
  'rest and fold': 'ferment',
  'rest before baking': 'ferment',
  'rest dough balls': 'ferment',
  'rest in pan': 'ferment',
  'rest shaped balls': 'ferment',
  'rests and fold sets': 'ferment',
  'rests and folds': 'ferment',
  rise: 'ferment',
  'rise after shaping': 'ferment',
  'room bulk': 'ferment',
  'room rest': 'ferment',
  'second proof': 'ferment',
  'second rest': 'ferment',
  'second rest with folds': 'ferment',
  'second rise': 'ferment',
  'second rise in fridge': 'ferment',
  'shape and proof': 'ferment',
  'shape and rest': 'ferment',
  'shaped proof': 'ferment',
  'shaped rest': 'ferment',
  'shaped rise': 'ferment',
  'shaping rest': 'ferment',
  'stay in container': 'ferment',
  'stretch and fold': 'ferment',
  'stretch and fold sets': 'ferment',
  'stretch-and-fold sessions': 'ferment',
  'stretch-and-fold sets': 'ferment',
  tempering: 'ferment',
  warm: 'ferment',
  'warm up': 'ferment',
  'warm up before bake': 'ferment',
};

function getStageRole(name) {
  const normalized = (name || '').trim().toLowerCase();
  const role = STAGE_ROLES[normalized];
  if (!role) {
    throw new Error(`Unknown stage name: "${name}"`);
  }
  return role;
}

// Technical placeholder constants for real preferments when duration or temperature is not stated.
// Proved by checkPrefermentSensitivity not to affect the dough result, because the dough estimate
// uses the formula's total yeast and the dough-clock stages after the first contact.
const PREFERMENT_DURATION_PLACEHOLDER_HOURS = 12;
const PREFERMENT_TEMPERATURE_PLACEHOLDER_C = 21;

function resolveTemp(temperature) {
  if (!temperature) return 21;
  if (temperature.kind === 'stated' && temperature.c !== null) return temperature.c;
  if (temperature.kind === 'fridge_unspecified') return 4;
  if (temperature.kind === 'warm_unspecified') return 27;
  if (temperature.kind === 'room_unspecified') return 21;
  if (temperature.kind === 'not_stated') return null;
  return null;
}

function resolveHours(stage) {
  if (stage.duration === 'not_stated' || stage.hours_min === null) return null;
  if (stage.hours_max !== null) return (stage.hours_min + stage.hours_max) / 2;
  return stage.hours_min;
}

function extractHost(urlStr) {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function assignSourceGroups(recipes) {
  const n = recipes.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    let root = i;
    while (root !== parent[root]) {
      root = parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const next = parent[curr];
      parent[curr] = root;
      curr = next;
    }
    return root;
  }

  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const hostToIdx = new Map();
  const keyToIdx = new Map();
  const prefixToIdx = new Map();

  recipes.forEach((recipe, i) => {
    const host = extractHost(recipe.source?.url);
    if (host) {
      if (hostToIdx.has(host)) {
        union(i, hostToIdx.get(host));
      } else {
        hostToIdx.set(host, i);
      }
    }
    const key = recipe.independence_key;
    if (key) {
      if (keyToIdx.has(key)) {
        union(i, keyToIdx.get(key));
      } else {
        keyToIdx.set(key, i);
      }
      const colonIdx = key.indexOf(':');
      if (colonIdx > 0) {
        const prefix = key.slice(0, colonIdx);
        if (prefix !== 'lineage') {
          if (prefixToIdx.has(prefix)) {
            union(i, prefixToIdx.get(prefix));
          } else {
            prefixToIdx.set(prefix, i);
          }
        }
      }
    }
  });

  recipes.forEach((recipe, i) => {
    recipe.sourceGroup = `src-${find(i)}`;
  });
}

function buildFormula(recipe, assumptions = []) {
  const flours = [{ id: 'flour', sharePct: 100 }];
  const totalFlourG = recipe.flour?.total_g > 0 ? recipe.flour.total_g : 500;
  const anchor = { kind: 'flourTotal', grams: totalFlourG };

  const ingredients = [];

  // Water
  const waterPct = recipe.dough?.water?.value ?? 60;
  ingredients.push({
    id: 'water',
    kind: 'water',
    role: 'dough',
    bakerPct: waterPct,
  });

  // Salt: default 2% if unstated
  const saltVal = recipe.dough?.salt?.value;
  const saltDefaulted = saltVal === null || saltVal === undefined;
  const saltPct = saltDefaulted ? 2 : saltVal;
  if (saltDefaulted) {
    assumptions.push('salt_defaulted_2pct');
  }
  ingredients.push({
    id: 'salt',
    kind: 'other',
    role: 'dough',
    bakerPct: saltPct,
    water: { status: 'known', valuePct: 0 },
    fat: { status: 'known', valuePct: 0 },
    sugar: { status: 'known', valuePct: 0 },
  });

  // Yeast
  const yForm = recipe.yeast?.form;
  let yPct = recipe.yeast?.pct ?? 0;
  if ((yPct === 0 || yPct === null) && recipe.yeast?.g > 0 && totalFlourG > 0) {
    yPct = (recipe.yeast.g / totalFlourG) * 100;
    assumptions.push('yeast_pct_computed_from_grams');
  }
  let yeastId = null;

  if (yForm === 'instant') {
    yeastId = 'instant-yeast';
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: yPct,
      yeast: { form: 'instant' },
      water: { status: 'estimated', valuePct: 5 },
      fat: { status: 'estimated', valuePct: 4.5 },
      sugar: { status: 'estimated', valuePct: 0 },
    });
  } else if (yForm === 'active_dry') {
    yeastId = 'active-dry-yeast';
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: yPct,
      yeast: { form: 'active-dry' },
      water: { status: 'estimated', valuePct: 6 },
      fat: { status: 'estimated', valuePct: 4.5 },
      sugar: { status: 'estimated', valuePct: 0 },
    });
  } else if (yForm === 'fresh') {
    yeastId = 'fresh-yeast';
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: yPct,
      yeast: { form: 'fresh' },
      water: { status: 'known', valuePct: 70 },
      fat: { status: 'known', valuePct: 0 },
      sugar: { status: 'known', valuePct: 0 },
    });
  } else if (yForm === 'unspecified') {
    // Model unspecified commercial yeast as instant yeast and record assumption
    yeastId = 'instant-yeast';
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: yPct,
      yeast: { form: 'instant' },
      water: { status: 'estimated', valuePct: 5 },
      fat: { status: 'estimated', valuePct: 4.5 },
      sugar: { status: 'estimated', valuePct: 0 },
    });
    assumptions.push('yeast_form_unspecified_assumed_instant');
  } else if (yPct > 0) {
    // Other non-null commercial yeast form with positive dose: fallback model as instant yeast
    yeastId = 'instant-yeast';
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: yPct,
      yeast: { form: 'instant' },
      water: { status: 'estimated', valuePct: 5 },
      fat: { status: 'estimated', valuePct: 4.5 },
      sugar: { status: 'estimated', valuePct: 0 },
    });
    assumptions.push('yeast_form_unspecified_assumed_instant');
  }

  // Check if yeast is only in a preferment (dough yeast absent or zero, but preferment has yeast)
  if ((!yeastId || yPct === 0) && recipe.preferment?.yeast_g > 0 && totalFlourG > 0) {
    const prefYeastBakerPct = (recipe.preferment.yeast_g / totalFlourG) * 100;
    yeastId = 'instant-yeast';
    yPct = prefYeastBakerPct;
    ingredients.push({
      id: yeastId,
      kind: 'other',
      role: 'dough',
      bakerPct: prefYeastBakerPct,
      yeast: { form: 'instant' },
      water: { status: 'estimated', valuePct: 5 },
      fat: { status: 'estimated', valuePct: 4.5 },
      sugar: { status: 'estimated', valuePct: 0 },
    });
    assumptions.push('yeast_preferment_only_allocated_to_formula');
  }

  // Sugar
  const sugarPct = recipe.dough?.sugar?.value ?? 0;
  if (sugarPct > 0) {
    ingredients.push({
      id: 'sugar',
      kind: 'other',
      role: 'dough',
      bakerPct: sugarPct,
      water: { status: 'known', valuePct: 0 },
      fat: { status: 'known', valuePct: 0 },
      sugar: { status: 'known', valuePct: 100 },
    });
  }

  // Fat
  const fatPct = recipe.dough?.fat?.value ?? 0;
  if (fatPct > 0) {
    ingredients.push({
      id: 'fat',
      kind: 'other',
      role: 'dough',
      bakerPct: fatPct,
      water: { status: 'known', valuePct: 0 },
      fat: { status: 'known', valuePct: 100 },
      sugar: { status: 'known', valuePct: 0 },
    });
  }

  // Milk
  const milkPct = recipe.dough?.milk?.value ?? 0;
  if (milkPct > 0) {
    ingredients.push({
      id: 'milk',
      kind: 'other',
      role: 'dough',
      bakerPct: milkPct,
      water: { status: 'estimated', valuePct: 89 },
      fat: { status: 'estimated', valuePct: 2 },
      sugar: { status: 'estimated', valuePct: 5 },
    });
  }

  // Egg
  const eggPct = recipe.dough?.egg?.value ?? 0;
  if (eggPct > 0) {
    ingredients.push({
      id: 'egg',
      kind: 'other',
      role: 'dough',
      bakerPct: eggPct,
      water: { status: 'estimated', valuePct: 76 },
      fat: { status: 'estimated', valuePct: 9.5 },
      sugar: { status: 'estimated', valuePct: 0.4 },
    });
  }

  // Other dough ingredients
  if (Array.isArray(recipe.dough?.other)) {
    recipe.dough.other.forEach((item, idx) => {
      if (item.pct > 0) {
        ingredients.push({
          id: `other-${idx}`,
          kind: 'other',
          role: 'dough',
          bakerPct: item.pct,
          water: { status: 'unknown' },
          fat: { status: 'unknown' },
          sugar: { status: 'unknown' },
        });
      }
    });
  }

  // Preferment Component: scalds (tangzhong, yudane) are excluded from preferment modeling
  const components = [];
  if (
    recipe.preferment &&
    recipe.preferment.flour_pct > 0 &&
    recipe.preferment.type !== 'tangzhong' &&
    recipe.preferment.type !== 'yudane'
  ) {
    const pref = recipe.preferment;
    let prefYeastBakerPct = 0;
    if (pref.yeast_g !== null && totalFlourG > 0) {
      prefYeastBakerPct = (pref.yeast_g / totalFlourG) * 100;
    }
    const allocatedYeastPct =
      yeastId && prefYeastBakerPct > 0 ? Math.min(prefYeastBakerPct, yPct) : 0;

    const defaultHydration = pref.type === 'biga' ? 50 : 100;
    const maxHydration = (waterPct / pref.flour_pct) * 100;
    const hydrationPct = Math.min(defaultHydration, maxHydration);

    components.push({
      id: 'preferment',
      kind: 'preferment',
      flourPct: pref.flour_pct,
      flourBlend: [{ flour: 'flour', sharePct: 100 }],
      hydrationPct,
      allocations:
        allocatedYeastPct > 0 ? [{ ingredient: yeastId, bakerPct: allocatedYeastPct }] : [],
    });
  } else if (
    recipe.preferment &&
    (recipe.preferment.type === 'tangzhong' || recipe.preferment.type === 'yudane')
  ) {
    assumptions.push('scald_not_modelled_as_preferment');
  }

  return { flours, ingredients, components, anchor };
}

/**
 * The stages of the dough clock (process.md, First contact): every stage after the first `mix`
 * stage, which is the first contact and does not count itself; the kneading stages after it are in
 * it. The yeast-free `pre_mix` stages (autolyse, bloom) are not in it, and a stage ahead of the
 * first mixing stage stays in its real place, outside the clock and outside T. Without a mixing
 * stage the clock covers every stage that is not `pre_mix`, after a default 3 min mix.
 *
 * Limit: the dataset declares no incorporations, so the first `mix`-role stage is taken as the first
 * contact (process.md, no-incorporation rule). A recipe whose first mix held no yeast, with the
 * yeast added in a later stage, would start the clock too early here; none of the dataset's recipes
 * is described that way.
 */
function doughClockStages(recipe) {
  const stages = recipe.stages || [];
  const first = stages.findIndex((s) => getStageRole(s.name) === 'mix');
  return stages.slice(first + 1).filter((s) => getStageRole(s.name) !== 'pre_mix');
}

function buildProcess(recipe, scale = 1, assumptions = [], options = {}) {
  const steps = [];
  let prevId = null;

  // 1. Preferment step if present (scalds excluded)
  if (
    recipe.preferment &&
    recipe.preferment.flour_pct > 0 &&
    recipe.preferment.type !== 'tangzhong' &&
    recipe.preferment.type !== 'yudane'
  ) {
    const pref = recipe.preferment;
    let prefHours =
      options.prefermentHours !== undefined
        ? options.prefermentHours
        : pref.hours_min !== null && pref.hours_max !== null
          ? (pref.hours_min + pref.hours_max) / 2
          : (pref.hours_min ?? pref.hours_max);

    if (prefHours === null || prefHours === undefined) {
      // Technical placeholder proved by checkPrefermentSensitivity not to affect the dough result.
      prefHours = PREFERMENT_DURATION_PLACEHOLDER_HOURS;
      if (!assumptions.includes('preferment_duration_not_stated')) {
        assumptions.push('preferment_duration_not_stated');
      }
    }

    let prefTempC =
      options.prefermentTempC !== undefined
        ? options.prefermentTempC
        : resolveTemp(pref.temperature);

    if (prefTempC === null || prefTempC === undefined) {
      // Technical placeholder proved by checkPrefermentSensitivity not to affect the dough result.
      prefTempC = PREFERMENT_TEMPERATURE_PLACEHOLDER_C;
      if (!assumptions.includes('preferment_temperature_not_stated')) {
        assumptions.push('preferment_temperature_not_stated');
      }
    }

    const prefId = 'preferment-step';
    steps.push({
      id: prefId,
      operation: 'preferment',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: Math.round(prefHours * 3600),
      conditions: { temperatureC: prefTempC },
      subject: { kind: 'component', id: 'preferment' },
    });
    prevId = prefId;
  }

  // 2. The stages up to and including the first contact, in their real order (pre_mix stages are
  // dropped), then the dough clock. Without a mixing stage, a 3 min mix at the temperature of the
  // first remaining stage is the first contact.
  const stages = recipe.stages || [];
  const clock = doughClockStages(recipe);
  const kept = stages.filter((s) => getStageRole(s.name) !== 'pre_mix');
  const beforeClock = kept.filter((s) => !clock.includes(s));
  // No incorporation is declared, so the first mixing stage is the first contact; the last one is
  // the reference mixing step (`mix`), the earlier ones `frasage` (all are mixing steps).
  const lastMix = kept.filter((s) => getStageRole(s.name) === 'mix').at(-1);
  beforeClock.forEach((stage, i) => {
    const stepId = `before-${i + 1}`;
    steps.push({
      id: stepId,
      operation:
        getStageRole(stage.name) !== 'mix' ? 'rest' : stage === lastMix ? 'mix' : 'frasage',
      dependsOn: prevId ? [prevId] : [],
      schedule: 'asap',
      plannedDurationS: Math.round((resolveHours(stage) ?? 0) * 3600),
      conditions: { temperatureC: resolveTemp(stage.temperature) },
    });
    prevId = stepId;
  });
  if (!kept.some((s) => getStageRole(s.name) === 'mix')) {
    steps.push({
      id: 'mix',
      operation: 'mix',
      dependsOn: prevId ? [prevId] : [],
      schedule: 'asap',
      plannedDurationS: 180,
      conditions: { temperatureC: kept[0] ? resolveTemp(kept[0].temperature) : 21 },
    });
    prevId = 'mix';
  }

  // 3. The dough clock, in order: the kneading stages after the first contact count.
  clock.forEach((stage, i) => {
    const stageId = `stage-${i + 1}`;
    const mixing = getStageRole(stage.name) === 'mix';
    steps.push({
      id: stageId,
      operation: mixing
        ? stage === lastMix
          ? 'mix'
          : 'frasage'
        : /proof|apprêt|appret/i.test(stage.name)
          ? 'proof'
          : 'bulk',
      dependsOn: prevId ? [prevId] : [],
      schedule: 'asap',
      plannedDurationS: Math.round((resolveHours(stage) ?? 0) * scale * 3600),
      conditions: { temperatureC: resolveTemp(stage.temperature) },
    });
    prevId = stageId;
  });

  // 4. Bake step
  const bakeMin =
    recipe.bake?.minutes_min !== null && recipe.bake?.minutes_max !== null
      ? (recipe.bake.minutes_min + recipe.bake.minutes_max) / 2
      : (recipe.bake?.minutes_min ?? recipe.bake?.minutes_max ?? 30);
  const bakeTempC = recipe.bake?.temp_c ?? 220;
  steps.push({
    id: 'bake',
    operation: 'bake',
    dependsOn: [prevId],
    schedule: 'asap',
    plannedDurationS: Math.round(bakeMin * 60),
    conditions: { temperatureC: bakeTempC },
  });

  return { steps };
}

function evaluateRecipe(recipe) {
  const assumptions = [];

  // Check for unstated schedule durations or unstated stage temperatures.
  // Missing preferment duration or temperature is handled via technical placeholders proved not
  // to affect the dough result. Stage temperatures with kind 'not_stated' stay incomplete_schedule.
  const hasIncompleteSchedule = recipe.stages.some(
    (s) =>
      s.duration === 'not_stated' ||
      s.hours_min === null ||
      s.temperature?.kind === 'not_stated' ||
      resolveTemp(s.temperature) === null,
  );

  if (hasIncompleteSchedule) {
    return {
      id: recipe.id,
      style: recipe.style,
      sourceGroup: recipe.sourceGroup,
      independence_key: recipe.independence_key,
      confidence: recipe.confidence,
      status: 'incomplete_schedule',
      progressPct: null,
      band: null,
      assumptions,
    };
  }

  const formula = buildFormula(recipe, assumptions);
  const process = buildProcess(recipe, 1, assumptions);

  try {
    const estimates = estimateFermentation(formula, process);
    const doughProgress = estimates.dough?.progressPct;

    // Check if real preferments had non-ok status
    if (estimates.preferments) {
      for (const prefEst of Object.values(estimates.preferments)) {
        if (prefEst?.progressPct?.status && prefEst.progressPct.status !== 'ok') {
          assumptions.push(`preferment_estimate_${prefEst.progressPct.status}`);
        }
      }
    }

    if (!doughProgress) {
      return {
        id: recipe.id,
        style: recipe.style,
        sourceGroup: recipe.sourceGroup,
        independence_key: recipe.independence_key,
        confidence: recipe.confidence,
        status: 'error: no_dough_estimate',
        progressPct: null,
        band: null,
        assumptions,
      };
    }

    if (doughProgress.status === 'ok') {
      const central = doughProgress.value;
      let bandStr = null;
      if (doughProgress.range) {
        const low =
          doughProgress.range[0].kind === 'finite'
            ? `${doughProgress.range[0].value.toFixed(1)}%`
            : 'unbounded';
        const high =
          doughProgress.range[1].kind === 'finite'
            ? `${doughProgress.range[1].value.toFixed(1)}%`
            : 'unbounded';
        bandStr = `[${low}, ${high}]`;
      }
      return {
        id: recipe.id,
        style: recipe.style,
        sourceGroup: recipe.sourceGroup,
        independence_key: recipe.independence_key,
        confidence: recipe.confidence,
        status: 'ok',
        progressPct: central,
        band: bandStr,
        assumptions,
      };
    }

    const reason = doughProgress.reason ? `: ${doughProgress.reason}` : '';
    return {
      id: recipe.id,
      style: recipe.style,
      sourceGroup: recipe.sourceGroup,
      independence_key: recipe.independence_key,
      confidence: recipe.confidence,
      status: `${doughProgress.status}${reason}`,
      progressPct: null,
      band: null,
      assumptions,
    };
  } catch (err) {
    return {
      id: recipe.id,
      style: recipe.style,
      sourceGroup: recipe.sourceGroup,
      independence_key: recipe.independence_key,
      confidence: recipe.confidence,
      status: `error: ${err.message}`,
      progressPct: null,
      band: null,
      assumptions,
    };
  }
}

// Statistical calculation helpers
function geometricMean(arr) {
  if (arr.length === 0) return 0;
  const sumLogs = arr.reduce((acc, v) => acc + Math.log(v), 0);
  return Math.exp(sumLogs / arr.length);
}

function computeStats(items) {
  const total = items.length;
  const estimated = items.filter(
    (r) => r.status === 'ok' && r.progressPct !== null && r.progressPct > 0,
  );

  if (estimated.length === 0) {
    return {
      total,
      estimated: 0,
      coverageStr: `0 / ${total} (0.0%)`,
      geomMeanStr: '—',
      sdLogRatioStr: '—',
      losoRmsStr: '—',
      losoShareStr: '—',
    };
  }

  const yVals = estimated.map((r) => r.progressPct / 100);
  const geomMean = geometricMean(yVals);

  // SD of log ratio: ln(y / geomMean)
  let sdLogRatioStr;
  if (yVals.length > 1) {
    const logVals = yVals.map((y) => Math.log(y));
    const meanLog = logVals.reduce((a, b) => a + b, 0) / logVals.length;
    const variance = logVals.reduce((acc, v) => acc + (v - meanLog) ** 2, 0) / (logVals.length - 1);
    sdLogRatioStr = Math.sqrt(variance).toFixed(3);
  } else {
    sdLogRatioStr = '0.000';
  }

  // Leave-one-source-out CV by sourceGroup
  const groups = [...new Set(estimated.map((r) => r.sourceGroup))];
  let losoRmsStr = '—';
  let losoShareStr = '—';

  if (groups.length > 1) {
    const logErrors = [];
    for (const group of groups) {
      const train = estimated.filter((r) => r.sourceGroup !== group);
      const test = estimated.filter((r) => r.sourceGroup === group);
      if (train.length === 0) continue;

      const trainGeomMean = geometricMean(train.map((r) => r.progressPct / 100));
      for (const t of test) {
        const y = t.progressPct / 100;
        const err = Math.log(y) - Math.log(trainGeomMean);
        logErrors.push(err);
      }
    }

    if (logErrors.length > 0) {
      const rms = Math.sqrt(logErrors.reduce((acc, e) => acc + e ** 2, 0) / logErrors.length);
      const rmsFactor = Math.exp(rms);
      losoRmsStr = rmsFactor.toFixed(3);

      const withinCount = logErrors.filter((e) => Math.abs(e) <= Math.log(1.5)).length;
      const shareWithin = (withinCount / logErrors.length) * 100;
      losoShareStr = `${shareWithin.toFixed(1)}%`;
    }
  }

  const coveragePct = ((estimated.length / total) * 100).toFixed(1);
  return {
    total,
    estimated: estimated.length,
    coverageStr: `${estimated.length} / ${total} (${coveragePct}%)`,
    geomMeanStr: geomMean.toFixed(2),
    sdLogRatioStr,
    losoRmsStr,
    losoShareStr,
  };
}

function computeFermentationHours(recipe) {
  if (!recipe.stages || recipe.stages.length === 0) return 0;
  let totalH = 0;
  for (const stage of doughClockStages(recipe)) {
    const h = resolveHours(stage);
    if (h !== null && h > 0) {
      totalH += h;
    }
  }
  return totalH;
}

function computeFreshYeastEquivalentDose(recipe) {
  const totalFlourG = recipe.flour?.total_g > 0 ? recipe.flour.total_g : 500;
  let yPct = recipe.yeast?.pct ?? 0;
  if ((yPct === 0 || yPct === null) && recipe.yeast?.g > 0 && totalFlourG > 0) {
    yPct = (recipe.yeast.g / totalFlourG) * 100;
  }
  let form = recipe.yeast?.form;

  if ((!yPct || yPct === 0) && recipe.preferment?.yeast_g > 0 && totalFlourG > 0) {
    yPct = (recipe.preferment.yeast_g / totalFlourG) * 100;
    form = 'instant';
  }

  if (!yPct || yPct <= 0) return 0;

  let factor;
  if (form === 'fresh') {
    factor = 1;
  } else if (form === 'active_dry' || form === 'active-dry') {
    factor = 1 / 0.4;
  } else {
    // instant, unspecified, or other: instant
    factor = 1 / 0.33;
  }

  return yPct * factor;
}

function computeStageWeight(recipe, Q) {
  if (!recipe.stages || recipe.stages.length === 0) return 1;
  const fermentStages = doughClockStages(recipe);
  if (fermentStages.length === 0) return 1;

  let totalH = 0;
  const stageHours = [];
  for (const s of fermentStages) {
    const h = resolveHours(s);
    const validH = h !== null && h > 0 ? h : 0;
    stageHours.push(validH);
    totalH += validH;
  }

  if (totalH <= 0) return 1;

  let weight = 0;
  for (let i = 0; i < fermentStages.length; i++) {
    const share = stageHours[i] / totalH;
    const tempC = resolveTemp(fermentStages[i].temperature);
    weight += share * Math.pow(Q, (tempC - 21) / 10);
  }

  return weight > 0 ? weight : 1;
}

function evaluateDoughProgress(formula, recipe, scale) {
  try {
    const process = buildProcess(recipe, scale);
    const estimates = estimateFermentation(formula, process);
    const doughProgress = estimates.dough?.progressPct;
    if (doughProgress && doughProgress.status === 'ok' && typeof doughProgress.value === 'number') {
      return doughProgress.value;
    }
    return null;
  } catch {
    return null;
  }
}

function findModelScale(formula, recipe, targetPct) {
  const uMin = Math.log(1 / 64);
  const uMax = Math.log(64);

  const pMin = evaluateDoughProgress(formula, recipe, Math.exp(uMin));
  if (pMin === null) return null;

  const pMax = evaluateDoughProgress(formula, recipe, Math.exp(uMax));
  if (pMax === null) return null;

  if (targetPct < pMin || targetPct > pMax) {
    return null;
  }

  let low = uMin;
  let high = uMax;

  // 16 bisection iterations give a log-scale precision of about 2e-4 ((ln(64) - ln(1/64)) / 2^16 ≈ 1.27e-4).
  for (let iter = 0; iter < 16; iter++) {
    const mid = (low + high) / 2;
    const pMid = evaluateDoughProgress(formula, recipe, Math.exp(mid));
    if (pMid === null) {
      return null;
    }
    if (pMid < targetPct) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const finalU = (low + high) / 2;
  return Math.exp(finalU);
}

function computeMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeGeomSdFactor(arr) {
  if (arr.length <= 1) return 1;
  const logVals = arr.map((v) => Math.log(v));
  const meanLog = logVals.reduce((a, b) => a + b, 0) / logVals.length;
  const variance = logVals.reduce((acc, v) => acc + (v - meanLog) ** 2, 0) / (logVals.length - 1);
  return Math.exp(Math.sqrt(variance));
}

function evaluateTimingPredictors(items) {
  const groups = [...new Set(items.map((r) => r.sourceGroup))];
  const predictors = [
    { name: 'global mean time', errors: [], failures: 0 },
    { name: 'style mean time', errors: [], failures: 0 },
    { name: 'inverse yeast dose', errors: [], failures: 0 },
    { name: 'inverse yeast dose by style', errors: [], failures: 0 },
    {
      name: "model, global end point (uses the schedule's temperatures and stage shares)",
      errors: [],
      failures: 0,
    },
    {
      name: "model, style end point (uses the schedule's temperatures and stage shares)",
      errors: [],
      failures: 0,
    },
    { name: 'rule: inverse dose, Q10 = 2', errors: [], failures: 0 },
    { name: 'rule: fitted dose and Q10', errors: [], failures: 0 },
  ];

  const fittedKs = [];
  const fittedQs = [];

  const kValues = [];
  for (let ki = 0; ki <= 24; ki++) {
    kValues.push(Number((ki * 0.05).toFixed(2)));
  }
  const qValues = [];
  for (let qi = 0; qi <= 28; qi++) {
    qValues.push(Number((1.2 + qi * 0.1).toFixed(1)));
  }

  if (groups.length > 1) {
    for (const group of groups) {
      const train = items.filter((r) => r.sourceGroup !== group);
      const test = items.filter((r) => r.sourceGroup === group);
      if (train.length === 0) continue;

      // Fit aggregates on train
      const trainGeomMeanT = geometricMean(train.map((r) => r.T));
      const trainGeomMeanC = geometricMean(train.map((r) => r.T * r.dose));
      const trainGeomMeanE = geometricMean(train.map((r) => r.progressPct / 100));

      const trainStyles = [...new Set(train.map((r) => r.style))];
      const styleMeanTMap = new Map();
      const styleCMap = new Map();
      const styleEMap = new Map();

      for (const style of trainStyles) {
        const styleItems = train.filter((r) => r.style === style);
        if (styleItems.length > 0) {
          styleMeanTMap.set(style, geometricMean(styleItems.map((r) => r.T)));
          styleCMap.set(style, geometricMean(styleItems.map((r) => r.T * r.dose)));
          styleEMap.set(style, geometricMean(styleItems.map((r) => r.progressPct / 100)));
        }
      }

      // 7. rule: inverse dose, Q10 = 2
      // w_2 = Σ share_i * 2^((T_i - 21) / 10)
      const trainW2 = train.map((r) => computeStageWeight(r.recipe, 2.0));
      const trainC7 = geometricMean(train.map((r, idx) => r.T * r.dose * trainW2[idx]));

      // 8. rule: fitted dose and Q10
      // Grid search k in [0, 1.2] by 0.05, Q in [1.2, 4.0] by 0.1
      // minimizing variance of ln(T * dose^k * w(Q))
      let bestVar = Infinity;
      let bestK = 1.0;
      let bestQ = 2.0;
      let bestM = 0;

      const trainWByQ = qValues.map((q) => train.map((r) => computeStageWeight(r.recipe, q)));

      for (let qi = 0; qi < qValues.length; qi++) {
        const q = qValues[qi];
        const wList = trainWByQ[qi];
        const logTPlusLogW = train.map((r, idx) => Math.log(r.T) + Math.log(wList[idx]));
        const logDose = train.map((r) => Math.log(r.dose));

        for (let ki = 0; ki < kValues.length; ki++) {
          const k = kValues[ki];
          const zList = logTPlusLogW.map((ltw, idx) => ltw + k * logDose[idx]);
          const m = zList.reduce((acc, v) => acc + v, 0) / zList.length;
          const variance = zList.reduce((acc, v) => acc + (v - m) ** 2, 0) / (zList.length - 1);

          if (variance < bestVar) {
            bestVar = variance;
            bestK = k;
            bestQ = q;
            bestM = m;
          }
        }
      }

      fittedKs.push(bestK);
      fittedQs.push(bestQ);
      const trainC8 = Math.exp(bestM);

      for (const t of test) {
        const { T, dose, style, recipe, formula } = t;

        // 1. global mean time
        const tHat1 = trainGeomMeanT;
        predictors[0].errors.push(Math.log(T / tHat1));

        // 2. style mean time (fallback to 1)
        const tHat2 = styleMeanTMap.has(style) ? styleMeanTMap.get(style) : trainGeomMeanT;
        predictors[1].errors.push(Math.log(T / tHat2));

        // 3. inverse yeast dose
        const tHat3 = trainGeomMeanC / dose;
        predictors[2].errors.push(Math.log(T / tHat3));

        // 4. inverse yeast dose by style (fallback to 3)
        const C4 = styleCMap.has(style) ? styleCMap.get(style) : trainGeomMeanC;
        const tHat4 = C4 / dose;
        predictors[3].errors.push(Math.log(T / tHat4));

        // 5. model, global end point
        const targetPct5 = 100 * trainGeomMeanE;
        const s5 = findModelScale(formula, recipe, targetPct5);
        if (s5 !== null && s5 > 0) {
          const tHat5 = s5 * T;
          predictors[4].errors.push(Math.log(T / tHat5));
        } else {
          predictors[4].failures++;
        }

        // 6. model, style end point (fallback to 5)
        const E6 = styleEMap.has(style) ? styleEMap.get(style) : trainGeomMeanE;
        const targetPct6 = 100 * E6;
        const s6 = findModelScale(formula, recipe, targetPct6);
        if (s6 !== null && s6 > 0) {
          const tHat6 = s6 * T;
          predictors[5].errors.push(Math.log(T / tHat6));
        } else {
          predictors[5].failures++;
        }

        // 7. rule: inverse dose, Q10 = 2
        const testW2 = computeStageWeight(recipe, 2.0);
        const tHat7 = trainC7 / (dose * testW2);
        predictors[6].errors.push(Math.log(T / tHat7));

        // 8. rule: fitted dose and Q10
        const testW8 = computeStageWeight(recipe, bestQ);
        const tHat8 = trainC8 / (Math.pow(dose, bestK) * testW8);
        predictors[7].errors.push(Math.log(T / tHat8));
      }
    }
  }

  const rows = predictors.map((p) => {
    const scored = p.errors.length;
    const failures = p.failures;
    let rmsStr = '—';
    let within15Str = '—';
    let within20Str = '—';

    if (scored > 0) {
      const sumSq = p.errors.reduce((acc, e) => acc + e ** 2, 0);
      const rms = Math.sqrt(sumSq / scored);
      rmsStr = Math.exp(rms).toFixed(3);

      const within15Count = p.errors.filter((e) => Math.abs(e) <= Math.log(1.5)).length;
      within15Str = `${((within15Count / scored) * 100).toFixed(1)}%`;

      const within20Count = p.errors.filter((e) => Math.abs(e) <= Math.log(2.0)).length;
      within20Str = `${((within20Count / scored) * 100).toFixed(1)}%`;
    }

    return {
      name: p.name,
      scored,
      failures,
      rms: rmsStr,
      within15: within15Str,
      within20: within20Str,
    };
  });

  return {
    rows,
    medianK: computeMedian(fittedKs),
    medianQ: computeMedian(fittedQs),
  };
}

function checkPrefermentSensitivity(recipes) {
  const testConditions = [
    { hours: 4, tempC: 10 },
    { hours: 4, tempC: 28 },
    { hours: 24, tempC: 10 },
    { hours: 24, tempC: 28 },
  ];

  let testedCount = 0;
  let maxRelDiff = 0;

  for (const recipe of recipes) {
    const isRealPref =
      recipe.preferment?.flour_pct > 0 && !['tangzhong', 'yudane'].includes(recipe.preferment.type);
    if (!isRealPref) continue;

    const baseEval = evaluateRecipe(recipe);
    if (baseEval.status !== 'ok' || typeof baseEval.progressPct !== 'number') continue;

    const baseProgress = baseEval.progressPct;
    const formula = buildFormula(recipe);

    for (const cond of testConditions) {
      const altProcess = buildProcess(recipe, 1, [], {
        prefermentHours: cond.hours,
        prefermentTempC: cond.tempC,
      });
      const altEst = estimateFermentation(formula, altProcess);
      const altProgress = altEst.dough?.progressPct?.value;
      if (typeof altProgress !== 'number') {
        throw new Error(
          `Preferment sensitivity check failed: invalid dough progress for ${recipe.id} under ${cond.hours}h @ ${cond.tempC}°C`,
        );
      }
      const relDiff = Math.abs(altProgress - baseProgress) / baseProgress;
      if (relDiff > maxRelDiff) {
        maxRelDiff = relDiff;
      }
    }
    testedCount++;
  }

  console.log(
    `* Preferment sensitivity check: tested ${testedCount} recipes, largest relative difference = ${maxRelDiff.toExponential(4)}`,
  );

  if (maxRelDiff > 1e-9) {
    throw new Error(
      `Preferment sensitivity check exceeded tolerance: max relative difference ${maxRelDiff.toExponential(4)} > 1e-9`,
    );
  }
}

function run() {
  const recipes = dataset.recipes || [];
  assignSourceGroups(recipes);
  checkPrefermentSensitivity(recipes);
  const totalSourceGroups = new Set(recipes.map((r) => r.sourceGroup)).size;

  const results = recipes.map(evaluateRecipe);

  // Count recipes relying on unspecified yeast assumption
  const relyingOnUnspecifiedYeast = results.filter((r) =>
    r.assumptions.includes('yeast_form_unspecified_assumed_instant'),
  ).length;

  // Status and reason breakdown
  const statusCounts = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }
  const statusLine = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');

  // (a) Markdown table per recipe
  console.log('# Published recipes baseline evaluation (2026-10)\n');
  console.log(`* Status and reason counts: ${statusLine}`);
  console.log(
    `* Recipes relying on unspecified yeast assumed instant: ${relyingOnUnspecifiedYeast} / ${results.length}`,
  );
  console.log(`* Distinct source groups: ${totalSourceGroups}\n`);

  console.log('## (a) Recipe-level evaluation results\n');
  console.log('| ID | Style | Progress % | Band | Status / Reason | Assumptions | Confidence |');
  console.log('| :--- | :--- | :---: | :---: | :--- | :--- | :---: |');
  for (const r of results) {
    const progressStr = r.progressPct !== null ? `${r.progressPct.toFixed(1)}%` : '—';
    const bandStr = r.band || '—';
    const assumptionsStr = r.assumptions.length > 0 ? r.assumptions.join(', ') : '—';
    console.log(
      `| ${r.id} | ${r.style} | ${progressStr} | ${bandStr} | ${r.status} | ${assumptionsStr} | ${r.confidence} |`,
    );
  }
  console.log('\n');

  // Styles list
  const styles = [...new Set(results.map((r) => r.style))];

  // (b) Summary table per style and overall (all recipes)
  console.log('## (b) Summary by style and overall (all confidence levels)\n');
  console.log(`* Status and reason counts: ${statusLine}`);
  console.log(
    `* Recipes relying on unspecified yeast assumed instant: ${relyingOnUnspecifiedYeast} / ${results.length}`,
  );
  console.log(`* Distinct source groups: ${totalSourceGroups}\n`);
  console.log(
    '| Style | Total | Estimated | Coverage | Implied End Point | SD Log Ratio | LOSO RMS Factor | Share within ×1.5 |',
  );
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
  for (const style of styles) {
    const styleItems = results.filter((r) => r.style === style);
    const stats = computeStats(styleItems);
    console.log(
      `| ${style} | ${stats.total} | ${stats.estimated} | ${stats.coverageStr} | ${stats.geomMeanStr} | ${stats.sdLogRatioStr} | ${stats.losoRmsStr} | ${stats.losoShareStr} |`,
    );
  }
  const overallStats = computeStats(results);
  console.log(
    `| **Overall** | **${overallStats.total}** | **${overallStats.estimated}** | **${overallStats.coverageStr}** | **${overallStats.geomMeanStr}** | **${overallStats.sdLogRatioStr}** | **${overallStats.losoRmsStr}** | **${overallStats.losoShareStr}** |`,
  );
  console.log('\n');

  // (c) Summary table excluding confidence: "low"
  console.log('## (c) Summary by style and overall (excluding low confidence)\n');
  console.log(
    '| Style | Total | Estimated | Coverage | Implied End Point | SD Log Ratio | LOSO RMS Factor | Share within ×1.5 |',
  );
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
  const filteredResults = results.filter((r) => r.confidence !== 'low');
  for (const style of styles) {
    const styleItems = filteredResults.filter((r) => r.style === style);
    const stats = computeStats(styleItems);
    console.log(
      `| ${style} | ${stats.total} | ${stats.estimated} | ${stats.coverageStr} | ${stats.geomMeanStr} | ${stats.sdLogRatioStr} | ${stats.losoRmsStr} | ${stats.losoShareStr} |`,
    );
  }
  const filteredOverallStats = computeStats(filteredResults);
  console.log(
    `| **Overall** | **${filteredOverallStats.total}** | **${filteredOverallStats.estimated}** | **${filteredOverallStats.coverageStr}** | **${filteredOverallStats.geomMeanStr}** | **${filteredOverallStats.sdLogRatioStr}** | **${filteredOverallStats.losoRmsStr}** | **${filteredOverallStats.losoShareStr}** |`,
  );
  console.log('\n');

  // (d) Status and reason breakdown (all recipes)
  console.log('## (d) Status and reason breakdown (all recipes)\n');
  console.log('| Status / Reason | Count | Share |');
  console.log('| :--- | :---: | :---: |');
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    const share = ((count / results.length) * 100).toFixed(1);
    console.log(`| ${status} | ${count} | ${share}% |`);
  }
  console.log('\n');

  // Comparison set for timing evaluation
  const comparisonSet = [];
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const r = results[i];
    if (r.status === 'ok' && r.progressPct !== null && r.progressPct > 0) {
      const T = computeFermentationHours(recipe);
      const dose = computeFreshYeastEquivalentDose(recipe);
      if (T > 0 && dose > 0) {
        const formula = buildFormula(recipe);
        comparisonSet.push({
          recipe,
          id: recipe.id,
          style: recipe.style,
          sourceGroup: recipe.sourceGroup,
          independence_key: recipe.independence_key,
          confidence: recipe.confidence,
          progressPct: r.progressPct,
          T,
          dose,
          formula,
        });
      }
    }
  }

  const comparisonSetNoLow = comparisonSet.filter((item) => item.confidence !== 'low');

  // (e) Predicting published fermentation time, leave-one-source-out
  console.log(
    `## (e) Predicting published fermentation time, leave-one-source-out (n = ${comparisonSet.length})\n`,
  );
  const medianTAll = computeMedian(comparisonSet.map((r) => r.T));
  const geomSdAll = computeGeomSdFactor(comparisonSet.map((r) => r.T));
  console.log(
    `* Published dough-fermentation time T: median = ${medianTAll.toFixed(2)} h, geometric SD factor = ${geomSdAll.toFixed(3)}`,
  );
  console.log(`* Source groups: ${new Set(comparisonSet.map((r) => r.sourceGroup)).size}\n`);
  console.log('* Note: Predictors 1 to 4 know neither temperature nor stage shares.\n');
  console.log('| Predictor | Scored | Failures | RMS factor | Within ×1.5 | Within ×2 |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
  const resAll = evaluateTimingPredictors(comparisonSet);
  for (const row of resAll.rows) {
    console.log(
      `| ${row.name} | ${row.scored} | ${row.failures} | ${row.rms} | ${row.within15} | ${row.within20} |`,
    );
  }
  console.log(
    `\n* Median fitted rule parameters: k = ${resAll.medianK.toFixed(2)}, Q10 = ${resAll.medianQ.toFixed(1)}`,
  );
  console.log(
    "* Note: Section (e)'s model rows are close to section (b)'s error, since progress is nearly proportional to the scale; and rules were scored only on recipes the engine accepts, with the count excluded.\n",
  );

  console.log(`### Excluding low confidence (n = ${comparisonSetNoLow.length})\n`);
  const medianTNoLow = computeMedian(comparisonSetNoLow.map((r) => r.T));
  const geomSdNoLow = computeGeomSdFactor(comparisonSetNoLow.map((r) => r.T));
  console.log(
    `* Published dough-fermentation time T: median = ${medianTNoLow.toFixed(2)} h, geometric SD factor = ${geomSdNoLow.toFixed(3)}`,
  );
  console.log(`* Source groups: ${new Set(comparisonSetNoLow.map((r) => r.sourceGroup)).size}\n`);
  console.log('* Note: Predictors 1 to 4 know neither temperature nor stage shares.\n');
  console.log('| Predictor | Scored | Failures | RMS factor | Within ×1.5 | Within ×2 |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');
  const resNoLow = evaluateTimingPredictors(comparisonSetNoLow);
  for (const row of resNoLow.rows) {
    console.log(
      `| ${row.name} | ${row.scored} | ${row.failures} | ${row.rms} | ${row.within15} | ${row.within20} |`,
    );
  }
  console.log(
    `\n* Median fitted rule parameters: k = ${resNoLow.medianK.toFixed(2)}, Q10 = ${resNoLow.medianQ.toFixed(1)}`,
  );
  console.log(
    "* Note: Section (e)'s model rows are close to section (b)'s error, since progress is nearly proportional to the scale; and rules were scored only on recipes the engine accepts, with the count excluded.",
  );
}

export {
  dataset,
  assignSourceGroups,
  evaluateRecipe,
  buildFormula,
  buildProcess,
  doughClockStages,
  resolveHours,
  resolveTemp,
  computeFermentationHours,
  computeFreshYeastEquivalentDose,
  computeStageWeight,
  evaluateDoughProgress,
  findModelScale,
  geometricMean,
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  run();
}

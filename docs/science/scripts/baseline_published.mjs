#!/usr/bin/env node

/**
 * baseline_published.mjs
 *
 * Baseline evaluation of Flourprint fermentation model against the published-recipe dataset
 * (published-recipes-2026-10.json) collected for issue #33, chantier 3.
 *
 * Rules:
 *  - Durations / temperatures with ranges resolve to midpoints.
 *  - Temperature defaults: room_unspecified -> 21 °C, fridge_unspecified -> 4 °C, warm_unspecified -> 27 °C.
 *  - Stage with duration: "not_stated" or null hours makes recipe "incomplete schedule" (not simulated).
 *  - Yeast in preferment is allocated to preferment component as in baguette template.
 *  - Engine refusals (dose_outside_domain, no_commercial_yeast, etc.) are reported without patching.
 *  - Outputs:
 *     (a) Markdown table per recipe: id, style, progress % at end of schedule (central & band), status/reason, confidence.
 *     (b) Summary table per style and overall: coverage, geometric mean of progress / 100, SD log ratio,
 *         leave-one-source-out RMS factor exp(RMS) and share within ×1.5.
 *     (c) The same summary table excluding recipes with confidence: "low".
 *  - Prints to stdout; no file writes.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { estimateFermentation } from '../../../packages/core/dist/domain/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const datasetPath = path.resolve(__dirname, '../data/published-recipes-2026-10.json');

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));

function resolveTemp(temperature) {
  if (!temperature) return 21;
  if (temperature.kind === 'stated' && temperature.c !== null) return temperature.c;
  if (temperature.kind === 'fridge_unspecified') return 4;
  if (temperature.kind === 'warm_unspecified') return 27;
  if (temperature.kind === 'room_unspecified') return 21;
  return 21;
}

function resolveHours(stage) {
  if (stage.duration === 'not_stated' || stage.hours_min === null) return null;
  if (stage.hours_max !== null) return (stage.hours_min + stage.hours_max) / 2;
  return stage.hours_min;
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

  // Salt
  const saltPct = recipe.dough?.salt?.value ?? 2;
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

  // Preferment Component
  const components = [];
  if (recipe.preferment && recipe.preferment.flour_pct > 0) {
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
  }

  return { flours, ingredients, components, anchor };
}

function buildProcess(recipe) {
  const steps = [];
  let prevId = null;

  // 1. Preferment step if present
  if (recipe.preferment && recipe.preferment.flour_pct > 0) {
    const pref = recipe.preferment;
    const prefHours =
      pref.hours_min !== null && pref.hours_max !== null
        ? (pref.hours_min + pref.hours_max) / 2
        : (pref.hours_min ?? pref.hours_max ?? 12);
    const prefTempC = resolveTemp(pref.temperature);
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

  // 2. Mix step
  const firstStage = recipe.stages[0];
  const isFirstMix =
    firstStage && /mix|knead|broyer|pétrir|petrir|autolyse|autolyze/i.test(firstStage.name);

  let stageIndexStart = 0;
  let mixDurationS = 180; // 3 min default
  let mixTempC = 21;

  if (isFirstMix) {
    const h = resolveHours(firstStage);
    if (h !== null && h > 0) {
      mixDurationS = Math.round(h * 3600);
    }
    mixTempC = resolveTemp(firstStage.temperature);
    stageIndexStart = 1;
  } else if (firstStage) {
    mixTempC = resolveTemp(firstStage.temperature);
  }

  const mixId = 'mix';
  steps.push({
    id: mixId,
    operation: 'mix',
    dependsOn: prevId ? [prevId] : [],
    schedule: 'asap',
    plannedDurationS: mixDurationS,
    conditions: { temperatureC: mixTempC },
  });
  prevId = mixId;

  // 3. Fermentation stages
  for (let i = stageIndexStart; i < recipe.stages.length; i++) {
    const stage = recipe.stages[i];
    const h = resolveHours(stage);
    const stageTempC = resolveTemp(stage.temperature);
    const stageId = `stage-${stage.order || i + 1}`;
    const op = /proof|apprêt|appret/i.test(stage.name) ? 'proof' : 'bulk';
    steps.push({
      id: stageId,
      operation: op,
      dependsOn: [prevId],
      schedule: 'asap',
      plannedDurationS: Math.round((h ?? 0) * 3600),
      conditions: { temperatureC: stageTempC },
    });
    prevId = stageId;
  }

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

  // Check for unstated schedule durations
  const hasIncompleteSchedule = recipe.stages.some(
    (s) => s.duration === 'not_stated' || s.hours_min === null,
  );

  if (hasIncompleteSchedule) {
    return {
      id: recipe.id,
      style: recipe.style,
      independence_key: recipe.independence_key,
      confidence: recipe.confidence,
      status: 'incomplete_schedule',
      progressPct: null,
      band: null,
      assumptions,
    };
  }

  const formula = buildFormula(recipe, assumptions);
  const process = buildProcess(recipe);

  try {
    const estimates = estimateFermentation(formula, process);
    const doughProgress = estimates.dough?.progressPct;

    if (!doughProgress) {
      return {
        id: recipe.id,
        style: recipe.style,
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

  // Leave-one-source-out CV by independence_key
  const keys = [...new Set(estimated.map((r) => r.independence_key))];
  let losoRmsStr = '—';
  let losoShareStr = '—';

  if (keys.length > 1) {
    const logErrors = [];
    for (const key of keys) {
      const train = estimated.filter((r) => r.independence_key !== key);
      const test = estimated.filter((r) => r.independence_key === key);
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

function run() {
  const recipes = dataset.recipes || [];
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
    `* Recipes relying on unspecified yeast assumed instant: ${relyingOnUnspecifiedYeast} / ${results.length}\n`,
  );

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
    `* Recipes relying on unspecified yeast assumed instant: ${relyingOnUnspecifiedYeast} / ${results.length}\n`,
  );
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
}

run();

#!/usr/bin/env node

/**
 * uncertainty_published.mjs
 *
 * Predictive uncertainty of the fermentation model against the published-recipe dataset
 * (#33). Research only: it changes no contract, constant or band.
 *
 * Question: when the model and the naive rules are turned into predictive distributions of the
 * published dough-fermentation time, holding out whole sources, which one is calibrated and sharp?
 * And does the shipped corner envelope (fermentation.md, the band) behave like an interval?
 *
 * Rules:
 *  - Same recipes, source groups, dough clock, dose and time as baseline_published.mjs, imported
 *    from it (one implementation).
 *  - Errors are e = ln(T_published / T_predicted). A predictor's distribution for a held-out source
 *    is Normal(ln T_hat + b, s), where b and s come from the residuals of the training sources only:
 *    b their mean, s^2 their sum of squares about b over (n - p), p the predictor's fitted
 *    parameters. A distribution-free (split conformal) interval uses the quantiles of |r - b| on the
 *    same training residuals.
 *  - The model's time for an end point E is the schedule scale s at which the engine reaches E,
 *    read from a 49-point grid of the progress curve (ln progress interpolated linearly in ln s).
 *    The grid is checked once against the bisection of baseline_published.mjs.
 *  - Scores on held-out sources: RMS factor, bias, coverage of 50/80/95 % intervals, mean width of
 *    the 80 % interval as a factor, log score (mean negative log density of ln T, lower is better),
 *    CRPS (in ln units, lower is better) and the PIT deciles.
 *  - The corner envelope covers a held-out recipe when the training end point lies inside the
 *    progress band the engine gives at the published schedule (the time band is monotone in it).
 *  - Prints to stdout; no file writes.
 */

import { estimateFermentation } from '../../../packages/core/dist/domain/index.js';
import {
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
} from './baseline_published.mjs';

const LEVELS = [0.5, 0.8, 0.95];
const Z = { 0.5: 0.6744897502, 0.8: 1.2815515655, 0.95: 1.9599639845 };
const GRID_N = 49;
const U_MAX = Math.log(64);
const COLD_C = 8;

// Normal distribution helpers (Abramowitz and Stegun 7.1.26, absolute error below 1.5e-7).
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return s * y;
}
const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

function crpsNormal(x, mu, s) {
  const z = (x - mu) / s;
  return s * (z * (2 * Phi(z) - 1) + 2 * phi(z) - 1 / Math.sqrt(Math.PI));
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** The ceil((n + 1) level)-th smallest absolute residual: the split conformal half-width. */
function conformalHalfWidth(absResiduals, level) {
  const sorted = [...absResiduals].sort((a, b) => a - b);
  const rank = Math.ceil((sorted.length + 1) * level);
  return rank > sorted.length ? Infinity : sorted[rank - 1];
}

/** Progress (%) at 49 log-spaced schedule scales from 1/64 to 64; null where the engine refuses. */
function progressCurve(item) {
  const us = [];
  const ps = [];
  for (let j = 0; j < GRID_N; j++) {
    const u = -U_MAX + (2 * U_MAX * j) / (GRID_N - 1);
    us.push(u);
    ps.push(evaluateDoughProgress(item.formula, item.recipe, Math.exp(u)));
  }
  return { us, ps };
}

/** ln of the scale at which the progress reaches targetPct, or null when it is not bracketed. */
function lnScaleFor(curve, targetPct) {
  const { us, ps } = curve;
  for (let j = 0; j < us.length - 1; j++) {
    const p0 = ps[j];
    const p1 = ps[j + 1];
    if (p0 === null || p1 === null || p0 <= 0 || p1 <= 0) continue;
    if (p0 <= targetPct && targetPct <= p1) {
      if (p1 === p0) return us[j];
      const w = (Math.log(targetPct) - Math.log(p0)) / (Math.log(p1) - Math.log(p0));
      return us[j] + w * (us[j + 1] - us[j]);
    }
  }
  return null;
}

function coldShare(recipe) {
  let total = 0;
  let cold = 0;
  for (const stage of doughClockStages(recipe)) {
    const h = resolveHours(stage);
    if (h === null || h <= 0) continue;
    total += h;
    if (resolveTemp(stage.temperature) <= COLD_C) cold += h;
  }
  return total > 0 ? cold / total : 0;
}

/** The engine's progress band at the published schedule, or null when a bound is not finite. */
function progressBand(item) {
  const est = estimateFermentation(item.formula, buildProcess(item.recipe, 1));
  const range = est.dough?.progressPct?.range;
  if (!range || range[0].kind !== 'finite' || range[1].kind !== 'finite') return null;
  return [range[0].value, range[1].value];
}

function buildItems() {
  const recipes = dataset.recipes || [];
  assignSourceGroups(recipes);
  const items = [];
  for (const recipe of recipes) {
    const r = evaluateRecipe(recipe);
    if (r.status !== 'ok' || r.progressPct === null || r.progressPct <= 0) continue;
    const T = computeFermentationHours(recipe);
    const dose = computeFreshYeastEquivalentDose(recipe);
    if (!(T > 0 && dose > 0)) continue;
    const item = {
      recipe,
      id: recipe.id,
      style: recipe.style,
      sourceGroup: recipe.sourceGroup,
      confidence: recipe.confidence,
      progressPct: r.progressPct,
      T,
      dose,
      formula: buildFormula(recipe),
      cold: coldShare(recipe),
    };
    item.curve = progressCurve(item);
    item.band = progressBand(item);
    items.push(item);
  }
  return items;
}

/** Fitted dose and Q10 rule, the same grid as baseline_published.mjs. */
function fitRule(train) {
  let best = { variance: Infinity, k: 1, q: 2, m: 0 };
  for (let qi = 0; qi <= 28; qi++) {
    const q = Number((1.2 + qi * 0.1).toFixed(1));
    const base = train.map((r) => Math.log(r.T) + Math.log(computeStageWeight(r.recipe, q)));
    for (let ki = 0; ki <= 24; ki++) {
      const k = Number((ki * 0.05).toFixed(2));
      const z = base.map((v, i) => v + k * Math.log(train[i].dose));
      const m = mean(z);
      const variance = z.reduce((acc, v) => acc + (v - m) ** 2, 0) / (z.length - 1);
      if (variance < best.variance) best = { variance, k, q, m };
    }
  }
  return best;
}

/**
 * Each predictor gives, for a training set, a function from an item to ln T_hat (or null), and
 * its number of fitted parameters.
 */
const PREDICTORS = [
  {
    name: 'global mean time',
    fit(train) {
      const c = Math.log(geometricMean(train.map((r) => r.T)));
      return { p: 1, predict: () => c };
    },
  },
  {
    name: 'style mean time',
    fit(train) {
      const global = Math.log(geometricMean(train.map((r) => r.T)));
      const byStyle = new Map();
      for (const style of new Set(train.map((r) => r.style))) {
        byStyle.set(
          style,
          Math.log(geometricMean(train.filter((r) => r.style === style).map((r) => r.T))),
        );
      }
      return {
        p: byStyle.size,
        predict: (it) => (byStyle.has(it.style) ? byStyle.get(it.style) : global),
      };
    },
  },
  {
    name: 'rule: fitted dose and Q10',
    fit(train) {
      const { k, q, m } = fitRule(train);
      return {
        p: 3,
        predict: (it) => m - k * Math.log(it.dose) - Math.log(computeStageWeight(it.recipe, q)),
      };
    },
  },
  {
    name: 'model, global end point',
    fit(train) {
      const E = geometricMean(train.map((r) => r.progressPct / 100));
      return {
        p: 1,
        predict: (it) => {
          const lnS = lnScaleFor(it.curve, 100 * E);
          return lnS === null ? null : Math.log(it.T) + lnS;
        },
        endPoint: E,
      };
    },
  },
];

function evaluate(items) {
  const groups = [...new Set(items.map((r) => r.sourceGroup))];
  const out = PREDICTORS.map((pr) => ({
    name: pr.name,
    held: [],
    failures: 0,
  }));
  const envelope = { covered: 0, scored: 0, unbounded: 0, ratios: [] };

  for (const group of groups) {
    const train = items.filter((r) => r.sourceGroup !== group);
    const test = items.filter((r) => r.sourceGroup === group);
    if (train.length < 5) continue;

    PREDICTORS.forEach((pr, pi) => {
      const fitted = pr.fit(train);
      const residuals = [];
      for (const it of train) {
        const lnHat = fitted.predict(it);
        if (lnHat !== null) residuals.push(Math.log(it.T) - lnHat);
      }
      const n = residuals.length;
      const b = mean(residuals);
      const s = Math.sqrt(residuals.reduce((acc, r) => acc + (r - b) ** 2, 0) / (n - fitted.p));
      const abs = residuals.map((r) => Math.abs(r - b));
      const halfWidths = Object.fromEntries(LEVELS.map((l) => [l, conformalHalfWidth(abs, l)]));

      for (const it of test) {
        const lnHat = fitted.predict(it);
        if (lnHat === null) {
          out[pi].failures++;
          continue;
        }
        const x = Math.log(it.T);
        const mu = lnHat + b;
        out[pi].held.push({ it, e: x - lnHat, x, mu, s, halfWidths });
      }

      if (fitted.endPoint !== undefined) {
        for (const it of test) {
          if (!it.band) {
            envelope.unbounded++;
            continue;
          }
          envelope.scored++;
          const target = 100 * fitted.endPoint;
          if (it.band[0] <= target && target <= it.band[1]) envelope.covered++;
          envelope.ratios.push(it.band[1] / it.band[0]);
        }
      }
    });
  }
  return { predictors: out, envelope };
}

function scoreRows(held) {
  if (held.length === 0) return null;
  const e = held.map((h) => h.e);
  const row = {
    n: held.length,
    rms: Math.exp(Math.sqrt(mean(e.map((v) => v * v)))),
    bias: Math.exp(mean(e)),
    logScore: mean(held.map((h) => -Math.log(phi((h.x - h.mu) / h.s) / h.s))),
    crps: mean(held.map((h) => crpsNormal(h.x, h.mu, h.s))),
    width80: Math.exp(mean(held.map((h) => 2 * Z[0.8] * h.s))),
    gauss: {},
    conformal: {},
  };
  for (const l of LEVELS) {
    row.gauss[l] = mean(held.map((h) => (Math.abs(h.x - h.mu) <= Z[l] * h.s ? 1 : 0)));
    row.conformal[l] = mean(held.map((h) => (Math.abs(h.x - h.mu) <= h.halfWidths[l] ? 1 : 0)));
  }
  const deciles = new Array(10).fill(0);
  for (const h of held) {
    const u = Phi((h.x - h.mu) / h.s);
    deciles[Math.min(9, Math.floor(u * 10))]++;
  }
  row.pit = deciles;
  return row;
}

const pct = (v) => `${(100 * v).toFixed(0)} %`;

function printScores(title, items) {
  const { predictors, envelope } = evaluate(items);
  console.log(
    `## ${title} (n = ${items.length}, ${new Set(items.map((r) => r.sourceGroup)).size} source groups)\n`,
  );
  console.log(
    '| Predictor | Scored | Failures | RMS factor | Bias factor | Log score | CRPS | 80 % width (factor) | Gaussian 50/80/95 % | Conformal 50/80/95 % |',
  );
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
  const rows = [];
  for (const p of predictors) {
    const r = scoreRows(p.held);
    rows.push({ name: p.name, row: r, held: p.held });
    if (!r) continue;
    console.log(
      `| ${p.name} | ${r.n} | ${p.failures} | ${r.rms.toFixed(2)} | ${r.bias.toFixed(2)} | ${r.logScore.toFixed(3)} | ${r.crps.toFixed(3)} | ×${r.width80.toFixed(2)} | ${LEVELS.map((l) => pct(r.gauss[l])).join(' / ')} | ${LEVELS.map((l) => pct(r.conformal[l])).join(' / ')} |`,
    );
  }
  console.log('\n* PIT deciles (Gaussian; a calibrated predictor is flat, about n/10 each):\n');
  for (const { name, row } of rows) {
    if (row) console.log(`  * ${name}: ${row.pit.join(' ')}`);
  }
  const medianRatio = [...envelope.ratios].sort((a, b) => a - b)[
    Math.floor(envelope.ratios.length / 2)
  ];
  console.log(
    `\n* Shipped corner envelope: covers ${envelope.covered} / ${envelope.scored} held-out recipes (${pct(envelope.covered / envelope.scored)}), ` +
      `${envelope.unbounded} with an unbounded corner; median progress band high/low ×${medianRatio.toFixed(2)}.\n`,
  );
  return rows;
}

function printRegimes(heldModel) {
  console.log('## Model errors by regime (held-out, all recipes)\n');
  console.log('| Regime | n | RMS factor | Bias factor | Inside the Gaussian 80 % interval |');
  console.log('| :--- | :---: | :---: | :---: | :---: |');
  const buckets = [
    ['no cold stage', (it) => it.cold === 0],
    [`cold share ≤ 50 % (≤ ${COLD_C} °C)`, (it) => it.cold > 0 && it.cold <= 0.5],
    ['cold share > 50 %', (it) => it.cold > 0.5],
    ['dose < 0.5 % fresh-equivalent', (it) => it.dose < 0.5],
    ['dose 0.5 to 2 %', (it) => it.dose >= 0.5 && it.dose <= 2],
    ['dose > 2 %', (it) => it.dose > 2],
    ['time < 6 h', (it) => it.T < 6],
    ['time 6 to 24 h', (it) => it.T >= 6 && it.T <= 24],
    ['time > 24 h', (it) => it.T > 24],
    ['confidence low', (it) => it.confidence === 'low'],
    ['confidence medium or high', (it) => it.confidence !== 'low'],
  ];
  for (const style of [...new Set(heldModel.map((h) => h.it.style))].sort()) {
    buckets.push([`style ${style}`, (it) => it.style === style]);
  }
  for (const [label, test] of buckets) {
    const sel = heldModel.filter((h) => test(h.it));
    if (sel.length === 0) continue;
    const e = sel.map((h) => h.e);
    const inside = mean(sel.map((h) => (Math.abs(h.x - h.mu) <= Z[0.8] * h.s ? 1 : 0)));
    console.log(
      `| ${label} | ${sel.length} | ${Math.exp(Math.sqrt(mean(e.map((v) => v * v)))).toFixed(2)} | ${Math.exp(mean(e)).toFixed(2)} | ${pct(inside)} |`,
    );
  }
  console.log('');
}

function checkGrid(items) {
  const E = geometricMean(items.map((r) => r.progressPct / 100));
  let worst = 0;
  let compared = 0;
  for (const it of items) {
    const s = findModelScale(it.formula, it.recipe, 100 * E);
    const lnS = lnScaleFor(it.curve, 100 * E);
    if (s === null || lnS === null) {
      if ((s === null) !== (lnS === null)) {
        throw new Error(`Grid and bisection disagree on reachability for ${it.id}`);
      }
      continue;
    }
    worst = Math.max(worst, Math.abs(Math.log(s) - lnS));
    compared++;
  }
  console.log(
    `* Grid check against bisection: ${compared} recipes, largest |Δ ln scale| = ${worst.toExponential(2)}`,
  );
  if (worst > 0.01) throw new Error(`Grid interpolation error ${worst} exceeds 0.01`);
}

function run() {
  const items = buildItems();
  console.log('# Predictive uncertainty on published recipes (2026-10)\n');
  checkGrid(items);
  console.log(`* Cold stage: condition temperature ≤ ${COLD_C} °C.\n`);
  const rowsAll = printScores('All recipes', items);
  printScores(
    'Excluding low confidence',
    items.filter((it) => it.confidence !== 'low'),
  );
  printRegimes(rowsAll.find((r) => r.name === 'model, global end point').held);
}

run();

#!/usr/bin/env node

/**
 * ea_sensitivity_published.mjs
 *
 * Research only (#231). Does a lower temperature sensitivity `Ea`, or another readiness target `F*`,
 * or another base speed `A`, reduce the disagreement of the shipped law with the prescribed schedules
 * of the published recipes? It changes no contract, constant, band or engine file:
 * the shipped coefficients are read from the engine, overwritten IN THIS PROCESS ONLY, and restored.
 *
 * WORDING (independent review of PR #276, comment 6871622211): every figure here measures the
 * disagreement of the forecast with PRESCRIBED published schedules (what authors recommend, with
 * their own readiness target), on the recipes this run scores (printed below) out of the 89 collected;
 * it is not an observed error of dough-readiness forecasts.
 *
 * The recipes are craft-knowledge data (docs/science/craft-knowledge.md, evidence-classification.md
 * section 8). Comparing forecasts with published schedules is a plausibility check of a prediction,
 * never a validation or a fit of a coefficient: nothing printed here can justify a new `Ea`.
 *
 * Same data, filtering, dough clock, source groups and error metric as uncertainty_published.mjs
 * (fermentation-model.md, section 15), imported from baseline_published.mjs (one implementation):
 *   e = ln(T_published / T_predicted), T_predicted = T_published x s, where s is the factor that
 *   stretches every dough-clock stage of the published schedule by the same ratio until the engine's
 *   progress reaches the end point. RMS factor = exp(RMS e); bias factor = exp(mean e) (the
 *   median is printed next to it). A bias factor below 1 means the published time is shorter than
 *   the forecast. The 49-point log grid of schedule scales and its interpolation are the same.
 *
 * The law (packages/core/src/domain/fermentation/model.ts, read only):
 *   dF/dt = (d / 1 %)^k / A * r(T),   r(T) = exp( (Ea / R) (1 / 294.25 K - 1 / T) ),   r = 1 at 21.1 degC.
 * With A and k fixed, changing Ea pivots the rate around 21.1 degC: a lower Ea makes every stage
 * above 21.1 degC slower and every stage below it faster, and leaves 21.1 degC unchanged.
 *
 * Two treatments of the scale (they differ in what is held at its shipped value):
 *   (a) A and k as shipped, the end point as shipped: F* = 1 ("about doubled once"), i.e. the time at
 *       which F = 1. Nothing is fitted unless Ea itself is (a one-parameter fit, "free Ea, (a)").
 *   (b) The scale refitted for each Ea. This is the convention of section 15: the end point is one
 *       parameter, the geometric mean of the engine's progress at the published schedules of the
 *       training sources, which is the same as refitting A (F is proportional to 1 / A) except for
 *       the self-heating term of the engine, which keeps the shipped A. Checked directly below
 *       ("direct A refit"). Because the end point is fitted, F* (1 or 2) cannot matter in (b):
 *       progress is F / F* and the fitted end point absorbs F*.
 *   (c) A and Ea both free is "free Ea, (b)": the same fit; it is an upper bound on what the
 *       temperature function can explain with k as shipped.
 *
 * Cross-validation is leave-one-source-group-out (the section 15 grouping, 39 groups): a fitted
 * variant is scored only on a group that was not used to fit it. Resampling uses a fixed seed.
 * Ea is searched on a grid (5 kJ/mol steps from 30 to 120, plus the shipped 98.3; a coarser grid
 * for the assumed-temperature scenarios); the optimum is a grid point, so its resolution is 5 kJ/mol.
 *
 * Speed device, not a model change: the engine computes the 32 corner runs of the band for each
 * estimate; this script removes all but one corner (CORNERS.splice(1)) AFTER selecting the
 * recipes, because only the central progress is read. The central value is unchanged (checked below).
 *
 * Prints to stdout; no file writes. Run: node docs/science/scripts/ea_sensitivity_published.mjs
 * (the engine runs are spread over the machine's cores with worker threads, about 10 minutes on
 * four cores; `--quick` is a coarse smoke test, base scenario only, not for reporting).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { CENTRAL, CORNERS } from '../../../packages/core/dist/domain/index.js';
import {
  dataset,
  assignSourceGroups,
  evaluateRecipe,
  buildFormula,
  doughClockStages,
  resolveHours,
  resolveTemp,
  computeFermentationHours,
  computeFreshYeastEquivalentDose,
  evaluateDoughProgress,
  geometricMean,
} from './baseline_published.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUICK = process.argv.includes('--quick');
const SEED = 20261114;
const B_BOOT = QUICK ? 300 : 2000;
const GRID_N = 49;
const U_MAX = Math.log(64);
const IDX_ONE = (GRID_N - 1) / 2; // the grid point u = 0, schedule scale 1
const SHIPPED = { aH: CENTRAL.aH, k: CENTRAL.k, eaJ: CENTRAL.eaJ };
const SHIPPED_EA = SHIPPED.eaJ / 1000;
const T_REF_C = 294.25 - 273.15; // reference temperature of the law, 21.1 degC
const R_KJ = 8.314462618e-3;
const COLD_C = 10; // brief: a cold stage is a segment at or below 10 degC
const S15_COLD_C = 8; // section 15: cold share counted at or below 8 degC
const BASE = { room: 21, fridge: 4 }; // the existing scripts' defaults for unspecified temperatures

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const rmsLn = (e) => Math.sqrt(mean(e.map((v) => v * v)));
const pct = (sorted, q) => {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f3 = (v) => v.toFixed(3);

// ---------------------------------------------------------------------------------------------
// Scenarios: recipes with the unspecified room and fridge temperatures replaced by a stated value.
// ---------------------------------------------------------------------------------------------

assignSourceGroups(dataset.recipes);
const ORIGINALS = dataset.recipes;

function scenarioRecipes(scn) {
  return ORIGINALS.map((r) => {
    const c = structuredClone(r);
    for (const stage of c.stages ?? []) {
      const kind = stage.temperature?.kind;
      if (kind === 'room_unspecified') stage.temperature = { kind: 'stated', c: scn.room };
      else if (kind === 'fridge_unspecified') stage.temperature = { kind: 'stated', c: scn.fridge };
    }
    return c;
  });
}

// The recipes the section 15 script scores: engine status ok, positive progress, T > 0, dose > 0,
// decided once with the shipped engine and the base scenario (all corners kept).
const SELECTED = [];
for (const recipe of ORIGINALS) {
  const r = evaluateRecipe(recipe);
  if (r.status !== 'ok' || r.progressPct === null || r.progressPct <= 0) continue;
  if (!(computeFermentationHours(recipe) > 0 && computeFreshYeastEquivalentDose(recipe) > 0))
    continue;
  SELECTED.push(recipe.id);
}
const SELECTED_PROGRESS_SHIPPED = new Map(); // central progress at the schedule as published
for (const recipe of ORIGINALS) {
  if (SELECTED.includes(recipe.id)) {
    SELECTED_PROGRESS_SHIPPED.set(recipe.id, evaluateRecipe(recipe).progressPct);
  }
}

// Speed device (see the header): keep one corner. The central value is checked, not assumed.
CORNERS.splice(1);

// Restore the shipped coefficients whatever happens.
function restore() {
  CENTRAL.aH = SHIPPED.aH;
  CENTRAL.k = SHIPPED.k;
  CENTRAL.eaJ = SHIPPED.eaJ;
}
process.on('exit', restore);

function buildScenario(scn) {
  const recipes = scenarioRecipes(scn);
  const items = [];
  for (const recipe of recipes) {
    if (!SELECTED.includes(recipe.id)) continue;
    const clock = doughClockStages(recipe)
      .map((s) => ({ h: resolveHours(s), t: resolveTemp(s.temperature) }))
      .filter((s) => s.h !== null && s.h > 0);
    const total = clock.reduce((a, s) => a + s.h, 0);
    const clockShare8 = clock.filter((s) => s.t <= S15_COLD_C).reduce((a, s) => a + s.h, 0) / total;
    const meanT = clock.reduce((a, s) => a + s.h * s.t, 0) / total;
    // Process shape from stage names (ASSUMED rule, printed with its counts): a stage after shaping
    // (final proof, shaped rest, pan rise, second rise, cold proof...) makes it "bulk + proof".
    const postRe =
      /proof|final|shaped|shaping|shape and|pan (rise|rest|proof)|second (rise|rest)|rest in pan|rise after/i;
    const preRe = /first|pre-shape/i;
    const clockStages = doughClockStages(recipe);
    const postIdx = clockStages.findIndex((st) => postRe.test(st.name) && !preRe.test(st.name));
    const bulkRecipe =
      postIdx > 0
        ? { ...recipe, stages: recipe.stages.slice(0, recipe.stages.indexOf(clockStages[postIdx])) }
        : null;
    const pr = recipe.preferment;
    items.push({
      shape: postIdx >= 0 ? 'bulk+proof' : 'bulk only',
      pref: !!(pr && pr.flour_pct > 0 && pr.type !== 'tangzhong' && pr.type !== 'yudane'),
      bulkRecipe,
      id: recipe.id,
      style: recipe.style,
      group: recipe.sourceGroup,
      confidence: recipe.confidence,
      recipe,
      formula: buildFormula(recipe),
      T: computeFermentationHours(recipe),
      cold: clock.some((s) => s.t <= COLD_C),
      meanT,
      share8: clockShare8,
    });
  }
  return { scn, items, cache: new Map() };
}

const US = Array.from({ length: GRID_N }, (_, j) => -U_MAX + (2 * U_MAX * j) / (GRID_N - 1));

/** Progress (%) of every item at the 49 schedule scales, at one Ea (kJ/mol) and one A (h). */
function computeProgress(S, ea, aH) {
  CENTRAL.eaJ = ea * 1000;
  CENTRAL.aH = aH;
  try {
    return S.items.map((item) =>
      US.map((u) => evaluateDoughProgress(item.formula, item.recipe, Math.exp(u))),
    );
  } finally {
    restore();
  }
}

/** Curves of every item at one Ea and one A, cached (filled in parallel by prewarm()). */
function curves(S, ea, aH = SHIPPED.aH) {
  const key = `${ea}|${aH}`;
  if (!S.cache.has(key)) {
    S.cache.set(
      key,
      computeProgress(S, ea, aH).map((ps) => ({ us: US, ps })),
    );
  }
  return S.cache.get(key);
}

// Worker threads: each builds the same scenarios and returns the progress grids it is asked for.
const scenarioKey = (scn) => `${scn.room}|${scn.fridge}`;
if (!isMainThread) {
  const built = new Map();
  parentPort.on('message', ({ id, scn, ea, aH }) => {
    if (!built.has(scenarioKey(scn))) built.set(scenarioKey(scn), buildScenario(scn));
    parentPort.postMessage({ id, ps: computeProgress(built.get(scenarioKey(scn)), ea, aH) });
  });
}

async function prewarm(jobs) {
  const todo = jobs.filter((j) => !j.S.cache.has(`${j.ea}|${j.aH}`));
  if (todo.length === 0) return;
  const nWorkers = Math.max(1, Math.min(os.cpus().length, 4, todo.length));
  const workers = Array.from(
    { length: nWorkers },
    () => new Worker(fileURLToPath(import.meta.url)),
  );
  let next = 0;
  await Promise.all(
    workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          const feed = () => {
            if (next >= todo.length) return resolve();
            const id = next++;
            w.once('message', ({ ps }) => {
              todo[id].S.cache.set(
                `${todo[id].ea}|${todo[id].aH}`,
                ps.map((p) => ({ us: US, ps: p })),
              );
              feed();
            });
            w.postMessage({ id, scn: todo[id].S.scn, ea: todo[id].ea, aH: todo[id].aH });
          };
          w.once('error', reject);
          feed();
        }),
    ),
  );
  await Promise.all(workers.map((w) => w.terminate()));
}

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

/** e_i = ln(T_published / T_predicted) at a given end point (% of F*), or null. */
function residual(S, ea, i, targetPct, aH) {
  const lnS = lnScaleFor(curves(S, ea, aH)[i], targetPct);
  return lnS === null ? null : -lnS; // ln T_pub - (ln T_pub + lnS)
}

/** Section 15's end point on a training set: geometric mean of the progress at the published schedule. */
function efitTarget(S, ea, train, aH) {
  const ps = train.map((i) => curves(S, ea, aH)[i].ps[IDX_ONE]).filter((p) => p !== null && p > 0);
  return geometricMean(ps);
}

// ---------------------------------------------------------------------------------------------
// Methods: given a training set (item indices), return the Ea and end point they imply.
// ---------------------------------------------------------------------------------------------

function grid(S) {
  return S.eaGrid;
}

function critical(S, ea, train, targetOf) {
  const target = targetOf(ea, train);
  const es = train.map((i) => residual(S, ea, i, target)).filter((e) => e !== null);
  return {
    crit: es.length ? mean(es.map((e) => e * e)) : Infinity,
    fails: train.length - es.length,
  };
}

const methodFixedA = (ea, fStar) => () => ({ ea, target: () => 100 * fStar });
const methodFixedB = (ea) => (S, train) => ({ ea, target: efitTarget(S, ea, train) });
function methodFreeA(fStar) {
  return (S, train) => {
    let best = null;
    for (const ea of grid(S)) {
      const { crit } = critical(S, ea, train, () => 100 * fStar);
      if (best === null || crit < best.crit) best = { ea, crit };
    }
    return { ea: best.ea, target: 100 * fStar };
  };
}
function methodFreeB() {
  return (S, train) => {
    let best = null;
    for (const ea of grid(S)) {
      const { crit } = critical(S, ea, train, (e, t) => efitTarget(S, e, t));
      if (best === null || crit < best.crit) best = { ea, crit };
    }
    return { ea: best.ea, target: efitTarget(S, best.ea, train) };
  };
}
// (a) with a fixed Ea methods return {ea, target: number}; (b) methods return the fitted target too.
const resolveMethod = (m, S, train) => {
  const r = m(S, train);
  return { ea: r.ea, target: typeof r.target === 'function' ? r.target() : r.target };
};

/**
 * Held-out (leave one source group out) or in-sample errors of a method, one per item (null where
 * the engine cannot reach the end point in the grid), with the Ea chosen for each group.
 */
function evaluateMethod(S, method, { loso }) {
  const n = S.items.length;
  const e = new Array(n).fill(null);
  const eas = [];
  if (!loso) {
    const all = [...Array(n).keys()];
    const m = resolveMethod(method, S, all);
    for (const i of all) e[i] = residual(S, m.ea, i, m.target);
    return { e, eas: [m.ea], inSampleEa: m.ea };
  }
  for (const g of [...new Set(S.items.map((it) => it.group))]) {
    const train = [...Array(n).keys()].filter((i) => S.items[i].group !== g);
    const test = [...Array(n).keys()].filter((i) => S.items[i].group === g);
    const m = resolveMethod(method, S, train);
    eas.push(m.ea);
    for (const i of test) e[i] = residual(S, m.ea, i, m.target);
  }
  return { e, eas };
}

function stats(e, idx) {
  const v = idx.map((i) => e[i]).filter((x) => x !== null);
  if (v.length === 0) return null;
  return {
    n: v.length,
    fails: idx.length - v.length,
    rms: rmsLn(v),
    bias: mean(v),
    med: median(v),
  };
}

// ---------------------------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------------------------

function bootDiff(eV, eS, idx, rand, B = B_BOOT) {
  const ok = idx.filter((i) => eV[i] !== null && eS[i] !== null);
  const d = [];
  for (let b = 0; b < B; b++) {
    const a = [];
    const c = [];
    for (let j = 0; j < ok.length; j++) {
      const i = ok[Math.floor(rand() * ok.length)];
      a.push(eV[i]);
      c.push(eS[i]);
    }
    d.push(rmsLn(a) - rmsLn(c));
  }
  d.sort((x, y) => x - y);
  const point = rmsLn(ok.map((i) => eV[i])) - rmsLn(ok.map((i) => eS[i]));
  return {
    point,
    lo: pct(d, 0.025),
    hi: pct(d, 0.975),
    shareBelowZero: d.filter((x) => x < 0).length / B,
    n: ok.length,
  };
}

function bootDiffCluster(S, eV, eS, rand, B = B_BOOT) {
  const groups = [...new Set(S.items.map((it) => it.group))];
  const byGroup = new Map(
    groups.map((g) => [g, S.items.map((it, i) => (it.group === g ? i : -1)).filter((i) => i >= 0)]),
  );
  const d = [];
  for (let b = 0; b < B; b++) {
    const a = [];
    const c = [];
    for (let j = 0; j < groups.length; j++) {
      for (const i of byGroup.get(groups[Math.floor(rand() * groups.length)])) {
        if (eV[i] !== null && eS[i] !== null) {
          a.push(eV[i]);
          c.push(eS[i]);
        }
      }
    }
    d.push(rmsLn(a) - rmsLn(c));
  }
  d.sort((x, y) => x - y);
  return {
    lo: pct(d, 0.025),
    hi: pct(d, 0.975),
    shareBelowZero: d.filter((x) => x < 0).length / B,
  };
}

/** Bootstrap of the in-sample optimum Ea of a free method (resampling recipes, or source groups). */
function bootOptimum(S, method, rand, { cluster = false, B = B_BOOT } = {}) {
  const n = S.items.length;
  const groups = [...new Set(S.items.map((it) => it.group))];
  const byGroup = new Map(
    groups.map((g) => [g, S.items.map((it, i) => (it.group === g ? i : -1)).filter((i) => i >= 0)]),
  );
  const opt = [];
  for (let b = 0; b < B; b++) {
    let train = [];
    if (cluster) {
      for (let j = 0; j < groups.length; j++)
        train = train.concat(byGroup.get(groups[Math.floor(rand() * groups.length)]));
    } else {
      for (let j = 0; j < n; j++) train.push(Math.floor(rand() * n));
    }
    opt.push(resolveMethod(method, S, train).ea);
  }
  opt.sort((x, y) => x - y);
  return { lo: pct(opt, 0.025), hi: pct(opt, 0.975), median: pct(opt, 0.5) };
}

/**
 * Exploratory (added after the first results were seen): mean ln disagreement of the cold-stage
 * recipes minus that of the no-cold recipes, with the end point refitted on the sample (b).
 */
function groupBiasDiff(S, ea, cold, noCold) {
  const target = efitTarget(S, ea, [...cold, ...noCold]);
  const m = (idx) => mean(idx.map((i) => residual(S, ea, i, target)).filter((e) => e !== null));
  return m(cold) - m(noCold);
}

/** Ea (linear interpolation on the grid) at which the difference crosses zero, or null. */
function biasCrossing(S, cold, noCold) {
  const g = [...S.eaGrid].sort((x, y) => x - y);
  const d = g.map((ea) => groupBiasDiff(S, ea, cold, noCold));
  for (let j = 0; j < g.length - 1; j++) {
    if (d[j] * d[j + 1] <= 0 && d[j] !== d[j + 1]) {
      return g[j] + ((0 - d[j]) / (d[j + 1] - d[j])) * (g[j + 1] - g[j]);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------

function eaGridFor(step) {
  const g = [];
  for (let v = 30; v <= 120 + 1e-9; v += step) g.push(Number(v.toFixed(1)));
  if (!g.includes(SHIPPED_EA)) g.push(SHIPPED_EA);
  return g.sort((x, y) => x - y);
}

function groupsOf(S) {
  const all = [...Array(S.items.length).keys()];
  const noCold = all.filter((i) => !S.items[i].cold);
  return {
    all,
    noCold,
    cold: all.filter((i) => S.items[i].cold),
    noColdBelow: noCold.filter((i) => S.items[i].meanT <= T_REF_C),
    noColdAbove: noCold.filter((i) => S.items[i].meanT > T_REF_C),
  };
}

const GROUP_LABELS = [
  ['all', 'overall'],
  ['noCold', 'no cold stage (all > 10 C)'],
  ['noColdBelow', '  no cold, mean T <= 21.1 C'],
  ['noColdAbove', '  no cold, mean T > 21.1 C'],
  ['cold', 'cold stage (any <= 10 C)'],
];

function variantsFor(fStar) {
  return [
    {
      id: 'a98',
      treat: 'a',
      label: `(a) Ea 98.3 shipped, F* ${fStar}`,
      ea: SHIPPED_EA,
      method: methodFixedA(SHIPPED_EA, fStar),
      fitted: false,
    },
    {
      id: 'a75',
      treat: 'a',
      label: `(a) Ea 75, F* ${fStar}`,
      ea: 75,
      method: methodFixedA(75, fStar),
      fitted: false,
    },
    {
      id: 'a55',
      treat: 'a',
      label: `(a) Ea 55, F* ${fStar}`,
      ea: 55,
      method: methodFixedA(55, fStar),
      fitted: false,
    },
    {
      id: 'aFree',
      treat: 'a',
      label: `(a) Ea free, F* ${fStar}`,
      method: methodFreeA(fStar),
      fitted: true,
    },
  ];
}
const VARIANTS_B = [
  {
    id: 'b98',
    treat: 'b',
    label: '(b) Ea 98.3, scale refitted',
    ea: SHIPPED_EA,
    method: methodFixedB(SHIPPED_EA),
    fitted: false,
  },
  {
    id: 'b75',
    treat: 'b',
    label: '(b) Ea 75, scale refitted',
    ea: 75,
    method: methodFixedB(75),
    fitted: false,
  },
  {
    id: 'b55',
    treat: 'b',
    label: '(b) Ea 55, scale refitted',
    ea: 55,
    method: methodFixedB(55),
    fitted: false,
  },
  {
    id: 'bFree',
    treat: 'b',
    label: '(b)=(c) Ea free, scale refitted',
    method: methodFreeB(),
    fitted: true,
  },
];

function runVariants(S, variants) {
  return variants.map((v) => {
    // Headline errors: held out by source group for anything fitted (including the end point of (b)),
    // direct for (a) with a fixed Ea. In-sample errors are kept for the fitted ones.
    const held = evaluateMethod(S, v.method, { loso: v.fitted || v.treat === 'b' });
    const inSample =
      v.fitted || v.treat === 'b' ? evaluateMethod(S, v.method, { loso: false }) : held;
    return { ...v, held, inSample };
  });
}

function printVariantTable(S, runs, baselineId) {
  const G = groupsOf(S);
  const base = runs.find((r) => r.id === baselineId);
  console.log(
    'variant'.padEnd(36) +
      ['overall', 'no cold', 'no cold, <=21.1', 'no cold, >21.1', 'cold']
        .map((l) => l.padEnd(22))
        .join(''),
  );
  console.log('(cells: n | RMS factor | bias factor (mean) | bias factor (median))'.padEnd(36));
  for (const r of runs) {
    let line = r.label.padEnd(36);
    for (const [key] of GROUP_LABELS) {
      const s = stats(r.held.e, G[key]);
      line += (
        s
          ? `${String(s.n).padStart(2)}|${Math.exp(s.rms).toFixed(2)}|${Math.exp(s.bias).toFixed(2)}|${Math.exp(s.med).toFixed(2)}`
          : '-'
      ).padEnd(22);
    }
    console.log(line);
    if (r.fitted || r.treat === 'b') {
      let l2 = '   in-sample (not cross-validated)'.padEnd(36);
      for (const [key] of GROUP_LABELS) {
        const s = stats(r.inSample.e, G[key]);
        l2 += (
          s
            ? `${String(s.n).padStart(2)}|${Math.exp(s.rms).toFixed(2)}|${Math.exp(s.bias).toFixed(2)}|${Math.exp(s.med).toFixed(2)}`
            : '-'
        ).padEnd(22);
      }
      console.log(l2);
    }
    if (r.fitted) {
      const eas = r.held.eas;
      console.log(
        `   Ea chosen on each leave-one-group-out training set: median ${median(eas).toFixed(1)}, range ${Math.min(...eas)} to ${Math.max(...eas)} kJ/mol; in-sample optimum ${r.inSample.inSampleEa} kJ/mol`,
      );
    }
  }
  return base;
}

function printDiffs(S, runs, baselineId, rand, title) {
  const G = groupsOf(S);
  const base = runs.find((r) => r.id === baselineId);
  console.log(
    `\n${title}: difference in RMS ln error to ${base.label.trim()} (negative = smaller error), 95 % bootstrap interval, recipes resampled (${B_BOOT} resamples, seed ${SEED})`,
  );
  for (const r of runs) {
    if (r.id === baselineId) continue;
    const cells = GROUP_LABELS.map(([key, label]) => {
      const d = bootDiff(r.held.e, base.held.e, G[key], rand);
      return `${label.trim().slice(0, 12)}: ${d.point >= 0 ? '+' : ''}${f3(d.point)} [${f3(d.lo)}, ${f3(d.hi)}] n=${d.n}`;
    });
    console.log(`  ${r.label.padEnd(36)} ${cells.join(' | ')}`);
    const c = bootDiffCluster(S, r.held.e, base.held.e, rand);
    console.log(
      `  ${''.padEnd(36)} overall, source groups resampled: [${f3(c.lo)}, ${f3(c.hi)}]; share of resamples below zero ${(100 * c.shareBelowZero).toFixed(0)} %`,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const rand = makeRng(SEED);
  const S0 = buildScenario(BASE);
  S0.eaGrid = eaGridFor(QUICK ? 10 : 5);
  const OTHER = QUICK
    ? []
    : [
        { room: 20, fridge: 4 },
        { room: 22, fridge: 4 },
        { room: 24, fridge: 4 },
        { room: 21, fridge: 2 },
        { room: 21, fridge: 6 },
      ].map((scn) => {
        const S = buildScenario(scn);
        S.eaGrid = [40, 55, 65, 75, 85, SHIPPED_EA, 110, 120];
        return S;
      });
  // Run every engine grid the report needs, in parallel, before any statistics.
  await prewarm(
    [S0, ...OTHER].flatMap((S) =>
      [...new Set([...S.eaGrid, 55, 75, SHIPPED_EA])].map((ea) => ({ S, ea, aH: SHIPPED.aH })),
    ),
  );
  const G0 = groupsOf(S0);

  console.log(
    '# Ea, A and F* sensitivity against the published recipes (research only; no model change)\n',
  );
  console.log(
    'Every RMS factor and bias factor below is a disagreement with prescribed published schedules, not an observed error of dough-readiness forecasts.\n',
  );
  console.log(
    `Recipes: ${ORIGINALS.length} in the file; ${S0.items.length} scored (engine status ok, dose inside the 0.01 to 3 % gate, complete schedule), ${new Set(S0.items.map((i) => i.group)).size} source groups; ${ORIGINALS.length - S0.items.length} not scored (same filter as section 15).`,
  );
  console.log(
    `Shipped coefficients read from the engine: A ${SHIPPED.aH} h, k ${SHIPPED.k}, Ea ${SHIPPED_EA} kJ/mol; reference temperature of the law ${T_REF_C.toFixed(2)} C (294.25 K); the rate is 1 there.`,
  );
  console.log(
    `Ea grid ${S0.eaGrid[0]} to ${S0.eaGrid.at(-1)} kJ/mol, ${QUICK ? 10 : 5} kJ/mol steps (plus 98.3; 40 to 120 in eight points for the assumed-temperature scenarios). Bootstrap resamples ${B_BOOT}, seed ${SEED}.${QUICK ? ' QUICK MODE: not for reporting.' : ''}\n`,
  );

  // --- Temperatures and assumptions ------------------------------------------------------------
  console.log('## Assumptions about temperature and time (as the existing scripts make them)\n');
  const kinds = { stated: 0, room_unspecified: 0, fridge_unspecified: 0, warm_unspecified: 0 };
  let withAssumed = 0;
  let mostlyAssumed = 0;
  let ranged = 0;
  let derivedTemp = 0;
  const coldFridgeAssumed = [];
  let coldStated = 0;
  for (const item of S0.items) {
    const orig = ORIGINALS.find((r) => r.id === item.id);
    const stages = doughClockStages(orig).filter((s) => (resolveHours(s) ?? 0) > 0);
    const total = stages.reduce((a, s) => a + resolveHours(s), 0);
    let assumedHours = 0;
    let anyAssumed = false;
    for (const s of stages) {
      const k = s.temperature?.kind ?? 'room_unspecified';
      kinds[k] = (kinds[k] ?? 0) + 1;
      if (k !== 'stated') {
        anyAssumed = true;
        assumedHours += resolveHours(s);
      }
      if (s.temperature?.derived) derivedTemp++;
      if (s.hours_max !== null && s.hours_max !== s.hours_min) ranged++;
    }
    if (anyAssumed) withAssumed++;
    if (assumedHours / total > 0.5) mostlyAssumed++;
    if (item.cold) {
      const coldStages = stages.filter((s) => resolveTemp(s.temperature) <= COLD_C);
      if (coldStages.every((s) => s.temperature?.kind === 'fridge_unspecified'))
        coldFridgeAssumed.push(item.id);
      else if (coldStages.every((s) => s.temperature?.kind === 'stated')) coldStated++;
    }
  }
  console.log(
    '* Stage temperatures: "room" (room_unspecified) = 21 C, "fridge" (fridge_unspecified) = 4 C, "warm" (warm_unspecified) = 27 C, as baseline_published.mjs; a stated temperature is used as recorded (range midpoints already resolved in the data file).',
  );
  console.log(
    "* The dough temperature is the engine's lagged ambient (tau 1.5 h, start temperature and self-heating as the engine defaults), the same as section 15; the schedule is stretched in proportion, every stage by the same ratio.",
  );
  console.log(
    `* Dough-clock stages of the ${S0.items.length} scored recipes: ${kinds.stated} stated, ${kinds.room_unspecified} room (21 C), ${kinds.fridge_unspecified} fridge (4 C), ${kinds.warm_unspecified} warm (27 C); ${derivedTemp} stated temperatures are marked derived (midpoints or conversions).`,
  );
  console.log(
    `* Recipes with at least one assumed-temperature stage: ${withAssumed} of ${S0.items.length}; with more than half of the dough-clock hours at an assumed temperature: ${mostlyAssumed}.`,
  );
  console.log(`* Recipes with a duration given as a range (midpoint used): ${ranged} stages.`);
  console.log(
    `* Groups (cold = any dough-clock stage at or below ${COLD_C} C): overall ${G0.all.length}; no cold stage ${G0.noCold.length} (mean temperature <= 21.1 C: ${G0.noColdBelow.length}; > 21.1 C: ${G0.noColdAbove.length}); cold stage ${G0.cold.length}.`,
  );
  console.log(
    `* Cold-stage recipes whose every cold stage is an assumed 4 C fridge: ${coldFridgeAssumed.length} of ${G0.cold.length}; whose cold stages are all stated: ${coldStated}; mixed or other: ${G0.cold.length - coldFridgeAssumed.length - coldStated}.`,
  );
  console.log(
    `* Every no-cold recipe with an unspecified room sits at 21 C, 0.1 C below the reference temperature, so the split at 21.1 C is a split by stated or assumed-warm temperatures, not by measured ones.\n`,
  );

  // --- Reproduction of section 15 --------------------------------------------------------------
  console.log(
    '## Reproduction of section 15 (model, global end point, leave one source group out)\n',
  );
  // Verify that trimming the corners left the central progress unchanged.
  {
    let worst = 0;
    restore();
    curves(S0, SHIPPED_EA);
    S0.items.forEach((it, i) => {
      const p = curves(S0, SHIPPED_EA)[i].ps[IDX_ONE];
      worst = Math.max(
        worst,
        Math.abs(Math.log(p) - Math.log(SELECTED_PROGRESS_SHIPPED.get(it.id))),
      );
    });
    console.log(
      `* Central progress at the published schedule, trimmed engine against the full engine: largest |delta ln| = ${worst.toExponential(2)} over ${S0.items.length} recipes.`,
    );
  }
  const rep = evaluateMethod(S0, methodFixedB(SHIPPED_EA), { loso: true });
  const repAll = stats(rep.e, G0.all);
  const s15NoCold = S0.items.map((it, i) => (it.share8 === 0 ? i : -1)).filter((i) => i >= 0);
  const s15ColdMajor = S0.items.map((it, i) => (it.share8 > 0.5 ? i : -1)).filter((i) => i >= 0);
  const repNo = stats(rep.e, s15NoCold);
  const repMaj = stats(rep.e, s15ColdMajor);
  const checks = [
    [
      'overall n / RMS factor / bias factor',
      `${repAll.n} / ${Math.exp(repAll.rms).toFixed(2)} / ${Math.exp(repAll.bias).toFixed(2)}`,
      '50 / 1.89 / 1.00',
    ],
    [
      'no cold stage (none <= 8 C): n / RMS / bias',
      `${repNo.n} / ${Math.exp(repNo.rms).toFixed(2)} / ${Math.exp(repNo.bias).toFixed(2)}`,
      '22 / 2.12 / 1.14',
    ],
    [
      'cold share > 50 % (<= 8 C): n / RMS / bias',
      `${repMaj.n} / ${Math.exp(repMaj.rms).toFixed(2)} / ${Math.exp(repMaj.bias).toFixed(2)}`,
      '27 / 1.69 / 0.92',
    ],
  ];
  let reproduced = true;
  for (const [label, got, want] of checks) {
    const same = got === want;
    if (!same) reproduced = false;
    console.log(
      `* ${label}: this script ${got}; section 15 ${want}; ${same ? 'MATCH' : 'MISMATCH'}`,
    );
  }
  console.log(
    reproduced
      ? '* The published baseline is reproduced.\n'
      : '* MISMATCH with section 15: the figures below must be read with that in mind.\n',
  );

  // --- Main comparison -------------------------------------------------------------------------
  console.log('## Main comparison, base scenario (room 21 C, fridge 4 C)\n');
  console.log(
    'Disagreement e = ln(published / predicted), published = the total dough-clock time of the prescribed schedule. Fixed-Ea (a) rows: no fitting, direct. (b) rows and free rows: held out by source group (the end point of (b) and, for free rows, Ea are chosen without the held-out group).\n',
  );
  const runsA = runVariants(S0, variantsFor(1));
  const runsB = runVariants(S0, VARIANTS_B);
  console.log('### Treatment (a): A and k as shipped, F* = 1 as shipped\n');
  printVariantTable(S0, runsA, 'a98');
  printDiffs(S0, runsA, 'a98', rand, '(a)');
  console.log('\n### Treatment (b) and (c): scale refitted (section 15 end point), k as shipped\n');
  printVariantTable(S0, runsB, 'b98');
  printDiffs(S0, runsB, 'b98', rand, '(b)');

  // Bootstrap of the optimum, in-sample, on recipes and on source groups.
  console.log(
    '\n### Free Ea: optimum and bootstrap interval (in-sample optimum on each resample; grid points)\n',
  );
  for (const [label, method] of [
    ['(a) free Ea, F* = 1', methodFreeA(1)],
    ['(b)=(c) free Ea, scale refitted', methodFreeB()],
  ]) {
    const point = resolveMethod(method, S0, G0.all).ea;
    const r1 = bootOptimum(S0, method, rand);
    const r2 = bootOptimum(S0, method, rand, { cluster: true });
    console.log(
      `  ${label}: optimum ${point} kJ/mol; recipes resampled: median ${r1.median}, 95 % interval [${r1.lo}, ${r1.hi}]; source groups resampled: median ${r2.median}, 95 % interval [${r2.lo}, ${r2.hi}]`,
    );
  }
  // Profile of the criterion, to see how flat it is.
  console.log('\n  Profile of the in-sample RMS factor against Ea (all recipes):');
  for (const [label, treat] of [
    ['(a) F* = 1', 'a'],
    ['(b) scale refitted', 'b'],
  ]) {
    const cells = [];
    for (const ea of S0.eaGrid.filter((v) => v % 10 === 0 || v === SHIPPED_EA)) {
      const target = treat === 'a' ? () => 100 : (e, t) => efitTarget(S0, e, t);
      const { crit, fails } = critical(S0, ea, G0.all, target);
      cells.push(
        `${ea}:${Math.exp(Math.sqrt(crit)).toFixed(2)}${fails ? `(${fails} unreached)` : ''}`,
      );
    }
    console.log(`  ${label.padEnd(20)} ${cells.join('  ')}`);
  }

  // --- Exploratory: bias parity of cold and no-cold recipes -----------------------------------
  console.log(
    '\n### Exploratory, added after seeing the first results: mean ln disagreement of cold-stage recipes minus no-cold recipes\n',
  );
  console.log(
    'Not in the brief. A change of the whole scale cancels in this difference, so it shows what Ea alone moves: the relative speed of cold and room stages. Treatment (b) end point refitted on all recipes, in-sample, base scenario. Negative: the forecast is too slow for cold recipes relative to the no-cold ones.',
  );
  {
    const cells = [];
    for (const ea of S0.eaGrid.filter((v) => v % 10 === 0 || v === SHIPPED_EA)) {
      const d = groupBiasDiff(S0, ea, G0.cold, G0.noCold);
      cells.push(`${ea}: ${d >= 0 ? '+' : ''}${f3(d)}`);
    }
    console.log(`  ${cells.join('   ')}`);
    const crossing = biasCrossing(S0, G0.cold, G0.noCold);
    const xs = [];
    let none = 0;
    const pick = (idx) => idx.map(() => idx[Math.floor(rand() * idx.length)]);
    for (let b = 0; b < B_BOOT; b++) {
      const x = biasCrossing(S0, pick(G0.cold), pick(G0.noCold));
      if (x === null) none++;
      else xs.push(x);
    }
    xs.sort((a, b) => a - b);
    console.log(
      `  Crossing of zero (the Ea at which cold and no-cold recipes have the same mean disagreement): ${crossing === null ? 'none inside the grid' : `${crossing.toFixed(1)} kJ/mol`}; bootstrap (recipes resampled within group, ${B_BOOT}): ${xs.length ? `median ${pct(xs, 0.5).toFixed(1)}, 2.5 to 97.5 % [${pct(xs, 0.025).toFixed(1)}, ${pct(xs, 0.975).toFixed(1)}]` : 'no crossing'}; resamples with no crossing inside 30 to 120: ${none} of ${B_BOOT}`,
    );
  }

  // --- The readiness target F* as a third explanation ------------------------------------------
  console.log(
    '\n## F*: the readiness target as a third explanation (A, k, Ea as shipped unless stated)\n',
  );
  console.log(
    "In this law F (progress) is proportional to 1 / A, and progress in % is 100 F / F*. A change of F* and a change of A are therefore the same rescaling of time: the forecast depends on A x F* only (up to the engine's self-heating term, which the direct-A check above shows to be immaterial here: identical to three decimals). Nothing in this data set separates them: the recipes record durations and temperatures, never progress or volume at a step. The only thing that could is a dependence of the implied end point on process shape (a readiness defined after shaping and proof should sit later than one defined at the end of bulk); that is examined below, with its limits.",
  );
  const isShape = (name) => (i) => S0.items[i].shape === name;
  const SUBSETS = [
    ['all recipes', G0.all],
    ['no cold stage', G0.noCold],
    ['cold stage', G0.cold],
    ['bulk only', G0.all.filter(isShape('bulk only'))],
    ['bulk + final proof', G0.all.filter(isShape('bulk+proof'))],
    ['with a preferment', G0.all.filter((i) => S0.items[i].pref)],
    ['no preferment', G0.all.filter((i) => !S0.items[i].pref)],
    ...[...new Set(S0.items.map((it) => it.style))]
      .sort()
      .filter((st) => S0.items.filter((it) => it.style === st).length >= 4)
      .map((st) => [`style ${st}`, G0.all.filter((i) => S0.items[i].style === st)]),
  ];
  console.log(
    `\nProcess shape from stage names (ASSUMED rule: a dough-clock stage named proof, final, shaped, shaping, pan rise, second rise... other than a first proof or pre-shape): bulk only ${SUBSETS[3][1].length}, bulk + final proof ${SUBSETS[4][1].length}; with a preferment ${SUBSETS[5][1].length}. Styles with fewer than 4 scored recipes are not split.`,
  );
  const FGRID = Array.from({ length: 91 }, (_, j) => Number((0.5 + 0.05 * j).toFixed(2)));
  const fCrit = (idx, f) => {
    const es = idx.map((i) => residual(S0, SHIPPED_EA, i, 100 * f)).filter((e) => e !== null);
    return es.length ? mean(es.map((e) => e * e)) : Infinity;
  };
  const fitF = (idx) => {
    let best = null;
    for (const f of FGRID) {
      const c = fCrit(idx, f);
      if (best === null || c < best.c) best = { f, c };
    }
    return best.f;
  };
  // (a) F* = 1 and F* = 2
  console.log(
    '\n### (a) F* = 1 (shipped default) and F* = 2 (flourprint.experimental-ready), no fitting\n',
  );
  console.log('subset'.padEnd(26) + 'n'.padStart(3) + '   F*=1: RMS / bias   F*=2: RMS / bias');
  for (const [label, idx] of SUBSETS) {
    const a = stats(
      idx.map((i) => residual(S0, SHIPPED_EA, i, 100)),
      idx.map((_, j) => j),
    );
    const b = stats(
      idx.map((i) => residual(S0, SHIPPED_EA, i, 200)),
      idx.map((_, j) => j),
    );
    console.log(
      `${label.padEnd(26)}${String(idx.length).padStart(3)}   ${Math.exp(a.rms).toFixed(2)} / ${Math.exp(a.bias).toFixed(2)}           ${Math.exp(b.rms).toFixed(2)} / ${Math.exp(b.bias).toFixed(2)}`,
    );
  }
  // (b) best fit F*
  console.log(
    '\n### (b) Best-fit F* alone (A, k, Ea as shipped): in-sample optimum, bootstrap interval, subsets\n',
  );
  console.log(
    'F* grid 0.5 to 5 in steps of 0.05; criterion mean square of e; bootstrap resamples recipes within the subset, ' +
      Math.min(B_BOOT, 1000) +
      ' resamples.',
  );
  const BF = Math.min(B_BOOT, 1000);
  for (const [label, idx] of SUBSETS) {
    const fHat = fitF(idx);
    const bs = [];
    for (let b = 0; b < BF; b++) bs.push(fitF(idx.map(() => idx[Math.floor(rand() * idx.length)])));
    bs.sort((x, y) => x - y);
    const e = idx.map((i) => residual(S0, SHIPPED_EA, i, 100 * fHat));
    const st = stats(
      e,
      idx.map((_, j) => j),
    );
    console.log(
      `  ${label.padEnd(26)} n ${String(idx.length).padStart(2)}  F* ${fHat.toFixed(2)}  95 % interval [${pct(bs, 0.025).toFixed(2)}, ${pct(bs, 0.975).toFixed(2)}]  in-sample RMS factor ${Math.exp(st.rms).toFixed(2)}`,
    );
  }
  {
    const groups = [...new Set(S0.items.map((i) => i.group))];
    const byG = new Map(groups.map((g) => [g, G0.all.filter((i) => S0.items[i].group === g)]));
    const bs = [];
    for (let b = 0; b < BF; b++) {
      let tr = [];
      for (let j = 0; j < groups.length; j++)
        tr = tr.concat(byG.get(groups[Math.floor(rand() * groups.length)]));
      bs.push(fitF(tr));
    }
    bs.sort((x, y) => x - y);
    console.log(
      `  all recipes, source groups resampled: F* 95 % interval [${pct(bs, 0.025).toFixed(2)}, ${pct(bs, 0.975).toFixed(2)}]`,
    );
  }
  const fMethod = () => (S, train) => ({ ea: SHIPPED_EA, target: 100 * fitF(train) });
  const fLoso = evaluateMethod(S0, fMethod(), { loso: true });
  const fIn = evaluateMethod(S0, fMethod(), { loso: false });
  const base = evaluateMethod(S0, methodFixedA(SHIPPED_EA, 1), { loso: false });
  console.log(
    '\n  Cross-validated (leave one source group out) F* alone: RMS factor / bias factor by subset',
  );
  for (const [label, idx] of SUBSETS) {
    const c = stats(fLoso.e, idx);
    const r = stats(base.e, idx);
    console.log(
      `    ${label.padEnd(26)} F*=1 ${Math.exp(r.rms).toFixed(2)} / ${Math.exp(r.bias).toFixed(2)}   F* fitted, held out ${Math.exp(c.rms).toFixed(2)} / ${Math.exp(c.bias).toFixed(2)}`,
    );
  }
  const dF = bootDiff(fLoso.e, base.e, G0.all, rand);
  console.log(
    `  Difference in RMS ln, F* fitted (held out) minus F* = 1, overall: ${f3(dF.point)} [${f3(dF.lo)}, ${f3(dF.hi)}]`,
  );
  // (c) decomposition
  console.log(
    '\n### (c) Decomposition: share of the mean-square disagreement removed by each single change (all recipes)\n',
  );
  const baseS = stats(base.e, G0.all);
  const msBase = baseS.rms ** 2;
  const biasSq = baseS.bias ** 2;
  console.log(
    `  Shipped (F* = 1, A, k, Ea as shipped): RMS ln ${f3(baseS.rms)} (factor x${Math.exp(baseS.rms).toFixed(2)}), mean-square ${f3(msBase)} = bias squared ${f3(biasSq)} (${((100 * biasSq) / msBase).toFixed(0)} %, a uniform shift of ln time, factor x${Math.exp(baseS.bias).toFixed(2)}) + scatter ${f3(msBase - biasSq)} (${(100 * (1 - biasSq / msBase)).toFixed(0)} %)`,
  );
  const dec = (label, e, note = '') => {
    const st = stats(e, G0.all);
    return `  ${label.padEnd(44)} RMS factor x${Math.exp(st.rms).toFixed(2)}  share removed ${(100 * (1 - st.rms ** 2 / msBase)).toFixed(0)} %${note}`;
  };
  console.log(dec('F* alone (fitted, in-sample)', fIn.e));
  console.log(dec('F* alone (fitted, held out by source group)', fLoso.e));
  {
    const fHat = fitF(G0.all);
    const aPrime = SHIPPED.aH * fHat;
    const eA = G0.all.map((i) => residual(S0, SHIPPED_EA, i, 100, aPrime));
    const same = G0.all.every((i, j) => eA[j] !== null && fIn.e[i] !== null);
    const dMax = same ? Math.max(...G0.all.map((i, j) => Math.abs(eA[j] - fIn.e[i]))) : NaN;
    console.log(
      dec(
        'A alone (A x F*fit = ' + aPrime.toFixed(2) + ' h, direct engine run)',
        eA,
        `  largest |difference to F* alone| ${dMax.toFixed(4)}`,
      ),
    );
  }
  const eaA = evaluateMethod(S0, methodFreeA(1), { loso: false });
  const eaAL = evaluateMethod(S0, methodFreeA(1), { loso: true });
  console.log(dec(`Ea alone (fitted ${eaA.inSampleEa}, in-sample; at the grid edge)`, eaA.e));
  console.log(dec('Ea alone (fitted, held out)', eaAL.e));
  console.log(
    dec(
      'Ea 75 alone, F* = 1 (fixed)',
      base.e.map((_, i) => residual(S0, 75, i, 100)),
    ),
  );
  const fe = evaluateMethod(S0, methodFreeB(), { loso: false });
  const feL = evaluateMethod(S0, methodFreeB(), { loso: true });
  console.log(dec(`F* and Ea together = A and Ea (Ea ${fe.inSampleEa}, in-sample)`, fe.e));
  console.log(dec('F* and Ea together (held out)', feL.e));
  console.log('  F* and A together: one parameter (the product A x F*), the same as F* alone.');
  // (d) distribution of progress
  console.log(
    '\n### (d) Progress reached at the end of the published schedule (shipped law, F* = 1; 100 % = F of 1), the empirical "ready" of published practice in the model\'s unit\n',
  );
  const pOf = (i) => curves(S0, SHIPPED_EA)[i].ps[IDX_ONE];
  const dist = (label, idx) => {
    const v = idx
      .map(pOf)
      .filter((x) => x !== null)
      .sort((a, b) => a - b);
    if (!v.length) return;
    const lnsd = Math.sqrt(mean(v.map((x) => (Math.log(x) - mean(v.map(Math.log))) ** 2)));
    console.log(
      `  ${label.padEnd(26)} n ${String(v.length).padStart(2)}  median ${pct(v, 0.5).toFixed(0)} %  quartiles ${pct(v, 0.25).toFixed(0)} to ${pct(v, 0.75).toFixed(0)} %  range ${v[0].toFixed(0)} to ${v.at(-1).toFixed(0)} %  geometric mean ${Math.exp(mean(v.map(Math.log))).toFixed(0)} %  SD of ln ${lnsd.toFixed(2)}`,
    );
  };
  for (const [label, idx] of SUBSETS) dist(label, idx);
  {
    const bp = SUBSETS[4][1].filter((i) => S0.items[i].bulkRecipe);
    const atBulk = [];
    const atEnd = [];
    for (const i of bp) {
      const pb = evaluateDoughProgress(S0.items[i].formula, S0.items[i].bulkRecipe, 1);
      if (pb !== null && pb > 0) {
        atBulk.push(pb);
        atEnd.push(pOf(i));
      }
    }
    const sd = (a) => Math.sqrt(mean(a.map((x) => (Math.log(x) - mean(a.map(Math.log))) ** 2)));
    const q = (a, f) =>
      pct(
        [...a].sort((x, y) => x - y),
        f,
      );
    console.log(
      `\n  Bulk + final proof recipes with a bulk stage before the first post-shaping stage (n ${atBulk.length}): progress at the end of bulk median ${q(atBulk, 0.5).toFixed(0)} % (quartiles ${q(atBulk, 0.25).toFixed(0)} to ${q(atBulk, 0.75).toFixed(0)} %, SD of ln ${sd(atBulk).toFixed(2)}); at the end of the schedule median ${q(atEnd, 0.5).toFixed(0)} % (quartiles ${q(atEnd, 0.25).toFixed(0)} to ${q(atEnd, 0.75).toFixed(0)} %, SD of ln ${sd(atEnd).toFixed(2)}).`,
    );
    console.log(
      "  The model carries progress through shaping unchanged (no degassing reset), as the shipped engine does; the end-of-bulk figure is the engine's progress on the truncated schedule.",
    );
  }
  console.log(
    `  Not scored: ${ORIGINALS.length - S0.items.length} of ${ORIGINALS.length} collected recipes (dose outside the 0.01 to 3 % gate or incomplete schedule), so the distribution describes the 50 in-domain recipes only.`,
  );

  // --- Direct A refit check --------------------------------------------------------------------
  console.log(
    '\n### Check: end-point refit against a direct refit of A (all recipes, in-sample)\n',
  );
  for (const ea of [SHIPPED_EA, 75, 55]) {
    const target = efitTarget(S0, ea, G0.all);
    const aPrime = SHIPPED.aH * (target / 100);
    const viaEnd = G0.all.map((i) => residual(S0, ea, i, target));
    const direct = G0.all.map((i) => residual(S0, ea, i, 100, aPrime));
    const ok = G0.all.filter((_, j) => viaEnd[j] !== null && direct[j] !== null);
    const dMax = Math.max(...ok.map((i) => Math.abs(viaEnd[i] - direct[i])));
    console.log(
      `  Ea ${ea}: end point ${target.toFixed(1)} % of F*, equivalent A ${aPrime.toFixed(3)} h; RMS factor via end point ${Math.exp(rmsLn(ok.map((i) => viaEnd[i]))).toFixed(3)}, via direct A ${Math.exp(rmsLn(ok.map((i) => direct[i]))).toFixed(3)}, largest |difference in e| ${dMax.toFixed(3)}`,
    );
  }

  // --- Robustness (iii) assumed temperatures ---------------------------------------------------
  console.log('\n## Robustness (iii): sensitivity to the assumed unspecified temperatures\n');
  console.log(
    'Fixed variants (a) and (b) (b held out by source group), free Ea held out by source group, in-sample optimum; Ea grid 40, 55, 65, 75, 85, 98.3, 110, 120 for the scenarios other than the base.',
  );
  for (const S of [S0, ...OTHER]) {
    const scn = S.scn;
    const G = groupsOf(S);
    const vA = runVariants(S, variantsFor(1));
    const vB = runVariants(S, VARIANTS_B);
    const line = (runs, id) => {
      const r = runs.find((x) => x.id === id);
      return `${Math.exp(stats(r.held.e, G.all).rms).toFixed(2)}`;
    };
    const noColdLine = (runs, id) =>
      Math.exp(stats(runs.find((x) => x.id === id).held.e, G.noCold).rms).toFixed(2);
    const coldLine = (runs, id) =>
      Math.exp(stats(runs.find((x) => x.id === id).held.e, G.cold).rms).toFixed(2);
    const rr = (runs, id) => runs.find((x) => x.id === id);
    console.log(
      `  room ${scn.room} C, fridge ${scn.fridge} C: n ${G.all.length} (no cold ${G.noCold.length}, cold ${G.cold.length})`,
    );
    console.log(
      `    RMS factor overall / no cold / cold: (a) 98.3 ${line(vA, 'a98')}/${noColdLine(vA, 'a98')}/${coldLine(vA, 'a98')}; (a) 75 ${line(vA, 'a75')}/${noColdLine(vA, 'a75')}/${coldLine(vA, 'a75')}; (a) 55 ${line(vA, 'a55')}/${noColdLine(vA, 'a55')}/${coldLine(vA, 'a55')}; (a) free ${line(vA, 'aFree')}/${noColdLine(vA, 'aFree')}/${coldLine(vA, 'aFree')} (in-sample optimum ${rr(vA, 'aFree').inSample.inSampleEa})`,
    );
    console.log(
      `                                         (b) 98.3 ${line(vB, 'b98')}/${noColdLine(vB, 'b98')}/${coldLine(vB, 'b98')}; (b) 75 ${line(vB, 'b75')}/${noColdLine(vB, 'b75')}/${coldLine(vB, 'b75')}; (b) 55 ${line(vB, 'b55')}/${noColdLine(vB, 'b55')}/${coldLine(vB, 'b55')}; (b) free ${line(vB, 'bFree')}/${noColdLine(vB, 'bFree')}/${coldLine(vB, 'bFree')} (in-sample optimum ${rr(vB, 'bFree').inSample.inSampleEa})`,
    );
    const dA = bootDiff(rr(vA, 'a75').held.e, rr(vA, 'a98').held.e, G.all, rand);
    const dB = bootDiff(rr(vB, 'b75').held.e, rr(vB, 'b98').held.e, G.all, rand);
    console.log(
      `    75 minus 98.3, overall RMS ln: (a) ${dA.point >= 0 ? '+' : ''}${f3(dA.point)} [${f3(dA.lo)}, ${f3(dA.hi)}]; (b) ${dB.point >= 0 ? '+' : ''}${f3(dB.point)} [${f3(dB.lo)}, ${f3(dB.hi)}]`,
    );
  }

  // --- Robustness (iv) readiness target --------------------------------------------------------
  console.log(
    '\n## Robustness (iv): readiness target F* = 2 (experimental profile) in treatment (a)\n',
  );
  console.log(
    'In (b) the end point is fitted, so F* cannot change the result (progress = F / F*, and the fitted end point absorbs F*). Only (a) depends on it.',
  );
  const runsA2 = runVariants(S0, variantsFor(2));
  printVariantTable(S0, runsA2, 'a98');
  printDiffs(S0, runsA2, 'a98', rand, '(a), F* = 2');

  // --- Robustness (v) one style or one source dominating ---------------------------------------
  console.log(
    '\n## Robustness (v): leave one style out, leave one source group out (in-sample, base scenario)\n',
  );
  console.log(
    'For each left-out set: n remaining, in-sample optimum Ea for (a) F* = 1 and for (b), and RMS ln difference 75 minus 98.3 in (a) and (b) (negative = lower Ea errs less).',
  );
  {
    const n = S0.items.length;
    const all = [...Array(n).keys()];
    const diffOf = (idx, treat) => {
      const target = (ea) => (treat === 'a' ? 100 : efitTarget(S0, ea, idx));
      const e = (ea) => idx.map((i) => residual(S0, ea, i, target(ea))).filter((x) => x !== null);
      return rmsLn(e(75)) - rmsLn(e(SHIPPED_EA));
    };
    const rows = [];
    const sets = [
      ...[...new Set(S0.items.map((i) => i.style))]
        .sort()
        .map((s) => ({ kind: 'style', name: s, idx: all.filter((i) => S0.items[i].style !== s) })),
      ...[...new Set(S0.items.map((i) => i.group))].map((g) => ({
        kind: 'group',
        name: g,
        idx: all.filter((i) => S0.items[i].group !== g),
      })),
    ];
    for (const set of sets) {
      const left = n - set.idx.length;
      rows.push({
        ...set,
        left,
        eaA: resolveMethod(methodFreeA(1), S0, set.idx).ea,
        eaB: resolveMethod(methodFreeB(), S0, set.idx).ea,
        dA: diffOf(set.idx, 'a'),
        dB: diffOf(set.idx, 'b'),
      });
    }
    const styleRows = rows.filter((r) => r.kind === 'style');
    const groupRows = rows.filter((r) => r.kind === 'group');
    for (const r of styleRows) {
      console.log(
        `  without style ${r.name.padEnd(16)} (-${String(r.left).padStart(2)} recipes): Ea (a) ${String(r.eaA).padStart(5)}, (b) ${String(r.eaB).padStart(5)}; 75 minus 98.3: (a) ${r.dA >= 0 ? '+' : ''}${f3(r.dA)}, (b) ${r.dB >= 0 ? '+' : ''}${f3(r.dB)}`,
      );
    }
    const rng = (rs, k) =>
      `${Math.min(...rs.map((r) => r[k])).toFixed(3)} to ${Math.max(...rs.map((r) => r[k])).toFixed(3)}`;
    console.log(
      `  Leave-one-style-out ranges: Ea (a) ${Math.min(...styleRows.map((r) => r.eaA))} to ${Math.max(...styleRows.map((r) => r.eaA))}; Ea (b) ${Math.min(...styleRows.map((r) => r.eaB))} to ${Math.max(...styleRows.map((r) => r.eaB))}; 75 minus 98.3 (a) ${rng(styleRows, 'dA')}, (b) ${rng(styleRows, 'dB')}`,
    );
    console.log(
      `  Leave-one-source-group-out (${groupRows.length} groups) ranges: Ea (a) ${Math.min(...groupRows.map((r) => r.eaA))} to ${Math.max(...groupRows.map((r) => r.eaA))}; Ea (b) ${Math.min(...groupRows.map((r) => r.eaB))} to ${Math.max(...groupRows.map((r) => r.eaB))}; 75 minus 98.3 (a) ${rng(groupRows, 'dA')}, (b) ${rng(groupRows, 'dB')}`,
    );
    const widest = [...groupRows].sort((x, y) => y.left - x.left)[0];
    console.log(
      `  Largest source group: ${widest.name}, ${widest.left} recipes; without it Ea (a) ${widest.eaA}, (b) ${widest.eaB}; 75 minus 98.3 (a) ${f3(widest.dA)}, (b) ${f3(widest.dB)}`,
    );
    const flipsA = groupRows.filter((r) => r.dA > 0).length;
    const flipsB = groupRows.filter((r) => r.dB > 0).length;
    console.log(
      `  Leave-one-group-out sets in which 75 errs MORE than 98.3: (a) ${flipsA} of ${groupRows.length}, (b) ${flipsB} of ${groupRows.length}`,
    );
  }

  // --- Per-regime sample size of what can be discriminated ------------------------------------
  console.log(
    '\n## Direction of the change in the forecast, by regime (shipped vs 75 and 55; (a), F* = 1)\n',
  );
  {
    const rateRatio = (ea, tC) => Math.exp((ea / R_KJ) * (1 / 294.25 - 1 / (tC + 273.15)));
    for (const tC of [4, 10, 21, 27, 35]) {
      console.log(
        `  rate at ${tC} C relative to 21.1 C: Ea 98.3 ${rateRatio(SHIPPED_EA, tC).toFixed(3)}, Ea 75 ${rateRatio(75, tC).toFixed(3)}, Ea 55 ${rateRatio(55, tC).toFixed(3)}  (rate of Ea 75 over Ea 98.3: ${(rateRatio(75, tC) / rateRatio(SHIPPED_EA, tC)).toFixed(2)})`,
      );
    }
  }

  // --- Side checks -----------------------------------------------------------------------------
  console.log('\n## Side checks (context only, no fitting)\n');
  {
    const A = SHIPPED.aH;
    const K = SHIPPED.k;
    const flourPct = 60.35;
    const yeastPctDough = 0.04;
    const dosePctFlour = (yeastPctDough / flourPct) * 100;
    const r = (ea, tC) => Math.exp((ea / R_KJ) * (1 / 294.25 - 1 / (tC + 273.15)));
    const hoursToF = (ea) => (A * Math.pow(dosePctFlour, -K)) / r(ea, 22);
    console.log(
      `Covino 2023 (shipped_law_vs_covino.mjs inputs): dose ${dosePctFlour.toFixed(4)} % fresh of flour, isothermal 22 C, A ${A} h, k ${K}; time to F = 1 (no dough lag, as that script). Statements of the paper: doubled after 16 h, tripled in 24 h, about 30 h.`,
    );
    const freeA = resolveMethod(methodFreeA(1), S0, G0.all).ea;
    const freeB = resolveMethod(methodFreeB(), S0, G0.all).ea;
    for (const [label, ea] of [
      ['Ea 98.3 shipped', SHIPPED_EA],
      ['Ea 75', 75],
      ['Ea 55', 55],
      [`Ea ${freeA} (free, (a))`, freeA],
      [`Ea ${freeB} (free, (b)=(c))`, freeB],
    ]) {
      const t = hoursToF(ea);
      console.log(
        `  ${label.padEnd(26)} F = 1 at ${t.toFixed(2)} h; over 16 h ${(t / 16).toFixed(2)}, over 24 h ${(t / 24).toFixed(2)}, over 30 h ${(t / 30).toFixed(2)} (ratios, not errors)`,
      );
    }
    console.log(
      '  At 22 C the rate is within 0.9 K of the reference temperature, so Ea barely moves this comparison: it checks the dose, not the temperature function.',
    );

    const readCsv = (file) => {
      const [head, ...rows] = readFileSync(path.resolve(__dirname, '../data', file), 'utf8')
        .trim()
        .split('\n');
      const cols = head.split(',');
      return rows.map((row) => Object.fromEntries(row.split(',').map((v, j) => [cols[j], v])));
    };
    const slope = (pts) => {
      // ln(1 / t) = const - (Ea / R) (1 / T); ordinary least squares in 1 / T.
      const xs = pts.map(([tc]) => 1 / (tc + 273.15));
      const ys = pts.map(([, tmin]) => -Math.log(tmin));
      const mx = mean(xs);
      const my = mean(ys);
      const b =
        xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
        xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      return -b * R_KJ;
    };
    const pair = (p, q) =>
      (Math.log(p[1] / q[1]) * R_KJ) / (1 / (p[0] + 273.15) - 1 / (q[0] + 273.15)); // p colder than q
    const iz = readCsv('izzreen-2016-table1.csv')
      .filter((r) => Number(r.fresh_yeast_pct_flour) === 2)
      .map((r) => [Number(r.incubator_c), Number(r.endpoint_min)])
      .sort((x, y) => x[0] - y[0]);
    const bi = readCsv('birch-2013-table.csv')
      .filter((r) => r.table === 'paper2_table1' && Number(r.yeast_g_per_kg_flour) === 20)
      .map((r) => [Number(r.incubator_c), Number(r.endpoint_min)])
      .sort((x, y) => x[0] - y[0]);
    console.log(
      '\nApparent activation energy of the in-gate (2 % fresh yeast) cells, ordinary least squares of ln(1 / time) on -1 / (R T); chamber temperatures, no dough lag, endpoint times of the papers, three cells each (DERIVED, as recorded in sources.md, Role versus scope):',
    );
    console.log(
      `  Izzreen 2016 (8, 16, 32 C): all three ${slope(iz).toFixed(1)} kJ/mol; 8 to 16 C ${pair(iz[0], iz[1]).toFixed(1)}; 16 to 32 C ${pair(iz[1], iz[2]).toFixed(1)}`,
    );
    console.log(
      `  Birch Paper II (5, 15, 35 C): all three ${slope(bi).toFixed(1)} kJ/mol; 5 to 15 C ${pair(bi[0], bi[1]).toFixed(1)}; 15 to 35 C ${pair(bi[1], bi[2]).toFixed(1)}`,
    );
    console.log(
      '  The pairs are not constant: the colder pair is steeper than the warmer pair in both sources. Chamber temperature stands for the dough temperature only at equilibrium (warm start, lag and self-heating are not separated), and three cells per source cannot separate them from kinetics.',
    );
  }

  console.log(`\n(elapsed ${((Date.now() - t0) / 1000) | 0} s)`);
  restore();
}

if (isMainThread) await main();

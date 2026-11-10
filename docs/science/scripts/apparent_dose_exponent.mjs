#!/usr/bin/env node

/**
 * apparent_dose_exponent.mjs
 *
 * Thermal confounding of the apparent dose exponent (fermentation-model.md, section 5, "The
 * apparent dose exponent and the dough lag").
 *
 * Question: if the dose exponent `k` of the law is the same at every temperature, how large is the
 * exponent that an experimenter reads off endpoint times measured in a chamber at a fixed
 * temperature, when the dough does not start at the chamber temperature and follows it with a lag?
 *
 * Law (separable, constant k), the form of the contract, with the constants of the lag fit of
 * section 2 (DERIVED / FITTED on Izzreen Table I; not the shipped constants):
 *
 *   dF/dt = (d / 1 %)^k / A * g(T_d(t)),   g(T) = exp( (Ea / R) (1 / 294.25 K - 1 / T) )
 *   dT_d/dt = (T_chamber - T_d) / tau,     T_d(0) = T0
 *   endpoint t*: F(t*) = 1
 *
 * Exact identity (local elasticity). Let G(t) = integral of g(T_d(s)) ds from 0 to t. The
 * endpoint satisfies G(t*) = A d^(-k). T_d does not depend on d, so differentiating in ln d gives
 * g(T_d(t*)) d(t*) / d(ln d) = -k G(t*), that is
 *
 *   k_app = - d(ln t*) / d(ln d) = k * mean(g over [0, t*]) / g(T_d(t*)).
 *
 * The exponent read off a chamber is therefore `k` times the ratio of the dough's mean rate over
 * the run to its rate at the end. A dough that warms toward the chamber (ratio < 1) reads a low
 * exponent, a dough that cools (ratio > 1) a high one, with no change of `k`.
 *
 * Estimators of the exponent of the measured matrices (DERIVED, defined here):
 *   pairwise 2->4 %  : ln(t_2 / t_4) / ln 2
 *   pairwise 4->6 %  : ln(t_4 / t_6) / ln 1.5
 *   OLS 2/4/6 %      : minus the slope of ln t on ln d over the three doses
 *
 * ASSUMED inputs (no source reports them): the dough temperature at the start of the chamber run
 * T0 and the lag tau. Izzreen reports chamber temperatures only; Birch reports the water
 * temperature (30 degC) and a 19 min machine mix but no dough temperature.
 *
 * Rules: imports nothing from the application; the constants are typed here from the lag fit of
 * the science document. Reads the measured matrices from docs/science/data/. Prints to stdout; no
 * file writes.
 *
 * Run: node docs/science/scripts/apparent_dose_exponent.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = (name) => readFileSync(path.join(here, '..', 'data', name), 'utf8');

const R = 8.314462618e-3; // kJ / (mol K)
const T_REF_K = 294.25; // 21.1 degC
const LAG_FIT = { A: 8.78, k: 0.728, Ea: 79.8, tau: 1.5, T0: 25 }; // section 2, lag fit

const g = (tC, Ea) => Math.exp((Ea / R) * (1 / T_REF_K - 1 / (tC + 273.15)));

/**
 * Simulate one dough. Returns the endpoint t* (h) at which F reaches 1, the mean of g over
 * [0, t*] and g at t*. Trapezoid rule with a fixed step; the lag solution is exact.
 */
function simulate({ A, k, Ea, tau, T0 }, doseNominalPct, chamberC) {
  const dt = 1 / 3600; // one second, in hours
  const rate = Math.pow(doseNominalPct, k) / A;
  const td = (t) => chamberC + (T0 - chamberC) * Math.exp(-t / tau);
  let t = 0;
  let F = 0;
  let G = 0;
  let gPrev = g(td(0), Ea);
  for (let i = 0; i < 50 * 3600; i += 1) {
    const t1 = t + dt;
    const g1 = g(td(t1), Ea);
    const dG = 0.5 * (gPrev + g1) * dt;
    const dF = rate * dG;
    if (F + dF >= 1) {
      const frac = (1 - F) / dF;
      const tStar = t + frac * dt;
      const Gstar = G + frac * dG;
      return { tStar, meanG: Gstar / tStar, gEnd: g(td(tStar), Ea) };
    }
    F += dF;
    G += dG;
    t = t1;
    gPrev = g1;
  }
  throw new Error('endpoint not reached in 50 h');
}

const olsExponent = (doses, times) => {
  const x = doses.map(Math.log);
  const y = times.map(Math.log);
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  return -sxy / sxx;
};
const pairwise = (d1, t1, d2, t2) => Math.log(t1 / t2) / Math.log(d2 / d1);

const f = (x, n = 3) => x.toFixed(n);
const DOSES = [2, 4, 6];

function readMatrix(file, tempCol, doseCol, timeCol, only) {
  const lines = data(file).trim().split('\n');
  const head = lines[0].split(',');
  const rows = lines.slice(1).map((l) => l.split(','));
  const iT = head.indexOf(tempCol);
  const iD = head.indexOf(doseCol);
  const iM = head.indexOf(timeCol);
  const iF = only ? head.indexOf(only.column) : -1;
  const out = new Map();
  for (const r of rows) {
    if (only && r[iF] !== only.value) continue;
    const key = Number(r[iT]);
    if (!out.has(key)) out.set(key, {});
    out.get(key)[Number(r[iD])] = Number(r[iM]);
  }
  return out;
}

function measuredRow(matrix, tC) {
  const cell = matrix.get(tC);
  const times = DOSES.map((d) => cell[d]);
  return {
    p24: pairwise(2, times[0], 4, times[1]),
    p46: pairwise(4, times[1], 6, times[2]),
    ols: olsExponent(DOSES, times),
  };
}

function simulatedRow(params, chamberC) {
  const runs = DOSES.map((d) => simulate(params, d, chamberC));
  const times = runs.map((r) => r.tStar);
  // Local elasticity by the identity, and by a numeric derivative of ln t* in ln d, at 4 %.
  const mid = runs[1];
  const identity = params.k * (mid.meanG / mid.gEnd);
  const h = 1e-3;
  const up = simulate(params, 4 * Math.exp(h), chamberC).tStar;
  const down = simulate(params, 4 * Math.exp(-h), chamberC).tStar;
  const numeric = -(Math.log(up) - Math.log(down)) / (2 * h);
  return {
    times,
    p24: pairwise(2, times[0], 4, times[1]),
    p46: pairwise(4, times[1], 6, times[2]),
    ols: olsExponent(DOSES, times),
    identity,
    numeric,
    ratio: mid.meanG / mid.gEnd,
  };
}

console.log('# Apparent dose exponent from a constant-k law with a dough lag');
console.log(
  `Law constants (lag fit, section 2): A ${LAG_FIT.A} h, k ${LAG_FIT.k}, Ea ${LAG_FIT.Ea} kJ/mol; ` +
    `T0 ${LAG_FIT.T0} degC and tau ${LAG_FIT.tau} h are ASSUMED.`,
);

// 1. Izzreen.
const izz = readMatrix(
  'izzreen-2016-table1.csv',
  'incubator_c',
  'fresh_yeast_pct_flour',
  'endpoint_min',
);
console.log('\n## 1. Izzreen 2016 (8, 16, 32 degC chambers; doses 2/4/6 % fresh)');
console.log(
  '| chamber degC | measured pairwise 2->4 | measured pairwise 4->6 | measured OLS | simulated t* at 2/4/6 % (min) | simulated pairwise 2->4 | simulated pairwise 4->6 | simulated OLS | identity at 4 % | numeric at 4 % | mean g / g(end) at 4 % |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const tC of [8, 16, 32]) {
  const m = measuredRow(izz, tC);
  const s = simulatedRow(LAG_FIT, tC);
  console.log(
    `| ${tC} | ${f(m.p24)} | ${f(m.p46)} | ${f(m.ols)} | ${s.times.map((t) => f(t * 60, 0)).join(' / ')} | ${f(s.p24)} | ${f(s.p46)} | ${f(s.ols)} | ${f(s.identity)} | ${f(s.numeric)} | ${f(s.ratio)} |`,
  );
}
console.log(
  'Constant k is ' +
    LAG_FIT.k +
    ' in every row. The identity and the numeric derivative agree; the simulated OLS is the exponent a chamber experiment would read.',
);

// 1b. Sensitivity grid on Izzreen: exponents AND absolute durations, two sets of constants.
const SHIPPED = { A: 3.43, k: 0.729, Ea: 98.3 };
const GRID_T0 = [24, 26, 28, 30];
const GRID_TAU = [0.5, 1.0, 2.0];
const fmtMin = (h) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
console.log(
  '\n## 1b. Izzreen: sensitivity grid, T0 24/26/28/30 degC x tau 0.5/1.0/2.0 h (all ASSUMED)',
);
const measuredTimes = [];
for (const tC of [8, 16, 32]) for (const d of DOSES) measuredTimes.push(izz.get(tC)[d]);
console.log(
  'Measured Izzreen times (min), 8 degC 2/4/6 %, 16 degC 2/4/6 %, 32 degC 2/4/6 %: ' +
    measuredTimes.join(' / '),
);
console.log(
  'Measured OLS exponents at 8/16/32 degC: ' +
    [8, 16, 32].map((tC) => f(measuredRow(izz, tC).ols)).join(' / '),
);
for (const [label, base] of [
  [
    '(a) shipped law, F* = 1: A 3.43 h, k 0.729, Ea 98.3 kJ/mol (fitted to Craig, NOT to Izzreen)',
    SHIPPED,
  ],
  [
    '(b) lag fit of section 2: A 8.78 h, k 0.728, Ea 79.8 kJ/mol (fitted to these nine cells)',
    LAG_FIT,
  ],
]) {
  console.log(`\n### ${label}`);
  console.log(
    '| T0 | tau h | k_app OLS 8 / 16 / 32 degC | predicted min: 8 degC 2/4/6 % | 16 degC 2/4/6 % | 32 degC 2/4/6 % |',
  );
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const T0 of GRID_T0) {
    for (const tau of GRID_TAU) {
      const rows = [8, 16, 32].map((tC) => simulatedRow({ ...base, T0, tau }, tC));
      console.log(
        `| ${T0} | ${tau} | ${rows.map((r) => f(r.ols, 2)).join(' / ')} | ${rows.map((r) => r.times.map((t) => Math.round(t * 60)).join(' / ')).join(' | ')} |`,
      );
    }
  }
  const rows = GRID_T0.flatMap((T0) =>
    GRID_TAU.map((tau) => simulatedRow({ ...base, T0, tau }, 8)),
  );
  const t2 = rows.map((r) => r.times[0]);
  console.log(
    `Range of the predicted 2 % time at 8 degC over the 12 scenarios: ${fmtMin(Math.min(...t2))} to ${fmtMin(Math.max(...t2))} (observed ${fmtMin(izz.get(8)[2] / 60)}).`,
  );
}

// 2. Birch (Paper II). Dough temperature at the start of the run is not reported: scenarios.
const birch = readMatrix(
  'birch-2013-table.csv',
  'incubator_c',
  'yeast_g_per_kg_flour',
  'endpoint_min',
  {
    column: 'table',
    value: 'paper2_table1',
  },
);
// The Birch csv carries g/kg; map 20/40/60 to 2/4/6 % for the cell lookup.
const birchPct = new Map();
for (const [tC, cell] of birch) birchPct.set(tC, { 2: cell[20], 4: cell[40], 6: cell[60] });
console.log(
  '\n## 2. Birch, Petersen, Hansen 2013 (5, 15, 35 degC chambers; 20/40/60 g/kg = 2/4/6 %)',
);
console.log(
  'Dough temperature after the 19 min machine mix with 30 degC water is NOT reported. T0 and tau are ASSUMED; each row is a scenario, not a prediction. Constants as above.',
);
console.log(
  '| chamber degC | measured pairwise 2->4 | measured pairwise 4->6 | measured OLS | T0 degC | tau h | simulated pairwise 2->4 | simulated pairwise 4->6 | simulated OLS |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const tC of [5, 15, 35]) {
  const m = measuredRow(birchPct, tC);
  for (const T0 of [25, 30]) {
    for (const tau of [0.5, 1.5]) {
      const s = simulatedRow({ ...LAG_FIT, T0, tau }, tC);
      console.log(
        `| ${tC} | ${f(m.p24)} | ${f(m.p46)} | ${f(m.ols)} | ${T0} | ${tau} | ${f(s.p24)} | ${f(s.p46)} | ${f(s.ols)} |`,
      );
    }
  }
}
console.log(
  '\nA dough that warms toward the chamber (chamber above T0) can only lower the exponent below k = ' +
    LAG_FIT.k +
    '; one that cools (chamber below T0) raises it. Scenarios are ASSUMED, not fitted to Birch.',
);

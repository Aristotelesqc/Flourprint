#!/usr/bin/env node

/**
 * finney_exponents.mjs
 *
 * Apparent dose exponents of Finney et al. 1976 (Cereal Chem. 53(1):126-134), recomputed from the
 * times of docs/science/data/finney-1976.csv. For each observable the exponent is minus the
 * slope of ln(time) on ln(yeast dose) by ordinary least squares over the listed points (DERIVED).
 * Imports nothing from the application; prints to stdout; no file writes.
 *
 * Run: node docs/science/scripts/finney_exponents.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const lines = readFileSync(path.join(here, '..', 'data', 'finney-1976.csv'), 'utf8')
  .trim()
  .split('\n');
const rows = lines.slice(1).map((l) => {
  // The location and note fields are quoted and may hold commas: split on the first three commas.
  const [observable, dose, time] = l.split(',', 3);
  return { observable, dose: Number(dose), time: Number(time) };
});

function exponent(points) {
  const x = points.map((p) => Math.log(p.dose));
  const y = points.map((p) => Math.log(p.time));
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
}

const of = (name, maxDose = Infinity) =>
  rows.filter((r) => r.observable === name && r.dose <= maxDose);

console.log('# Finney et al. 1976: apparent dose exponents (OLS of ln t on ln dose, sign flipped)');
console.log('| observable | doses (%) | points | exponent |');
console.log('| --- | --- | --- | --- |');
for (const [label, name, maxDose] of [
  ['bulk fermentation optimum', 'bulk_fermentation_optimum', Infinity],
  ['bulk fermentation optimum, 2 to 7.2 %', 'bulk_fermentation_optimum', 7.2],
  ['optimum proof time', 'proof_optimum', Infinity],
  ['time to equal gas', 'equal_gas_time', Infinity],
  ['time to equal total fermentation', 'equal_total_fermentation_time', Infinity],
]) {
  const pts = of(name, maxDose);
  console.log(
    `| ${label} | ${pts.map((p) => p.dose).join(', ')} | ${pts.length} | ${exponent(pts).toFixed(3)} |`,
  );
}
const bulk = of('bulk_fermentation_optimum');
const two = [bulk.find((r) => r.dose === 2), bulk.find((r) => r.dose === 7.2)];
console.log(`| bulk, two points 180 / 70 min | 2, 7.2 | 2 | ${exponent(two).toFixed(3)} |`);

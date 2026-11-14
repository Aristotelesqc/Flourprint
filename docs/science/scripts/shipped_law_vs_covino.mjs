#!/usr/bin/env node

/**
 * shipped_law_vs_covino.mjs
 *
 * Where does the shipped law (model 0.1.0, contract fermentation.md) put F = 1 for the dough of
 * Covino et al. 2023 (Foods 12(7):1407), and how does that compare with the statements of the
 * paper? Isothermal 22 degC: the paper gives the room as 22 degC and no dough temperature.
 *
 *   t = A * d^(-k) / r(T),   r(T) = exp( (Ea / R) (1 / 294.25 K - 1 / T) )
 *
 * Constants (A, k, Ea) are typed here from the contract table "Parameters (version 0.1.0)"; the
 * script imports nothing from the application. Dose: 0.04 % fresh yeast of the dough, converted
 * to flour by 0.04 / 60.35 (flour 60.35 % of the dough). Reported statements of the paper
 * (section 3.1 and conclusions) are read in docs/science/data/covino-2023.md; this script only
 * divides the model time by them.
 *
 * Prints to stdout; no file writes. Run: node docs/science/scripts/shipped_law_vs_covino.mjs
 */

const A = 3.43; // h, 1 % fresh yeast at 21.1 degC
const K = 0.729;
const EA = 98.3; // kJ/mol
const R = 8.314462618e-3; // kJ/(mol K)
const T_REF_K = 294.25;

const flourPct = 60.35;
const yeastPctDough = 0.04;
const dosePctFlour = (yeastPctDough / flourPct) * 100;
const r = (tC) => Math.exp((EA / R) * (1 / T_REF_K - 1 / (tC + 273.15)));
const hoursToF = (F, dose, tC) => (F * A * Math.pow(dose, -K)) / r(tC);

console.log('# Shipped law (0.1.0) against Covino 2023, isothermal 22 degC');
console.log(
  `dose = ${yeastPctDough} / ${flourPct} * 100 = ${dosePctFlour.toFixed(4)} % fresh yeast of flour`,
);
console.log(`r(22 degC) = ${r(22).toFixed(4)}  (r = 1 at 21.1 degC)`);
const t1 = hoursToF(1, dosePctFlour, 22);
console.log(`F = 1 at ${t1.toFixed(2)} h (A ${A} h, k ${K}, Ea ${EA} kJ/mol)`);

const statements = [
  ['V/V0 "just reaches 1.3 after 8 h" (section 3.1)', 8],
  ['"doubled after 16 h" (conclusions)', 16],
  ['"tripled in 24 h" (conclusions)', 24],
  ['"tripling ... until about the 30th h" (section 3.1); "constant around 30 h" (conclusions)', 30],
];
console.log(
  '\n| statement of the paper | hours | model F = 1 time / hours (ratio, not an error) |',
);
console.log('| --- | --- | --- |');
for (const [label, h] of statements) {
  console.log(`| ${label} | ${h} | ${(t1 / h).toFixed(2)} |`);
}
console.log(
  '\nF = 1 is "about doubled once" in the unit of the contract; the paper\'s volume index is image-derived and its "ready" is not a baker\'s end point.',
);

/** Relative tolerance used for contract invariants (ADR 0006). */
export const RELATIVE_TOLERANCE = 1e-9;

export const approxEqual = (a: number, b: number, relative = RELATIVE_TOLERANCE): boolean =>
  Math.abs(a - b) <= relative * Math.max(1, Math.abs(a), Math.abs(b));

/** `a ≤ b` up to the contract tolerance. */
export const approxAtMost = (a: number, b: number, relative = RELATIVE_TOLERANCE): boolean =>
  a <= b || approxEqual(a, b, relative);

export const sum = (values: Iterable<number>): number => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};

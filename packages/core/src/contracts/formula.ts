import { z } from 'zod';
import type { Formula } from '../domain/index.js';

/**
 * Boundary schema for formulas (docs/contracts/formula.md). It checks shape and units only;
 * business invariants (shares summing to 100, allocations) stay in the domain.
 * Unknown fields are rejected so that unsupported data is never silently dropped.
 */
const nonNegative = z.number().nonnegative();

const anchorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('flourTotal'), grams: nonNegative }),
  z.strictObject({ kind: z.literal('doughWeight'), grams: nonNegative }),
  z.strictObject({ kind: z.literal('pieces'), count: z.number().int(), gramsEach: nonNegative }),
]);

const percent = z.number().min(0).max(100);

const contentSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('known'),
    valuePct: percent,
    source: z.string().min(1).optional(),
  }),
  z.strictObject({
    status: z.literal('estimated'),
    valuePct: percent,
    rangePct: z.tuple([percent, percent]).optional(),
    source: z.string().min(1).optional(),
  }),
  z.strictObject({ status: z.literal('unknown') }),
]);

export const formulaSchema = z.strictObject({
  flours: z.array(z.strictObject({ id: z.string().min(1), sharePct: nonNegative })),
  ingredients: z.array(
    z.strictObject({
      id: z.string().min(1),
      kind: z.enum(['water', 'other']),
      bakerPct: nonNegative,
      role: z.enum(['dough', 'topping', 'glaze']),
      water: contentSchema.optional(),
      fat: contentSchema.optional(),
      sugar: contentSchema.optional(),
    }),
  ),
  components: z.array(
    z.strictObject({
      id: z.string().min(1),
      kind: z.enum(['preferment', 'scald', 'soaker', 'custom']),
      flourPct: nonNegative,
      flourBlend: z.array(z.strictObject({ flour: z.string().min(1), sharePct: nonNegative })),
      hydrationPct: nonNegative,
      waterLossPct: nonNegative.optional(),
      allocations: z
        .array(z.strictObject({ ingredient: z.string().min(1), bakerPct: nonNegative }))
        .optional(),
    }),
  ),
  anchor: anchorSchema,
  waterTarget: z
    .strictObject({ totalWaterPct: nonNegative, absorbInto: z.string().min(1) })
    .optional(),
});

export interface BoundaryIssue {
  readonly path: string;
  readonly message: string;
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly BoundaryIssue[] };

export const parseFormula = (input: unknown): ParseResult<Formula> => {
  const result = formulaSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.') || '$',
        message: issue.message,
      })),
    };
  }
  // JSON input never carries explicit `undefined`, so the parsed shape is a Formula.
  return { ok: true, value: result.data as Formula };
};

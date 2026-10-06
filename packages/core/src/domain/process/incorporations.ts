import { domainError } from '../errors.js';
import { approxEqual, approxAtMost } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import type { ResolvedFormula } from '../formula/types.js';
import type { Incorporation, Process, StepId } from './types.js';
import type { ProcessError } from './validate.js';

export interface IncorporatedAmount {
  readonly item: Incorporation['item'];
  readonly id?: string;
  readonly grams: number;
}

const keyOf = (incorporation: Incorporation): string =>
  incorporation.item === 'water' ? 'water' : `${incorporation.item}:${incorporation.id}`;

/** Final-mix items and their masses, keyed like incorporations. */
const finalMixItems = (formula: ResolvedFormula): Map<string, number> =>
  new Map<string, number>([
    ...Object.entries(formula.finalMix.flourByFlour).map(([id, g]) => [`flour:${id}`, g] as const),
    ...Object.entries(formula.finalMix.grams).map(([id, g]) => [`ingredient:${id}`, g] as const),
    ...Object.entries(formula.finalMix.componentMasses).map(
      ([id, g]) => [`component:${id}`, g] as const,
    ),
    ['water', formula.finalMix.water] as const,
  ]);

/**
 * Grams added at each step. Returns an empty plan when the process declares no incorporation;
 * otherwise every final-mix item with a positive mass must be incorporated exactly once.
 */
export const planIncorporations = (
  process: Process,
  formula: ResolvedFormula,
): Result<Record<StepId, IncorporatedAmount[]>, ProcessError> => {
  const declared = process.steps.some((step) => (step.incorporations ?? []).length > 0);
  if (!declared) return ok({});

  const items = finalMixItems(formula);
  const shares = new Map<string, number>();
  const plan: Record<StepId, IncorporatedAmount[]> = {};

  for (const [index, step] of process.steps.entries()) {
    for (const [i, incorporation] of (step.incorporations ?? []).entries()) {
      const key = keyOf(incorporation);
      const mass = items.get(key);
      if (mass === undefined) {
        const id = incorporation.item === 'water' ? 'water' : incorporation.id;
        return err(
          domainError('UnknownReference', `${key} is not a final-mix item`, {
            path: `steps[${index}].incorporations[${i}]`,
            id,
          }),
        );
      }
      shares.set(key, (shares.get(key) ?? 0) + incorporation.sharePct);
      (plan[step.id] ??= []).push({
        item: incorporation.item,
        ...(incorporation.item === 'water' ? {} : { id: incorporation.id }),
        grams: (mass * incorporation.sharePct) / 100,
      });
    }
  }

  for (const [key, mass] of items) {
    const share = shares.get(key) ?? 0;
    const complete = mass <= 0 ? approxAtMost(share, 100) : approxEqual(share, 100);
    if (!complete) {
      return err(
        domainError(
          'IncompleteIncorporation',
          `${key} is incorporated at ${share} % instead of 100 %`,
          {
            item: key,
            sharePct: share,
          },
        ),
      );
    }
  }
  return ok(plan);
};

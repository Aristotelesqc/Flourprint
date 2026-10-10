import { domainError } from '../errors.js';
import { RELATIVE_TOLERANCE, approxEqual, sum } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import type { AcceptedSuggestion } from '../values.js';
import type { FormulaError } from './errors.js';
import {
  anchorDoughWeight,
  doughPctSum,
  lockedWaterPct,
  lossFactor,
  resolveFormula,
  validateAnchor,
} from './resolve.js';
import type {
  Anchor,
  AnchorKind,
  Component,
  ContentPct,
  YeastMarker,
  FlourShare,
  Formula,
  Ingredient,
  ResolvedFormula,
} from './types.js';

/** Changes to an ingredient that keep its percentage (formula.md, Structure edits). */
export interface IngredientChanges {
  readonly kind?: Ingredient['kind'];
  readonly role?: Ingredient['role'];
  readonly water?: ContentPct;
  readonly fat?: ContentPct;
  readonly sugar?: ContentPct;
  readonly yeast?: YeastMarker;
}

/** Changes to a preparation; omitted fields are kept. */
export type ComponentChanges = Partial<Omit<Component, 'id'>>;

/** Edit commands of docs/contracts/formula.md. */
export type FormulaEdit =
  | {
      readonly type: 'SetBakerPct';
      readonly ingredient: string;
      readonly pct: number;
      /** Provenance of `pct` when it is an applied model suggestion (fermentation.md). */
      readonly accepted?: AcceptedSuggestion;
    }
  | { readonly type: 'SetFlourBlend'; readonly flours: readonly FlourShare[] }
  | {
      readonly type: 'SetIngredientGrams';
      readonly ingredient: string;
      readonly grams: number;
      readonly hold?: 'otherGrams' | 'anchor';
      /** Required with `hold: 'anchor'` when the edited ingredient is a flour. */
      readonly absorbInto?: string;
    }
  | { readonly type: 'SetAnchor'; readonly mode: 'rescale'; readonly anchor: Anchor }
  | {
      readonly type: 'SetAnchor';
      readonly mode: 'reinterpret';
      readonly kind: AnchorKind;
      /** Required when reinterpreting as `pieces`. */
      readonly count?: number;
    }
  | { readonly type: 'AddIngredient'; readonly ingredient: Ingredient }
  | {
      readonly type: 'UpdateIngredient';
      readonly ingredient: string;
      readonly changes: IngredientChanges;
    }
  | { readonly type: 'RemoveIngredient'; readonly ingredient: string }
  | { readonly type: 'AddComponent'; readonly component: Component }
  | {
      readonly type: 'UpdateComponent';
      readonly component: string;
      readonly changes: ComponentChanges;
    }
  | { readonly type: 'RemoveComponent'; readonly component: string }
  | { readonly type: 'LockTotalWater'; readonly totalWaterPct: number; readonly water: string }
  | { readonly type: 'UnlockTotalWater' };

const incompatible = (reason: string, field?: string): FormulaError =>
  domainError(
    'IncompatibleConstraint',
    reason,
    field === undefined ? { reason } : { reason, field },
  );

const unknownRef = (path: string, id: string): FormulaError =>
  domainError('UnknownReference', `${path} references unknown ${id}`, { path, id });

/** Applies an edit and returns the new formula, validated by a full resolution. */
export const applyFormulaEdit = (
  formula: Formula,
  edit: FormulaEdit,
): Result<Formula, FormulaError> => {
  const absorbing = formula.waterTarget?.absorbInto;
  if (
    absorbing !== undefined &&
    (edit.type === 'SetBakerPct' || edit.type === 'SetIngredientGrams') &&
    edit.ingredient === absorbing
  ) {
    return err(
      incompatible(
        'This water follows the locked total water: change the target or unlock',
        'waterTarget.locked',
      ),
    );
  }
  const computed = computeEdit(formula, edit);
  if (!computed.ok) return computed;
  const next = relock(settleAccepted(computed.value, edit));
  if (!next.ok) return next;
  const resolved = resolveFormula(next.value);
  return resolved.ok ? next : resolved;
};

/**
 * Provenance of applied suggestions (fermentation.md): `accepted` survives only while the value
 * it describes is untouched. An edit that writes the value (typed percentage, grams) removes it;
 * any other edit keeps it as long as the percentage still equals the applied value.
 */
const settleAccepted = (formula: Formula, edit: FormulaEdit): Formula => {
  const written =
    edit.type === 'SetBakerPct' || edit.type === 'SetIngredientGrams' ? edit.ingredient : undefined;
  const keep = (id: string, pct: number, accepted: AcceptedSuggestion | undefined) =>
    accepted !== undefined && id !== written && approxEqual(accepted.appliedValue, pct);
  const withAccepted = (id: string, pct: number, accepted: AcceptedSuggestion | undefined) =>
    keep(id, pct, accepted) && accepted ? { accepted } : {};
  return {
    ...formula,
    ingredients: formula.ingredients.map((i) => {
      const { accepted, ...rest } = i;
      const fresh =
        edit.type === 'SetBakerPct' && edit.ingredient === i.id && edit.accepted
          ? approxEqual(edit.accepted.appliedValue, i.bakerPct)
            ? { accepted: edit.accepted }
            : {}
          : withAccepted(i.id, i.bakerPct, accepted);
      return { ...rest, ...fresh };
    }),
    components: formula.components.map((c) =>
      c.allocations
        ? {
            ...c,
            allocations: c.allocations.map((a) => {
              const { accepted, ...rest } = a;
              return { ...rest, ...withAccepted(`${c.id}:${a.ingredient}`, a.bakerPct, accepted) };
            }),
          }
        : c,
    ),
  };
};

/** Gives the absorbing water the percentage its locked total water requires. */
const relock = (formula: Formula): Result<Formula, FormulaError> => {
  const target = formula.waterTarget;
  if (!target) return ok(formula);
  const pct = lockedWaterPct(formula);
  if (!pct.ok) return pct;
  return ok({
    ...formula,
    ingredients: formula.ingredients.map((i) =>
      i.id === target.absorbInto ? { ...i, bakerPct: pct.value } : i,
    ),
  });
};

const computeEdit = (formula: Formula, edit: FormulaEdit): Result<Formula, FormulaError> => {
  switch (edit.type) {
    case 'SetBakerPct':
      return setBakerPct(formula, edit.ingredient, edit.pct);
    case 'SetFlourBlend':
      return ok({ ...formula, flours: edit.flours });
    case 'SetIngredientGrams':
      return edit.hold === 'anchor'
        ? setGramsHoldingAnchor(formula, edit.ingredient, edit.grams, edit.absorbInto)
        : setGramsHoldingOtherGrams(formula, edit.ingredient, edit.grams);
    case 'SetAnchor':
      if (edit.mode === 'rescale') {
        const valid = validateAnchor(edit.anchor);
        return valid.ok ? ok({ ...formula, anchor: edit.anchor }) : valid;
      }
      return reinterpretAnchor(formula, edit.kind, edit.count);
    case 'AddIngredient':
      return ok({ ...formula, ingredients: [...formula.ingredients, edit.ingredient] });
    case 'UpdateIngredient':
      return updateIngredient(formula, edit.ingredient, edit.changes);
    case 'RemoveIngredient':
      return removeIngredient(formula, edit.ingredient);
    case 'AddComponent':
      return ok({ ...formula, components: [...formula.components, edit.component] });
    case 'UpdateComponent': {
      if (!formula.components.some((c) => c.id === edit.component)) {
        return err(unknownRef('component', edit.component));
      }
      return ok({
        ...formula,
        components: formula.components.map((c) =>
          c.id === edit.component ? { ...c, ...edit.changes, id: c.id } : c,
        ),
      });
    }
    case 'RemoveComponent':
      if (!formula.components.some((c) => c.id === edit.component)) {
        return err(unknownRef('component', edit.component));
      }
      return ok({
        ...formula,
        components: formula.components.filter((c) => c.id !== edit.component),
      });
    case 'LockTotalWater':
      return ok({
        ...formula,
        waterTarget: { totalWaterPct: edit.totalWaterPct, absorbInto: edit.water },
      });
    case 'UnlockTotalWater': {
      const { waterTarget: _, ...rest } = formula;
      return ok(rest);
    }
  }
};

const updateIngredient = (
  formula: Formula,
  id: string,
  changes: IngredientChanges,
): Result<Formula, FormulaError> => {
  if (!formula.ingredients.some((i) => i.id === id)) return err(unknownRef('ingredient', id));
  return ok({
    ...formula,
    ingredients: formula.ingredients.map((i) => (i.id === id ? { ...i, ...changes, id } : i)),
  });
};

const removeIngredient = (formula: Formula, id: string): Result<Formula, FormulaError> => {
  if (!formula.ingredients.some((i) => i.id === id)) return err(unknownRef('ingredient', id));
  if (formula.waterTarget?.absorbInto === id) {
    return err(
      incompatible('This water absorbs the locked total water: unlock first', 'waterTarget.locked'),
    );
  }
  const allocating = formula.components.find((c) =>
    (c.allocations ?? []).some((a) => a.ingredient === id),
  );
  if (allocating) {
    return err(
      incompatible(
        `${allocating.id} uses ${id}: remove it from the preparation first`,
        'allocation',
      ),
    );
  }
  return ok({ ...formula, ingredients: formula.ingredients.filter((i) => i.id !== id) });
};

const setBakerPct = (
  formula: Formula,
  ingredient: string,
  pct: number,
): Result<Formula, FormulaError> => {
  if (formula.flours.some((f) => f.id === ingredient)) {
    return err(incompatible('Flour percentages change through SetFlourBlend', 'ingredient'));
  }
  if (!formula.ingredients.some((i) => i.id === ingredient)) {
    return err(unknownRef('ingredient', ingredient));
  }
  return ok({
    ...formula,
    ingredients: formula.ingredients.map((i) =>
      i.id === ingredient ? { ...i, bakerPct: pct } : i,
    ),
  });
};

/** Rewrites every percentage so that the given grams hold for total flour `flourTotal`. */
const fromGrams = (
  formula: Formula,
  resolved: ResolvedFormula,
  flourGrams: Readonly<Record<string, number>>,
  ingredientGrams: Readonly<Record<string, number>>,
): Formula => {
  const flourTotal = sum(Object.values(flourGrams));
  const pct = (grams: number) => (100 * grams) / flourTotal;
  return {
    ...formula,
    flours: formula.flours.map((f) => ({ ...f, sharePct: pct(flourGrams[f.id] ?? 0) })),
    ingredients: formula.ingredients.map((i) => ({
      ...i,
      bakerPct: pct(ingredientGrams[i.id] ?? 0),
    })),
    components: formula.components.map((c) => {
      const kept = resolved.components[c.id];
      if (!kept) return c;
      const next = { ...c, flourPct: pct(kept.flour) };
      return c.allocations
        ? {
            ...next,
            allocations: c.allocations.map((a) => ({
              ...a,
              bakerPct: pct(kept.allocations[a.ingredient] ?? 0),
            })),
          }
        : next;
    }),
    anchor: { kind: 'flourTotal', grams: flourTotal },
  };
};

/** Gives `formula` an anchor of `kind` matching its current resolved quantities. */
const anchorOfKind = (
  resolved: ResolvedFormula,
  kind: AnchorKind,
  count?: number,
): Result<Anchor, FormulaError> => {
  switch (kind) {
    case 'flourTotal':
      return ok({ kind, grams: resolved.flourTotal });
    case 'doughWeight':
      return ok({ kind, grams: resolved.doughWeight });
    case 'pieces':
      if (count === undefined || !Number.isInteger(count) || count < 1) {
        return err(incompatible('Reinterpreting as pieces needs a positive piece count', 'count'));
      }
      return ok({ kind, count, gramsEach: resolved.doughWeight / count });
  }
};

const setGramsHoldingOtherGrams = (
  formula: Formula,
  ingredient: string,
  grams: number,
): Result<Formula, FormulaError> => {
  if (!(Number.isFinite(grams) && grams >= 0)) {
    return err(incompatible('Grams must be ≥ 0', 'grams'));
  }
  const current = resolveFormula(formula);
  if (!current.ok) return current;
  const isFlour = formula.flours.some((f) => f.id === ingredient);
  if (!isFlour && !formula.ingredients.some((i) => i.id === ingredient)) {
    return err(unknownRef('ingredient', ingredient));
  }
  const flourGrams = isFlour
    ? { ...current.value.flourByFlour, [ingredient]: grams }
    : current.value.flourByFlour;
  const ingredientGrams = isFlour
    ? current.value.grams
    : { ...current.value.grams, [ingredient]: grams };
  if (!(sum(Object.values(flourGrams)) > 0)) {
    return err(incompatible('Total flour must stay above zero', 'grams'));
  }

  // Under a lock, the absorbing water is the one quantity whose grams are not kept.
  const relocked = relock(fromGrams(formula, current.value, flourGrams, ingredientGrams));
  if (!relocked.ok) return relocked;
  const rescaled = relocked.value;
  const resolved = resolveFormula(rescaled);
  if (!resolved.ok) return resolved;
  const anchor =
    formula.anchor.kind === 'pieces'
      ? anchorOfKind(resolved.value, 'pieces', formula.anchor.count)
      : anchorOfKind(resolved.value, formula.anchor.kind);
  return anchor.ok ? ok({ ...rescaled, anchor: anchor.value }) : anchor;
};

const setGramsHoldingAnchor = (
  formula: Formula,
  ingredient: string,
  grams: number,
  absorbInto: string | undefined,
): Result<Formula, FormulaError> => {
  if (!(Number.isFinite(grams) && grams >= 0)) {
    return err(incompatible('Grams must be ≥ 0', 'grams'));
  }
  const current = resolveFormula(formula);
  if (!current.ok) return current;
  const flourTotal = current.value.flourTotal;

  if (formula.flours.some((f) => f.id === ingredient)) {
    if (absorbInto === undefined || absorbInto === ingredient) {
      return err(
        incompatible(
          'Editing a flour while holding the anchor needs an absorbing flour',
          'absorbInto',
        ),
      );
    }
    if (!formula.flours.some((f) => f.id === absorbInto)) {
      return err(unknownRef('absorbInto', absorbInto));
    }
    const others = sum(
      formula.flours
        .filter((f) => f.id !== ingredient && f.id !== absorbInto)
        .map((f) => current.value.flourByFlour[f.id] ?? 0),
    );
    const absorbed = flourTotal - grams - others;
    if (absorbed < -RELATIVE_TOLERANCE * flourTotal) {
      return err(incompatible(`Not enough ${absorbInto} to absorb the change`, 'grams'));
    }
    const sharePct = (id: string): number =>
      id === ingredient
        ? (100 * grams) / flourTotal
        : id === absorbInto
          ? (100 * Math.max(0, absorbed)) / flourTotal
          : (100 * (current.value.flourByFlour[id] ?? 0)) / flourTotal;
    return ok({
      ...formula,
      flours: formula.flours.map((f) => ({ ...f, sharePct: sharePct(f.id) })),
    });
  }

  const target = formula.ingredients.find((i) => i.id === ingredient);
  if (!target) return err(unknownRef('ingredient', ingredient));
  const weight = anchorDoughWeight(formula.anchor);
  if (weight === undefined || target.role !== 'dough') {
    return setBakerPct(formula, ingredient, (100 * grams) / flourTotal);
  }

  // Under a locked total water, the absorbing water moves with the ingredient: it loses the
  // water the ingredient brings (fraction q), so only the rest, (1 − q), adds to the dough.
  const q = lockedWaterFraction(formula, target);
  const otherPct = doughPctSum(formula) - target.bakerPct + target.bakerPct * q;
  const perFlour = otherPct / 100 - lossFactor(formula);
  const rest = weight - grams * (1 - q);
  if (!(rest > 0) || !(weight - grams > 0) || !(perFlour > 0)) {
    return err(incompatible('The ingredient would exceed the anchored dough weight', 'grams'));
  }
  const newFlourTotal = rest / perFlour;
  return setBakerPct(formula, ingredient, (100 * grams) / newFlourTotal);
};

/**
 * Water fraction of an ingredient as the locked total water counts it (0 without a lock). An
 * unknown content with mass makes the lock fail when it is reapplied, so 0 is never used for it.
 */
const lockedWaterFraction = (formula: Formula, ingredient: Ingredient): number => {
  if (!formula.waterTarget || ingredient.role !== 'dough') return 0;
  if (ingredient.kind === 'water') return 1;
  const water = ingredient.water;
  return water && water.status !== 'unknown' ? water.valuePct / 100 : 0;
};

const reinterpretAnchor = (
  formula: Formula,
  kind: AnchorKind,
  count: number | undefined,
): Result<Formula, FormulaError> => {
  const current = resolveFormula(formula);
  if (!current.ok) return current;
  const anchor = anchorOfKind(current.value, kind, count);
  return anchor.ok ? ok({ ...formula, anchor: anchor.value }) : anchor;
};

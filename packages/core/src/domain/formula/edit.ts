import { domainError } from '../errors.js';
import { RELATIVE_TOLERANCE, approxEqual, sum } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import type { AcceptedSuggestion } from '../values.js';
import { validateIngredientEntry } from '../ingredient/entry.js';
import { entryContents, ingredientRefOf } from '../ingredient/mapping.js';
import type { IngredientEntry } from '../ingredient/types.js';
import type { FormulaError } from './errors.js';
import {
  anchorDoughWeight,
  doughPctSum,
  lockedWaterPct,
  lossFactor,
  resolveFormula,
  validateAnchor,
} from './resolve.js';
import {
  OVERRIDABLE_FIELDS,
  type Anchor,
  type AnchorKind,
  type Component,
  type ContentPct,
  type YeastMarker,
  type FlourShare,
  type Formula,
  type Ingredient,
  type IngredientPreparation,
  type OverridableField,
  type ResolvedFormula,
} from './types.js';

/**
 * Changes to an ingredient that keep its percentage (formula.md, Structure edits). On an
 * ingredient with an `entry`, a change to kind, water, fat, sugar or yeast lists the field in
 * `overrides` (ingredients.md, Overrides). `preparation: null` clears the preparation.
 */
export interface IngredientChanges {
  readonly kind?: Ingredient['kind'];
  readonly role?: Ingredient['role'];
  readonly water?: ContentPct;
  readonly fat?: ContentPct;
  readonly sugar?: ContentPct;
  readonly yeast?: YeastMarker;
  readonly preparation?: IngredientPreparation | null;
}

/** Changes to a preparation; omitted fields are kept. */
export type ComponentChanges = Partial<Omit<Component, 'id'>>;

/** A stage of the formula: a component, or the final mix (everything the components do not draw). */
export type StageRef =
  { readonly kind: 'component'; readonly id: string } | { readonly kind: 'final' };

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
  | {
      readonly type: 'SetStageIngredientGrams';
      readonly ingredient: string;
      readonly stage: StageRef;
      readonly grams: number;
    }
  | { readonly type: 'SetAnchor'; readonly mode: 'rescale'; readonly anchor: Anchor }
  | {
      readonly type: 'SetAnchor';
      readonly mode: 'reinterpret';
      readonly kind: AnchorKind;
      /** Required when reinterpreting as `pieces`. */
      readonly count?: number;
    }
  | {
      readonly type: 'AddIngredient';
      readonly ingredient: Ingredient;
      /** The entry version whose contents the new ingredient takes (ingredients.md). */
      readonly entry?: IngredientEntry;
    }
  | {
      readonly type: 'UpdateIngredient';
      readonly ingredient: string;
      readonly changes: IngredientChanges;
    }
  | {
      /** Pins the entry version and copies its five contents; clears `overrides`. */
      readonly type: 'ApplyIngredientEntry';
      readonly ingredient: string;
      readonly entry: IngredientEntry;
    }
  | {
      /** "Update from entry": another version of the pinned entry id, overrides kept or cleared. */
      readonly type: 'RefreshIngredientEntry';
      readonly ingredient: string;
      readonly entry: IngredientEntry;
      readonly overrides: 'keep' | 'clear';
    }
  | {
      /** Removes `entry` and `overrides`; every content stays as it is. */
      readonly type: 'DetachIngredientEntry';
      readonly ingredient: string;
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
    (edit.type === 'SetBakerPct' ||
      edit.type === 'SetIngredientGrams' ||
      edit.type === 'SetStageIngredientGrams') &&
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
 * The same edit in a draft (drafts.md): applied without the final resolution, so the formula may
 * be left in a state that does not resolve. Refused only when it cannot be applied at all.
 */
export const applyDraftFormulaEdit = (
  formula: Formula,
  edit: FormulaEdit,
): Result<Formula, FormulaError> => {
  const strict = applyFormulaEdit(formula, edit);
  // A rule of the edit itself (the locked water follows its target) still applies in a draft.
  if (strict.ok || (strict.error.details as { field?: string }).field === 'waterTarget.locked') {
    return strict;
  }
  const computed = computeEdit(formula, edit);
  if (!computed.ok) return computed;
  const settled = settleAccepted(computed.value, edit);
  const locked = relock(settled);
  return ok(locked.ok ? locked.value : settled);
};

/**
 * Provenance of applied suggestions (fermentation.md): `accepted` survives only while the value
 * it describes is untouched. An edit that writes the value (typed percentage, grams) removes it;
 * any other edit keeps it as long as the percentage still equals the applied value.
 */
const settleAccepted = (formula: Formula, edit: FormulaEdit): Formula => {
  const written =
    edit.type === 'SetBakerPct' ||
    edit.type === 'SetIngredientGrams' ||
    edit.type === 'SetStageIngredientGrams'
      ? edit.ingredient
      : undefined;
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
    case 'SetStageIngredientGrams':
      return setStageGrams(formula, edit.ingredient, edit.stage, edit.grams);
    case 'SetAnchor':
      if (edit.mode === 'rescale') {
        const valid = validateAnchor(edit.anchor);
        return valid.ok ? ok({ ...formula, anchor: edit.anchor }) : valid;
      }
      return reinterpretAnchor(formula, edit.kind, edit.count);
    case 'AddIngredient':
      return addIngredient(formula, edit.ingredient, edit.entry);
    case 'UpdateIngredient':
      return updateIngredient(formula, edit.ingredient, edit.changes);
    case 'ApplyIngredientEntry':
      return applyIngredientEntry(formula, edit.ingredient, edit.entry);
    case 'RefreshIngredientEntry':
      return refreshIngredientEntry(formula, edit.ingredient, edit.entry, edit.overrides);
    case 'DetachIngredientEntry':
      return mapIngredient(formula, edit.ingredient, (i) => {
        const { entry: _entry, overrides: _overrides, ...rest } = i;
        return ok(rest);
      });
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

/** Replaces one ingredient through `change`; an unknown id is refused. */
const mapIngredient = (
  formula: Formula,
  id: string,
  change: (ingredient: Ingredient) => Result<Ingredient, FormulaError>,
): Result<Formula, FormulaError> => {
  const current = formula.ingredients.find((i) => i.id === id);
  if (!current) return err(unknownRef('ingredient', id));
  const next = change(current);
  if (!next.ok) return next;
  return ok({
    ...formula,
    ingredients: formula.ingredients.map((i) => (i.id === id ? next.value : i)),
  });
};

const CONTENT_FIELDS = ['water', 'fat', 'sugar', 'yeast'] as const;

/** An entry document carried by a command, checked like any entry (ingredients.md). */
const entryProblem = (entry: IngredientEntry): FormulaError | undefined => {
  const valid = validateIngredientEntry(entry);
  if (valid.ok) return undefined;
  const { field, reason } = valid.error.details ?? { field: '', reason: '' };
  return domainError('InvalidFormula', `entry: ${field} ${reason}`, {
    path: 'entry',
    reason: `${field} ${reason}`,
  });
};

/**
 * The ingredient pinned to `entry` with the entry's contents, except the `kept` fields, which
 * keep the ingredient's own values and stay in `overrides`. bakerPct, role, accepted and the
 * preparation are never touched.
 */
const withEntry = (
  ingredient: Ingredient,
  entry: IngredientEntry,
  kept: ReadonlySet<OverridableField>,
): Ingredient => {
  const contents = entryContents(entry);
  const {
    kind,
    water: _water,
    fat: _fat,
    sugar: _sugar,
    yeast: _yeast,
    entry: _entry,
    overrides: _overrides,
    ...rest
  } = ingredient;
  const next: Record<string, unknown> = {
    ...rest,
    kind: kept.has('kind') ? kind : contents.kind,
    entry: ingredientRefOf(entry),
  };
  for (const field of CONTENT_FIELDS) {
    const value = kept.has(field) ? ingredient[field] : contents[field];
    if (value !== undefined) next[field] = value;
  }
  const overrides = OVERRIDABLE_FIELDS.filter((field) => kept.has(field));
  if (overrides.length > 0) next.overrides = overrides;
  return next as unknown as Ingredient;
};

const addIngredient = (
  formula: Formula,
  ingredient: Ingredient,
  entry: IngredientEntry | undefined,
): Result<Formula, FormulaError> => {
  if (entry === undefined)
    return ok({ ...formula, ingredients: [...formula.ingredients, ingredient] });
  const bad = entryProblem(entry);
  if (bad) return err(bad);
  if (
    CONTENT_FIELDS.some((field) => ingredient[field] !== undefined) ||
    ingredient.overrides !== undefined
  ) {
    return err(
      incompatible('An ingredient added with an entry takes its contents from it', 'entry'),
    );
  }
  return ok({
    ...formula,
    ingredients: [...formula.ingredients, withEntry(ingredient, entry, new Set())],
  });
};

const applyIngredientEntry = (
  formula: Formula,
  id: string,
  entry: IngredientEntry,
): Result<Formula, FormulaError> => {
  const bad = entryProblem(entry);
  if (bad) return err(bad);
  return mapIngredient(formula, id, (i) => ok(withEntry(i, entry, new Set())));
};

const refreshIngredientEntry = (
  formula: Formula,
  id: string,
  entry: IngredientEntry,
  overrides: 'keep' | 'clear',
): Result<Formula, FormulaError> => {
  const bad = entryProblem(entry);
  if (bad) return err(bad);
  if (overrides !== 'keep' && overrides !== 'clear') {
    return err(incompatible('Updating from an entry keeps or clears the overrides', 'overrides'));
  }
  return mapIngredient(formula, id, (i) => {
    if (i.entry === undefined) {
      return err(incompatible(`${id} has no entry to update from`, 'entry'));
    }
    if (i.entry.id !== entry.id) {
      return err(incompatible(`${id} pins another entry than ${entry.id}`, 'entry'));
    }
    const kept = new Set<OverridableField>(overrides === 'keep' ? (i.overrides ?? []) : []);
    return ok(withEntry(i, entry, kept));
  });
};

const updateIngredient = (
  formula: Formula,
  id: string,
  changes: IngredientChanges,
): Result<Formula, FormulaError> =>
  mapIngredient(formula, id, (i) => {
    const { preparation, ...contents } = changes;
    const prepared =
      preparation === undefined
        ? {}
        : {
            preparation:
              preparation === null
                ? undefined
                : {
                    state: preparation.state,
                    ...(preparation.note === undefined ? {} : { note: preparation.note.trim() }),
                  },
          };
    // A field set to undefined (or a preparation set to null) is removed.
    const next: Record<string, unknown> = Object.fromEntries(
      Object.entries({ ...i, ...contents, ...prepared, id }).filter(([, v]) => v !== undefined),
    );
    // A content typed on a linked ingredient overrides the entry's (ingredients.md, Overrides).
    if (i.entry !== undefined) {
      const overrides = OVERRIDABLE_FIELDS.filter(
        (field) => (i.overrides ?? []).includes(field) || Object.hasOwn(changes, field),
      );
      if (overrides.length > 0) next.overrides = overrides;
    }
    return ok(next as unknown as Ingredient);
  });

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
  return rebuildFromGrams(formula, current.value, flourGrams, ingredientGrams);
};

/**
 * Rewrites the formula so that the given total grams hold, keeps the anchor kind (value
 * recomputed) and re-applies a locked total water. `patch` adjusts the rewritten formula before
 * the lock is applied.
 */
const rebuildFromGrams = (
  formula: Formula,
  current: ResolvedFormula,
  flourGrams: Readonly<Record<string, number>>,
  ingredientGrams: Readonly<Record<string, number>>,
  patch: (rewritten: Formula) => Formula = (f) => f,
): Result<Formula, FormulaError> => {
  if (!(sum(Object.values(flourGrams)) > 0)) {
    return err(incompatible('Total flour must stay above zero', 'grams'));
  }
  // Under a lock, the absorbing water is the one quantity whose grams are not kept.
  const relocked = relock(patch(fromGrams(formula, current, flourGrams, ingredientGrams)));
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

/**
 * Sets one ingredient's grams in one stage, every other stage keeping its grams
 * (formula.md, Stage grams). The recipe total of the ingredient becomes the sum of its stages.
 */
const setStageGrams = (
  formula: Formula,
  ingredient: string,
  stage: StageRef,
  grams: number,
): Result<Formula, FormulaError> => {
  if (!(Number.isFinite(grams) && grams >= 0)) {
    return err(incompatible('Grams must be ≥ 0', 'grams'));
  }
  const isFlour = formula.flours.some((f) => f.id === ingredient);
  const target = formula.ingredients.find((i) => i.id === ingredient);
  if (!isFlour && !target) return err(unknownRef('ingredient', ingredient));
  if (target && target.role !== 'dough') {
    return err(
      incompatible(`${ingredient} is not a dough ingredient: it has no stages`, 'ingredient'),
    );
  }
  const component =
    stage.kind === 'component' ? formula.components.find((c) => c.id === stage.id) : undefined;
  if (stage.kind === 'component' && !component) return err(unknownRef('stage', stage.id));
  const resolvedCurrent = resolveFormula(formula);
  if (!resolvedCurrent.ok) return resolvedCurrent;
  const current = resolvedCurrent.value;
  const rc = component ? current.components[component.id] : undefined;
  const isWater = target?.kind === 'water';
  if (
    isWater &&
    component &&
    formula.ingredients.filter((i) => i.kind === 'water' && i.role === 'dough').length > 1
  ) {
    // Component water is pooled across the water ingredients: it has no per-ingredient amount.
    return err(
      domainError('InvalidFormula', 'stage: component water is pooled', {
        path: 'stage',
        reason:
          'component water is drawn from the pool of all water ingredients: a component-stage edit of a water ingredient needs exactly one',
      }),
    );
  }

  const now = isFlour
    ? ((rc ? rc.flourByFlour[ingredient] : current.finalMix.flourByFlour[ingredient]) ?? 0)
    : isWater
      ? rc
        ? rc.water
        : current.finalMix.water
      : ((rc ? rc.allocations[ingredient] : current.finalMix.grams[ingredient]) ?? 0);
  const delta = grams - now;
  const total = (isFlour ? current.flourByFlour[ingredient] : current.grams[ingredient]) ?? 0;
  const next = total + delta;
  if (next < -RELATIVE_TOLERANCE * Math.max(1, current.flourTotal)) {
    return err(incompatible(`The recipe would hold a negative amount of ${ingredient}`, 'grams'));
  }
  const newTotal = Math.max(0, next);

  // A component's flour changes the flour its water is relative to; the water keeps its grams.
  const newFlour = rc && isFlour ? rc.flour + delta : rc ? rc.flour : 0;
  if (rc && (isFlour || isWater)) {
    const water = isWater ? grams : rc.water;
    if (newFlour <= 0 && water > 0) {
      return err(
        incompatible(
          `${stage.kind === 'component' ? stage.id : 'the component'} would hold water without flour`,
          'stage',
        ),
      );
    }
  }

  const flourGrams = isFlour
    ? { ...current.flourByFlour, [ingredient]: newTotal }
    : current.flourByFlour;
  const ingredientGrams = isFlour ? current.grams : { ...current.grams, [ingredient]: newTotal };

  const draws = component?.allocations ?? [];
  const needsAllocation =
    component !== undefined &&
    !isFlour &&
    !isWater &&
    grams > 0 &&
    !draws.some((a) => a.ingredient === ingredient);
  const seeded: Formula =
    component && needsAllocation
      ? {
          ...formula,
          components: formula.components.map((c) =>
            c.id === component.id
              ? { ...c, allocations: [...draws, { ingredient, bakerPct: 0 }] }
              : c,
          ),
        }
      : formula;
  const seen: ResolvedFormula =
    component && rc
      ? {
          ...current,
          components: {
            ...current.components,
            [component.id]: {
              ...rc,
              flour: isFlour ? newFlour : rc.flour,
              flourByFlour: isFlour ? { ...rc.flourByFlour, [ingredient]: grams } : rc.flourByFlour,
              allocations:
                isFlour || isWater ? rc.allocations : { ...rc.allocations, [ingredient]: grams },
            },
          },
        }
      : current;

  const patch = (rewritten: Formula): Formula => {
    if (!component || !rc) return rewritten;
    return {
      ...rewritten,
      components: rewritten.components.map((c) => {
        if (c.id !== component.id) return c;
        if (isFlour) {
          const gramsOf: Record<string, number> = { ...rc.flourByFlour, [ingredient]: grams };
          const known = c.flourBlend.map((p) => p.flour);
          const ids = known.includes(ingredient) ? known : [...known, ingredient];
          return {
            ...c,
            flourBlend:
              newFlour > 0
                ? ids.map((flour) => ({
                    flour,
                    sharePct: (100 * (gramsOf[flour] ?? 0)) / newFlour,
                  }))
                : c.flourBlend,
            hydrationPct: newFlour > 0 ? (100 * rc.water) / newFlour : 0,
          };
        }
        if (isWater) {
          return { ...c, hydrationPct: rc.flour > 0 ? (100 * grams) / rc.flour : 0 };
        }
        return grams === 0
          ? { ...c, allocations: (c.allocations ?? []).filter((a) => a.ingredient !== ingredient) }
          : c;
      }),
    };
  };
  return rebuildFromGrams(seeded, seen, flourGrams, ingredientGrams, patch);
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

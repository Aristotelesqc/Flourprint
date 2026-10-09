import { domainError } from '../errors.js';
import { isReservedId } from '../ids.js';
import { approxAtMost, approxEqual, sum } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import type { FormulaError } from './errors.js';
import type {
  Anchor,
  ContentPct,
  Formula,
  Ingredient,
  ResolvedComponent,
  ResolvedFormula,
  WaterBalance,
  WaterContribution,
} from './types.js';

const invalid = (path: string, reason: string): FormulaError =>
  domainError('InvalidFormula', `${path}: ${reason}`, { path, reason });

const unknownRef = (path: string, id: string): FormulaError =>
  domainError('UnknownReference', `${path} references unknown ${id}`, { path, id });

const isFiniteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

const checkId = (path: string, id: string): FormulaError | undefined => {
  if (typeof id !== 'string' || id.length === 0)
    return invalid(path, 'id must be a non-empty string');
  if (isReservedId(id)) return invalid(path, `reserved id ${id}`);
  return undefined;
};

const ROLES: ReadonlySet<string> = new Set(['dough', 'topping', 'glaze']);
const COMPONENT_KINDS: ReadonlySet<string> = new Set(['preferment', 'scald', 'soaker', 'custom']);

/**
 * A water, fat or sugar content: a known or estimated value within [0, 100], an estimate's range
 * ordered and bracketing it, or unknown (formula.md).
 */
const checkContent = (path: string, content: ContentPct | undefined): FormulaError | undefined => {
  if (content === undefined || content.status === 'unknown') return undefined;
  if (content.status !== 'known' && content.status !== 'estimated') {
    return invalid(path, 'status must be known, estimated or unknown');
  }
  if (!isFiniteNonNegative(content.valuePct) || content.valuePct > 100) {
    return invalid(path, 'valuePct must be within [0, 100]');
  }
  if (content.status === 'estimated' && content.rangePct) {
    const [low, high] = content.rangePct;
    if (!(low >= 0 && low <= content.valuePct && content.valuePct <= high && high <= 100)) {
      return invalid(path, 'rangePct must bracket valuePct within [0, 100]');
    }
  }
  return undefined;
};

/**
 * Percentage the absorbing water must have for the locked total water (formula.md): the target
 * minus every other water contribution, plus component losses, in points of total flour.
 */
export const lockedWaterPct = (formula: Formula): Result<number, FormulaError> => {
  const target = formula.waterTarget;
  if (!target) return err(invalid('waterTarget', 'no locked total water'));
  if (!isFiniteNonNegative(target.totalWaterPct)) {
    return err(invalid('waterTarget.totalWaterPct', 'must be ≥ 0'));
  }
  const absorbing = formula.ingredients.find((i) => i.id === target.absorbInto);
  if (!absorbing) return err(unknownRef('waterTarget.absorbInto', target.absorbInto));
  if (absorbing.kind !== 'water' || absorbing.role !== 'dough') {
    return err(invalid('waterTarget.absorbInto', 'must be a water ingredient of the dough'));
  }
  let others = 0;
  const unknown: string[] = [];
  for (const ingredient of formula.ingredients) {
    if (ingredient.id === absorbing.id || ingredient.role !== 'dough') continue;
    if (ingredient.kind === 'water') {
      others += ingredient.bakerPct;
      continue;
    }
    const water = ingredient.water ?? { status: 'unknown' };
    if (water.status === 'unknown') {
      if (ingredient.bakerPct > 0) unknown.push(ingredient.id);
      continue;
    }
    others += (ingredient.bakerPct * water.valuePct) / 100;
  }
  if (unknown.length > 0) {
    return err(
      domainError(
        'IncompatibleConstraint',
        `Total water cannot be locked: unknown water in ${unknown.join(', ')}`,
        { reason: 'unknown water content', field: 'waterTarget.unknown', ingredients: unknown },
      ),
    );
  }
  const losses = sum(
    formula.components.map(
      (c) => (c.flourPct * c.hydrationPct * (c.waterLossPct ?? 0)) / 100 / 100,
    ),
  );
  const pct = target.totalWaterPct - others + losses;
  if (pct < -1e-9) {
    return err(
      domainError(
        'IncompatibleConstraint',
        'The other ingredients already bring more water than the locked total',
        { reason: 'negative added water', field: 'waterTarget.tooLow' },
      ),
    );
  }
  return ok(Math.max(0, pct));
};

/** Structural checks that do not depend on the anchor value. */
export const validateFormula = (formula: Formula): Result<void, FormulaError> => {
  const flourIds = new Set<string>();
  for (const [index, flour] of formula.flours.entries()) {
    const path = `flours[${index}]`;
    const badId = checkId(path, flour.id);
    if (badId) return err(badId);
    if (flourIds.has(flour.id)) return err(invalid(path, `duplicate id ${flour.id}`));
    if (!isFiniteNonNegative(flour.sharePct)) return err(invalid(path, 'sharePct must be ≥ 0'));
    flourIds.add(flour.id);
  }
  if (formula.flours.length === 0) return err(invalid('flours', 'at least one flour is required'));
  if (!approxEqual(sum(formula.flours.map((f) => f.sharePct)), 100)) {
    return err(invalid('flours', 'shares must sum to 100'));
  }

  const ingredientIds = new Set<string>();
  for (const [index, ingredient] of formula.ingredients.entries()) {
    const path = `ingredients[${index}]`;
    const badId = checkId(path, ingredient.id);
    if (badId) return err(badId);
    if (ingredientIds.has(ingredient.id) || flourIds.has(ingredient.id)) {
      return err(invalid(path, `duplicate id ${ingredient.id}`));
    }
    if (!isFiniteNonNegative(ingredient.bakerPct)) {
      return err(invalid(path, 'bakerPct must be ≥ 0'));
    }
    if (ingredient.kind !== 'water' && ingredient.kind !== 'other') {
      return err(invalid(`${path}.kind`, 'kind must be water or other'));
    }
    if (!ROLES.has(ingredient.role)) {
      return err(invalid(`${path}.role`, 'role must be dough, topping or glaze'));
    }
    for (const content of ['water', 'fat', 'sugar'] as const) {
      const bad = checkContent(`${path}.${content}`, ingredient[content]);
      if (bad) return err(bad);
    }
    ingredientIds.add(ingredient.id);
  }

  const componentIds = new Set<string>();
  for (const [index, component] of formula.components.entries()) {
    const path = `components[${index}]`;
    const badId = checkId(path, component.id);
    if (badId) return err(badId);
    if (
      componentIds.has(component.id) ||
      flourIds.has(component.id) ||
      ingredientIds.has(component.id)
    )
      return err(invalid(path, `duplicate id ${component.id}`));
    componentIds.add(component.id);
    if (!COMPONENT_KINDS.has(component.kind)) {
      return err(invalid(`${path}.kind`, 'kind must be preferment, scald, soaker or custom'));
    }
    if (!isFiniteNonNegative(component.flourPct) || component.flourPct > 100) {
      return err(invalid(path, 'flourPct must be within [0, 100]'));
    }
    if (!isFiniteNonNegative(component.hydrationPct)) {
      return err(invalid(path, 'hydrationPct must be ≥ 0'));
    }
    const loss = component.waterLossPct ?? 0;
    if (!isFiniteNonNegative(loss) || loss > 100) {
      return err(invalid(path, 'waterLossPct must be within [0, 100]'));
    }
    if (component.flourPct > 0 && component.flourBlend.length === 0) {
      return err(invalid(`${path}.flourBlend`, 'a component with flour needs a flour blend'));
    }
    const blendFlours = new Set<string>();
    for (const [blendIndex, part] of component.flourBlend.entries()) {
      if (!flourIds.has(part.flour)) {
        return err(unknownRef(`${path}.flourBlend[${blendIndex}]`, part.flour));
      }
      if (blendFlours.has(part.flour)) {
        return err(invalid(`${path}.flourBlend[${blendIndex}]`, `duplicate flour ${part.flour}`));
      }
      blendFlours.add(part.flour);
      if (!isFiniteNonNegative(part.sharePct)) {
        return err(invalid(`${path}.flourBlend[${blendIndex}]`, 'sharePct must be ≥ 0'));
      }
    }
    if (
      component.flourBlend.length > 0 &&
      !approxEqual(sum(component.flourBlend.map((p) => p.sharePct)), 100)
    ) {
      return err(invalid(`${path}.flourBlend`, 'shares must sum to 100'));
    }
    const allocated = new Set<string>();
    for (const [allocIndex, allocation] of (component.allocations ?? []).entries()) {
      const allocPath = `${path}.allocations[${allocIndex}]`;
      const target = formula.ingredients.find((i) => i.id === allocation.ingredient);
      if (!target) return err(unknownRef(allocPath, allocation.ingredient));
      if (target.kind === 'water') {
        return err(invalid(allocPath, 'component water is set by hydrationPct'));
      }
      if (target.role !== 'dough') {
        return err(
          invalid(allocPath, `only dough ingredients can be allocated, not ${target.role}`),
        );
      }
      if (allocated.has(target.id)) {
        return err(invalid(allocPath, `duplicate ingredient ${target.id}`));
      }
      allocated.add(target.id);
      if (!isFiniteNonNegative(allocation.bakerPct)) {
        return err(invalid(allocPath, 'bakerPct must be ≥ 0'));
      }
    }
  }

  const anchor = validateAnchor(formula.anchor);
  if (!anchor.ok) return anchor;
  if (formula.waterTarget) {
    const locked = lockedWaterPct(formula);
    if (!locked.ok) return locked;
    const absorbing = formula.ingredients.find((i) => i.id === formula.waterTarget?.absorbInto);
    if (!absorbing || !approxEqual(absorbing.bakerPct, locked.value)) {
      return err(
        invalid('waterTarget', 'the absorbing water does not match the locked total water'),
      );
    }
  }
  return ok(undefined);
};

export const validateAnchor = (anchor: Anchor): Result<void, FormulaError> => {
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  switch (anchor.kind) {
    case 'flourTotal':
    case 'doughWeight':
      return positive(anchor.grams) ? ok(undefined) : err(invalid('anchor.grams', 'must be > 0'));
    case 'pieces':
      if (!Number.isInteger(anchor.count) || anchor.count < 1) {
        return err(invalid('anchor.count', 'must be a positive integer'));
      }
      return positive(anchor.gramsEach)
        ? ok(undefined)
        : err(invalid('anchor.gramsEach', 'must be > 0'));
    default:
      return err(invalid('anchor.kind', 'must be flourTotal, doughWeight or pieces'));
  }
};

const inDough = (ingredient: Ingredient): boolean => ingredient.role === 'dough';

/** Sum of dough percentages S, including the 100 flour points. */
export const doughPctSum = (formula: Formula): number =>
  100 + sum(formula.ingredients.filter(inDough).map((i) => i.bakerPct));

/** λ such that losses L = λ × F (formula.md). */
export const lossFactor = (formula: Formula): number =>
  sum(
    formula.components.map(
      (c) => (c.flourPct * c.hydrationPct * (c.waterLossPct ?? 0)) / 1_000_000,
    ),
  );

export const anchorDoughWeight = (anchor: Anchor): number | undefined =>
  anchor.kind === 'doughWeight'
    ? anchor.grams
    : anchor.kind === 'pieces'
      ? anchor.count * anchor.gramsEach
      : undefined;

/** Total flour implied by the anchor. */
export const flourTotalFor = (formula: Formula): Result<number, FormulaError> => {
  const { anchor } = formula;
  if (anchor.kind === 'flourTotal') return ok(anchor.grams);
  const weight = anchorDoughWeight(anchor) as number;
  const perFlour = doughPctSum(formula) / 100 - lossFactor(formula);
  if (!(perFlour > 0)) {
    return err(
      domainError('IncompatibleConstraint', 'The dough weight cannot be reached', {
        reason: 'dough mass per gram of flour is not positive',
        field: 'anchor',
      }),
    );
  }
  return ok(weight / perFlour);
};

const record = <T>(entries: Iterable<readonly [string, T]>): Record<string, T> =>
  Object.fromEntries(entries);

/** Derives every quantity of the formula contract, or the first violated constraint. */
export const resolveFormula = (formula: Formula): Result<ResolvedFormula, FormulaError> => {
  const valid = validateFormula(formula);
  if (!valid.ok) return valid;
  const total = flourTotalFor(formula);
  if (!total.ok) return total;
  const flourTotal = total.value;
  const grams = (pct: number) => (flourTotal * pct) / 100;

  const flourByFlour = record(formula.flours.map((f) => [f.id, grams(f.sharePct)] as const));
  const ingredientGrams = record(
    formula.ingredients.map((i) => [i.id, grams(i.bakerPct)] as const),
  );
  const doughIngredients = formula.ingredients.filter(inDough);
  const pureWaterTotal = sum(
    doughIngredients.filter((i) => i.kind === 'water').map((i) => ingredientGrams[i.id] ?? 0),
  );

  const componentEntries: [string, ResolvedComponent][] = [];
  const drawnFlour = new Map<string, number>();
  const drawnIngredient = new Map<string, number>();
  let drawnWater = 0;
  let losses = 0;

  for (const component of formula.components) {
    const flour = grams(component.flourPct);
    const componentFlour = record(
      component.flourBlend.map((part) => [part.flour, (flour * part.sharePct) / 100] as const),
    );
    for (const [id, amount] of Object.entries(componentFlour)) {
      drawnFlour.set(id, (drawnFlour.get(id) ?? 0) + amount);
    }
    const water = (flour * component.hydrationPct) / 100;
    const waterLoss = (water * (component.waterLossPct ?? 0)) / 100;
    const allocations = record(
      (component.allocations ?? []).map((a) => [a.ingredient, grams(a.bakerPct)] as const),
    );
    for (const [id, amount] of Object.entries(allocations)) {
      drawnIngredient.set(id, (drawnIngredient.get(id) ?? 0) + amount);
    }
    drawnWater += water;
    losses += waterLoss;
    componentEntries.push([
      component.id,
      {
        flourByFlour: componentFlour,
        flour,
        water,
        waterLoss,
        allocations,
        mass: flour + water - waterLoss + sum(Object.values(allocations)),
      },
    ]);
  }
  const components = record(componentEntries);

  for (const flour of formula.flours) {
    const required = drawnFlour.get(flour.id) ?? 0;
    const available = flourByFlour[flour.id] ?? 0;
    if (!approxAtMost(required, available)) {
      return err(
        domainError('FlourAllocationExceeded', `Components need more ${flour.id} than available`, {
          flour: flour.id,
          requiredGrams: required,
          availableGrams: available,
        }),
      );
    }
  }
  if (!approxAtMost(drawnWater, pureWaterTotal)) {
    return err(
      domainError('WaterAllocationExceeded', 'Components need more water than available', {
        requiredGrams: drawnWater,
        availableGrams: pureWaterTotal,
      }),
    );
  }
  for (const [id, required] of drawnIngredient) {
    const available = ingredientGrams[id] ?? 0;
    if (!approxAtMost(required, available)) {
      return err(
        domainError('IngredientAllocationExceeded', `Components need more ${id} than available`, {
          ingredient: id,
          requiredGrams: required,
          availableGrams: available,
        }),
      );
    }
  }

  const finalMixWater = Math.max(0, pureWaterTotal - drawnWater);
  const finalMix = {
    flourByFlour: record(
      formula.flours.map(
        (f) =>
          [f.id, Math.max(0, (flourByFlour[f.id] ?? 0) - (drawnFlour.get(f.id) ?? 0))] as const,
      ),
    ),
    water: finalMixWater,
    grams: record(
      doughIngredients
        .filter((i) => i.kind !== 'water')
        .map(
          (i) =>
            [
              i.id,
              Math.max(0, (ingredientGrams[i.id] ?? 0) - (drawnIngredient.get(i.id) ?? 0)),
            ] as const,
        ),
    ),
    componentMasses: record(Object.entries(components).map(([id, c]) => [id, c.mass] as const)),
  };

  const totalWater = waterBalance(formula, ingredientGrams, components);
  const totalFat = contentBalance(formula, ingredientGrams, 'fat');
  const totalSugar = contentBalance(formula, ingredientGrams, 'sugar');
  const doughWeight =
    flourTotal + sum(doughIngredients.map((i) => ingredientGrams[i.id] ?? 0)) - losses;

  return ok({
    anchor: formula.anchor,
    bakerPct: record(formula.ingredients.map((i) => [i.id, i.bakerPct] as const)),
    flourTotal,
    flourByFlour,
    grams: ingredientGrams,
    components,
    finalMix,
    losses,
    doughWeight,
    pureWaterTotal,
    finalMixWater,
    pureWaterPct: (100 * pureWaterTotal) / flourTotal,
    totalWater,
    totalWaterPct: (100 * totalWater.value) / flourTotal,
    totalFat,
    totalFatPct: (100 * totalFat.value) / flourTotal,
    totalSugar,
    totalSugarPct: (100 * totalSugar.value) / flourTotal,
  });
};

/** Added fat or sugar: non-water dough ingredients only; flours contribute nothing. */
const contentBalance = (
  formula: Formula,
  ingredientGrams: Readonly<Record<string, number>>,
  content: 'fat' | 'sugar',
): WaterBalance => {
  const contributions: WaterContribution[] = [];
  const unknownContributors: string[] = [];
  for (const ingredient of formula.ingredients.filter(inDough)) {
    if (ingredient.kind === 'water') continue;
    const mass = ingredientGrams[ingredient.id] ?? 0;
    const value = ingredient[content] ?? { status: 'unknown' };
    if (value.status === 'unknown') {
      if (mass > 0) unknownContributors.push(ingredient.id);
      continue;
    }
    contributions.push({
      source: ingredient.id,
      kind: 'ingredient',
      grams: (mass * value.valuePct) / 100,
      status: value.status,
      ...(value.status === 'estimated' && value.rangePct
        ? {
            range: [(mass * value.rangePct[0]) / 100, (mass * value.rangePct[1]) / 100] as const,
          }
        : {}),
    });
  }
  return withRange({
    value: sum(contributions.map((c) => c.grams)),
    completeness: unknownContributors.length === 0 ? 'complete' : 'incomplete',
    unknownContributors,
    contributions,
  });
};

const withRange = (balance: WaterBalance): WaterBalance => {
  if (!balance.contributions.some((c) => c.range)) return balance;
  const low = sum(balance.contributions.map((c) => c.range?.[0] ?? c.grams));
  const high = sum(balance.contributions.map((c) => c.range?.[1] ?? c.grams));
  return { ...balance, range: [low, high] };
};

const waterBalance = (
  formula: Formula,
  ingredientGrams: Readonly<Record<string, number>>,
  components: Readonly<Record<string, ResolvedComponent>>,
): WaterBalance => {
  const contributions: WaterContribution[] = [];
  const unknownContributors: string[] = [];

  for (const ingredient of formula.ingredients.filter(inDough)) {
    const mass = ingredientGrams[ingredient.id] ?? 0;
    if (ingredient.kind === 'water') {
      contributions.push({
        source: ingredient.id,
        kind: 'pureWater',
        grams: mass,
        status: 'known',
      });
      continue;
    }
    const water = ingredient.water ?? { status: 'unknown' };
    if (water.status === 'unknown') {
      // Nothing is unknown about zero grams.
      if (mass > 0) unknownContributors.push(ingredient.id);
      continue;
    }
    const grams = (mass * water.valuePct) / 100;
    if (water.status === 'estimated' && water.rangePct) {
      contributions.push({
        source: ingredient.id,
        kind: 'ingredient',
        grams,
        status: 'estimated',
        range: [(mass * water.rangePct[0]) / 100, (mass * water.rangePct[1]) / 100],
      });
    } else {
      contributions.push({
        source: ingredient.id,
        kind: 'ingredient',
        grams,
        status: water.status,
      });
    }
  }
  for (const [id, component] of Object.entries(components)) {
    if (component.waterLoss > 0) {
      contributions.push({
        source: id,
        kind: 'loss',
        grams: -component.waterLoss,
        status: 'known',
      });
    }
  }

  return withRange({
    value: sum(contributions.map((c) => c.grams)),
    completeness: unknownContributors.length === 0 ? 'complete' : 'incomplete',
    unknownContributors,
    contributions,
  });
};

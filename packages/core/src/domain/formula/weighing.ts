/**
 * Weighing read model (docs/contracts/formula.md, Weighing read model).
 *
 * Shows the dough the way the baker weighs it: one group per stage. Every figure
 * is computed from a resolved formula; an interface never re-derives a quantity,
 * re-resolves at another anchor or divides two grams.
 */

import { sum } from '../numeric.js';
import type { Formula, ResolvedFormula } from './types.js';

export type StageRef =
  | { readonly kind: 'component'; readonly id: string }
  | { readonly kind: 'final' }
  | { readonly kind: 'finishing' };

/**
 * The pure-water pool is one item: components draw from it, whatever `water`-kind
 * ingredients make it up (formula.md, Water quantities).
 */
export type WeighingItem =
  { readonly kind: 'ingredient'; readonly id: string } | { readonly kind: 'water' };

export interface WeighingRow {
  readonly stage: StageRef;
  readonly item: WeighingItem;
  /** What to weigh at this stage, in grams. */
  readonly grams: number;
  /** 100 × grams / flourTotal: a baker's percentage, of the total flour. */
  readonly bakerPct: number;
}

export interface WeighingGroup {
  readonly stage: StageRef;
  /** Σ grams of its rows (a component: its `mass`, after its declared loss). */
  readonly mass: number;
  /** 100 × mass / flourTotal. */
  readonly massPct: number;
  /** A component only: its `flourPct` input, the share of total flour it uses. */
  readonly flourPct?: number;
  /** False for `finishing`. */
  readonly inDough: boolean;
  readonly rows: readonly WeighingRow[];
}

export interface WaterSource {
  /** Ingredient id. */
  readonly source: string;
  readonly kind: 'pureWater' | 'ingredient' | 'loss';
  /** Negative for a loss; omitted for unknown contributors. */
  readonly grams?: number;
  readonly status: 'known' | 'estimated' | 'unknown';
  /** 100 × grams / Σ grams of the known and estimated non-loss entries. */
  readonly sharePct?: number;
}

export interface Yield {
  readonly count: number;
  readonly gramsEach: number;
}

/**
 * Compares two weighing rows or checks by identity (stage, item).
 * Row equality compares `stage.kind`, `stage.id` when a component, `item.kind`, `item.id`
 * when an ingredient.
 */
export const sameWeighingRow = (
  a: { readonly stage: StageRef; readonly item: WeighingItem },
  b: { readonly stage: StageRef; readonly item: WeighingItem },
): boolean =>
  a.stage.kind === b.stage.kind &&
  (a.stage.kind !== 'component' || (b.stage.kind === 'component' && a.stage.id === b.stage.id)) &&
  a.item.kind === b.item.kind &&
  (a.item.kind !== 'ingredient' || (b.item.kind === 'ingredient' && a.item.id === b.item.id));

/**
 * Groups the ingredients and water by stage in weighing order (formula.md, Weighing read model):
 * components in formula order, then the final mix additions, then the finishing group (if any).
 * Rows at 0 g and groups with no rows are omitted.
 */
export const weighingGroups = (
  formula: Formula,
  resolved: ResolvedFormula,
): readonly WeighingGroup[] => {
  const flourTotal = resolved.flourTotal;
  const bakerPct = (g: number) => (100 * g) / flourTotal;
  const groups: WeighingGroup[] = [];

  // 1. One group per component, in formula order
  for (const component of formula.components) {
    const rc = resolved.components[component.id];
    if (!rc) continue;
    const stage: StageRef = { kind: 'component', id: component.id };
    const rows: WeighingRow[] = [];

    // Flours from flourByFlour (in component flourBlend order)
    for (const part of component.flourBlend) {
      const g = rc.flourByFlour[part.flour] ?? 0;
      if (g > 0) {
        rows.push({
          stage,
          item: { kind: 'ingredient', id: part.flour },
          grams: g,
          bakerPct: bakerPct(g),
        });
      }
    }

    // Water
    if (rc.water > 0) {
      rows.push({
        stage,
        item: { kind: 'water' },
        grams: rc.water,
        bakerPct: bakerPct(rc.water),
      });
    }

    // Allocations in component allocations order
    for (const a of component.allocations ?? []) {
      const g = rc.allocations[a.ingredient] ?? 0;
      if (g > 0) {
        rows.push({
          stage,
          item: { kind: 'ingredient', id: a.ingredient },
          grams: g,
          bakerPct: bakerPct(g),
        });
      }
    }

    if (rows.length > 0) {
      groups.push({
        stage,
        mass: rc.mass,
        massPct: (100 * rc.mass) / flourTotal,
        flourPct: component.flourPct,
        inDough: true,
        rows,
      });
    }
  }

  // 2. Final additions group
  {
    const stage: StageRef = { kind: 'final' };
    const rows: WeighingRow[] = [];

    // Flours in formula order
    for (const flour of formula.flours) {
      const g = resolved.finalMix.flourByFlour[flour.id] ?? 0;
      if (g > 0) {
        rows.push({
          stage,
          item: { kind: 'ingredient', id: flour.id },
          grams: g,
          bakerPct: bakerPct(g),
        });
      }
    }

    // Water
    if (resolved.finalMix.water > 0) {
      rows.push({
        stage,
        item: { kind: 'water' },
        grams: resolved.finalMix.water,
        bakerPct: bakerPct(resolved.finalMix.water),
      });
    }

    // Other non-water dough-role ingredients in formula order
    for (const ingredient of formula.ingredients) {
      if (ingredient.role === 'dough' && ingredient.kind !== 'water') {
        const g = resolved.finalMix.grams[ingredient.id] ?? 0;
        if (g > 0) {
          rows.push({
            stage,
            item: { kind: 'ingredient', id: ingredient.id },
            grams: g,
            bakerPct: bakerPct(g),
          });
        }
      }
    }

    if (rows.length > 0) {
      const mass = sum(rows.map((r) => r.grams));
      groups.push({
        stage,
        mass,
        massPct: (100 * mass) / flourTotal,
        inDough: true,
        rows,
      });
    }
  }

  // 3. Finishing group, only when topping/glaze ingredients exist
  {
    const stage: StageRef = { kind: 'finishing' };
    const rows: WeighingRow[] = [];

    for (const ingredient of formula.ingredients) {
      if (ingredient.role === 'topping' || ingredient.role === 'glaze') {
        const g = resolved.grams[ingredient.id] ?? 0;
        if (g > 0) {
          rows.push({
            stage,
            item: { kind: 'ingredient', id: ingredient.id },
            grams: g,
            bakerPct: bakerPct(g),
          });
        }
      }
    }

    if (rows.length > 0) {
      const mass = sum(rows.map((r) => r.grams));
      groups.push({
        stage,
        mass,
        massPct: (100 * mass) / flourTotal,
        inDough: false,
        rows,
      });
    }
  }

  return groups;
};

/**
 * Split of total water by source (formula.md, Water quantities, L126): one entry per contribution
 * (losses have no share), plus one entry per unknown contributor (neither grams nor share).
 */
export const waterSources = (resolved: ResolvedFormula): readonly WaterSource[] => {
  const totalWater = resolved.totalWater;
  const activeContributions = totalWater.contributions.filter(
    (c) => c.kind === 'loss' || c.grams > 0,
  );
  const nonLossSum = sum(activeContributions.filter((c) => c.kind !== 'loss').map((c) => c.grams));

  const sources: WaterSource[] = activeContributions.map((c) => {
    if (c.kind === 'loss') {
      return {
        source: c.source,
        kind: c.kind,
        grams: c.grams,
        status: c.status,
      };
    }
    const sharePct = nonLossSum > 0 ? (100 * c.grams) / nonLossSum : 0;
    return {
      source: c.source,
      kind: c.kind,
      grams: c.grams,
      status: c.status,
      sharePct,
    };
  });

  for (const id of totalWater.unknownContributors) {
    sources.push({
      source: id,
      kind: 'ingredient',
      status: 'unknown',
    });
  }

  return sources;
};

/**
 * Gives the pieces the summary shows first (formula.md, L109, L125):
 * `{ count, gramsEach }` from a `pieces` anchor, otherwise `{ count: 1, gramsEach: doughWeight }`.
 */
export const yieldOf = (formula: Formula, resolved: ResolvedFormula): Yield => {
  if (formula.anchor.kind === 'pieces') {
    return { count: formula.anchor.count, gramsEach: formula.anchor.gramsEach };
  }
  return { count: 1, gramsEach: resolved.doughWeight };
};

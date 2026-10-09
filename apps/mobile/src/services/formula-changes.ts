import type { Formula } from '@flourprint/core/domain';

/** What an edit changed against the saved revision, for the edit summary (no arithmetic). */
export type FormulaChange =
  | {
      readonly kind: 'added';
      readonly item: 'ingredient' | 'component' | 'flour';
      readonly id: string;
    }
  | {
      readonly kind: 'removed';
      readonly item: 'ingredient' | 'component' | 'flour';
      readonly id: string;
    }
  | {
      readonly kind: 'changed';
      readonly item: 'ingredient' | 'component' | 'flour';
      readonly id: string;
      readonly field: string;
      readonly before: number;
      readonly after: number;
    }
  | { readonly kind: 'lock'; readonly before?: number; readonly after?: number }
  | { readonly kind: 'anchor' };

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));

const compare = <T extends { readonly id: string }>(
  item: 'ingredient' | 'component' | 'flour',
  before: readonly T[],
  after: readonly T[],
  fields: readonly (keyof T & string)[],
): FormulaChange[] => {
  const changes: FormulaChange[] = [];
  for (const b of before) {
    const a = after.find((x) => x.id === b.id);
    if (!a) {
      changes.push({ kind: 'removed', item, id: b.id });
      continue;
    }
    for (const field of fields) {
      const x = b[field];
      const y = a[field];
      if (typeof x === 'number' && typeof y === 'number' && !same(x, y)) {
        changes.push({ kind: 'changed', item, id: b.id, field, before: x, after: y });
      }
    }
  }
  for (const a of after) {
    if (!before.some((b) => b.id === a.id)) changes.push({ kind: 'added', item, id: a.id });
  }
  return changes;
};

export const formulaChanges = (before: Formula, after: Formula): FormulaChange[] => {
  const changes = [
    ...compare('flour', before.flours, after.flours, ['sharePct']),
    ...compare('ingredient', before.ingredients, after.ingredients, ['bakerPct']),
    ...compare('component', before.components, after.components, ['flourPct', 'hydrationPct']),
  ];
  const lockBefore = before.waterTarget?.totalWaterPct;
  const lockAfter = after.waterTarget?.totalWaterPct;
  if (lockBefore !== lockAfter) {
    changes.push({
      kind: 'lock',
      ...(lockBefore === undefined ? {} : { before: lockBefore }),
      ...(lockAfter === undefined ? {} : { after: lockAfter }),
    });
  }
  if (JSON.stringify(before.anchor) !== JSON.stringify(after.anchor))
    changes.push({ kind: 'anchor' });
  return changes;
};

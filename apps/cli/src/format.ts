import type { ResolvedFormula, WaterBalance } from '@flourprint/core/domain';

/**
 * Presentation only: rounding for display never feeds back into the engine (ADR 0006).
 * Masses under 100 g keep one decimal so salt and yeast stay weighable.
 */
export const formatGrams = (grams: number): string =>
  grams < 100 ? `${(Math.round(grams * 10) / 10).toFixed(1)} g` : `${Math.round(grams)} g`;

export const formatPct = (pct: number): string => `${Number(pct.toFixed(2))} %`;

const table = (rows: readonly (readonly string[])[]): string => {
  const widths =
    rows[0]?.map((_, column) => Math.max(...rows.map((row) => row[column]?.length ?? 0))) ?? [];
  return rows
    .map((row) =>
      row
        .map((cell, column) =>
          column === 0 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0),
        )
        .join('  '),
    )
    .join('\n');
};

const describeAnchor = (resolved: ResolvedFormula): string => {
  const { anchor } = resolved;
  switch (anchor.kind) {
    case 'flourTotal':
      return `total flour ${formatGrams(anchor.grams)}`;
    case 'doughWeight':
      return `dough weight ${formatGrams(anchor.grams)}`;
    case 'pieces':
      return `${anchor.count} × ${formatGrams(anchor.gramsEach)}`;
  }
};

const describeWater = (water: WaterBalance): string => {
  const range = water.range
    ? ` [${formatGrams(water.range[0])} – ${formatGrams(water.range[1])}]`
    : '';
  const unknown =
    water.completeness === 'incomplete'
      ? ` (incomplete: unknown water in ${water.unknownContributors.join(', ')})`
      : '';
  return `${formatGrams(water.value)}${range}${unknown}`;
};

export const renderCalculation = (resolved: ResolvedFormula): string => {
  const rows: string[][] = [['Ingredient', 'Baker %', 'Grams']];
  for (const [id, grams] of Object.entries(resolved.flourByFlour)) {
    rows.push([id, formatPct((100 * grams) / resolved.flourTotal), formatGrams(grams)]);
  }
  for (const [id, grams] of Object.entries(resolved.grams)) {
    rows.push([id, formatPct(resolved.bakerPct[id] ?? 0), formatGrams(grams)]);
  }
  const lines = [
    `Anchor: ${describeAnchor(resolved)}`,
    '',
    table(rows),
    '',
    `Total flour      ${formatGrams(resolved.flourTotal)}`,
    `Dough weight     ${formatGrams(resolved.doughWeight)}`,
    `Pure water       ${formatGrams(resolved.pureWaterTotal)} (${formatPct(resolved.pureWaterPct)})`,
    `Total water      ${describeWater(resolved.totalWater)} (${formatPct(resolved.totalWaterPct)})`,
  ];
  const components = Object.entries(resolved.components);
  if (components.length > 0) {
    lines.push('', 'Components');
    for (const [id, c] of components) {
      const loss = c.waterLoss > 0 ? `, loss ${formatGrams(c.waterLoss)}` : '';
      lines.push(
        `  ${id}: flour ${formatGrams(c.flour)}, water ${formatGrams(c.water)}${loss} → ${formatGrams(c.mass)}`,
      );
    }
    lines.push('', 'Final mix');
    for (const [id, grams] of Object.entries(resolved.finalMix.flourByFlour)) {
      lines.push(`  ${id}: ${formatGrams(grams)}`);
    }
    lines.push(`  water: ${formatGrams(resolved.finalMix.water)}`);
    for (const [id, grams] of Object.entries(resolved.finalMix.grams)) {
      lines.push(`  ${id}: ${formatGrams(grams)}`);
    }
    for (const [id, mass] of Object.entries(resolved.finalMix.componentMasses)) {
      lines.push(`  ${id}: ${formatGrams(mass)}`);
    }
  }
  return lines.join('\n');
};

export const renderWaterExplanation = (resolved: ResolvedFormula): string => {
  const water = resolved.totalWater;
  const lines = ['Total water', ''];
  for (const c of water.contributions) {
    const detail =
      c.kind === 'loss'
        ? `loss in ${c.source}`
        : c.kind === 'pureWater'
          ? `${c.source} (pure water)`
          : `${c.source} (${c.status})`;
    const range = c.range ? ` [${formatGrams(c.range[0])} – ${formatGrams(c.range[1])}]` : '';
    lines.push(`  ${detail}: ${formatGrams(c.grams)}${range}`);
  }
  for (const id of water.unknownContributors) lines.push(`  ${id}: unknown`);
  lines.push(
    '',
    `= ${describeWater(water)}, ${formatPct(resolved.totalWaterPct)} of ${formatGrams(resolved.flourTotal)} flour`,
    `Pure water: ${formatGrams(resolved.pureWaterTotal)} (${formatPct(resolved.pureWaterPct)}), ` +
      `${formatGrams(resolved.finalMixWater)} in the final mix`,
  );
  return lines.join('\n');
};

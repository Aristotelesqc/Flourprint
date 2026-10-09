import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeRecipeFile } from '../../../../packages/core/dist/application/index.js';
import {
  componentStyle,
  resolveFormula,
  type Formula,
} from '../../../../packages/core/dist/domain/index.js';
import { convert } from '../src/convert.js';
import { parseNoteDate } from '../src/dates.js';
import { parseTostExport, TostFormatError } from '../src/legacy.js';
import type { Decisions } from '../src/migrate.js';

/**
 * Golden migrations on minimal fixtures: one verbatim TOST recipe each, never the full dataset.
 * Expected grams are computed by hand from the TOST fields (equations in the comments), outside
 * the engine; the engine must resolve the migrated formula to the same numbers.
 */
const here = join(import.meta.dirname, 'fixtures');
const fixture = (name: string) => readFileSync(join(here, `${name}.txt`), 'utf8');
const decisions = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'decisions.json'), 'utf8'),
) as Decisions;

const one = (name: string) => {
  const { file, reports } = convert(fixture(name), decisions);
  const [recipe] = file.recipes;
  const [report] = reports;
  const [revision] = recipe?.revisions ?? [];
  if (!recipe || !report || !revision) throw new Error('nothing converted');
  const resolved = resolveFormula(revision.formula);
  if (!resolved.ok) throw new Error(JSON.stringify(resolved.error));
  return { file, recipe, report, revision, resolved: resolved.value };
};

const close = (actual: number | undefined, expected: number) =>
  expect(actual).toBeCloseTo(expected, 4);

const grams = (formula: Formula, id: string, flourTotal: number) =>
  ((formula.ingredients.find((i) => i.id === id)?.bakerPct ?? NaN) * flourTotal) / 100;

describe('TOST legacy parser', () => {
  it('reads the export quirks: unquoted keys and line breaks after commas', () => {
    const [recipe] = parseTostExport(fixture('simple'));
    expect(recipe?.id).toBe('id_bread_4');
    expect(recipe?.name).toBe('PAIN (4)');
    expect(recipe?.pieces).toBe(12);
  });

  it('refuses a file that is not a TOST export', () => {
    expect(() => parseTostExport('{"kind":"flourprint-recipes"}')).toThrow(TostFormatError);
  });

  it('reads TOST creation dates as Eastern time, daylight saving included', () => {
    expect(parseNoteDate('18 juin 2026 @ 13:45:04\n', 'America/Toronto')).toEqual({
      instant: '2026-06-18T17:45:04.000Z',
    });
    expect(parseNoteDate('30 déc. 2024 @ 15 h 37 min 58 s\nUne note\n', 'America/Toronto')).toEqual(
      { instant: '2024-12-30T20:37:58.000Z', rest: 'Une note' },
    );
  });
});

describe('TOST golden migrations', () => {
  it('simple: PAIN (4), cold retard, no extras', () => {
    // F = 73.5294 × 12 = 882.353; water = 0.70 F; salt 3 % F; yeast 2 % F
    const { resolved, revision, report } = one('simple');
    close(resolved.flourTotal, 882.352941);
    close(resolved.pureWaterTotal, 617.647059);
    close(grams(revision.formula, 'salt', resolved.flourTotal), 26.470588);
    close(grams(revision.formula, 'active-dry-yeast', resolved.flourTotal), 17.647059);
    close(resolved.doughWeight, 1544.117647);
    expect(revision.formula.anchor).toMatchObject({ kind: 'pieces', count: 12 });
    expect(revision.process.steps.map((s) => s.id)).toEqual([
      'mix',
      'bulk',
      'retard',
      'shape',
      'proof',
      'bake',
    ]);
    expect(revision.process.steps.find((s) => s.id === 'retard')).toMatchObject({
      plannedDurationS: 24 * 3600,
      conditions: { location: 'fridge', temperatureC: 4 },
    });
    expect(report.status).toBe('converted');
  });

  it('cold fermentation with tangzhong: Pizza nuit', () => {
    // tz = 30 × 14 = 420 g → flour 0.17 × 420 = 71.4; T = 2181.529 + 71.4
    // water weighed = 0.70 × 2181.529 − 0.83 × 420 = 1178.471; pool = + 348.6
    const { resolved, revision } = one('cold-tangzhong');
    close(resolved.flourTotal, 2252.929412);
    close(resolved.pureWaterTotal, 1527.070588);
    close(resolved.finalMixWater, 1178.470588);
    close(resolved.components.tangzhong?.flour, 71.4);
    close(resolved.components.tangzhong?.water, 348.6);
    close(resolved.doughWeight, 3865.079647);
    const tangzhong = revision.formula.components.find((c) => c.id === 'tangzhong');
    expect(tangzhong && componentStyle(revision.formula, tangzhong)).toBe('tangzhong');
  });

  it('tangzhong: Pizza 1.1 keeps 48 h in the fridge', () => {
    const { resolved, revision } = one('tangzhong');
    close(resolved.flourTotal, 1931.082353);
    close(resolved.finalMixWater, 1010.117647);
    close(resolved.doughWeight, 3312.925412);
    expect(revision.process.steps.find((s) => s.id === 'retard')?.plannedDurationS).toBe(48 * 3600);
    expect(revision.process.steps.find((s) => s.id === 'tangzhong')).toMatchObject({
      operation: 'scald',
      endCriterion: { kind: 'userDecision' },
    });
  });

  it('enriched: Shokupan keeps every extra and its composition', () => {
    // water weighed = 0.43119 × 1417.714 − (0.83 × 560 + 0.95 × 90 + 0.17 × 80 + 0.77 × 60) = 1.2
    const { resolved, revision } = one('enriched');
    close(resolved.flourTotal, 1512.913651);
    close(resolved.finalMixWater, 1.2);
    close(resolved.doughWeight, 2312.091707);
    for (const [id, g] of [
      ['milk', 90],
      ['sugar', 56],
      ['butter', 80],
      ['egg', 60],
    ] as const) {
      close(grams(revision.formula, id, resolved.flourTotal), g);
    }
    expect(resolved.totalWater.completeness).toBe('complete');
    expect(resolved.totalFat?.completeness).toBe('complete');
    // butter 80 × 81 % + egg 60 × 9.5 % + milk 90 × 2 % + yeast 23.077 × 4.5 %
    close(resolved.totalFat?.value, 64.8 + 5.7 + 1.8 + 23.076923 * 0.045);
  });

  it('poolish: Baguette is imported for review, poolish yeast left unknown', () => {
    // poolish flour = 10 % × 782.609 = 78.261 at 130 %
    const { resolved, revision, report } = one('poolish');
    close(resolved.components.poolish?.flour, 78.26087);
    close(resolved.components.poolish?.water, 101.73913);
    close(resolved.doughWeight, 1814.471572);
    const poolish = revision.formula.components.find((c) => c.id === 'poolish');
    expect(poolish?.allocations).toBeUndefined();
    expect(report.status).toBe('needs-review');
    expect(report.reviews).toContain('TOST oven mode is "no cooking".');
  });

  it('poolish and tangzhong: pullmanzong test 4, owner-stated poolish yeast', () => {
    const { resolved, revision, report, recipe } = one('poolish-tangzhong');
    close(resolved.flourTotal, 2912.733333);
    close(resolved.pureWaterTotal, 2181.266667);
    close(resolved.components.poolish?.flour, 817.975);
    close(resolved.components.poolish?.allocations['active-dry-yeast'], 0.35);
    close(resolved.finalMixWater, 454.441667);
    close(resolved.doughWeight, 5175.369449);
    expect(revision.process.steps.find((s) => s.id === 'mix')?.dependsOn).toEqual([
      'poolish',
      'tangzhong',
    ]);
    expect(recipe.familyId).toBe('tost-family-pullmanzong');
    expect(revision.createdAt).toBe('2026-06-18T17:45:04.000Z');
    expect(report.status).toBe('converted-with-warning');
  });

  it('produces a recipe file the app accepts, with deterministic ids and no pin', () => {
    const { file } = one('poolish-tangzhong');
    expect(decodeRecipeFile(JSON.parse(JSON.stringify(file))).ok).toBe(true);
    expect(file.recipes.map((r) => r.id)).toEqual(['tost-id_bread_31']);
    expect(file.families).toEqual([{ id: 'tost-family-pullmanzong', name: 'pullmanzong' }]);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '../src/application/index.js';
import type { Formula, Process } from '../src/domain/index.js';

interface SourceStyle {
  style: string;
  source_record: {
    hash: string;
    snapshot_sha256: string;
    url: string;
    full_snapshot_read: boolean;
    original_measures: string;
    ordered_process: string;
    editorial_decisions: string;
    unknowns_and_conflicts: string;
  };
  ranges: { key: string; low: number; high: number; evidence: string; note: string }[];
  implemented_preset: { version: string; basis: string; formula: Formula; process: Process };
}
const data = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../docs/science/data/style-guides.json'),
    'utf8',
  ),
) as { styles: SourceStyle[] };

describe('source reference data and declared presets', () => {
  it('covers exactly the fifteen shipped presets, without a normative ghost template', () => {
    expect(RECIPE_TEMPLATES).toHaveLength(15);
    expect(data.styles.map((s) => s.style).sort()).toEqual(
      RECIPE_TEMPLATES.map((t) => t.id).sort(),
    );
  });

  it.each(RECIPE_TEMPLATES)(
    '$id preserves provenance and has no drift from its declared version',
    (template) => {
      const style = data.styles.find((s) => s.style === template.id);
      if (!style) throw new Error(`missing source data for ${template.id}`);
      expect(style.source_record.full_snapshot_read).toBe(true);
      expect(style.source_record.snapshot_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(template.basis).toContain('https://');
      expect(style.source_record.original_measures.length).toBeGreaterThan(20);
      expect(style.source_record.unknowns_and_conflicts.length).toBeGreaterThan(10);
      expect(style.implemented_preset).toEqual({
        version: template.version,
        basis: template.basis,
        formula: template.formula,
        process: template.process,
      });
      expect(template.guide?.verified).toBe(true);
      expect(template.guide?.ranges).toEqual(
        style.ranges.map(({ key, low, high }) => ({ key, low, high })),
      );
      for (const range of style.ranges) {
        expect(Number.isFinite(range.low) && Number.isFinite(range.high)).toBe(true);
        expect(range.low).toBeLessThanOrEqual(range.high);
        expect(range.evidence.length).toBeGreaterThan(0);
        expect(range.note.length).toBeGreaterThan(0);
      }
    },
  );

  it('retains source bounds and conflicts instead of manufacturing intervals', () => {
    const ranges = (id: string) => data.styles.find((s) => s.style === id)?.ranges ?? [];
    expect(ranges('pizza-roman')).toContainEqual(
      expect.objectContaining({ key: 'cold_retard_max_h', low: 48, high: 48 }),
    );
    expect(ranges('brioche')).toContainEqual(
      expect.objectContaining({ key: 'cold_retard_min_h', low: 1, high: 1 }),
    );
    expect(ranges('pizza-new-york')).toContainEqual(
      expect.objectContaining({ key: 'ball_g', low: 331.925, high: 331.925 }),
    );
    expect(ranges('pizza-sicilian').some((r) => r.key === 'hydration_max_pct')).toBe(true);
    expect(ranges('pizza-teglia').some((r) => r.key === 'bake_c')).toBe(false);
    expect(ranges('bagels').some((r) => r.key === 'malt_syrup_pct')).toBe(false);
    expect(ranges('shokupan').some((r) => r.key === 'fat_pct')).toBe(false);
  });
});

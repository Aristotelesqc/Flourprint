import { describe, expect, it } from 'vitest';
import { blankRecipe, RECIPE_TEMPLATES } from '../src/application/index.js';
import {
  applyDraftFormulaEdit,
  applyFormulaEdit,
  blockingIssues,
  checkRecipe,
  estimateFermentation,
  validateRecipe,
  type Formula,
} from '../src/domain/index.js';

/** docs/contracts/drafts.md: checks, draft edits, the blank recipe and the templates. */
const blank = blankRecipe();
const [water, salt] = blank.formula.ingredients;
if (!water || !salt) throw new Error('blank recipe changed');

describe('checkRecipe', () => {
  it('finds nothing to say about the blank recipe', () => {
    expect(checkRecipe(blank.formula, blank.process)).toEqual([]);
  });

  it('blocks on an invalid recipe and names the field', () => {
    const formula: Formula = { ...blank.formula, flours: [{ id: 'bread-flour', sharePct: 90 }] };
    const issues = checkRecipe(formula, blank.process);
    expect(blockingIssues(issues)).toEqual([
      expect.objectContaining({ severity: 'blocking', code: 'InvalidFormula' }),
    ]);
    expect(checkRecipe(blank.formula, { steps: [] })).toContainEqual(
      expect.objectContaining({ severity: 'blocking', code: 'no_steps' }),
    );
  });

  it('warns, without blocking, on salt, water, leavening, steps and durations', () => {
    const formula: Formula = {
      ...blank.formula,
      ingredients: [
        { ...water, bakerPct: 30 },
        { ...salt, bakerPct: 5 },
      ],
    };
    const process = {
      steps: [{ id: 'bulk', operation: 'bulk', dependsOn: [], schedule: 'asap' as const }],
    };
    const issues = checkRecipe(formula, process);
    expect(blockingIssues(issues)).toEqual([]);
    expect(issues.map((i) => i.code).sort()).toEqual(
      [
        'no_bake_step',
        'no_leavening',
        'no_mix_step',
        'salt_outside_1_to_3_5',
        'step_without_duration',
        'water_outside_45_to_90',
      ].sort(),
    );
    const noSalt = { ...blank.formula, ingredients: [water] };
    expect(checkRecipe(noSalt, blank.process).map((i) => i.code)).toContain('salt_missing');
  });
});

describe('draft edits', () => {
  it('apply a change a revision would refuse, and the check says why', () => {
    const edit = { type: 'SetFlourBlend', flours: [{ id: 'bread-flour', sharePct: 80 }] } as const;
    expect(applyFormulaEdit(blank.formula, edit).ok).toBe(false);
    const draft = applyDraftFormulaEdit(blank.formula, edit);
    if (!draft.ok) throw new Error(JSON.stringify(draft.error));
    expect(draft.value.flours).toEqual([{ id: 'bread-flour', sharePct: 80 }]);
    expect(blockingIssues(checkRecipe(draft.value, blank.process))).toHaveLength(1);
  });

  it('still refuse what cannot be applied at all', () => {
    expect(
      applyDraftFormulaEdit(blank.formula, { type: 'SetBakerPct', ingredient: 'ghost', pct: 1 }).ok,
    ).toBe(false);
  });
});

describe('templates', () => {
  it('have unique ids and pass the checks without a blocking issue', () => {
    const ids = RECIPE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of RECIPE_TEMPLATES) {
      const valid = validateRecipe(template.formula, template.process);
      expect(valid.ok, template.id).toBe(true);
      const issues = checkRecipe(template.formula, template.process);
      expect(blockingIssues(issues), template.id).toEqual([]);
      // Templates have every step timed, a mix, a bake, salt and a sane water.
      expect(issues, template.id).toEqual([]);
      expect(template.basis.length, template.id).toBeGreaterThan(20);
      // Every template has a guide whose ranges are ordered.
      expect(template.guide?.ranges.length, template.id).toBeGreaterThan(0);
      for (const range of template.guide?.ranges ?? []) {
        expect(range.low, `${template.id} ${range.key}`).toBeLessThanOrEqual(range.high);
      }
    }
  });

  it('give the fermentation model what it needs (a room temperature and a yeast)', () => {
    for (const template of RECIPE_TEMPLATES) {
      const dough = estimateFermentation(template.formula, template.process).dough.duration;
      expect(['ok', 'out_of_domain'], `${template.id}: ${JSON.stringify(dough)}`).toContain(
        dough.status,
      );
    }
    // Every template runs the whole model, bands included: slow but bounded.
  }, 30_000);
});

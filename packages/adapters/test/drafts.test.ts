import { describe, expect, it } from 'vitest';
import {
  blankRecipe,
  decodeDraft,
  nextDraftName,
  RECIPE_TEMPLATES,
  saveDraft,
  type Draft,
} from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import { MemoryRecipeRepository } from '../src/memory/index.js';

/** docs/contracts/drafts.md: generated names, saving a draft as a recipe or a version. */
const at = '2026-10-10T12:00:00.000Z' as Instant;
const blank = blankRecipe();
const draft = (patch: Partial<Draft> = {}): Draft => ({
  id: 'd1',
  name: 'Recipe 1',
  origin: { kind: 'blank' },
  ...blank,
  createdAt: at,
  updatedAt: at,
  ...patch,
});

describe('generated draft names', () => {
  it('take the smallest free number for the prefix', () => {
    expect(nextDraftName('Baguette', [])).toBe('Baguette 1');
    expect(nextDraftName('Baguette', ['Baguette 1', 'Baguette 3', 'Brioche 2'])).toBe('Baguette 2');
  });
});

describe('saving a draft', () => {
  it.each(RECIPE_TEMPLATES)(
    'loads and saves sourced template $id without predictions',
    async (template) => {
      const repository = new MemoryRecipeRepository();
      const original: Draft = {
        id: `draft-${template.id}`,
        name: template.id,
        origin: { kind: 'template', template: { id: template.id, version: template.version } },
        formula: structuredClone(template.formula),
        process: structuredClone(template.process),
        createdAt: at,
        updatedAt: at,
      };
      const loaded = decodeDraft(JSON.parse(JSON.stringify(original)), 0);
      expect(loaded).toEqual(original);
      await repository.saveDraft(loaded);
      const saved = await saveDraft(repository, loaded, {
        newRecipeId: template.id,
        createdAt: at,
      });
      expect(saved.ok).toBe(true);
      if (!saved.ok) throw new Error(JSON.stringify(saved.error));
      expect(saved.value.formula).toEqual(template.formula);
      expect(saved.value.process).toEqual(template.process);
      expect(await repository.listDrafts()).toEqual([]);
    },
  );

  it('creates a recipe from a new draft and deletes the draft', async () => {
    const repository = new MemoryRecipeRepository();
    await repository.saveDraft(draft());
    const saved = await saveDraft(repository, draft(), { newRecipeId: 'r1', createdAt: at });
    expect(saved).toMatchObject({ ok: true, value: { recipeId: 'r1', version: 1 } });
    expect((await repository.getRecipe('r1'))?.name).toBe('Recipe 1');
    expect(await repository.listDrafts()).toEqual([]);
  });

  it('refuses while a blocking issue remains, and keeps the draft', async () => {
    const repository = new MemoryRecipeRepository();
    const broken = draft({ formula: { ...blank.formula, flours: [{ id: 'f', sharePct: 80 }] } });
    await repository.saveDraft(broken);
    const saved = await saveDraft(repository, broken, { newRecipeId: 'r1', createdAt: at });
    expect(saved).toMatchObject({ ok: false, error: { code: 'RecipeHasBlockingIssues' } });
    expect(await repository.listRecipes()).toEqual([]);
    expect((await repository.listDrafts()).map((d) => d.id)).toEqual(['d1']);
  });

  it('saves a revision draft as the next version of its recipe', async () => {
    const repository = new MemoryRecipeRepository();
    const first = await saveDraft(repository, draft(), { newRecipeId: 'r1', createdAt: at });
    expect(first.ok).toBe(true);
    // An edit identical to the head is a no-op (persistence.md, Recipe history): change something.
    const formula = {
      ...blank.formula,
      anchor: { kind: 'flourTotal', grams: 1234 },
    } as Draft['formula'];
    const edit = draft({
      id: 'd2',
      formula,
      origin: { kind: 'revision', recipeId: 'r1', baseVersion: 1 },
    });
    await repository.saveDraft(edit);
    const second = await saveDraft(repository, edit, { newRecipeId: 'unused', createdAt: at });
    expect(second).toMatchObject({ ok: true, value: { recipeId: 'r1', version: 2 } });
    // Based on a stale head: refused, the draft stays.
    const stale = draft({ id: 'd3', origin: { kind: 'revision', recipeId: 'r1', baseVersion: 1 } });
    await repository.saveDraft(stale);
    expect(
      await saveDraft(repository, stale, { newRecipeId: 'unused', createdAt: at }),
    ).toMatchObject({ ok: false, error: { code: 'HeadConflict' } });
    expect((await repository.listDrafts()).map((d) => d.id)).toEqual(['d3']);
  });

  it('saving an unchanged draft is a no-op: no revision, the head returned, the draft deleted', async () => {
    const repository = new MemoryRecipeRepository();
    await saveDraft(repository, draft(), { newRecipeId: 'r1', createdAt: at });
    const same = draft({ id: 'd2', origin: { kind: 'revision', recipeId: 'r1', baseVersion: 1 } });
    await repository.saveDraft(same);
    expect(await saveDraft(repository, same, { newRecipeId: 'x', createdAt: at })).toMatchObject({
      ok: true,
      value: { recipeId: 'r1', version: 1 },
    });
    expect((await repository.getRecipe('r1'))?.headVersion).toBe(1);
    expect(await repository.listDrafts()).toEqual([]);
  });

  it('keeps the edits of a deleted recipe: refused as a version, saved as a new recipe', async () => {
    const repository = new MemoryRecipeRepository();
    await saveDraft(repository, draft(), { newRecipeId: 'r1', createdAt: at });
    await repository.trashRecipe('r1', at);
    const edit = draft({ id: 'd2', origin: { kind: 'revision', recipeId: 'r1', baseVersion: 1 } });
    await repository.saveDraft(edit);
    // In the trash: restore first.
    expect(await saveDraft(repository, edit, { newRecipeId: 'r2', createdAt: at })).toMatchObject({
      ok: false,
      error: { code: 'RecipeTrashed' },
    });
    await repository.deleteRecipe('r1');
    expect(await saveDraft(repository, edit, { newRecipeId: 'r2', createdAt: at })).toMatchObject({
      ok: false,
      error: { code: 'NotFound' },
    });
    expect((await repository.listDrafts()).map((d) => d.id)).toEqual(['d2']);
    expect(
      await saveDraft(repository, edit, { newRecipeId: 'r2', createdAt: at, asNewRecipe: true }),
    ).toMatchObject({ ok: true, value: { recipeId: 'r2', version: 1 } });
    expect(await repository.listDrafts()).toEqual([]);
  });
});

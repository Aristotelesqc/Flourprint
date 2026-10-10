import { describe, expect, it } from 'vitest';
import { blankRecipe, nextDraftName, saveDraft, type Draft } from '@flourprint/core/application';
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
    const edit = draft({ id: 'd2', origin: { kind: 'revision', recipeId: 'r1', baseVersion: 1 } });
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
});

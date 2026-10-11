import {
  blockingIssues,
  checkRecipe,
  domainError,
  err,
  type DomainError,
  type Instant,
  type RecipeIssue,
  type Result,
  type Revision,
} from '../domain/index.js';
import { isId, isInstant, isObject, refuse } from './decode.js';
import { decodeFormula, decodeProcess } from './documents.js';
import type { Draft, RecipeRepository } from './ports.js';
import { saveRevision, type SaveRevisionError } from './recipes.js';

/**
 * The first free generated name `<base> <n>` (drafts.md): the smallest n ≥ 1 that no recipe or
 * draft name uses.
 */
export const nextDraftName = (base: string, taken: readonly string[]): string => {
  const used = new Set(taken.map((name) => name.trim()));
  let n = 1;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
};

export type SaveDraftError =
  SaveRevisionError | DomainError<'RecipeHasBlockingIssues', { issues: readonly RecipeIssue[] }>;

/**
 * Saves a draft as a recipe (`blank`, `template`: a new recipe with `newRecipeId`) or as a version
 * of its recipe (`revision`), and deletes the draft in the same transaction (drafts.md). Refused
 * while the recipe has a blocking issue.
 */
export const saveDraft = async (
  repository: RecipeRepository,
  draft: Draft,
  options: { readonly newRecipeId: string; readonly createdAt: Instant },
): Promise<Result<Revision, SaveDraftError>> => {
  const blocking = blockingIssues(checkRecipe(draft.formula, draft.process));
  if (blocking.length > 0) {
    return err(
      domainError('RecipeHasBlockingIssues', 'The recipe has blocking issues', {
        issues: blocking,
      }),
    );
  }
  const target =
    draft.origin.kind === 'revision'
      ? { recipeId: draft.origin.recipeId, expectedHead: draft.origin.baseVersion }
      : { recipeId: options.newRecipeId, expectedHead: 0 };
  return saveRevision(repository, {
    ...target,
    name: draft.name,
    formula: draft.formula,
    process: draft.process,
    createdAt: options.createdAt,
    fromDraft: draft.id,
  });
};

/** Decodes a draft from untrusted JSON (backups): structure only, never the recipe checks. */
export const decodeDraft = (value: unknown, index: number): Draft => {
  const where = `draft ${index + 1}`;
  if (!isObject(value) || !isId(value.id) || typeof value.name !== 'string') {
    return refuse(`${where} has no valid id or name`);
  }
  if (!isInstant(value.createdAt) || !isInstant(value.updatedAt)) {
    return refuse(`${where} has invalid times`);
  }
  const origin = value.origin;
  if (!isObject(origin)) return refuse(`${where} has no origin`);
  const valid =
    origin.kind === 'blank' ||
    (origin.kind === 'template' &&
      isObject(origin.template) &&
      typeof origin.template.id === 'string' &&
      typeof origin.template.version === 'string') ||
    (origin.kind === 'revision' &&
      isId(origin.recipeId) &&
      typeof origin.baseVersion === 'number' &&
      Number.isInteger(origin.baseVersion) &&
      origin.baseVersion >= 1);
  if (!valid) return refuse(`${where} has an invalid origin`);
  return {
    id: value.id,
    name: value.name,
    origin: origin as unknown as Draft['origin'],
    formula: decodeFormula(value.formula, `${where} formula`),
    process: decodeProcess(value.process, `${where} process`),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

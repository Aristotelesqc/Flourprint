import { catalogText } from './template-presentation';
import { useCallback, useState } from 'react';
import {
  applyFormulaEdit,
  resolveFormula,
  validateProcess,
  projectProcess,
  parseInstant,
  estimateFermentation,
  intendedOutcome,
  outcomeProblem,
  type PreparationOutcome,
  type Formula,
  type FormulaEdit,
  type Process,
  type ProcessStep,
  type StepFact,
  type Instant,
} from '@flourprint/core/domain';
import { RECIPE_TEMPLATES, blankRecipe } from '@flourprint/core/application';
import { t, type Locale } from './messages';
import { formatFormulaError } from './defaults-copy';
import { prepActionsCopy } from './preparation-actions-copy';

export const clone = <T>(value: T): T => structuredClone(value);
export interface Content {
  formula: Formula;
  process: Process;
  name?: string;
  names: Record<string, string>;
}
export interface SavedRevision extends Content {
  version: number;
  createdAt: string;
  note?: string;
}
export interface Recipe extends Content {
  id: string;
  templateId: string;
  version: number;
  revisions: SavedRevision[];
  savedAt: string;
  referenceVersions: {
    number: number;
    version: number;
    name?: string;
    createdAt: string;
  }[];
  trashed?: boolean;
}
export interface Draft {
  recipeId: string;
  baseVersion: number;
  history: Content[];
  index: number;
}
export interface Session {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  snapshot: Content;
  effective: Process;
  facts: Record<string, StepFact>;
  activeId: string;
  startedAt: Instant;
  elapsedOffsetS: number;
  journal: { at: Instant; text: string }[];
  checks: string[];
  finished: boolean;
  abandoned?: boolean;
  endedAt?: Instant;
  outcome?: PreparationOutcome;
  outcomeSource?: 'recipe' | 'override';
}
export type Screen = 'library' | 'recipe' | 'preparation' | 'registry' | 'settings' | 'catalogue';
export type Section = 'ingredients' | 'steps' | 'planning' | 'history';
export interface Route {
  screen: Screen;
  recipeId?: string;
  section?: Section;
}
export interface DemoState {
  recipes: Recipe[];
  selected: string;
  draft: Draft | null;
  session: Session | null;
  sessions?: Session[];
  sessionHistory: Session[];
  checks: Record<string, string[]>;
  error: string;
  historyError?: {
    code: 'HeadConflict' | 'AlreadyReferenced' | 'UnknownRevision' | 'RecipeTrashed';
    number?: number;
  };
  invalid: Record<string, boolean>;
  pendingInputs?: Record<string, boolean>;
  resetEpoch: number;
}
export const instant = (value: string | number): Instant => {
  const parsed = parseInstant(new Date(value).toISOString());
  if (!parsed.ok) throw new Error('Invalid time');
  return parsed.value;
};
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).filter((k) => aObj[k] !== undefined);
  const bKeys = Object.keys(bObj).filter((k) => bObj[k] !== undefined);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!(key in bObj)) return false;
    if (!isDeepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

export function isContentEqual(a: Content, b: Content): boolean {
  if (a === b) return true;
  if ((a.name ?? '') !== (b.name ?? '')) return false;
  if (!isDeepEqual(a.names ?? {}, b.names ?? {})) return false;
  if (!isDeepEqual(a.formula, b.formula)) return false;
  if (!isDeepEqual(a.process, b.process)) return false;
  return true;
}

export const recipeName = (recipe: Recipe, locale: Locale): string =>
  recipe.name ??
  catalogText(locale, `template.${recipe.templateId}`) ??
  recipe.templateId.replaceAll('-', ' ');
export function initialRecipes(): Recipe[] {
  const ordered = [...RECIPE_TEMPLATES].sort((a, b) =>
    a.id === 'shokupan' ? -1 : b.id === 'shokupan' ? 1 : a.id.localeCompare(b.id),
  );
  return ordered.map((template) => ({
    id: template.id,
    templateId: template.id,
    version: 1,
    formula: clone(template.formula),
    process: clone(template.process),
    names: {},
    revisions: [],
    savedAt: '2026-10-16T08:00:00.000Z',
    referenceVersions: [],
  }));
}
export const currentContent = (state: DemoState): Content =>
  state.draft
    ? state.draft.history[state.draft.index]
    : (state.recipes.find((r) => r.id === state.selected) ?? state.recipes[0]);
export function makeSession(
  recipe: Recipe,
  locale: Locale,
  seed = false,
  cooking = false,
): Session {
  const now = instant(Date.now());
  const active = seed
    ? (recipe.process.steps.find((s) => s.operation === (cooking ? 'bake' : 'bulk')) ??
      recipe.process.steps[0])
    : recipe.process.steps[0];
  const facts: Record<string, StepFact> = {};
  if (seed) {
    const planned = projectProcess(recipe.process, {
      mode: { kind: 'startAt', at: instant('2026-10-16T08:00:00Z') },
    });
    if (planned.ok) {
      const activeStart = planned.value.steps[active.id]?.start;
      if (activeStart) {
        const shift = Date.now() - 600000 - Date.parse(activeStart);
        for (const step of recipe.process.steps) {
          const timing = planned.value.steps[step.id];
          if (timing.start && timing.end && Date.parse(timing.end) <= Date.parse(activeStart))
            facts[step.id] = {
              startedAt: instant(Date.parse(timing.start) + shift),
              endedAt: instant(Date.parse(timing.end) + shift),
            };
        }
      }
    }
  }
  facts[active.id] = { startedAt: seed ? instant(Date.now() - 600000) : now };
  return {
    id: crypto.randomUUID(),
    recipeId: recipe.id,
    recipeName: recipeName(recipe, locale),
    recipeVersion: recipe.version,
    snapshot: clone(recipe),
    effective: clone(recipe.process),
    facts,
    activeId: active.id,
    startedAt: seed
      ? instant(Math.min(...Object.values(facts).map((f) => Date.parse(f.startedAt ?? now))))
      : now,
    elapsedOffsetS: 0,
    journal: [{ at: now, text: t(locale, 'startRecorded') }],
    checks: [],
    finished: false,
  };
}
export function initialState(locale: Locale): DemoState {
  const recipes = initialRecipes();
  const parameters = new URLSearchParams(location.search);
  const selected = recipes.find((r) => r.id === parameters.get('recipe')) ?? recipes[0];
  const draft =
    parameters.get('mode') === 'edit'
      ? {
          recipeId: selected.id,
          baseVersion: selected.version,
          history: [clone(selected)],
          index: 0,
        }
      : null;
  const initialSession = makeSession(
    recipes[0],
    locale,
    parameters.get('prep') !== 'fresh',
    parameters.get('prep') === 'cooking',
  );
  return {
    recipes,
    selected: selected.id,
    draft,
    session: initialSession,
    sessions: initialSession ? [initialSession] : [],
    checks: {},
    sessionHistory: [],
    error: '',
    historyError: undefined,
    invalid: {},
    pendingInputs: {},
    resetEpoch: 0,
  };
}
export function syncSessions(
  sessions: Session[] | undefined,
  currentSession: Session | null,
): Session[] {
  const map = new Map<string, Session>();
  if (sessions) {
    for (const s of sessions) {
      map.set(s.id, s);
    }
  }
  if (currentSession) {
    map.set(currentSession.id, currentSession);
  }
  return Array.from(map.values());
}

/**
 * Exact integration API for App's per-card running statuses (L82):
 * Returns all currently active (non-finished) sessions from DemoState.
 */
export function getActiveSessions(state: DemoState): Session[] {
  return syncSessions(state.sessions, state.session).filter((s) => !s.finished);
}

/**
 * Returns the running session for a given recipe ID, if any.
 */
export function getRunningSession(state: DemoState, recipeId: string): Session | undefined {
  return getActiveSessions(state).find((s) => s.recipeId === recipeId);
}

/**
 * Residual UI arithmetic for an active session's step remaining seconds.
 */
export function getSessionRemainingSeconds(session: Session, clockNow: number): number | undefined {
  const currentStep = session.effective.steps.find((s) => s.id === session.activeId);
  const plannedDurationS = currentStep?.plannedDurationS;
  if (plannedDurationS === undefined) return undefined;
  const startedAt = session.facts[session.activeId]?.startedAt ?? session.startedAt;
  const elapsed = (clockNow - Date.parse(startedAt)) / 1000 + session.elapsedOffsetS;
  return Math.max(0, plannedDurationS - elapsed);
}

export function usePrototype(locale: Locale) {
  const [state, setState] = useState<DemoState>(() => initialState(locale));
  const content = currentContent(state);
  const recipe = state.recipes.find((r) => r.id === state.selected) ?? state.recipes[0];
  const resolved = resolveFormula(content.formula);
  // Normalize by asking the domain to rescale, rather than duplicating percentage calculations.
  const normalized = resolveFormula({
    ...content.formula,
    anchor: { kind: 'flourTotal', grams: 100 },
  });
  const push = (next: Content) =>
    setState((s) =>
      s.draft
        ? {
            ...s,
            error: '',
            checks: next.formula !== content.formula ? { ...s.checks, [s.selected]: [] } : s.checks,
            draft: {
              ...s.draft,
              history: [...s.draft.history.slice(0, s.draft.index + 1), clone(next)].slice(-50),
              index: Math.min(s.draft.index + 1, 49),
            },
          }
        : s,
    );
  const edit = (targetRecipeId?: string) =>
    setState((s) => {
      const id = targetRecipeId ?? s.selected;
      if (s.draft && s.draft.recipeId === id) {
        return s;
      }
      const target = s.recipes.find((r) => r.id === id) ?? s.recipes[0];
      return {
        ...s,
        selected: id,
        error: '',
        historyError: undefined,
        invalid: {},
        pendingInputs: {},
        draft: {
          recipeId: target.id,
          baseVersion: target.version,
          history: [clone(target)],
          index: 0,
        },
      };
    });
  const cancel = () =>
    setState((s) => ({
      ...s,
      error: '',
      historyError: undefined,
      invalid: {},
      pendingInputs: {},
      draft: null,
    }));
  const apply = (command: FormulaEdit, names?: Record<string, string>): boolean => {
    if (!state.draft) return false;
    const result = applyFormulaEdit(content.formula, command);
    if (!result.ok) {
      setState((s) => ({ ...s, error: formatFormulaError(locale, result.error) }));
      return false;
    }
    push({
      ...content,
      formula: result.value,
      ...(names ? { names: { ...content.names, ...names } } : {}),
    });
    return true;
  };
  const applyProcess = (process: Process): boolean => {
    if (!state.draft) return false;
    const valid = validateProcess(process);
    if (!valid.ok) {
      setState((s) => ({ ...s, error: t(locale, 'refusedMove') }));
      return false;
    }
    push({ ...content, process });
    return true;
  };
  const save = (): boolean => {
    if (
      !state.draft ||
      Object.values(state.invalid).some(Boolean) ||
      (content.name !== undefined && !content.name.trim())
    )
      return false;
    const formula = resolveFormula(content.formula),
      process = validateProcess(content.process);
    if (!formula.ok || !process.ok) {
      setState((s) => ({ ...s, error: t(locale, 'refused') }));
      return false;
    }
    const targetRecipe = state.recipes.find((r) => r.id === state.draft?.recipeId);
    if (!targetRecipe) return false;
    if (targetRecipe.trashed) {
      setState((s) => ({
        ...s,
        historyError: { code: 'RecipeTrashed' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    if (state.draft.baseVersion !== targetRecipe.version) {
      setState((s) => ({
        ...s,
        historyError: { code: 'HeadConflict' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    const isNewRecipe = targetRecipe.version === 0;
    if (!isNewRecipe && isContentEqual(content, targetRecipe)) {
      setState((s) => ({
        ...s,
        draft: null,
        invalid: {},
        pendingInputs: {},
        error: '',
        historyError: undefined,
      }));
      return true;
    }
    const nowIso = new Date().toISOString();
    const nextRevisions = isNewRecipe
      ? targetRecipe.revisions
      : [
          ...targetRecipe.revisions,
          {
            formula: clone(targetRecipe.formula),
            process: clone(targetRecipe.process),
            name: targetRecipe.name,
            names: clone(targetRecipe.names),
            version: targetRecipe.version,
            createdAt: targetRecipe.savedAt,
          },
        ];
    const nextVersion = isNewRecipe ? 1 : targetRecipe.version + 1;
    setState((s) => ({
      ...s,
      draft: null,
      invalid: {},
      pendingInputs: {},
      error: '',
      historyError: undefined,
      recipes: s.recipes.map((r) =>
        r.id === targetRecipe.id
          ? {
              ...r,
              ...clone(content),
              version: nextVersion,
              savedAt: nowIso,
              revisions: nextRevisions,
            }
          : r,
      ),
    }));
    return true;
  };
  const validity = useCallback(
    (id: string, invalid: boolean) =>
      setState((s) =>
        s.invalid[id] === invalid || (!invalid && !(id in s.invalid))
          ? s
          : { ...s, invalid: { ...s.invalid, [id]: invalid } },
      ),
    [],
  );
  const pendingInput = useCallback(
    (id: string, dirty: boolean) =>
      setState((s) => {
        const current = Boolean(s.pendingInputs?.[id]);
        if (current === dirty || (!dirty && !(id in (s.pendingInputs ?? {})))) return s;
        return {
          ...s,
          pendingInputs: {
            ...s.pendingInputs,
            [id]: dirty,
          },
        };
      }),
    [],
  );
  const setHydrationTarget = (target: number): boolean => {
    const water =
      content.formula.waterTarget?.absorbInto ??
      content.formula.ingredients.find((i) => i.kind === 'water' && i.role === 'dough')?.id ??
      content.formula.ingredients.find((i) => i.kind === 'water')?.id;
    if (!water) {
      setState((s) => ({ ...s, error: t(locale, 'refused') }));
      return false;
    }
    const locked = applyFormulaEdit(content.formula, {
      type: 'LockTotalWater',
      totalWaterPct: target,
      water,
    });
    if (!locked.ok) {
      setState((s) => ({ ...s, error: formatFormulaError(locale, locked.error) }));
      return false;
    }
    push({ ...content, formula: locked.value });
    return true;
  };
  const undo = () =>
    setState((s) =>
      s.draft && s.draft.index > 0
        ? {
            ...s,
            invalid: {},
            pendingInputs: {},
            resetEpoch: s.resetEpoch + 1,
            draft: { ...s.draft, index: s.draft.index - 1 },
          }
        : s,
    );
  const redo = () =>
    setState((s) =>
      s.draft && s.draft.index < s.draft.history.length - 1
        ? {
            ...s,
            invalid: {},
            pendingInputs: {},
            resetEpoch: s.resetEpoch + 1,
            draft: { ...s.draft, index: s.draft.index + 1 },
          }
        : s,
    );
  const reset = () =>
    setState((s) => {
      if (!s.draft) return s;
      const target = s.recipes.find((r) => r.id === s.selected) ?? s.recipes[0];
      return {
        ...s,
        error: '',
        historyError: undefined,
        invalid: {},
        pendingInputs: {},
        resetEpoch: s.resetEpoch + 1,
        draft: {
          ...s.draft,
          baseVersion: target.version,
          history: [clone(target)],
          index: 0,
        },
      };
    });
  const select = (id: string) =>
    setState((s) => ({
      ...s,
      selected: id,
      error: '',
      historyError: undefined,
      invalid: {},
      pendingInputs: {},
    }));
  const create = (templateId: string) => {
    const template = RECIPE_TEMPLATES.find((r) => r.id === templateId);
    const base = template ? clone(template) : blankRecipe();
    const preferred = template
      ? recipeName({ templateId: template.id } as Recipe, locale)
      : t(locale, 'blank');
    const existing = new Set(
      state.recipes.filter((r) => !r.trashed).map((r) => recipeName(r, locale)),
    );
    let name = preferred,
      n = 2;
    while (existing.has(name)) name = `${preferred} ${n++}`;
    const created: Recipe = {
      id: crypto.randomUUID(),
      templateId: templateId || 'blank',
      formula: base.formula,
      process: base.process,
      name,
      names: {},
      version: 0,
      revisions: [],
      savedAt: new Date().toISOString(),
      referenceVersions: [],
    };
    setState((s) => ({
      ...s,
      recipes: [created, ...s.recipes],
      selected: created.id,
      invalid: {},
      pendingInputs: {},
      draft: { recipeId: created.id, baseVersion: 0, history: [clone(created)], index: 0 },
      error: '',
      historyError: undefined,
    }));
    return created.id;
  };
  const weigh = (id: string) =>
    setState((s) => {
      const list = s.checks[s.selected] ?? [];
      return {
        ...s,
        checks: {
          ...s.checks,
          [s.selected]: list.includes(id) ? list.filter((v) => v !== id) : [...list, id],
        },
      };
    });
  const start = (targetRecipe?: Recipe): boolean => {
    if (state.draft) return false;
    const next = makeSession(targetRecipe ?? recipe, locale);
    setState((s) => {
      const currentList = syncSessions(s.sessions, s.session);
      return {
        ...s,
        session: next,
        sessions: [...currentList.filter((item) => item.id !== next.id), next],
        error: '',
      };
    });
    return true;
  };
  const selectSession = (id: string) =>
    setState((s) => {
      const list = syncSessions(s.sessions, s.session);
      const target = list.find((item) => item.id === id);
      if (!target) return s;
      return {
        ...s,
        session: target,
        sessions: list,
      };
    });
  const updateSession = (fn: (session: Session) => Session) =>
    setState((s) => {
      if (!s.session || s.session.finished) return s;
      const updated = fn(s.session);
      const list = syncSessions(s.sessions, s.session);
      return {
        ...s,
        session: updated,
        sessions: list.map((item) => (item.id === updated.id ? updated : item)),
      };
    });
  const abandonSession = () =>
    setState((s) => {
      if (!s.session || s.session.finished) return s;
      const abandoned: Session = {
        ...s.session,
        finished: true,
        abandoned: true,
        endedAt: instant(Date.now()),
        outcome: undefined,
        outcomeSource: undefined,
        journal: [
          {
            at: instant(Date.now()),
            text: prepActionsCopy(locale, 'journalAbandonment'),
          },
          ...s.session.journal,
        ],
      };
      const list = syncSessions(s.sessions, s.session);
      const sessions = list.map((item) => (item.id === abandoned.id ? abandoned : item));
      const alreadyInHistory = s.sessionHistory.some((item) => item.id === abandoned.id);
      const sessionHistory = alreadyInHistory
        ? s.sessionHistory.map((item) => (item.id === abandoned.id ? clone(abandoned) : item))
        : [...s.sessionHistory, clone(abandoned)];
      return { ...s, session: abandoned, sessions, sessionHistory, error: '' };
    });
  const finishSession = (chosen?: PreparationOutcome) =>
    setState((s) => {
      if (!s.session || s.session.finished) return s;
      const outcome = chosen ?? intendedOutcome(s.session.effective);
      if (outcomeProblem(outcome)) return { ...s, error: t(locale, 'invalid') };
      const finished: Session = {
        ...s.session,
        finished: true,
        endedAt: instant(Date.now()),
        outcome: clone(outcome),
        outcomeSource: chosen ? 'override' : 'recipe',
      };
      const list = syncSessions(s.sessions, s.session);
      const sessions = list.map((item) => (item.id === finished.id ? finished : item));
      const alreadyInHistory = s.sessionHistory.some((item) => item.id === finished.id);
      const sessionHistory = alreadyInHistory
        ? s.sessionHistory.map((item) => (item.id === finished.id ? clone(finished) : item))
        : [...s.sessionHistory, clone(finished)];
      return { ...s, session: finished, sessions, sessionHistory, error: '' };
    });
  const log = (text: string) =>
    updateSession((s) => ({ ...s, journal: [{ at: instant(Date.now()), text }, ...s.journal] }));
  const restoreRevision = (version: number, expectedHead?: number): boolean => {
    const targetRecipe = state.recipes.find((r) => r.id === state.selected);
    if (!targetRecipe) return false;
    if (targetRecipe.trashed) {
      setState((s) => ({
        ...s,
        historyError: { code: 'RecipeTrashed' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    if (expectedHead !== undefined && expectedHead !== targetRecipe.version) {
      setState((s) => ({
        ...s,
        historyError: { code: 'HeadConflict' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    const sourceRevision: Content | undefined =
      targetRecipe.version === version
        ? targetRecipe
        : targetRecipe.revisions.find((r) => r.version === version);
    if (!sourceRevision) {
      setState((s) => ({
        ...s,
        historyError: { code: 'UnknownRevision' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    if (isContentEqual(sourceRevision, targetRecipe)) {
      setState((s) => ({
        ...s,
        error: '',
        historyError: undefined,
      }));
      return true;
    }
    const archivedHead: SavedRevision = {
      formula: clone(targetRecipe.formula),
      process: clone(targetRecipe.process),
      name: targetRecipe.name,
      names: clone(targetRecipe.names),
      version: targetRecipe.version,
      createdAt: targetRecipe.savedAt,
    };
    const nowIso = new Date().toISOString();
    setState((s) => ({
      ...s,
      error: '',
      historyError: undefined,
      recipes: s.recipes.map((r) =>
        r.id === targetRecipe.id
          ? {
              ...r,
              formula: clone(sourceRevision.formula),
              process: clone(sourceRevision.process),
              name: sourceRevision.name,
              names: clone(sourceRevision.names),
              version: r.version + 1,
              savedAt: nowIso,
              revisions: [...r.revisions, archivedHead],
            }
          : r,
      ),
    }));
    return true;
  };
  const promoteReferenceVersion = (
    version: number,
    name?: string,
    expectedHead?: number,
  ): boolean => {
    const targetRecipe = state.recipes.find((r) => r.id === state.selected);
    if (!targetRecipe) return false;
    if (targetRecipe.trashed) {
      setState((s) => ({
        ...s,
        historyError: { code: 'RecipeTrashed' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    if (expectedHead !== undefined && expectedHead !== targetRecipe.version) {
      setState((s) => ({
        ...s,
        historyError: { code: 'HeadConflict' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    const exists =
      targetRecipe.version === version || targetRecipe.revisions.some((r) => r.version === version);
    if (!exists) {
      setState((s) => ({
        ...s,
        historyError: { code: 'UnknownRevision' },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    const already = targetRecipe.referenceVersions.find((r) => r.version === version);
    if (already) {
      setState((s) => ({
        ...s,
        historyError: { code: 'AlreadyReferenced', number: already.number },
        error: t(locale, 'refused'),
      }));
      return false;
    }
    const nextNumber =
      targetRecipe.referenceVersions.length > 0
        ? Math.max(...targetRecipe.referenceVersions.map((r) => r.number)) + 1
        : 1;
    const newRef = {
      number: nextNumber,
      version,
      ...(name !== undefined && name.trim() !== '' ? { name: name.trim() } : {}),
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({
      ...s,
      error: '',
      historyError: undefined,
      recipes: s.recipes.map((r) =>
        r.id === targetRecipe.id
          ? {
              ...r,
              referenceVersions: [...r.referenceVersions, newRef],
            }
          : r,
      ),
    }));
    return true;
  };
  return {
    state,
    setState,
    recipe,
    content,
    resolved,
    normalized,
    push,
    edit,
    cancel,
    save,
    apply,
    applyProcess,
    validity,
    pendingInput,
    setHydrationTarget,
    undo,
    redo,
    reset,
    select,
    create,
    weigh,
    start,
    selectSession,
    updateSession,
    abandonSession,
    finishSession,
    log,
    restoreRevision,
    promoteReferenceVersion,
    getActiveSessions: () => getActiveSessions(state),
    getRunningSession: (recipeId: string) => getRunningSession(state, recipeId),
  };
}
export type Prototype = ReturnType<typeof usePrototype>;
export function project(
  process: Process,
  at: string,
  facts?: Record<string, StepFact>,
  target?: string,
) {
  return projectProcess(process, {
    mode: target
      ? { kind: 'readyBy', at: instant(at), target }
      : { kind: 'startAt', at: instant(at) },
    ...(facts ? { facts } : {}),
  });
}
export function diagnosticContent(scenario: string, content: Content): Content {
  if (scenario === 'recipe') return content;
  const blank = blankRecipe();
  const formula: Formula = {
    ...blank.formula,
    ingredients: blank.formula.ingredients
      .map((i) => (i.yeast ? { ...i, bakerPct: scenario === 'valid' ? 0.33 : 3 } : i))
      .filter((i) => scenario !== 'noResult' || !i.yeast),
  };
  const process: Process = {
    ...blank.process,
    steps: blank.process.steps.map((s) =>
      ['bulk', 'proof', 'mix'].includes(s.operation)
        ? { ...s, conditions: { temperatureC: 21 } }
        : s,
    ),
  };
  return { formula, process, names: {} };
}
export function diagnosticFixture(scenario: string, content: Content) {
  const input = diagnosticContent(scenario, content);
  return estimateFermentation(input.formula, input.process);
}
export const stepTitle = (
  step: ProcessStep,
  locale: Locale,
  original: Process,
): string | undefined => {
  const originalLabel = original.steps.find((s) => s.id === step.id)?.label;
  return step.label && step.label !== originalLabel ? step.label : undefined;
};

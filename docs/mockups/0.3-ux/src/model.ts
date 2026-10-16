import { catalogText } from './template-presentation';
import { useCallback, useState } from 'react';
import {
  applyFormulaEdit,
  resolveFormula,
  validateProcess,
  projectProcess,
  parseInstant,
  estimateFermentation,
  type Formula,
  type FormulaEdit,
  type Process,
  type ProcessStep,
  type StepFact,
  type Instant,
} from '@flourprint/core/domain';
import { RECIPE_TEMPLATES, blankRecipe } from '@flourprint/core/application';
import { t, type Locale } from './messages';

export const clone = <T>(value: T): T => structuredClone(value);
export interface Content {
  formula: Formula;
  process: Process;
  name?: string;
  names: Record<string, string>;
}
export interface Recipe extends Content {
  id: string;
  templateId: string;
  version: number;
  revisions: Content[];
  trashed?: boolean;
}
export interface Draft {
  recipeId: string;
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
  checks: Record<string, string[]>;
  error: string;
  invalid: Record<string, boolean>;
  resetEpoch: number;
}
export const instant = (value: string | number): Instant => {
  const parsed = parseInstant(new Date(value).toISOString());
  if (!parsed.ok) throw new Error('Invalid time');
  return parsed.value;
};
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
      ? { recipeId: selected.id, history: [clone(selected)], index: 0 }
      : null;
  return {
    recipes,
    selected: selected.id,
    draft,
    session: makeSession(
      recipes[0],
      locale,
      parameters.get('prep') !== 'fresh',
      parameters.get('prep') === 'cooking',
    ),
    checks: {},
    error: '',
    invalid: {},
    resetEpoch: 0,
  };
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
  const edit = () =>
    setState((s) => ({
      ...s,
      error: '',
      invalid: {},
      draft: {
        recipeId: s.selected,
        history: [clone(s.recipes.find((r) => r.id === s.selected) ?? s.recipes[0])],
        index: 0,
      },
    }));
  const cancel = () => setState((s) => ({ ...s, error: '', invalid: {}, draft: null }));
  const apply = (command: FormulaEdit, names?: Record<string, string>): boolean => {
    if (!state.draft) return false;
    const result = applyFormulaEdit(content.formula, command);
    if (!result.ok) {
      setState((s) => ({ ...s, error: t(locale, 'refused') }));
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
    if (!state.draft || Object.values(state.invalid).some(Boolean)) return false;
    const formula = resolveFormula(content.formula),
      process = validateProcess(content.process);
    if (!formula.ok || !process.ok) {
      setState((s) => ({ ...s, error: t(locale, 'refused') }));
      return false;
    }
    setState((s) => ({
      ...s,
      draft: null,
      invalid: {},
      error: '',
      recipes: s.recipes.map((r) =>
        r.id === s.selected
          ? {
              ...r,
              ...clone(content),
              version: r.version + 1,
              revisions: [clone(r), ...r.revisions],
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
  const setHydrationTarget = (target: number): boolean => {
    const water = content.formula.ingredients.find((i) => i.kind === 'water')?.id ?? 'water';
    const locked = applyFormulaEdit(content.formula, {
      type: 'LockTotalWater',
      totalWaterPct: target,
      water,
    });
    if (!locked.ok) {
      setState((s) => ({ ...s, error: t(locale, 'refused') }));
      return false;
    }
    const unlocked = applyFormulaEdit(locked.value, { type: 'UnlockTotalWater' });
    if (!unlocked.ok) return false;
    push({ ...content, formula: unlocked.value });
    return true;
  };
  const undo = () =>
    setState((s) =>
      s.draft && s.draft.index > 0
        ? {
            ...s,
            invalid: {},
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
            resetEpoch: s.resetEpoch + 1,
            draft: { ...s.draft, index: s.draft.index + 1 },
          }
        : s,
    );
  const reset = () =>
    setState((s) =>
      s.draft
        ? {
            ...s,
            error: '',
            invalid: {},
            resetEpoch: s.resetEpoch + 1,
            draft: {
              ...s.draft,
              history: [clone(s.recipes.find((r) => r.id === s.selected) ?? s.recipes[0])],
              index: 0,
            },
          }
        : s,
    );
  const select = (id: string) => setState((s) => ({ ...s, selected: id, error: '', invalid: {} }));
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
    };
    setState((s) => ({
      ...s,
      recipes: [created, ...s.recipes],
      selected: created.id,
      invalid: {},
      draft: { recipeId: created.id, history: [clone(created)], index: 0 },
      error: '',
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
  const start = () => {
    if (state.draft) return false;
    setState((s) => ({ ...s, session: makeSession(recipe, locale) }));
    return true;
  };
  const updateSession = (fn: (session: Session) => Session) =>
    setState((s) => (s.session ? { ...s, session: fn(s.session) } : s));
  const log = (text: string) =>
    updateSession((s) => ({ ...s, journal: [{ at: instant(Date.now()), text }, ...s.journal] }));
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
    setHydrationTarget,
    undo,
    redo,
    reset,
    select,
    create,
    weigh,
    start,
    updateSession,
    log,
  };
}
export type Prototype = ReturnType<typeof usePrototype>;
export function project(process: Process, at: string, facts?: Record<string, StepFact>) {
  return projectProcess(process, {
    mode: { kind: 'startAt', at: instant(at) },
    ...(facts ? { facts } : {}),
  });
}
export function diagnosticFixture(scenario: string, content: Content) {
  if (scenario === 'recipe') return estimateFermentation(content.formula, content.process);
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
  return estimateFermentation(formula, process);
}
export const stepTitle = (
  step: ProcessStep,
  locale: Locale,
  original: Process,
): string | undefined => {
  const originalLabel = original.steps.find((s) => s.id === step.id)?.label;
  return step.label && step.label !== originalLabel ? step.label : undefined;
};

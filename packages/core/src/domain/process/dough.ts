import type { Formula } from '../formula/types.js';
import { COOKING_OPERATIONS, isCookingStep } from './cooking.js';
import { ancestors, descendants } from './reach.js';
import { componentIds, subjectOf } from './subject.js';
import type { Process, ProcessStep } from './types.js';

export { ancestors, descendants };

/**
 * Dough steps (fermentation.md): the first-contact step and every later `asap` step before the
 * first heat step, in process order, mixing and kneading steps included. A heat step is a cooking
 * operation (process.md): baking, boiling bagels or pretzels, frying, pan-cooking or grilling a
 * dough ends the fermentation.
 */
export const HEAT_OPERATIONS: readonly string[] = COOKING_OPERATIONS;

export const isHeatStep = (step: ProcessStep): boolean => isCookingStep(step);

/** The mixing steps (process.md, Mixing steps): `frasage` and `mix`. */
export const isMixingStep = (step: ProcessStep): boolean =>
  step.operation === 'frasage' || step.operation === 'mix';

/**
 * What the formula says about yeast and components, for the dough clock (process.md, First
 * contact). A process alone cannot tell a yeast from salt; callers that hold the formula pass this.
 */
export interface DoughContext {
  /** Ids of the dough ingredients marked as commercial yeast. */
  readonly yeastIngredients: ReadonlySet<string>;
  /** Ids of the components of kind `preferment` (poolish, biga, levain): leaven components. */
  readonly leavenComponents: ReadonlySet<string>;
  /** Ids of every component of the formula. */
  readonly components: ReadonlySet<string>;
}

export const doughContextOf = (
  formula: Pick<Formula, 'ingredients' | 'components'>,
): DoughContext => ({
  yeastIngredients: new Set(
    formula.ingredients.filter((i) => i.yeast !== undefined && i.role === 'dough').map((i) => i.id),
  ),
  leavenComponents: new Set(
    formula.components.filter((c) => c.kind === 'preferment').map((c) => c.id),
  ),
  components: new Set(formula.components.map((c) => c.id)),
});

const declaresIncorporations = (process: Process): boolean =>
  process.steps.some((s) => (s.incorporations ?? []).length > 0);

const isMainDough = (process: Process, step: ProcessStep, context?: DoughContext): boolean =>
  subjectOf(process, step, context?.components ?? componentIds(process)).kind === 'mainDough';

/**
 * The main-dough mixing steps (process.md, Mixing steps): the mixing steps whose subject is the
 * main dough, and, without an explicit subject, from the assembly on (the first mixing step with
 * incorporations); a process that declares none has every mixing step as a main-dough one.
 */
export const mainDoughMixingSteps = (process: Process, context?: DoughContext): ProcessStep[] => {
  const assembly = process.steps.find(
    (s) => isMixingStep(s) && s.subject === undefined && (s.incorporations ?? []).length > 0,
  );
  const assemblyIndex = assembly ? process.steps.indexOf(assembly) : 0;
  return process.steps.filter(
    (s, index) =>
      isMixingStep(s) &&
      isMainDough(process, s, context) &&
      (s.subject !== undefined || index >= assemblyIndex),
  );
};

/** The reference mixing step: the last main-dough mixing step (process.md). */
export const referenceMixingStep = (
  process: Process,
  context?: DoughContext,
): ProcessStep | undefined => mainDoughMixingSteps(process, context).at(-1);

/**
 * Whether a step brings yeast or leaven into the dough: the operation `fermentolyse`, or an
 * incorporation of a yeast-marked ingredient or of a leaven component. Without the formula, any
 * incorporation of an ingredient or a component counts (a superset, for process-only checks).
 */
const holdsYeast = (step: ProcessStep, context?: DoughContext): boolean =>
  step.operation === 'fermentolyse' ||
  (step.incorporations ?? []).some((i) => {
    if (i.item !== 'ingredient' && i.item !== 'component') return false;
    if (!(i.sharePct > 0)) return false;
    if (!context) return true;
    return i.item === 'ingredient'
      ? context.yeastIngredients.has(i.id)
      : context.leavenComponents.has(i.id);
  });

/**
 * The first-contact step of the main dough (process.md, First contact): in list order, the first
 * main-dough step that holds yeast or, when the process declares no incorporation at all, the
 * first main-dough mixing step. The dough clock starts at its start.
 */
export const firstContactStep = (
  process: Process,
  context?: DoughContext,
): ProcessStep | undefined => {
  const declared = declaresIncorporations(process);
  const mixing = declared ? [] : mainDoughMixingSteps(process, context);
  return process.steps.find(
    (s) =>
      isMainDough(process, s, context) &&
      (s.operation === 'fermentolyse' || (declared ? holdsYeast(s, context) : mixing.includes(s))),
  );
};

/**
 * The first heat step after the first contact, in process order; without one after it, the first
 * heat step of the process.
 */
export const firstHeatStep = (
  process: Process,
  context?: DoughContext,
): ProcessStep | undefined => {
  const start = firstContactStep(process, context);
  const after = start ? descendants(process, start.id) : undefined;
  return (
    process.steps.find((s) => isHeatStep(s) && (!after || after.has(s.id))) ??
    process.steps.find(isHeatStep)
  );
};

/**
 * The dough steps of a process, in process order, or undefined without a first-contact step: the
 * first-contact step and every later `asap` step before the first heat step. Without a heat step,
 * every `asap` step from the first contact counts.
 */
export const doughSteps = (process: Process, context?: DoughContext): ProcessStep[] | undefined => {
  const start = firstContactStep(process, context);
  if (!start) return undefined;
  const heat = firstHeatStep(process, context);
  const after = descendants(process, start.id);
  const before = heat ? ancestors(process, heat.id) : undefined;
  return process.steps.filter(
    (s) =>
      s.schedule === 'asap' &&
      (s === start || after.has(s.id)) &&
      s !== heat &&
      (!before || before.has(s.id)),
  );
};

/**
 * The steps between the reference mixing step and the first heat step (drafts.md, Fermentation
 * schedules): what a schedule replaces. The mixing and kneading steps are dough steps but never
 * part of it.
 */
export const stepsAfterReferenceMix = (
  process: Process,
  context?: DoughContext,
): ProcessStep[] | undefined => {
  const reference = referenceMixingStep(process, context);
  if (!reference) return undefined;
  const heat = firstHeatStep(process, context);
  const after = descendants(process, reference.id);
  const before = heat ? ancestors(process, heat.id) : undefined;
  return process.steps.filter(
    (s) => s.schedule === 'asap' && after.has(s.id) && s !== heat && (!before || before.has(s.id)),
  );
};

/** The dough step whose duration follows the model (`durationMode: 'model'`), if any. */
export const modelDrivenStep = (
  process: Process,
  context?: DoughContext,
): ProcessStep | undefined => doughSteps(process, context)?.find((s) => s.durationMode === 'model');

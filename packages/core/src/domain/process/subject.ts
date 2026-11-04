import type { Process, ProcessStep, Subject } from './types.js';

/**
 * The components a process names without its formula: the ids its steps incorporate and the
 * components of explicit subjects. Every formula component joins the dough exactly once
 * (Incorporations), so with incorporations these are the formula's components.
 */
export const componentIds = (process: Process): Set<string> =>
  new Set(
    process.steps.flatMap((s) => [
      ...(s.incorporations ?? []).flatMap((i) => (i.item === 'component' ? [i.id] : [])),
      ...(s.subject?.kind === 'component' ? [s.subject.id] : []),
    ]),
  );

/**
 * `subjectOf` (process.md): the step's explicit `subject`, else the component whose id is the
 * step's id, else the main dough. The components are the formula's when given, else the ids the
 * process incorporates.
 */
export const subjectOf = (
  process: Process,
  step: ProcessStep,
  components: ReadonlySet<string> = componentIds(process),
): Subject =>
  step.subject ??
  (components.has(step.id) ? { kind: 'component', id: step.id } : { kind: 'mainDough' });

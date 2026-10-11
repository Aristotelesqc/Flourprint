import {
  doughSteps,
  domainError,
  err,
  type DomainError,
  ok,
  validateProcess,
  type Process,
  type ProcessError,
  type ProcessStep,
  type Result,
} from '../../domain/index.js';
import { H, MIN } from './build.js';

/**
 * Fermentation schedules (drafts.md): presets for the dough steps between the mix and the first
 * heat step. Versioned data, like templates; a change of the data is a new version.
 */

export interface ScheduleStep {
  /** Preferred step id; `-2`, `-3`… is appended when a step that stays already uses it. */
  readonly id: string;
  readonly operation: string;
  readonly durationS?: number;
  /** In the fridge at 4 °C; otherwise at room temperature. */
  readonly cold?: boolean;
}

export interface FermentationSchedule {
  readonly id: string;
  readonly version: string;
  readonly steps: readonly ScheduleStep[];
}

const FRIDGE_C = 4;

export const FERMENTATION_SCHEDULES: readonly FermentationSchedule[] = [
  {
    id: 'bulk-proof',
    version: '1',
    steps: [
      { id: 'bulk', operation: 'bulk', durationS: 2 * H },
      { id: 'shape', operation: 'shape' },
      { id: 'proof', operation: 'proof', durationS: H },
    ],
  },
  {
    id: 'cold-bulk',
    version: '1',
    steps: [
      { id: 'bulk', operation: 'bulk', durationS: H },
      { id: 'cold-bulk', operation: 'retard', durationS: 18 * H, cold: true },
      { id: 'shape', operation: 'shape' },
      { id: 'proof', operation: 'proof', durationS: 2 * H },
    ],
  },
  {
    id: 'cold-proof',
    version: '1',
    steps: [
      { id: 'bulk', operation: 'bulk', durationS: 2 * H },
      { id: 'shape', operation: 'shape' },
      { id: 'cold-proof', operation: 'proof', durationS: 14 * H, cold: true },
    ],
  },
  {
    id: 'same-day-short',
    version: '1',
    steps: [
      { id: 'bulk', operation: 'bulk', durationS: H },
      { id: 'shape', operation: 'shape' },
      { id: 'proof', operation: 'proof', durationS: 45 * MIN },
    ],
  },
];

export type ApplyScheduleError = ProcessError | DomainError<'UnknownSchedule', { id: string }>;

const invalid = (path: string, reason: string): ApplyScheduleError =>
  domainError('InvalidProcess', `${path}: ${reason}`, { path, reason });

/** A step sits in the cold when it is in the fridge or below 10 °C (a cellar is not the fridge). */
const isCold = (step: ProcessStep) =>
  step.conditions?.location === 'fridge' ||
  (step.conditions?.temperatureC !== undefined && step.conditions.temperatureC < 10);

/**
 * Replaces the dough steps of a process with the schedule's steps (drafts.md, Fermentation
 * schedules): linked in order after the mix and before the steps that followed the replaced ones,
 * the last one model-driven. Folds of a replaced bulk go to the schedule's bulk. Refused
 * (`InvalidProcess`) without a mix step, or when a replaced step carries incorporations or a
 * technique other than folds.
 *
 * Temperatures: a cold step is at 4 °C in the fridge. A room step takes the room temperature of the
 * replaced steps when one of them has one; otherwise it has none and follows the steps before it,
 * except after a cold step, where it takes the mix step's temperature (the recipe's room
 * temperature) so the dough does not stay in the fridge.
 */
export const applySchedule = (
  process: Process,
  scheduleId: string,
): Result<Process, ApplyScheduleError> => {
  const schedule = FERMENTATION_SCHEDULES.find((s) => s.id === scheduleId);
  if (!schedule) {
    return err(
      domainError('UnknownSchedule', `unknown schedule ${scheduleId}`, { id: scheduleId }),
    );
  }
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return err(invalid('steps', 'a schedule needs a mix step'));
  const replaced = doughSteps(process) ?? [];
  for (const step of replaced) {
    const path = `steps[${process.steps.indexOf(step)}]`;
    if ((step.incorporations ?? []).length > 0) {
      return err(invalid(`${path}.incorporations`, 'a replaced step adds ingredients'));
    }
    const { folds: _folds, ...other } = step.technique ?? {};
    if (Object.keys(other).length > 0) {
      return err(invalid(`${path}.technique`, 'a replaced step has a technique other than folds'));
    }
  }

  const replacedIds = new Set(replaced.map((s) => s.id));
  const kept = process.steps.filter((s) => !replacedIds.has(s.id));
  const taken = new Set(kept.map((s) => s.id));
  const idFor = (preferred: string) => {
    let id = preferred;
    for (let n = 2; taken.has(id); n++) id = `${preferred}-${n}`;
    taken.add(id);
    return id;
  };
  const roomC = replaced.find((s) => !isCold(s) && s.conditions?.temperatureC !== undefined)
    ?.conditions?.temperatureC;
  const folds = replaced.find((s) => s.operation === 'bulk' && s.technique?.folds)?.technique
    ?.folds;
  const shapeS = replaced.find((s) => s.operation === 'shape')?.plannedDurationS;

  let previous = mix.id;
  let afterCold = false;
  let foldsPlaced = false;
  const chain: ProcessStep[] = schedule.steps.map((s, index) => {
    const id = idFor(s.id);
    const last = index === schedule.steps.length - 1;
    const temperatureC = s.cold
      ? FRIDGE_C
      : (roomC ?? (afterCold ? mix.conditions?.temperatureC : undefined));
    const durationS = s.durationS ?? (s.operation === 'shape' ? shapeS : undefined);
    const withFolds = folds !== undefined && !foldsPlaced && s.operation === 'bulk';
    if (withFolds) foldsPlaced = true;
    if (s.cold) afterCold = true;
    const step: ProcessStep = {
      id,
      operation: s.operation,
      dependsOn: [previous],
      schedule: 'asap',
      ...(durationS === undefined ? {} : { plannedDurationS: durationS }),
      ...(s.cold
        ? { conditions: { location: 'fridge', temperatureC: FRIDGE_C } }
        : temperatureC === undefined
          ? {}
          : { conditions: { temperatureC } }),
      ...(withFolds ? { technique: { folds } } : {}),
      ...(last ? { durationMode: 'model' as const } : {}),
    };
    previous = id;
    return step;
  });
  const lastId = previous;

  // The steps that followed the replaced ones (or the mix, when nothing was replaced) now follow
  // the schedule.
  const rewired = replacedIds.size > 0 ? replacedIds : new Set([mix.id]);
  const chainIds = new Set(chain.map((s) => s.id));
  const steps = kept.map((s) =>
    !chainIds.has(s.id) && s.dependsOn.some((d) => rewired.has(d))
      ? { ...s, dependsOn: [...new Set(s.dependsOn.map((d) => (rewired.has(d) ? lastId : d)))] }
      : s,
  );
  const first = replaced[0];
  const at =
    first === undefined
      ? steps.findIndex((s) => s.id === mix.id) + 1
      : process.steps.slice(0, process.steps.indexOf(first)).filter((s) => !replacedIds.has(s.id))
          .length;
  steps.splice(at, 0, ...chain);

  const next: Process = { ...process, steps };
  const valid = validateProcess(next);
  return valid.ok ? ok(next) : valid;
};

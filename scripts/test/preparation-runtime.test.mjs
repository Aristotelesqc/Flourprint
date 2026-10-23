import { describe, expect, it } from 'vitest';
import { RECIPE_TEMPLATES } from '@flourprint/core/application';
import {
  replayBake,
  heldSeconds,
  isStepHeld,
  visibleEvents,
  previousAction,
} from '@flourprint/core/domain';
import {
  createEngineBakeSession,
  dispatchEngineCommand,
  formatCountdownHHMMSS,
  formatStepAdjustment,
} from '../../docs/mockups/0.3-ux/src/preparation-runtime.ts';

const at = '2026-10-23T08:00:00.000Z';
const ended = '2026-10-23T09:00:00.000Z';
const recipe = RECIPE_TEMPLATES.find((entry) => entry.id === 'baguette');
const start = () => {
  const result = createEngineBakeSession('runtime-test', recipe.formula, recipe.process, at);
  expect(result.ok).toBe(true);
  return result.session;
};

describe('L127 prototype uses actual engine events', () => {
  it('starts with no fabricated step facts and round-trips through engine replay', () => {
    const session = start();
    expect(session.state.bakeId).toBe('runtime-test');
    expect(session.events.map((event) => event.payload.type)).toEqual(['BakeStarted']);
    for (const step of Object.values(session.state.steps)) {
      expect(step.startedAt).toBeUndefined();
      expect(step.endedAt).toBeUndefined();
      expect(step.measurements).toEqual([]);
    }
    expect(replayBake(session.bakeId, session.events)).toEqual(session.state);
  });

  it('Next records only the current completion, leaving the following start unrecorded', () => {
    const session = start();
    const first = recipe.process.steps[0];
    const following = recipe.process.steps.find((step) => step.dependsOn.includes(first.id));
    const result = dispatchEngineCommand(
      session,
      { type: 'CompleteStep', stepId: first.id, at: ended },
      ended,
    );
    expect(result.ok).toBe(true);
    expect(result.session.state.steps[first.id].endedAt).toBe(ended);
    expect(result.session.state.steps[following.id]?.startedAt).toBeUndefined();
    expect(
      result.newEvents
        .filter((event) => event.payload.type === 'StepStarted')
        .every((event) => event.payload.stepId === first.id),
    ).toBe(true);
    expect(session.events).toHaveLength(1);
    const retracted = dispatchEngineCommand(
      result.session,
      { type: 'RetractCompletion', targetEventId: result.session.state.steps[first.id].endEventId },
      ended,
    );
    expect(retracted.ok).toBe(true);
    expect(retracted.session.state.steps[first.id].endedAt).toBeUndefined();
    expect(retracted.session.events.some((event) => event.payload.type === 'StepCompleted')).toBe(
      true,
    );
    expect(retracted.session.events.at(-1).payload.type).toBe('StepCompletionRetracted');
  });

  it('a real following start blocks Previous and a refused command leaves all state intact', () => {
    const first = recipe.process.steps[0];
    const completed = dispatchEngineCommand(
      start(),
      { type: 'CompleteStep', stepId: first.id, at: ended },
      ended,
    );
    expect(completed.ok).toBe(true);
    const next = recipe.process.steps.find((step) => step.dependsOn.includes(first.id));
    const started = dispatchEngineCommand(
      completed.session,
      { type: 'StartStep', stepId: next.id, at: ended },
      ended,
    );
    expect(started.ok).toBe(true);
    const before = structuredClone(started.session);
    const result = dispatchEngineCommand(
      started.session,
      {
        type: 'RetractCompletion',
        targetEventId: completed.session.state.steps[first.id].endEventId,
      },
      ended,
    );
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('DependentStepStarted');
    expect(started.session).toEqual(before);
    expect(replayBake(started.session.bakeId, started.session.events)).toEqual(
      started.session.state,
    );
  });

  it('displays accumulated zero as +0 and the actual clamped adjustment', () => {
    expect(formatStepAdjustment(600, 600, 'fr')).toBe('Ajustement : +0 min');
    expect(formatStepAdjustment(0, 600, 'en')).toBe('Adjustment: -10 min');
  });

  it('a countdown hold survives replay and releases through native commands', () => {
    const first = recipe.process.steps[0];
    const started = dispatchEngineCommand(start(), { type: 'StartStep', stepId: first.id, at }, at);
    expect(started.ok).toBe(true);
    const heldAt = '2026-10-23T08:01:00.000Z';
    const releasedAt = '2026-10-23T08:06:00.000Z';
    const hold = dispatchEngineCommand(
      started.session,
      { type: 'HoldStepCountdown', stepId: first.id },
      heldAt,
    );
    expect(hold.ok).toBe(true);
    expect(isStepHeld(hold.session.state, first.id)).toBe(true);
    const replay = replayBake(hold.session.bakeId, hold.session.events);
    expect(replay).toEqual(hold.session.state);
    expect(heldSeconds(replay.steps[first.id], releasedAt)).toBe(300);
    const release = dispatchEngineCommand(
      hold.session,
      { type: 'ReleaseStepCountdown', stepId: first.id },
      releasedAt,
    );
    expect(release.ok).toBe(true);
    expect(isStepHeld(release.session.state, first.id)).toBe(false);
    expect(heldSeconds(release.session.state.steps[first.id], ended)).toBe(300);
  });

  it('visible history hides only the retracted pair and preserves the technical events', () => {
    const first = recipe.process.steps[0];
    const completion = dispatchEngineCommand(
      start(),
      { type: 'CompleteStep', stepId: first.id, at: ended },
      ended,
    );
    expect(completion.ok).toBe(true);
    const action = previousAction(completion.session.state, first.id);
    expect(action.kind).toBe('retract');
    const retraction = dispatchEngineCommand(
      completion.session,
      { type: 'RetractCompletion', targetEventId: action.targetEventId },
      ended,
    );
    expect(retraction.ok).toBe(true);
    const visible = visibleEvents(retraction.session.events);
    expect(
      visible.some((event) =>
        ['StepCompleted', 'StepCompletionRetracted'].includes(event.payload.type),
      ),
    ).toBe(false);
    expect(retraction.session.events.some((event) => event.payload.type === 'StepCompleted')).toBe(
      true,
    );
    expect(
      retraction.session.events.some((event) => event.payload.type === 'StepCompletionRetracted'),
    ).toBe(true);
  });

  it('never describes an unknown countdown as a known zero', () => {
    expect(formatCountdownHHMMSS(600)).toBe('00:10:00');
    expect(formatCountdownHHMMSS(0)).toBe('00:00:00');
    expect(formatCountdownHHMMSS(undefined)).not.toBe('00:00:00');
  });
});

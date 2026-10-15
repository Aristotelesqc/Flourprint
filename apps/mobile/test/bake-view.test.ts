import { describe, expect, it } from 'vitest';
import { MemoryBakeEventStore } from '@flourprint/adapters/memory';
import { executeBakeCommand } from '@flourprint/core/application';
import type { BakeCommandPayload, BakeState, Instant, Process } from '@flourprint/core/domain';
import { bakeAlerts, bakeLog, bakeView, foldStatus, stepProgress } from '../src/services/bake-view';
import { defaultCategory, noteSteps } from '../src/services/notes';
import { reminderId, remindersFor } from '../src/services/notifications';
import { sampleRecipe } from './fixtures/sample-recipe';

const at = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;

/** Runs commands at the given times on a fresh bake of the sample recipe (#17). */
const bake = async (
  commands: [string, BakeCommandPayload][],
  process: Process = sampleRecipe.process,
): Promise<BakeState> => {
  const store = new MemoryBakeEventStore();
  let n = 0;
  let state: BakeState | undefined;
  const ref = { id: sampleRecipe.id, version: 1 };
  const all: [string, BakeCommandPayload][] = [
    [
      '19:00',
      {
        type: 'StartBake',
        revisions: { formula: ref, process: ref },
        formula: sampleRecipe.formula,
        process,
        mode: { kind: 'startAt', at: at('19:00') },
      },
    ],
    ...commands,
  ];
  for (const [time, payload] of all) {
    const result = await executeBakeCommand(
      { store, clock: { now: () => at(time) }, ids: { next: () => `e${++n}` } },
      {
        commandId: `c${n}`,
        bakeId: 'b',
        expectedVersion: state?.version ?? 0,
        issuedAt: at(time),
        payload,
      },
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    state = result.value.state;
  }
  return state as BakeState;
};

describe('bake view', () => {
  it('focuses on the first step that can start, before anything runs', async () => {
    const view = bakeView(await bake([]), at('19:00'));
    expect(view?.focus).toMatchObject({ step: { id: 'poolish' }, running: false });
    expect(view?.position).toBe(1);
    expect(view?.total).toBe(9);
  });

  it('focuses on the running step and lists what comes next', async () => {
    const state = await bake([['19:01', { type: 'StartStep', stepId: 'poolish' }]]);
    const view = bakeView(state, at('20:00'));
    expect(view?.focus).toMatchObject({ step: { id: 'poolish' }, running: true });
    // The scald is planned as late as possible, just before the mix.
    expect(view?.next.map((v) => v.step.id)).toEqual(['tangzhong', 'mix', 'bulk']);
  });

  it('keeps a parallel running step apart from the focus', async () => {
    const state = await bake([
      ['19:01', { type: 'StartStep', stepId: 'poolish' }],
      ['19:02', { type: 'StartStep', stepId: 'preheat' }],
    ]);
    const view = bakeView(state, at('19:30'));
    expect(view?.focus?.step.id).toBe('preheat');
    expect(view?.alsoRunning.map((v) => v.step.id)).toEqual(['poolish']);
  });

  it('logs starts, completions and notes, newest first', async () => {
    const state = await bake([
      ['19:01', { type: 'StartStep', stepId: 'poolish' }],
      ['19:05', { type: 'AddObservation', category: 'other', text: 'dough at 24 °C' }],
    ]);
    expect(bakeLog(state).map((e) => e.kind)).toEqual(['note', 'started']);
  });

  it('logs a dough ready mark with its stage, criterion and text', async () => {
    const state = await bake([
      ['19:01', { type: 'CompleteStep', stepId: 'poolish' }],
      ['19:02', { type: 'CompleteStep', stepId: 'tangzhong' }],
      ['19:03', { type: 'CompleteStep', stepId: 'mix' }],
      ['19:04', { type: 'StartStep', stepId: 'bulk' }],
      [
        '19:05',
        {
          type: 'AddObservation',
          stepId: 'bulk',
          category: 'fermentation',
          kind: 'doughReady',
          criterion: 'poke',
          text: 'springs back slowly',
        },
      ],
    ]);
    expect(bakeLog(state)[0]).toEqual({
      at: at('19:05'),
      kind: 'doughReady',
      stepId: 'bulk',
      stage: 'shape',
      criterion: 'poke',
      text: 'springs back slowly',
    });
  });

  it('offers the preheat that becomes due while the proof runs', async () => {
    const state = await bake([
      ['19:00', { type: 'CompleteStep', stepId: 'poolish' }],
      ['19:01', { type: 'CompleteStep', stepId: 'tangzhong' }],
      ['19:02', { type: 'CompleteStep', stepId: 'mix' }],
      ['19:03', { type: 'CompleteStep', stepId: 'bulk' }],
      ['19:04', { type: 'CompleteStep', stepId: 'shape' }],
      ['19:05', { type: 'StartStep', stepId: 'proof' }],
    ]);
    // Proof ends at 21:05; the preheat (1 h, as late as possible) is planned from 20:05.
    const view = bakeView(state, at('20:10'));
    expect(view?.focus).toMatchObject({ step: { id: 'proof' }, running: true });
    expect(view?.due.map((v) => v.step.id)).toEqual(['preheat']);
    expect(view?.next.map((v) => v.step.id)).not.toContain('preheat');
  });
});

describe('step progress (audit C6 of 15e52e3)', () => {
  it('stays a number for an instantaneous step', () => {
    expect(stepProgress(1000, 1000, 1000)).toBe(1);
    expect(stepProgress(1000, 1000, 999)).toBe(0);
  });

  it('is clamped to [0, 1] for future and overdue steps', () => {
    expect(stepProgress(1000, 2000, 500)).toBe(0);
    expect(stepProgress(1000, 2000, 1500)).toBe(0.5);
    expect(stepProgress(1000, 2000, 9000)).toBe(1);
    expect(stepProgress(Number.NaN, 2000, 1500)).toBe(0);
  });
});

describe('notes', () => {
  it('offers running steps first, then done ones, then the rest', async () => {
    const state = await bake([
      ['19:01', { type: 'CompleteStep', stepId: 'preheat' }],
      ['19:02', { type: 'StartStep', stepId: 'poolish' }],
    ]);
    expect(noteSteps(state).slice(0, 3)).toEqual(['poolish', 'preheat', 'tangzhong']);
  });

  it('starts a note in the category of its step, and in crumb after the end', async () => {
    const state = await bake([]);
    expect(defaultCategory(state, 'poolish')).toBe('fermentation');
    expect(defaultCategory(state, 'mix')).toBe('handling');
    expect(defaultCategory(state, 'bake')).toBe('crust');
    expect(defaultCategory(state, undefined)).toBe('other');
    const ended = await bake([['19:05', { type: 'AbandonBake' }]]);
    expect(defaultCategory(ended, undefined)).toBe('crumb');
  });

  it('logs a rating-only review note', async () => {
    const state = await bake([
      ['19:05', { type: 'AbandonBake' }],
      ['20:00', { type: 'AddObservation', category: 'crumb', rating: 3 }],
    ]);
    expect(bakeLog(state)[0]).toEqual({ at: at('20:00'), kind: 'note', rating: 3 });
  });
});

describe('bake alerts', () => {
  it('calls at the end of running steps and the planned start of ready ones, soonest first', async () => {
    const state = await bake([['19:01', { type: 'StartStep', stepId: 'poolish' }]]);
    const alerts = bakeAlerts(state, at('19:30'));
    // The scald is planned as late as possible: it starts an hour before the preferment ends.
    expect(alerts.map((a) => [a.kind, a.stepId, a.at.slice(11, 16)])).toEqual([
      ['start', 'tangzhong', '06:01'],
      ['end', 'poolish', '07:01'],
      ['start', 'preheat', expect.any(String)],
    ]);
  });

  it('is empty once the bake has ended', async () => {
    expect(bakeAlerts(await bake([['19:05', { type: 'AbandonBake' }]]), at('19:30'))).toEqual([]);
  });
});

describe('reminders', () => {
  const texts = {
    title: (alert: { kind: string }, step: string) => `${alert.kind} ${step}`,
    body: (_alert: unknown, step: string, recipe: string) => `${recipe}: ${step}`,
  };

  it('schedules the future moments of every active bake, with stable ids', async () => {
    const state = await bake([['19:01', { type: 'StartStep', stepId: 'poolish' }]]);
    const reminders = remindersFor([{ state, recipe: 'Pain' }], at('19:30'), (_s, id) => id, texts);
    expect(reminders.map((r) => r.title)).toEqual([
      'start tangzhong',
      'end poolish',
      'start preheat',
    ]);
    expect(reminders[1]).toMatchObject({ body: 'Pain: poolish', bakeId: 'b' });
    expect(reminders[1]?.id).toBe(reminderId('b:end:poolish'));
    // Moments already past are not scheduled.
    const later = remindersFor([{ state }], at('23:59'), (_s, id) => id, texts);
    expect(later.every((r) => Date.parse(r.at) > Date.parse(at('23:59')))).toBe(true);
  });

  it('makes positive 31-bit ids', () => {
    for (const key of ['a', 'b:end:poolish', 'x'.repeat(200)]) {
      const id = reminderId(key);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThan(2 ** 31);
      expect(Number.isInteger(id)).toBe(true);
    }
    expect(reminderId('b:end:poolish')).not.toBe(reminderId('b:start:poolish'));
  });
});

describe('fold sets (bake-session.md)', () => {
  const withFolds: Process = {
    steps: sampleRecipe.process.steps.map((s) =>
      s.id === 'bulk' ? { ...s, technique: { folds: { count: 3, intervalS: 20 * 60 } } } : s,
    ),
  };
  const toBulk: [string, BakeCommandPayload][] = [
    ['19:01', { type: 'CompleteStep', stepId: 'tangzhong' }],
    ['19:02', { type: 'CompleteStep', stepId: 'poolish' }],
    ['19:03', { type: 'CompleteStep', stepId: 'mix' }],
    ['19:10', { type: 'StartStep', stepId: 'bulk' }],
  ];
  const fold = (set: number): BakeCommandPayload => ({
    type: 'AddObservation',
    stepId: 'bulk',
    category: 'handling',
    kind: 'fold',
    set,
  });

  it('gives the next set due from the recorded start', async () => {
    const state = await bake([...toBulk, ['19:31', fold(1)]], withFolds);
    expect(foldStatus(state, 'bulk')).toEqual({
      count: 3,
      done: [1],
      next: { set: 2, at: at('19:50') },
    });
    expect(foldStatus(state, 'mix')).toBeUndefined();
    const all = await bake(
      [...toBulk, ['19:31', fold(1)], ['19:40', fold(3)], ['19:41', fold(2)]],
      withFolds,
    );
    expect(foldStatus(all, 'bulk')).toEqual({ count: 3, done: [1, 2, 3] });
  });

  it('reminds each set not recorded yet, and logs the recorded ones', async () => {
    const state = await bake([...toBulk, ['19:31', fold(1)]], withFolds);
    const folds = bakeAlerts(state, at('19:35')).filter((a) => a.kind === 'fold');
    expect(folds).toEqual([
      { stepId: 'bulk', kind: 'fold', at: at('19:50'), set: 2, count: 3 },
      { stepId: 'bulk', kind: 'fold', at: at('20:10'), set: 3, count: 3 },
    ]);
    expect(bakeLog(state)[0]).toEqual({
      at: at('19:31'),
      kind: 'fold',
      stepId: 'bulk',
      set: 1,
      count: 3,
    });
    const texts = {
      title: (alert: { kind: string; set?: number }, step: string) =>
        `${alert.kind}${alert.set ?? ''} ${step}`,
      body: (_alert: unknown, step: string) => step,
    };
    const reminders = remindersFor([{ state }], at('19:35'), (_s, id) => id, texts);
    expect(reminders.filter((r) => r.title.startsWith('fold')).map((r) => r.id)).toEqual([
      reminderId('b:fold2:bulk'),
      reminderId('b:fold3:bulk'),
    ]);
  });
});

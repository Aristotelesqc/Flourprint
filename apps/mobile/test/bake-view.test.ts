import { describe, expect, it } from 'vitest';
import { MemoryBakeEventStore } from '@flourprint/adapters/memory';
import { executeBakeCommand } from '@flourprint/core/application';
import type { BakeCommandPayload, BakeState, Instant } from '@flourprint/core/domain';
import { bakeLog, bakeView } from '../src/services/bake-view';
import { sampleRecipe } from '../src/services/seed';

const at = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;

/** Runs commands at the given times on a fresh bake of the sample recipe (#17). */
const bake = async (commands: [string, BakeCommandPayload][]): Promise<BakeState> => {
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
        process: sampleRecipe.process,
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
});

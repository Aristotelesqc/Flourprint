import { describe, expect, it } from 'vitest';
import { checkBakeLog } from '../src/application/backup-events.js';
import { decodeFormula, decodeProcess } from '../src/application/documents.js';
import { parseFormula } from '../src/contracts/formula.js';
import {
  applyFormulaEdit,
  decide,
  evolve,
  initialBakeState,
  upcastEvent,
  type AcceptedSuggestion,
  type BakeCommandPayload,
  type BakeEvent,
  type BakeState,
  type Formula,
  type FormulaEdit,
  type Instant,
  type Process,
} from '../src/domain/index.js';
import { estimateFermentation } from '../src/domain/fermentation/index.js';

/** Provenance of applied model suggestions (fermentation.md) and the "dough ready" observation. */
const model = { id: 'flourprint.commercial-yeast', version: '0.1.0' };
const suggestion = (value: number): AcceptedSuggestion => ({
  estimate: {
    status: 'ok',
    value: value + 0.0004,
    range: [
      { kind: 'finite', value: value / 2 },
      { kind: 'beyondHorizon', horizonS: 1814400 },
    ],
    model,
    assumptions: ['dough_temperature_from_ambient'],
  },
  appliedValue: value,
  model,
});

const tolerance = { status: 'known', valuePct: 0 } as const;
const formula: Formula = {
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 65, role: 'dough' },
    { id: 'salt', kind: 'other', bakerPct: 2, role: 'dough', water: tolerance },
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: 0.5,
      role: 'dough',
      water: tolerance,
      yeast: { form: 'instant' },
    },
  ],
  components: [
    {
      id: 'poolish',
      kind: 'preferment',
      flourPct: 20,
      flourBlend: [{ flour: 'flour', sharePct: 100 }],
      hydrationPct: 100,
      allocations: [{ ingredient: 'yeast', bakerPct: 0.1 }],
    },
  ],
  anchor: { kind: 'flourTotal', grams: 1000 },
};
const process: Process = {
  steps: [
    {
      id: 'poolish',
      operation: 'preferment',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 3600,
    },
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: ['poolish'],
      schedule: 'asap',
      plannedDurationS: 600,
    },
    { id: 'bulk', operation: 'bulk', dependsOn: ['mix'], schedule: 'asap', plannedDurationS: 7200 },
    {
      id: 'proof',
      operation: 'proof',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 3600,
    },
  ],
};

const apply = (f: Formula, edit: FormulaEdit): Formula => {
  const next = applyFormulaEdit(f, edit);
  if (!next.ok) throw new Error(JSON.stringify(next.error));
  return next.value;
};
const yeast = (f: Formula) => f.ingredients.find((i) => i.id === 'yeast');

describe('accepted suggestions on the formula', () => {
  it('records the provenance with the applied dose and drops it on any other edit', () => {
    const accepted = suggestion(0.35);
    const applied = apply(formula, {
      type: 'SetBakerPct',
      ingredient: 'yeast',
      pct: 0.35,
      accepted,
    });
    expect(yeast(applied)).toMatchObject({ bakerPct: 0.35, accepted });
    // Unrelated edits keep it (including grams edits that rewrite every percentage).
    const salted = apply(applied, { type: 'SetBakerPct', ingredient: 'salt', pct: 2.2 });
    expect(yeast(salted)?.accepted).toEqual(accepted);
    const grams = apply(applied, { type: 'SetIngredientGrams', ingredient: 'salt', grams: 22 });
    expect(yeast(grams)?.accepted).toEqual(accepted);
    // A typed percentage (even the same number) or a grams edit of the yeast removes it.
    expect(
      yeast(apply(applied, { type: 'SetBakerPct', ingredient: 'yeast', pct: 0.35 })),
    ).not.toHaveProperty('accepted');
    expect(
      yeast(apply(applied, { type: 'SetBakerPct', ingredient: 'yeast', pct: 0.4 })),
    ).not.toHaveProperty('accepted');
    const regrammed = apply(applied, { type: 'SetIngredientGrams', ingredient: 'yeast', grams: 5 });
    expect(yeast(regrammed)).not.toHaveProperty('accepted');
  });

  it('records and drops the provenance of a preferment yeast allocation', () => {
    const accepted = suggestion(0.12);
    const applied = apply(formula, {
      type: 'UpdateComponent',
      component: 'poolish',
      changes: { allocations: [{ ingredient: 'yeast', bakerPct: 0.12, accepted }] },
    });
    expect(applied.components[0]?.allocations?.[0]?.accepted).toEqual(accepted);
    const typed = apply(applied, {
      type: 'UpdateComponent',
      component: 'poolish',
      changes: { allocations: [{ ingredient: 'yeast', bakerPct: 0.2 }] },
    });
    expect(typed.components[0]?.allocations?.[0]).not.toHaveProperty('accepted');
    const stale = apply(applied, {
      type: 'UpdateComponent',
      component: 'poolish',
      changes: { allocations: [{ ingredient: 'yeast', bakerPct: 0.2, accepted }] },
    });
    expect(stale.components[0]?.allocations?.[0]).not.toHaveProperty('accepted');
  });
});

const T = '2026-10-10T08:00:00.000Z' as Instant;
const start = (f: Formula, p: Process) =>
  decide(
    initialBakeState('b'),
    {
      type: 'StartBake',
      revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
      formula: f,
      process: p,
      mode: { kind: 'startAt', at: T },
    },
    T,
  );

describe('StartBake copies accepted decisions', () => {
  it('replaces the blanket estimate of accepted steps and lists each model once', () => {
    const acceptedBulk = suggestion(7200);
    const decided = {
      ...formula,
      ingredients: formula.ingredients.map((i) =>
        i.id === 'yeast' ? { ...i, accepted: suggestion(0.5) } : i,
      ),
    };
    const proc: Process = {
      steps: process.steps.map((s) =>
        s.id === 'bulk'
          ? { ...s, accepted: acceptedBulk }
          : s.id === 'proof'
            ? { ...s, accepted: suggestion(1800) } // no longer the planned 3600: ignored
            : s,
      ),
    };
    const result = start(decided, proc);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const payload = result.value[0]?.payload;
    if (payload?.type !== 'BakeStarted') throw new Error('no snapshot');
    const { estimates, manifest } = payload.snapshot;
    expect(estimates.bulk).toEqual(acceptedBulk.estimate);
    expect(estimates.proof).toMatchObject({
      status: 'unsupported',
      reason: 'no_fermentation_model',
    });
    expect(estimates.mix).toMatchObject({ status: 'unsupported' });
    expect(manifest.models).toEqual([model]);
    expect(payload.snapshot.process.steps.find((s) => s.id === 'bulk')?.accepted).toEqual(
      acceptedBulk,
    );
  });

  it('keeps today’s behavior without accepted decisions', () => {
    const result = start(formula, process);
    if (!result.ok) throw new Error('refused');
    const payload = result.value[0]?.payload;
    if (payload?.type !== 'BakeStarted') throw new Error('no snapshot');
    expect(payload.snapshot.manifest.models).toEqual([]);
    expect(Object.values(payload.snapshot.estimates).every((e) => e.status === 'unsupported')).toBe(
      true,
    );
  });
});

const event = (seq: number, payload: BakeEvent['payload']): BakeEvent => ({
  eventId: `e${seq}`,
  bakeId: 'b',
  seq,
  causationId: `c${seq}`,
  occurredAt: T,
  recordedAt: T,
  schemaVersion: 1,
  payload,
});
const started = (proc: Process): BakeEvent => {
  const result = start(formula, proc);
  if (!result.ok) throw new Error('refused');
  return event(1, result.value[0]?.payload as BakeEvent['payload']);
};

describe('estimate ranges in stored snapshots', () => {
  it('upcasts numeric bounds of older snapshots and keeps portable ones', () => {
    const base = started(process);
    const payload = base.payload;
    if (payload.type !== 'BakeStarted') throw new Error('no snapshot');
    const legacy = {
      ...base,
      payload: {
        ...payload,
        snapshot: {
          ...payload.snapshot,
          estimates: {
            bulk: { status: 'ok', value: 5, range: [4, null], model, assumptions: [] },
            proof: { ...suggestion(1).estimate, range: [{ kind: 'finite', value: 2 }, 9] },
          },
        },
      },
    } as unknown as BakeEvent;
    const upcast = upcastEvent(legacy);
    if (!upcast.ok || upcast.value.payload.type !== 'BakeStarted') throw new Error('refused');
    const { bulk, proof } = upcast.value.payload.snapshot.estimates;
    expect(bulk).toMatchObject({
      range: [
        { kind: 'finite', value: 4 },
        { kind: 'beyondHorizon', horizonS: 1814400 },
      ],
    });
    expect(proof).toMatchObject({
      range: [
        { kind: 'finite', value: 2 },
        { kind: 'finite', value: 9 },
      ],
    });
    // Backups of older bakes are checked after the upcast and stay readable.
    expect(() => checkBakeLog('b', [upcast.value])).not.toThrow();
  });

  it('refuses a malformed bound or a malformed accepted decision in a backup log', () => {
    const base = started(process);
    const payload = base.payload;
    if (payload.type !== 'BakeStarted') throw new Error('no snapshot');
    const withEstimate = (estimate: unknown) =>
      ({
        ...base,
        payload: {
          ...payload,
          snapshot: { ...payload.snapshot, estimates: { bulk: estimate } },
        },
      }) as unknown as BakeEvent;
    const good = { ...suggestion(1).estimate };
    expect(() => checkBakeLog('b', [withEstimate(good)])).not.toThrow();
    for (const range of [
      [{ kind: 'finite' }, { kind: 'finite', value: 1 }],
      [{ kind: 'x' }, { kind: 'x' }],
      [1],
    ]) {
      expect(() => checkBakeLog('b', [withEstimate({ ...good, range })])).toThrow();
    }
  });
});

describe('structural decoders and schema', () => {
  const accepted = suggestion(0.35);
  const withAccepted: Formula = {
    ...formula,
    ingredients: formula.ingredients.map((i) => (i.id === 'yeast' ? { ...i, accepted } : i)),
    components: formula.components.map((c) => ({
      ...c,
      allocations: (c.allocations ?? []).map((a) => ({ ...a, accepted })),
    })),
  };

  it('accept the new optional fields', () => {
    expect(() => decodeFormula(withAccepted, 'f')).not.toThrow();
    expect(parseFormula(withAccepted).ok).toBe(true);
    const proc: Process = {
      steps: process.steps.map((s) => (s.id === 'bulk' ? { ...s, accepted: suggestion(7200) } : s)),
    };
    expect(() => decodeProcess(proc, 'p')).not.toThrow();
  });

  it('refuse malformed ones', () => {
    const broken = (patch: Record<string, unknown>) => ({
      ...withAccepted,
      ingredients: withAccepted.ingredients.map((i) =>
        i.id === 'yeast' ? { ...i, accepted: { ...accepted, ...patch } } : i,
      ),
    });
    const noValue = { ...accepted, estimate: { ...accepted.estimate, value: 'x' } };
    for (const patch of [
      { appliedValue: 'x' },
      { model: { id: 'm' } },
      { extra: 1 },
      { estimate: { ...accepted.estimate, status: 'unsupported' } },
      { estimate: noValue.estimate },
      { estimate: { ...accepted.estimate, range: [1, 2] } },
      { estimate: { ...accepted.estimate, range: [{ kind: 'finite', value: 1 }] } },
    ]) {
      expect(() => decodeFormula(broken(patch), 'f')).toThrow();
      expect(parseFormula(broken(patch)).ok).toBe(false);
    }
    const badStep: unknown = {
      steps: [{ ...process.steps[0], accepted: { appliedValue: 1 } }],
    };
    expect(() => decodeProcess(badStep, 'p')).toThrow();
  });

  it('are consistent with the engine output', () => {
    const duration = estimateFermentation(formula, {
      steps: process.steps.map((st) =>
        st.id === 'mix' ? { ...st, conditions: { temperatureC: 21 } } : st,
      ),
    }).dough.duration;
    if (duration.status !== 'ok') throw new Error('no estimate');
    const step = {
      ...(process.steps[2] as object),
      accepted: { estimate: duration, appliedValue: 1, model },
    };
    expect(() => decodeProcess({ steps: [step] }, 'p')).not.toThrow();
  });
});

describe('dough ready observation', () => {
  const active = (): BakeState => {
    const first = started(process);
    return evolve(initialBakeState('b'), first);
  };
  const decideOne = (payload: BakeCommandPayload) => decide(active(), payload, T);

  it('is an ordinary observation with a stable kind, a step and a criterion', () => {
    const result = decideOne({
      type: 'AddObservation',
      stepId: 'bulk',
      category: 'fermentation',
      kind: 'doughReady',
      criterion: 'poke',
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value).toEqual([
      {
        occurredAt: T,
        payload: {
          type: 'ObservationAdded',
          stepId: 'bulk',
          category: 'fermentation',
          kind: 'doughReady',
          criterion: 'poke',
        },
      },
    ]);
    const state = evolve(active(), event(2, result.value[0]?.payload as BakeEvent['payload']));
    // It never ends the step.
    expect(state.observations).toHaveLength(1);
    expect(state.steps.bulk?.endedAt).toBeUndefined();
    expect(() =>
      checkBakeLog('b', [
        started(process),
        event(2, result.value[0]?.payload as BakeEvent['payload']),
      ]),
    ).not.toThrow();
  });

  it('needs a step and the fermentation category', () => {
    expect(
      decideOne({ type: 'AddObservation', category: 'fermentation', kind: 'doughReady' }).ok,
    ).toBe(false);
    expect(
      decideOne({ type: 'AddObservation', stepId: 'bulk', category: 'other', kind: 'doughReady' })
        .ok,
    ).toBe(false);
  });

  it('is refused by the backup decoder when malformed', () => {
    const bad = event(2, {
      type: 'ObservationAdded',
      category: 'fermentation',
      kind: 'doughReady',
    });
    expect(() => checkBakeLog('b', [started(process), bad])).toThrow();
  });
});

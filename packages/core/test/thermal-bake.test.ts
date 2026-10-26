import { describe, expect, it } from 'vitest';
import { checkBakeLog } from '../src/application/backup-events.js';
import {
  calibrateStepThermal,
  decide,
  effectiveThermal,
  estimateFermentation,
  evolve,
  initialBakeState,
  liveDoughForecast,
  MODEL_END_POINT,
  replayBake,
  thermalSegments,
  volumeCueValid,
  volumeCueValidInPlan,
  type BakeCommandPayload,
  type BakeEvent,
  type BakeState,
  type Estimate,
  type Formula,
  type Instant,
  type Process,
  type ProcessStep,
  type StepThermal,
} from '../src/domain/index.js';

const H = 3600;
const known = { status: 'known', valuePct: 0 } as const;
const formula = (yeastPct: number, grams = 2000): Formula => ({
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 65, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: known,
      fat: known,
      sugar: known,
    },
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: yeastPct,
      role: 'dough',
      water: known,
      fat: known,
      sugar: known,
      yeast: { form: 'fresh' },
    },
  ],
  components: [],
  anchor: { kind: 'doughWeight', grams },
});

const bowl: StepThermal = {
  geometry: 'bulk',
  container: { material: 'glass', cover: 'lid' },
  environment: 'roomStill',
  porosity: 'unproofed',
};
const fridgeBowl: StepThermal = { ...bowl, environment: 'fridgeStatic' };

const step = (id: string, over: Partial<ProcessStep>): ProcessStep => ({
  id,
  operation: 'bulk',
  dependsOn: [],
  schedule: 'asap',
  ...over,
});
/** mix, a bulk in a bowl on the counter (2 h), then the fridge, whose time the model solves. */
const process_: Process = {
  steps: [
    step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 24 } }),
    step('bulk', {
      dependsOn: ['mix'],
      plannedDurationS: 2 * H,
      conditions: { temperatureC: 24 },
      thermal: bowl,
    }),
    step('cold', {
      dependsOn: ['bulk'],
      conditions: { temperatureC: 4, location: 'fridge' },
      thermal: fridgeBowl,
    }),
    step('bake', { operation: 'bake', dependsOn: ['cold'], plannedDurationS: 2400 }),
  ],
};

const t = (hhmm: string) => `2026-10-10T${hhmm}:00.000Z` as Instant;

class Log {
  events: BakeEvent[] = [];
  state = initialBakeState('b');
  now = t('08:00');
  run(payload: BakeCommandPayload) {
    const result = decide(this.state, payload, this.now);
    if (!result.ok) return result;
    for (const draft of result.value) {
      const seq = this.events.length + 1;
      const event: BakeEvent = {
        eventId: `e${seq}`,
        bakeId: 'b',
        seq,
        causationId: `c${seq}`,
        occurredAt: draft.occurredAt,
        recordedAt: this.now,
        schemaVersion: 1,
        payload: draft.payload,
      };
      this.events.push(event);
      this.state = evolve(this.state, event);
    }
    return result;
  }
  ok(payload: BakeCommandPayload) {
    const r = this.run(payload);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.value;
  }
  at(time: string) {
    this.now = t(time);
    return this;
  }
  reading(stepId: string, tempC: number, position: 'core' | 'surface' | 'unknown', at = this.now) {
    return this.run({
      type: 'AddObservation',
      stepId,
      category: 'fermentation',
      kind: 'doughTemperature',
      position,
      measurement: { value: tempC, unit: 'degC', observedAt: at },
    });
  }
}

const started = (yeastPct = 0.4, process: Process = process_, grams = 2000) => {
  const log = new Log();
  log.ok({
    type: 'StartBake',
    revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
    formula: formula(yeastPct, grams),
    process,
    mode: { kind: 'startAt', at: t('08:00') },
  });
  return log;
};

const value = (e: Estimate | undefined): number => {
  if (e?.status !== 'ok') throw new Error(`not ok: ${JSON.stringify(e)}`);
  return e.value;
};
const codeOf = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? 'ok' : r.error?.code);

describe('SetStepThermal and StepThermalChanged', () => {
  it('records the change, keeps the segments and shows the inputs in force on the process', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'bulk' });
    const lidless: StepThermal = { ...bowl, container: { material: 'glass', cover: 'none' } };
    const [event] = log
      .at('09:10')
      .ok({ type: 'SetStepThermal', stepId: 'bulk', thermal: lidless });
    expect(event?.payload).toEqual({
      type: 'StepThermalChanged',
      stepId: 'bulk',
      at: t('09:10'),
      thermal: lidless,
    });
    expect(effectiveThermal(log.state, 'bulk')).toEqual(lidless);
    expect(log.state.process?.steps.find((s) => s.id === 'bulk')?.thermal).toEqual(lidless);
    // The snapshot is untouched: it keeps the plan.
    expect(log.state.snapshot?.process.steps.find((s) => s.id === 'bulk')?.thermal).toEqual(bowl);
    expect(thermalSegments(log.state, 'bulk')).toEqual([
      { from: t('08:10'), thermal: bowl },
      { from: t('09:10'), thermal: lidless },
    ]);
    // A later change, and back to the fixed lag.
    log.at('09:40').ok({ type: 'SetStepThermal', stepId: 'bulk' });
    expect(effectiveThermal(log.state, 'bulk')).toBeUndefined();
    expect(log.state.process?.steps.find((s) => s.id === 'bulk')?.thermal).toBeUndefined();
    expect(thermalSegments(log.state, 'bulk').map((s) => s.thermal?.container?.cover)).toEqual([
      'lid',
      'none',
      undefined,
    ]);
  });

  it('takes the change at a given time, never before the start or the previous change', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'bulk' });
    log
      .at('09:00')
      .ok({ type: 'SetStepThermal', stepId: 'bulk', at: t('08:40'), thermal: fridgeBowl });
    expect(thermalSegments(log.state, 'bulk')[1]?.from).toBe(t('08:40'));
    expect(
      codeOf(
        log
          .at('09:05')
          .run({ type: 'SetStepThermal', stepId: 'bulk', at: t('08:30'), thermal: bowl }),
      ),
    ).toBe('InvalidTime');
    expect(
      codeOf(log.run({ type: 'SetStepThermal', stepId: 'bulk', at: t('08:00'), thermal: bowl })),
    ).toBe('InvalidTime');
  });

  it('on a step not yet started the inputs apply from its start; the time is ignored', () => {
    const log = started();
    log.at('08:30');
    log.ok({ type: 'SetStepThermal', stepId: 'cold', at: t('07:00'), thermal: bowl });
    expect(log.events.at(-1)?.payload).toMatchObject({
      type: 'StepThermalChanged',
      at: t('08:30'),
    });
    // The step starts earlier than the change was recorded: the change still applies from the start.
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'CompleteStep', stepId: 'bulk' });
    log.at('08:15').ok({ type: 'StartStep', stepId: 'cold' });
    expect(thermalSegments(log.state, 'cold')).toEqual([{ from: t('08:15'), thermal: bowl }]);
    expect(effectiveThermal(log.state, 'cold')).toEqual(bowl);
  });

  it('is refused for an unknown step, a step that is not a dough step, a completed step or bad inputs', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    expect(codeOf(log.run({ type: 'SetStepThermal', stepId: 'nope', thermal: bowl }))).toBe(
      'UnknownStep',
    );
    expect(codeOf(log.run({ type: 'SetStepThermal', stepId: 'mix', thermal: bowl }))).toBe(
      'InvalidCommand',
    );
    expect(codeOf(log.run({ type: 'SetStepThermal', stepId: 'bake', thermal: bowl }))).toBe(
      'InvalidCommand',
    );
    const bad = log.run({
      type: 'SetStepThermal',
      stepId: 'bulk',
      thermal: { geometry: 'tin', container: { material: 'glass', cover: 'none' } },
    });
    expect(bad).toMatchObject({
      ok: false,
      error: { code: 'InvalidProcess', details: { path: 'thermal.container.material' } },
    });
    log.at('08:10').ok({ type: 'CompleteStep', stepId: 'bulk' });
    expect(codeOf(log.run({ type: 'SetStepThermal', stepId: 'bulk', thermal: bowl }))).toBe(
      'StepAlreadyCompleted',
    );
    // Nothing was recorded by the refusals.
    expect(log.events.some((e) => e.payload.type === 'StepThermalChanged')).toBe(false);
  });

  it('evolve is structural: a replay gives the same state without calling the model', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'bulk' });
    log.at('09:00').ok({ type: 'SetStepThermal', stepId: 'bulk', thermal: fridgeBowl });
    log.at('09:30').reading('bulk', 25.1, 'surface');
    const replayed = replayBake('b', log.events);
    expect(replayed).toEqual(log.state);
    expect(replayed.observations.at(-1)?.payload).toMatchObject({
      kind: 'doughTemperature',
      position: 'surface',
    });
  });

  it('is checked on restore: a change on a completed step or with bad inputs is refused', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'bulk' });
    log.at('09:00').ok({ type: 'SetStepThermal', stepId: 'bulk', thermal: fridgeBowl });
    log.at('09:20').reading('bulk', 23.4, 'core');
    expect(() => checkBakeLog('b', log.events)).not.toThrow();
    const corrupt = (change: (p: Record<string, unknown>) => void) =>
      log.events.map((e) => {
        if (e.payload.type !== 'StepThermalChanged') return e;
        const copy = JSON.parse(JSON.stringify(e.payload)) as Record<string, unknown>;
        change(copy);
        return { ...e, payload: copy } as unknown as BakeEvent;
      });
    expect(() =>
      checkBakeLog(
        'b',
        corrupt((p) => (p.stepId = 'nope')),
      ),
    ).toThrow();
    expect(() =>
      checkBakeLog(
        'b',
        corrupt((p) => (p.stepId = 'mix')),
      ),
    ).toThrow();
    expect(() =>
      checkBakeLog(
        'b',
        corrupt((p) => (p.at = 'noon')),
      ),
    ).toThrow();
    expect(() =>
      checkBakeLog(
        'b',
        corrupt(
          (p) => (p.thermal = { geometry: 'tin', container: { material: 'glass', cover: 'none' } }),
        ),
      ),
    ).toThrow();
    expect(() =>
      checkBakeLog(
        'b',
        corrupt((p) => (p.thermal = { geometry: 'cube' })),
      ),
    ).toThrow();
  });
});

describe('the doughTemperature observation', () => {
  const running = () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'bulk' });
    return log;
  };

  it('is recorded with its probe position, and kept in the journal', () => {
    const log = running();
    const [event] = log.at('09:00').ok({
      type: 'AddObservation',
      stepId: 'bulk',
      category: 'fermentation',
      kind: 'doughTemperature',
      position: 'core',
      text: 'probe in the centre',
      measurement: { value: 24.6, unit: 'degC', observedAt: t('09:00') },
    });
    expect(event?.payload).toMatchObject({
      type: 'ObservationAdded',
      kind: 'doughTemperature',
      position: 'core',
      measurement: { value: 24.6, unit: 'degC' },
    });
    expect(log.state.observations).toHaveLength(1);
  });

  it('is refused for anything else: not running, not a dough step, bad value, bad position', () => {
    const log = running();
    log.at('09:00');
    const base = {
      type: 'AddObservation',
      category: 'fermentation',
      kind: 'doughTemperature',
      position: 'core',
      measurement: { value: 24.6, unit: 'degC', observedAt: t('09:00') },
    } as const;
    expect(codeOf(log.run({ ...base, stepId: 'cold' }))).toBe('InvalidCommand'); // not started
    expect(codeOf(log.run({ ...base, stepId: 'mix' }))).toBe('InvalidCommand'); // not a dough step
    expect(codeOf(log.run({ ...base, stepId: 'bulk', category: 'crumb' }))).toBe('InvalidCommand');
    expect(
      codeOf(
        log.run({
          ...base,
          stepId: 'bulk',
          measurement: { value: 61, unit: 'degC', observedAt: t('09:00') },
        }),
      ),
    ).toBe('InvalidCommand');
    expect(
      codeOf(
        log.run({
          ...base,
          stepId: 'bulk',
          measurement: { value: -1, unit: 'degC', observedAt: t('09:00') },
        }),
      ),
    ).toBe('InvalidCommand');
    expect(
      codeOf(
        log.run({
          ...base,
          stepId: 'bulk',
          measurement: { value: 24, unit: 'g', observedAt: t('09:00') },
        }),
      ),
    ).toBe('InvalidCommand');
    expect(
      codeOf(
        log.run({
          ...base,
          stepId: 'bulk',
          measurement: { value: 24, unit: 'degC', observedAt: t('07:00') },
        }),
      ),
    ).toBe('InvalidCommand');
    expect(codeOf(log.run({ ...base, stepId: 'bulk', position: 'middle' as never }))).toBe(
      'InvalidCommand',
    );
    const { position: _position, ...noPosition } = base;
    expect(codeOf(log.run({ ...noPosition, stepId: 'bulk' }))).toBe('InvalidCommand');
    expect(codeOf(log.run({ ...base, stepId: undefined as never }))).toBe('InvalidCommand');
    // A position belongs to this kind only.
    expect(
      codeOf(
        log.run({
          type: 'AddObservation',
          stepId: 'bulk',
          category: 'crumb',
          position: 'core',
          text: 'x',
        }),
      ),
    ).toBe('InvalidCommand');
    expect(log.state.observations).toHaveLength(0);
  });

  it('is refused on an ended bake', () => {
    const log = running();
    log.at('09:00').ok({ type: 'AbandonBake' });
    expect(
      codeOf(
        log.run({
          type: 'AddObservation',
          stepId: 'bulk',
          category: 'fermentation',
          kind: 'doughTemperature',
          position: 'core',
          measurement: { value: 24.6, unit: 'degC', observedAt: t('09:00') },
        }),
      ),
    ).toBe('BakeNotActive');
  });
});

describe('live recomputation from the recorded facts', () => {
  const staticDuration = (process: Process, yeastPct = 0.4) => {
    const result = estimateFermentation(formula(yeastPct), process, MODEL_END_POINT).dough;
    return value(result.duration);
  };

  it('is undefined for a session that is not active', () => {
    const log = started();
    log.at('09:00').ok({ type: 'AbandonBake' });
    expect(liveDoughForecast(log.state, t('09:00'))).toBeUndefined();
    expect(liveDoughForecast(initialBakeState('x'), t('09:00'))).toBeUndefined();
  });

  it('agrees with the plan while the bake follows it', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    const forecast = liveDoughForecast(log.state, t('09:00'));
    if (!forecast) throw new Error('no forecast');
    expect(forecast.stepId).toBe('cold');
    // One hour of the 2 h bulk is left: the remaining time is that hour plus the cold step's time.
    expect(value(forecast.remaining)).toBeCloseTo(staticDuration(process_) + 1 * H, 0);
    expect(forecast.steps.map((s) => s.stepId)).toEqual(['bulk', 'cold']);
    expect(value(forecast.progressNowPct)).toBeGreaterThan(0);
    expect(value(forecast.progressNowPct)).toBeLessThan(100);
    // Nothing is stored: the same facts give the same forecast.
    expect(liveDoughForecast(log.state, t('09:00'))).toEqual(forecast);
  });

  it('uses the recorded times, not the planned duration', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    // The bulk lasted 3 h instead of the planned 2 h.
    log.at('11:00').ok({ type: 'CompleteStep', stepId: 'bulk' });
    const forecast = liveDoughForecast(log.state, t('11:00'));
    if (!forecast) throw new Error('no forecast');
    const longer: Process = {
      steps: process_.steps.map((s) => (s.id === 'bulk' ? { ...s, plannedDurationS: 3 * H } : s)),
    };
    expect(value(forecast.remaining)).toBeCloseTo(staticDuration(longer), 0);
    const planned = estimateFermentation(formula(0.4), process_, MODEL_END_POINT).dough;
    expect(value(forecast.remaining)).not.toBeCloseTo(value(planned.duration), 0);
    // The end of the completed step is its recorded end.
    expect(forecast.steps[0]?.endProgressPct.status).toBe('ok');
  });

  it('follows a change of the thermal inputs from the moment it is recorded', () => {
    const base = started();
    base.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    base.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    const changed = started();
    changed.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    changed.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    // Out of the fridge-like bowl, into a wide open tray: the lag is much shorter.
    changed.at('08:30').ok({
      type: 'SetStepThermal',
      stepId: 'bulk',
      thermal: { geometry: 'sheet', environment: 'roomStill' },
    });
    const a = liveDoughForecast(base.state, t('09:00'));
    const b = liveDoughForecast(changed.state, t('09:00'));
    if (!a || !b) throw new Error('no forecast');
    expect(value(a.remaining)).not.toBeCloseTo(value(b.remaining), 0);
    // The earlier part of the step keeps the inputs in force before the change.
    expect(thermalSegments(changed.state, 'bulk').map((s) => s.thermal?.geometry)).toEqual([
      'bulk',
      'sheet',
    ]);
  });

  it('replaces the mean temperature from a reading, and says how a reading was taken', () => {
    const ambient = started();
    ambient.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    ambient.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    const warm = started();
    warm.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    warm.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    warm.at('09:00').reading('bulk', 27, 'surface');
    const a = liveDoughForecast(ambient.state, t('09:30'));
    const b = liveDoughForecast(warm.state, t('09:30'));
    if (!a || !b) throw new Error('no forecast');
    // A warmer dough ferments more and gets there sooner.
    expect(value(b.progressNowPct)).toBeGreaterThan(value(a.progressNowPct));
    expect(value(b.remaining)).toBeLessThan(value(a.remaining));
    const notes = b.remaining.status === 'ok' ? b.remaining.assumptions : [];
    expect(notes).toContain('probe_position_unmodelled');
    expect(a.remaining.status === 'ok' && a.remaining.assumptions).not.toContain(
      'probe_position_unmodelled',
    );
  });

  it('takes a core reading through gamma_core once the transient is over, and keeps an early one as the mean', () => {
    const make = (when: string) => {
      const log = started();
      log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
      log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
      log.at('08:00');
      // The dough is put in the fridge-like environment: it cools toward 4 C in the bowl.
      log.ok({ type: 'SetStepThermal', stepId: 'bulk', thermal: fridgeBowl });
      log.at(when).reading('bulk', 14, 'core');
      return log;
    };
    const early = liveDoughForecast(make('08:20').state, t('08:30'));
    const late = liveDoughForecast(make('09:50').state, t('09:55'));
    if (!early || !late) throw new Error('no forecast');
    const notes = (f: typeof early) => (f.remaining.status === 'ok' ? f.remaining.assumptions : []);
    expect(notes(early)).toContain('reading_in_transient');
    expect(notes(late)).not.toContain('reading_in_transient');
    expect(notes(late)).not.toContain('probe_position_unmodelled');
  });

  it('follows a change of the ambient made during the step', () => {
    const steady = started();
    steady.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    steady.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    const warmed = started();
    warmed.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    warmed.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    warmed.at('08:30').ok({
      type: 'AdjustStep',
      stepId: 'bulk',
      adjustment: { field: 'temperatureC', value: 30 },
    });
    const a = liveDoughForecast(steady.state, t('09:30'));
    const b = liveDoughForecast(warmed.state, t('09:30'));
    if (!a || !b) throw new Error('no forecast');
    expect(value(b.progressNowPct)).toBeGreaterThan(value(a.progressNowPct));
  });

  it('has no remaining time once the step it forecasts has ended', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'bulk' });
    log.at('09:00').ok({ type: 'CompleteStep', stepId: 'cold' });
    const forecast = liveDoughForecast(log.state, t('09:30'));
    expect(forecast?.remaining).toMatchObject({
      status: 'insufficient_data',
      reason: 'target_step_ended',
    });
    // The dough stays in the conditions of the last step between its end and now.
    expect(forecast?.steps.map((s) => s.endProgressPct.status)).toEqual(['ok', 'ok']);
  });
});

describe('calibrating the personal factor from a bake', () => {
  /** A 500 g dough in a lidded bowl in the static fridge, almost no yeast: weakly fermenting. */
  const fridge: Process = {
    steps: [
      step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 24 } }),
      step('retard', {
        dependsOn: ['mix'],
        plannedDurationS: 6 * H,
        conditions: { temperatureC: 4, location: 'fridge' },
        thermal: fridgeBowl,
      }),
      step('bake', { operation: 'bake', dependsOn: ['retard'], plannedDurationS: 2400 }),
    ],
  };
  const exact = (tau: number, minutes: number) => 4 + 20 * Math.exp(-minutes / 60 / tau);
  const calibrated = (tau: number, minutes: number[]) => {
    const log = started(0.05, fridge, 500);
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'StartStep', stepId: 'retard' });
    for (const m of minutes) {
      const at = new Date(Date.parse(t('08:00')) + m * 60_000).toISOString() as Instant;
      log.now = at;
      const r = log.reading('retard', Math.round(exact(tau, m) * 1e4) / 1e4, 'core', at);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
    }
    return log;
  };

  it('two points: the first and the last reading after the transient give the factor', () => {
    const log = calibrated(2.5, [60, 150, 240]);
    const result = calibrateStepThermal(log.state, 'retard', log.now, { method: 'twoPoint' });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.tauObsH).toBeCloseTo(2.5, 3);
    expect(result.value.key).toEqual({
      material: 'glass',
      cover: 'lid',
      environment: 'fridgeStatic',
    });
    // f = tau_obs (1 - psi) / tau_eff with the contract's tau_eff of 1.8366 h for 500 g.
    expect(result.value.tauEffH).toBeCloseTo(1.83659, 4);
    expect(result.value.set.factor).toBeCloseTo((2.5 * (1 - result.value.psi)) / 1.83659, 4);
    expect(result.value.set).toMatchObject({
      geometry: 'bulk',
      readings: 2,
      basis: { bakeId: 'b', stepId: 'retard' },
    });
    expect(result.value.set.massG).toBeCloseTo(500, 6);
    expect(result.value.set.basis.eventIds).toHaveLength(2);
  });

  it('Guggenheim: three equally spaced readings, and the temperature they tend to', () => {
    const log = calibrated(2.5, [60, 150, 240]);
    const result = calibrateStepThermal(log.state, 'retard', log.now, { method: 'guggenheim' });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.tauObsH).toBeCloseTo(2.5, 2);
    expect(result.value.infinityC).toBeCloseTo(4, 1);
    expect(result.value.set.readings).toBe(3);
  });

  it('keeps readings of the initial transient out, and refuses readings that cannot give a factor', () => {
    // Everything within the first 0.5 tau_eff (55 min) is out: nothing is left to calibrate.
    const early = calibrated(2.5, [10, 30, 50]);
    expect(
      calibrateStepThermal(early.state, 'retard', early.now, { method: 'twoPoint' }),
    ).toMatchObject({ ok: false, error: { code: 'readings_invalid' } });
    // Not a decay.
    const flat = started(0.05, fridge, 500);
    flat.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    flat.at('08:00').ok({ type: 'StartStep', stepId: 'retard' });
    for (const [m, c] of [
      [60, 10],
      [150, 12],
      [240, 14],
    ] as const) {
      const at = new Date(Date.parse(t('08:00')) + m * 60_000).toISOString() as Instant;
      flat.now = at;
      flat.reading('retard', c, 'core', at);
    }
    expect(
      calibrateStepThermal(flat.state, 'retard', flat.now, { method: 'twoPoint' }),
    ).toMatchObject({ ok: false, error: { code: 'readings_invalid' } });
    // A tau far beyond the model's (a probe not in the dough): implausible factor.
    const slow = calibrated(40, [60, 150, 240]);
    expect(
      calibrateStepThermal(slow.state, 'retard', slow.now, { method: 'twoPoint' }),
    ).toMatchObject({ ok: false, error: { code: 'thermal_factor_implausible' } });
    // Guggenheim needs three readings that are equally spaced.
    const uneven = calibrated(2.5, [60, 100, 240]);
    expect(
      calibrateStepThermal(uneven.state, 'retard', uneven.now, { method: 'guggenheim' }),
    ).toMatchObject({ ok: false, error: { code: 'readings_invalid' } });
  });

  it('refuses readings the heat of the dough confounds (psi above 0.1)', () => {
    // 2 kg at 21 C with 2.5 % fresh yeast: psi is about 0.2, the heat is not removed.
    const warm: Process = {
      steps: [
        step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 24 } }),
        step('bulk', {
          dependsOn: ['mix'],
          plannedDurationS: 6 * H,
          conditions: { temperatureC: 21 },
          thermal: bowl,
        }),
        step('bake', { operation: 'bake', dependsOn: ['bulk'], plannedDurationS: 2400 }),
      ],
    };
    const log = started(2.5, warm, 2000);
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    for (const [m, c] of [
      [120, 22.6],
      [240, 21.8],
    ] as const) {
      const at = new Date(Date.parse(t('08:00')) + m * 60_000).toISOString() as Instant;
      log.now = at;
      log.reading('bulk', c, 'core', at);
    }
    expect(calibrateStepThermal(log.state, 'bulk', log.now, { method: 'twoPoint' })).toMatchObject({
      ok: false,
      error: { code: 'self_heating_confounds' },
    });
  });

  it('is unavailable for a step with no thermal inputs', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'bulk' });
    log.at('08:00').ok({ type: 'SetStepThermal', stepId: 'cold' });
    log.ok({ type: 'StartStep', stepId: 'cold' });
    expect(calibrateStepThermal(log.state, 'cold', log.now, { method: 'twoPoint' })).toMatchObject({
      ok: false,
      error: { code: 'CalibrationUnavailable' },
    });
  });
});

describe('the volume cue is derived from the recorded facts', () => {
  const doughProcess: Process = {
    steps: [
      step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 24 } }),
      step('bulk', {
        dependsOn: ['mix'],
        plannedDurationS: 3 * H,
        conditions: { temperatureC: 24 },
        technique: { folds: { count: 2, intervalS: 1800 } },
      }),
      step('rest', { operation: 'rest', dependsOn: ['bulk'], plannedDurationS: H }),
      step('shape', { operation: 'shape', dependsOn: ['rest'], plannedDurationS: 600 }),
      step('proof', { operation: 'proof', dependsOn: ['shape'], plannedDurationS: H }),
      step('bake', { operation: 'bake', dependsOn: ['proof'], plannedDurationS: 2400 }),
    ],
  };

  it('in a plan with no facts it is false when the technique declares folds or the step degasses', () => {
    expect(volumeCueValidInPlan(doughProcess, 'bulk')).toBe(false);
    expect(volumeCueValidInPlan(doughProcess, 'rest')).toBe(true);
    expect(volumeCueValidInPlan(doughProcess, 'shape')).toBe(false);
    expect(volumeCueValidInPlan(doughProcess, 'proof')).toBe(true);
  });

  const state = (): { log: Log; state: () => BakeState } => {
    const log = started(0.4, doughProcess);
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    return { log, state: () => log.state };
  };

  it('with facts, nothing disturbed the gas since the step began: true until a fold or a shape', () => {
    const { log, state: now } = state();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
    expect(volumeCueValid(now(), 'bulk')).toBe(true);
    log.at('08:30').ok({
      type: 'AddObservation',
      stepId: 'bulk',
      category: 'handling',
      kind: 'fold',
      set: 1,
    });
    expect(volumeCueValid(now(), 'bulk')).toBe(false);
    log.at('11:00').ok({ type: 'CompleteStep', stepId: 'bulk' });
    log.at('11:00').ok({ type: 'StartStep', stepId: 'rest' });
    expect(volumeCueValid(now(), 'rest')).toBe(true);
    log.at('12:00').ok({ type: 'CompleteStep', stepId: 'rest' });
    log.at('12:00').ok({ type: 'StartStep', stepId: 'shape' });
    // The rest began before the shape started: it was disturbed since.
    expect(volumeCueValid(now(), 'rest')).toBe(false);
    expect(volumeCueValid(now(), 'shape')).toBe(false);
    log.at('12:10').ok({ type: 'CompleteStep', stepId: 'shape' });
    log.at('12:10').ok({ type: 'StartStep', stepId: 'proof' });
    expect(volumeCueValid(now(), 'proof')).toBe(true);
  });
});

describe('review fixes: ended bakes, readings at an edge, transition start, segments', () => {
  const fridgeProcess: Process = {
    steps: [
      step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 24 } }),
      step('retard', {
        dependsOn: ['mix'],
        plannedDurationS: 6 * H,
        conditions: { temperatureC: 4, location: 'fridge' },
        thermal: fridgeBowl,
      }),
      step('bake', { operation: 'bake', dependsOn: ['retard'], plannedDurationS: 2400 }),
    ],
  };
  const after = (minutes: number) =>
    new Date(Date.parse(t('08:00')) + minutes * 60_000).toISOString() as Instant;
  const retard = (minutes: number[], tau = 2.5) => {
    const log = started(0.05, fridgeProcess, 500);
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:00').ok({ type: 'StartStep', stepId: 'retard' });
    for (const m of minutes) {
      log.now = after(m);
      const c = Math.round((4 + 20 * Math.exp(-m / 60 / tau)) * 1e4) / 1e4;
      const r = log.reading('retard', c, 'core', after(m));
      if (!r.ok) throw new Error(JSON.stringify(r.error));
    }
    return log;
  };

  it('calibrates from a finished or an abandoned bake, while the live forecast stays active-only', () => {
    const finished = retard([70, 160, 250]);
    finished.at('12:30').ok({ type: 'CompleteStep', stepId: 'retard' });
    finished.ok({ type: 'FinishBake', outcome: { result: 'dough', dough: 'refrigerated' } });
    expect(finished.state.status).toBe('finished');
    const result = calibrateStepThermal(finished.state, 'retard', t('12:30'), {
      method: 'guggenheim',
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.tauObsH).toBeCloseTo(2.5, 2);
    expect(liveDoughForecast(finished.state, t('12:30'))).toBeUndefined();

    const abandoned = retard([70, 160, 250]);
    abandoned.at('12:30').ok({ type: 'AbandonBake' });
    const again = calibrateStepThermal(abandoned.state, 'retard', t('12:30'), {
      method: 'twoPoint',
    });
    expect(again.ok).toBe(true);
  });

  it('applies a reading taken exactly when the step is completed, and one taken at now with nothing left', () => {
    const run = (reading: boolean, complete: boolean) => {
      const log = started();
      log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
      log.at('08:00').ok({ type: 'StartStep', stepId: 'bulk' });
      if (reading) log.at('10:00').reading('bulk', 27, 'surface', t('10:00'));
      if (complete) log.at('10:00').ok({ type: 'CompleteStep', stepId: 'bulk' });
      const forecast = liveDoughForecast(log.state, t('10:00'));
      if (!forecast) throw new Error('no forecast');
      return forecast;
    };
    const notes = (f: ReturnType<typeof run>) =>
      f.remaining.status === 'ok' ? f.remaining.assumptions : [];
    // Completed at the reading instant: the next step starts from the measured temperature.
    const plain = run(false, true);
    const ended = run(true, true);
    expect(notes(ended)).toContain('probe_position_unmodelled');
    expect(notes(plain)).not.toContain('probe_position_unmodelled');
    expect(value(ended.remaining)).toBeLessThan(value(plain.remaining));
    // Planned time all elapsed, step still running: the remaining stretch has no time left.
    const running = run(true, false);
    expect(notes(running)).toContain('probe_position_unmodelled');
    expect(value(running.remaining)).toBeLessThan(value(run(false, false).remaining));
  });

  it('clamps a core reading by the transition start as a reading reset it', () => {
    const cold: Process = {
      steps: [
        step('mix', { operation: 'mix', plannedDurationS: 600, conditions: { temperatureC: 18 } }),
        step('cold', {
          dependsOn: ['mix'],
          conditions: { temperatureC: 4, location: 'fridge' },
          thermal: fridgeBowl,
        }),
        step('bake', { operation: 'bake', dependsOn: ['cold'], plannedDurationS: 2400 }),
      ],
    };
    const remainingWith = (later: { c: number; position: 'core' | 'surface' }) => {
      const log = started(0.05, cold, 2000);
      log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
      log.at('08:00').ok({ type: 'StartStep', stepId: 'cold' });
      log.at('08:00').reading('cold', 24, 'surface', t('08:00'));
      log.at('10:00').reading('cold', later.c, later.position, t('10:00'));
      const forecast = liveDoughForecast(log.state, t('10:00'));
      if (!forecast) throw new Error('no forecast');
      return value(forecast.remaining);
    };
    const core = remainingWith({ c: 20, position: 'core' });
    // The reading at the start made 24 C the start of the transition, so a core reading of 20 C
    // lies inside [4, 24] and is the mean 4 + 16 / gamma_core (about 16.6), not 20 C.
    const asMean = remainingWith({ c: 16.6, position: 'surface' });
    const wrong = remainingWith({ c: 20, position: 'surface' });
    expect(Math.abs(core - asMean)).toBeLessThan(0.05 * Math.abs(wrong - asMean));
  });

  it('keeps the inputs a change set before the start, even if the start is corrected earlier', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'mix' });
    log.at('08:05').ok({ type: 'SetStepThermal', stepId: 'bulk', thermal: fridgeBowl });
    log.at('08:15').ok({ type: 'StartStep', stepId: 'bulk' });
    const startEvent = log.events.find(
      (e) => e.payload.type === 'StepStarted' && e.payload.stepId === 'bulk',
    );
    log.at('08:20').ok({
      type: 'CorrectStepTime',
      targetEventId: startEvent?.eventId as string,
      newOccurredAt: t('08:02'),
    });
    expect(thermalSegments(log.state, 'bulk')).toEqual([{ from: t('08:02'), thermal: fridgeBowl }]);
  });

  it('records only the three readings that gave the factor, and finds an equally spaced triple', () => {
    const log = retard([60, 120, 180, 210]);
    const result = calibrateStepThermal(log.state, 'retard', after(240), { method: 'guggenheim' });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.set.readings).toBe(3);
    expect(result.value.set.basis.eventIds).toHaveLength(3);
    expect(result.value.tauObsH).toBeCloseTo(2.5, 2);
    // The reading at 210 min is not one of them.
    const last = log.events.filter((e) => e.payload.type === 'ObservationAdded').at(-1)?.eventId;
    expect(result.value.set.basis.eventIds).not.toContain(last);
  });
});

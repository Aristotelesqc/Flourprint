import { describe, expect, it } from 'vitest';
import { MemoryBakeEventStore } from '@flourprint/adapters/memory';
import { executeBakeCommand } from '@flourprint/core/application';
import {
  BUILT_IN_COMPONENT_DEFAULTS,
  type BakeOrigin,
  type Instant,
} from '@flourprint/core/domain';
import { editableTemperature, formatTemperature } from '../src/i18n/temperature';
import { onRealClock, type Reminder } from '../src/services/notifications';
import { decodePreferences, worldClock, type PreferenceStore } from '../src/services/preferences';
import { sampleRecipe } from './fixtures/sample-recipe';
import { worldBakes } from '../src/services/world-bakes';

const at = '2026-10-07T19:00:00.000Z' as Instant;
let n = 0;

/** Starts a bake of the sample recipe straight into the store, with that origin (or none). */
const start = async (store: MemoryBakeEventStore, bakeId: string, origin?: BakeOrigin) => {
  const ref = { id: sampleRecipe.id, version: 1 };
  const result = await executeBakeCommand(
    { store, clock: { now: () => at }, ids: { next: () => `id${++n}` } },
    {
      commandId: `c${++n}`,
      bakeId,
      expectedVersion: 0,
      issuedAt: at,
      payload: {
        type: 'StartBake',
        revisions: { formula: ref, process: ref },
        formula: sampleRecipe.formula,
        process: sampleRecipe.process,
        mode: { kind: 'startAt', at },
        ...(origin === undefined ? {} : { origin }),
      },
    },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
};

describe('two worlds of bakes (ADR 0014)', () => {
  it('shows only the bakes of the current world; a bake without origin is real', async () => {
    const store = new MemoryBakeEventStore();
    await start(store, 'real', 'physical');
    await start(store, 'old');
    await start(store, 'sim', 'simulation');
    let world: BakeOrigin = 'physical';
    const view = worldBakes(store, () => world);
    const ids = async () => (await view.listBakes()).map((s) => s.bakeId).sort();

    expect(await ids()).toEqual(['old', 'real']);
    // A bake of the other world reads as absent.
    expect(await view.loadEvents('sim')).toEqual([]);
    world = 'simulation';
    expect(await ids()).toEqual(['sim']);
    expect(await view.loadEvents('real')).toEqual([]);
    expect((await view.loadEvents('sim')).length).toBeGreaterThan(0);
    expect((await view.listBakesOf('physical')).length).toBe(2);

    // A bake started later is listed at once.
    await start(store, 'sim2', 'simulation');
    expect(await ids()).toEqual(['sim', 'sim2']);

    expect(await view.deleteBakes('simulation')).toBe(2);
    expect(await ids()).toEqual([]);
    world = 'physical';
    expect(await ids()).toEqual(['old', 'real']);
  });
});

describe('device preferences', () => {
  it('reads what was stored and keeps defaults for anything else', () => {
    expect(decodePreferences(null)).toEqual({
      theme: 'system',
      simulation: false,
      offsetMs: 0,
      units: { oven: 'C', cold: 'C', ambient: 'C' },
      componentDefaults: BUILT_IN_COMPONENT_DEFAULTS,
    });
    expect(
      decodePreferences(
        JSON.stringify({ simulation: true, offsetMs: 900_000, units: { ambient: 'F', oven: 'K' } }),
      ),
    ).toEqual({
      theme: 'system',
      simulation: true,
      offsetMs: 900_000,
      units: { oven: 'C', cold: 'C', ambient: 'F' },
      componentDefaults: BUILT_IN_COMPONENT_DEFAULTS,
    });
    expect(decodePreferences('{not json').simulation).toBe(false);
    expect(decodePreferences(JSON.stringify({ offsetMs: -5 })).offsetMs).toBe(0);
  });

  it('adds the offset to the clock in simulation only', () => {
    let current = decodePreferences(JSON.stringify({ simulation: true, offsetMs: 3_600_000 }));
    const preferences = { get: () => current } as PreferenceStore;
    const clock = worldClock(preferences, { now: () => at });
    expect(clock.now()).toBe('2026-10-07T20:00:00.000Z');
    current = { ...current, simulation: false };
    expect(clock.now()).toBe(at);
  });

  it('fires reminders of a simulated bake the offset earlier', () => {
    const reminder: Reminder = { id: 1, at, title: '', body: '', bakeId: 'b' };
    expect(onRealClock([reminder], 3_600_000)[0]?.at).toBe('2026-10-07T18:00:00.000Z');
    expect(onRealClock([reminder], 0)[0]).toBe(reminder);
  });
});

describe('temperature display', () => {
  it('shows °F in whole degrees and °C in tenths', () => {
    expect(formatTemperature(21, 'F', 'fr')).toBe('70 °F');
    expect(formatTemperature(21, 'C', 'fr')).toBe('21 °C');
    expect(editableTemperature(23.888_9, 'C', 'fr')).toBe('23,9');
    expect(editableTemperature(21, 'F', 'en')).toBe('70');
    // A friction is a difference: 10 °C more is 18 °F more.
    expect(editableTemperature(10, 'F', 'en', true)).toBe('18');
  });
});

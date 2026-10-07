import { describe, expect, it } from 'vitest';
import type { AppendInput, BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import type { BakeEvent, BakeSummary, Formula, Instant, Process } from '@flourprint/core/domain';

/**
 * Shared contract suite (docs/contracts/persistence.md): every store implementation runs it.
 * Factories return a fresh, empty store.
 */
const at = '2026-10-07T08:00:00.000Z' as Instant;

const event = (bakeId: string, seq: number, eventId = `${bakeId}-e${seq}`): BakeEvent => ({
  eventId,
  bakeId,
  seq,
  causationId: 'c',
  occurredAt: at,
  recordedAt: at,
  schemaVersion: 1,
  payload: { type: 'StepStarted', stepId: `s${seq}` },
});

const summary = (bakeId: string, version: number): BakeSummary => ({
  bakeId,
  status: 'active',
  version,
  updatedAt: at,
});

const append = (
  bakeId: string,
  commandId: string,
  expectedVersion: number,
  events: BakeEvent[],
  content = `content-${commandId}`,
): AppendInput => ({
  command: { commandId, bakeId, content },
  expectedVersion,
  events,
  summary: summary(bakeId, expectedVersion + events.length),
});

export const describeBakeEventStoreContract = (
  name: string,
  makeStore: () => BakeEventStore,
): void => {
  describe(`${name}: bake event store contract`, () => {
    it('appends events in order and lists the bake summary', async () => {
      const store = makeStore();
      expect(
        await store.append(append('b1', 'c1', 0, [event('b1', 1), event('b1', 2)])),
      ).toMatchObject({ ok: true });
      expect(await store.append(append('b1', 'c2', 2, [event('b1', 3)]))).toMatchObject({
        ok: true,
      });
      expect((await store.loadEvents('b1')).map((e) => e.seq)).toEqual([1, 2, 3]);
      expect(await store.listBakes()).toEqual([summary('b1', 3)]);
    });

    it('returns the stored events for a retried command and rejects a reused id', async () => {
      const store = makeStore();
      const input = append('b1', 'c1', 0, [event('b1', 1)]);
      await store.append(input);
      expect(await store.append(input)).toEqual({ ok: true, value: input.events });
      expect(await store.findCommand('c1')).toMatchObject({
        content: 'content-c1',
        events: input.events,
      });
      expect(
        await store.append({ ...input, command: { ...input.command, content: 'other' } }),
      ).toMatchObject({
        ok: false,
        error: { code: 'CommandIdReused' },
      });
      expect((await store.loadEvents('b1')).length).toBe(1);
    });

    it('rejects a stale expected version', async () => {
      const store = makeStore();
      await store.append(append('b1', 'c1', 0, [event('b1', 1)]));
      expect(await store.append(append('b1', 'c2', 0, [event('b1', 1, 'other')]))).toMatchObject({
        ok: false,
        error: { code: 'VersionConflict', details: { currentVersion: 1 } },
      });
    });

    it('writes nothing when a batch is invalid', async () => {
      const store = makeStore();
      await expect(
        store.append(append('b1', 'c1', 0, [event('b1', 1), event('b1', 1, 'dup')])),
      ).rejects.toThrow();
      expect(await store.loadEvents('b1')).toEqual([]);
      expect(await store.findCommand('c1')).toBeUndefined();
      expect(await store.listBakes()).toEqual([]);
    });

    it('keeps bakes apart', async () => {
      const store = makeStore();
      await store.append(append('b1', 'c1', 0, [event('b1', 1)]));
      await store.append(append('b2', 'c2', 0, [event('b2', 1)]));
      expect((await store.loadEvents('b2')).map((e) => e.eventId)).toEqual(['b2-e1']);
    });
  });
};

const formula: Formula = {
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};
const process: Process = {
  steps: [{ id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 }],
};

export const describeRecipeRepositoryContract = (
  name: string,
  makeRepository: () => RecipeRepository,
): void => {
  describe(`${name}: recipe repository contract`, () => {
    const save = (repository: RecipeRepository, expectedHead: number, pct = 70) =>
      repository.saveRevision({
        recipeId: 'pullman',
        name: 'Pullman',
        expectedHead,
        formula: {
          ...formula,
          ingredients: [{ id: 'water', kind: 'water', bakerPct: pct, role: 'dough' }],
        },
        process,
        createdAt: at,
        note: `water ${pct}`,
      });

    it('creates numbered immutable revisions and moves the head', async () => {
      const repository = makeRepository();
      expect(await save(repository, 0)).toMatchObject({ ok: true, value: { version: 1 } });
      expect(await save(repository, 1, 72)).toMatchObject({ ok: true, value: { version: 2 } });
      expect(await repository.getRecipe('pullman')).toMatchObject({
        name: 'Pullman',
        headVersion: 2,
      });
      const first = await repository.getRevision('pullman', 1);
      expect(first).toMatchObject({ ok: true, value: { version: 1, note: 'water 70' } });
      if (first.ok) expect(first.value?.formula.ingredients[0]?.bakerPct).toBe(70);
      expect(await repository.listRecipes()).toHaveLength(1);
    });

    it('rejects a save based on a stale head and writes nothing', async () => {
      const repository = makeRepository();
      await save(repository, 0);
      expect(await save(repository, 0, 80)).toMatchObject({
        ok: false,
        error: { code: 'HeadConflict', details: { currentHead: 1 } },
      });
      expect(await repository.getRevision('pullman', 2)).toEqual({ ok: true, value: undefined });
    });

    it('returns copies that cannot alter stored revisions', async () => {
      const repository = makeRepository();
      await save(repository, 0);
      const read = await repository.getRevision('pullman', 1);
      if (read.ok && read.value)
        (read.value.formula.ingredients[0] as { bakerPct: number }).bakerPct = 99;
      const again = await repository.getRevision('pullman', 1);
      expect(again.ok && again.value?.formula.ingredients[0]?.bakerPct).toBe(70);
    });
  });
};

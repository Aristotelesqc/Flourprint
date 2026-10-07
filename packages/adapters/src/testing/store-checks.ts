import type { AppendInput, BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import type { BakeEvent, BakeSummary, Formula, Instant, Process } from '@flourprint/core/domain';

/**
 * Shared store contract (docs/contracts/persistence.md) as plain async checks, so the same suite
 * runs in Vitest on Node and inside the app on a real device (spike #24). A check throws on failure.
 */
export interface StoreCheck<S> {
  readonly name: string;
  readonly run: (makeStore: () => Promise<S>) => Promise<void>;
}

export class CheckFailure extends Error {}

const equal = (actual: unknown, expected: unknown, what: string): void => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new CheckFailure(`${what}: expected ${e}, got ${a}`);
};

const code = (result: { ok: boolean; error?: { code: string } }): string =>
  result.ok ? 'ok' : (result.error?.code ?? 'unknown');

const rejects = async (work: () => Promise<unknown>, what: string): Promise<void> => {
  try {
    await work();
  } catch {
    return;
  }
  throw new CheckFailure(`${what}: expected a rejection`);
};

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
): AppendInput => ({
  command: { commandId, bakeId, content: `content-${commandId}` },
  expectedVersion,
  events,
  summary: summary(bakeId, expectedVersion + events.length),
});

export const bakeEventStoreChecks: readonly StoreCheck<BakeEventStore>[] = [
  {
    name: 'appends events in order and lists the bake summary',
    run: async (make) => {
      const store = await make();
      equal(
        code(await store.append(append('b1', 'c1', 0, [event('b1', 1), event('b1', 2)]))),
        'ok',
        'first append',
      );
      equal(
        code(await store.append(append('b1', 'c2', 2, [event('b1', 3)]))),
        'ok',
        'second append',
      );
      equal(
        (await store.loadEvents('b1')).map((e) => e.seq),
        [1, 2, 3],
        'sequence',
      );
      equal(await store.listBakes(), [summary('b1', 3)], 'summaries');
    },
  },
  {
    name: 'returns stored events on a retry and rejects a reused command id',
    run: async (make) => {
      const store = await make();
      const input = append('b1', 'c1', 0, [event('b1', 1)]);
      await store.append(input);
      equal(await store.append(input), { ok: true, value: input.events }, 'retry');
      equal((await store.findCommand('c1'))?.events, input.events, 'stored command');
      const reused = await store.append({
        ...input,
        command: { ...input.command, content: 'other' },
      });
      equal(code(reused), 'CommandIdReused', 'reused id');
      equal((await store.loadEvents('b1')).length, 1, 'events after retries');
    },
  },
  {
    name: 'rejects a stale expected version',
    run: async (make) => {
      const store = await make();
      await store.append(append('b1', 'c1', 0, [event('b1', 1)]));
      const stale = await store.append(append('b1', 'c2', 0, [event('b1', 1, 'other')]));
      equal(code(stale), 'VersionConflict', 'stale append');
    },
  },
  {
    name: 'writes nothing when a batch is invalid',
    run: async (make) => {
      const store = await make();
      await rejects(
        () => store.append(append('b1', 'c1', 0, [event('b1', 1), event('b1', 1, 'dup')])),
        'duplicate seq',
      );
      equal(await store.loadEvents('b1'), [], 'events');
      equal(await store.findCommand('c1'), undefined, 'command');
      equal(await store.listBakes(), [], 'summaries');
    },
  },
  {
    name: 'keeps bakes apart',
    run: async (make) => {
      const store = await make();
      await store.append(append('b1', 'c1', 0, [event('b1', 1)]));
      await store.append(append('b2', 'c2', 0, [event('b2', 1)]));
      equal(
        (await store.loadEvents('b2')).map((e) => e.eventId),
        ['b2-e1'],
        'second bake',
      );
    },
  },
  {
    name: 'serializes concurrent appends: exactly one wins',
    run: async (make) => {
      const store = await make();
      const results = await Promise.all([
        store.append(append('b1', 'c1', 0, [event('b1', 1, 'x1')])),
        store.append(append('b1', 'c2', 0, [event('b1', 1, 'x2')])),
      ]);
      equal(results.map(code).sort(), ['VersionConflict', 'ok'], 'outcomes');
      equal((await store.loadEvents('b1')).length, 1, 'events');
    },
  },
];

const formula = (waterPct: number): Formula => ({
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [{ id: 'water', kind: 'water', bakerPct: waterPct, role: 'dough' }],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
});
const process: Process = {
  steps: [{ id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 }],
};
const save = (repository: RecipeRepository, expectedHead: number, waterPct = 70) =>
  repository.saveRevision({
    recipeId: 'pullman',
    name: 'Pullman',
    expectedHead,
    formula: formula(waterPct),
    process,
    createdAt: at,
    note: `water ${waterPct}`,
  });

export const recipeRepositoryChecks: readonly StoreCheck<RecipeRepository>[] = [
  {
    name: 'creates numbered immutable revisions and moves the head',
    run: async (make) => {
      const repository = await make();
      equal(code(await save(repository, 0)), 'ok', 'first save');
      equal(code(await save(repository, 1, 72)), 'ok', 'second save');
      equal((await repository.getRecipe('pullman'))?.headVersion, 2, 'head');
      const first = await repository.getRevision('pullman', 1);
      equal(first.ok && first.value?.formula.ingredients[0]?.bakerPct, 70, 'first revision');
      equal((await repository.listRecipes()).length, 1, 'recipes');
    },
  },
  {
    name: 'rejects a save based on a stale head and writes nothing',
    run: async (make) => {
      const repository = await make();
      await save(repository, 0);
      equal(code(await save(repository, 0, 80)), 'HeadConflict', 'stale save');
      equal(
        await repository.getRevision('pullman', 2),
        { ok: true, value: undefined },
        'second revision',
      );
    },
  },
  {
    name: 'returns copies that cannot alter stored revisions',
    run: async (make) => {
      const repository = await make();
      await save(repository, 0);
      const read = await repository.getRevision('pullman', 1);
      if (read.ok && read.value)
        (read.value.formula.ingredients[0] as { bakerPct: number }).bakerPct = 99;
      const again = await repository.getRevision('pullman', 1);
      equal(again.ok && again.value?.formula.ingredients[0]?.bakerPct, 70, 'stored value');
    },
  },
];

export interface CheckResult {
  readonly name: string;
  readonly ok: boolean;
  readonly message?: string;
  readonly durationMs: number;
}

/** Runs checks one after the other and reports every outcome (used by the device checks page). */
export const runChecks = async <S>(
  checks: readonly StoreCheck<S>[],
  makeStore: () => Promise<S>,
  now: () => number,
): Promise<CheckResult[]> => {
  const results: CheckResult[] = [];
  for (const check of checks) {
    const started = now();
    try {
      await check.run(makeStore);
      results.push({ name: check.name, ok: true, durationMs: now() - started });
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        durationMs: now() - started,
      });
    }
  }
  return results;
};

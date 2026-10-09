import type { AppendInput, BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import {
  defaultVariant,
  type BakeEvent,
  type BakeSummary,
  type Formula,
  type Instant,
  type Process,
  type Revision,
} from '@flourprint/core/domain';

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
    name: 'returns copies that cannot alter stored events',
    run: async (make) => {
      const store = await make();
      await store.append(append('b1', 'c1', 0, [event('b1', 1)]));
      const [read] = await store.loadEvents('b1');
      if (read) (read.payload as { stepId: string }).stepId = 'tampered';
      const [summary] = await store.listBakes();
      if (summary) (summary as { version: number }).version = 99;
      const [again] = await store.loadEvents('b1');
      equal(again?.payload.type === 'StepStarted' && again.payload.stepId, 's1', 'stored event');
      equal((await store.listBakes())[0]?.version, 1, 'stored summary');
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

const saveAs = (repository: RecipeRepository, recipeId: string, createdAt: string) =>
  repository.saveRevision({
    recipeId,
    name: recipeId,
    expectedHead: 0,
    formula: formula(70),
    process,
    createdAt: createdAt as Instant,
  });

const recorded = (recipeId: string, versions: number): Revision[] =>
  Array.from({ length: versions }, (_, i) => ({
    recipeId,
    version: i + 1,
    formula: formula(60 + i),
    process,
    createdAt: `2024-0${i + 1}-01T12:00:00.000Z` as Instant,
    note: `v${i + 1}`,
  }));

const shownVariant = async (repository: RecipeRepository, familyId: string) => {
  const family = (await repository.listFamilies()).find((f) => f.id === familyId);
  return family && defaultVariant(family, await repository.listRecipes())?.id;
};

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
  {
    name: 'groups variants: the most recent is shown unless one is pinned',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'test-2', '2026-03-29T12:00:00.000Z');
      await saveAs(repository, 'test-4', '2026-06-18T12:00:00.000Z');
      await saveAs(repository, 'test-3', '2026-04-29T12:00:00.000Z');
      equal(
        code(
          await repository.groupRecipes({ id: 'pz', name: 'Pullman' }, [
            'test-2',
            'test-3',
            'test-4',
          ]),
        ),
        'ok',
        'group',
      );
      equal(await shownVariant(repository, 'pz'), 'test-4', 'most recent');
      equal(code(await repository.pinVariant('pz', 'test-3')), 'ok', 'pin');
      equal(await shownVariant(repository, 'pz'), 'test-3', 'pinned');
      equal(code(await repository.pinVariant('pz', undefined)), 'ok', 'unpin');
      equal(await shownVariant(repository, 'pz'), 'test-4', 'unpinned');
      equal((await repository.getRecipe('test-2'))?.familyId, 'pz', 'member');
      const revision = await repository.getRevision('test-2', 1);
      equal(revision.ok && revision.value?.version, 1, 'grouping creates no revision');
      equal((await repository.getRecipe('test-2'))?.headVersion, 1, 'head');
    },
  },
  {
    name: 'refuses to pin outside the family and to group unknown recipes',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'a', '2026-01-01T00:00:00.000Z');
      await saveAs(repository, 'b', '2026-01-02T00:00:00.000Z');
      await repository.groupRecipes({ id: 'f', name: 'F' }, ['a']);
      equal(code(await repository.pinVariant('f', 'b')), 'NotInFamily', 'pin outsider');
      equal(code(await repository.pinVariant('nope', 'a')), 'FamilyNotFound', 'unknown family');
      equal(
        code(await repository.groupRecipes({ id: 'f', name: 'F' }, ['a', 'ghost'])),
        'RecipeNotFound',
        'unknown recipe',
      );
      equal((await repository.getRecipe('b'))?.familyId, undefined, 'b untouched');
    },
  },
  {
    name: 'a leaving variant drops its pin; an emptied family is deleted',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'a', '2026-01-01T00:00:00.000Z');
      await saveAs(repository, 'b', '2026-01-02T00:00:00.000Z');
      await repository.groupRecipes({ id: 'f', name: 'F' }, ['a', 'b']);
      await repository.pinVariant('f', 'a');
      equal(code(await repository.leaveFamily('a')), 'ok', 'leave');
      equal(
        (await repository.listFamilies()).map((f) => f.pinnedRecipeId),
        [undefined],
        'pin',
      );
      await repository.leaveFamily('b');
      equal(await repository.listFamilies(), [], 'families');
    },
  },
  {
    name: 'imports absent recipes as recorded, skips present ones, and is idempotent',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'kept', '2026-01-01T00:00:00.000Z');
      const plan = {
        recipes: [
          { id: 'kept', name: 'Imported kept', revisions: recorded('kept', 1) },
          { id: 'new', name: 'New', familyId: 'fam', revisions: recorded('new', 2) },
        ],
        families: [{ id: 'fam', name: 'Family', pinnedRecipeId: 'new' }],
      };
      equal(
        await repository.importRecipes(plan),
        { imported: ['new'], skipped: ['kept'] },
        'first',
      );
      equal((await repository.getRecipe('kept'))?.name, 'kept', 'present recipe untouched');
      const second = await repository.getRevision('new', 2);
      equal(second.ok && second.value, recorded('new', 2)[1], 'revision as recorded');
      equal((await repository.getRecipe('new'))?.headVersion, 2, 'head');
      equal((await repository.getRecipe('new'))?.familyId, 'fam', 'family');
      equal(await shownVariant(repository, 'fam'), 'new', 'pin');
      equal(
        await repository.importRecipes(plan),
        { imported: [], skipped: ['kept', 'new'] },
        'again',
      );
    },
  },
  {
    name: 'keeps an imported review note across revisions until it is acknowledged',
    run: async (make) => {
      const repository = await make();
      const review = { level: 'review' as const, reasons: ['Proof time is negative in TOST.'] };
      await repository.importRecipes({
        recipes: [{ id: 'checked', name: 'Checked', review, revisions: recorded('checked', 1) }],
        families: [],
      });
      equal((await repository.getRecipe('checked'))?.review, review, 'imported note');
      await repository.saveRevision({
        recipeId: 'checked',
        name: 'Checked',
        expectedHead: 1,
        formula: formula(71),
        process,
        createdAt: at,
      });
      equal((await repository.getRecipe('checked'))?.review, review, 'kept by a new revision');
      equal(code(await repository.acknowledgeReview('checked')), 'ok', 'acknowledge');
      equal((await repository.getRecipe('checked'))?.review, undefined, 'removed');
      equal((await repository.getRecipe('checked'))?.headVersion, 2, 'no revision created');
      equal(code(await repository.acknowledgeReview('ghost')), 'RecipeNotFound', 'unknown');
    },
  },
  {
    name: 'an import does not create a family whose recipes were all skipped',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'kept', '2026-01-01T00:00:00.000Z');
      await repository.importRecipes({
        recipes: [{ id: 'kept', name: 'K', familyId: 'fam', revisions: recorded('kept', 1) }],
        families: [{ id: 'fam', name: 'Family', pinnedRecipeId: 'kept' }],
      });
      equal(await repository.listFamilies(), [], 'families');
      equal((await repository.getRecipe('kept'))?.familyId, undefined, 'recipe');
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

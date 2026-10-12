import type {
  AppendInput,
  BakeEventStore,
  Draft,
  EquipmentRegistry,
  FlourRegistry,
  RecipeRepository,
} from '@flourprint/core/application';
import {
  defaultVariant,
  type BakeEvent,
  type BakeSummary,
  type EquipmentEntry,
  type FlourEntry,
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

/** A start event carrying only what the stores read: the snapshot's origin (history.md). */
const started = (bakeId: string, origin: 'physical' | 'simulation' | undefined): BakeEvent => ({
  ...event(bakeId, 1),
  payload: {
    type: 'BakeStarted',
    snapshot: (origin === undefined ? {} : { origin }) as Extract<
      BakeEvent['payload'],
      { type: 'BakeStarted' }
    >['snapshot'],
  },
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
    name: 'erases the bakes of one origin with their commands and summaries',
    run: async (make) => {
      const store = await make();
      await store.append(append('real', 'c1', 0, [started('real', 'physical'), event('real', 2)]));
      await store.append(append('old', 'c2', 0, [started('old', undefined)]));
      await store.append(append('sim', 'c3', 0, [started('sim', 'simulation')]));
      await store.append(append('sim', 'c4', 1, [event('sim', 2)]));
      equal(await store.deleteBakes('simulation'), 1, 'simulated bakes deleted');
      equal(
        (await store.listBakes()).map((s) => s.bakeId).sort(),
        ['old', 'real'],
        'summaries left',
      );
      equal(await store.loadEvents('sim'), [], 'simulated events');
      equal(await store.findCommand('c4'), undefined, 'simulated command');
      equal((await store.findCommand('c1'))?.bakeId, 'real', 'real command kept');
      // A bake without origin counts as real.
      equal(await store.deleteBakes('physical'), 2, 'real bakes deleted');
      equal(await store.listBakes(), [], 'no summary left');
      equal(await store.loadEvents('old'), [], 'events without origin');
      equal(await store.findCommand('c1'), undefined, 'real command');
      equal(await store.deleteBakes('physical'), 0, 'nothing left to delete');
      // The erased ids can be used again from version 0.
      equal(
        code(await store.append(append('sim', 'c5', 0, [event('sim', 1, 'new')]))),
        'ok',
        'reuse',
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

const draft = (id: string, updatedAt: string, waterPct = 70): Draft => ({
  id,
  name: `Draft ${id}`,
  origin: { kind: 'blank' },
  formula: formula(waterPct),
  process,
  createdAt: at,
  updatedAt: updatedAt as Instant,
});

export const recipeRepositoryChecks: readonly StoreCheck<RecipeRepository>[] = [
  {
    name: 'saves, replaces, lists and deletes drafts, apart from recipes',
    run: async (make) => {
      const repository = await make();
      await repository.saveDraft(draft('a', '2024-01-01T12:00:00.000Z'));
      await repository.saveDraft(draft('b', '2024-02-01T12:00:00.000Z'));
      // An invalid recipe is a valid draft.
      await repository.saveDraft(draft('a', '2024-03-01T12:00:00.000Z', -5));
      const drafts = await repository.listDrafts();
      equal(drafts.map((d) => d.id).join(','), 'a,b', 'most recent first');
      equal((await repository.getDraft('a'))?.formula.ingredients[0]?.bakerPct, -5, 'replaced');
      equal((await repository.listRecipes()).length, 0, 'no recipe');
      await repository.deleteDraft('a');
      equal((await repository.getDraft('a')) === undefined, true, 'deleted');
      equal((await repository.listDrafts()).length, 1, 'one left');
    },
  },
  {
    name: 'turns a draft into a revision and deletes it in the same write',
    run: async (make) => {
      const repository = await make();
      await repository.saveDraft(draft('d', '2024-01-01T12:00:00.000Z'));
      const saved = await repository.saveRevision({
        recipeId: 'new',
        name: 'New',
        expectedHead: 0,
        formula: formula(70),
        process,
        createdAt: at,
        fromDraft: 'd',
      });
      equal(code(saved), 'ok', 'saved');
      equal((await repository.getDraft('d')) === undefined, true, 'draft gone');
      // A refused save keeps the draft.
      await repository.saveDraft(draft('e', '2024-01-01T12:00:00.000Z'));
      const stale = await repository.saveRevision({
        recipeId: 'new',
        name: 'New',
        expectedHead: 0,
        formula: formula(70),
        process,
        createdAt: at,
        fromDraft: 'e',
      });
      equal(code(stale), 'HeadConflict', 'conflict');
      equal((await repository.getDraft('e'))?.id, 'e', 'draft kept');
    },
  },
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
  {
    name: 'trashes and restores a recipe without a revision; the trash lists latest first',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'a', '2026-01-01T00:00:00.000Z');
      await saveAs(repository, 'b', '2026-01-02T00:00:00.000Z');
      const first = '2026-02-01T00:00:00.000Z' as Instant;
      const second = '2026-02-02T00:00:00.000Z' as Instant;
      equal(code(await repository.trashRecipe('a', first)), 'ok', 'trash a');
      equal(code(await repository.trashRecipe('b', second)), 'ok', 'trash b');
      equal(
        (await repository.listRecipes()).map((r) => r.id),
        [],
        'out of the list',
      );
      equal(
        (await repository.listTrash()).map((r) => r.id),
        ['b', 'a'],
        'trash order',
      );
      equal((await repository.getRecipe('a'))?.trashedAt, first, 'trashedAt');
      equal((await repository.getRecipe('a'))?.headVersion, 1, 'no revision');
      equal(code(await repository.trashRecipe('a', second)), 'AlreadyTrashed', 'again');
      equal(code(await repository.restoreRecipe('a')), 'ok', 'restore');
      equal(code(await repository.restoreRecipe('a')), 'NotTrashed', 'restore twice');
      equal(code(await repository.trashRecipe('ghost', first)), 'NotFound', 'trash unknown');
      equal(code(await repository.restoreRecipe('ghost')), 'NotFound', 'restore unknown');
      const restored = await repository.getRecipe('a');
      equal(restored?.trashedAt, undefined, 'cleared');
      equal(restored?.name, 'a', 'name kept');
      equal(
        (await repository.listRecipes()).map((r) => r.id),
        ['a'],
        'back in the list',
      );
      equal(
        (await repository.listTrash()).map((r) => r.id),
        ['b'],
        'trash',
      );
    },
  },
  {
    name: 'refuses a revision of a trashed recipe and a version of a missing one',
    run: async (make) => {
      const repository = await make();
      await save(repository, 0);
      await repository.trashRecipe('pullman', at);
      equal(code(await save(repository, 1, 75)), 'RecipeTrashed', 'trashed');
      equal((await repository.getRecipe('pullman'))?.headVersion, 1, 'head');
      await repository.restoreRecipe('pullman');
      equal(code(await save(repository, 1, 75)), 'ok', 'after restore');
      await repository.trashRecipe('pullman', at);
      await repository.deleteRecipe('pullman');
      equal(code(await save(repository, 2, 80)), 'NotFound', 'deleted');
    },
  },
  {
    name: 'a trashed member leaves the family default; an all-trashed family is not listed',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'a', '2026-01-01T00:00:00.000Z');
      await saveAs(repository, 'b', '2026-01-02T00:00:00.000Z');
      await repository.groupRecipes({ id: 'f', name: 'F' }, ['a', 'b']);
      await repository.pinVariant('f', 'b');
      equal(await shownVariant(repository, 'f'), 'b', 'pinned');
      await repository.trashRecipe('b', at);
      equal(await shownVariant(repository, 'f'), 'a', 'pin in the trash is skipped');
      await repository.trashRecipe('a', at);
      equal(await repository.listFamilies(), [], 'not listed');
      equal(
        (await repository.listFamilies({ all: true })).map((f) => f.id),
        ['f'],
        'listed for backups',
      );
      await repository.restoreRecipe('b');
      equal(await shownVariant(repository, 'f'), 'b', 'restored pin');
      equal((await repository.getRecipe('b'))?.familyId, 'f', 'membership kept');
    },
  },
  {
    name: 'deletes only a trashed recipe, with its revisions, leaving its family',
    run: async (make) => {
      const repository = await make();
      await save(repository, 0);
      await save(repository, 1, 72);
      await saveAs(repository, 'other', '2026-01-01T00:00:00.000Z');
      equal(code(await repository.deleteRecipe('pullman')), 'NotTrashed', 'not trashed');
      equal(code(await repository.deleteRecipe('ghost')), 'NotFound', 'unknown');
      equal((await repository.getRecipe('pullman'))?.headVersion, 2, 'kept');
      await repository.groupRecipes({ id: 'f', name: 'F' }, ['pullman', 'other']);
      await repository.pinVariant('f', 'pullman');
      await repository.trashRecipe('pullman', at);
      equal(code(await repository.deleteRecipe('pullman')), 'ok', 'delete');
      equal(await repository.getRecipe('pullman'), undefined, 'recipe gone');
      equal(await repository.getRevision('pullman', 1), { ok: true, value: undefined }, 'rev 1');
      equal(await repository.getRevision('pullman', 2), { ok: true, value: undefined }, 'rev 2');
      equal(await repository.listTrash(), [], 'trash empty');
      equal(
        (await repository.listFamilies()).map((f) => f.pinnedRecipeId),
        [undefined],
        'pin cleared',
      );
      equal((await repository.getRecipe('other'))?.familyId, 'f', 'family kept');
      await repository.trashRecipe('other', at);
      await repository.deleteRecipe('other');
      equal(await repository.listFamilies({ all: true }), [], 'empty family deleted');
    },
  },
  {
    name: 'empties the trash: every trashed recipe goes, the others stay',
    run: async (make) => {
      const repository = await make();
      await saveAs(repository, 'a', '2026-01-01T00:00:00.000Z');
      await saveAs(repository, 'b', '2026-01-02T00:00:00.000Z');
      await saveAs(repository, 'c', '2026-01-03T00:00:00.000Z');
      await repository.trashRecipe('a', '2026-02-01T00:00:00.000Z' as Instant);
      await repository.trashRecipe('c', '2026-02-02T00:00:00.000Z' as Instant);
      equal(await repository.emptyTrash(), ['c', 'a'], 'ids');
      equal(await repository.listTrash(), [], 'trash');
      equal(await repository.getRecipe('a'), undefined, 'a gone');
      equal(await repository.getRevision('c', 1), { ok: true, value: undefined }, 'c revision');
      equal(
        (await repository.listRecipes()).map((r) => r.id),
        ['b'],
        'b stays',
      );
      equal(await repository.emptyTrash(), [], 'nothing left');
    },
  },
  {
    name: 'imports a recorded trashed recipe into the trash',
    run: async (make) => {
      const repository = await make();
      await repository.importRecipes({
        recipes: [
          {
            id: 'gone',
            name: 'Gone',
            trashedAt: '2026-02-01T00:00:00.000Z' as Instant,
            revisions: recorded('gone', 1),
          },
        ],
        families: [],
      });
      equal((await repository.listTrash()).map((r) => r.id), ['gone'], 'trash');
      equal(await repository.listRecipes(), [], 'list');
    },
  },
];

const flour = (id: string, version: number, changes: Partial<FlourEntry> = {}): FlourEntry => ({
  id,
  version,
  name: `Flour ${id}`,
  builtIn: false,
  cereal: 'wheat',
  refinement: 'white',
  organic: { status: 'unknown' },
  properties: {
    proteinPct: {
      status: 'known',
      value: 12 + version / 10,
      unit: 'pct',
      basis: 'moisture14',
      source: { kind: 'package' },
    },
    ashPct: { status: 'unknown' },
    fallingNumberS: { status: 'unknown' },
    alveographW: { status: 'unknown' },
    alveographPL: { status: 'unknown' },
    malted: { status: 'known', value: true, source: { kind: 'producer', detail: 'spec sheet' } },
  },
  archived: false,
  createdAt: `2026-10-0${version}T08:00:00.000Z` as Instant,
  ...changes,
});

/** Personal flour entries (persistence.md, Flour registry). */
export const flourRegistryChecks: readonly StoreCheck<FlourRegistry>[] = [
  {
    name: 'writes flour versions in order, keeps earlier ones and lists the latest',
    run: async (makeStore) => {
      const registry = await makeStore();
      equal(code(await registry.saveFlour(flour('mine', 1))), 'ok', 'v1');
      equal(code(await registry.saveFlour(flour('mine', 2, { brand: 'Mill' }))), 'ok', 'v2');
      equal(code(await registry.saveFlour(flour('a-other', 1))), 'ok', 'other v1');
      const latest = await registry.listFlours();
      equal(
        latest.map((f) => `${f.id}@${f.version}`),
        ['a-other@1', 'mine@2'],
        'latest of each id',
      );
      equal(latest[1], flour('mine', 2, { brand: 'Mill' }), 'stored as written');
      equal(await registry.getFlour('mine', 1), { ok: true, value: flour('mine', 1) }, 'v1 kept');
      equal(await registry.getFlour('mine', 3), { ok: true }, 'absent version');
      equal(
        (await registry.listFlourVersions()).map((f) => `${f.id}@${f.version}`),
        ['a-other@1', 'mine@1', 'mine@2'],
        'every version',
      );
    },
  },
  {
    name: 'refuses a flour version that is not the next one and writes nothing',
    run: async (makeStore) => {
      const registry = await makeStore();
      await registry.saveFlour(flour('mine', 1));
      const again = await registry.saveFlour(flour('mine', 1, { brand: 'Other' }));
      equal(code(again), 'HeadConflict', 'rewrite');
      equal(
        again.ok ? undefined : again.error.details,
        { flourId: 'mine', currentHead: 1 },
        'head',
      );
      equal(code(await registry.saveFlour(flour('mine', 3))), 'HeadConflict', 'skip');
      equal(code(await registry.saveFlour(flour('new', 2))), 'HeadConflict', 'new at 2');
      equal(
        (await registry.listFlourVersions()).map((f) => `${f.id}@${f.version}`),
        ['mine@1'],
        'nothing written',
      );
      equal((await registry.getFlour('mine', 1)).ok, true, 'v1 unchanged');
    },
  },
  {
    name: 'archives a flour as a new version; earlier versions still resolve',
    run: async (makeStore) => {
      const registry = await makeStore();
      await registry.saveFlour(flour('mine', 1));
      await registry.saveFlour(flour('mine', 2, { archived: true }));
      equal(
        (await registry.listFlours()).map((f) => [f.version, f.archived]),
        [[2, true]],
        'archived head listed',
      );
      const first = await registry.getFlour('mine', 1);
      equal(first.ok && first.value?.archived, false, 'v1 not archived');
    },
  },
];

const equipment = (
  id: string,
  version: number,
  changes: Partial<EquipmentEntry> = {},
): EquipmentEntry => ({
  id,
  version,
  kind: 'vessel',
  name: `Vessel ${id}`,
  builtIn: false,
  shape: 'dutchOven',
  material: 'castIron',
  lid: { material: 'castIron' },
  interior: { diameterMm: 240 + version },
  volumeMl: { status: 'known', value: 4000, source: { kind: 'personal', detail: 'measured' } },
  archived: false,
  createdAt: `2026-10-0${version}T08:00:00.000Z` as Instant,
  ...changes,
});

/** Personal equipment entries (persistence.md, equipment.md). */
export const equipmentRegistryChecks: readonly StoreCheck<EquipmentRegistry>[] = [
  {
    name: 'writes equipment versions in order, keeps earlier ones and lists the latest',
    run: async (makeStore) => {
      const registry = await makeStore();
      equal(code(await registry.saveEquipment(equipment('mine', 1))), 'ok', 'v1');
      equal(
        code(await registry.saveEquipment(equipment('mine', 2, { notes: 'seasoned' }))),
        'ok',
        'v2',
      );
      equal(
        code(await registry.saveEquipment(equipment('a-other', 1, { kind: 'support' }))),
        'ok',
        'other v1',
      );
      const latest = await registry.listEquipment();
      equal(
        latest.map((e) => `${e.id}@${e.version}`),
        ['a-other@1', 'mine@2'],
        'latest of each id',
      );
      equal(latest[1], equipment('mine', 2, { notes: 'seasoned' }), 'stored as written');
      equal(
        await registry.getEquipment('mine', 1),
        { ok: true, value: equipment('mine', 1) },
        'v1 kept',
      );
      equal(await registry.getEquipment('mine', 3), { ok: true }, 'absent version');
      equal(
        (await registry.listEquipmentVersions()).map((e) => `${e.id}@${e.version}`),
        ['a-other@1', 'mine@1', 'mine@2'],
        'every version',
      );
    },
  },
  {
    name: 'refuses an equipment version that is not the next one and writes nothing',
    run: async (makeStore) => {
      const registry = await makeStore();
      await registry.saveEquipment(equipment('mine', 1));
      const again = await registry.saveEquipment(equipment('mine', 1, { notes: 'other' }));
      equal(code(again), 'HeadConflict', 'rewrite');
      equal(
        again.ok ? undefined : again.error.details,
        { equipmentId: 'mine', currentHead: 1 },
        'head',
      );
      equal(code(await registry.saveEquipment(equipment('mine', 3))), 'HeadConflict', 'skip');
      equal(code(await registry.saveEquipment(equipment('new', 2))), 'HeadConflict', 'new at 2');
      equal(
        (await registry.listEquipmentVersions()).map((e) => `${e.id}@${e.version}`),
        ['mine@1'],
        'nothing written',
      );
    },
  },
  {
    name: 'archives equipment as a new version; earlier versions still resolve',
    run: async (makeStore) => {
      const registry = await makeStore();
      await registry.saveEquipment(equipment('mine', 1));
      await registry.saveEquipment(equipment('mine', 2, { archived: true }));
      equal(
        (await registry.listEquipment()).map((e) => [e.version, e.archived]),
        [[2, true]],
        'archived head listed',
      );
      const first = await registry.getEquipment('mine', 1);
      equal(first.ok && first.value?.archived, false, 'v1 not archived');
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

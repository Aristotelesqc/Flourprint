import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryIngredientRegistry,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
  MemoryThermalProfileStore,
} from '@flourprint/adapters/memory';
import { exportBackup, importBackup } from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  backupJson,
  cleanUpClosedPulls,
  copyThenLoad,
  detectDevVersionsHost,
  hostFromAndroid,
  hostFromDesktop,
  isDesktopShell,
  receiveCopy,
  type DevVersionsHost,
} from '../src/services/dev-versions';
import type { Services } from '../src/services/services';
import { sampleBackup } from './fixtures/sample-recipe';

const stores = () => {
  const ingredients = new MemoryIngredientRegistry();
  const recipes = new MemoryRecipeRepository(ingredients);
  const bakes = new MemoryBakeEventStore();
  const flours = new MemoryFlourRegistry();
  const equipment = new MemoryEquipmentRegistry();
  const thermalProfiles = new MemoryThermalProfileStore();
  return {
    recipes,
    bakes,
    flours,
    equipment,
    ingredients,
    thermalProfiles,
    restoreTarget: new MemoryRestoreTarget(
      recipes,
      bakes,
      flours,
      equipment,
      ingredients,
      thermalProfiles,
    ),
  };
};

const fakeHost = (overrides: Partial<DevVersionsHost> = {}) => {
  const calls: string[] = [];
  const host: DevVersionsHost = {
    kind: 'android',
    current: async () => 'dev',
    select: async (version) => void calls.push(`select ${version}`),
    listData: async () => [],
    deleteData: async (version) => void calls.push(`delete ${version}`),
    stashTransfer: async (version, json) => void calls.push(`stash ${version} ${json.length > 0}`),
    takeTransfer: async () => undefined,
    ...overrides,
  };
  return { host, calls };
};

afterEach(() => vi.unstubAllGlobals());

describe('which app provides the picker (ADR 0023)', () => {
  it('has no host in a browser, a release app or a page that fakes the shell', () => {
    // No window at all (Node), a plain browser window, and a window with a half-formed shell.
    expect(detectDevVersionsHost()).toBeUndefined();
    vi.stubGlobal('window', {});
    expect(detectDevVersionsHost()).toBeUndefined();
    vi.stubGlobal('window', { flourprintDevShell: { select: () => undefined } });
    expect(detectDevVersionsHost()).toBeUndefined();
    vi.stubGlobal('window', { flourprintDesktop: { sql: () => undefined } });
    expect(detectDevVersionsHost()).toBeUndefined();
  });

  it('uses the Dev shell bridge when it is complete', async () => {
    const calls: unknown[][] = [];
    const shell = {
      current: async () => 'pr-12',
      select: async (...a: unknown[]) => void calls.push(['select', ...a]),
      listData: async () => [
        { version: 'pr-12', bytes: 10 },
        { version: 'dev', bytes: 30 },
        { version: 'evil', bytes: 1 },
      ],
      deleteData: async (...a: unknown[]) => void calls.push(['delete', ...a]),
      stashTransfer: async (...a: unknown[]) => void calls.push(['stash', ...a]),
      takeTransfer: async () => '{"x":1}',
    };
    expect(isDesktopShell(shell)).toBe(true);
    vi.stubGlobal('window', { flourprintDevShell: shell });
    const host = detectDevVersionsHost();
    expect(host?.kind).toBe('desktop');
    expect(await host?.current()).toBe('pr-12');
    expect(await host?.listData()).toEqual([
      { version: 'dev', bytes: 30 },
      { version: 'pr-12', bytes: 10 },
    ]);
    await host?.select('canary');
    await host?.deleteData('pr-12');
    await host?.stashTransfer('pr-9', 'json');
    expect(await host?.takeTransfer()).toBe('{"x":1}');
    expect(calls).toEqual([
      ['select', 'canary'],
      ['delete', 'pr-12'],
      ['stash', 'pr-9', 'json'],
    ]);
  });

  it('refuses a version the host should never return', async () => {
    const host = hostFromDesktop({
      current: async () => 'release',
      select: async () => undefined,
      listData: async () => [],
      deleteData: async () => undefined,
      stashTransfer: async () => undefined,
      takeTransfer: async () => 3,
    });
    await expect(host.current()).rejects.toThrow();
    expect(await host.takeTransfer()).toBeUndefined();
  });

  it('wraps the dev APK plugin', async () => {
    const seen: unknown[] = [];
    const host = hostFromAndroid({
      current: async () => ({ version: 'canary' }),
      select: async (o) => void seen.push(o),
      listData: async () => ({ entries: [{ version: 'main', bytes: 2048 }] }),
      deleteData: async (o) => void seen.push(o),
      stashTransfer: async (o) => void seen.push(o),
      takeTransfer: async () => ({}),
    });
    expect(host.kind).toBe('android');
    expect(await host.current()).toBe('canary');
    expect(await host.listData()).toEqual([{ version: 'main', bytes: 2048 }]);
    await host.select('pr-3');
    await host.stashTransfer('pr-3', 'j');
    expect(await host.takeTransfer()).toBeUndefined();
    expect(seen).toEqual([{ version: 'pr-3' }, { version: 'pr-3', json: 'j' }]);
  });
});

describe('copy my data to this version', () => {
  const populated = async () => {
    const source = stores();
    expect((await importBackup(source.restoreTarget, sampleBackup())).ok).toBe(true);
    return source;
  };
  const asServices = (s: ReturnType<typeof stores>) =>
    ({
      ...s,
      allBakes: s.bakes,
      realClock: { now: () => '2026-11-04T12:00:00.000Z' as Instant },
    }) as unknown as Services;

  it('hands the whole backup to the target version, then loads it', async () => {
    const source = asServices(await populated());
    let stashed = '';
    const { host, calls } = fakeHost({
      stashTransfer: async (version, json) => {
        stashed = json;
        calls.push(`stash ${version}`);
      },
    });
    expect(await copyThenLoad(host, source, 'pr-7')).toBe(true);
    expect(calls).toEqual(['stash pr-7', 'select pr-7']);
    expect(JSON.parse(stashed).kind).toBe('flourprint-backup');
  });

  it('restores the pending copy into an empty target, once', async () => {
    const source = asServices(await populated());
    const json = (await backupJson(source)) as string;
    const target = stores();
    let pending: string | undefined = json;
    const { host } = fakeHost({
      takeTransfer: async () => {
        const out = pending;
        pending = undefined;
        return out;
      },
    });
    expect(await receiveCopy(host, target.restoreTarget)).toBe('copied');
    const copy = await exportBackup(target, '2026-11-04T12:00:00.000Z' as Instant);
    const original = await exportBackup(source as never, '2026-11-04T12:00:00.000Z' as Instant);
    expect(copy.ok && original.ok && copy.value.recipes).toEqual(
      original.ok ? original.value.recipes : undefined,
    );
    expect(await receiveCopy(host, target.restoreTarget)).toBeUndefined();
  });

  it('leaves a target that already holds data untouched and says so', async () => {
    const source = asServices(await populated());
    const json = (await backupJson(source)) as string;
    const target = await populated();
    const before = JSON.stringify((await exportBackup(target, 'x' as Instant)).ok);
    const { host } = fakeHost({ takeTransfer: async () => json });
    expect(await receiveCopy(host, target.restoreTarget)).toBe('notEmpty');
    expect(before).toBe('true');
    expect((await target.recipes.listRecipes()).length).toBeGreaterThan(0);
  });

  it('reports a damaged or unreadable copy as failed', async () => {
    const target = stores();
    expect(
      await receiveCopy(fakeHost({ takeTransfer: async () => '{nope' }).host, target.restoreTarget),
    ).toBe('failed');
    expect(
      await receiveCopy(
        fakeHost({ takeTransfer: async () => '{"kind":"other"}' }).host,
        target.restoreTarget,
      ),
    ).toBe('failed');
    expect(
      await receiveCopy(
        fakeHost({
          takeTransfer: async () => {
            throw new Error('native failure');
          },
        }).host,
        target.restoreTarget,
      ),
    ).toBe('failed');
  });

  it('does nothing at a start without a pending copy', async () => {
    expect(await receiveCopy(fakeHost().host, stores().restoreTarget)).toBeUndefined();
  });
});

describe('start-up clean-up of closed pull requests', () => {
  const held = [
    { version: 'dev', bytes: 1 },
    { version: 'main', bytes: 1 },
    { version: 'pr-1', bytes: 1 },
    { version: 'pr-2', bytes: 1 },
    { version: 'pr-3', bytes: 1 },
    { version: 'pr-4', bytes: 1 },
  ] as const;

  it('deletes merged and closed pull requests; keeps open, unknown and loaded', async () => {
    const { host, calls } = fakeHost({ listData: async () => [...held] });
    const states = { 1: 'merged', 2: 'closed', 3: 'open', 4: undefined } as const;
    const deleted = await cleanUpClosedPulls(host, 'pr-2', async (n) => states[n as 1]);
    expect(deleted).toEqual(['pr-1']);
    expect(calls).toEqual(['delete pr-1']);
  });

  it('does nothing when the API fails', async () => {
    const { host, calls } = fakeHost({ listData: async () => [...held] });
    const deleted = await cleanUpClosedPulls(host, 'dev', async () => {
      throw new Error('rate limited');
    });
    expect(deleted).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('does nothing when the data cannot be listed', async () => {
    const { host, calls } = fakeHost({
      listData: async () => {
        throw new Error('native failure');
      },
    });
    expect(await cleanUpClosedPulls(host, 'dev', async () => 'merged')).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('keeps going when one deletion fails', async () => {
    const calls: string[] = [];
    const { host } = fakeHost({
      listData: async () => [...held],
      deleteData: async (version) => {
        calls.push(version);
        if (version === 'pr-1') throw new Error('busy');
      },
    });
    expect(await cleanUpClosedPulls(host, 'dev', async () => 'closed')).toEqual([
      'pr-2',
      'pr-3',
      'pr-4',
    ]);
    expect(calls).toEqual(['pr-1', 'pr-2', 'pr-3', 'pr-4']);
  });
});

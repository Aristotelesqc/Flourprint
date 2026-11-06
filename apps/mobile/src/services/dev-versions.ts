import { Capacitor, registerPlugin } from '@capacitor/core';
import { exportBackup, importBackup, type RestoreTarget } from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import {
  fetchPullState,
  parseDataEntries,
  parseVersionId,
  staleVersions,
  type DataEntry,
  type PullState,
  type VersionId,
} from '@flourprint/adapters/dev-versions';
import type { Services } from './services';

/**
 * The version picker's connection to the dev apps (ADR 0023). A dev app provides a host: the
 * Capacitor plugin `DevVersions` of the dev APK, or `window.flourprintDevShell` of the Windows
 * Dev shell. Release builds provide neither, and a plain browser neither, so there the picker
 * does not exist: detection is by capability, never by build channel (the `main` address is built
 * as a release and still must offer the way back).
 */
export interface DevVersionsHost {
  readonly kind: 'android' | 'desktop';
  /** The version this app loaded. */
  current(): Promise<VersionId>;
  /** Loads another version (the app restarts on Android, the window reloads on Windows). */
  select(version: VersionId): Promise<void>;
  /** The versions that hold data on this device, with their size. */
  listData(): Promise<DataEntry[]>;
  /** Deletes one version's data; the loaded version restarts or reloads afterwards. */
  deleteData(version: VersionId): Promise<void>;
  /** Keeps a backup document for `version`'s next start, for ten minutes at most. */
  stashTransfer(version: VersionId, json: string): Promise<void>;
  /** The backup kept for the loaded version, once; undefined when there is none. */
  takeTransfer(): Promise<string | undefined>;
}

/** What the Windows Dev shell exposes to the page (apps/desktop/src/preload-dev.cts). */
export interface DesktopShell {
  current(): Promise<unknown>;
  select(version: string): Promise<unknown>;
  listData(): Promise<unknown>;
  deleteData(version: string): Promise<unknown>;
  stashTransfer(version: string, json: string): Promise<unknown>;
  takeTransfer(): Promise<unknown>;
}

/** The dev APK's plugin methods (apps/mobile/android .../DevVersionsPlugin.java). */
export interface AndroidPlugin {
  current(): Promise<{ version?: unknown }>;
  select(options: { version: string }): Promise<unknown>;
  listData(): Promise<{ entries?: unknown }>;
  deleteData(options: { version: string }): Promise<unknown>;
  stashTransfer(options: { version: string; json: string }): Promise<unknown>;
  takeTransfer(): Promise<{ json?: unknown }>;
}

const versionOrThrow = (value: unknown): VersionId => {
  const version = parseVersionId(value);
  if (version === undefined) throw new Error('The host returned an unknown version');
  return version;
};

export const isDesktopShell = (value: unknown): value is DesktopShell =>
  typeof value === 'object' &&
  value !== null &&
  ['current', 'select', 'listData', 'deleteData', 'stashTransfer', 'takeTransfer'].every(
    (method) => typeof (value as Record<string, unknown>)[method] === 'function',
  );

export const hostFromDesktop = (shell: DesktopShell): DevVersionsHost => ({
  kind: 'desktop',
  current: async () => versionOrThrow(await shell.current()),
  select: async (version) => void (await shell.select(version)),
  listData: async () => parseDataEntries(await shell.listData()),
  deleteData: async (version) => void (await shell.deleteData(version)),
  stashTransfer: async (version, json) => void (await shell.stashTransfer(version, json)),
  takeTransfer: async () => {
    const json = await shell.takeTransfer();
    return typeof json === 'string' ? json : undefined;
  },
});

export const hostFromAndroid = (plugin: AndroidPlugin): DevVersionsHost => ({
  kind: 'android',
  current: async () => versionOrThrow((await plugin.current()).version),
  select: async (version) => void (await plugin.select({ version })),
  listData: async () => parseDataEntries((await plugin.listData()).entries),
  deleteData: async (version) => void (await plugin.deleteData({ version })),
  stashTransfer: async (version, json) => void (await plugin.stashTransfer({ version, json })),
  takeTransfer: async () => {
    const { json } = await plugin.takeTransfer();
    return typeof json === 'string' ? json : undefined;
  },
});

/** The host of the dev app this page runs in, or undefined: release builds and browsers have none. */
export const detectDevVersionsHost = (): DevVersionsHost | undefined => {
  if (typeof window === 'undefined') return undefined;
  const shell = (window as { flourprintDevShell?: unknown }).flourprintDevShell;
  if (isDesktopShell(shell)) return hostFromDesktop(shell);
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('DevVersions')) {
      return hostFromAndroid(registerPlugin<AndroidPlugin>('DevVersions'));
    }
  } catch (cause) {
    console.error('Dev versions host not available', cause);
  }
  return undefined;
};

// -- Copy my data to another version ------------------------------------------------------------

export type CopyOutcome = 'copied' | 'notEmpty' | 'failed';

/** The current version's data as a backup document (`exportBackup`), both worlds. */
export const backupJson = async (services: Services): Promise<string | undefined> => {
  const exported = await exportBackup(
    {
      recipes: services.recipes,
      bakes: services.allBakes,
      flours: services.flours,
      equipment: services.equipment,
      ingredients: services.ingredients,
      thermalProfiles: services.thermalProfiles,
    },
    services.realClock.now() as Instant,
  );
  return exported.ok ? JSON.stringify(exported.value) : undefined;
};

/** Hands the current data to `target`, then loads it. False when nothing was changed. */
export const copyThenLoad = async (
  host: DevVersionsHost,
  services: Services,
  target: VersionId,
): Promise<boolean> => {
  const json = await backupJson(services);
  if (json === undefined) return false;
  await host.stashTransfer(target, json);
  await host.select(target);
  return true;
};

/**
 * At start-up of the target version: restores the pending copy, once, into the (empty) stores.
 * A target that already holds data refuses it (backups restore into an empty target) and keeps
 * its data untouched. Undefined when no copy was waiting.
 */
export const receiveCopy = async (
  host: DevVersionsHost,
  target: RestoreTarget,
): Promise<CopyOutcome | undefined> => {
  let json: string | undefined;
  try {
    json = await host.takeTransfer();
  } catch (cause) {
    console.error('Pending copy not read', cause);
    return 'failed';
  }
  if (json === undefined) return undefined;
  try {
    const restored = await importBackup(target, JSON.parse(json));
    if (restored.ok) return 'copied';
    return restored.error.code === 'TargetNotEmpty' ? 'notEmpty' : 'failed';
  } catch (cause) {
    console.error('Copied data not restored', cause);
    return 'failed';
  }
};

// -- Automatic clean-up ---------------------------------------------------------------------------

/**
 * Deletes the data of merged or closed pull-request versions held on the device, other than the
 * loaded one. Any failure deletes nothing (ADR 0023). Returns the versions deleted.
 */
export const cleanUpClosedPulls = async (
  host: DevVersionsHost,
  loaded: VersionId,
  stateOf: (number: number) => Promise<PullState | undefined> = (number) => fetchPullState(number),
): Promise<VersionId[]> => {
  try {
    const held = (await host.listData()).map((entry) => entry.version);
    const stale = await staleVersions(held, stateOf, loaded);
    const deleted: VersionId[] = [];
    for (const version of stale) {
      try {
        await host.deleteData(version);
        deleted.push(version);
      } catch (cause) {
        console.error('Closed pull request data not deleted', cause);
      }
    }
    return deleted;
  } catch (cause) {
    console.error('Clean-up skipped', cause);
    return [];
  }
};

// -- Start-up --------------------------------------------------------------------------------------

export interface DevVersionsStart {
  readonly host: DevVersionsHost;
  /** What the pending copy did at this start, if one was waiting. */
  readonly copy: CopyOutcome | undefined;
}

let started: DevVersionsStart | undefined;

/** The host and the start-up copy, set by `startDevVersions`; undefined in release builds and browsers. */
export const devVersionsStart = (): DevVersionsStart | undefined => started;

/**
 * Called once before the first render: restores a pending copy into the stores, then (without
 * waiting) cleans up the closed pull requests' data.
 */
export const startDevVersions = async (
  services: Services,
): Promise<DevVersionsStart | undefined> => {
  const host = detectDevVersionsHost();
  if (host === undefined) return undefined;
  const copy = await receiveCopy(host, services.restoreTarget);
  started = { host, copy };
  void host
    .current()
    .then((loaded) => cleanUpClosedPulls(host, loaded))
    .catch((cause: unknown) => console.error('Clean-up skipped', cause));
  return started;
};

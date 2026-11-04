/**
 * Versions of the web app the dev apps can load (ADR 0023): the allowlist of addresses, address
 * building, the open-pull-request list, the automatic clean-up decision and the native-change
 * notice. Pure and platform-free: the web app, the Windows Dev shell and the tests share it; the
 * Android plugin repeats the allowlist in Java and its test pins the same table.
 */

/** The Cloudflare Pages project all web channels are served from (ADR 0013). */
export const PAGES_HOST = 'flourprint-aristotelesqc.pages.dev';
export const REPOSITORY = 'Aristotelesqc/Flourprint';
const API = `https://api.github.com/repos/${REPOSITORY}`;

export type PullVersion = `pr-${number}`;
/** `main`: released work; `dev`: the integration branch (default); `canary`; or a pull request. */
export type VersionId = 'main' | 'dev' | 'canary' | PullVersion;

export const DEFAULT_VERSION: VersionId = 'dev';
export const NAMED_VERSIONS: readonly VersionId[] = ['dev', 'canary', 'main'];

const PR_NUMBER = /^[1-9][0-9]{0,8}$/;

/** A pull request number typed by a person: digits, optionally after `#` or `PR`. */
export const parsePrNumber = (text: string): number | undefined => {
  const digits = /^(?:#|pr[-\s#]*)?\s*([0-9]+)$/i.exec(text.trim())?.[1];
  return digits !== undefined && PR_NUMBER.test(digits) ? Number(digits) : undefined;
};

export const prVersion = (number: number): PullVersion | undefined =>
  Number.isSafeInteger(number) && PR_NUMBER.test(String(number)) ? `pr-${number}` : undefined;

/** A stored or transmitted version id: `main`, `dev`, `canary` or `pr-<n>`; anything else is refused. */
export const parseVersionId = (value: unknown): VersionId | undefined => {
  if (value === 'main' || value === 'dev' || value === 'canary') return value;
  if (typeof value !== 'string' || !value.startsWith('pr-')) return undefined;
  const digits = value.slice(3);
  return PR_NUMBER.test(digits) ? `pr-${Number(digits)}` : undefined;
};

export const isPullVersion = (version: VersionId): version is PullVersion =>
  version.startsWith('pr-');

export const pullNumber = (version: VersionId): number | undefined =>
  isPullVersion(version) ? Number(version.slice(3)) : undefined;

/** The address a version is served at, always its root. */
export const versionAddress = (version: VersionId): string =>
  version === 'main' ? `https://${PAGES_HOST}/` : `https://${version}.${PAGES_HOST}/`;

/**
 * The version an address belongs to, or undefined: the allowlist. `https`, no user, password or
 * port, and exactly one of `<PAGES_HOST>`, `dev.`, `canary.` or `pr-<n>.` before it. The path,
 * query and fragment are free (the app routes inside its address); only the origin is checked.
 */
export const versionOfAddress = (address: string): VersionId | undefined => {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
  const host = url.hostname;
  if (host === PAGES_HOST) return 'main';
  const suffix = `.${PAGES_HOST}`;
  if (!host.endsWith(suffix)) return undefined;
  return parseVersionId(host.slice(0, -suffix.length));
};

export const isAllowedAddress = (address: string): boolean =>
  versionOfAddress(address) !== undefined;

const rank = (version: VersionId): number => {
  const named = NAMED_VERSIONS.indexOf(version);
  return named >= 0 ? named : NAMED_VERSIONS.length + (pullNumber(version) ?? 0);
};

/** `dev`, `canary`, `main`, then pull requests by number. */
export const compareVersions = (a: VersionId, b: VersionId): number => rank(a) - rank(b);

// -- GitHub (unauthenticated REST) ------------------------------------------------------------

export interface OpenPull {
  readonly number: number;
  readonly title: string;
}

export type PullState = 'open' | 'merged' | 'closed';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getJson = async (fetcher: typeof fetch, url: string): Promise<unknown> => {
  const response = await fetcher(url, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  return response.json();
};

export const parseOpenPulls = (value: unknown): OpenPull[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const pulls: OpenPull[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.number !== 'number' ||
      prVersion(item.number) === undefined
    ) {
      return undefined;
    }
    pulls.push({ number: item.number, title: typeof item.title === 'string' ? item.title : '' });
  }
  return pulls.sort((a, b) => b.number - a.number);
};

/** Open pull requests, newest first; undefined offline, rate-limited or on an unexpected answer. */
export const fetchOpenPulls = async (
  fetcher: typeof fetch = fetch,
): Promise<OpenPull[] | undefined> => {
  try {
    return parseOpenPulls(await getJson(fetcher, `${API}/pulls?state=open&per_page=100`));
  } catch {
    return undefined;
  }
};

export const parsePullState = (value: unknown): PullState | undefined => {
  if (!isRecord(value)) return undefined;
  if (value.state === 'open') return 'open';
  if (value.state !== 'closed') return undefined;
  return value.merged === true || typeof value.merged_at === 'string' ? 'merged' : 'closed';
};

/** The state of one pull request; undefined on any failure (the caller then does nothing). */
export const fetchPullState = async (
  number: number,
  fetcher: typeof fetch = fetch,
): Promise<PullState | undefined> => {
  try {
    return parsePullState(await getJson(fetcher, `${API}/pulls/${number}`));
  } catch {
    return undefined;
  }
};

/** Automatic clean-up (ADR 0023): only a merged or closed pull request deletes; nothing else does. */
export const cleanupDecision = (state: PullState | undefined): 'delete' | 'keep' =>
  state === 'merged' || state === 'closed' ? 'delete' : 'keep';

/**
 * The pull-request versions among `held` whose pull request is merged or closed. `named` versions
 * and `skip` (the loaded version) are never returned; a failed lookup keeps the version.
 */
export const staleVersions = async (
  held: readonly VersionId[],
  stateOf: (number: number) => Promise<PullState | undefined>,
  skip?: VersionId,
): Promise<PullVersion[]> => {
  const stale: PullVersion[] = [];
  for (const version of held) {
    const number = pullNumber(version);
    if (number === undefined || version === skip || !isPullVersion(version)) continue;
    let state: PullState | undefined;
    try {
      state = await stateOf(number);
    } catch {
      state = undefined;
    }
    if (cleanupDecision(state) === 'delete') stale.push(version);
  }
  return stale;
};

// -- Native changes ----------------------------------------------------------------------------

export interface ChangedFile {
  readonly filename: string;
  readonly patch?: string;
}

const NATIVE_PREFIXES = ['apps/mobile/android/', 'apps/desktop/src/', 'apps/desktop/scripts/'];
const NATIVE_FILES = ['apps/mobile/capacitor.config.ts', 'apps/desktop/package.json'];

/**
 * Whether a change set touches native code, which a web build cannot show: the Android project,
 * the Capacitor configuration or dependencies, the desktop main process and its packaging.
 */
export const touchesNative = (files: readonly ChangedFile[]): boolean =>
  files.some(
    (file) =>
      NATIVE_PREFIXES.some((prefix) => file.filename.startsWith(prefix)) ||
      NATIVE_FILES.includes(file.filename) ||
      (file.filename === 'apps/mobile/package.json' &&
        (file.patch ?? '').includes('@capacitor/')) ||
      (file.filename === 'apps/mobile/package.json' &&
        (file.patch ?? '').includes('@capacitor-community/')),
  );

const FILE_PAGES = 3;

/** Changed files of a pull request (up to 300); undefined on any failure. */
export const fetchChangedFiles = async (
  number: number,
  fetcher: typeof fetch = fetch,
): Promise<ChangedFile[] | undefined> => {
  const files: ChangedFile[] = [];
  try {
    for (let page = 1; page <= FILE_PAGES; page++) {
      const value = await getJson(
        fetcher,
        `${API}/pulls/${number}/files?per_page=100&page=${page}`,
      );
      if (!Array.isArray(value)) return undefined;
      for (const item of value) {
        if (!isRecord(item) || typeof item.filename !== 'string') return undefined;
        files.push({
          filename: item.filename,
          ...(typeof item.patch === 'string' ? { patch: item.patch } : {}),
        });
      }
      if (value.length < 100) break;
    }
    return files;
  } catch {
    return undefined;
  }
};

/** True when the pull request changes native code; undefined when that could not be read. */
export const pullNeedsApk = async (
  number: number,
  fetcher: typeof fetch = fetch,
): Promise<boolean | undefined> => {
  const files = await fetchChangedFiles(number, fetcher);
  return files === undefined ? undefined : touchesNative(files);
};

// -- Data on the device ------------------------------------------------------------------------

export interface DataEntry {
  readonly version: VersionId;
  readonly bytes: number;
}

/** Versions holding data, in the order of `compareVersions`; an unknown version is dropped. */
export const parseDataEntries = (value: unknown): DataEntry[] => {
  if (!Array.isArray(value)) return [];
  const entries: DataEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const version = parseVersionId(item.version);
    const bytes =
      typeof item.bytes === 'number' && item.bytes >= 0 ? Math.round(item.bytes) : undefined;
    if (version !== undefined && bytes !== undefined) entries.push({ version, bytes });
  }
  return entries.sort((a, b) => compareVersions(a.version, b.version));
};

// -- Copying data to another version -----------------------------------------------------------

/** How long a pending copy waits for its target version to start (ADR 0023). */
export const TRANSFER_TTL_MS = 10 * 60 * 1000;

/**
 * The one pending "copy my data to this version": kept for the target version only, released
 * once, and dropped after `TRANSFER_TTL_MS`. A newer copy replaces an older one.
 */
export interface TransferSlot {
  stash(target: VersionId, payload: string): void;
  /** The payload when `current` is the target and it has not expired; it is then gone. */
  take(current: VersionId): string | undefined;
}

export const createTransferSlot = (now: () => number = Date.now): TransferSlot => {
  let pending: { target: VersionId; payload: string; expiresAt: number } | undefined;
  return {
    stash(target, payload) {
      pending = { target, payload, expiresAt: now() + TRANSFER_TTL_MS };
    },
    take(current) {
      if (pending === undefined) return undefined;
      if (now() > pending.expiresAt) {
        pending = undefined;
        return undefined;
      }
      if (pending.target !== current) return undefined;
      const { payload } = pending;
      pending = undefined;
      return payload;
    },
  };
};

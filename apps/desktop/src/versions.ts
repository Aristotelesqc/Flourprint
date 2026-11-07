import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  compareVersions,
  versionOfAddress,
  type DataEntry,
  type VersionId,
} from '@flourprint/adapters/dev-versions';

/**
 * What the dev shell keeps per version (ADR 0023). The remote pages keep their data in IndexedDB
 * (the browser snapshot of ADR 0015), which Chromium stores in one folder per origin under the
 * user data folder: `IndexedDB/<scheme>_<host>_<port>.indexeddb.leveldb` (port 0 is the default).
 * Pure apart from reading the folder: unit-tested on a temporary one.
 */
const FOLDER = /^(https?)_([^_]+)_(\d+)\.indexeddb\.(leveldb|blob)$/;

/** The origin an IndexedDB folder belongs to, or undefined for a name of another shape. */
export const originOfFolder = (name: string): string | undefined => {
  const match = FOLDER.exec(name);
  if (!match) return undefined;
  const [, scheme, host, port] = match;
  const defaultPort = scheme === 'https' ? 443 : 80;
  return `${scheme}://${host}${port === '0' || Number(port) === defaultPort ? '' : `:${port}`}`;
};

const sizeOf = (path: string): number => {
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) total += sizeOf(child);
    else if (entry.isFile()) total += statSync(child).size;
  }
  return total;
};

/**
 * The versions that hold data, with the size of their IndexedDB folders. `devOrigin` is where the
 * `dev` version loads (a local address in tests); other origins count only if allowlisted.
 */
export const versionsWithData = (userData: string, devOrigin: string): DataEntry[] => {
  const bytes = new Map<VersionId, number>();
  let names: string[];
  try {
    names = readdirSync(join(userData, 'IndexedDB'));
  } catch {
    return [];
  }
  for (const name of names) {
    const origin = originOfFolder(name);
    if (origin === undefined) continue;
    const version = origin === devOrigin ? 'dev' : versionOfAddress(`${origin}/`);
    if (version === undefined) continue;
    try {
      bytes.set(version, (bytes.get(version) ?? 0) + sizeOf(join(userData, 'IndexedDB', name)));
    } catch {
      // A folder removed while it is read has no data any more.
    }
  }
  return [...bytes]
    .filter(([, size]) => size > 0)
    .map(([version, size]) => ({ version, bytes: size }))
    .sort((a, b) => compareVersions(a.version, b.version));
};

/** Largest backup the shell keeps for a copy to another version. */
export const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;

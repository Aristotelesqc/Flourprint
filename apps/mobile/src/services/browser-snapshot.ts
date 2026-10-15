import { exportBackup, importBackup, type BackupStores } from '@flourprint/core/application';
import type { Instant } from '@flourprint/core/domain';
import type { RestoreTarget } from '@flourprint/core/application';

/**
 * The browser preview's memory stores, kept across reloads (ADR 0015): a full backup document in
 * IndexedDB, restored at start-up through the normal restore path and saved again when it changes.
 * Never used on Android or in the desktop shell, which have SQLite.
 */

const DB = 'flourprint-preview';
const STORE = 'snapshots';
const CURRENT = 'backup';
const UNREADABLE = 'backup-unreadable';
const SAVE_EVERY_MS = 3_000;

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });

/**
 * Runs one request in its own transaction and resolves only when the transaction completes: a
 * request's success does not mean its write is durable, since the transaction can still abort.
 */
const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(transaction.error ?? request.error ?? new Error('IndexedDB transaction aborted'));
      transaction.onerror = () =>
        reject(transaction.error ?? request.error ?? new Error('IndexedDB transaction failed'));
    });
  } finally {
    db.close();
  }
};

const read = (key: string) => run<unknown>('readonly', (s) => s.get(key));
const write = (key: string, value: string) => run('readwrite', (s) => s.put(value, key));

export const browserSnapshotAvailable = (): boolean => typeof indexedDB !== 'undefined';

/** What the start-up restore found: nothing, a restored snapshot, or one set aside. */
export type SnapshotLoad = 'empty' | 'restored' | 'unreadable';

/**
 * Restores the saved snapshot into empty stores. A snapshot that does not decode or restore is
 * kept aside under another key, never overwritten, and the app starts empty.
 */
export const restoreBrowserSnapshot = async (target: RestoreTarget): Promise<SnapshotLoad> => {
  const saved = await read(CURRENT).catch(() => undefined);
  if (typeof saved !== 'string') return 'empty';
  try {
    const restored = await importBackup(target, JSON.parse(saved));
    if (restored.ok) return 'restored';
    console.error('Browser snapshot not restored', restored.error);
  } catch (cause) {
    console.error('Browser snapshot not restored', cause);
  }
  await write(UNREADABLE, saved).catch(() => undefined);
  await run('readwrite', (s) => s.delete(CURRENT)).catch(() => undefined);
  return 'unreadable';
};

export interface SnapshotKeeper {
  readonly stop: () => void;
  /**
   * Saves now and resolves once the stores' current content is durably in IndexedDB (true), or
   * the save failed (false). Used before an app-initiated reload (ADR 0016).
   */
  readonly flush: () => Promise<boolean>;
}

/** Saves the stores whenever their content changed, until stopped. */
export const keepBrowserSnapshot = (stores: BackupStores, now: () => Instant): SnapshotKeeper => {
  let last: string | undefined;
  // Saves run one after the other: a flush waits for the save in flight, then saves again.
  let queue: Promise<boolean> = Promise.resolve(true);
  const saveNow = async (): Promise<boolean> => {
    try {
      const backup = await exportBackup(stores, now());
      if (!backup.ok) return false;
      // Compare without the export time, which changes on every save.
      const content = JSON.stringify({ ...backup.value, exportedAt: undefined });
      if (content === last) return true;
      await write(CURRENT, JSON.stringify(backup.value));
      last = content;
      return true;
    } catch (cause) {
      console.error('Browser snapshot not saved', cause);
      return false;
    }
  };
  const save = (): Promise<boolean> => (queue = queue.then(saveNow, saveNow));
  const timer = setInterval(() => void save(), SAVE_EVERY_MS);
  const onHide = () => {
    if (document.visibilityState === 'hidden') void save();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);
  void save();
  return {
    stop: () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    },
    flush: save,
  };
};

/** Advanced → erase the browser's data: the snapshot goes; the page reloads empty. */
export const clearBrowserSnapshot = async (): Promise<void> => {
  await run('readwrite', (s) => s.clear());
};

import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryIngredientRegistry,
  MemoryRecipeRepository,
} from '@flourprint/adapters/memory';
import type { Instant } from '@flourprint/core/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepBrowserSnapshot } from '../src/services/browser-snapshot';

/**
 * A minimal IndexedDB stand-in: every request succeeds first, then its transaction completes or,
 * when `abortWrites` is set, aborts — the order the real API allows (ADR 0015, audit F43-2).
 */
const fakeIndexedDb = (abortWrites: () => boolean) => {
  const data = new Map<string, unknown>();
  const later = (f: () => void) => setTimeout(f, 0);
  const transaction = (mode: IDBTransactionMode) => {
    const tx: Record<string, unknown> = { error: null };
    const request = (result: () => unknown, apply: () => void = () => undefined) => {
      const req: Record<string, unknown> = { result: undefined, error: null };
      later(() => {
        req.result = result();
        (req.onsuccess as (() => void) | undefined)?.();
        later(() => {
          if (mode === 'readwrite' && abortWrites()) {
            tx.error = new DOMException('aborted', 'AbortError');
            (tx.onabort as (() => void) | undefined)?.();
          } else {
            apply();
            (tx.oncomplete as (() => void) | undefined)?.();
          }
        });
      });
      return req;
    };
    tx.objectStore = () => ({
      get: (key: string) => request(() => data.get(key)),
      put: (value: unknown, key: string) =>
        request(
          () => key,
          () => data.set(key, value),
        ),
      delete: (key: string) =>
        request(
          () => undefined,
          () => data.delete(key),
        ),
      clear: () =>
        request(
          () => undefined,
          () => data.clear(),
        ),
    });
    return tx;
  };
  const open = () => {
    const req: Record<string, unknown> = {};
    later(() => {
      req.result = {
        transaction: (_: string, mode: IDBTransactionMode) => transaction(mode),
        close: () => undefined,
      };
      (req.onsuccess as (() => void) | undefined)?.();
    });
    return req;
  };
  return { indexedDB: { open }, data };
};

const stores = () => {
  const ingredients = new MemoryIngredientRegistry();
  return {
    recipes: new MemoryRecipeRepository(ingredients),
    bakes: new MemoryBakeEventStore(),
    flours: new MemoryFlourRegistry(),
    equipment: new MemoryEquipmentRegistry(),
    ingredients,
  };
};

const now = () => '2026-10-14T00:00:00.000Z' as Instant;

describe('the browser snapshot keeper', () => {
  let abort = false;
  let fake: ReturnType<typeof fakeIndexedDb>;

  beforeEach(() => {
    abort = false;
    fake = fakeIndexedDb(() => abort);
    vi.stubGlobal('indexedDB', fake.indexedDB);
    const target = { addEventListener: () => undefined, removeEventListener: () => undefined };
    vi.stubGlobal('document', { ...target, visibilityState: 'visible' });
    vi.stubGlobal('window', target);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports a flush durable once its transaction completes', async () => {
    const keeper = keepBrowserSnapshot(stores(), now);
    expect(await keeper.flush()).toBe(true);
    expect(typeof fake.data.get('backup')).toBe('string');
    keeper.stop();
  });

  it('does not report a flush durable when the transaction aborts after the request succeeded', async () => {
    abort = true;
    const keeper = keepBrowserSnapshot(stores(), now);
    expect(await keeper.flush()).toBe(false);
    expect(fake.data.has('backup')).toBe(false);
    // Nothing was marked saved: once writes work again the same content is written.
    abort = false;
    expect(await keeper.flush()).toBe(true);
    expect(fake.data.has('backup')).toBe(true);
    keeper.stop();
  });
});
